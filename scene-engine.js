/* ============================================================================
 * scene-engine.js  —  the runtime (browser, p5)
 *
 * Owns everything environment-specific so scenes stay pure:
 *   • the p5-backed D adapter (draws into a 680x680 offscreen buffer)
 *   • the calla STYLISER (resamples the buffer as ASCII / dots / pixels)
 *   • the glitch system + ambient "style breathing" (mode + grid drift)
 *   • the loader, caption, and a SEQUENCER you flip through by hand
 *
 * Controls:   .  next scene     ,  previous scene     F  fullscreen     G  glitch
 *             (ArrowRight / ArrowLeft also work)
 *
 * Boot it after loading p5 + scene-kit.js + scenes.js:
 *   SceneEngine.boot({ scenes: SCENES });
 * Expects DOM ids: #canvas-container #loader #loader-bar #loader-pct #caption
 * (override via opts.mount / opts.dom). See SPEC.md.
 * ==========================================================================*/
(function (global) {
  'use strict';
  var Engine = {};

  Engine.boot = function (opts) {
    opts = opts || {};
    var scenes = opts.scenes || (global.SCENES || []);
    if (!scenes.length) throw new Error('SceneEngine.boot: no scenes provided');
    var dom = opts.dom || {};
    var mountSel = opts.mount || '#canvas-container';
    var st = opts.style || {};
    var GRID_MIN = st.gridMin || 3, GRID_MAX = st.gridMax || 5, STYLE_INTERVAL = st.styleInterval || 3.4;
    var BUF_W = 680, BUF_H = 680;

    var loaderEl = document.getElementById(dom.loader || 'loader');
    var loaderBar = document.getElementById(dom.bar || 'loader-bar');
    var loaderPct = document.getElementById(dom.pct || 'loader-pct');
    var captionEl = document.getElementById(dom.caption || 'caption');

    var loadingTimerDone = false, p5LoadingDone = false, inst = null;
    setTimeout(function () { loadingTimerDone = true; checkReady(); }, 2200);
    function checkReady() {
      if (loadingTimerDone && p5LoadingDone) {
        if (inst) inst.startExperience();
        if (loaderEl) loaderEl.classList.add('fade');
      }
    }

    var sketch = function (p) {
      var buf, ctx, D;
      // ASCII glyph palette ordered SPARSE → DENSE so brightness maps to ink
      // coverage. Dark cells → '.', bright cells → '@'. Position hash adds a
      // small ±1 nudge for visual variety within a density bucket.
      var chars = " .'`,:;-~+=ilcoxnzXJCSO0BHWM%#@".split('');
      var t = 0, grid = 4, gridTarget = 4, densDir = 1, mInfX = 0, mInfY = 0;
      var renderMode = 0, prevMode = 0, modeT = 1;
      var glitchActive = false, glitchIntensity = 0, glitchSlices = [];
      var loadingPhase = true, warmFrames = 0; var WARM_TARGET = 60;
      var idx = 0, sceneT = 0, styleTimer = 0;

      function makeD(buf) {
        return {
          bg: function (r, g, b) { buf.background(r, g, b); },
          rect: function (x, y, w, h, r, g, b, a) { buf.noStroke(); buf.rectMode(p.CORNER); buf.fill(r, g, b, (a == null ? 1 : a) * 255); buf.rect(x, y, w, h); },
          disc: function (x, y, rad, r, g, b, a) { buf.noStroke(); buf.fill(r, g, b, (a == null ? 1 : a) * 255); buf.ellipse(x, y, rad * 2, rad * 2); },
          ellipse: function (x, y, rx, ry, ang, r, g, b, a) { buf.push(); buf.noStroke(); buf.translate(x, y); buf.rotate(ang); buf.fill(r, g, b, (a == null ? 1 : a) * 255); buf.ellipse(0, 0, rx * 2, ry * 2); buf.pop(); },
          tri: function (ax, ay, bx, by, cx, cy, r, g, b, a) { buf.noStroke(); buf.fill(r, g, b, (a == null ? 1 : a) * 255); buf.triangle(ax, ay, bx, by, cx, cy); }
        };
      }

      function setCaption() { if (captionEl) captionEl.textContent = scenes[idx].name + '  \u00b7  ' + (idx + 1) + ' / ' + scenes.length; }
      function go(d) { idx = (idx + d + scenes.length) % scenes.length; sceneT = 0; advanceStyle(true); setCaption(); }

      function advanceStyle(doGlitch) {
        prevMode = renderMode; renderMode = (renderMode + 1) % 3; modeT = 0;
        if (densDir === 1) { gridTarget = GRID_MAX; densDir = -1; } else { gridTarget = GRID_MIN; densDir = 1; }
        if (doGlitch) triggerGlitch();
      }

      function triggerGlitch() {
        glitchActive = true; glitchIntensity = p.random(0.4, 1.0); glitchSlices = [];
        var scaleF = p.min(p.width / BUF_W, p.height / BUF_H) * 0.85, rW = BUF_W * scaleF, rH = BUF_H * scaleF;
        var fOx = (p.width - rW) / 2 + mInfX, fOy = (p.height - rH) / 2 + mInfY, num = p.floor(p.random(3, 10));
        for (var i = 0; i < num; i++) {
          var sy = p.random(fOy, fOy + rH), sh = p.min(p.random(2, rH * 0.08), fOy + rH - sy);
          glitchSlices.push({ y: sy, h: sh, fx: fOx, fw: rW, offset: p.random(-80, 80) * glitchIntensity, colorShift: p.random() < 0.4, duration: p.random(0.08, 0.3) });
        }
      }
      function updateGlitch(dt) {
        if (!glitchActive) return; var allDone = true;
        for (var i = 0; i < glitchSlices.length; i++) { var s = glitchSlices[i]; s.duration -= dt; if (s.duration > 0) allDone = false; else s.offset *= 0.7; }
        if (allDone) { glitchActive = false; glitchSlices = []; }
      }
      function drawGlitchOverlay() {
        if (!glitchActive || !glitchSlices.length) return;
        for (var i = 0; i < glitchSlices.length; i++) {
          var s = glitchSlices[i]; if (p.abs(s.offset) < 0.5) continue;
          var sx = p.floor(s.fx), sy = p.floor(s.y), sw = p.floor(s.fw), sh = p.floor(s.h);
          if (sw < 1 || sh < 1) continue;
          if (s.colorShift) {
            ctx.save(); ctx.globalAlpha = 0.7; ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(ctx.canvas, sx, sy, sw, sh, sx + s.offset * 1.5, sy, sw, sh);
            ctx.globalAlpha = 0.45; ctx.drawImage(ctx.canvas, sx, sy, sw, sh, sx - s.offset, sy, sw, sh); ctx.restore();
          } else { ctx.drawImage(ctx.canvas, sx, sy, sw, sh, sx + s.offset, sy, sw, sh); }
        }
      }

      // ---- persistent ImageData buffer for the fast dots/pixels path -----
      // We write straight into this typed array (4 bytes per pixel) and push
      // it to the canvas with a single putImageData per frame. Bypassing the
      // canvas2d per-cell API is the difference between ~5fps and 30+fps at
      // the dense breathing grid.
      var pixelBuf = null, pbW = 0, pbH = 0, pixelData32 = null;
      function ensurePixelBuf() {
        if (pixelBuf && pbW === p.width && pbH === p.height) return;
        pixelBuf = ctx.createImageData(p.width, p.height);
        pbW = p.width; pbH = p.height;
        pixelData32 = new Uint32Array(pixelBuf.data.buffer);
      }

      // ---- the stylizer: resample the colour buffer as ASCII / dots / pixels ----
      function renderToScreen() {
        var px = buf.pixels, gg = p.max(3, p.round(grid)), asciiG = p.max(gg, 7);
        var scaleF = p.min(p.width / BUF_W, p.height / BUF_H) * 0.85, invScale = 1 / scaleF;
        var renderW = BUF_W * scaleF, renderH = BUF_H * scaleF;
        var ox = (p.width - renderW) / 2 + mInfX, oy = (p.height - renderH) / 2 + mInfY;
        var curM = renderMode, prevM = prevMode, mt = modeT, transitionDone = mt >= 0.99;
        // ASCII is "involved" whenever it's the current mode OR we're still
        // mid-dissolve out of it. ASCII-involved frames take the canvas API
        // path (fillText needs the canvas2d text engine); everything else
        // takes the fast direct-pixel path below.
        var asciiInvolved = (curM === 0) || (!transitionDone && prevM === 0);

        if (asciiInvolved) {
          /* --------------- ASCII path (canvas API) --------------------- */
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var gEff = asciiG, halfG = gEff * 0.5;
          var yStart = p.max(0, p.floor(oy / gEff) * gEff), yEnd = p.min(p.height, oy + renderH);
          var xStart = p.max(0, p.floor(ox / gEff) * gEff), xEnd = p.min(p.width, ox + renderW);
          var asciiBase = gEff * 1.35, lastFontStr = '';
          var charsN = chars.length;
          var pixSide = gEff * 0.93, pixHalf = pixSide * 0.5;
          var TWO_PI = Math.PI * 2;
          var lastRgbKey = -1;
          for (var sy = yStart; sy < yEnd; sy += gEff) {
            var byBase = p.floor((sy - oy) * invScale); if (byBase < 0 || byBase >= BUF_H) continue;
            var rowOff = byBase * BUF_W;
            for (var sx = xStart; sx < xEnd; sx += gEff) {
              var bx = p.floor((sx - ox) * invScale); if (bx < 0 || bx >= BUF_W) continue;
              var i4 = (rowOff + bx) * 4, r = px[i4], gr = px[i4 + 1], b = px[i4 + 2];
              if ((r + gr + b) < 12) continue;
              var bright = r * 0.299 + gr * 0.587 + b * 0.114, cxp = sx + halfG, cyp = sy + halfG, mode;
              if (transitionDone) mode = curM; else { var hash = ((sx * 73 + sy * 137) & 0xFF) * 0.00392; mode = hash < mt ? curM : prevM; }
              // Only allocate the fillStyle string when the colour actually
              // changes from the previous cell (saves the per-cell GC churn
              // that was inflating the ASCII frame budget).
              var rgbKey = (r << 16) | (gr << 8) | b;
              if (rgbKey !== lastRgbKey) {
                ctx.fillStyle = 'rgb(' + r + ',' + gr + ',' + b + ')';
                lastRgbKey = rgbKey;
              }
              if (mode === 0) {
                var b01 = bright * 0.00392;
                var fontSz = p.floor(asciiBase * (0.85 + b01 * 0.30)), fontStr = fontSz + 'px Courier New';
                if (fontStr !== lastFontStr) { ctx.font = fontStr; lastFontStr = fontStr; }
                var ci = p.floor(b01 * (charsN - 1)) + (((sx * 7 + sy * 13) & 1));
                if (ci < 0) ci = 0; else if (ci >= charsN) ci = charsN - 1;
                ctx.fillText(chars[ci], cxp, cyp);
              } else if (mode === 1) {
                var d = gEff * (0.25 + bright * 0.0030);
                ctx.beginPath();
                ctx.arc(cxp, cyp, d * 0.5, 0, TWO_PI);
                ctx.fill();
              } else {
                ctx.fillRect(cxp - pixHalf, cyp - pixHalf, pixSide, pixSide);
              }
            }
          }
          return;
        }

        /* --------------- Fast direct-pixel path (dots / pixels) -------- */
        ensurePixelBuf();
        // Clear to opaque black so empty cells match the p.background(0) bg.
        pixelData32.fill(0xFF000000);
        var gEff2 = gg, halfG2 = gEff2 * 0.5;
        var yStart2 = Math.max(0, Math.floor(oy / gEff2) * gEff2);
        var yEnd2   = Math.min(p.height, oy + renderH);
        var xStart2 = Math.max(0, Math.floor(ox / gEff2) * gEff2);
        var xEnd2   = Math.min(p.width, ox + renderW);
        var W2 = p.width, H2 = p.height;
        var side2 = gEff2 * 0.93, halfS = side2 * 0.5;
        var data32 = pixelData32;
        for (var sy2 = yStart2; sy2 < yEnd2; sy2 += gEff2) {
          var byBase2 = Math.floor((sy2 - oy) * invScale); if (byBase2 < 0 || byBase2 >= BUF_H) continue;
          var rowOff2 = byBase2 * BUF_W;
          for (var sx2 = xStart2; sx2 < xEnd2; sx2 += gEff2) {
            var bx2 = Math.floor((sx2 - ox) * invScale); if (bx2 < 0 || bx2 >= BUF_W) continue;
            var i42 = (rowOff2 + bx2) * 4;
            var r2 = px[i42], g2 = px[i42 + 1], b2 = px[i42 + 2];
            if (r2 + g2 + b2 < 12) continue;
            var bright2 = r2 * 0.299 + g2 * 0.587 + b2 * 0.114;
            var cxp2 = sx2 + halfG2, cyp2 = sy2 + halfG2, mode2;
            if (transitionDone) mode2 = curM;
            else { var hash2 = ((sx2 * 73 + sy2 * 137) & 0xFF) * 0.00392; mode2 = hash2 < mt ? curM : prevM; }
            // Pack RGBA as little-endian Uint32: byte 0 = R, 1 = G, 2 = B, 3 = A=0xFF.
            var rgba = 0xFF000000 | (b2 << 16) | (g2 << 8) | r2;
            if (mode2 === 1) {
              // dots — filled disc rasterised inside the cell bbox
              var d2 = gEff2 * (0.25 + bright2 * 0.0030);
              var rad = d2 * 0.5;
              var rr2 = rad * rad;
              var x0 = Math.max(0, Math.floor(cxp2 - rad));
              var x1 = Math.min(W2 - 1, Math.ceil(cxp2 + rad));
              var y0 = Math.max(0, Math.floor(cyp2 - rad));
              var y1 = Math.min(H2 - 1, Math.ceil(cyp2 + rad));
              for (var yy = y0; yy <= y1; yy++) {
                var dy = yy - cyp2 + 0.5, dy2 = dy * dy;
                var rowStart = yy * W2;
                for (var xx = x0; xx <= x1; xx++) {
                  var dx2 = xx - cxp2 + 0.5;
                  if (dx2 * dx2 + dy2 <= rr2) data32[rowStart + xx] = rgba;
                }
              }
            } else {
              // pixels — axis-aligned square block
              var qx0 = Math.max(0, Math.floor(cxp2 - halfS));
              var qx1 = Math.min(W2 - 1, Math.ceil(cxp2 + halfS));
              var qy0 = Math.max(0, Math.floor(cyp2 - halfS));
              var qy1 = Math.min(H2 - 1, Math.ceil(cyp2 + halfS));
              for (var yy2 = qy0; yy2 <= qy1; yy2++) {
                var rowStart2 = yy2 * W2;
                for (var xx2 = qx0; xx2 <= qx1; xx2++) {
                  data32[rowStart2 + xx2] = rgba;
                }
              }
            }
          }
        }
        ctx.putImageData(pixelBuf, 0, 0);
      }

      function drawHUD() {
        p.fill(255, 255, 255, 32); p.textSize(9); p.textAlign(p.LEFT, p.TOP);
        p.text(p.floor(p.frameRate()) + ' fps   . / , to flip', 10, 10);
        p.textAlign(p.CENTER, p.CENTER);
      }

      p.setup = function () {
        p.createCanvas(p.windowWidth, p.windowHeight); p.pixelDensity(1);
        p.textFont('Courier New, monospace'); p.textAlign(p.CENTER, p.CENTER); p.noStroke();
        buf = p.createGraphics(BUF_W, BUF_H); buf.pixelDensity(1); buf.noSmooth();
        buf.canvas.getContext('2d', { willReadFrequently: true }); buf.noStroke();
        ctx = p.drawingContext; D = makeD(buf); setCaption();
      };

      p.startExperience = function () { loadingPhase = false; };

      p.draw = function () {
        var dt = p.deltaTime / 1000;
        if (loadingPhase) {
          p.background(0); scenes[0].draw(D, BUF_W, BUF_H, 0, 0); buf.loadPixels(); warmFrames++;
          var pct = p.min(100, p.floor(warmFrames / WARM_TARGET * 100));
          if (loaderBar) loaderBar.style.width = pct + '%'; if (loaderPct) loaderPct.textContent = pct + '%';
          if (warmFrames >= WARM_TARGET) { p5LoadingDone = true; checkReady(); }
          return;
        }
        p.background(0); t += 0.016; sceneT += dt;
        var dur = scenes[idx].dur || 12;
        // Scene-loop wrap = scene flip → keep glitch + dissolve.
        if (sceneT >= dur) { sceneT -= dur; advanceStyle(true); }
        var u = sceneT / dur;
        // Style timer = dissolve only (no glitch).
        styleTimer += dt; if (styleTimer > STYLE_INTERVAL) { styleTimer = 0; advanceStyle(false); }
        grid += (gridTarget - grid) * 0.05; modeT = p.min(1, modeT + dt * 3.0);
        mInfX = Math.sin(t * 0.13) * 8; mInfY = Math.cos(t * 0.11) * 6;
        updateGlitch(dt);
        scenes[idx].draw(D, BUF_W, BUF_H, u, t); buf.loadPixels();
        // (Ambient random glitches removed — glitches now only fire on scene
        // flip and manual G key, not on the style timer or a background roll.)
        renderToScreen(); drawGlitchOverlay(); drawHUD();
      };

      p.keyPressed = function () {
        if (p.key === '.' || p.keyCode === p.RIGHT_ARROW) go(1);
        else if (p.key === ',' || p.keyCode === p.LEFT_ARROW) go(-1);
        else if (p.key === 'f' || p.key === 'F') { var fs = p.fullscreen(); p.fullscreen(!fs); }
        else if (p.key === 'g' || p.key === 'G') triggerGlitch();
      };

      // ---- mobile swipe navigation ---------------------------------------
      // Swipe left → next scene, swipe right → previous. Mirrors `.` / `,`.
      // Returns false from touch handlers to suppress browser scroll/zoom on
      // the canvas so the swipe isn't fighting page scroll.
      var SWIPE_PX = 50;          // minimum horizontal travel to count as a swipe
      var SWIPE_DOMINANCE = 1.3;  // horizontal must beat vertical by this factor
      var tStartX = 0, tStartY = 0, tTracking = false;
      function touchPos(e, list) {
        if (e && e[list] && e[list][0]) return [e[list][0].clientX, e[list][0].clientY];
        return [p.mouseX, p.mouseY];
      }
      p.touchStarted = function (e) {
        if (e && e.touches && e.touches.length === 1) {
          var pos = touchPos(e, 'touches');
          tStartX = pos[0]; tStartY = pos[1]; tTracking = true;
        } else { tTracking = false; }
        return false;
      };
      p.touchMoved = function () { return false; };
      p.touchEnded = function (e) {
        if (!tTracking) return false;
        tTracking = false;
        var pos = touchPos(e, 'changedTouches');
        var dx = pos[0] - tStartX, dy = pos[1] - tStartY;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * SWIPE_DOMINANCE) {
          if (dx < 0) go(1); else go(-1);
        }
        return false;
      };

      p.windowResized = function () { p.resizeCanvas(p.windowWidth, p.windowHeight); };
    };

    inst = new p5(sketch, document.querySelector(mountSel));
    return inst;
  };

  global.SceneEngine = Engine;
})(typeof self !== 'undefined' ? self : this);
