/* ============================================================================
 * scenes/snowboard.js — couple snowboarding down a bright winter slope,
 * trailing hearts. Composition follows sceneRefs/scene9Snowboarding.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  // Slope geometry. The whole slope is one tilted plane; the riders glide
  // along this line and we use the angle for their pose.
  // Slope line: y = SLOPE_M * x + SLOPE_B (in W,H-fractional terms).
  // ~22° downhill to the right. Top-left high, bottom-right low.
  var SLOPE_M = 0.40;        // dy/dx fractional — ~22°
  var SLOPE_X0 = -0.05;      // start x (off-screen left)
  var SLOPE_Y0 = 0.42;       // start y (about mid-screen, leaving sky)
  var SLOPE_ANG = Math.atan(SLOPE_M);   // slope angle (radians, downhill +)

  // Snowboarder silhouette — drawn in local coords (origin at the centre of
  // the board), then warped through SK.pen for position/rotation. dir=1 means
  // the rider faces right (same direction as motion: down-slope).
  // jacket = [r,g,b], hair = [r,g,b], pants = [r,g,b] are theme colours.
  function rider(D, x, y, ang, scl, jacket, hair) {
    var P = SK.pen(x, y, ang, scl, 1);
    var skin = [238, 208, 178];
    var pants = [32, 30, 46];
    var board = [28, 26, 38];
    var boardEdge = [70, 60, 90];

    // SNOWBOARD — long thin tilted rect under the feet (local y=0 is board)
    var bL = P(-14, 0), bR = P(14, 0);
    var bcx = (bL[0] + bR[0]) * 0.5, bcy = (bL[1] + bR[1]) * 0.5;
    D.ellipse(bcx, bcy, 14 * scl, 1.6 * scl, ang, board[0], board[1], board[2], 1);
    // bright board edge / accent (rim light catches snow reflection)
    D.ellipse(bcx, bcy - 0.6 * scl * Math.cos(ang), 13 * scl, 0.7 * scl, ang,
              boardEdge[0], boardEdge[1], boardEdge[2], 0.9);

    // BOOTS / BINDINGS — small dark rects between feet and board
    var ftL = P(-6, -2), ftR = P(6, -2);
    D.disc(ftL[0], ftL[1], 1.6 * scl, board[0], board[1], board[2], 1);
    D.disc(ftR[0], ftR[1], 1.6 * scl, board[0], board[1], board[2], 1);

    // PANTS — short stocky region from boards up to jacket hem
    var pHip = P(0, -8);
    D.ellipse(pHip[0], pHip[1], 6.5 * scl, 4.5 * scl, ang, pants[0], pants[1], pants[2], 1);

    // JACKET — crouched torso, tilted forward into the slope direction.
    // Body axis tilts slightly more than the slope (rider leans forward).
    var leanAng = ang - 0.20;
    var jCx = P(2, -14);
    D.ellipse(jCx[0], jCx[1], 8 * scl, 7 * scl, leanAng, jacket[0], jacket[1], jacket[2], 1);
    // jacket highlight (bright accent on chest catching the sun)
    var jH = P(4, -15);
    D.ellipse(jH[0], jH[1], 3.6 * scl, 2.6 * scl, leanAng,
              Math.min(255, jacket[0] + 60), Math.min(255, jacket[1] + 60), Math.min(255, jacket[2] + 50), 0.6);

    // BACK ARM — tucked behind, jacket-coloured
    var aB = P(-3, -13);
    D.ellipse(aB[0], aB[1], 4 * scl, 2.0 * scl, leanAng - 0.4, jacket[0], jacket[1], jacket[2], 1);
    // FRONT ARM — extended forward for balance
    var aF = P(9, -12);
    D.ellipse(aF[0], aF[1], 4.5 * scl, 1.9 * scl, leanAng + 0.2, jacket[0], jacket[1], jacket[2], 1);
    // glove
    var gl = P(13, -11);
    D.disc(gl[0], gl[1], 1.6 * scl, board[0], board[1], board[2], 1);

    // HEAD — skin disc, sits forward and up from jacket
    var hd = P(6, -20);
    D.disc(hd[0], hd[1], 3.2 * scl, skin[0], skin[1], skin[2], 1);

    // HAIR — visible behind helmet, trailing in the wind
    var hr = P(2, -20);
    D.ellipse(hr[0], hr[1], 3.4 * scl, 2.4 * scl, leanAng - 0.1, hair[0], hair[1], hair[2], 1);

    // HELMET / HAT — dark disc on top of head
    var hm = P(6, -22);
    D.ellipse(hm[0], hm[1], 3.6 * scl, 2.6 * scl, leanAng,
              hair[0] * 0.5 + 10, hair[1] * 0.5 + 10, hair[2] * 0.5 + 14, 1);

    // GOGGLES — tiny bright accent strip on the face
    var gg = P(7.4, -19.6);
    D.ellipse(gg[0], gg[1], 1.4 * scl, 0.7 * scl, leanAng, 30, 28, 42, 1);
  }

  // Snow particle field — seeded positions, drifting on t.
  function snowParticles(D, W, H, t, sc) {
    var rng = SK.rng(7331);
    for (var i = 0; i < 60; i++) {
      var baseX = rng() * W;
      var baseY = rng() * H * 0.92;
      var speed = 0.4 + rng() * 1.0;
      var phase = rng() * 6.283;
      var drift = Math.sin(t * (0.6 + rng() * 0.7) + phase) * 8 * sc;
      var fall = ((t * speed * 22 * sc) + baseY) % (H + 40);
      var rad = (0.4 + rng() * 1.1) * sc;
      var a = 0.55 + rng() * 0.4;
      D.disc(baseX + drift, fall, rad, 248, 252, 255, a);
    }
  }

  // Sun position constants (used by glow + jacket highlight tone).
  var SUN_X = 0.86, SUN_Y = 0.16;

  function draw(D, W, H, u, t) {
    var sc = W / 680;

    /* 1. SKY — bright icy gradient ---------------------------------------*/
    SK.vGradient(D, W, H, [
      [0,    [170, 210, 235]],
      [0.45, [205, 225, 240]],
      [0.75, [232, 240, 248]],
      [1,    [240, 245, 250]]
    ], Math.round(4 * sc));

    /* 2. SUN GLOW — soft warm halo upper-right --------------------------*/
    var sx = SUN_X * W, sy = SUN_Y * H;
    SK.glow(D, sx, sy, 0.045 * W, [255, 248, 220], {
      halo: [[4.2, 0.10], [2.8, 0.20], [1.7, 0.35]],
      coreAlpha: 0.85
    });
    // sun rays — subtle radial streaks
    var rng0 = SK.rng(404);
    for (var rr = 0; rr < 12; rr++) {
      var rang = rng0() * Math.PI * 2;
      var rlen = (0.10 + rng0() * 0.08) * W;
      var rx0 = sx + Math.cos(rang) * 0.05 * W;
      var ry0 = sy + Math.sin(rang) * 0.05 * W;
      var rx1 = sx + Math.cos(rang) * (0.05 * W + rlen);
      var ry1 = sy + Math.sin(rang) * (0.05 * W + rlen);
      SK.line(D, rx0, ry0, rx1, ry1, [255, 245, 210], 1.4 * sc, 0.18);
    }

    /* 3. DISTANT MOUNTAINS — atmospheric perspective ---------------------*/
    // Furthest ridge: very pale blue-gray
    SK.ridgeFrac(D, [
      [0.00, 0.74], [0.08, 0.66], [0.18, 0.70], [0.28, 0.60],
      [0.40, 0.66], [0.50, 0.58], [0.62, 0.64], [0.74, 0.56],
      [0.86, 0.62], [0.94, 0.58], [1.00, 0.66]
    ], W, 0.62 * H, [195, 208, 222], 1);

    // Mid ridge: slightly darker
    SK.ridgeFrac(D, [
      [0.00, 0.92], [0.10, 0.82], [0.22, 0.88], [0.34, 0.74],
      [0.46, 0.86], [0.58, 0.78], [0.70, 0.84], [0.82, 0.72],
      [0.92, 0.82], [1.00, 0.78]
    ], W, 0.62 * H, [165, 180, 200], 1);

    // Near range: darker still, with snowy peaks above
    SK.ridgeFrac(D, [
      [0.00, 1.00], [0.06, 0.92], [0.14, 0.98], [0.22, 0.88],
      [0.32, 0.95], [0.42, 0.86], [0.52, 0.93], [0.60, 0.84],
      [0.70, 0.92], [0.80, 0.86], [0.90, 0.95], [1.00, 0.90]
    ], W, 0.62 * H, [140, 155, 180], 1);

    // Snow caps on near ridge peaks (small bright triangles)
    var peaks = [
      [0.06, 0.92], [0.22, 0.88], [0.42, 0.86], [0.60, 0.84], [0.80, 0.86]
    ];
    for (var pi = 0; pi < peaks.length; pi++) {
      var pkx = peaks[pi][0] * W;
      var pky = peaks[pi][1] * 0.62 * H;
      D.tri(pkx, pky, pkx - 0.025 * W, pky + 0.03 * H, pkx + 0.025 * W, pky + 0.03 * H,
            235, 240, 248, 0.9);
    }

    /* 4. MAIN SLOPE — large tilted polygon ------------------------------*/
    // The slope plane: a quadrilateral covering lower portion of the frame.
    // Define corners using the slope line so the riders sit precisely on it.
    function slopeY(xFrac) { return SLOPE_Y0 + SLOPE_M * (xFrac - SLOPE_X0); }

    // Upper edge of slope (where snow meets sky/mountains)
    var sl_xL = -0.05, sl_yL = slopeY(sl_xL);    // upper-left of slope
    var sl_xR = 1.05;
    var sl_yR_top = slopeY(sl_xR);

    // SHADOW BAND under the slope's top edge (cool blue, gives dimension)
    D.tri(sl_xL * W, sl_yL * H, sl_xR * W, sl_yR_top * H, sl_xR * W, (sl_yR_top + 0.05) * H,
          180, 200, 220, 1);
    D.tri(sl_xL * W, sl_yL * H, sl_xR * W, (sl_yR_top + 0.05) * H, sl_xL * W, (sl_yL + 0.05) * H,
          180, 200, 220, 1);

    // MAIN SNOW SURFACE (bright)
    D.tri(sl_xL * W, (sl_yL + 0.02) * H, sl_xR * W, (sl_yR_top + 0.02) * H, sl_xR * W, 1.05 * H,
          245, 248, 252, 1);
    D.tri(sl_xL * W, (sl_yL + 0.02) * H, sl_xR * W, 1.05 * H, sl_xL * W, 1.05 * H,
          245, 248, 252, 1);

    // SOFT SHADOW POOLS on the snow (subtle darker bands for depth)
    function snowShadow(xFrac, yOffset, wFrac, a) {
      var sxFrac = xFrac;
      var syFrac = slopeY(sxFrac) + yOffset;
      D.ellipse(sxFrac * W, syFrac * H, wFrac * W, 0.025 * H, SLOPE_ANG,
                200, 215, 232, a);
    }
    snowShadow(0.18, 0.18, 0.22, 0.45);
    snowShadow(0.62, 0.12, 0.20, 0.35);
    snowShadow(0.88, 0.22, 0.18, 0.40);
    snowShadow(0.40, 0.30, 0.26, 0.28);

    /* 5. SUBTLE SKI TRACKS — two parallel grooves left by the riders ---*/
    // Computed for the WOMAN's past path; the man's path mirrors below.
    function riderPos(uPhase) {
      // uPhase in [0,1] = the rider's progress along the slope.
      // x and y derived from slope line.
      var x = SK.lerp(-0.10, 1.10, uPhase);
      var y = slopeY(x);
      return { x: x, y: y };
    }

    // Riders' current progress (eased): woman slightly ahead, man trailing.
    // Both riders stay visible on-screen for the whole loop by mapping u to
    // a path window inside [0.10 .. 0.85] of the slope.
    var uE = SK.easeInOutCubic(u);
    var womanU = SK.lerp(0.18, 0.88, uE);
    var manU   = SK.lerp(0.05, 0.74, uE);

    // Tracks — draw the trail behind each rider as faint parallel lines
    function drawTrack(currentU, yJitter) {
      var samples = 22;
      for (var s = 0; s < samples - 1; s++) {
        var u0 = currentU - (s + 1) * 0.045;
        var u1 = currentU - s * 0.045;
        if (u0 < -0.10) continue;
        var p0 = riderPos(u0), p1 = riderPos(u1);
        var fade = 1 - s / samples;
        SK.line(D,
          p0.x * W, (p0.y + yJitter) * H + 5 * sc,
          p1.x * W, (p1.y + yJitter) * H + 5 * sc,
          [205, 220, 235], 1.6 * sc, 0.35 * fade);
      }
    }
    drawTrack(womanU, 0.012);
    drawTrack(manU,   0.018);

    /* 6. HEARTS TRAIL — behind each rider ------------------------------*/
    function drawHearts(currentU, yOffset, baseSize) {
      var heartCol = [235, 88, 110];
      var nHearts = 6;
      for (var k = 1; k <= nHearts; k++) {
        // Hearts left behind at past times. Position in slope-space.
        var pastU = currentU - k * 0.055;
        if (pastU < -0.15) continue;
        var hp = riderPos(pastU);
        // Hearts float UP and slightly back from the slope line (sky side)
        var floatRise = k * 0.018;   // older hearts have risen further
        var bob = Math.sin(t * 2.5 + k * 0.9) * 0.006;
        var hx = hp.x * W;
        var hy = (hp.y - 0.06 - floatRise + bob) * H;
        var sizeK = baseSize * (1 - k * 0.07);
        var aK = SK.clamp(1 - k / nHearts, 0.05, 1);
        SK.heart(D, hx, hy, sizeK * sc, heartCol, aK);
        // little halo for the freshest heart so the brightest one pops
        if (k <= 2) {
          D.disc(hx, hy + sizeK * sc * 0.1, sizeK * sc * 1.4, 255, 200, 215, 0.10 * aK);
        }
      }
    }

    /* 7. RIDERS — woman in front, man trailing -------------------------*/
    // SHADOWS on the snow under each rider (a soft dark blue oval)
    function riderShadow(currentU, baseScl) {
      var p = riderPos(currentU);
      D.ellipse(p.x * W, (p.y + 0.012) * H, baseScl * 13 * sc, baseScl * 3 * sc,
                SLOPE_ANG, 90, 110, 140, 0.35);
    }

    // Body bob — tiny vertical perturbation for terrain-following feel
    var womanBob = Math.sin(t * 9.2) * 0.0025;
    var manBob   = Math.sin(t * 9.2 + 1.1) * 0.0028;

    // RIDER SCALES — big enough to read clearly through the styliser.
    var sclBase = 2.6 + 0.4 * uE;

    // Slope angle plus a tiny dynamic tilt as they shift weight
    var womanAng = SLOPE_ANG + Math.sin(t * 1.9) * 0.04;
    var manAng   = SLOPE_ANG + Math.sin(t * 1.9 + 0.7) * 0.04;

    // Draw shadows first (they sit on the snow surface, below the riders)
    if (womanU > -0.10 && womanU < 1.10) riderShadow(womanU + womanBob, sclBase);
    if (manU > -0.10 && manU < 1.10)     riderShadow(manU + manBob, sclBase);

    // Hearts trail (size scales with rider size)
    drawHearts(womanU, 0.012, 20);
    drawHearts(manU,   0.018, 20);

    // Woman (rose jacket, brown hair) — leading
    if (womanU > -0.10 && womanU < 1.10) {
      var wp = riderPos(womanU + womanBob);
      rider(D, wp.x * W, (wp.y - 0.012) * H, womanAng, sclBase * sc,
            [200, 92, 112], [112, 72, 50]);
    }

    // Man (navy jacket, black hair) — trailing
    if (manU > -0.10 && manU < 1.10) {
      var mp = riderPos(manU + manBob);
      rider(D, mp.x * W, (mp.y - 0.012) * H, manAng, sclBase * sc,
            [40, 62, 110], [22, 18, 28]);
    }

    /* 8. SNOW PARTICLES — drifting flakes on t -------------------------*/
    snowParticles(D, W, H, t, sc);

    /* 9. KICKED-UP SNOW — bursts behind each rider's board -------------*/
    function snowSpray(currentU, seedOffset) {
      var p = riderPos(currentU);
      var rng2 = SK.rng(900 + seedOffset);
      for (var sp = 0; sp < 8; sp++) {
        var sprAng = SLOPE_ANG + Math.PI + (rng2() - 0.5) * 1.0;
        var sprDist = (8 + rng2() * 22) * sc;
        var sprX = p.x * W + Math.cos(sprAng) * sprDist;
        var sprY = (p.y + 0.008) * H + Math.sin(sprAng) * sprDist;
        var sprT = (t + rng2() * 1.0) % 0.6;
        var fade = 1 - sprT / 0.6;
        D.disc(sprX, sprY + sprT * 14 * sc, (1.0 + rng2() * 1.5) * sc * fade,
               250, 252, 255, 0.55 * fade);
      }
    }
    if (womanU > 0 && womanU < 1.05) snowSpray(womanU, 1);
    if (manU > 0 && manU < 1.05)     snowSpray(manU, 2);
  }

  return { id: 'snowboard', name: 'fresh tracks', dur: 10.0, draw: draw };
});
