/* ============================================================================
 * scenes.js  —  the scene registry
 *
 * Each scene is a plain object:  { id, name, dur, draw(D, W, H, u, t) }
 *   id   : stable string id
 *   name : caption shown in the gallery
 *   dur  : seconds for one loop of the scene (u runs 0->1 over `dur`)
 *   draw : renders ONE frame into the buffer via the D adapter.
 *          u = scene progress 0..1 (drives subject motion)
 *          t = continuous seconds (drives ambient drift: clouds, flicker, ...)
 *
 * Author against SceneKit (SK.*) and the D contract only. Never reference p5,
 * the DOM, window, or a canvas here — so these scenes run unchanged in the
 * browser AND in the Node preview tool. See SPEC.md.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./scene-kit.js'));
  else root.SCENES = factory(root.SceneKit);
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  /* ---- reusable subject: backlit jet silhouette (dir=-1 faces left) ------*/
  function jet(D, x, y, ang, scl, dir) {
    var P = SK.pen(x, y, ang, scl, dir);
    var body = [34, 28, 50], hi = [120, 96, 120], warm = [255, 170, 110], a, b, c;
    a = P(2, 1); b = P(-16, 15); c = P(8, 3); D.tri(a[0], a[1], b[0], b[1], c[0], c[1], body[0], body[1], body[2], 1);
    a = P(-2, -1); b = P(-18, -13); c = P(6, -2); D.tri(a[0], a[1], b[0], b[1], c[0], c[1], 26, 22, 42, 1);
    a = P(-24, -1); b = P(-30, -19); c = P(-17, -1); D.tri(a[0], a[1], b[0], b[1], c[0], c[1], body[0], body[1], body[2], 1);
    a = P(-21, 0); b = P(-32, 4); c = P(-21, 3); D.tri(a[0], a[1], b[0], b[1], c[0], c[1], body[0], body[1], body[2], 1);
    D.ellipse(x, y, 30 * scl, 8 * scl, ang, body[0], body[1], body[2], 1);
    a = P(28, -1); b = P(37, 2.5); c = P(28, 6); D.tri(a[0], a[1], b[0], b[1], c[0], c[1], body[0], body[1], body[2], 1);
    var hc = P(0, -3.5); D.ellipse(hc[0], hc[1], 24 * scl, 2.6 * scl, ang, hi[0], hi[1], hi[2], 0.6);
    var wc = P(-1, 4); D.ellipse(wc[0], wc[1], 22 * scl, 1.8 * scl, ang, warm[0], warm[1], warm[2], 0.35);
    for (var i = 0; i < 5; i++) { var wp = P(-10 + i * 6, -3); D.disc(wp[0], wp[1], 1.2 * scl, 240, 200, 150, 0.7); }
  }

  /* ======================= SCENE: airport at sunset ======================= *
   * Reference-matched. Jet takes off from the right, climbs off upper-left.
   * Canonical example of: gradient sky, atmospheric-perspective ridges,
   * perspective tarmac, lit architecture, an eased multi-phase subject. */
  function airportSunset(D, W, H, u, t) {
    var sc = W / 680, hy = 0.60 * H;
    SK.vGradient(D, W, hy, [[0, [120, 152, 184]], [0.55, [232, 176, 150]], [1, [252, 166, 104]]], Math.round(4 * sc));
    SK.glow(D, 0.16 * W, hy - 0.135 * H, 0.05 * W, [255, 250, 238], { halo: [[2.7, 0.16], [1.8, 0.34], [1.18, 0.7]] });
    function cl(cxf, cyf, wf, a) { var cx = ((cxf * W + t * 4 * sc) % (W + 0.3 * W)) - 0.15 * W; SK.cloud(D, cx, cyf * H, wf * W, [236, 150, 108], a); }
    cl(0.52, 0.27, 0.42, 0.5); cl(0.74, 0.36, 0.34, 0.42); cl(0.34, 0.20, 0.30, 0.40);
    SK.ridgeFrac(D, [[0, 0.66], [0.15, 0.58], [0.3, 0.64], [0.45, 0.55], [0.6, 0.60], [0.72, 0.50], [0.85, 0.62], [1.0, 0.57]], W, hy, [160, 134, 172], 1);
    SK.ridgeFrac(D, [[0, 0.74], [0.12, 0.66], [0.28, 0.72], [0.42, 0.60], [0.55, 0.66], [0.63, 0.46], [0.7, 0.58], [0.82, 0.66], [0.92, 0.58], [1.0, 0.7]], W, hy, [112, 86, 128], 1);
    SK.ridgeFrac(D, [[0, 0.9], [0.2, 0.84], [0.4, 0.9], [0.55, 0.85], [0.7, 0.9], [0.85, 0.86], [1.0, 0.9]], W, hy, [66, 52, 90], 1);
    D.rect(0, hy, W, H - hy, 46, 40, 64, 1);
    D.rect(0, hy, W, 0.06 * H, 150, 95, 75, 0.4);
    D.rect(0, 0.82 * H, W, 0.18 * H, 36, 30, 50, 0.5);
    SK.perspectiveDashes(D, [0.06, 0.26, 0.5, 0.74, 0.94], [0.46 * W, hy + 2 * sc], H + 4 * sc, W, [232, 150, 92], { sc: sc });
    var tw0 = 0.30 * W, tw1 = 0.80 * W, tTop = 0.557 * H, tBase = 0.638 * H;
    D.rect(tw0, tTop, tw1 - tw0, tBase - tTop, 36, 30, 52, 1);
    D.rect(tw0, tTop, tw1 - tw0, 0.012 * H, 28, 24, 44, 1);
    var winY = SK.lerp(tTop, tBase, 0.52), wh = 0.026 * H, ww = 0.012 * W, n = 22;
    for (var i = 0; i < n; i++) { var wx = SK.lerp(tw0 + 8 * sc, tw1 - 8 * sc, i / (n - 1)); D.rect(wx - ww / 2, winY - wh / 2, ww, wh, 255, 172, 82, 0.95); }
    D.rect(tw0, tBase, tw1 - tw0, 0.01 * H, 255, 160, 80, 0.22);
    [0.225, 0.255].forEach(function (pxf) {
      var px = pxf * W, pTop = 0.45 * H;
      D.rect(px - 0.003 * W, pTop, 0.006 * W, tBase - pTop, 40, 34, 54, 1);
      D.rect(px - 0.02 * W, pTop - 0.006 * H, 0.04 * W, 0.012 * H, 44, 38, 58, 1);
      D.disc(px, pTop, 0.01 * W, 255, 210, 150, 0.5); D.disc(px, pTop, 0.005 * W, 255, 235, 190, 0.9);
    });
    var towX = 0.82 * W, shTop = 0.205 * H, wTop = 0.016 * W, wBot = 0.024 * W;
    D.tri(towX - wBot, tBase, towX + wBot, tBase, towX + wTop, shTop, 40, 32, 54, 1);
    D.tri(towX - wBot, tBase, towX + wTop, shTop, towX - wTop, shTop, 40, 32, 54, 1);
    var cabW = 0.05 * W, cabH = 0.055 * H, cabY = 0.16 * H;
    D.tri(towX - cabW, cabY + cabH, towX + cabW, cabY + cabH, towX + wTop, cabY + cabH + 0.022 * H, 40, 32, 54, 1);
    D.tri(towX - cabW, cabY + cabH, towX + wTop, cabY + cabH + 0.022 * H, towX - wTop, cabY + cabH + 0.022 * H, 40, 32, 54, 1);
    D.rect(towX - cabW, cabY, cabW * 2, cabH, 44, 36, 58, 1);
    D.rect(towX - cabW * 0.82, cabY + cabH * 0.30, cabW * 1.64, cabH * 0.34, 255, 180, 96, 0.9);
    D.rect(towX - cabW * 0.7, cabY - 0.012 * H, cabW * 1.4, 0.014 * H, 32, 26, 46, 1);
    D.rect(towX - 0.004 * W, cabY - 0.06 * H, 0.008 * W, 0.05 * H, 44, 36, 58, 1);
    var beac = 0.5 + 0.5 * Math.sin(t * 4);
    D.disc(towX, cabY - 0.062 * H, 0.006 * W + 0.004 * W * beac, 255, 70, 60, 0.6 + 0.4 * beac);
    // jet: 3 eased phases — roll, rotate, climb
    var x, y, pitch, scl, tr, gY = 0.665 * H;
    if (u < 0.45) { tr = u / 0.45; x = SK.lerp(0.82, 0.58, SK.easeInQuad(tr)) * W; y = gY; pitch = 0; scl = SK.lerp(0.45, 0.62, tr); }
    else if (u < 0.62) { tr = (u - 0.45) / 0.17; x = SK.lerp(0.58, 0.48, tr) * W; y = SK.lerp(gY, 0.60 * H, SK.easeInQuad(tr)); pitch = SK.lerp(0, 0.32, tr); scl = SK.lerp(0.62, 0.8, tr); }
    else { tr = (u - 0.62) / 0.38; x = SK.lerp(0.48, -0.10, tr) * W; y = SK.lerp(0.60 * H, 0.06 * H, SK.easeOutQuad(tr)); pitch = SK.lerp(0.32, 0.52, tr); scl = SK.lerp(0.8, 1.02, tr); }
    jet(D, x, y, pitch, scl * sc, -1);
  }

  /* ======================= SCENE: bird's-eye flyover ====================== *
   * Top-down map; a glowing marker flies a bezier arc from lower-right to
   * upper-left. Example of: dark base + brightness-driven texture, a subject
   * travelling a path with correct heading (tangent), comet trail. */
  function flyover(D, W, H, u, t) {
    var sc = W / 680;
    D.bg(8, 16, 18);
    [[0.18, 0.30, 260], [0.70, 0.24, 230], [0.40, 0.74, 300], [0.82, 0.66, 240], [0.10, 0.80, 220]].forEach(function (w) {
      var x = w[0] * W + Math.sin(t * 0.1 + w[0] * 9) * 10 * sc, y = w[1] * H + Math.cos(t * 0.08 + w[1] * 7) * 8 * sc;
      D.disc(x, y, w[2] * sc, 14, 26, 28, 0.5);
    });
    function land(fx, fy, R, col) { SK.blob(D, fx * W + Math.sin(t * 0.05 + fx * 5) * 6 * sc, fy * H + Math.cos(t * 0.045 + fy * 5) * 5 * sc, R * sc, col); }
    land(0.37, 0.46, 175, [74, 84, 52]); land(0.28, 0.27, 95, [86, 94, 58]); land(0.76, 0.74, 118, [70, 78, 50]);
    var P0 = [0.76 * W, 0.73 * H], C = [0.42 * W, 0.14 * H], P1 = [0.27 * W, 0.27 * H], s, pt;
    for (s = 0; s <= 1.0001; s += 0.025) { pt = SK.bez(P0, C, P1, s); var pulse = 0.7 + 0.3 * Math.sin(t * 3 - s * 12); D.disc(pt[0], pt[1], 2.2 * sc, 120, 120, 86, 0.55 * pulse + 0.2); }
    function ring(Pp, col) { D.disc(Pp[0], Pp[1], 7 * sc, col[0], col[1], col[2], 0.9); D.disc(Pp[0], Pp[1], 3.4 * sc, 8, 16, 18, 1); D.disc(Pp[0], Pp[1], 1.6 * sc, col[0], col[1], col[2], 1); }
    ring(P0, [210, 160, 96]); ring(P1, [205, 205, 120]);
    [[0.2, 0.62, 70, 0.16], [0.55, 0.2, 90, 0.13], [0.8, 0.5, 60, 0.15]].forEach(function (c) {
      var cx = ((c[0] * W + t * 6 * sc) % (W + 220 * sc)) - 110 * sc, cy = c[1] * H + Math.sin(t * 0.2 + c[0] * 8) * 8 * sc;
      SK.cloud(D, cx, cy, c[2] * sc * 2.2, [182, 190, 200], c[3]);
    });
    var u2 = SK.easeInOutCubic(SK.clamp(u, 0, 1)) * 0.98 + 0.01, k;
    for (k = 8; k >= 1; k--) { var sp = SK.clamp(u2 - k * 0.013, 0, 1), p2 = SK.bez(P0, C, P1, sp), f = 1 - k / 9; D.disc(p2[0], p2[1], (2 + 3 * f) * sc, 255, 232, 176, 0.10 + 0.30 * f); }
    var M = SK.bez(P0, C, P1, u2);
    SK.glow(D, M[0], M[1], 3.2 * sc, [255, 255, 238], { halo: [[2.8, 0.32], [1.7, 0.6]] });
    var T = SK.bezTan(P0, C, P1, u2), ang = Math.atan2(T[1], T[0]), P = SK.pen(M[0], M[1], ang, sc, 1), L = 8;
    var a1 = P(1.6 * L, 0), a2 = P(-0.9 * L, 0.8 * L), a3 = P(-0.9 * L, -0.8 * L);
    D.tri(a1[0], a1[1], a2[0], a2[1], a3[0], a3[1], 255, 250, 225, 1);
  }

  /* ======================= SCENE: campfire (night) ======================== *
   * Brand-new scene proving the kit handles a totally different subject and
   * palette: night sky + stars + moon, dark ridges, a tent, two seated
   * figures, and an animated campfire with flicker + rising embers. A
   * shooting star streaks once per loop (driven by u). */
  function seated(D, x, baseY, r, body, rim, side) {
    D.disc(x + side * r * 0.5, baseY - r * 0.7, r * 0.7, rim[0], rim[1], rim[2], 0.18); // fire-side rim glow
    D.disc(x, baseY - r * 0.7, r, body[0], body[1], body[2], 1);                        // torso
    D.disc(x, baseY - r * 1.7, r * 0.52, body[0], body[1], body[2], 1);                 // head
  }
  function campfire(D, x, y, r, t) {
    for (var i = 0; i < 5; i++) {
      var ph = i * 1.3, sway = Math.sin(t * 7 + ph) * r * 0.18, h = r * (1.3 + 0.5 * Math.sin(t * 9 + ph));
      var bx = x + (i - 2) * r * 0.28 + sway * 0.5;
      D.tri(bx - r * 0.34, y, bx + r * 0.34, y, bx + sway, y - h, 220, 90, 30, 0.9);
      D.tri(bx - r * 0.22, y, bx + r * 0.22, y, bx + sway * 0.8, y - h * 0.8, 245, 150, 40, 0.9);
      D.tri(bx - r * 0.10, y, bx + r * 0.10, y, bx + sway * 0.6, y - h * 0.55, 255, 220, 120, 0.95);
    }
    SK.glow(D, x, y - r * 0.2, r * 0.5, [255, 210, 120], { halo: [[2.0, 0.25], [1.3, 0.4]], coreAlpha: 0.7 });
  }
  function camping(D, W, H, u, t) {
    var sc = W / 680, hy = 0.62 * H;
    SK.vGradient(D, W, H, [[0, [8, 10, 28]], [0.45, [16, 18, 42]], [0.62, [30, 30, 58]], [1, [18, 18, 30]]], Math.round(4 * sc));
    SK.starfield(D, W, hy * 0.96, 130, 1337, t);
    SK.glow(D, 0.8 * W, 0.18 * H, 0.038 * W, [232, 236, 246], { halo: [[2.4, 0.10], [1.6, 0.20], [1.15, 0.45]] });
    if (u > 0.2 && u < 0.34) {
      var st = (u - 0.2) / 0.14, ssx = SK.lerp(0.25, 0.55, st) * W, ssy = SK.lerp(0.12, 0.28, st) * H;
      for (var s = 0; s < 8; s++) { var f = s / 8; D.disc(ssx - f * 40 * sc, ssy - f * 22 * sc, (2.2 - 2 * f) * sc, 255, 250, 235, (1 - f) * (1 - Math.abs(st - 0.5) * 2)); }
    }
    SK.ridgeFrac(D, [[0, 0.82], [0.18, 0.6], [0.34, 0.78], [0.5, 0.66], [0.66, 0.8], [0.82, 0.62], [1, 0.8]], W, hy, [34, 38, 66], 1);
    SK.ridgeFrac(D, [[0, 0.92], [0.22, 0.82], [0.45, 0.9], [0.62, 0.84], [0.8, 0.92], [1, 0.86]], W, hy, [20, 24, 46], 1);
    D.rect(0, hy, W, H - hy, 16, 18, 26, 1);
    var fx = 0.44 * W, fy = 0.74 * H, flick = 0.85 + 0.15 * Math.sin(t * 11) + 0.07 * Math.sin(t * 23 + 1);
    D.disc(fx, fy + 0.02 * H, 0.26 * W * flick, 90, 52, 26, 0.16);
    D.disc(fx, fy + 0.02 * H, 0.16 * W * flick, 150, 86, 40, 0.18);
    var tx = 0.20 * W, tb = 0.78 * H, tw = 0.16 * W, th = 0.13 * H;
    D.tri(tx, tb - th, tx - tw * 0.6, tb, tx + tw * 0.6, tb, 40, 44, 70, 1);
    D.tri(tx, tb - th, tx + tw * 0.6, tb, tx + tw * 0.85, tb, 30, 34, 56, 1);
    D.tri(tx - 0.02 * W, tb, tx, tb - th * 0.55, tx + 0.02 * W, tb, 150, 92, 48, 0.5 * flick);
    seated(D, 0.36 * W, 0.745 * H, 0.052 * W, [26, 28, 40], [200, 120, 60], 1);
    seated(D, 0.515 * W, 0.745 * H, 0.05 * W, [22, 24, 36], [200, 120, 60], -1);
    D.tri(fx - 0.05 * W, fy + 0.03 * H, fx + 0.02 * W, fy + 0.01 * H, fx - 0.04 * W, fy + 0.045 * H, 40, 30, 28, 1);
    D.tri(fx + 0.05 * W, fy + 0.03 * H, fx - 0.02 * W, fy + 0.01 * H, fx + 0.04 * W, fy + 0.045 * H, 34, 26, 24, 1);
    campfire(D, fx, fy, 0.05 * W, t);
    var er = SK.rng(77);
    for (var e = 0; e < 10; e++) {
      var ex = fx + (er() - 0.5) * 0.08 * W, span = 0.18 * H + er() * 0.1 * H, spd = 0.06 + er() * 0.05;
      var prog = ((t * spd + er()) % 1), ey = fy - prog * span, ea = (1 - prog) * 0.8;
      D.disc(ex + Math.sin(t * 2 + e) * 4 * sc, ey, (1.6 - 1.1 * prog) * sc, 255, 180 - prog * 80, 90, ea);
    }
  }

  return [
    { id: 'airport-sunset', name: 'wheels up', dur: 13.0, draw: airportSunset },
    { id: 'flyover', name: 'maryland \u2192 wisconsin', dur: 9.0, draw: flyover },
    { id: 'camping', name: 'campfire', dur: 14.0, draw: camping }
  ];
});
