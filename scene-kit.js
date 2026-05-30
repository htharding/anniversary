/* ============================================================================
 * scene-kit.js  —  shared drawing + math helpers for the stylised scene system
 *
 * Pure and environment-agnostic. Every function that draws takes a drawing
 * adapter `D` as its first argument (see the D contract in SPEC.md). SceneKit
 * never touches p5, the DOM, or a canvas directly — so the exact same scene
 * code runs in the browser (p5-backed D) and in Node (rasteriser-backed D).
 *
 * D contract (all colours are 0–255, alpha `a` is 0–1, coords in buffer px):
 *   D.bg(r,g,b)
 *   D.rect(x,y,w,h, r,g,b, a=1)              // top-left origin
 *   D.disc(x,y,rad, r,g,b, a=1)
 *   D.ellipse(x,y, rx,ry, ang, r,g,b, a=1)   // rotated, ang in radians
 *   D.tri(ax,ay,bx,by,cx,cy, r,g,b, a=1)
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.SceneKit = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SK = {};

  /* ---- math --------------------------------------------------------------*/
  SK.lerp = function (a, b, t) { return a + (b - a) * t; };
  SK.clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };
  SK.smoothstep = function (e0, e1, x) { x = SK.clamp((x - e0) / (e1 - e0), 0, 1); return x * x * (3 - 2 * x); };
  SK.easeInQuad = function (x) { return x * x; };
  SK.easeOutQuad = function (x) { return 1 - (1 - x) * (1 - x); };
  SK.easeInOutCubic = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  SK.easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };

  // quadratic bezier point + tangent (each arg is [x,y]); s in 0..1
  SK.bez = function (p0, c, p1, s) {
    var m = 1 - s;
    return [m * m * p0[0] + 2 * m * s * c[0] + s * s * p1[0],
            m * m * p0[1] + 2 * m * s * c[1] + s * s * p1[1]];
  };
  SK.bezTan = function (p0, c, p1, s) {
    var m = 1 - s;
    return [2 * m * (c[0] - p0[0]) + 2 * s * (p1[0] - c[0]),
            2 * m * (c[1] - p0[1]) + 2 * s * (p1[1] - c[1])];
  };

  // deterministic PRNG — seed once for STATIC randomness (e.g. star layout)
  SK.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---- local frame for subjects (vehicles, figures, props) ---------------*
   * Returns P(lx,ly): maps a point in the subject's LOCAL space (origin at the
   * subject, +x forward/right, +y down) to world/buffer coords, applying
   * scale, rotation `ang`, and a horizontal mirror via `dir` (-1 faces left).
   *
   * GOTCHA: for a left-facing subject (dir=-1), a POSITIVE `ang` lifts the
   * nose UP. (A right-facing subject uses the opposite sign.)
   * --------------------------------------------------------------------------*/
  SK.pen = function (x, y, ang, scl, dir) {
    dir = dir || 1;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    return function (lx, ly) {
      lx *= dir * scl; ly *= scl;
      return [x + (lx * ca - ly * sa), y + (lx * sa + ly * ca)];
    };
  };

  /* ---- backgrounds & atmosphere -----------------------------------------*/

  // Vertical multi-stop gradient from y=0 to y=yEnd. stops: [[pos0..1,[r,g,b]],...]
  SK.vGradient = function (D, W, yEnd, stops, step) {
    step = Math.max(2, step || 4);
    for (var y = 0; y < yEnd; y += step) {
      var f = y / yEnd, i = 0;
      while (i < stops.length - 2 && f > stops[i + 1][0]) i++;
      var a = stops[i], b = stops[i + 1];
      var k = (f - a[0]) / Math.max(1e-6, (b[0] - a[0]));
      k = SK.clamp(k, 0, 1);
      D.rect(0, y, W, step + 1,
        SK.lerp(a[1][0], b[1][0], k), SK.lerp(a[1][1], b[1][1], k), SK.lerp(a[1][2], b[1][2], k), 1);
    }
  };

  // Radial glow + solid core (sun, moon, markers, lamps). col = [r,g,b].
  SK.glow = function (D, x, y, R, col, opts) {
    opts = opts || {};
    var halo = opts.halo || [[2.6, 0.14], [1.7, 0.30], [1.15, 0.62]];
    for (var i = 0; i < halo.length; i++) D.disc(x, y, R * halo[i][0], col[0], col[1], col[2], halo[i][1]);
    D.disc(x, y, R, col[0], col[1], col[2], opts.coreAlpha == null ? 1 : opts.coreAlpha);
  };

  // Soft feathered disc (clouds, haze, soft masses). 3 concentric translucent discs.
  SK.feather = function (D, x, y, R, col, a) {
    a = a == null ? 1 : a;
    D.disc(x, y, R, col[0], col[1], col[2], 0.22 * a);
    D.disc(x, y, R * 0.74, col[0], col[1], col[2], 0.42 * a);
    D.disc(x, y, R * 0.5, col[0], col[1], col[2], 0.85 * a);
  };

  // Lumpy organic blob (landmass, foliage clump): a main feathered lobe + offset lobes.
  SK.blob = function (D, x, y, R, col, lobes) {
    lobes = lobes || [[0, 0, 1.0], [0.55, -0.35, 0.62], [-0.5, 0.4, 0.55], [0.2, 0.6, 0.45]];
    for (var i = 0; i < lobes.length; i++) {
      SK.feather(D, x + lobes[i][0] * R, y + lobes[i][1] * R, R * lobes[i][2], col, 1);
    }
  };

  // Soft horizontal cloud cluster centred at (x,y), total width w.
  SK.cloud = function (D, x, y, w, col, a) {
    a = a == null ? 0.5 : a;
    for (var i = -2; i <= 2; i++) {
      var rr = w * (0.16 - Math.abs(i) * 0.02);
      D.disc(x + i * w * 0.22, y + Math.sin(i) * 4, rr, col[0], col[1], col[2], a * (1 - Math.abs(i) * 0.15));
    }
  };

  // Star layer (seeded, static positions; pass `t` for twinkle or null for steady).
  SK.starfield = function (D, W, maxY, count, seed, t) {
    var r = SK.rng(seed);
    for (var i = 0; i < count; i++) {
      var x = r() * W, y = r() * maxY, base = 0.4 + r() * 0.6, ph = r() * 6.283, sz = 0.6 + r() * 1.3;
      var a = base * (t == null ? 1 : (0.6 + 0.4 * Math.sin(t * (0.7 + r()) + ph)));
      var warm = r() < 0.3;
      D.disc(x, y, sz, warm ? 255 : 220, warm ? 235 : 230, warm ? 210 : 255, a);
    }
  };

  /* ---- terrain -----------------------------------------------------------*/

  // Jagged silhouette fill under a polyline of ridge points (absolute coords).
  SK.ridge = function (D, pts, baseY, col, a) {
    a = a == null ? 1 : a;
    for (var i = 0; i < pts.length - 1; i++) {
      var x0 = pts[i][0], y0 = pts[i][1], x1 = pts[i + 1][0], y1 = pts[i + 1][1];
      D.tri(x0, y0, x1, y1, x1, baseY, col[0], col[1], col[2], a);
      D.tri(x0, y0, x1, baseY, x0, baseY, col[0], col[1], col[2], a);
    }
  };

  // Same, but points are fractions: [xFrac (0..1 of W), yFrac (0..1 of baseY)].
  SK.ridgeFrac = function (D, ptsFrac, W, baseY, col, a) {
    var abs = ptsFrac.map(function (q) { return [q[0] * W, q[1] * baseY]; });
    SK.ridge(D, abs, baseY, col, a);
  };

  /* ---- perspective markings ---------------------------------------------*/

  // Dashed lines fanning from `lanes` (xFracs at nearY) to a vanishing point VP.
  // Reads as runway/tarmac/road markings. opts: {dashes,nearW,farW,nearH,farH,alpha}
  SK.perspectiveDashes = function (D, lanes, VP, nearY, W, col, opts) {
    opts = opts || {};
    var dn = opts.dashes || 14, nW = opts.nearW || 9, fW = opts.farW || 1,
        nH = opts.nearH || 5, fH = opts.farH || 1, al = opts.alpha == null ? 0.85 : opts.alpha,
        sc = opts.sc || 1;
    for (var li = 0; li < lanes.length; li++) {
      var bx = lanes[li] * W, by = nearY;
      for (var q = 0.04; q < 0.98; q += 0.07) {
        if (Math.floor(q * dn) % 2 !== 0) continue;
        var x = SK.lerp(bx, VP[0], q), y = SK.lerp(by, VP[1], q);
        var w = SK.lerp(nW, fW, q) * sc, h = SK.lerp(nH, fH, q) * sc;
        D.rect(x - w / 2, y - h / 2, w, h, col[0], col[1], col[2], al * (1 - q * 0.5));
      }
    }
  };

  return SK;
});
