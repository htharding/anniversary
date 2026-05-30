/* ============================================================================
 * scenes/love-me.js — top-down view of couple in bed; speech bubble over the
 * MAN (right side) reads "THIS IS WHAT LOVE MEANS TO ME."
 *
 * Paired companion to scenes/love-her.js — both share the SAME bed composition
 * (sides, colors, dimensions). Convention: woman on the LEFT, man on the RIGHT.
 * Composition matches sceneRefs/scene11ThisIsWhatLoveMeansToMe.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  /* ---- shared palette (must match love-her.js exactly) -------------------*/
  var BLANKET    = [110, 95, 145];    // muted dusty purple
  var BLANKET_SH = [ 95, 80, 130];    // slightly darker for body mounds
  var BLANKET_HI = [128, 112, 165];   // slightly brighter rim
  var PILLOW     = [235, 220, 200];   // warm cream
  var PILLOW_SH  = [205, 188, 168];   // pillow shadow / crease
  var FLOOR      = [ 78, 56, 42];     // warm brown wood
  var FLOOR_HI   = [ 96, 70, 52];     // wood plank highlight
  var FLOOR_LO   = [ 60, 42, 30];     // wood plank shadow
  var FRAME      = [ 52, 38, 64];     // dark bed-frame outline
  var HEADBOARD  = [ 88, 62, 48];     // wooden headboard (warm brown)
  var SKIN       = [238, 208, 178];
  var SKIN_SH    = [205, 175, 145];   // skin shadow for arms/shoulders
  var MAN_HAIR   = [ 22, 18,  28];    // black
  var WOMAN_HAIR = [112, 72,  50];    // brown, shoulder-length
  var MAN_SHIRT  = [142, 50,  58];    // man's sleep shirt (warm wine red)
  var WOMAN_TOP  = [ 76, 56, 110];    // woman's sleep top (deep violet)

  // Rounded-rect helper built from primitives: a fat rect + four corner discs
  // (so the corners read soft through the styliser).
  function roundRect(D, x, y, w, h, r, col, a) {
    a = a == null ? 1 : a;
    if (r * 2 > w) r = w / 2;
    if (r * 2 > h) r = h / 2;
    // center cross
    D.rect(x + r, y,         w - 2 * r, h,         col[0], col[1], col[2], a);
    D.rect(x,     y + r,     w,         h - 2 * r, col[0], col[1], col[2], a);
    // corner discs
    D.disc(x + r,         y + r,         r, col[0], col[1], col[2], a);
    D.disc(x + w - r,     y + r,         r, col[0], col[1], col[2], a);
    D.disc(x + r,         y + h - r,     r, col[0], col[1], col[2], a);
    D.disc(x + w - r,     y + h - r,     r, col[0], col[1], col[2], a);
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;

    /* 1. FLOOR (warm brown wood, base layer) ------------------------------*/
    D.bg(FLOOR[0], FLOOR[1], FLOOR[2]);

    // wood plank grain: long horizontal bands of subtly varied browns
    var plankH = 0.055 * H;
    for (var p = 0; p < H; p += plankH) {
      var hi = (Math.floor(p / plankH) % 2 === 0);
      var pc = hi ? FLOOR_HI : FLOOR_LO;
      D.rect(0, p, W, plankH * 0.92, pc[0], pc[1], pc[2], 0.35);
      D.rect(0, p + plankH * 0.92, W, plankH * 0.08, FLOOR_LO[0], FLOOR_LO[1], FLOOR_LO[2], 0.55);
    }

    /* 2. BED FRAME (outer dark rect under the bedding) --------------------*/
    var bedX = 0.15 * W, bedY = 0.10 * H;
    var bedW = 0.70 * W, bedH = 0.82 * H;
    var pad = 0.012 * W;
    roundRect(D, bedX - pad, bedY - pad, bedW + 2 * pad, bedH + 2 * pad, 0.018 * W, FRAME, 1);

    /* 3. HEADBOARD strip across the top of the bed ------------------------*/
    roundRect(D, bedX - pad * 0.6, bedY - pad * 0.6, bedW + pad * 1.2, 0.038 * H, 0.010 * W, HEADBOARD, 1);

    /* 4. MATTRESS / SHEET base (lighter cream-ish under the blanket) -----*
     * Above the blanket line we want to see the sheet behind the figures. */
    var bX = bedX, bY = bedY + 0.020 * H, bW = bedW, bH = bedH - 0.020 * H;
    // sheet base for top portion (where bodies/pillows sit)
    var sheetCol = [218, 200, 178];
    roundRect(D, bX, bY, bW, bH * 0.45, 0.012 * W, sheetCol, 1);

    /* 5. PILLOWS — side-by-side cream rounded rects at the top of the bed */
    var pilGap   = 0.014 * W;
    var pilW     = (bW - 3 * pilGap) / 2;
    var pilH     = 0.13 * H;
    var pilY     = bY + 0.012 * H;

    // woman's pillow (LEFT)
    var pilLx = bX + pilGap;
    roundRect(D, pilLx, pilY, pilW, pilH, 0.022 * W, PILLOW, 1);
    D.rect(pilLx + pilW * 0.08, pilY + pilH * 0.78, pilW * 0.84, pilH * 0.08, PILLOW_SH[0], PILLOW_SH[1], PILLOW_SH[2], 0.35);

    // man's pillow (RIGHT)
    var pilRx = bX + 2 * pilGap + pilW;
    roundRect(D, pilRx, pilY, pilW, pilH, 0.022 * W, PILLOW, 1);
    D.rect(pilRx + pilW * 0.08, pilY + pilH * 0.78, pilW * 0.84, pilH * 0.08, PILLOW_SH[0], PILLOW_SH[1], PILLOW_SH[2], 0.35);

    /* 6. HEADS on pillows ------------------------------------------------*/
    var headR  = pilH * 0.36;
    var headY  = pilY + pilH * 0.48;
    var headLX = pilLx + pilW * 0.50;
    var headRX = pilRx + pilW * 0.50;

    // ---- WOMAN (LEFT): brown shoulder-length hair behind, skin head ----
    // Big brown hair halo behind & below the head
    D.ellipse(headLX, headY + headR * 0.18, headR * 1.45, headR * 1.32, 0, WOMAN_HAIR[0], WOMAN_HAIR[1], WOMAN_HAIR[2], 1);
    // shoulder-length strand lobes
    D.ellipse(headLX - headR * 0.60, headY + headR * 0.90, headR * 0.55, headR * 0.95, 0.25, WOMAN_HAIR[0], WOMAN_HAIR[1], WOMAN_HAIR[2], 1);
    D.ellipse(headLX + headR * 0.60, headY + headR * 0.90, headR * 0.55, headR * 0.95, -0.25, WOMAN_HAIR[0], WOMAN_HAIR[1], WOMAN_HAIR[2], 1);
    // skin face disc
    D.disc(headLX, headY, headR, SKIN[0], SKIN[1], SKIN[2], 1);
    // hair fringe/bangs across the top of the head
    D.ellipse(headLX, headY - headR * 0.45, headR * 0.95, headR * 0.50, 0, WOMAN_HAIR[0], WOMAN_HAIR[1], WOMAN_HAIR[2], 1);
    // closed eye dashes (below the bangs)
    D.rect(headLX - headR * 0.50, headY + headR * 0.08, headR * 0.30, headR * 0.06, MAN_HAIR[0], MAN_HAIR[1], MAN_HAIR[2], 0.7);
    D.rect(headLX + headR * 0.20, headY + headR * 0.08, headR * 0.30, headR * 0.06, MAN_HAIR[0], MAN_HAIR[1], MAN_HAIR[2], 0.7);
    // subtle mouth hint
    D.rect(headLX - headR * 0.18, headY + headR * 0.50, headR * 0.36, headR * 0.04, 150, 90, 95, 0.5);

    // ---- MAN (RIGHT): skin then black short-cap hair on top ----
    // Top-down view: hair is a thin cap on the upper portion of the head; the
    // bulk of the disc should remain skin so the face reads as a face.
    D.disc(headRX, headY, headR, SKIN[0], SKIN[1], SKIN[2], 1);
    // short black hair cap: covers top ~55% of the head from the forehead up
    D.ellipse(headRX, headY - headR * 0.35, headR * 0.97, headR * 0.70, 0, MAN_HAIR[0], MAN_HAIR[1], MAN_HAIR[2], 1);
    // closed eye dashes (eyes ~30% down from center, below hair line)
    D.rect(headRX - headR * 0.50, headY + headR * 0.08, headR * 0.30, headR * 0.06, MAN_HAIR[0], MAN_HAIR[1], MAN_HAIR[2], 0.7);
    D.rect(headRX + headR * 0.20, headY + headR * 0.08, headR * 0.30, headR * 0.06, MAN_HAIR[0], MAN_HAIR[1], MAN_HAIR[2], 0.7);
    // subtle mouth hint
    D.rect(headRX - headR * 0.18, headY + headR * 0.50, headR * 0.36, headR * 0.04, 120, 70, 70, 0.5);

    /* 7. SHOULDERS / TORSO above blanket line ----------------------------*
     * Each person has shoulders/upper torso visible between head and blanket. */
    var torsoTopY = pilY + pilH + 0.005 * H;
    var blanketTopY = pilY + pilH + 0.075 * H;  // blanket starts here

    // -- WOMAN's shoulders (deep violet sleep top, slightly tucked toward man)
    var wShCx = headLX + 0.010 * W;  // shifted slightly toward man (right)
    roundRect(D, wShCx - pilW * 0.42, torsoTopY, pilW * 0.78, blanketTopY - torsoTopY + 0.010 * H,
              0.020 * W, WOMAN_TOP, 1);
    // visible bare upper arm draped across the man (from her right shoulder)
    var armSx = wShCx + pilW * 0.30, armSy = torsoTopY + 0.012 * H;
    var armEx = headRX - headR * 0.10, armEy = torsoTopY + 0.045 * H;
    // arm as an elongated ellipse oriented along the line
    var armDx = armEx - armSx, armDy = armEy - armSy;
    var armAng = Math.atan2(armDy, armDx);
    var armLen = Math.sqrt(armDx * armDx + armDy * armDy);
    D.ellipse((armSx + armEx) / 2, (armSy + armEy) / 2,
              armLen * 0.55, 0.014 * H, armAng, SKIN[0], SKIN[1], SKIN[2], 1);
    // hand (small disc) at man's shoulder
    D.disc(armEx, armEy, 0.016 * W, SKIN[0], SKIN[1], SKIN[2], 1);

    // -- MAN's shoulders (warm wine-red sleep shirt)
    var mShCx = headRX - 0.005 * W;
    roundRect(D, mShCx - pilW * 0.42, torsoTopY, pilW * 0.78, blanketTopY - torsoTopY + 0.010 * H,
              0.020 * W, MAN_SHIRT, 1);
    // shirt shadow under woman's arm
    D.ellipse((armEx + 0.005 * W), armEy + 0.005 * H,
              0.030 * W, 0.012 * H, armAng, MAN_HAIR[0], MAN_HAIR[1], MAN_HAIR[2], 0.25);

    /* 8. BLANKET (dusty purple) — covers from blanketTopY down to bed foot */
    var blankH = (bY + bH) - blanketTopY;
    // main blanket body
    roundRect(D, bX, blanketTopY, bW, blankH, 0.014 * W, BLANKET, 1);
    // blanket top hem: a thin highlight stripe at the top
    D.rect(bX + 0.006 * W, blanketTopY, bW - 0.012 * W, 0.010 * H, BLANKET_HI[0], BLANKET_HI[1], BLANKET_HI[2], 0.85);
    // shadow line just below the hem (subtle fold)
    D.rect(bX + 0.006 * W, blanketTopY + 0.012 * H, bW - 0.012 * W, 0.004 * H, BLANKET_SH[0], BLANKET_SH[1], BLANKET_SH[2], 0.50);

    /* 9. BODY MOUNDS under the blanket (subtle elongated ellipses) --------*
     * Slow breathing motion: tiny y-displacement on t.                     */
    var breathL = Math.sin(t * 0.8) * 1.5 * sc;
    var breathR = Math.sin(t * 0.8 + 0.6) * 1.5 * sc;

    var moundTop = blanketTopY + 0.025 * H;
    var moundBot = bY + bH - 0.025 * H;
    var moundH   = moundBot - moundTop;

    // woman's mound (LEFT)
    var moundLcx = pilLx + pilW * 0.52;
    var moundLcy = moundTop + moundH * 0.50 + breathL;
    D.ellipse(moundLcx, moundLcy, pilW * 0.40, moundH * 0.46, 0, BLANKET_SH[0], BLANKET_SH[1], BLANKET_SH[2], 0.85);
    D.ellipse(moundLcx, moundLcy - moundH * 0.08, pilW * 0.22, moundH * 0.28, 0, BLANKET_HI[0], BLANKET_HI[1], BLANKET_HI[2], 0.30);

    // man's mound (RIGHT)
    var moundRcx = pilRx + pilW * 0.48;
    var moundRcy = moundTop + moundH * 0.50 + breathR;
    D.ellipse(moundRcx, moundRcy, pilW * 0.42, moundH * 0.48, 0, BLANKET_SH[0], BLANKET_SH[1], BLANKET_SH[2], 0.85);
    D.ellipse(moundRcx, moundRcy - moundH * 0.08, pilW * 0.24, moundH * 0.28, 0, BLANKET_HI[0], BLANKET_HI[1], BLANKET_HI[2], 0.30);

    /* 10. SPEECH BUBBLE above the MAN (right side, in the top-right floor
     *    area OFF the bed so it doesn't cover the head) -------------------*
     * Fade-in over u ∈ [0.05, 0.35], hold full, gentle fade-out near end.  */
    var bAlpha = SK.smoothstep(0.05, 0.35, u);
    if (u > 0.92) bAlpha *= 1 - SK.smoothstep(0.92, 1.0, u);

    if (bAlpha > 0.01) {
      var L1 = 'THIS IS WHAT';
      var L2 = 'LOVE MEANS';
      var L3 = 'TO ME.';
      var px = 4 * sc;            // 5x7 font pixel size in buffer px
      var lineGap = 2 * px;
      var rowH = 7 * px;

      var widest = Math.max(SK.textWidth(L1, px), SK.textWidth(L2, px), SK.textWidth(L3, px));
      var padX = 12 * sc;
      var padY = 10 * sc;
      var bubW = widest + 2 * padX;
      var bubH = 3 * rowH + 2 * lineGap + 2 * padY;

      // Place bubble in the upper-LEFT area (off the bed, on the floor)
      // — this mirrors the reference image's bubble placement (top-left
      // corner pointing down toward a head). For the MAN scene, the bubble
      // is to the LEFT of the bed pointing right-down toward the man's head
      // (man is on the right side of the bed). This keeps the heads visible
      // and reads as "his thoughts" with the tail crossing the bed toward
      // his head.
      //
      // Actually: the man is on the RIGHT, so a bubble in the top-LEFT would
      // require a long tail across the whole bed. Better: place the bubble
      // in the top-RIGHT floor area, just above-right of the bed frame, with
      // a tail pointing down-left toward the man's head.
      //
      // The bed footprint is [0.15W, 0.85W]. Floor area to the right of the
      // bed is [0.85W, 1.00W] — only 0.15W wide, too narrow for the bubble.
      // So we place the bubble in the top-LEFT floor area (above the bed,
      // outside the bed frame on the left), and have its tail point DOWN-
      // RIGHT to the man's head across the headboard. That matches the
      // reference's bubble-in-top-left composition.

      // Top-left floor area: between [0, 0.15W] horizontally and [0, 0.10H]
      // vertically — also too small. Solution: place the bubble overlapping
      // the top-left CORNER of the frame (partially over floor, partially
      // over the headboard area above the woman's pillow) — this matches
      // the reference exactly where the bubble sits above the man's head.
      //
      // Wait — in the reference, the man is on the LEFT and the bubble is
      // top-left over him. In OUR scene with man on the RIGHT, the bubble
      // should be top-RIGHT over him. So: place bubble in top-RIGHT area,
      // overlapping the corner and pointing down-left to the man's head.

      var bubX = W - bubW - 0.02 * W;        // right-aligned, small margin
      var bubY = 0.018 * H;                  // small top margin
      // Make sure bubble doesn't go off the right edge
      if (bubX + bubW > W - 0.012 * W) bubX = W - 0.012 * W - bubW;
      if (bubX < 0.012 * W) bubX = 0.012 * W;
      var bubR = Math.min(bubH * 0.30, bubW * 0.18);

      // soft shadow underneath
      roundRect(D, bubX + 2 * sc, bubY + 3 * sc, bubW, bubH, bubR, [20, 14, 28], 0.35 * bAlpha);
      // white body
      roundRect(D, bubX, bubY, bubW, bubH, bubR, [250, 247, 243], bAlpha);

      // Tail: from bottom of bubble down toward man's head.
      var tailTipX = headRX + headR * 0.20;
      var tailTipY = headY - headR * 1.05;
      var tailBaseY = bubY + bubH - 1;
      var tailBaseCx = SK.clamp(tailTipX + 0.030 * W, bubX + bubR + 6 * sc, bubX + bubW - bubR - 6 * sc);
      var tailHalfW = 9 * sc;
      // shadow
      D.tri(tailBaseCx - tailHalfW + 2 * sc, tailBaseY + 3 * sc,
            tailBaseCx + tailHalfW + 2 * sc, tailBaseY + 3 * sc,
            tailTipX + 2 * sc, tailTipY + 3 * sc,
            20, 14, 28, 0.35 * bAlpha);
      // white tail
      D.tri(tailBaseCx - tailHalfW, tailBaseY,
            tailBaseCx + tailHalfW, tailBaseY,
            tailTipX, tailTipY,
            250, 247, 243, bAlpha);

      // TEXT: three centered lines, dark color.
      var textCol = [40, 30, 50];
      var textY0 = bubY + padY;
      var bubCxFinal = bubX + bubW / 2;

      var lines = [L1, L2, L3];
      for (var li = 0; li < lines.length; li++) {
        var lw = SK.textWidth(lines[li], px);
        var tx = Math.round(bubCxFinal - lw / 2);
        var ty = Math.round(textY0 + li * (rowH + lineGap));
        SK.text(D, tx, ty, lines[li], px, textCol, bAlpha);
      }
    }
  }

  return { id: 'love-me', name: 'this is what love means to me', dur: 9.0, draw: draw };
});
