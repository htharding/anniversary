/* ============================================================================
 * scenes/calla.js — a single calla lily slowly rotating against black.
 *
 * Full Y-axis turn every 10 s (dur = 10, rotY = u * 2π → clean loop).
 * The flower head (spathe + spadix) is a parameterised 3-D surface tessellated
 * to a grid of quads, lit by face normals, sorted painter's-order, and drawn
 * with D.tri pairs. The stem and the two arrow leaves are static 2-D shapes
 * underneath. Pure black background so the styliser cleanly carves out the
 * silhouette.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  /* ---- palette: classic-white calla -------------------------------------- */
  var SP_IN   = [188, 206, 140];   // throat / inner-base tint (greenish)
  var SP_MID  = [244, 244, 236];   // body of the spathe
  var SP_EDGE = [255, 255, 255];   // flaring rim
  var OUTER   = [176, 200, 150];   // subtle back/outer surface
  var SPADIX  = [250, 192, 46];    // central yellow column
  var STEM_C  = [58, 92, 46];
  var LEAF_C  = [44, 98, 52];

  /* ---- spathe geometry constants (matches calla.html "classic white") ---- */
  var H_FLOWER  = 236;
  var R_BASE    = 26;
  var R_RIM     = 120;
  var LEAN      = 0.05;
  var PITCH     = -0.28;
  var TIP_H     = 74;
  var TIP_CURL  = 42;
  var LIP_AMT   = 0.55;
  var SPAD_LEN  = 206;

  /* ---- tessellation resolution ------------------------------------------- */
  var NV = 22, NS = 26;   // spathe rows × cols
  var MV = 12, MS = 14;   // spadix rows × cols
  var TWO_PI = Math.PI * 2;

  /* ---- module helpers ---------------------------------------------------- */
  function smooth01(x) { x = SK.clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function lerp3(a, b, k) {
    return [a[0] + (b[0] - a[0]) * k,
            a[1] + (b[1] - a[1]) * k,
            a[2] + (b[2] - a[2]) * k];
  }

  // 3-D rotation Y then X then Z (matches calla.html's rot3D order).
  function rot3D(x, y, z, rx, ry, rz) {
    var cY = Math.cos(ry), sY = Math.sin(ry);
    var ax =  x * cY + z * sY;
    var az = -x * sY + z * cY;
    var cX = Math.cos(rx), sX = Math.sin(rx);
    var ay  = y * cX - az * sX;
    var az2 = y * sX + az * cX;
    var cZ = Math.cos(rz), sZ = Math.sin(rz);
    return [ax * cZ - ay * sZ, ax * sZ + ay * cZ, az2];
  }

  /* ---- spathe surface point ---------------------------------------------- */
  // v: 0 (base / throat) → 1 (rim / tip)
  // s: 0 → 1 along the rolled arc (free edge .. back wall .. free edge)
  function spathePoint(v, s, open) {
    var openH = smooth01((v - 0.16) / 0.84);
    var wrapClosed = TWO_PI * 1.06;
    var wrapOpen   = TWO_PI * 0.60;
    var sweep = SK.lerp(wrapClosed, SK.lerp(wrapClosed, wrapOpen, open), openH);

    var rRim = SK.lerp(R_BASE * 1.1, R_RIM, open);
    var rad  = SK.lerp(R_BASE, rRim, Math.pow(v, 0.7));

    var a = (s - 0.5) * sweep;
    var x = rad * Math.sin(a);
    var z = rad * Math.cos(a);
    var y = -H_FLOWER * v;

    var tw = smooth01((v - 0.40) / 0.60);
    var cosA = Math.max(0, Math.cos((s - 0.5) * Math.PI));
    var backRaise = cosA * cosA * cosA;            // peaks at the back wall
    var edgeProx  = Math.pow(Math.abs(s - 0.5) * 2, 1.6); // peaks at free edges

    // recurved pointed tip at the back
    y -= TIP_H    * open * backRaise * tw;
    z += TIP_CURL * open * backRaise * tw;
    x *= (1 - 0.25 * backRaise * tw * open);

    // everted rolled lip along the open front edges
    var evert = LIP_AMT * open * edgeProx * tw;
    x *= (1 + evert);
    z *= (1 + evert * 0.6);
    y += evert * 14;

    // organic rim waviness
    y -= Math.sin(a * 3.0) * 3.0 * tw * open;

    // characteristic lean
    x += LEAN * v * H_FLOWER;

    // forward pitch so the cup opens toward the viewer at rest
    var cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    var yy = y * cp - z * sp;
    var zz = y * sp + z * cp;
    return [x, yy, zz];
  }

  function spadixPoint(v, ang, len) {
    var rs = R_BASE * 0.46 * (1 - 0.16 * v) * (1 + 0.05 * Math.sin(v * 26));
    if (v > 0.86) {
      var k = (v - 0.86) / 0.14;
      rs *= Math.sqrt(Math.max(0, 1 - k * k));     // rounded cap
    }
    var x = rs * Math.sin(ang);
    var z = rs * Math.cos(ang);
    var y = -H_FLOWER * 0.10 - len * v;
    var lx  = LEAN * v * H_FLOWER * 0.8;
    var pit = PITCH * 0.52;                        // a touch more upright than the spathe
    var cp = Math.cos(pit), sp = Math.sin(pit);
    return [x + lx, y * cp - z * sp, y * sp + z * cp];
  }

  /* ---- leaf polygon (arrow / heart silhouette), authored once ------------ */
  // Authored along +x at unit size; mirror via `side`, rotate by `ang`.
  var LEAF = [
    [0.00,  0.00],
    [0.18, -0.34],
    [0.55, -0.40],
    [0.82, -0.16],
    [1.03,  0.00],
    [0.82,  0.16],
    [0.55,  0.40],
    [0.18,  0.34]
  ];
  var LEAF_TRIS = SK.triangulate(LEAF);

  function drawLeaf(D, x, y, sz, ang, side, col, sc) {
    var ca = Math.cos(ang), sa = Math.sin(ang);
    var pts = LEAF.map(function (p) {
      var lx = p[0] * sz * side, ly = p[1] * sz;
      return [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
    });
    SK.fillPoly(D, pts, LEAF_TRIS, [col[0] * 0.9, col[1], col[2] * 0.85], 1);

    // glossy centre highlight (smaller, lighter polygon)
    var hpts = LEAF.map(function (p) {
      var lx = (0.06 + p[0] * 0.80) * sz * side, ly = p[1] * 0.32 * sz;
      return [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
    });
    SK.fillPoly(D, hpts, LEAF_TRIS,
                [col[0] * 1.15, col[1] * 1.25, col[2] * 1.1], 0.45);

    // midrib
    var tipX = x + (sz * 0.92 * side) * ca;
    var tipY = y + (sz * 0.92 * side) * sa;
    SK.line(D, x, y, tipX, tipY,
            [col[0] * 1.2, col[1] * 1.3, col[2] * 1.1], 0.9 * sc, 0.7);
  }

  /* ---- scene -------------------------------------------------------------- */
  function draw(D, W, H, u, t) {
    var sc = W / 680;
    var cx = W * 0.50;
    var cy = H * 0.50;                              // flower's base anchor
    var screenK = sc;                               // 1 world-unit = 1 buffer-px at sc=1

    D.bg(0, 0, 0);

    /* 1. STEM — smooth fleshy column with a gentle S-curve ----------------- */
    var stemBot = Math.min(H - 6 * sc, cy + 0.40 * H);
    var stemLen = stemBot - cy;
    for (var sy = cy; sy < stemBot; sy += 3) {
      var tt = (sy - cy) / stemLen;
      var rw = SK.lerp(6.5, 4.0, tt) * sc;          // radius (was diameter 13..8)
      var rh = 2.5 * sc;
      var curveX = Math.sin(tt * Math.PI * 0.45) * 14 * sc;
      var rC = SK.lerp(STEM_C[0], STEM_C[0] * 0.55, tt);
      var gC = SK.lerp(STEM_C[1], STEM_C[1] * 0.55, tt);
      var bC = SK.lerp(STEM_C[2], STEM_C[2] * 0.55, tt);
      D.ellipse(cx + curveX, sy, rw, rh, 0, rC, gC, bC, 1);
      // glossy highlight
      D.ellipse(cx + curveX - rw * 0.45, sy, rw * 0.22, rh * 0.6, 0,
                Math.min(255, rC * 1.5),
                Math.min(255, gC * 1.4),
                Math.min(255, bC * 1.3), 0.40);
    }

    /* 2. LEAVES — two arrow leaves at the base of the stem (static) -------- */
    var leafY = stemBot - stemLen * 0.06;
    drawLeaf(D, cx - 6 * sc, leafY,           132 * sc, -0.95, -1, LEAF_C, sc);
    drawLeaf(D, cx + 8 * sc, stemBot - stemLen * 0.02, 116 * sc,  0.95,  1, LEAF_C, sc);

    /* 3. FLOWER HEAD — rotating 3-D spathe + spadix ------------------------ */
    var open  = 1.0;                                // always fully bloomed
    var rotY  = u * TWO_PI;                         // one turn per loop
    // POV bobs once up + once down per rotation (loops clean at u=0,1).
    // Pairs with Y so each side-on view is seen from a different elevation,
    // selling depth and a sense of scale instead of a flat spin.
    var rotX  = Math.sin(u * TWO_PI) * 0.20;
    var rotZ  = Math.sin(t * 0.32 + 1.2) * 0.04;    // tiny ambient roll
    var focal = 440;

    function project(P) {
      var R = rot3D(P[0], P[1], P[2], rotX, rotY, rotZ);
      var ps = focal / (focal + R[2]);
      return [cx + R[0] * ps * screenK, cy + R[1] * ps * screenK, R[2]];
    }

    var items = [];

    // ---- spathe quads ----
    var pts = [];
    for (var vi = 0; vi <= NV; vi++) {
      var row = [];
      for (var si = 0; si <= NS; si++) row.push(spathePoint(vi / NV, si / NS, open));
      pts.push(row);
    }
    for (var vi2 = 0; vi2 < NV; vi2++) {
      var v = (vi2 + 0.5) / NV;
      for (var si2 = 0; si2 < NS; si2++) {
        var P00 = pts[vi2][si2],     P10 = pts[vi2 + 1][si2];
        var P01 = pts[vi2][si2 + 1], P11 = pts[vi2 + 1][si2 + 1];

        // local normal via cross product of the two quad edges
        var e1x = P10[0] - P00[0], e1y = P10[1] - P00[1], e1z = P10[2] - P00[2];
        var e2x = P01[0] - P00[0], e2y = P01[1] - P00[1], e2z = P01[2] - P00[2];
        var nx = e1y * e2z - e1z * e2y;
        var ny = e1z * e2x - e1x * e2z;
        var nz = e1x * e2y - e1y * e2x;
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        var rotN = rot3D(nx, ny, nz, rotX, rotY, rotZ);
        var lnz = rotN[2];                          // z-component of rotated normal

        var A = project(P00), B = project(P10), C = project(P11), Dp = project(P01);
        var rz = (A[2] + B[2] + C[2] + Dp[2]) * 0.25;

        // base colour: throat → body → rim
        var col = lerp3(lerp3(SP_IN, SP_MID, smooth01(v * 1.4)),
                        SP_EDGE, smooth01((v - 0.4) / 0.6));

        // two-sided shading
        var lightDot = SK.clamp(-lnz, -1, 1);
        var lightMod = SK.lerp(0.42, 1.26, (lightDot + 1) / 2);
        if (lnz > 0) {
          // outer/back face — waxier, tinted toward `outer`
          col = lerp3(col, OUTER, 0.5 * SK.clamp(lnz, 0, 1));
          lightMod *= 0.92;
        } else {
          // inner face — throat glow near base
          col = lerp3(col, SP_IN, (1 - smooth01(v * 1.6)) * 0.45);
        }
        items.push({
          rz: rz, kind: 'q', poly: [A, B, C, Dp],
          r: SK.clamp(col[0] * lightMod, 0, 255),
          g: SK.clamp(col[1] * lightMod, 0, 255),
          b: SK.clamp(col[2] * lightMod, 0, 255)
        });
      }
    }

    // ---- spadix quads ----
    var sp = [];
    for (var vi3 = 0; vi3 <= MV; vi3++) {
      var r3 = [];
      for (var si3 = 0; si3 <= MS; si3++) {
        r3.push(spadixPoint(vi3 / MV, (si3 / MS) * TWO_PI, SPAD_LEN));
      }
      sp.push(r3);
    }
    for (var vi4 = 0; vi4 < MV; vi4++) {
      var v2 = (vi4 + 0.5) / MV;
      for (var si4 = 0; si4 < MS; si4++) {
        var Q00 = sp[vi4][si4],     Q10 = sp[vi4 + 1][si4];
        var Q01 = sp[vi4][si4 + 1], Q11 = sp[vi4 + 1][si4 + 1];
        var f1x = Q10[0] - Q00[0], f1y = Q10[1] - Q00[1], f1z = Q10[2] - Q00[2];
        var f2x = Q01[0] - Q00[0], f2y = Q01[1] - Q00[1], f2z = Q01[2] - Q00[2];
        var nx2 = f1y * f2z - f1z * f2y;
        var ny2 = f1z * f2x - f1x * f2z;
        var nz2 = f1x * f2y - f1y * f2x;
        var nl2 = Math.sqrt(nx2 * nx2 + ny2 * ny2 + nz2 * nz2) || 1;
        nx2 /= nl2; ny2 /= nl2; nz2 /= nl2;
        var rN2 = rot3D(nx2, ny2, nz2, rotX, rotY, rotZ);
        var lnz2 = rN2[2];
        var QA = project(Q00), QB = project(Q10), QC = project(Q11), QD = project(Q01);
        var rz2 = (QA[2] + QB[2] + QC[2] + QD[2]) * 0.25;
        var lightMod2 = SK.lerp(0.5, 1.3, (SK.clamp(-lnz2, -1, 1) + 1) / 2);
        var vg = SK.lerp(0.78, 1.12, v2);           // brighter toward the top
        items.push({
          rz: rz2, kind: 'q', poly: [QA, QB, QC, QD],
          r: SK.clamp(SPADIX[0] * lightMod2 * vg, 0, 255),
          g: SK.clamp(SPADIX[1] * lightMod2 * vg, 0, 255),
          b: SK.clamp(SPADIX[2] * lightMod2 * vg, 0, 255)
        });
      }
    }

    // ---- pollen dots on the front of the spadix (deterministic) ----
    var nDots = 46;
    for (var di = 0; di < nDots; di++) {
      var hv1 = Math.sin(di * 12.9898) * 43758.5453;
      var fr1 = hv1 - Math.floor(hv1);
      var hv2 = Math.sin(di * 78.233) * 12543.123;
      var fr2 = hv2 - Math.floor(hv2);
      var vv  = 0.08 + fr1 * 0.86;
      var ang = -1.0 + fr2 * 2.0;                   // front-facing arc
      var Pp  = spadixPoint(vv, ang, SPAD_LEN);
      var nN  = rot3D(Math.sin(ang), 0, Math.cos(ang), rotX, rotY, rotZ);
      if (-nN[2] < -0.15) continue;                  // skip dots on the far side
      var pr = project(Pp);
      var ps = focal / (focal + pr[2]);
      var sz = (1.6 + fr1 * 1.8) * sc * 0.55 * ps;
      var sh = SK.lerp(0.55, 1.25, (SK.clamp(-nN[2], -1, 1) + 1) / 2);
      items.push({
        rz: pr[2] - 2, kind: 'dot', x: pr[0], y: pr[1], sz: sz,
        r: SK.clamp(SPADIX[0] * sh + 30, 0, 255),
        g: SK.clamp(SPADIX[1] * sh + 24, 0, 255),
        b: SK.clamp(SPADIX[2] * sh,       0, 255)
      });
    }

    // painter's order: farthest (largest rz) first
    items.sort(function (a, b) { return b.rz - a.rz; });

    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      if (it.kind === 'dot') {
        D.disc(it.x, it.y, it.sz, it.r, it.g, it.b, 1);
      } else {
        var po = it.poly;
        D.tri(po[0][0], po[0][1], po[1][0], po[1][1], po[2][0], po[2][1],
              it.r, it.g, it.b, 1);
        D.tri(po[0][0], po[0][1], po[2][0], po[2][1], po[3][0], po[3][1],
              it.r, it.g, it.b, 1);
      }
    }

    /* 4. ANNIVERSARY MESSAGE — two centred lines, anchored in bottom third  */
    var line1 = 'HAPPY ANNIVERSARY';
    var line2 = 'TO MY FAVORITE';
    var maxLen = Math.max(line1.length, line2.length);
    var targetW = 0.84 * W;
    var maxPx = Math.floor((targetW + 1) / (maxLen * 6 - 1));
    var tPx = Math.max(2, Math.min(maxPx, Math.round(5 * sc)));
    var textCol = [248, 232, 200];                  // warm cream — anniversary tone
    var lineGap = tPx;
    // Centre the 15*tPx-tall block on y = 5/6 H (the middle of the bottom third).
    var blockY = Math.round(H * (5 / 6) - 7.5 * tPx);
    var w1 = SK.textWidth(line1, tPx);
    var w2 = SK.textWidth(line2, tPx);
    SK.text(D, Math.round((W - w1) / 2), blockY,
            line1, tPx, textCol, 0.95);
    SK.text(D, Math.round((W - w2) / 2), blockY + 7 * tPx + lineGap,
            line2, tPx, textCol, 0.95);
  }

  return { id: 'calla', name: 'calla', dur: 10.0, draw: draw };
});
