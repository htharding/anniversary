/* ============================================================================
 * scenes/continued.js — "to be continued..." final scene.
 *
 * A warm, summative backyard at golden hour: dusty-pink sky, drifting cream
 * clouds with "TO BE CONTINUED..." text baked into them, rolling green hills,
 * a gray metal fence, and three animal silhouettes (brown dog, black dog,
 * gray cat) playing in the foreground. The ellipsis dots reveal one-by-one
 * across the loop.
 *
 * Composition matches sceneRefs/scene12EndingToBeContinued.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  /* ---- soft, elongated cloud wisp (like takeoff.js) ----------------------*/
  function wisp(D, cx, cy, w, h, col, a) {
    D.ellipse(cx, cy, w * 1.85, h * 2.5, 0, col[0], col[1], col[2], a * 0.18);
    D.ellipse(cx, cy, w * 1.40, h * 1.7, 0, col[0], col[1], col[2], a * 0.38);
    D.ellipse(cx, cy, w, h, 0, col[0], col[1], col[2], a * 0.90);
    D.ellipse(cx - w * 0.50, cy + h * 0.25, w * 0.75, h * 0.85, 0, col[0], col[1], col[2], a * 0.75);
    D.ellipse(cx + w * 0.45, cy - h * 0.18, w * 0.65, h * 0.70, 0, col[0], col[1], col[2], a * 0.70);
    D.ellipse(cx + w * 0.05, cy - h * 0.55, w * 0.55, h * 0.55, 0, col[0], col[1], col[2], a * 0.55);
  }

  /* ---- brown dog (floppy ears) side view, faces right --------------------*/
  function brownDog(D, x, y, scl, bob, tailWag, earFlick) {
    var body = [124, 78, 52], dark = [78, 48, 32];
    var bx = x, by = y + bob;
    // back legs
    D.ellipse(bx - 12 * scl, by + 16 * scl, 2.4 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    D.ellipse(bx - 8 * scl, by + 16 * scl, 2.4 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    // body — elongated ellipse
    D.ellipse(bx, by + 6 * scl, 16 * scl, 8 * scl, 0, body[0], body[1], body[2], 1);
    // front legs (slightly forward)
    D.ellipse(bx + 9 * scl, by + 16 * scl, 2.4 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    D.ellipse(bx + 13 * scl, by + 16 * scl, 2.4 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    // tail — wagging up and back
    var tx = bx - 15 * scl, ty = by + 2 * scl;
    D.ellipse(tx + Math.cos(2.2 + tailWag) * 6 * scl,
              ty - 5 * scl + Math.sin(2.2 + tailWag) * 4 * scl,
              5 * scl, 1.4 * scl, 2.2 + tailWag, body[0], body[1], body[2], 1);
    // chest / neck
    D.ellipse(bx + 11 * scl, by + 2 * scl, 5 * scl, 5.5 * scl, 0.2, body[0], body[1], body[2], 1);
    // head
    var hx = bx + 16 * scl, hy = by - 3 * scl;
    D.disc(hx, hy, 6.5 * scl, body[0], body[1], body[2], 1);
    // muzzle
    D.ellipse(hx + 5 * scl, hy + 2 * scl, 3.5 * scl, 2.5 * scl, 0, body[0], body[1], body[2], 1);
    // nose
    D.disc(hx + 7.5 * scl, hy + 2 * scl, 1.0 * scl, 20, 14, 12, 1);
    // floppy ear — hangs down beside head
    var er = 0.25 + earFlick;
    var ea = hx - 3 * scl, eb = hy + 0 * scl;
    var c1 = Math.cos(er), s1 = Math.sin(er);
    D.tri(ea, eb,
          ea - 1.5 * scl * c1 - 7 * scl * s1, eb - 1.5 * scl * s1 + 7 * scl * c1,
          ea + 2.5 * scl * c1 - 6 * scl * s1, eb + 2.5 * scl * s1 + 6 * scl * c1,
          dark[0], dark[1], dark[2], 1);
    // eye
    D.disc(hx + 3 * scl, hy - 1 * scl, 0.7 * scl, 240, 235, 220, 1);
  }

  /* ---- black dog (perky ears) side view, faces right ---------------------*/
  function blackDog(D, x, y, scl, bob, tailWag, earFlick) {
    var body = [28, 24, 34], dark = [14, 12, 18];
    var bx = x, by = y + bob;
    // back legs
    D.ellipse(bx - 11 * scl, by + 15 * scl, 2.3 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    D.ellipse(bx - 7 * scl, by + 15 * scl, 2.3 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    // body
    D.ellipse(bx, by + 5 * scl, 15 * scl, 7.5 * scl, 0, body[0], body[1], body[2], 1);
    // front legs (lifted slightly for running)
    D.ellipse(bx + 8 * scl, by + 15 * scl, 2.3 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    D.ellipse(bx + 12 * scl, by + 14 * scl, 2.3 * scl, 7 * scl, 0.2, dark[0], dark[1], dark[2], 1);
    // tail — up and curled
    D.ellipse(bx - 14 * scl + Math.cos(1.8 + tailWag) * 2 * scl,
              by - 2 * scl + Math.sin(1.8 + tailWag) * 2 * scl,
              5.5 * scl, 1.4 * scl, 1.8 + tailWag * 0.3, body[0], body[1], body[2], 1);
    // chest
    D.ellipse(bx + 10 * scl, by + 1 * scl, 5 * scl, 5.5 * scl, 0.2, body[0], body[1], body[2], 1);
    // head
    var hx = bx + 15 * scl, hy = by - 4 * scl;
    D.disc(hx, hy, 6 * scl, body[0], body[1], body[2], 1);
    // muzzle
    D.ellipse(hx + 4.5 * scl, hy + 2 * scl, 3 * scl, 2.2 * scl, 0, body[0], body[1], body[2], 1);
    // nose
    D.disc(hx + 7 * scl, hy + 2 * scl, 0.9 * scl, 8, 6, 10, 1);
    // perky triangle ears
    D.tri(hx - 4 * scl, hy - 4 * scl,
          hx - 1 * scl, hy - 9 * scl - earFlick * 1.5 * scl,
          hx + 1 * scl, hy - 4 * scl,
          body[0], body[1], body[2], 1);
    D.tri(hx + 1 * scl, hy - 4 * scl,
          hx + 4 * scl, hy - 9 * scl + earFlick * 1.5 * scl,
          hx + 6 * scl, hy - 4 * scl,
          body[0], body[1], body[2], 1);
    // eye highlight
    D.disc(hx + 3 * scl, hy - 1 * scl, 0.6 * scl, 220, 215, 200, 1);
  }

  /* ---- gray cat (sleek, tail up) side view, faces left -------------------*/
  function grayCat(D, x, y, scl, bob, tailSway, earFlick) {
    var body = [132, 130, 138], dark = [78, 76, 84], light = [180, 178, 184];
    var bx = x, by = y + bob;
    // body — sleeker / longer than dogs
    D.ellipse(bx, by + 6 * scl, 14 * scl, 6 * scl, 0, body[0], body[1], body[2], 1);
    // belly highlight
    D.ellipse(bx + 1 * scl, by + 9 * scl, 9 * scl, 3 * scl, 0, light[0], light[1], light[2], 0.6);
    // legs (cat faces left, so head end is on the left)
    D.ellipse(bx - 9 * scl, by + 14 * scl, 1.9 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    D.ellipse(bx - 5 * scl, by + 14 * scl, 1.9 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    D.ellipse(bx + 7 * scl, by + 14 * scl, 1.9 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    D.ellipse(bx + 11 * scl, by + 14 * scl, 1.9 * scl, 7 * scl, 0, dark[0], dark[1], dark[2], 1);
    // tail — UP, curled, swaying
    var tBaseX = bx + 13 * scl, tBaseY = by + 5 * scl;
    var sw = tailSway;
    D.ellipse(tBaseX + 1 * scl, tBaseY - 4 * scl,
              5.5 * scl, 1.5 * scl, -1.2 + sw * 0.3, body[0], body[1], body[2], 1);
    D.ellipse(tBaseX + 2.5 * scl + Math.cos(sw) * 1.2 * scl, tBaseY - 11 * scl,
              5 * scl, 1.4 * scl, -1.55 + sw * 0.4, body[0], body[1], body[2], 1);
    // tail tip (curls back slightly)
    D.ellipse(tBaseX + 4 * scl, tBaseY - 16 * scl,
              3 * scl, 1.3 * scl, -1.9 + sw * 0.5, body[0], body[1], body[2], 1);
    // head (left side)
    var hx = bx - 12 * scl, hy = by - 1 * scl;
    D.disc(hx, hy, 5 * scl, body[0], body[1], body[2], 1);
    // small muzzle
    D.ellipse(hx - 3.5 * scl, hy + 1.5 * scl, 2 * scl, 1.5 * scl, 0, body[0], body[1], body[2], 1);
    // pointed ears
    D.tri(hx - 3 * scl, hy - 3.5 * scl,
          hx - 2 * scl, hy - 8 * scl - earFlick * 1.2 * scl,
          hx, hy - 3.5 * scl,
          body[0], body[1], body[2], 1);
    D.tri(hx, hy - 3.5 * scl,
          hx + 2 * scl, hy - 8 * scl + earFlick * 1.2 * scl,
          hx + 3.5 * scl, hy - 3.5 * scl,
          body[0], body[1], body[2], 1);
    // nose
    D.disc(hx - 4 * scl, hy + 1 * scl, 0.6 * scl, 80, 60, 70, 1);
    // eye
    D.disc(hx - 1.5 * scl, hy - 0.5 * scl, 0.7 * scl, 240, 230, 180, 1);
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;
    var horizonY = 0.55 * H;
    var groundTop = 0.62 * H;
    var fenceTopY = 0.65 * H;

    /* 1. BG safety fill ---------------------------------------------------*/
    D.bg(255, 220, 190);

    /* 2. SKY GRADIENT — warm summative pink → cream/peach ------------------*/
    SK.vGradient(D, W, horizonY, [
      [0, [230, 180, 175]],
      [0.45, [248, 200, 178]],
      [0.85, [255, 218, 188]],
      [1, [255, 228, 198]]
    ], Math.round(4 * sc));

    /* 3. SOFT SUN GLOW in upper-right (low, behind hills) for warmth -----*/
    SK.glow(D, 0.84 * W, 0.42 * H, 0.040 * W, [255, 225, 185],
            { halo: [[4.2, 0.05], [2.6, 0.10], [1.6, 0.22]], coreAlpha: 0.80 });

    /* 4. CLOUDS — drift slowly on t. The text sits AMONG these. -----------*/
    var cloudCol = [252, 240, 220];
    function cloud(xf, yf, wf, hf, a, speed) {
      var period = W + 0.5 * W;
      var cx = ((xf * W + t * speed * sc) % period + period) % period - 0.25 * W;
      wisp(D, cx, yf * H, wf * W, hf * H, cloudCol, a);
    }
    // back layer (smaller, softer)
    cloud(0.10, 0.10, 0.10, 0.012, 0.65, 3);
    cloud(0.85, 0.07, 0.09, 0.011, 0.60, 2.5);
    cloud(0.45, 0.06, 0.11, 0.010, 0.55, 2);
    // front cloud layer surrounding text (~y=0.18*H)
    cloud(0.08, 0.16, 0.14, 0.018, 0.88, 4);
    cloud(0.30, 0.22, 0.13, 0.016, 0.85, 3.5);
    cloud(0.58, 0.16, 0.15, 0.018, 0.90, 4.5);
    cloud(0.82, 0.22, 0.13, 0.016, 0.85, 3);
    // a low band of haze near the horizon
    cloud(0.20, 0.42, 0.16, 0.012, 0.45, 1.5);
    cloud(0.72, 0.44, 0.15, 0.011, 0.40, 1.2);

    /* 5. TEXT "TO BE CONTINUED..." baked into the sky ---------------------*/
    // Fit: full string + 3 dots must fit inside W. At px buffer-pixels per
    // bit, advance is 6*px and a glyph is 5*px wide. We compute px so the
    // FULL string (with 3 dots) fits in 88% of W, then center it horizontally.
    var baseStr = 'TO BE CONTINUED';
    var dotsStr = '...';
    // total glyphs (counting trailing 3 dots placed with normal advance):
    // length = (baseStr.length + 3) * 6 * px - px  →  solve for px ≤ targetW
    var targetW = 0.88 * W;
    var maxPx = Math.floor((targetW + 1) / ((baseStr.length + 3) * 6 - 1));
    var px = Math.max(2, Math.min(maxPx, Math.round(6 * sc)));
    var textCol = [98, 64, 50];                  // warm rich brown — reads on cream
    var baseW = SK.textWidth(baseStr, px);
    var advance = 6 * px;
    var fullW = SK.textWidth(baseStr + dotsStr, px); // base + dots with normal spacing
    var tx0 = Math.round((W - fullW) / 2);
    var ty0 = Math.round(0.19 * H - 3.5 * px);

    // Base text fade-in u in [0.05, 0.30]
    var baseAlpha = SK.smoothstep(0.05, 0.30, u);
    if (baseAlpha > 0) {
      SK.text(D, tx0, ty0, baseStr, px, textCol, baseAlpha);
    }
    // Three dots reveal at u = 0.50, 0.65, 0.80, each fade in over 0.06.
    // Placed at the advance position right after the previous glyph.
    var dotTimes = [0.50, 0.65, 0.80];
    for (var di = 0; di < 3; di++) {
      var da = SK.smoothstep(dotTimes[di], dotTimes[di] + 0.06, u);
      if (da > 0) {
        var dx = tx0 + baseW + advance * (di + 1);
        SK.text(D, dx, ty0, '.', px, textCol, da);
      }
    }

    /* 6. DISTANT HILL (lighter green, atmospheric) ------------------------*/
    SK.ridgeFrac(D, [
      [0, 0.94], [0.10, 0.84], [0.22, 0.90], [0.36, 0.78], [0.50, 0.86],
      [0.62, 0.76], [0.74, 0.84], [0.86, 0.80], [1, 0.88]
    ], W, horizonY, [168, 198, 138], 1);

    /* 7. MID HILL (mid green) ---------------------------------------------*/
    SK.ridgeFrac(D, [
      [0, 1.00], [0.08, 0.95], [0.20, 1.00], [0.32, 0.92], [0.46, 0.98],
      [0.58, 0.90], [0.70, 0.97], [0.82, 0.93], [0.92, 1.00], [1, 0.96]
    ], W, groundTop, [140, 175, 110], 1);

    /* 8. FOREGROUND LAWN (in front of fence) ------------------------------*/
    D.rect(0, groundTop, W, H - groundTop, 100, 145, 80, 1);
    // subtle lawn shading near top (darker at horizon line)
    D.rect(0, groundTop, W, 0.020 * H, 80, 125, 65, 0.55);
    // tiny lighter blades scattered across the lawn for texture
    var blades = SK.rng(7);
    for (var bi = 0; bi < 60; bi++) {
      var lx = blades() * W, ly = groundTop + 0.05 * H + blades() * (H - groundTop - 0.05 * H);
      D.rect(lx, ly, 1.5 * sc, 2.5 * sc, 130, 170, 95, 0.55);
    }

    /* 9. GRAY METAL FENCE — top rail + pickets ----------------------------*/
    var fenceGray = [120, 130, 140];
    var fenceLight = [165, 172, 180];
    var fenceDark = [85, 92, 105];
    var pickH = 0.07 * H;
    var pickTop = fenceTopY;
    var pickBot = pickTop + pickH;
    var pickW = 0.0045 * W;
    var pickStep = 0.022 * W;
    // back: a dim horizontal "shadow" line where fence base meets lawn
    D.rect(0, pickBot - 0.003 * H, W, 0.004 * H, 70, 85, 70, 0.55);
    // pickets
    for (var px2 = 0; px2 < W; px2 += pickStep) {
      D.rect(px2, pickTop, pickW, pickH, fenceGray[0], fenceGray[1], fenceGray[2], 1);
      // subtle highlight on left edge of each picket
      D.rect(px2, pickTop, pickW * 0.4, pickH, fenceLight[0], fenceLight[1], fenceLight[2], 0.7);
    }
    // top rail
    var railY = pickTop - 0.006 * H;
    var railH = 0.010 * H;
    D.rect(0, railY, W, railH, fenceDark[0], fenceDark[1], fenceDark[2], 1);
    D.rect(0, railY, W, railH * 0.45, fenceLight[0], fenceLight[1], fenceLight[2], 0.9);
    // bottom rail
    var rail2Y = pickBot - 0.012 * H;
    D.rect(0, rail2Y, W, 0.008 * H, fenceDark[0], fenceDark[1], fenceDark[2], 1);
    D.rect(0, rail2Y, W, 0.008 * H * 0.45, fenceLight[0], fenceLight[1], fenceLight[2], 0.7);

    /* 10. ANIMALS — foreground, the largest brightest figures ------------*/
    // Bounce/twitch derived from t. Cat does a jump arc around u in [0.55, 0.72].
    var animalScl = 1.35 * sc;
    var groundY = 0.86 * H;  // where animal feet rest

    // brown dog (left)
    var bdBob = Math.sin(t * 4.0) * 1.6 * sc;
    var bdTail = Math.sin(t * 8.0) * 0.5;
    var bdEar = Math.sin(t * 3.5 + 1.2) * 0.15;
    brownDog(D, 0.22 * W, groundY, animalScl, bdBob, bdTail, bdEar);

    // black dog (center)
    var kdBob = Math.sin(t * 4.4 + 1.0) * 1.8 * sc;
    var kdTail = Math.sin(t * 9.0 + 0.7) * 0.6;
    var kdEar = Math.sin(t * 4.0 + 0.4) * 0.3;
    blackDog(D, 0.48 * W, groundY, animalScl, kdBob, kdTail, kdEar);

    // gray cat (right) — does a little jump arc once per loop
    var jumpStart = 0.55, jumpEnd = 0.72;
    var jumpY = 0;
    if (u > jumpStart && u < jumpEnd) {
      var jt = (u - jumpStart) / (jumpEnd - jumpStart);
      // parabolic arc, peaks at middle
      jumpY = -Math.sin(jt * Math.PI) * 22 * sc;
    }
    var catBob = Math.sin(t * 5.0 + 2.0) * 1.2 * sc;
    var catTail = Math.sin(t * 3.0) * 0.5;
    var catEar = Math.sin(t * 4.5 + 0.8) * 0.2;
    grayCat(D, 0.74 * W, groundY + jumpY, animalScl, catBob, catTail, catEar);

    /* 11. Subtle warm light wash near horizon (golden hour vibe) ---------*/
    D.rect(0, horizonY - 0.015 * H, W, 0.06 * H, 255, 220, 180, 0.10);
  }

  return { id: 'continued', name: 'to be continued', dur: 12.0, draw: draw };
});
