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
    var GRID_MIN = st.gridMin || 4, GRID_MAX = st.gridMax || 14, STYLE_INTERVAL = st.styleInterval || 3.4;
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
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*'.split('');
      var t = 0, grid = 4, gridTarget = 4, densDir = 1, mInfX = 0, mInfY = 0;
      var renderMode = 0, prevMode = 0, modeT = 1;
      var glitchActive = false, glitchIntensity = 0, glitchSlices = [], glitchTimer = 0;
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

      // ---- the stylizer: resample the colour buffer as ASCII / dots / pixels ----
      function renderToScreen() {
        var px = buf.pixels, gg = p.max(4, p.round(grid)), asciiG = p.max(gg, 6);
        var scaleF = p.min(p.width / BUF_W, p.height / BUF_H) * 0.85, invScale = 1 / scaleF;
        var renderW = BUF_W * scaleF, renderH = BUF_H * scaleF;
        var ox = (p.width - renderW) / 2 + mInfX, oy = (p.height - renderH) / 2 + mInfY;
        var curM = renderMode, prevM = prevMode, mt = modeT, transitionDone = mt >= 0.99;
        var useNative = (curM === 0) || (!transitionDone && prevM === 0);
        if (useNative) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; }
        var gEff = (curM === 0 && transitionDone) ? asciiG : gg, halfG = gEff * 0.5;
        var yStart = p.max(0, p.floor(oy / gEff) * gEff), yEnd = p.min(p.height, oy + renderH);
        var xStart = p.max(0, p.floor(ox / gEff) * gEff), xEnd = p.min(p.width, ox + renderW);
        var asciiSize = gEff * 1.1, lastFontStr = '';
        for (var sy = yStart; sy < yEnd; sy += gEff) {
          var byBase = p.floor((sy - oy) * invScale); if (byBase < 0 || byBase >= BUF_H) continue;
          var rowOff = byBase * BUF_W;
          for (var sx = xStart; sx < xEnd; sx += gEff) {
            var bx = p.floor((sx - ox) * invScale); if (bx < 0 || bx >= BUF_W) continue;
            var i4 = (rowOff + bx) * 4, r = px[i4], gr = px[i4 + 1], b = px[i4 + 2];
            if ((r + gr + b) < 12) continue;
            var bright = r * 0.299 + gr * 0.587 + b * 0.114, cxp = sx + halfG, cyp = sy + halfG, mode;
            if (transitionDone) mode = curM; else { var hash = ((sx * 73 + sy * 137) & 0xFF) * 0.00392; mode = hash < mt ? curM : prevM; }
            if (mode === 0) {
              var fontSz = p.floor(asciiSize * (0.4 + bright * 0.004)), fontStr = fontSz + 'px Courier New';
              if (fontStr !== lastFontStr) { ctx.font = fontStr; lastFontStr = fontStr; }
              ctx.fillStyle = 'rgb(' + r + ',' + gr + ',' + b + ')';
              var ci = ((bright >> 2) + ((sx * 7 + sy * 13) >> 3)) % chars.length;
              ctx.fillText(chars[ci], cxp, cyp);
            } else if (mode === 1) { p.fill(r, gr, b); var d = gEff * (0.1 + bright * 0.0033); p.ellipse(cxp, cyp, d, d); }
            else { p.fill(r, gr, b); p.rectMode(p.CENTER); p.rect(cxp, cyp, gEff * 0.93, gEff * 0.93); }
          }
        }
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
        if (sceneT >= dur) { sceneT -= dur; advanceStyle(true); }
        var u = sceneT / dur;
        styleTimer += dt; if (styleTimer > STYLE_INTERVAL) { styleTimer = 0; advanceStyle(p.random() < 0.5); }
        grid += (gridTarget - grid) * 0.05; modeT = p.min(1, modeT + dt * 3.0);
        mInfX = Math.sin(t * 0.13) * 8; mInfY = Math.cos(t * 0.11) * 6;
        updateGlitch(dt);
        scenes[idx].draw(D, BUF_W, BUF_H, u, t); buf.loadPixels();
        glitchTimer -= dt; if (glitchTimer <= 0 && !glitchActive) { glitchTimer = p.random(3, 7); if (p.random() < 0.30) triggerGlitch(); }
        renderToScreen(); drawGlitchOverlay(); drawHUD();
      };

      p.keyPressed = function () {
        if (p.key === '.' || p.keyCode === p.RIGHT_ARROW) go(1);
        else if (p.key === ',' || p.keyCode === p.LEFT_ARROW) go(-1);
        else if (p.key === 'f' || p.key === 'F') { var fs = p.fullscreen(); p.fullscreen(!fs); }
        else if (p.key === 'g' || p.key === 'G') triggerGlitch();
      };
      p.mousePressed = function () { if (!loadingPhase) triggerGlitch(); };
      p.windowResized = function () { p.resizeCanvas(p.windowWidth, p.windowHeight); };
    };

    inst = new p5(sketch, document.querySelector(mountSel));
    return inst;
  };

  global.SceneEngine = Engine;
})(typeof self !== 'undefined' ? self : this);
