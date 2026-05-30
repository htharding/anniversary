/* ============================================================================
 * scenes/coaster.js — sunset theme park: intersecting orange coaster loops,
 * ferris wheels in silhouette, a heart-decorated cart riding the track.
 * Composition matches sceneRefs/scene6Rollercoaster.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  /* ---- palette ----------------------------------------------------------*/
  var ORANGE     = [255, 130, 50];     // coaster tracks
  var ORANGE_HOT = [255, 170, 95];     // track highlight rim
  var SILHOUETTE = [30, 18, 50];       // ferris wheel + skyline silhouettes
  var SIL_LIGHT  = [56, 32, 78];       // mid silhouette layer
  var GROUND     = [40, 22, 60];       // foreground band
  var CART_BODY  = [255, 210, 90];     // warm yellow cart
  var CART_TRIM  = [230, 80, 70];      // red trim
  var HEART      = [235, 88, 110];
  var SPARK      = [255, 235, 200];

  /* ---- coaster geometry (in W/H fractions) ------------------------------
   * Two intersecting loops sitting on a horizontal track. The path the cart
   * follows is a sequence of phases stitched together so the geometry the
   * eye sees matches the geometry the cart traverses.
   *
   *  - Loop A: large loop on the right, centred at (cAx, cAy), radius rA.
   *  - Loop B: smaller loop on the left, centred at (cBx, cBy), radius rB.
   *  - Entry hill on far left, exit hill on far right.
   *  - Loops are stacked above a horizontal "ground" track segment that
   *    runs along yBase.
   * ----------------------------------------------------------------------*/
  var yBase = 0.78;        // horizontal base track line (frac of H)

  // Loop A (large, right of centre)
  var cAx = 0.58, cAy = 0.48, rA = 0.17;
  // Loop B (smaller, left of centre — intersects Loop A)
  var cBx = 0.36, cBy = 0.54, rB = 0.13;
  // Entry hill (left) and exit hill (right) — modest arcs
  var hillL = { cx: 0.12, r: 0.10 };
  var hillR = { cx: 0.90, r: 0.08 };

  /* Path parameterisation -------------------------------------------------
   * pathAt(s) returns [x, y, ang] in W/H-fractional space (then we scale).
   * Phases:
   *   0.00..0.18  climb entry hill   (hillL.x, baseY) -> (hillL.x, hillTop)
   *   0.18..0.30  descent to loop B entry on the base track
   *   0.30..0.55  loop B (clockwise full revolution, enters at bottom)
   *   0.55..0.65  cross-track from loop B exit to loop A entry
   *   0.65..0.90  loop A (counter-clockwise full revolution)
   *   0.90..1.00  exit to far-right hill, then back along base to start
   * ----------------------------------------------------------------------*/
  function pathAt(s) {
    var x, y, ang;
    // Loop bottom positions (where each loop is tangent to the base track).
    var thetaB_start = Math.PI * 0.5;   // bottom of loop B
    var thetaA_start = Math.PI * 0.5;   // bottom of loop A
    var loopB_bot_x = cBx;
    var loopA_bot_x = cAx;
    var entryExitX = hillL.cx + hillL.r; // right edge of entry hill arc
    var exitEntryX = hillR.cx - hillR.r; // left edge of exit hill arc

    // Phase boundaries chosen so each loop occupies one of the canonical
    // preview sample points (u=0.15, 0.5, 0.85) — the loops should be the
    // visible focal action.
    if (s < 0.08) {
      // Entry hill
      var k = s / 0.08;
      var theta = Math.PI + Math.PI * k;
      x = hillL.cx + hillL.r * Math.cos(theta);
      y = yBase + hillL.r * Math.sin(theta);
      ang = Math.atan2(Math.cos(theta), -Math.sin(theta));
    } else if (s < 0.15) {
      // Approach base track to loop B
      var k1 = (s - 0.08) / 0.07;
      x = SK.lerp(entryExitX, loopB_bot_x, k1);
      y = yBase;
      ang = 0;
    } else if (s < 0.45) {
      // Loop B — covers u≈0.15..0.45 (so previews at u=0.15 catch loop start)
      var k3 = (s - 0.15) / 0.30;
      var thetaB = thetaB_start - 2 * Math.PI * k3;
      x = cBx + rB * Math.cos(thetaB);
      y = cBy + rB * Math.sin(thetaB);
      ang = Math.atan2(-Math.cos(thetaB), Math.sin(thetaB));
    } else if (s < 0.52) {
      // cross-track between loops — passes through u=0.5
      var k4 = (s - 0.45) / 0.07;
      x = SK.lerp(loopB_bot_x, loopA_bot_x, k4);
      y = yBase;
      ang = 0;
    } else if (s < 0.88) {
      // Loop A — covers u≈0.52..0.88 (catches u=0.85 mid-loop)
      var k5 = (s - 0.52) / 0.36;
      var thetaA = thetaA_start + 2 * Math.PI * k5;
      x = cAx + rA * Math.cos(thetaA);
      y = cAy + rA * Math.sin(thetaA);
      ang = Math.atan2(Math.cos(thetaA), -Math.sin(thetaA));
    } else if (s < 0.95) {
      // exit run from loop A base toward the exit hill base
      var k6 = (s - 0.88) / 0.07;
      x = SK.lerp(loopA_bot_x, exitEntryX, k6);
      y = yBase;
      ang = 0;
    } else {
      // Exit hill arc
      var k7 = (s - 0.95) / 0.05;
      var thetaE = Math.PI + Math.PI * k7;
      x = hillR.cx + hillR.r * Math.cos(thetaE);
      y = yBase + hillR.r * Math.sin(thetaE);
      ang = Math.atan2(Math.cos(thetaE), -Math.sin(thetaE));
    }
    return [x, y, ang];
  }

  /* ---- track drawing helpers --------------------------------------------*/
  function drawTrackLine(D, x1, y1, x2, y2, W, sc) {
    // thick orange with subtle hot highlight on top
    SK.line(D, x1 * W, y1 * W, x2 * W, y2 * W, ORANGE, 4.0 * sc, 1);
  }
  function drawTrackArc(D, cx, cy, r, a0, a1, W, sc) {
    SK.arc(D, cx * W, cy * W, r * W, a0, a1, 4.2 * sc, ORANGE, 1, 64);
    // thin highlight just inside the arc for a polished look
    SK.arc(D, cx * W, cy * W, r * W - 1.2 * sc, a0, a1, 0.8 * sc, ORANGE_HOT, 0.55, 64);
  }

  /* ---- ferris wheel -----------------------------------------------------*/
  function ferrisWheel(D, cx, cy, R, W, sc, t, spinRate, spokeCount) {
    // ground strut from hub straight down to base
    SK.line(D, cx * W, cy * W, cx * W, yBase * W + 0.005 * W, SILHOUETTE, 2.6 * sc, 1);
    // two diagonal support legs
    SK.line(D, cx * W, cy * W + R * W * 0.05, (cx - R * 0.55) * W, yBase * W, SILHOUETTE, 2.2 * sc, 1);
    SK.line(D, cx * W, cy * W + R * W * 0.05, (cx + R * 0.55) * W, yBase * W, SILHOUETTE, 2.2 * sc, 1);
    // rim (full circle)
    SK.arc(D, cx * W, cy * W, R * W, 0, Math.PI * 2, 2.4 * sc, SILHOUETTE, 1, 64);
    // inner rim suggestion
    SK.arc(D, cx * W, cy * W, R * W * 0.86, 0, Math.PI * 2, 1.0 * sc, SILHOUETTE, 0.8, 48);
    // spokes — rotate slowly on t
    var spin = t * spinRate;
    for (var i = 0; i < spokeCount; i++) {
      var a = spin + (i / spokeCount) * Math.PI * 2;
      var ex = cx * W + Math.cos(a) * R * W;
      var ey = cy * W + Math.sin(a) * R * W;
      SK.line(D, cx * W, cy * W, ex, ey, SILHOUETTE, 1.4 * sc, 1);
      // little gondola at the end of every other spoke
      if (i % 1 === 0) {
        D.rect(ex - 2.6 * sc, ey - 1.4 * sc, 5.2 * sc, 3.6 * sc, SILHOUETTE[0], SILHOUETTE[1], SILHOUETTE[2], 1);
      }
    }
    // hub disc
    D.disc(cx * W, cy * W, 4.2 * sc, SILHOUETTE[0], SILHOUETTE[1], SILHOUETTE[2], 1);
  }

  /* ---- cart (3 cars) ----------------------------------------------------*/
  function drawCart(D, x, y, ang, sc) {
    var P = SK.pen(x, y, ang, sc, 1);
    var carW = 16, carH = 10, gap = 2.6;
    // soft warm glow behind the cart for strong focal-point read
    D.disc(x, y, 22 * sc, 255, 200, 120, 0.18);
    D.disc(x, y, 14 * sc, 255, 220, 140, 0.28);
    for (var i = 0; i < 3; i++) {
      var cx0 = -(carW + gap) + i * (carW + gap);
      // alternate red & yellow cars (matches the heart-decorated, festive look)
      var bodyCol = (i % 2 === 0) ? CART_TRIM : CART_BODY;
      var a = P(cx0 - carW * 0.5, -carH * 0.5);
      var b = P(cx0 + carW * 0.5, -carH * 0.5);
      var c = P(cx0 + carW * 0.5, carH * 0.5);
      var d = P(cx0 - carW * 0.5, carH * 0.5);
      D.tri(a[0], a[1], b[0], b[1], c[0], c[1], bodyCol[0], bodyCol[1], bodyCol[2], 1);
      D.tri(a[0], a[1], c[0], c[1], d[0], d[1], bodyCol[0], bodyCol[1], bodyCol[2], 1);
      // rounded end caps
      var ecL = P(cx0 - carW * 0.5, 0);
      var ecR = P(cx0 + carW * 0.5, 0);
      D.disc(ecL[0], ecL[1], carH * 0.5 * sc, bodyCol[0], bodyCol[1], bodyCol[2], 1);
      D.disc(ecR[0], ecR[1], carH * 0.5 * sc, bodyCol[0], bodyCol[1], bodyCol[2], 1);
      // bright window/light stripe (boosts contrast for the styliser)
      var s1 = P(cx0 - carW * 0.42, -1.4);
      var s2 = P(cx0 + carW * 0.42, -1.4);
      SK.line(D, s1[0], s1[1], s2[0], s2[1], [255, 250, 230], 2.4 * sc, 1);
      // wheels (two small dark discs underneath)
      var w1 = P(cx0 - carW * 0.35, carH * 0.5 + 0.5);
      var w2 = P(cx0 + carW * 0.35, carH * 0.5 + 0.5);
      D.disc(w1[0], w1[1], 2.2 * sc, 30, 18, 40, 1);
      D.disc(w2[0], w2[1], 2.2 * sc, 30, 18, 40, 1);
      // heart on top of each car
      var ht = P(cx0, -carH * 0.5 - 4.0);
      SK.heart(D, ht[0], ht[1], 6.5 * sc, HEART, 1);
    }
    // little connecting bars between cars (dark)
    for (var j = 0; j < 2; j++) {
      var k1 = -(carW + gap) + j * (carW + gap) + carW * 0.5;
      var k2 = -(carW + gap) + (j + 1) * (carW + gap) - carW * 0.5;
      var b1 = P(k1, 0), b2 = P(k2, 0);
      SK.line(D, b1[0], b1[1], b2[0], b2[1], [60, 30, 60], 1.8 * sc, 1);
    }
  }

  /* ---- skyline rect helper ---------------------------------------------*/
  function building(D, x, y, w, h, col, windowRows) {
    D.rect(x, y, w, h, col[0], col[1], col[2], 1);
    if (windowRows) {
      for (var r = 0; r < windowRows; r++) {
        for (var c = 0; c < 3; c++) {
          var wx = x + w * (0.18 + c * 0.32);
          var wy = y + h * (0.18 + r * 0.18);
          D.rect(wx, wy, w * 0.10, h * 0.05, 255, 180, 100, 0.55);
        }
      }
    }
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;

    /* 1. SUNSET SKY — deep purple → magenta → orange horizon ---------------*/
    SK.vGradient(D, W, H, [
      [0,    [38, 22, 78]],
      [0.30, [86, 36, 102]],
      [0.55, [178, 70, 115]],
      [0.78, [248, 130, 95]],
      [1,    [255, 165, 110]]
    ], Math.round(4 * sc));

    /* 2. STARS in the upper darker portion --------------------------------*/
    SK.starfield(D, W, 0.42 * H, 50, 4242, t);

    /* 3. CRESCENT MOON (upper-left) ---------------------------------------*/
    var mx = 0.16 * W, my = 0.14 * H, mr = 0.022 * W;
    SK.glow(D, mx, my, mr * 0.55, [248, 232, 208], { halo: [[3.2, 0.06], [2.0, 0.14]], coreAlpha: 0 });
    D.disc(mx, my, mr, 248, 232, 208, 1);
    D.disc(mx - mr * 0.45, my - mr * 0.10, mr * 0.93, 86, 36, 102, 1);

    /* 4. DISTANT CITY SKYLINE — silhouettes behind the wheels -------------*/
    // back layer (lighter / further)
    var skyHi = 0.72 * H;
    D.rect(0, 0.66 * H, W, skyHi - 0.66 * H + 0.02 * H, SIL_LIGHT[0], SIL_LIGHT[1], SIL_LIGHT[2], 0.55);
    // little background spires
    [
      [0.66, 0.62, 0.03, 0.10],
      [0.72, 0.59, 0.02, 0.13],
      [0.78, 0.61, 0.025, 0.11],
      [0.85, 0.63, 0.05, 0.09]
    ].forEach(function (b) {
      D.rect(b[0] * W, b[1] * H, b[2] * W, b[3] * H, SIL_LIGHT[0], SIL_LIGHT[1], SIL_LIGHT[2], 0.85);
    });

    // front skyline silhouette
    [
      [0.62, 0.68, 0.06, 0.10, 2],
      [0.685, 0.66, 0.05, 0.12, 2],
      [0.74, 0.67, 0.07, 0.11, 3],
      [0.815, 0.64, 0.045, 0.14, 3],
      [0.865, 0.69, 0.07, 0.09, 2],
      [0.94, 0.66, 0.05, 0.12, 2]
    ].forEach(function (b) {
      building(D, b[0] * W, b[1] * H, b[2] * W, b[3] * H, SILHOUETTE, b[4]);
    });

    /* 5. FERRIS WHEELS in silhouette --------------------------------------*/
    // larger wheel on left
    ferrisWheel(D, 0.14, 0.50, 0.105, W, sc, t, 0.45, 12);
    // smaller wheel on right-back
    ferrisWheel(D, 0.88, 0.58, 0.062, W, sc, t, -0.6, 10);

    /* 6. GROUND STRIP ------------------------------------------------------*/
    D.rect(0, yBase * H + 0.005 * W, W, H - yBase * H, GROUND[0], GROUND[1], GROUND[2], 1);
    // path/sidewalk highlight near top of ground
    D.rect(0, yBase * H + 0.005 * W, W, 0.006 * H, 80, 44, 90, 0.45);

    /* 7. COASTER STRUCTURE — outside supports BEHIND the loops ------------*/
    // Vertical struts hugging the outside of each loop (and the hill crests),
    // running from the highest point they support down to the base. They sit
    // just outside the loop circle so they don't cage the inside of the loop.
    var struts = [
      // hill crest supports (so the entry/exit hills appear suspended)
      [hillL.cx, yBase - hillL.r],
      [hillL.cx - hillL.r * 0.55, yBase - hillL.r * 0.5],
      [hillR.cx, yBase - hillR.r],
      [hillR.cx + hillR.r * 0.55, yBase - hillR.r * 0.5],
      // loop B outside supports — left side, right side
      [cBx - rB - 0.005, cBy],
      [cBx + rB + 0.005, cBy],
      // loop A outside supports — left side, right side, and a tall right one
      [cAx - rA - 0.005, cAy],
      [cAx + rA + 0.005, cAy],
      [cAx + rA * 0.92, cAy - rA * 0.5]
    ];
    for (var si = 0; si < struts.length; si++) {
      var st = struts[si];
      SK.line(D, st[0] * W, st[1] * W, st[0] * W, yBase * H + 0.005 * W,
              SILHOUETTE, 2.0 * sc, 0.88);
    }

    /* 8. COASTER TRACKS ----------------------------------------------------*/
    // BASE TRACK — runs across the whole frame at yBase (the "ground" rail)
    drawTrackLine(D, 0.02, yBase, 0.98, yBase, W, sc);

    // Entry hill on the left — a smooth arc cresting above the base track
    SK.arc(D, hillL.cx * W, yBase * W, hillL.r * W,
           Math.PI, Math.PI * 2, 4.2 * sc, ORANGE, 1, 48);
    // entry-hill highlight rim
    SK.arc(D, hillL.cx * W, yBase * W, hillL.r * W - 1.2 * sc,
           Math.PI, Math.PI * 2, 0.8 * sc, ORANGE_HOT, 0.55, 48);

    // Loop B (small, left) — full circle
    drawTrackArc(D, cBx, cBy, rB, 0, Math.PI * 2, W, sc);

    // Loop A (large, right) — full circle
    drawTrackArc(D, cAx, cAy, rA, 0, Math.PI * 2, W, sc);

    // Exit hill on the right — arc cresting above the base track
    SK.arc(D, hillR.cx * W, yBase * W, hillR.r * W,
           Math.PI, Math.PI * 2, 4.2 * sc, ORANGE, 1, 48);
    SK.arc(D, hillR.cx * W, yBase * W, hillR.r * W - 1.2 * sc,
           Math.PI, Math.PI * 2, 0.8 * sc, ORANGE_HOT, 0.55, 48);

    /* 9. FOREGROUND TREES (tiny silhouettes for scale, like the ref) ------*/
    function tree(xf, hFrac) {
      var x = xf * W, by = yBase * H + 0.005 * W;
      var h = hFrac * H;
      // trunk
      D.rect(x - 0.0025 * W, by, 0.005 * W, h * 0.45, 24, 14, 36, 1);
      // canopy (small filled triangle silhouette)
      D.tri(x - h * 0.32, by, x + h * 0.32, by, x, by - h * 0.65,
            48, 26, 70, 0.95);
      D.tri(x - h * 0.24, by - h * 0.18, x + h * 0.24, by - h * 0.18, x, by - h * 0.85,
            48, 26, 70, 0.95);
    }
    tree(0.045, 0.045);
    tree(0.25, 0.038);
    tree(0.46, 0.040);
    tree(0.70, 0.042);
    tree(0.96, 0.038);

    /* 10. CART along path --------------------------------------------------*/
    // Linear u — phase boundaries below are tuned so preview samples
    // (u=0.15, 0.5, 0.85) catch the loops, not the boring base-track runs.
    var pos = pathAt(u);
    // convert frac to absolute pixels (use W for both axes since buf is square)
    var cartX = pos[0] * W, cartY = pos[1] * W, cartAng = pos[2];
    // little sparkle trail behind the cart
    for (var k = 1; k <= 6; k++) {
      var sBack = (u - k * 0.012 + 1) % 1;
      var pp = pathAt(sBack);
      var f = 1 - k / 7;
      D.disc(pp[0] * W, pp[1] * W, (1.5 + 1.6 * f) * sc,
             SPARK[0], SPARK[1], SPARK[2], 0.10 + 0.22 * f);
    }
    drawCart(D, cartX, cartY, cartAng, 1.0 * sc);

    /* 11. TINY GROUND SPARKLES (ambient twinkle) --------------------------*/
    var srng = SK.rng(7);
    for (var sp = 0; sp < 8; sp++) {
      var spx = srng() * W;
      var spy = yBase * H + 0.03 * H + srng() * (H - yBase * H - 0.04 * H);
      var tw = 0.5 + 0.5 * Math.sin(t * 2.4 + sp * 1.7);
      D.disc(spx, spy, 0.9 * sc, 255, 200, 130, 0.20 + 0.35 * tw);
    }
  }

  return { id: 'coaster', name: 'the drop', dur: 11.0, draw: draw };
});
