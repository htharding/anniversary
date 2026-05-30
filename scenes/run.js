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
  function man(D, cx, cy, sc, t) {
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
    D.ellipse(torC[0], torC[1], 18 * sc, 26 * sc, 0,
              SHIRT_M_SH[0], SHIRT_M_SH[1], SHIRT_M_SH[2], 1);
    D.ellipse(torC[0], torC[1] - 2 * sc, 16 * sc, 23 * sc, 0,
              SHIRT_M[0], SHIRT_M[1], SHIRT_M[2], 1);

    // ---- ARMS — OPEN WIDE, extended forward+slightly up -----------------
    // Side view: both arms reach LEFT (toward woman) at slight up/down angles.
    // We draw them as two elongated ellipses (upper arm + forearm).
    var armBob = Math.sin(t * 1.6) * 1.2 * sc;
    // shoulder anchor (his left shoulder, which is the one nearest viewer)
    var sX = cx - 14 * sc;        // forward of body (toward her)
    var sY = cy - 16 * sc;
    // upper arm reaching forward+slightly UP
    var elbX = sX - 24 * sc;
    var elbY = sY - 8 * sc - armBob * 0.4;
    var handX = elbX - 26 * sc;
    var handY = elbY - 14 * sc + armBob;
    // upper arm (shirt sleeve)
    var midUx = (sX + elbX) / 2, midUy = (sY + elbY) / 2;
    var ang1 = Math.atan2(elbY - sY, elbX - sX);
    var len1 = Math.hypot(elbX - sX, elbY - sY);
    D.ellipse(midUx, midUy, len1 / 2 + 3 * sc, 5 * sc, ang1,
              SHIRT_M[0], SHIRT_M[1], SHIRT_M[2], 1);
    // forearm (skin) — sleeves stop at elbow
    var midFx = (elbX + handX) / 2, midFy = (elbY + handY) / 2;
    var ang2 = Math.atan2(handY - elbY, handX - elbX);
    var len2 = Math.hypot(handX - elbX, handY - elbY);
    D.ellipse(midFx, midFy, len2 / 2 + 2.5 * sc, 4 * sc, ang2,
              SKIN[0], SKIN[1], SKIN[2], 1);
    // hand
    D.disc(handX, handY, 4.5 * sc, SKIN[0], SKIN[1], SKIN[2], 1);

    // far arm — also extended out (behind, slightly higher to read both arms)
    var sX2 = cx - 6 * sc;
    var sY2 = cy - 18 * sc;
    var elb2X = sX2 - 22 * sc;
    var elb2Y = sY2 - 16 * sc + armBob * 0.4;
    var hand2X = elb2X - 22 * sc;
    var hand2Y = elb2Y - 18 * sc - armBob;
    var midUx2 = (sX2 + elb2X) / 2, midUy2 = (sY2 + elb2Y) / 2;
    var angU2 = Math.atan2(elb2Y - sY2, elb2X - sX2);
    var lenU2 = Math.hypot(elb2X - sX2, elb2Y - sY2);
    D.ellipse(midUx2, midUy2, lenU2 / 2 + 3 * sc, 4.5 * sc, angU2,
              SHIRT_M_SH[0], SHIRT_M_SH[1], SHIRT_M_SH[2], 1);
    var midFx2 = (elb2X + hand2X) / 2, midFy2 = (elb2Y + hand2Y) / 2;
    var angF2 = Math.atan2(hand2Y - elb2Y, hand2X - elb2X);
    var lenF2 = Math.hypot(hand2X - elb2X, hand2Y - elb2Y);
    D.ellipse(midFx2, midFy2, lenF2 / 2 + 2.5 * sc, 3.5 * sc, angF2,
              SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);
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
    var stride = Math.sin(t * 7) * 0.8;   // running cadence

    // ---- LEGS ------------------------------------------------------------
    if (phase === 'run') {
      // alternating stride: one leg forward, one back
      var s = stride;
      // back leg
      var bk1 = P(-2, 18), bk2 = P(-10 - s * 4, 56), bk3 = P(-4 - s * 4, 56), bk4 = P(2, 18);
      D.tri(bk1[0], bk1[1], bk2[0], bk2[1], bk3[0], bk3[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      D.tri(bk1[0], bk1[1], bk3[0], bk3[1], bk4[0], bk4[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      // front leg
      var fr1 = P(2, 18), fr2 = P(10 + s * 4, 56), fr3 = P(16 + s * 4, 56), fr4 = P(8, 18);
      D.tri(fr1[0], fr1[1], fr2[0], fr2[1], fr3[0], fr3[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      D.tri(fr1[0], fr1[1], fr3[0], fr3[1], fr4[0], fr4[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      // shoes
      D.ellipse(cx + (-7 - s * 4) * sc, cy + 58 * sc, 6 * sc, 3 * sc, 0, 22, 18, 28, 1);
      D.ellipse(cx + (13 + s * 4) * sc, cy + 58 * sc, 6 * sc, 3 * sc, 0, 22, 18, 28, 1);
    } else if (phase === 'leap') {
      // legs tucked back (leaping forward), trailing
      var legAng = SK.lerp(0.0, -0.5, phaseT); // slowly tuck
      var Pleg = SK.pen(cx, cy, legAng, sc, 1);
      var bk1 = Pleg(-3, 18), bk2 = Pleg(-14, 50), bk3 = Pleg(-8, 50), bk4 = Pleg(2, 18);
      D.tri(bk1[0], bk1[1], bk2[0], bk2[1], bk3[0], bk3[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      D.tri(bk1[0], bk1[1], bk3[0], bk3[1], bk4[0], bk4[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      var fr1 = Pleg(2, 18), fr2 = Pleg(-8, 52), fr3 = Pleg(-2, 52), fr4 = Pleg(8, 18);
      D.tri(fr1[0], fr1[1], fr2[0], fr2[1], fr3[0], fr3[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      D.tri(fr1[0], fr1[1], fr3[0], fr3[1], fr4[0], fr4[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      // shoes
      var shA = Pleg(-11, 52), shB = Pleg(-5, 52);
      D.disc(shA[0], shA[1], 3.5 * sc, 22, 18, 28, 1);
      D.disc(shB[0], shB[1], 3.5 * sc, 22, 18, 28, 1);
    } else { // caught
      // legs together, bent slightly, dangling
      var bk1 = P(-2, 18), bk2 = P(-4, 48), bk3 = P(3, 48), bk4 = P(2, 18);
      D.tri(bk1[0], bk1[1], bk2[0], bk2[1], bk3[0], bk3[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      D.tri(bk1[0], bk1[1], bk3[0], bk3[1], bk4[0], bk4[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      var fr1 = P(2, 18), fr2 = P(0, 50), fr3 = P(7, 50), fr4 = P(8, 18);
      D.tri(fr1[0], fr1[1], fr2[0], fr2[1], fr3[0], fr3[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      D.tri(fr1[0], fr1[1], fr3[0], fr3[1], fr4[0], fr4[1],
            PANTS_W[0], PANTS_W[1], PANTS_W[2], 1);
      D.disc(cx - 1 * sc, cy + 52 * sc, 3.5 * sc, 22, 18, 28, 1);
      D.disc(cx + 4 * sc, cy + 52 * sc, 3.5 * sc, 22, 18, 28, 1);
    }

    // ---- TORSO (rose shirt) ---------------------------------------------
    var leanAng = (phase === 'run') ? -0.18
                : (phase === 'leap') ? -0.45 - phaseT * 0.08
                : -0.10;
    var Pt = SK.pen(cx, cy, leanAng, sc, 1);
    // shadow underlay
    var tShCx = Pt(0, 0);
    D.ellipse(tShCx[0], tShCx[1], 16 * sc, 24 * sc, leanAng,
              SHIRT_W_SH[0], SHIRT_W_SH[1], SHIRT_W_SH[2], 1);
    D.ellipse(tShCx[0], tShCx[1] - 2 * sc, 14 * sc, 21 * sc, leanAng,
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

  // Helper: an arm segment (elongated ellipse) from (x1,y1) to (x2,y2).
  function drawArmSeg(D, x1, y1, x2, y2, sc, col) {
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var len = Math.hypot(x2 - x1, y2 - y1);
    D.ellipse(mx, my, len / 2 + 2 * sc, 3.5 * sc, ang,
              col[0], col[1], col[2], 1);
  }

  /* ---- floating heart with bobble -------------------------------------- */
  function floatHeart(D, x, y, size, t, phase, alpha) {
    var bob = Math.sin(t * 1.3 + phase) * size * 0.15;
    var drift = Math.cos(t * 0.8 + phase) * size * 0.10;
    // subtle pulse
    var pulse = 1 + 0.08 * Math.sin(t * 2.5 + phase);
    SK.heart(D, x + drift, y + bob, size * pulse, HEART, alpha);
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
     * 0.00–0.45 RUN  : x from 0.12W → 0.40W; y on ground
     * 0.45–0.75 LEAP : parabolic arc; x → 0.60W; meets man's open arms
     * 0.75–1.00 CAUGHT: in his embrace, near man, slightly elevated
     * ------------------------------------------------------------------ */
    var wx, wy, phase, phaseT;
    var leapHeight = 0.18 * H;

    var manX = 0.72 * W;
    var manY = groundY;

    // catch position: she's against his torso, slightly elevated
    // x slightly left of him so her head sits beside his (not eclipsing it)
    var caughtX = manX - 44 * sc;
    var caughtY = manY - 0.05 * H;

    if (u < 0.45) {
      phaseT = u / 0.45;
      wx = SK.lerp(0.12, 0.40, phaseT) * W;
      wy = manY;
      phase = 'run';
    } else if (u < 0.75) {
      phaseT = (u - 0.45) / 0.30;
      // x continues toward man with eased out (initial burst), then ease into catch
      var xT = SK.easeOutQuad(phaseT * 0.6) + SK.easeInQuad(Math.max(0, phaseT - 0.6) / 0.4) * 0.4;
      // simpler/cleaner: blend lerp with easeInOutCubic
      xT = SK.easeInOutCubic(phaseT);
      wx = SK.lerp(0.40 * W, caughtX, xT);
      // parabolic arc: y dips up
      wy = manY - leapHeight * Math.sin(phaseT * Math.PI);
      phase = 'leap';
    } else {
      phaseT = (u - 0.75) / 0.25;
      wx = caughtX;
      // tiny settling bob into his arms
      var settle = (1 - SK.easeOutCubic(SK.clamp(phaseT * 2, 0, 1))) * 0.012 * H;
      wy = caughtY + settle + Math.sin(t * 1.8) * 0.005 * H;
      phase = 'caught';
    }

    /* 7. Draw MAN first (he's behind/anchoring), then WOMAN on top ------- */
    // Actually: when she's "caught", she should appear in front of him slightly,
    // but his open arms wrap around her. Draw man first, then woman.
    man(D, manX, manY - 32 * sc, sc * 1.6, t);
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
    for (var hi = 0; hi < heartCount && hi < slots.length; hi++) {
      var sl = slots[hi];
      var hx = centerHX + sl[0] * sc;
      var hy = centerHY + sl[1] * sc;
      // fade-in each heart over a short window
      var birthU = (hi / 6) * 0.80;
      var fade = SK.clamp((u - birthU) / 0.10, 0, 1);
      floatHeart(D, hx, hy, sl[2] * sc, t, hi * 1.7, fade);
    }
  }

  return { id: 'run', name: 'into your arms', dur: 9.0, draw: draw };
});
