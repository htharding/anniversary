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

  /* ---- polygons & lines --------------------------------------------------*
   * Ear-clipping triangulation + line stroke — for filled organic/concave
   * shapes (a hand, a leaf, a coastline) and simple strokes (a kite string,
   * a road, a state border) that the 5 base primitives don't cover directly.
   * Triangulate once at module load for static shapes, replay each frame.
   * --------------------------------------------------------------------------*/

  // Triangulate a simple polygon. Returns [[i,j,k], ...] index triples into
  // `verts`. Handles arbitrary concavity (peninsulas, indents, mittens).
  // Polygon may be specified in either winding; the algorithm detects it.
  SK.triangulate = function (verts) {
    var n = verts.length;
    if (n < 3) return [];
    var area2 = 0;
    for (var s = 0; s < n; s++) {
      var p = verts[s], q = verts[(s + 1) % n];
      area2 += p[0] * q[1] - q[0] * p[1];
    }
    // y-down screen coords: clockwise polygon has area > 0
    var clockwise = area2 > 0;
    function cross(a, b, c) {
      return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }
    function isConvex(a, b, c) {
      var z = cross(a, b, c);
      return clockwise ? z > 0 : z < 0;
    }
    function pointInTri(p, a, b, c) {
      var d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p);
      var hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      var hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      return !(hasPos && hasNeg);
    }
    var idx = [];
    for (var k = 0; k < n; k++) idx.push(k);
    var tris = [], guard = n * 3;
    while (idx.length > 3 && guard-- > 0) {
      var found = false;
      for (var i = 0; i < idx.length; i++) {
        var prev = (i - 1 + idx.length) % idx.length;
        var next = (i + 1) % idx.length;
        var a = verts[idx[prev]], b = verts[idx[i]], c = verts[idx[next]];
        if (!isConvex(a, b, c)) continue;
        var hasInside = false;
        for (var j = 0; j < idx.length; j++) {
          if (j === prev || j === i || j === next) continue;
          if (pointInTri(verts[idx[j]], a, b, c)) { hasInside = true; break; }
        }
        if (!hasInside) {
          tris.push([idx[prev], idx[i], idx[next]]);
          idx.splice(i, 1);
          found = true;
          break;
        }
      }
      if (!found) break;
    }
    if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
    return tris;
  };

  // Fill a triangulated polygon. `pts` are in absolute buffer coords; `tris`
  // is the result of SK.triangulate(pts). Cache `tris` for static shapes.
  SK.fillPoly = function (D, pts, tris, col, a) {
    a = a == null ? 1 : a;
    for (var t = 0; t < tris.length; t++) {
      var tr = tris[t], p0 = pts[tr[0]], p1 = pts[tr[1]], p2 = pts[tr[2]];
      D.tri(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], col[0], col[1], col[2], a);
    }
  };

  // Stroke a straight line segment. Implemented as a rotated thin ellipse,
  // since the D adapter has no native stroke primitive. `thick` is in buffer
  // pixels (typically 0.6..2 * sc).
  SK.line = function (D, x1, y1, x2, y2, col, thick, a) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    a = a == null ? 1 : a;
    D.ellipse((x1 + x2) / 2, (y1 + y2) / 2, len / 2 + thick * 0.5, thick * 0.5,
              Math.atan2(dy, dx), col[0], col[1], col[2], a);
  };

  // Stroked arc as a polyline of line segments. a0/a1 in radians (clockwise +).
  // `thick` in buffer px. Useful for roller coaster loops, ferris wheels, halos.
  SK.arc = function (D, cx, cy, r, a0, a1, thick, col, a, segs) {
    a = a == null ? 1 : a;
    segs = segs || Math.max(8, Math.floor(Math.abs(a1 - a0) * r / 3));
    var px = cx + Math.cos(a0) * r, py = cy + Math.sin(a0) * r;
    for (var i = 1; i <= segs; i++) {
      var ang = a0 + (a1 - a0) * (i / segs);
      var nx = cx + Math.cos(ang) * r, ny = cy + Math.sin(ang) * r;
      SK.line(D, px, py, nx, ny, col, thick, a);
      px = nx; py = ny;
    }
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

  /* ---- icons -------------------------------------------------------------*/

  // Simple filled heart at (x,y), total size in buffer px (~width).
  // Built from two lobes + a triangle so the silhouette reads through the styliser.
  SK.heart = function (D, x, y, size, col, a) {
    a = a == null ? 1 : a;
    var s = size;
    D.disc(x - s * 0.27, y - s * 0.15, s * 0.32, col[0], col[1], col[2], a);
    D.disc(x + s * 0.27, y - s * 0.15, s * 0.32, col[0], col[1], col[2], a);
    D.tri(x - s * 0.55, y - s * 0.04, x + s * 0.55, y - s * 0.04, x, y + s * 0.55, col[0], col[1], col[2], a);
  };

  /* ---- text (5x7 bitmap font) -------------------------------------------*
   * SK.text(D, x, y, str, px, col, a) draws ASCII text. `px` is the size of
   * one bitmap "pixel" in buffer pixels — each glyph is 5*px wide, 7*px tall,
   * with 1*px horizontal spacing (6*px advance). `x,y` is the top-left of the
   * FIRST glyph. Uppercase only; lowercase is coerced. Supported:
   * A-Z, 0-9, space, . , ? ! ' - :  (extend as needed).
   * --------------------------------------------------------------------------*/
  SK._font = {
    'A': [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
    'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
    'C': [0x0F,0x10,0x10,0x10,0x10,0x10,0x0F],
    'D': [0x1E,0x11,0x11,0x11,0x11,0x11,0x1E],
    'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
    'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
    'G': [0x0F,0x10,0x10,0x13,0x11,0x11,0x0E],
    'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
    'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
    'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
    'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
    'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
    'M': [0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
    'N': [0x11,0x11,0x19,0x15,0x13,0x11,0x11],
    'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
    'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
    'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
    'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
    'S': [0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E],
    'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
    'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
    'V': [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
    'W': [0x11,0x11,0x15,0x15,0x15,0x1B,0x11],
    'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
    'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04],
    'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
    '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
    '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
    '2': [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],
    '3': [0x1F,0x01,0x02,0x06,0x01,0x11,0x0E],
    '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
    '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
    '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
    '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
    '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
    '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
    '.': [0x00,0x00,0x00,0x00,0x00,0x06,0x06],
    ',': [0x00,0x00,0x00,0x00,0x06,0x06,0x04],
    '?': [0x0E,0x11,0x01,0x02,0x04,0x00,0x04],
    '!': [0x04,0x04,0x04,0x04,0x04,0x00,0x04],
    "'": [0x04,0x04,0x00,0x00,0x00,0x00,0x00],
    '-': [0x00,0x00,0x00,0x1F,0x00,0x00,0x00],
    ':': [0x00,0x06,0x06,0x00,0x06,0x06,0x00],
    ' ': [0,0,0,0,0,0,0]
  };

  SK.text = function (D, x, y, str, px, col, a) {
    a = a == null ? 1 : a;
    px = px || 4;
    var cx = x;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i).toUpperCase();
      var g = SK._font[ch] || SK._font[' '];
      for (var row = 0; row < 7; row++) {
        var bits = g[row];
        for (var c = 0; c < 5; c++) {
          if (bits & (1 << (4 - c))) {
            D.rect(cx + c * px, y + row * px, px, px, col[0], col[1], col[2], a);
          }
        }
      }
      cx += 6 * px;
    }
  };

  // Width (in buffer px) of `str` rendered at `px`. Use to center text.
  SK.textWidth = function (str, px) {
    px = px || 4;
    return Math.max(0, str.length * 6 * px - px);
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
