/* ============================================================================
 * scenes/dating.js — split-screen "first match": man + woman looking at
 * phones, speech bubbles with hearts + exclamation marks appearing.
 * Composition matches sceneRefs/scene3DatingApp.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  // Shared palette ---------------------------------------------------------
  var SKIN     = [238, 208, 178];
  var SKIN_SH  = [205, 168, 138];     // skin shadow (jaw, neck)
  var HAIR_M   = [22, 18, 28];        // man's black hair
  var HAIR_W   = [112, 72, 50];       // woman's brown hair
  var HAIR_W_SH = [82, 52, 36];       // brown hair shadow / inner volume
  var SHIRT_M  = [40, 62, 110];       // navy
  var SHIRT_M_SH = [26, 42, 80];
  var SHIRT_W  = [200, 92, 112];      // rose
  var SHIRT_W_SH = [158, 64, 84];
  var PHONE    = [28, 24, 38];
  var PHONE_LIT = [255, 222, 224];    // warm pink screen glow
  var BUBBLE   = [248, 246, 250];
  var BUBBLE_SH = [216, 210, 224];
  var HEART    = [235, 88, 110];
  var ACCENT_M = [255, 196, 96];      // warm yellow-orange "!" on man's cool side
  var ACCENT_W = [160, 100, 240];     // bright purple "!" on woman's warm side
  var CHEEK    = [232, 132, 138];

  // Decorative geometric shapes drifting on each panel background.
  // Each shape: [xFrac (within half), yFrac, size (W units), kind, phaseSeed]
  var LEFT_DECO = [
    [0.10, 0.18, 0.060, 'tri-up',   1.1],
    [0.78, 0.28, 0.050, 'tri-down', 2.3],
    [0.18, 0.78, 0.045, 'circle',   3.7],
    [0.62, 0.62, 0.038, 'tri-down', 4.2],
    [0.32, 0.10, 0.030, 'circle',   5.0],
    [0.86, 0.85, 0.050, 'tri-up',   6.1]
  ];
  var RIGHT_DECO = [
    [0.22, 0.22, 0.055, 'tri-up',   1.7],
    [0.78, 0.18, 0.045, 'circle',   2.9],
    [0.15, 0.66, 0.040, 'tri-down', 3.4],
    [0.74, 0.78, 0.060, 'tri-up',   4.8],
    [0.50, 0.10, 0.030, 'circle',   5.6],
    [0.86, 0.45, 0.038, 'tri-down', 6.5]
  ];

  function drawDeco(D, W, H, cx0, cy0, cw, ch, items, col, t) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var bob = Math.sin(t * 0.5 + it[4]) * 0.005 * H;
      var x = cx0 + it[0] * cw;
      var y = cy0 + it[1] * ch + bob;
      var s = it[2] * W;
      if (it[3] === 'circle') {
        D.disc(x, y, s * 0.5, col[0], col[1], col[2], 0.55);
      } else if (it[3] === 'tri-up') {
        D.tri(x, y - s * 0.5, x - s * 0.5, y + s * 0.5, x + s * 0.5, y + s * 0.5,
              col[0], col[1], col[2], 0.55);
      } else { // tri-down
        D.tri(x, y + s * 0.5, x - s * 0.5, y - s * 0.5, x + s * 0.5, y - s * 0.5,
              col[0], col[1], col[2], 0.55);
      }
    }
  }

  // Vertical gradient inside an arbitrary rect (x0..x0+w, y0..y0+h).
  function vGradRect(D, x0, y0, w, h, stops, step) {
    step = Math.max(2, step || 4);
    for (var y = 0; y < h; y += step) {
      var f = y / h, i = 0;
      while (i < stops.length - 2 && f > stops[i + 1][0]) i++;
      var a = stops[i], b = stops[i + 1];
      var k = (f - a[0]) / Math.max(1e-6, (b[0] - a[0]));
      k = SK.clamp(k, 0, 1);
      D.rect(x0, y0 + y, w, step + 1,
        SK.lerp(a[1][0], b[1][0], k),
        SK.lerp(a[1][1], b[1][1], k),
        SK.lerp(a[1][2], b[1][2], k), 1);
    }
  }

  // Rounded rect: a main rect + two half-discs on the short ends. Orient
  // either horizontally (default) or vertically (`vert=true`).
  function roundRect(D, x, y, w, h, col, a, vert) {
    a = a == null ? 1 : a;
    if (vert) {
      var r = w * 0.5;
      D.rect(x, y + r, w, h - 2 * r, col[0], col[1], col[2], a);
      D.disc(x + r, y + r, r, col[0], col[1], col[2], a);
      D.disc(x + r, y + h - r, r, col[0], col[1], col[2], a);
    } else {
      var rr = h * 0.5;
      D.rect(x + rr, y, w - 2 * rr, h, col[0], col[1], col[2], a);
      D.disc(x + rr, y + rr, rr, col[0], col[1], col[2], a);
      D.disc(x + w - rr, y + rr, rr, col[0], col[1], col[2], a);
    }
  }

  /* ------------------------------------------------------------------------
   * Speech bubble centred on (cx, cy). `w` is bubble width, `h` is height.
   * Tail points down toward (tailX, tailY). Two-layer (shadow + body) so
   * the bubble keeps a soft edge in the styliser.
   * ----------------------------------------------------------------------*/
  function bubble(D, cx, cy, w, h, tailX, tailY, alpha) {
    // soft drop shadow behind
    roundRect(D, cx - w / 2 + 3, cy - h / 2 + 4, w, h, BUBBLE_SH, 0.45 * alpha);
    // body
    roundRect(D, cx - w / 2, cy - h / 2, w, h, BUBBLE, alpha);
    // tail (triangle from bubble bottom to tail tip)
    var by = cy + h / 2 - 2;
    var dx = tailX - cx;
    // tail base centred at +0.05*w in bubble-relative x, ~w*0.18 wide
    var baseX = cx + (dx > 0 ? w * 0.05 : -w * 0.05);
    D.tri(baseX - w * 0.10, by, baseX + w * 0.10, by, tailX, tailY,
          BUBBLE[0], BUBBLE[1], BUBBLE[2], alpha);
  }

  /* ------------------------------------------------------------------------
   * Big bold exclamation mark, centred on (cx, cy), total height `h`.
   * Drawn as a tall ellipse + dot. Much more legible than the 5x7 font's "!".
   * ----------------------------------------------------------------------*/
  function bang(D, cx, cy, h, col, alpha) {
    var w = h * 0.20;
    // tall body (slight taper via two stacked ellipses)
    D.rect(cx - w * 0.5, cy - h * 0.45,
           w, h * 0.62,
           col[0], col[1], col[2], alpha);
    // rounded top + bottom of the body
    D.disc(cx, cy - h * 0.45, w * 0.5, col[0], col[1], col[2], alpha);
    D.disc(cx, cy + h * 0.17, w * 0.5, col[0], col[1], col[2], alpha);
    // dot
    D.disc(cx, cy + h * 0.40, w * 0.55, col[0], col[1], col[2], alpha);
  }

  /* ------------------------------------------------------------------------
   * Character: shoulder-up portrait. (cx, cy) is the HEAD CENTRE.
   *   - dir: -1 / +1 — which way the face slightly turns
   *   - longHair: true => woman, hair extends past chin to shoulders
   * Drawing order: shirt/shoulders -> back hair -> neck -> head -> top hair
   * -> face features. Each part is a clean silhouette piece.
   * ----------------------------------------------------------------------*/
  function character(D, cx, cy, sc, hairCol, hairShCol, shirtCol, shirtShCol, longHair, dir) {
    var headR = 56 * sc;
    var headY = cy;                       // head centre
    var neckTop = headY + headR * 0.78;   // just below jaw
    var shoulderY = headY + headR * 1.95; // top of shoulder mass (dropped so chin reads)
    var shW = headR * 3.1;                // slim torso (was 4.2 — looked overweight)
    var shH = headR * 3.6;

    // ---- Shoulders / torso (drawn first; head will overlap) --------------
    // Narrow rounded shoulder ellipse (the top of the body)
    D.ellipse(cx, shoulderY + headR * 0.10,
              shW * 0.55, shH * 0.26, 0,
              shirtCol[0], shirtCol[1], shirtCol[2], 1);
    // chest rectangle fills to the bottom of the frame
    D.rect(cx - shW * 0.55, shoulderY, shW * 1.10, shH * 2.5,
           shirtCol[0], shirtCol[1], shirtCol[2], 1);
    // collar V-notch hint (a small darker triangle at the neck base)
    D.tri(cx - headR * 0.26, neckTop + headR * 0.50,
          cx + headR * 0.26, neckTop + headR * 0.50,
          cx, neckTop + headR * 1.20,
          shirtShCol[0], shirtShCol[1], shirtShCol[2], 0.85);

    // ---- Back hair mass (woman only) -- BEHIND head ---------------------
    if (longHair) {
      // Big rounded back-hair shape framing head + extending to shoulders.
      // Two stacked ellipses give it volume without going past the shoulders.
      D.ellipse(cx, headY + headR * 0.10,
                headR * 1.28, headR * 1.30, 0,
                hairCol[0], hairCol[1], hairCol[2], 1);
      // shoulder-length hair tail on one side (asymmetric, more natural)
      D.ellipse(cx + dir * headR * 0.55, headY + headR * 1.05,
                headR * 0.45, headR * 0.95, dir * 0.08,
                hairCol[0], hairCol[1], hairCol[2], 1);
      // other side: a smaller tuft so silhouette stays balanced
      D.ellipse(cx - dir * headR * 0.70, headY + headR * 0.85,
                headR * 0.38, headR * 0.75, -dir * 0.10,
                hairCol[0], hairCol[1], hairCol[2], 1);
    }

    // ---- Neck (skin rect from chin to shoulder top) ----------------------
    D.rect(cx - headR * 0.22, neckTop,
           headR * 0.44, headR * 1.25,
           SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);

    // ---- Head (skin disc) ------------------------------------------------
    D.disc(cx, headY, headR, SKIN[0], SKIN[1], SKIN[2], 1);
    // subtle jaw shading along the chin (very soft)
    D.ellipse(cx, headY + headR * 0.60,
              headR * 0.70, headR * 0.20, 0,
              SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 0.25);

    // ---- Hair (top cap) — sits ON TOP of head ---------------------------
    if (longHair) {
      // Brown half-dome covering top + sides of head, with bangs.
      D.ellipse(cx, headY - headR * 0.40,
                headR * 1.10, headR * 0.75, 0,
                hairCol[0], hairCol[1], hairCol[2], 1);
      // side framing: hair coming down past temples in front of face plane
      D.ellipse(cx - headR * 0.90, headY - headR * 0.15,
                headR * 0.28, headR * 0.60, 0,
                hairCol[0], hairCol[1], hairCol[2], 1);
      D.ellipse(cx + headR * 0.90, headY - headR * 0.15,
                headR * 0.28, headR * 0.60, 0,
                hairCol[0], hairCol[1], hairCol[2], 1);
      // bangs / fringe across upper forehead — angled, sits ABOVE eye line
      D.ellipse(cx - dir * headR * 0.28, headY - headR * 0.32,
                headR * 0.70, headR * 0.28, -dir * 0.20,
                hairShCol[0], hairShCol[1], hairShCol[2], 1);
    } else {
      // Man: short, slightly tousled black hair. Sits higher on head so
      // forehead and eyes read clearly. A swept forelock breaks the dome.
      D.ellipse(cx, headY - headR * 0.42,
                headR * 1.05, headR * 0.65, 0,
                hairCol[0], hairCol[1], hairCol[2], 1);
      // tousled forelock — angled across forehead toward facing side
      D.ellipse(cx + dir * headR * 0.25, headY - headR * 0.40,
                headR * 0.60, headR * 0.30, dir * 0.35,
                hairCol[0], hairCol[1], hairCol[2], 1);
      // a smaller secondary tuft sticking up for texture
      D.ellipse(cx + dir * headR * 0.50, headY - headR * 0.70,
                headR * 0.22, headR * 0.16, dir * 0.6,
                hairCol[0], hairCol[1], hairCol[2], 1);
      // sideburn hints
      D.ellipse(cx - headR * 0.88, headY - headR * 0.15,
                headR * 0.10, headR * 0.22, 0,
                hairCol[0], hairCol[1], hairCol[2], 1);
      D.ellipse(cx + headR * 0.88, headY - headR * 0.15,
                headR * 0.10, headR * 0.22, 0,
                hairCol[0], hairCol[1], hairCol[2], 1);
    }

    // ---- Eyes (small dark dots — open, looking down) -------------------
    var eyeY = headY + headR * 0.10;
    var eyeDx = headR * 0.32;
    D.disc(cx - eyeDx, eyeY, headR * 0.075,
           HAIR_M[0], HAIR_M[1], HAIR_M[2], 1);
    D.disc(cx + eyeDx, eyeY, headR * 0.075,
           HAIR_M[0], HAIR_M[1], HAIR_M[2], 1);
    // eyebrows above eyes (small soft arcs)
    D.ellipse(cx - eyeDx, eyeY - headR * 0.18,
              headR * 0.14, headR * 0.028, 0,
              hairShCol[0], hairShCol[1], hairShCol[2], 1);
    D.ellipse(cx + eyeDx, eyeY - headR * 0.18,
              headR * 0.14, headR * 0.028, 0,
              hairShCol[0], hairShCol[1], hairShCol[2], 1);

    // ---- Cheeks (soft warm tint, low on cheek) --------------------------
    D.disc(cx - headR * 0.55, headY + headR * 0.38,
           headR * 0.13, CHEEK[0], CHEEK[1], CHEEK[2], 0.35);
    D.disc(cx + headR * 0.55, headY + headR * 0.38,
           headR * 0.13, CHEEK[0], CHEEK[1], CHEEK[2], 0.35);

    // ---- Mouth (subtle smile) -------------------------------------------
    D.ellipse(cx, headY + headR * 0.52,
              headR * 0.16, headR * 0.038, 0,
              180, 80, 90, 1);

    // Nose hint — small soft shadow blob below eye line
    D.ellipse(cx, headY + headR * 0.28,
              headR * 0.07, headR * 0.10, 0,
              SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 0.30);
  }

  /* ------------------------------------------------------------------------
   * Phone held in front of the character. Returns the screen centre so the
   * caller knows where the bubble tail should point.
   * ----------------------------------------------------------------------*/
  function phone(D, cx, cy, sc, dir, shimmer) {
    var pw = 36 * sc, ph = 64 * sc;
    var px = cx + dir * 2 * sc;
    var py = cy;
    var ang = -dir * 0.18;            // tilt slightly inward / forward

    // hand silhouette (skin) wrapping the bottom of the phone
    D.ellipse(px - dir * pw * 0.20, py + ph * 0.45,
              pw * 0.55, ph * 0.22, ang,
              SKIN[0], SKIN[1], SKIN[2], 1);
    D.ellipse(px + dir * pw * 0.45, py + ph * 0.42,
              pw * 0.42, ph * 0.18, ang,
              SKIN[0], SKIN[1], SKIN[2], 1);
    // thumb hint
    D.disc(px - dir * pw * 0.35, py + ph * 0.30,
           pw * 0.18, SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 1);

    // phone body (dark rounded rect, drawn rotated by faking rotation via
    // an ellipse for the shadow + rotated rectangle via two triangles is
    // overkill — keep it crisp and axis-aligned, the tilt reads from hand)
    var bx = px - pw / 2, by = py - ph / 2;
    roundRect(D, bx, by, pw, ph, PHONE, 1, true);

    // screen
    var sx = bx + pw * 0.12, sy = by + ph * 0.10;
    var sW = pw * 0.76, sH = ph * 0.80;
    var glowA = 0.85 + 0.15 * Math.sin(shimmer);
    // base lit screen (warm pink) — shimmers slightly on t
    D.rect(sx, sy, sW, sH, PHONE_LIT[0], PHONE_LIT[1], PHONE_LIT[2], glowA);
    // dating-app heart icon centred on the screen
    SK.heart(D, sx + sW / 2, sy + sH * 0.45, sW * 0.55, HEART, 0.9);
    // small UI bar at the top of the screen
    D.rect(sx + sW * 0.20, sy + sH * 0.08,
           sW * 0.60, sH * 0.05,
           HEART[0], HEART[1], HEART[2], 0.7);

    return [px, py - ph * 0.45]; // top of phone (where bubble tail should aim)
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;
    var midX = W * 0.5;

    /* 1. Two background gradients (matches reference: man=cool, woman=warm)*/
    // LEFT (man): cool teal / blue
    vGradRect(D, 0, 0, midX, H, [
      [0,    [158, 178, 218]],
      [0.55, [128, 148, 200]],
      [1,    [ 92, 110, 172]]
    ], Math.round(4 * sc));

    // RIGHT (woman): warm pink / coral
    vGradRect(D, midX, 0, W - midX, H, [
      [0,    [255, 184, 178]],
      [0.55, [240, 140, 148]],
      [1,    [208,  98, 130]]
    ], Math.round(4 * sc));

    /* 2. Decorative drifting shapes on each panel -------------------------*/
    drawDeco(D, W, H, 0,    0, midX, H, LEFT_DECO,  [180, 200, 235], t);
    drawDeco(D, W, H, midX, 0, W - midX, H, RIGHT_DECO, [255, 210, 200], t);

    /* 3. Sharp central divider (a subtle highlight ridge) -----------------*/
    D.rect(midX - 2 * sc, 0, 4 * sc, H, 250, 240, 240, 0.55);
    D.rect(midX - 6 * sc, 0, 4 * sc, H, 30, 20, 40, 0.18);

    /* 4. (no floor shadow — characters extend off-frame) ------------------*/

    /* 5. CHARACTERS -------------------------------------------------------*/
    var charSc = sc * 1.55;
    var headCenterY = H * 0.45;          // place head centre upper-middle
    var headR = 56 * charSc;

    // Man on the LEFT — facing slightly right toward centre (dir=+1)
    var manX = midX * 0.5;
    character(D, manX, headCenterY, charSc, HAIR_M, [10, 8, 18], SHIRT_M, SHIRT_M_SH, false, 1);

    // Woman on the RIGHT — facing slightly left toward centre (dir=-1)
    var womX = midX + (W - midX) * 0.5;
    character(D, womX, headCenterY, charSc, HAIR_W, HAIR_W_SH, SHIRT_W, SHIRT_W_SH, true, -1);

    /* 6. PHONES — held in front of chest, slightly toward centre ----------*/
    var phoneY = headCenterY + headR * 2.30;   // chest level
    var manPhoneTop = phone(D, manX + 44 * sc, phoneY, sc * 1.30,  1, t * 2.4 + 0.7);
    var womPhoneTop = phone(D, womX - 44 * sc, phoneY, sc * 1.30, -1, t * 2.4 + 2.1);

    /* 7. SPEECH BUBBLES — fade in with u, contents pulse on t -------------*/
    function bubbleAlpha(uStart) {
      var k = SK.clamp((u - uStart) / 0.18, 0, 1);
      return SK.easeOutCubic(k);
    }

    var aMan = bubbleAlpha(0.15);
    var aWom = bubbleAlpha(0.35);

    var bubW = 130 * sc, bubH = 80 * sc;

    var bangH = bubH * 0.62;   // exclamation total height

    // Man's bubble: above-right of his head, tail just below the bubble
    if (aMan > 0.02) {
      var mbx = manX + 60 * sc;
      var mby = headCenterY - headR * 1.20;
      // tail tip points down + toward phone (short, just below the bubble)
      var mTailX = mbx + bubW * 0.10;
      var mTailY = mby + bubH * 0.95;
      bubble(D, mbx, mby, bubW, bubH, mTailX, mTailY, aMan);

      var pulseM = 1 + 0.10 * Math.sin(t * 4.0);
      // "!" on the left side of the bubble
      bang(D, mbx - bubW * 0.22, mby + 2 * sc,
           bangH * pulseM, ACCENT_M, aMan);
      // heart on the right side
      SK.heart(D, mbx + bubW * 0.20, mby + 2 * sc,
               bubH * 0.70 * pulseM, HEART, aMan);
    }

    // Woman's bubble: above-left of her head, tail just below the bubble
    if (aWom > 0.02) {
      var wbx = womX - 60 * sc;
      var wby = headCenterY - headR * 1.20;
      var wTailX = wbx - bubW * 0.10;
      var wTailY = wby + bubH * 0.95;
      bubble(D, wbx, wby, bubW, bubH, wTailX, wTailY, aWom);

      var pulseW = 1 + 0.10 * Math.sin(t * 4.0 + 1.7);
      // heart on the left, "!" on the right
      SK.heart(D, wbx - bubW * 0.20, wby + 2 * sc,
               bubH * 0.70 * pulseW, HEART, aWom);
      bang(D, wbx + bubW * 0.22, wby + 2 * sc,
           bangH * pulseW, ACCENT_W, aWom);
    }

    /* 8. Tiny match-spark glow at centre once both bubbles are out --------*/
    var bothA = Math.min(aMan, aWom);
    if (bothA > 0.5) {
      var sparkA = (bothA - 0.5) * 2 * (0.6 + 0.4 * Math.sin(t * 6));
      SK.glow(D, midX, headCenterY - headR * 0.20, 14 * sc, [255, 200, 210],
              { halo: [[3.2, 0.10 * sparkA], [2.0, 0.20 * sparkA]], coreAlpha: 0.55 * sparkA });
    }
  }

  return { id: 'dating', name: 'first match', dur: 10.0, draw: draw };
});
