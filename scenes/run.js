/* ============================================================================
 * scenes/run.js — sunny outdoor side-view: woman runs toward man, leaps into
 * his open arms. Floating hearts bloom above the embrace.
 * Composition matches sceneRefs/scene10RunToEachotherLove.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  // Shared character palette ----------------------------------------------
  var SKIN      = [238, 208, 178];
  var SKIN_SH   = [205, 168, 138];
  var HAIR_M    = [22, 18, 28];          // man: black
  var HAIR_W    = [112, 72, 50];         // woman: brown
  var HAIR_W_SH = [82, 52, 36];
  var SHIRT_M   = [40, 62, 110];         // navy
  var SHIRT_M_SH = [26, 42, 80];
  var PANTS_M   = [44, 36, 64];          // dark trousers
  var SHIRT_W   = [200, 92, 112];        // rose
  var SHIRT_W_SH = [158, 64, 84];
  var PANTS_W   = [70, 52, 92];          // dark plum skirt/pants
  var HEART     = [235, 88, 110];

  // Tree palette ----------------------------------------------------------
  var TRUNK     = [80, 55, 35];
  var TRUNK_F   = [130, 105, 85];        // faded far trunk
  var FOLIAGE_N = [70, 125, 60];         // near foliage (saturated)
  var FOLIAGE_F = [155, 190, 145];       // far foliage (very pale, atmospheric)
  var FOLIAGE_M = [100, 150, 85];        // mid foliage

  // Static decoration (trees), pre-seeded so they stay put across frames.
  // Each tree: [xFrac, baseYFrac (of groundY), heightFrac (of H), trunkWFrac, kind]
  // kind: 'cone' = triangle canopy; 'round' = blob canopy
  var TREES = [
    // far/background row (smaller, lighter)
    [0.05, 1.00, 0.22, 0.012, 'round', 'far'],
    [0.18, 1.00, 0.28, 0.014, 'cone',  'far'],
    [0.32, 1.00, 0.20, 0.011, 'round', 'far'],
    [0.46, 1.00, 0.26, 0.013, 'cone',  'far'],
    [0.62, 1.00, 0.24, 0.012, 'round', 'far'],
    [0.78, 1.00, 0.30, 0.015, 'cone',  'far'],
    [0.92, 1.00, 0.22, 0.012, 'round', 'far'],
    // mid row (slightly larger, mid tone)
    [0.10, 1.00, 0.34, 0.017, 'cone',  'mid'],
    [0.40, 1.00, 0.32, 0.016, 'round', 'mid'],
    [0.70, 1.00, 0.36, 0.018, 'cone',  'mid'],
    [0.88, 1.00, 0.30, 0.016, 'round', 'mid']
  ];

  /* ---- a single geometric tree ----------------------------------------- */
  function drawTree(D, W, H, sc, t, x, baseY, height, trunkW, kind, layer) {
    var col, alpha, trunkCol;
    if (layer === 'far') { col = FOLIAGE_F; alpha = 0.95; trunkCol = TRUNK_F; }
    else if (layer === 'mid') { col = FOLIAGE_M; alpha = 1.0; trunkCol = TRUNK; }
    else { col = FOLIAGE_N; alpha = 1.0; trunkCol = TRUNK; }
    var trunkH = height * 0.32;
    var canopyH = height * 0.78;
    var canopyTop = baseY - height;
    var canopyBot = baseY - trunkH * 0.6;
    // gentle sway driven by t (subtle ambient life)
    var sway = Math.sin(t * 0.6 + x * 11) * 1.2 * sc;
    // trunk
    D.rect(x - trunkW / 2, baseY - trunkH, trunkW, trunkH,
           trunkCol[0], trunkCol[1], trunkCol[2], alpha);
    if (kind === 'cone') {
      // two stacked triangles for a layered conifer
      var midY = canopyTop + canopyH * 0.55;
      D.tri(x + sway, canopyTop,
            x - canopyH * 0.30, midY,
            x + canopyH * 0.30, midY,
            col[0], col[1], col[2], alpha);
      D.tri(x + sway * 0.6, canopyTop + canopyH * 0.30,
            x - canopyH * 0.40, canopyBot,
            x + canopyH * 0.40, canopyBot,
            col[0], col[1], col[2], alpha);
    } else {
      // rounded blob canopy: a stack of overlapping discs (clean geometric)
      var cx = x + sway, cy = canopyTop + canopyH * 0.45;
      var rMain = canopyH * 0.42;
      D.disc(cx, cy, rMain, col[0], col[1], col[2], alpha);
      D.disc(cx - rMain * 0.55, cy + rMain * 0.15, rMain * 0.78,
             col[0], col[1], col[2], alpha);
      D.disc(cx + rMain * 0.55, cy + rMain * 0.10, rMain * 0.80,
             col[0], col[1], col[2], alpha);
      D.disc(cx, cy - rMain * 0.45, rMain * 0.72,
             col[0], col[1], col[2], alpha);
    }
  }

  /* ---- the man: side view, facing LEFT (dir=-1), arms OPEN WIDE -------- *
   * Anchored figure — does not move. He's catching her.
   * (cx, cy) is the centre of his torso.
   * --------------------------------------------------------------------- */
  function man(D, cx, cy, sc, t, catchP) {
    if (catchP == null) catchP = 0;          // 0 = arms wide open, 1 = arms wrapped around her
    var P = SK.pen(cx, cy, 0, sc, -1);

    // ---- LEGS (slightly apart, planted) ---------------------------------
    // back leg (further from viewer, slightly behind)
    var bk1 = P(-1, 18), bk2 = P(-5, 60), bk3 = P(2, 60), bk4 = P(4, 18);
    D.tri(bk1[0], bk1[1], bk2[0], bk2[1], bk3[0], bk3[1],
          PANTS_M[0], PANTS_M[1], PANTS_M[2], 1);
    D.tri(bk1[0], bk1[1], bk3[0], bk3[1], bk4[0], bk4[1],
          PANTS_M[0], PANTS_M[1], PANTS_M[2], 1);
    // front leg
    var fr1 = P(4, 18), fr2 = P(8, 60), fr3 = P(15, 60), fr4 = P(11, 18);
    D.tri(fr1[0], fr1[1], fr2[0], fr2[1], fr3[0], fr3[1],
          PANTS_M[0], PANTS_M[1], PANTS_M[2], 1);
    D.tri(fr1[0], fr1[1], fr3[0], fr3[1], fr4[0], fr4[1],
          PANTS_M[0], PANTS_M[1], PANTS_M[2], 1);
    // shoes
    var sh1 = P(-7, 60), sh2 = P(4, 60), sh3 = P(4, 65), sh4 = P(-7, 65);
    D.tri(sh1[0], sh1[1], sh2[0], sh2[1], sh3[0], sh3[1], 22, 18, 28, 1);
    D.tri(sh1[0], sh1[1], sh3[0], sh3[1], sh4[0], sh4[1], 22, 18, 28, 1);
    var sh5 = P(6, 60), sh6 = P(17, 60), sh7 = P(17, 65), sh8 = P(6, 65);
    D.tri(sh5[0], sh5[1], sh6[0], sh6[1], sh7[0], sh7[1], 22, 18, 28, 1);
    D.tri(sh5[0], sh5[1], sh7[0], sh7[1], sh8[0], sh8[1], 22, 18, 28, 1);

    // ---- TORSO (navy shirt, ellipse) ------------------------------------
    var torC = P(0, 0);
    D.ellipse(torC[0], torC[1], 13 * sc, 26 * sc, 0,
              SHIRT_M_SH[0], SHIRT_M_SH[1], SHIRT_M_SH[2], 1);
    D.ellipse(torC[0], torC[1] - 2 * sc, 11 * sc, 23 * sc, 0,
              SHIRT_M[0], SHIRT_M[1], SHIRT_M[2], 1);

    // ---- ARMS — lerp between "open wide" (catchP=0) and "wrapped" (catchP=1)
    // Side view: arms reach LEFT (toward woman). When she's caught, elbows
    // tuck in and hands drop to support her at her hip level.
    var armBob = Math.sin(t * 1.6) * 1.2 * sc;
    var cp = catchP;

    // ---- near arm (nearest the viewer) ---------------------------------
    var sX = cx - 14 * sc;
    var sY = cy - 16 * sc;
    // OPEN pose: arm extended forward + slightly up
    var elbX0 = sX - 24 * sc;
    var elbY0 = sY - 8 * sc - armBob * 0.4;
    var handX0 = elbX0 - 26 * sc;
    var handY0 = elbY0 - 14 * sc + armBob;
    // WRAPPED pose: elbow tucks toward body; hand DROPS to cradle her hip
    var elbX1 = sX - 14 * sc;
    var elbY1 = sY + 6 * sc;
    var handX1 = sX - 36 * sc;
    var handY1 = sY + 16 * sc + armBob * 0.5;
    var elbX = SK.lerp(elbX0, elbX1, cp);
    var elbY = SK.lerp(elbY0, elbY1, cp);
    var handX = SK.lerp(handX0, handX1, cp);
    var handY = SK.lerp(handY0, handY1, cp);
    drawArmSeg(D, sX, sY, elbX, elbY, sc, SHIRT_M, 5);
    drawArmSeg(D, elbX, elbY, handX, handY, sc, SKIN, 4);
    D.disc(handX, handY, 4.5 * sc, SKIN[0], SKIN[1], SKIN[2], 1);

    // ---- far arm (slightly higher to read both arms) -------------------
    var sX2 = cx - 6 * sc;
    var sY2 = cy - 18 * sc;
    // OPEN pose
    var elb2X0 = sX2 - 22 * sc;
    var elb2Y0 = sY2 - 16 * sc + armBob * 0.4;
    var hand2X0 = elb2X0 - 22 * sc;
    var hand2Y0 = elb2Y0 - 18 * sc - armBob;
    // WRAPPED pose: comes around the FAR side of her back
    var elb2X1 = sX2 - 16 * sc;
    var elb2Y1 = sY2 + 2 * sc;
    var hand2X1 = sX2 - 30 * sc;
    var hand2Y1 = sY2 + 8 * sc + armBob * 0.3;
    var elb2X = SK.lerp(elb2X0, elb2X1, cp);
    var elb2Y = SK.lerp(elb2Y0, elb2Y1, cp);
    var hand2X = SK.lerp(hand2X0, hand2X1, cp);
    var hand2Y = SK.lerp(hand2Y0, hand2Y1, cp);
    drawArmSeg(D, sX2, sY2, elb2X, elb2Y, sc, SHIRT_M_SH, 4.5);
    drawArmSeg(D, elb2X, elb2Y, hand2X, hand2Y, sc, SKIN_SH, 3.5);
    D.disc(hand2X, hand2Y, 4 * sc, SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);

    // ---- NECK -----------------------------------------------------------
    D.rect(cx - 4 * sc, cy - 28 * sc, 8 * sc, 8 * sc,
           SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);

    // ---- HEAD (slightly forward of body, looking LEFT) ------------------
    var headR = 13 * sc;
    var hx = cx - 3 * sc;
    var hy = cy - 38 * sc;
    D.disc(hx, hy, headR, SKIN[0], SKIN[1], SKIN[2], 1);
    // jaw shadow on viewer-near side
    D.ellipse(hx + headR * 0.45, hy + headR * 0.30,
              headR * 0.50, headR * 0.60, 0,
              SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 0.35);
    // BLACK HAIR — substantial dome over the top + back of head
    D.ellipse(hx - headR * 0.10, hy - headR * 0.30,
              headR * 1.10, headR * 0.75, 0,
              HAIR_M[0], HAIR_M[1], HAIR_M[2], 1);
    // back of head hair (extends down/back since he faces left, back is right)
    D.ellipse(hx + headR * 0.55, hy - headR * 0.10,
              headR * 0.45, headR * 0.55, 0,
              HAIR_M[0], HAIR_M[1], HAIR_M[2], 1);
    // forelock sweep
    D.ellipse(hx - headR * 0.50, hy - headR * 0.15,
              headR * 0.40, headR * 0.35, 0.25,
              HAIR_M[0], HAIR_M[1], HAIR_M[2], 1);
    // small smile mouth (facing left → mouth on the left side of face)
    D.ellipse(hx - headR * 0.55, hy + headR * 0.30,
              headR * 0.18, headR * 0.06, 0.1,
              180, 80, 90, 1);
    // single visible eye looking left
    D.disc(hx - headR * 0.45, hy - headR * 0.05, headR * 0.10,
           HAIR_M[0], HAIR_M[1], HAIR_M[2], 1);
  }

  /* ---- the woman: side view, facing RIGHT (dir=+1) --------------------- *
   * Her pose changes with phase:
   *   phase = 'run'   — running stride, leaning forward
   *   phase = 'leap'  — airborne, body angled, arms forward
   *   phase = 'caught' — pressed against him, arms around his neck
   * (cx, cy) is the centre of her torso.
   * --------------------------------------------------------------------- */
  function woman(D, cx, cy, sc, t, phase, phaseT) {
    var P = SK.pen(cx, cy, 0, sc, 1);
    var stride = Math.sin(t * 13);   // faster running cadence (was t*7)

    // ---- LEGS — drawn as thigh + shin with a visible knee bend ----------
    if (phase === 'run') {
      // Two legs running in opposition. Each leg traces an elliptical foot
      // path; the knee bends MORE when the foot is in the swing (lift) half
      // of the cycle, giving a high-knee, athletic running silhouette.
      function runLeg(hipDx, swing) {
        var hipX = cx + hipDx * sc, hipY = cy + 18 * sc;
        var lift = Math.max(0, swing);                  // 0..1 during swing-up
        var footX = cx + (hipDx + swing * 13) * sc;
        var footY = hipY + (38 - lift * 22) * sc;       // foot lifts off ground
        // knee is forward of hip and HIGH during swing
        var kneeX = cx + (hipDx + swing * 5 + 4) * sc;
        var kneeY = cy + (16 - lift * 11) * sc;
        drawArmSeg(D, hipX, hipY, kneeX, kneeY, sc, PANTS_W, 5.0);
        drawArmSeg(D, kneeX, kneeY, footX, footY, sc, PANTS_W, 4.0);
        D.ellipse(footX, footY + 2 * sc, 6 * sc, 3 * sc, 0, 22, 18, 28, 1);
      }
      runLeg(-2, stride);                  // back leg
      runLeg( 2, -stride);                 // front leg (opposite phase)
    } else if (phase === 'leap') {
      // Mid-air leap: knees come forward+up (tucking toward chest as she
      // arcs into him). Both legs together, slightly offset for parallax.
      var tuck = SK.easeOutCubic(phaseT);
      function leapLeg(hipDx, kneeOff, footOff) {
        var hipX = cx + hipDx * sc, hipY = cy + 18 * sc;
        var kneeX = cx + (hipDx + 10 + tuck * 4 + kneeOff) * sc;
        var kneeY = cy + (10 - tuck * 4) * sc;
        var footX = cx + (hipDx + 4 + footOff) * sc;
        var footY = cy + (28 - tuck * 6) * sc;
        drawArmSeg(D, hipX, hipY, kneeX, kneeY, sc, PANTS_W, 5.0);
        drawArmSeg(D, kneeX, kneeY, footX, footY, sc, PANTS_W, 4.0);
        D.disc(footX, footY, 3.5 * sc, 22, 18, 28, 1);
      }
      leapLeg(-3, 0, -2);                  // back leg
      leapLeg( 2, 2,  2);                  // front leg (slightly higher knee)
    } else { // caught — legs LIFT and WRAP around his waist
      // Knees rise up alongside her torso; feet curl back behind him.
      // settle ramps quickly so the wrap happens right as she's caught.
      var settle = SK.easeOutCubic(SK.clamp(phaseT * 2.0, 0, 1));
      // small kick on first impact, then settles
      var kick = (1 - settle) * Math.sin(phaseT * Math.PI * 3) * 4;
      function wrapLeg(hipDx, yLift, footExt) {
        var hipX = cx + hipDx * sc, hipY = cy + 18 * sc;
        // knee rises ABOVE hip (legs lifted up at the side of his torso)
        var kneeX = cx + (hipDx + 14 + settle * 6) * sc;
        var kneeY = cy + (4 - settle * (16 + yLift) + kick) * sc;
        // foot wraps further out and slightly down behind him
        var footX = cx + (hipDx + 22 + settle * (4 + footExt)) * sc;
        var footY = cy + (16 - settle * (8 + yLift) + kick * 0.5) * sc;
        drawArmSeg(D, hipX, hipY, kneeX, kneeY, sc, PANTS_W, 5.0);
        drawArmSeg(D, kneeX, kneeY, footX, footY, sc, PANTS_W, 4.0);
        D.disc(footX, footY, 3.5 * sc, 22, 18, 28, 1);
      }
      wrapLeg(-2, 0, 0);                   // back leg
      wrapLeg( 2, 3, 2);                   // front leg slightly higher / further
    }

    // ---- TORSO (rose shirt) ---------------------------------------------
    var leanAng = (phase === 'run') ? -0.18
                : (phase === 'leap') ? -0.45 - phaseT * 0.08
                : -0.10;
    var Pt = SK.pen(cx, cy, leanAng, sc, 1);
    // shadow underlay
    var tShCx = Pt(0, 0);
    D.ellipse(tShCx[0], tShCx[1], 11.5 * sc, 24 * sc, leanAng,
              SHIRT_W_SH[0], SHIRT_W_SH[1], SHIRT_W_SH[2], 1);
    D.ellipse(tShCx[0], tShCx[1] - 2 * sc, 9.5 * sc, 21 * sc, leanAng,
              SHIRT_W[0], SHIRT_W[1], SHIRT_W[2], 1);

    // ---- ARMS ------------------------------------------------------------
    // Position arms based on phase.
    var armSwing = (phase === 'run') ? Math.sin(t * 7) * 12 : 0;

    if (phase === 'run') {
      // running arms: one swung back, one forward
      // back arm
      var bsX = cx - 6 * sc, bsY = cy - 14 * sc;
      var belX = bsX - 10 * sc, belY = bsY + 6 * sc - armSwing * 0.4;
      var bhX = belX - 6 * sc, bhY = belY + 10 * sc - armSwing * 0.2;
      drawArmSeg(D, bsX, bsY, belX, belY, sc, SHIRT_W_SH);
      drawArmSeg(D, belX, belY, bhX, bhY, sc, SKIN_SH);
      D.disc(bhX, bhY, 4 * sc, SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);
      // front arm (forward swing)
      var fsX = cx + 4 * sc, fsY = cy - 14 * sc;
      var felX = fsX + 12 * sc, felY = fsY - 4 * sc + armSwing * 0.4;
      var fhX = felX + 10 * sc, fhY = felY + 4 * sc + armSwing * 0.2;
      drawArmSeg(D, fsX, fsY, felX, felY, sc, SHIRT_W);
      drawArmSeg(D, felX, felY, fhX, fhY, sc, SKIN);
      D.disc(fhX, fhY, 4.5 * sc, SKIN[0], SKIN[1], SKIN[2], 1);
    } else if (phase === 'leap') {
      // both arms reaching FORWARD (toward man / right), stretched out
      // far arm
      var bsXL = cx + 2 * sc, bsYL = cy - 20 * sc;
      var belXL = bsXL + 22 * sc, belYL = bsYL - 10 * sc;
      var bhXL = belXL + 22 * sc, bhYL = belYL - 8 * sc;
      drawArmSeg(D, bsXL, bsYL, belXL, belYL, sc, SHIRT_W_SH);
      drawArmSeg(D, belXL, belYL, bhXL, bhYL, sc, SKIN_SH);
      D.disc(bhXL, bhYL, 4 * sc, SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);
      // near arm — slightly higher and more extended
      var fsXL = cx + 8 * sc, fsYL = cy - 22 * sc;
      var felXL = fsXL + 24 * sc, felYL = fsYL - 14 * sc;
      var fhXL = felXL + 22 * sc, fhYL = felYL - 8 * sc;
      drawArmSeg(D, fsXL, fsYL, felXL, felYL, sc, SHIRT_W);
      drawArmSeg(D, felXL, felYL, fhXL, fhYL, sc, SKIN);
      D.disc(fhXL, fhYL, 4.5 * sc, SKIN[0], SKIN[1], SKIN[2], 1);
    } else { // caught — arms wrapped around his neck (extending up/forward)
      var bsXC = cx - 2 * sc, bsYC = cy - 18 * sc;
      var belXC = bsXC + 14 * sc, belYC = bsYC - 16 * sc;
      var bhXC = belXC + 12 * sc, bhYC = belYC - 4 * sc;
      drawArmSeg(D, bsXC, bsYC, belXC, belYC, sc, SHIRT_W_SH);
      drawArmSeg(D, belXC, belYC, bhXC, bhYC, sc, SKIN_SH);
      D.disc(bhXC, bhYC, 4 * sc, SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);
      var fsXC = cx + 6 * sc, fsYC = cy - 20 * sc;
      var felXC = fsXC + 16 * sc, felYC = fsYC - 18 * sc;
      var fhXC = felXC + 12 * sc, fhYC = felYC - 6 * sc;
      drawArmSeg(D, fsXC, fsYC, felXC, felYC, sc, SHIRT_W);
      drawArmSeg(D, felXC, felYC, fhXC, fhYC, sc, SKIN);
      D.disc(fhXC, fhYC, 4.5 * sc, SKIN[0], SKIN[1], SKIN[2], 1);
    }

    // ---- NECK -----------------------------------------------------------
    var nkY = cy - 28 * sc;
    D.rect(cx - 4 * sc, nkY, 8 * sc, 8 * sc,
           SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);

    // ---- HEAD (facing right) --------------------------------------------
    var headR = 13 * sc;
    var hx = cx + 3 * sc;
    var hy = cy - 38 * sc;
    // BROWN hair back mass (behind head — extends behind/down since facing right, back is left)
    D.ellipse(hx - headR * 0.55, hy + headR * 0.05,
              headR * 0.55, headR * 0.70, 0,
              HAIR_W[0], HAIR_W[1], HAIR_W[2], 1);
    // hair down past shoulder a bit
    D.ellipse(hx - headR * 0.40, hy + headR * 0.85,
              headR * 0.45, headR * 0.85, -0.10,
              HAIR_W[0], HAIR_W[1], HAIR_W[2], 1);
    // skin head
    D.disc(hx, hy, headR, SKIN[0], SKIN[1], SKIN[2], 1);
    // jaw shadow
    D.ellipse(hx - headR * 0.45, hy + headR * 0.30,
              headR * 0.50, headR * 0.60, 0,
              SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 0.35);
    // brown hair top dome (clearly readable as brown)
    D.ellipse(hx + headR * 0.10, hy - headR * 0.30,
              headR * 1.10, headR * 0.75, 0,
              HAIR_W[0], HAIR_W[1], HAIR_W[2], 1);
    // bangs sweep on right (where she's facing)
    D.ellipse(hx + headR * 0.45, hy - headR * 0.10,
              headR * 0.45, headR * 0.35, -0.30,
              HAIR_W_SH[0], HAIR_W_SH[1], HAIR_W_SH[2], 1);
    // smile (facing right → mouth on the right)
    D.ellipse(hx + headR * 0.55, hy + headR * 0.30,
              headR * 0.18, headR * 0.06, -0.1,
              180, 80, 90, 1);
    // eye looking right
    D.disc(hx + headR * 0.45, hy - headR * 0.05, headR * 0.10,
           HAIR_M[0], HAIR_M[1], HAIR_M[2], 1);
  }

  // Helper: a limb segment (elongated ellipse) from (x1,y1) to (x2,y2).
  // `thick` is the perpendicular half-thickness in sc-units (default 3.5).
  function drawArmSeg(D, x1, y1, x2, y2, sc, col, thick) {
    if (thick == null) thick = 3.5;
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var len = Math.hypot(x2 - x1, y2 - y1);
    D.ellipse(mx, my, len / 2 + 2 * sc, thick * sc, ang,
              col[0], col[1], col[2], 1);
  }

  /* ---- floating heart with bobble; `cel` (0..1) ramps the animation up - */
  function floatHeart(D, x, y, size, t, phase, alpha, cel) {
    cel = cel || 0;
    var freqK = 1 + cel * 1.8;        // faster bob/pulse when celebrating
    var ampK  = 1 + cel * 1.4;        // bigger swings + heart size pulse
    var bob   = Math.sin(t * 1.3 * freqK + phase) * size * 0.15 * ampK;
    var drift = Math.cos(t * 0.8 * freqK + phase) * size * 0.10 * ampK;
    var rise  = cel * size * 0.35 * (0.7 + 0.3 * Math.sin(t * 1.5 + phase));
    var pulse = 1 + (0.08 + cel * 0.22) * Math.sin(t * 2.5 * freqK + phase);
    SK.heart(D, x + drift, y + bob - rise, size * pulse, HEART, alpha);
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;
    var horizonY = 0.78 * H;     // where ground stripe begins
    var groundY  = 0.84 * H;     // figures' feet level

    /* 1. SKY — warm pale gold horizon → soft blue top -------------------- */
    SK.vGradient(D, W, horizonY, [
      [0,    [150, 200, 230]],
      [0.45, [195, 220, 230]],
      [0.85, [240, 230, 195]],
      [1,    [255, 235, 180]]
    ], Math.round(4 * sc));

    /* 2. SUN — upper-left, bright glow ----------------------------------- */
    var sunX = 0.18 * W, sunY = 0.18 * H, sunR = 0.045 * W;
    SK.glow(D, sunX, sunY, sunR, [255, 240, 200], {
      halo: [[3.4, 0.10], [2.4, 0.18], [1.6, 0.38], [1.2, 0.62]],
      coreAlpha: 1
    });

    /* 3. Distant rolling hill (very pale, far) --------------------------- */
    SK.ridgeFrac(D, [
      [0, 0.92], [0.18, 0.85], [0.34, 0.90], [0.5, 0.82],
      [0.65, 0.88], [0.82, 0.84], [1, 0.90]
    ], W, horizonY, [180, 200, 175], 1);

    /* 4. TREES — far row, then mid row (back-to-front)  ------------------ */
    for (var i = 0; i < TREES.length; i++) {
      var T = TREES[i];
      if (T[5] !== 'far') continue;
      drawTree(D, W, H, sc, t,
               T[0] * W, T[1] * horizonY,
               T[2] * H, T[3] * W, T[4], T[5]);
    }
    for (var j = 0; j < TREES.length; j++) {
      var T2 = TREES[j];
      if (T2[5] !== 'mid') continue;
      drawTree(D, W, H, sc, t,
               T2[0] * W, T2[1] * horizonY,
               T2[2] * H, T2[3] * W, T2[4], T2[5]);
    }

    /* 5. GROUND — grass stripe + darker shadow stripe -------------------- */
    D.rect(0, horizonY, W, H - horizonY, 90, 145, 75, 1);
    // a slightly darker band just under figures' feet
    D.rect(0, groundY, W, 0.022 * H, 70, 120, 60, 0.55);
    // soft shadow blob under each figure
    var manGX = 0.72 * W;
    var manGY = groundY;
    D.ellipse(manGX, manGY + 0.005 * H, 38 * sc, 5 * sc, 0,
              40, 70, 35, 0.55);

    /* 6. FIGURE motion — three eased u-phases ---------------------------- *
     * 0.00–0.17 RUN  : 1.5s of running (was 4s; covers same 40% of W)
     * 0.17–0.39 LEAP : parabolic arc; x → caughtX
     * 0.39–1.00 CAUGHT: wrapped at his torso, settles in (gets most of loop)
     * ------------------------------------------------------------------ */
    var wx, wy, phase, phaseT;
    var leapHeight = 0.18 * H;

    var manX = 0.72 * W;
    var manY = groundY;

    // catch position: pressed against his torso — her cy ≈ his cy so her
    // knees in wrap pose sit MIDWAY through his torso, not above his shoulders.
    var caughtX = manX - 44 * sc;
    var caughtY = manY - 0.005 * H;

    if (u < 0.17) {
      phaseT = u / 0.17;
      wx = SK.lerp(0.05, 0.45, phaseT) * W;   // 1.5s sprint across 40% of W
      wy = manY;
      phase = 'run';
    } else if (u < 0.39) {
      phaseT = (u - 0.17) / 0.22;
      var xT = SK.easeInOutCubic(phaseT);
      wx = SK.lerp(0.45 * W, caughtX, xT);
      // parabolic arc: y arcs up then down into his arms
      wy = manY - leapHeight * Math.sin(phaseT * Math.PI);
      phase = 'leap';
    } else {
      phaseT = (u - 0.39) / 0.61;
      wx = caughtX;
      // tiny settle-down (she starts slightly elevated, drops into his arms)
      var settle = (1 - SK.easeOutCubic(SK.clamp(phaseT * 2, 0, 1))) * -0.012 * H;
      wy = caughtY + settle + Math.sin(t * 1.8) * 0.005 * H;
      phase = 'caught';
    }

    /* 7. Draw MAN first (he's behind/anchoring), then WOMAN on top ------- */
    // catchProgress ramps as she lands: starts closing slightly near the end
    // of the leap, fully wrapped during the caught phase.
    var catchProgress = 0;
    if (phase === 'leap')   catchProgress = SK.easeInQuad(Math.max(0, (phaseT - 0.6) / 0.4)) * 0.35;
    else if (phase === 'caught') catchProgress = SK.easeOutCubic(SK.clamp(phaseT * 2.5, 0, 1));
    man(D, manX, manY - 32 * sc, sc * 1.6, t, catchProgress);
    woman(D, wx, wy - 32 * sc, sc * 1.55, t, phase, phaseT);

    /* 8. HEARTS — count ramps with u, each has its own bobble ------------ */
    // 1 heart at u=0 → 3 hearts at u=0.5 → 6 hearts at u=1
    var heartCount = Math.floor(SK.lerp(1.0, 6.5, SK.easeOutCubic(u)));
    var centerHX = (manX + caughtX) / 2;
    var centerHY = manY - 0.32 * H;
    // pre-defined slots (relative offsets in sc units) so they're stable
    var slots = [
      [   0, -12,  22],   // central, biggest
      [ -42,   8,  18],   // lower-left
      [  44,   2,  18],   // lower-right
      [ -26, -36,  16],   // upper-left
      [  30, -42,  16],   // upper-right
      [   6, -64,  20]    // top
    ];
    // celebrate intensity ramps once she's caught (u ~0.78 → 0.96)
    var cel = SK.smoothstep(0.78, 0.96, u);
    for (var hi = 0; hi < heartCount && hi < slots.length; hi++) {
      var sl = slots[hi];
      var hx = centerHX + sl[0] * sc;
      var hy = centerHY + sl[1] * sc;
      // fade-in each heart over a short window
      var birthU = (hi / 6) * 0.80;
      var fade = SK.clamp((u - birthU) / 0.10, 0, 1);
      floatHeart(D, hx, hy, sl[2] * sc, t, hi * 1.7, fade, cel);
    }
  }

  return { id: 'run', name: 'into your arms', dur: 9.0, draw: draw };
});
