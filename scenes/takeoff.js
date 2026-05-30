/* ============================================================================
 * scenes/takeoff.js — passenger jet lifting off a coastal runway at sunset.
 * Composition matches sceneRefs/scene1Takeoff.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  // White airliner silhouette, side view. dir=-1 faces left; positive ang lifts nose up.
  function airliner(D, x, y, ang, scl, dir) {
    var P = SK.pen(x, y, ang, scl, dir);
    var hull = [242, 236, 224], dark = [38, 28, 56];
    // fuselage
    D.ellipse(x, y, 30 * scl, 4.2 * scl, ang, hull[0], hull[1], hull[2], 1);
    // tail fin
    var a = P(-21, -1), b = P(-29, -12), c = P(-14, -1);
    D.tri(a[0], a[1], b[0], b[1], c[0], c[1], hull[0], hull[1], hull[2], 1);
    // wing (visible side, swept back)
    var w1 = P(2, 1.5), w2 = P(-17, 7.5), w3 = P(-3, 3);
    D.tri(w1[0], w1[1], w2[0], w2[1], w3[0], w3[1], hull[0], hull[1], hull[2], 1);
    // engine pod under wing
    var ep = P(-5, 4.8);
    D.ellipse(ep[0], ep[1], 5 * scl, 1.7 * scl, ang, dark[0], dark[1], dark[2], 1);
    // horizontal stabilizer at tail base
    var s1 = P(-22, 0), s2 = P(-29, 1), s3 = P(-22, 1.8);
    D.tri(s1[0], s1[1], s2[0], s2[1], s3[0], s3[1], hull[0], hull[1], hull[2], 1);
    // nose tip
    var n = P(16, 0);
    D.ellipse(n[0], n[1], 3 * scl, 2.4 * scl, ang, hull[0], hull[1], hull[2], 1);
    // cockpit window
    var ck = P(12, -1);
    D.disc(ck[0], ck[1], 1.2 * scl, dark[0], dark[1], dark[2], 1);
    // passenger window strip
    for (var i = 0; i < 8; i++) {
      var wp = P(-1 - i * 2.4, -0.6);
      D.disc(wp[0], wp[1], 0.55 * scl, dark[0], dark[1], dark[2], 0.85);
    }
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;
    var hy = 0.62 * H;        // horizon (top of water)
    var groundTop = 0.78 * H; // tarmac starts here

    /* 1. SKY — deep purple → magenta → bold orange horizon -----------------*/
    SK.vGradient(D, W, hy, [
      [0, [48, 28, 92]],
      [0.35, [128, 50, 110]],
      [0.65, [220, 90, 100]],
      [0.88, [252, 130, 80]],
      [1, [255, 150, 80]]
    ], Math.round(4 * sc));

    /* 2. STARS — only in the upper, darker portion -------------------------*/
    SK.starfield(D, W, hy * 0.55, 35, 2024, t);

    /* 3. CRESCENT MOON (upper-left): bright disc + offset sky-tone "bite" --*/
    var mx = 0.21 * W, my = 0.16 * H, mr = 0.022 * W;
    SK.glow(D, mx, my, mr * 0.55, [248, 232, 208], { halo: [[3.2, 0.06], [2.0, 0.14]], coreAlpha: 0 });
    D.disc(mx, my, mr, 248, 232, 208, 1);
    D.disc(mx - mr * 0.45, my - mr * 0.10, mr * 0.93, 100, 42, 102, 1);

    /* 4. CLOUD BANDS — smooth horizontal wisps, drifting on t --------------*/
    function wisp(cx, cy, w, h, col, a) {
      // outer feather → mid body → bright core, all elongated horizontally
      D.ellipse(cx, cy, w * 1.8, h * 2.4, 0, col[0], col[1], col[2], a * 0.18);
      D.ellipse(cx, cy, w * 1.35, h * 1.6, 0, col[0], col[1], col[2], a * 0.35);
      D.ellipse(cx, cy, w, h, 0, col[0], col[1], col[2], a * 0.85);
      D.ellipse(cx - w * 0.45, cy + h * 0.25, w * 0.7, h * 0.85, 0, col[0], col[1], col[2], a * 0.7);
      D.ellipse(cx + w * 0.40, cy - h * 0.15, w * 0.6, h * 0.7, 0, col[0], col[1], col[2], a * 0.65);
    }
    function cloudBand(xf, yf, wf, hf, a, col) {
      var cx = ((xf * W + t * 5 * sc) % (W + 0.5 * W)) - 0.25 * W;
      wisp(cx, yf * H, wf * W, hf * H, col, a);
    }
    cloudBand(0.14, 0.22, 0.18, 0.012, 0.85, [240, 168, 174]);
    cloudBand(0.58, 0.13, 0.14, 0.010, 0.78, [248, 180, 180]);
    cloudBand(0.80, 0.28, 0.17, 0.014, 0.80, [232, 138, 148]);
    cloudBand(0.34, 0.35, 0.16, 0.011, 0.70, [232, 128, 130]);
    cloudBand(0.05, 0.08, 0.10, 0.008, 0.55, [220, 140, 160]);

    /* 5. DISTANT COASTLINE — two ridges, atmospheric perspective -----------*/
    SK.ridgeFrac(D, [
      [0, 0.80], [0.12, 0.72], [0.24, 0.78], [0.38, 0.66], [0.52, 0.74],
      [0.65, 0.62], [0.78, 0.70], [0.90, 0.66], [1, 0.74]
    ], W, hy, [122, 76, 130], 1);
    SK.ridgeFrac(D, [
      [0, 0.94], [0.15, 0.84], [0.30, 0.92], [0.45, 0.80], [0.60, 0.88],
      [0.75, 0.78], [0.88, 0.86], [1, 0.84]
    ], W, hy, [70, 40, 95], 1);

    /* 6. WATER (between coastline and tarmac) ------------------------------*/
    D.rect(0, hy, W, groundTop - hy, 28, 22, 64, 1);
    // sunset shimmer on water (broader and brighter for a readable streak)
    D.rect(0.22 * W, hy + 0.004 * H, 0.62 * W, 0.014 * H, 255, 135, 85, 0.45);
    D.rect(0.30 * W, hy + 0.022 * H, 0.50 * W, 0.010 * H, 240, 110, 70, 0.32);
    D.rect(0.38 * W, hy + 0.038 * H, 0.34 * W, 0.008 * H, 220, 90, 65, 0.22);

    /* 7. DISTANT CITY LIGHTS on the far shore ------------------------------*/
    var rng = SK.rng(91);
    for (var i = 0; i < 48; i++) {
      var lx = rng() * W, ly = hy + 0.004 * H + rng() * 0.012 * H;
      var tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
      D.disc(lx, ly, 0.7 * sc, 255, 200, 130, 0.55 * tw + 0.25);
    }

    /* 8. TARMAC --------------------------------------------------------------*/
    D.rect(0, groundTop, W, H - groundTop, 16, 12, 32, 1);

    /* 9. DISTANT TERMINAL (back of the airport, behind the tower) -----------*/
    D.rect(0.42 * W, 0.69 * H, 0.40 * W, 0.05 * H, 30, 22, 52, 0.85);
    for (var k = 0; k < 16; k++) {
      var dx = 0.43 * W + k * 0.024 * W;
      D.rect(dx, 0.71 * H, 0.006 * W, 0.008 * H, 255, 180, 90, 0.85);
    }

    /* 10. CONTROL TOWER (left of center) ------------------------------------*/
    var towX = 0.30 * W;
    D.rect(towX - 0.0035 * W, 0.50 * H, 0.007 * W, 0.28 * H, 32, 24, 52, 1);
    var cabW = 0.04 * W, cabH = 0.045 * H, cabY = 0.46 * H;
    D.rect(towX - cabW, cabY, cabW * 2, cabH, 38, 28, 58, 1);
    D.rect(towX - cabW * 0.85, cabY + cabH * 0.30, cabW * 1.7, cabH * 0.35, 255, 180, 95, 0.95);
    D.rect(towX - cabW * 0.7, cabY - 0.011 * H, cabW * 1.4, 0.012 * H, 30, 22, 50, 1);
    D.rect(towX - 0.0025 * W, cabY - 0.05 * H, 0.005 * W, 0.04 * H, 36, 26, 54, 1);
    var beac = 0.5 + 0.5 * Math.sin(t * 4);
    D.disc(towX, cabY - 0.054 * H, 0.005 * W + 0.003 * W * beac, 255, 90, 60, 0.5 + 0.5 * beac);

    /* 11. MAIN TERMINAL (center) --------------------------------------------*/
    var t0 = 0.36 * W, t1 = 0.74 * W, tTop = 0.74 * H, tBot = 0.86 * H;
    D.rect(t0, tTop, t1 - t0, tBot - tTop, 24, 16, 44, 1);
    D.rect(t0, tTop, t1 - t0, 0.008 * H, 18, 12, 36, 1);
    var nW = 20;
    for (var iw = 0; iw < nW; iw++) {
      var wx = SK.lerp(t0 + 0.008 * W, t1 - 0.008 * W, iw / (nW - 1));
      D.rect(wx - 0.005 * W, 0.762 * H, 0.010 * W, 0.012 * H, 255, 180, 90, 0.95);
      D.rect(wx - 0.004 * W, 0.785 * H, 0.008 * W, 0.010 * H, 255, 160, 80, 0.78);
    }
    D.rect(t0, tBot, t1 - t0, 0.008 * H, 255, 160, 80, 0.22);

    /* 12. HANGARS on the right (arched silhouettes) -------------------------*/
    function hangar(x, w, h, top, col, glow) {
      D.rect(x, top, w, h, col[0], col[1], col[2], 1);
      D.tri(x, top, x + w * 0.5, top - 0.026 * H, x + w, top, col[0], col[1], col[2], 1);
      D.rect(x + w * 0.15, top + h * 0.45, w * 0.7, h * 0.45, 255, 160, 80, glow);
    }
    hangar(0.755 * W, 0.105 * W, 0.10 * H, 0.78 * H, [24, 18, 44], 0.55);
    hangar(0.875 * W, 0.115 * W, 0.09 * H, 0.79 * H, [22, 16, 40], 0.42);

    /* 13. LEFT CARGO/TERMINAL BLOCK -----------------------------------------*/
    D.rect(0.08 * W, 0.81 * H, 0.16 * W, 0.07 * H, 26, 18, 46, 1);
    for (var jw = 0; jw < 6; jw++) {
      var lwx = 0.10 * W + jw * 0.022 * W;
      D.rect(lwx, 0.83 * H, 0.012 * W, 0.010 * H, 255, 175, 90, 0.90);
    }

    /* 14. RUNWAY with dashed centerline (dashes drift on t) -----------------*/
    D.rect(0, 0.905 * H, W, 0.018 * H, 50, 38, 72, 1);
    var nDash = 12, dashStep = W / nDash, drift = (t * 14 * sc) % dashStep;
    for (var d = -1; d < nDash; d++) {
      var dx = d * dashStep + drift;
      D.rect(dx, 0.913 * H, 0.030 * W, 0.003 * H, 255, 220, 180, 0.55);
    }

    /* 15. LIGHT POLES along the runway --------------------------------------*/
    [0.18, 0.48, 0.70].forEach(function (pxf) {
      var px = pxf * W, pTop = 0.84 * H, pBot = 0.905 * H;
      D.rect(px - 0.002 * W, pTop, 0.004 * W, pBot - pTop, 32, 24, 50, 1);
      D.rect(px - 0.018 * W, pTop - 0.004 * H, 0.036 * W, 0.008 * H, 36, 26, 54, 1);
      D.disc(px, pTop - 0.003 * H, 0.008 * W, 255, 220, 160, 0.5);
      D.disc(px, pTop - 0.003 * H, 0.004 * W, 255, 240, 200, 0.95);
    });

    /* 16. JET — three eased u-phases (roll → rotate → climb) ---------------*/
    var x, y, pitch, scl, tr;
    var runY = 0.895 * H;
    if (u < 0.50) {
      tr = u / 0.50;
      x = SK.lerp(0.85, 0.50, SK.easeInQuad(tr)) * W;
      y = runY;
      pitch = 0;
      scl = SK.lerp(0.52, 0.66, tr);
    } else if (u < 0.65) {
      tr = (u - 0.50) / 0.15;
      x = SK.lerp(0.50, 0.34, tr) * W;
      y = SK.lerp(runY, 0.82 * H, SK.easeInQuad(tr));
      pitch = SK.lerp(0, 0.32, tr);
      scl = SK.lerp(0.66, 0.80, tr);
    } else {
      tr = (u - 0.65) / 0.35;
      x = SK.lerp(0.34, -0.12, tr) * W;
      y = SK.lerp(0.82 * H, 0.08 * H, SK.easeOutQuad(tr));
      pitch = SK.lerp(0.32, 0.54, tr);
      scl = SK.lerp(0.80, 1.04, tr);
    }
    airliner(D, x, y, pitch, scl * sc, -1);
  }

  return { id: 'takeoff', name: 'wheels up', dur: 13.0, draw: draw };
});
