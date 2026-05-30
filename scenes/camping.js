/* ============================================================================
 * scenes/camping.js — couple + two dogs around a flickering campfire at night.
 * Composition matches sceneRefs/scene8Camping.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  // ---- shared palette ------------------------------------------------------
  var SKIN     = [238, 208, 178];
  var HAIR_M   = [22, 18, 28];
  var SHIRT_M  = [40, 62, 110];
  var HAIR_W   = [112, 72, 50];
  var SHIRT_W  = [200, 92, 112];
  var DOG_BLK  = [36, 32, 44];
  var DOG_BRN  = [124, 78, 52];
  var HEART    = [235, 88, 110];
  var TREE_DK  = [14, 18, 30];
  var TREE_MD  = [18, 22, 38];
  var TENT     = [30, 40, 75];
  var TENT_DK  = [18, 24, 50];
  var GROUND   = [18, 14, 22];
  var GROUND_W = [38, 28, 30];           // warmer ground tint inside fire pool
  var RIM      = [255, 150, 80];         // rim-light on figures facing fire

  // ---- conifer tree silhouette (stack of overlapping triangles) -----------
  function conifer(D, cx, baseY, hgt, wid, col) {
    // trunk hint
    D.rect(cx - wid * 0.06, baseY - hgt * 0.08, wid * 0.12, hgt * 0.10,
           col[0] * 0.7, col[1] * 0.7, col[2] * 0.7, 1);
    // 4 stacked triangles, widening toward the base, overlapping ~40%
    var layers = 4;
    for (var i = 0; i < layers; i++) {
      var f = i / (layers - 1);
      var w = wid * (0.55 + f * 0.55);
      var top = baseY - hgt * (1 - f * 0.66);
      var bot = top + hgt * (0.40 + f * 0.04);
      D.tri(cx - w * 0.5, bot, cx + w * 0.5, bot, cx, top,
            col[0], col[1], col[2], 1);
    }
  }

  // ---- seated person silhouette facing LEFT (toward fire on left) ----------
  // x,y is the seat (hip) center; sc is buffer scale.
  // hair, shirt colors passed in. dir=-1 means facing left.
  function seatedPerson(D, x, y, sc, hair, shirt, dir) {
    var s = sc;
    // legs (folded, knees forward toward fire = toward -dir? side facing fire)
    // facing dir: positive dir = facing right; negative = facing left.
    var fwd = dir; // +1 = right
    // lower legs (folded, two short rect/ellipses pointing toward fire)
    D.ellipse(x + fwd * 8 * s, y + 14 * s, 14 * s, 5 * s, 0,
              shirt[0] * 0.6, shirt[1] * 0.6, shirt[2] * 0.6, 1);
    // shoe
    D.ellipse(x + fwd * 18 * s, y + 16 * s, 5 * s, 3 * s, 0, HAIR_M[0], HAIR_M[1], HAIR_M[2], 1);
    // torso (slightly leaning toward fire)
    var lean = fwd * 0.18;
    D.ellipse(x - fwd * 3 * s, y - 8 * s, 11 * s, 16 * s, lean,
              shirt[0], shirt[1], shirt[2], 1);
    // arm hugging knees / extended toward fire
    D.ellipse(x + fwd * 3 * s, y - 2 * s, 11 * s, 4 * s, fwd * 0.45,
              shirt[0] * 0.8, shirt[1] * 0.8, shirt[2] * 0.8, 1);
    // hand
    D.disc(x + fwd * 9 * s, y + 3 * s, 2.4 * s, SKIN[0], SKIN[1], SKIN[2], 1);
    // neck
    D.rect(x - fwd * 5 * s - 1.5 * s, y - 21 * s, 3 * s, 4 * s,
           SKIN[0] * 0.85, SKIN[1] * 0.85, SKIN[2] * 0.85, 1);
    // head
    var hx = x - fwd * 5 * s, hy = y - 27 * s;
    D.disc(hx, hy, 7 * s, SKIN[0], SKIN[1], SKIN[2], 1);
    // hair (top cap)
    D.disc(hx, hy - 2 * s, 7.2 * s, hair[0], hair[1], hair[2], 1);
    // hair clip back-of-head box (covers ear opposite fire)
    D.rect(hx - 7 * s, hy - 4 * s, 7 * s, 8 * s, hair[0], hair[1], hair[2], 1);
    // rim light on fire-facing side (warm thin arc)
    // Fire is on -fwd side (figure faces fire), so light edge on -fwd side of body.
    var rimX = x - fwd * 9 * s;
    D.ellipse(rimX, y - 8 * s, 2.2 * s, 14 * s, lean, RIM[0], RIM[1], RIM[2], 0.85);
    // shoulder catch
    D.disc(x - fwd * 8 * s, y - 18 * s, 3 * s, RIM[0], RIM[1], RIM[2], 0.7);
    // rim light on head fire-side (cheek/nose catch)
    D.ellipse(hx - fwd * 6 * s, hy + 1 * s, 1.6 * s, 5 * s, 0, RIM[0], RIM[1], RIM[2], 0.85);
    D.disc(hx - fwd * 6 * s, hy - 3 * s, 1.8 * s, RIM[0], RIM[1], RIM[2], 0.7);
    // hand catches firelight
    D.disc(x + fwd * 9 * s, y + 3 * s, 2.0 * s, RIM[0], RIM[1], RIM[2], 0.8);
  }

  // Variant: a leaning standing-ish silhouette (the second figure in ref image
  // appears to stand/lean over). Not used; we use seated for both.

  // ---- dog silhouettes -----------------------------------------------------
  // Larger, blockier silhouette that survives against warm ground pool.
  function dog(D, x, y, sc, col, perky, dir) {
    var s = sc, fwd = dir;
    // body ellipse (chunky)
    D.ellipse(x, y, 16 * s, 9 * s, 0, col[0], col[1], col[2], 1);
    // chest (front bulge)
    D.disc(x + fwd * 10 * s, y + 1 * s, 6 * s, col[0], col[1], col[2], 1);
    // haunch (back leg fold)
    D.disc(x - fwd * 11 * s, y + 2 * s, 7 * s, col[0], col[1], col[2], 1);
    // front legs (two short rect, slightly offset)
    D.rect(x + fwd * 8 * s, y + 4 * s, 3.0 * s, 10 * s, col[0], col[1], col[2], 1);
    D.rect(x + fwd * 5 * s, y + 4 * s, 3.0 * s, 10 * s, col[0], col[1], col[2], 1);
    // head
    var hx = x + fwd * 14 * s, hy = y - 5 * s;
    D.disc(hx, hy, 6 * s, col[0], col[1], col[2], 1);
    // snout
    D.ellipse(hx + fwd * 5 * s, hy + 2 * s, 4 * s, 3 * s, 0, col[0], col[1], col[2], 1);
    // ears
    if (perky) {
      // black dog: perky triangle ears (two pointing up)
      D.tri(hx - fwd * 2 * s, hy - 4 * s, hx + fwd * 3 * s, hy - 4 * s,
            hx + fwd * 0.5 * s, hy - 11 * s, col[0], col[1], col[2], 1);
      D.tri(hx + fwd * 1 * s, hy - 4 * s, hx + fwd * 5 * s, hy - 4 * s,
            hx + fwd * 4 * s, hy - 10 * s, col[0], col[1], col[2], 1);
    } else {
      // brown dog: floppy ears (downward ellipse)
      D.ellipse(hx - fwd * 1 * s, hy + 1 * s, 2.6 * s, 6 * s, -0.25,
                col[0] * 0.85, col[1] * 0.85, col[2] * 0.85, 1);
      D.ellipse(hx - fwd * 3 * s, hy + 2 * s, 2.6 * s, 6.5 * s, -0.35,
                col[0] * 0.7, col[1] * 0.7, col[2] * 0.7, 1);
    }
    // tail (curled up behind)
    D.ellipse(x - fwd * 16 * s, y - 4 * s, 5 * s, 2 * s, -fwd * 0.7,
              col[0], col[1], col[2], 1);
    // ---- rim lights on fire side (fire is +fwd side; dog faces fire) ----
    // chest catch
    D.ellipse(x + fwd * 15 * s, y + 1 * s, 2.2 * s, 8 * s, 0,
              RIM[0], RIM[1], RIM[2], 1.0);
    // back outline catch (top of body)
    D.ellipse(x, y - 8 * s, 14 * s, 2.0 * s, 0, RIM[0], RIM[1], RIM[2], 0.85);
    // forehead / snout catch
    D.disc(hx + fwd * 6 * s, hy + 2 * s, 2.2 * s, RIM[0], RIM[1], RIM[2], 1.0);
    D.disc(hx + fwd * 4 * s, hy - 2 * s, 2.0 * s, RIM[0], RIM[1], RIM[2], 0.9);
    // ear tip catch
    if (perky) {
      D.disc(hx + fwd * 4 * s, hy - 9 * s, 1.4 * s, RIM[0], RIM[1], RIM[2], 0.85);
    }
    // front leg catch
    D.rect(x + fwd * 10 * s, y + 6 * s, 1.0 * s, 8 * s, RIM[0], RIM[1], RIM[2], 0.85);
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;
    var hy = 0.66 * H;                // horizon / forest-floor line
    var fireX = 0.50 * W;
    var fireBaseY = 0.78 * H;         // top of logs / where flames begin

    /* 1. SKY — deep navy → slightly warmer near horizon ---------------------*/
    SK.vGradient(D, W, hy, [
      [0,    [8, 12, 35]],
      [0.55, [14, 16, 45]],
      [1,    [22, 20, 52]]
    ], Math.round(4 * sc));

    /* 2. STARFIELD — only above horizon, twinkles on t ----------------------*/
    SK.starfield(D, W, hy * 0.92, 70, 1303, t);

    /* 3. MOON — crescent: bright disc with offset sky-tone bite -------------*/
    var mx = 0.18 * W, my = 0.13 * H, mr = 0.022 * W;
    SK.glow(D, mx, my, mr * 0.55, [240, 235, 200],
            { halo: [[3.2, 0.05], [2.0, 0.12]], coreAlpha: 0 });
    D.disc(mx, my, mr, 240, 235, 200, 1);
    D.disc(mx - mr * 0.45, my - mr * 0.10, mr * 0.92, 14, 16, 42, 1);

    /* 4. DISTANT TREE-LINE RIDGE — soft band along horizon ------------------*/
    SK.ridgeFrac(D, [
      [0, 0.86], [0.08, 0.78], [0.18, 0.84], [0.28, 0.74], [0.38, 0.82],
      [0.50, 0.72], [0.62, 0.80], [0.74, 0.74], [0.86, 0.82], [1, 0.78]
    ], W, hy, TREE_MD, 1);

    /* 5. BACKGROUND CONIFERS — 6 trees of varying scale --------------------*/
    var treeBase = hy + 6 * sc;
    conifer(D, 0.05 * W, treeBase, 0.22 * H, 0.10 * W, TREE_DK);
    conifer(D, 0.13 * W, treeBase + 4 * sc, 0.17 * H, 0.08 * W, TREE_DK);
    conifer(D, 0.30 * W, treeBase, 0.26 * H, 0.12 * W, TREE_DK);
    conifer(D, 0.62 * W, treeBase + 2 * sc, 0.20 * H, 0.09 * W, TREE_DK);
    conifer(D, 0.78 * W, treeBase, 0.27 * H, 0.13 * W, TREE_DK);
    conifer(D, 0.93 * W, treeBase + 6 * sc, 0.18 * H, 0.10 * W, TREE_DK);
    // a tall lone one mid-back
    conifer(D, 0.45 * W, treeBase - 4 * sc, 0.30 * H, 0.11 * W, TREE_DK);

    /* 6. GROUND — dark band for forest floor -------------------------------*/
    D.rect(0, hy, W, H - hy, GROUND[0], GROUND[1], GROUND[2], 1);

    /* 7. WARM POOL OF GROUND LIGHT under fire (drawn BEFORE logs/figures) ---*/
    // Elongated horizontal pool on the ground (NOT a giant radial orb).
    // Subtle outer rings, then a brighter near-ground band.
    D.ellipse(fireX, fireBaseY + 28 * sc, 0.30 * W, 0.040 * H, 0,
              255, 130, 50, 0.18);
    D.ellipse(fireX, fireBaseY + 22 * sc, 0.22 * W, 0.030 * H, 0,
              255, 150, 60, 0.28);
    D.ellipse(fireX, fireBaseY + 16 * sc, 0.14 * W, 0.022 * H, 0,
              255, 170, 80, 0.38);
    D.ellipse(fireX, fireBaseY + 12 * sc, 0.10 * W, 0.016 * H, 0,
              255, 200, 110, 0.45);

    /* 8. TENT — bold triangle silhouette, left third -----------------------*/
    var tX = 0.16 * W, tBase = hy + 0.14 * H, tTop = hy + 0.02 * H, tHalf = 0.10 * W;
    // back/dark side
    D.tri(tX - tHalf, tBase, tX, tTop, tX, tBase, TENT_DK[0], TENT_DK[1], TENT_DK[2], 1);
    // front lit side
    D.tri(tX, tTop, tX + tHalf, tBase, tX, tBase, TENT[0], TENT[1], TENT[2], 1);
    // door (small darker triangle)
    var dH = 0.08 * H;
    D.tri(tX - 0.025 * W, tBase, tX + 0.025 * W, tBase, tX, tBase - dH,
          12, 14, 28, 1);
    // pole tip
    D.rect(tX - 0.003 * W, tTop - 0.012 * H, 0.006 * W, 0.014 * H,
           TENT_DK[0], TENT_DK[1], TENT_DK[2], 1);
    // ground guy-lines as thin lines
    SK.line(D, tX - tHalf, tBase, tX - tHalf - 0.025 * W, tBase + 0.012 * H,
            TENT_DK, 0.8 * sc, 0.8);
    SK.line(D, tX + tHalf, tBase, tX + tHalf + 0.025 * W, tBase + 0.012 * H,
            TENT_DK, 0.8 * sc, 0.8);
    // a small bright rim along the front edge (catching firelight, since fire is to the right)
    SK.line(D, tX, tTop, tX + tHalf, tBase, RIM, 1.0 * sc, 0.45);

    /* 9. LOGS — 3 dark rounded ellipses at fire base -----------------------*/
    var logCol = [60, 40, 30];
    D.ellipse(fireX - 0.022 * W, fireBaseY + 8 * sc, 0.045 * W, 0.012 * H, 0.1,
              logCol[0], logCol[1], logCol[2], 1);
    D.ellipse(fireX + 0.018 * W, fireBaseY + 8 * sc, 0.044 * W, 0.012 * H, -0.12,
              logCol[0], logCol[1], logCol[2], 1);
    D.ellipse(fireX, fireBaseY + 12 * sc, 0.060 * W, 0.011 * H, 0,
              logCol[0], logCol[1], logCol[2], 1);
    // little log highlights catching the fire
    D.ellipse(fireX - 0.020 * W, fireBaseY + 6 * sc, 0.030 * W, 0.005 * H, 0.1,
              255, 160, 70, 0.65);
    D.ellipse(fireX + 0.018 * W, fireBaseY + 6 * sc, 0.028 * W, 0.005 * H, -0.12,
              255, 160, 70, 0.55);

    /* 10. FLAMES — stacked triangle tongues, height jitters on t -----------*/
    // Combine t and u so flicker varies across raw preview frames (which fix t).
    var jit = function (freq, ph) {
      return Math.sin(t * freq + ph) * 0.5 + Math.sin(u * Math.PI * 2 * 3 + ph * 1.7) * 0.4;
    };
    var fbY = fireBaseY + 4 * sc;
    // outer (red)
    var hOut = (0.105 + 0.022 * jit(7.3, 0.4)) * H;
    var wOut = 0.060 * W;
    D.tri(fireX - wOut, fbY, fireX + wOut, fbY,
          fireX + 0.010 * W, fbY - hOut, 200, 60, 40, 1);
    D.tri(fireX - wOut * 0.7, fbY, fireX + wOut * 1.05, fbY,
          fireX - 0.008 * W, fbY - hOut * 0.95, 200, 60, 40, 1);
    // mid (orange)
    var hMid = (0.082 + 0.018 * jit(9.1, 1.7)) * H;
    var wMid = 0.040 * W;
    D.tri(fireX - wMid, fbY - 2 * sc, fireX + wMid, fbY - 2 * sc,
          fireX, fbY - hMid, 255, 150, 60, 1);
    D.tri(fireX - wMid * 0.8, fbY - 2 * sc, fireX + wMid * 1.1, fbY - 2 * sc,
          fireX + 0.012 * W, fbY - hMid * 0.85, 255, 150, 60, 1);
    // inner core (yellow)
    var hIn = (0.055 + 0.014 * jit(11.4, 2.5)) * H;
    var wIn = 0.022 * W;
    D.tri(fireX - wIn, fbY - 4 * sc, fireX + wIn, fbY - 4 * sc,
          fireX + 0.004 * W, fbY - hIn, 255, 220, 110, 1);
    // hot core spot (very bright)
    var hCore = (0.030 + 0.008 * jit(13.2, 0.9)) * H;
    var wCore = 0.012 * W;
    D.tri(fireX - wCore, fbY - 5 * sc, fireX + wCore, fbY - 5 * sc,
          fireX, fbY - hCore, 255, 240, 160, 1);
    // base white-hot bed
    D.ellipse(fireX, fbY - 2 * sc, 0.030 * W, 0.012 * H, 0, 255, 230, 150, 0.85);

    /* 11. EMBERS — rising small bright discs, seeded x-offsets -------------*/
    var emR = SK.rng(13);
    var emX = [], emPh = [];
    for (var ei = 0; ei < 14; ei++) { emX.push((emR() - 0.5) * 0.09 * W); emPh.push(emR()); }
    for (var i = 0; i < 14; i++) {
      var prog = ((t * 0.18 + emPh[i] + i * 0.063) % 1.0);
      var ey = fbY - 8 * sc - prog * 0.26 * H;
      var ex = fireX + emX[i] + Math.sin((prog * 7.0) + i * 1.3) * 5 * sc;
      var alpha = (1 - prog * prog) * 0.95;
      // larger near base, shrink as rises
      var er = (1.4 + (1 - prog) * 2.0) * sc;
      // hotter near base (yellow), cooler at top (red-orange)
      var rR = 255, rG = SK.lerp(230, 100, prog), rB = SK.lerp(130, 30, prog);
      D.disc(ex, ey, er, rR, rG, rB, alpha);
    }

    /* 12. SMOKE — 3 soft drifting blobs (puffs) rising and curling rightward */
    // Each puff cycles its own life on t. Use multi-lobe feathered blobs so
    // they read as soft cloudy smoke, not flat saucers.
    function smokePuff(phase, speed, driftX) {
      var prog = ((t * speed + phase) % 1.0);
      var sy = fbY - 0.08 * H - prog * 0.42 * H;
      var sx = fireX + 0.005 * W + prog * driftX * W
              + Math.sin(prog * 3.2 + phase * 6.0) * 10 * sc;
      var sa = (1 - prog) * 0.40;
      // cool gray tone, lighter as it rises (alpha drops faster than tone)
      var gv = SK.lerp(110, 180, prog);
      var col = [gv, gv + 6, gv + 14];
      var R = (0.030 + prog * 0.045) * W;
      // multi-lobe puff (looks like a soft cloud cluster)
      SK.feather(D, sx,                 sy,                 R,           col, sa);
      SK.feather(D, sx + 0.020 * W,     sy - 0.005 * H,     R * 0.78,    col, sa * 0.9);
      SK.feather(D, sx - 0.022 * W,     sy + 0.002 * H,     R * 0.72,    col, sa * 0.9);
      SK.feather(D, sx + 0.005 * W,     sy - 0.015 * H,     R * 0.55,    col, sa * 0.8);
    }
    smokePuff(0.10, 0.16, 0.05);
    smokePuff(0.45, 0.16, 0.07);
    smokePuff(0.80, 0.16, 0.04);
    // Faint base wisp anchored just above the flames so smoke READS as coming
    // out of the fire rather than floating disembodied above it.
    var baseWy = fbY - 0.12 * H + Math.sin(t * 1.3) * 3 * sc;
    var baseWx = fireX + Math.sin(t * 0.9) * 4 * sc;
    SK.feather(D, baseWx, baseWy, 0.030 * W, [95, 100, 110], 0.55);
    SK.feather(D, baseWx + 0.012 * W, baseWy - 0.015 * H, 0.022 * W, [110, 115, 125], 0.45);

    /* 13. CHARACTERS — couple (right of fire) + 2 dogs (left of fire) ------*/
    // Seated y at hip level on ground. Ground top is at hy.
    var seatY = hy + 0.10 * H;

    // Black dog (left, perky ears, facing right toward fire) — slightly
    // brighter base so silhouette survives against dark ground.
    dog(D, 0.30 * W, seatY + 0.014 * H, 1.5 * sc, DOG_BLK, true, 1);

    // Brown dog (left, closer to fire, floppy ears, facing right toward fire)
    dog(D, 0.40 * W, seatY + 0.020 * H, 1.7 * sc, DOG_BRN, false, 1);

    // Woman (right of fire, closer to fire, facing left toward fire)
    seatedPerson(D, 0.61 * W, seatY, 1.15 * sc, HAIR_W, SHIRT_W, -1);

    // Man (right of fire, behind woman, facing left toward fire)
    seatedPerson(D, 0.74 * W, seatY - 0.006 * H, 1.20 * sc, HAIR_M, SHIRT_M, -1);

    /* 14. HEARTS above the couple, gently bobbing on t ---------------------*/
    var hBobA = Math.sin(t * 1.3) * 4 * sc;
    var hBobB = Math.sin(t * 1.7 + 1.2) * 4 * sc;
    var hBobC = Math.sin(t * 1.1 + 2.4) * 4 * sc;
    SK.heart(D, 0.66 * W, hy - 0.01 * H + hBobA, 26 * sc, HEART, 1.0);
    SK.heart(D, 0.72 * W, hy - 0.07 * H + hBobB, 20 * sc, HEART, 0.9);
    SK.heart(D, 0.68 * W, hy - 0.14 * H + hBobC, 14 * sc, HEART, 0.8);

    /* 15. FOREGROUND grass tufts — tiny dark triangles in front of figures -*/
    var gr = SK.rng(77);
    for (var gi = 0; gi < 14; gi++) {
      var gx = gr() * W, gw = 6 * sc, gh = (3 + gr() * 4) * sc;
      var gy = H - 8 * sc - gr() * 10 * sc;
      D.tri(gx - gw, gy, gx + gw, gy, gx, gy - gh, GROUND[0] * 0.6, GROUND[1] * 0.6, GROUND[2] * 0.6, 1);
    }
  }

  return { id: 'camping', name: 'campfire night', dur: 11.0, draw: draw };
});
