/* ============================================================================
 * scenes/tacoma.js — road trip in the dark-gray Toyota Tacoma.
 * Side profile, truck centered, background scrolls past on t for motion.
 * Two people in the cab (man with black hair, woman with brown hair) and
 * two dogs in the rear cab (black + brown). Hearts bob above the cab.
 * Matches sceneRefs/scene5tacomaRoadtrip.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  // ---- palette -------------------------------------------------------------
  var BODY      = [64, 68, 76];     // dark gray Tacoma
  var BODY_HI   = [92, 98, 108];
  var BODY_LO   = [38, 42, 50];
  var TIRE      = [18, 16, 22];
  var RIM       = [148, 152, 160];
  var SPOKE     = [56, 60, 68];
  var WINDOW    = [42, 60, 88];     // dark transparent glass — tinted blue
  var WIN_RIM   = [22, 28, 42];
  var SKIN      = [238, 208, 178];
  var HAIR_M    = [22, 18, 28];     // man, black hair
  var HAIR_W    = [120, 76, 52];    // woman, brown hair (lifted for contrast vs hair_m)
  var SHIRT_M   = [40, 62, 110];
  var SHIRT_W   = [200, 92, 112];
  var DOG_BK    = [28, 24, 34];
  var DOG_BR    = [134, 86, 56];
  var HEART     = [235, 88, 110];
  var HEART_HI  = [250, 130, 145];
  var ROAD      = [55, 55, 60];
  var ROAD_HI   = [70, 70, 76];
  var SHOULDER  = [128, 116, 92];
  var GRASS     = [88, 108, 70];
  var DASH      = [240, 220, 150];
  var HILL_FAR  = [126, 144, 168];
  var HILL_MID  = [82, 102, 130];
  var HILL_NEAR = [52, 70, 92];
  var TREE      = [42, 70, 56];
  var TRUNK     = [60, 42, 32];
  var HEADL     = [255, 235, 175];
  var TAILL     = [230, 60, 50];

  // ---- one Tacoma, built around local (0,0) at the truck centroid ---------
  // Local +x = forward, +y = down. dir=-1 in SK.pen mirrors so the truck
  // faces LEFT (matches reference).
  //
  // Anatomy (local coords; +x = front of truck):
  //   length  : -54 .. +54  (~108 units long — gives Tacoma's longer aspect)
  //   skirt   : y = +14 .. +18  (lower rocker band)
  //   belt    : y = -2          (top of doors / bottom of side windows)
  //   bed rail: y = -10         (top of the OPEN bed side wall)
  //   roof    : y = -22         (cab roof line — kept low for short cab read)
  //
  //   hood   : x = +18 .. +50   (long flat hood, the signature Tacoma look)
  //   wsh.   : raked from (+18,-9) up to (+10,-22)  (slanted windshield)
  //   cab    : x = -20 .. +10   (DOUBLE cab — front + full-size rear seat row)
  //   bed    : x = -50 .. -22   (open-topped tub, shorter to make room for cab)
  //   wheels : at +30 and -30, radius 9
  function tacoma(D, x, y, ang, scl, dir, t) {
    var P = SK.pen(x, y, ang, scl, dir);

    var wheelR  = 9;
    var wheelFx = 30, wheelRx = -30, wheelY = 17;

    function quad(pA, pB, pC, pD, col, a) {
      D.tri(pA[0], pA[1], pB[0], pB[1], pC[0], pC[1], col[0], col[1], col[2], a == null ? 1 : a);
      D.tri(pA[0], pA[1], pC[0], pC[1], pD[0], pD[1], col[0], col[1], col[2], a == null ? 1 : a);
    }

    // ===== SHADOW (soft, wide) =============================================
    var sh = P(0, 30);
    D.ellipse(sh[0], sh[1], 58 * scl, 4 * scl, ang, 12, 10, 18, 0.55);

    // ===== LOWER BODY (skirt + main door band, full length) ===============
    quad(P(-54, 14), P(54, 14), P(54, 18), P(-54, 18), BODY_LO);  // rocker
    quad(P(-54, -2), P(54, -2), P(54, 14), P(-54, 14), BODY);     // door body

    // belt-line highlight (thin lighter stripe along door tops)
    SK.line(D, P(-52, -2)[0], P(-52, -2)[1], P(52, -2)[0], P(52, -2)[1], BODY_HI, 0.9 * scl, 0.55);

    // ===== HOOD (long flat plane that defines the truck profile) ==========
    quad(P(18, -9), P(50, -9), P(50, -2), P(18, -2), BODY);
    // hood top highlight (top sliver, sells the flat surface)
    quad(P(18, -9), P(50, -9), P(50, -7), P(18, -7), BODY_HI);
    // grille slope from hood top down to front bumper
    var gsA = P(50, -9), gsB = P(54, -2), gsC = P(50, -2);
    D.tri(gsA[0], gsA[1], gsB[0], gsB[1], gsC[0], gsC[1], BODY[0], BODY[1], BODY[2], 1);

    // ===== BED (OPEN-TOPPED — visible side wall + raised rail) ============
    // This is the BIG read-difference vs the previous canopy. The bed is
    // visibly a TUB with low side walls topped by a rail, not an enclosed back.
    quad(P(-50, -10), P(-22, -10), P(-22, -2), P(-50, -2), BODY);  // side wall
    quad(P(-50, -12), P(-22, -12), P(-22, -10), P(-50, -10), BODY_HI); // top rail
    // interior shadow line just below the rail (suggests bed depth)
    SK.line(D, P(-49, -9.5)[0], P(-49, -9.5)[1], P(-23, -9.5)[0], P(-23, -9.5)[1], BODY_LO, 0.7 * scl, 0.7);
    // tailgate seam at rear of bed
    SK.line(D, P(-46, -10)[0], P(-46, -10)[1], P(-46, 14)[0], P(-46, 14)[1], BODY_LO, 0.9 * scl, 0.7);
    // bed-front seam (where bed meets cab)
    SK.line(D, P(-22, -10)[0], P(-22, -10)[1], P(-22, 14)[0], P(-22, 14)[1], BODY_LO, 1.0 * scl, 0.85);

    // ===== CAB ROOF (low, flat — extended back for double-cab proportions) =
    quad(P(-20, -22), P(10, -22), P(10, -19), P(-20, -19), BODY);
    // roof crown highlight
    SK.line(D, P(-20, -22)[0], P(-20, -22)[1], P(10, -22)[0], P(10, -22)[1], BODY_HI, 1.0 * scl, 0.55);

    // ===== WINDSHIELD RAKE (slanted glass between hood and roof) ==========
    // Triangle that IS the windshield from side view.
    var wsA = P(10, -22), wsB = P(18, -9), wsC = P(10, -9);
    D.tri(wsA[0], wsA[1], wsB[0], wsB[1], wsC[0], wsC[1], WINDOW[0], WINDOW[1], WINDOW[2], 1);
    // A-pillar (the front edge of the cab, dark trim)
    SK.line(D, P(10, -22)[0], P(10, -22)[1], P(18, -9)[0], P(18, -9)[1], WIN_RIM, 1.6 * scl, 1);

    // ===== REAR CAB PILLAR (C-pillar slight back-slope) ===================
    var rpA = P(-20, -22), rpB = P(-20, -2), rpC = P(-22, -2);
    D.tri(rpA[0], rpA[1], rpB[0], rpB[1], rpC[0], rpC[1], BODY[0], BODY[1], BODY[2], 1);

    // ===== CAB SIDE WINDOWS (front + full-size rear, true double cab) =====
    // Front cab window (driver row): x = -3 .. +10 (13 wide)
    quad(P(-3, -22), P(10, -22), P(10, -2), P(-3, -2), WINDOW);
    // Rear cab window (rear seat row, where the dogs ride): x = -19 .. -4
    // Widened from 6 → 15 units so it visually matches the front window.
    quad(P(-19, -22), P(-4, -22), P(-4, -2), P(-19, -2), WINDOW);
    // B-pillar between front and rear cab windows
    SK.line(D, P(-3.5, -22)[0], P(-3.5, -22)[1], P(-3.5, -2)[0], P(-3.5, -2)[1], WIN_RIM, 1.5 * scl, 1);
    // upper window trim (thin dark line along roof drip rail)
    SK.line(D, P(-20, -22)[0], P(-20, -22)[1], P(10, -22)[0], P(10, -22)[1], WIN_RIM, 0.7 * scl, 0.7);

    // ===== PEOPLE IN THE FRONT CAB ========================================
    // Truck faces LEFT; driver sits at the FRONT of the cab (+x in local).
    function head(lx, ly, R, hairCol) {
      var sk = P(lx, ly);
      D.disc(sk[0], sk[1], R * scl, SKIN[0], SKIN[1], SKIN[2], 1);
      var hh = P(lx, ly - R * 0.55);
      D.disc(hh[0], hh[1], R * 1.0 * scl, hairCol[0], hairCol[1], hairCol[2], 1);
      var bk = P(lx + R * 0.42, ly - R * 0.18);
      D.disc(bk[0], bk[1], R * 0.62 * scl, hairCol[0], hairCol[1], hairCol[2], 1);
    }
    function shirt(lx, ly, R, col) {
      var sA = P(lx - R * 1.0, ly + R * 0.2), sB = P(lx + R * 1.0, ly + R * 0.2);
      var sC = P(lx + R * 1.3, ly + R * 1.5), sD = P(lx - R * 1.3, ly + R * 1.5);
      D.tri(sA[0], sA[1], sB[0], sB[1], sC[0], sC[1], col[0], col[1], col[2], 1);
      D.tri(sA[0], sA[1], sC[0], sC[1], sD[0], sD[1], col[0], col[1], col[2], 1);
    }
    // Man (driver, black hair) — front of front-window
    shirt(6, -10, 3.4, SHIRT_M);
    head(6, -12, 3.4, HAIR_M);
    // Woman (passenger, brown hair) — alongside, slightly back
    shirt(0, -10, 3.4, SHIRT_W);
    head(0, -12, 3.4, HAIR_W);

    // ===== DOGS IN THE REAR CAB ===========================================
    function dog(lx, ly, R, col, perky) {
      var h = P(lx, ly);
      D.disc(h[0], h[1], R * scl, col[0], col[1], col[2], 1);
      if (perky) {
        var e1a = P(lx - R * 0.4, ly - R * 0.5);
        var e1b = P(lx + R * 0.1, ly - R * 1.5);
        var e1c = P(lx + R * 0.2, ly - R * 0.4);
        D.tri(e1a[0], e1a[1], e1b[0], e1b[1], e1c[0], e1c[1], col[0], col[1], col[2], 1);
        var e2a = P(lx + R * 0.3, ly - R * 0.4);
        var e2b = P(lx + R * 0.5, ly - R * 1.4);
        var e2c = P(lx + R * 0.8, ly - R * 0.5);
        D.tri(e2a[0], e2a[1], e2b[0], e2b[1], e2c[0], e2c[1], col[0], col[1], col[2], 1);
      } else {
        var f1 = P(lx - R * 0.85, ly + R * 0.10);
        var f2 = P(lx + R * 0.85, ly + R * 0.10);
        D.disc(f1[0], f1[1], R * 0.55 * scl, col[0], col[1], col[2], 1);
        D.disc(f2[0], f2[1], R * 0.55 * scl, col[0], col[1], col[2], 1);
      }
      var sn = P(lx + R * 0.7, ly + R * 0.15);
      D.disc(sn[0], sn[1], R * 0.40 * scl, col[0] + 18, col[1] + 14, col[2] + 12, 1);
      var nz = P(lx + R * 1.0, ly + R * 0.05);
      D.disc(nz[0], nz[1], R * 0.18 * scl, 12, 10, 16, 1);
      var eye = P(lx + R * 0.25, ly - R * 0.20);
      D.disc(eye[0], eye[1], 0.6 * scl, 240, 220, 180, 1);
    }
    // Black dog (perky ears) — front of rear cab (closer to driver row)
    dog(-7, -12, 2.9, DOG_BK, true);
    // Brown dog (floppy ears) — back of rear cab (toward tailgate)
    dog(-15, -11, 3.1, DOG_BR, false);

    // ===== FENDER FLARES (Tacoma signature — dark bulges around wheels) ==
    // Drawn AFTER body but BEFORE wheels so wheels overlay them. Each flare
    // is a wide darker patch above the wheel + a slight bulge below body.
    function flare(lx) {
      // upper flare patch above the wheel (extends body band darker over wheel)
      quad(P(lx - 12, 4), P(lx + 12, 4), P(lx + 13, 14), P(lx - 13, 14), BODY_LO);
      // arch ellipse around the wheel (the visible rim becomes the "flare lip")
      var c = P(lx, wheelY - 1);
      D.ellipse(c[0], c[1], 13 * scl, 12 * scl, ang, BODY_LO[0], BODY_LO[1], BODY_LO[2], 1);
    }
    flare(wheelFx);
    flare(wheelRx);

    // ===== WHEELS (tire + rim + spinning spokes) ==========================
    var spinAng = t * 8.0;
    function wheel(lx, ly, R) {
      var w = P(lx, ly);
      D.disc(w[0], w[1], R * scl, TIRE[0], TIRE[1], TIRE[2], 1);
      D.disc(w[0], w[1], R * 0.62 * scl, RIM[0], RIM[1], RIM[2], 1);
      D.disc(w[0], w[1], R * 0.22 * scl, SPOKE[0], SPOKE[1], SPOKE[2], 1);
      for (var k = 0; k < 5; k++) {
        var a = spinAng + k * (Math.PI * 2 / 5);
        var sx = w[0] + Math.cos(a) * R * 0.55 * scl;
        var sy = w[1] + Math.sin(a) * R * 0.55 * scl;
        SK.line(D, w[0], w[1], sx, sy, SPOKE, 1.6 * scl, 1);
      }
    }
    wheel(wheelFx, wheelY, wheelR);
    wheel(wheelRx, wheelY, wheelR);

    // ===== FRONT + REAR BUMPERS ===========================================
    quad(P(50, 2), P(54, 2), P(54, 16), P(50, 16), BODY_LO);   // front
    quad(P(-50, 2), P(-54, 2), P(-54, 16), P(-50, 16), BODY_LO); // rear

    // ===== HEADLIGHT (front, faces left) ==================================
    var hl = P(52, -4);
    var flicker = 0.85 + 0.15 * Math.sin(t * 9.3);
    SK.glow(D, hl[0], hl[1], 1.7 * scl, HEADL,
            { halo: [[2.6, 0.16 * flicker], [1.7, 0.30 * flicker]], coreAlpha: flicker });

    // ===== TAILLIGHT (rear) ===============================================
    var tl = P(-50, -5);
    D.disc(tl[0], tl[1], 1.8 * scl, TAILL[0], TAILL[1], TAILL[2], 1);
    D.disc(tl[0], tl[1], 1.0 * scl, 255, 180, 150, 0.95);

    // ===== DOOR LINES + HANDLE HINTS ======================================
    // B-pillar door seam (between front and rear doors)
    SK.line(D, P(-3.5, -2)[0], P(-3.5, -2)[1], P(-3.5, 14)[0], P(-3.5, 14)[1], BODY_LO, 0.8 * scl, 0.55);
    // C-pillar door seam (rear door to cab back)
    SK.line(D, P(-20, -2)[0], P(-20, -2)[1], P(-20, 14)[0], P(-20, 14)[1], BODY_LO, 0.7 * scl, 0.5);
    // driver-door handle (small horizontal dash, slightly above belt midpoint)
    D.rect(P(3, 4)[0] - 2 * scl, P(3, 4)[1], 4 * scl, 0.8 * scl, BODY_HI[0], BODY_HI[1], BODY_HI[2], 0.8);
    // rear-door handle (matching dash on the rear door)
    D.rect(P(-12, 4)[0] - 2 * scl, P(-12, 4)[1], 4 * scl, 0.8 * scl, BODY_HI[0], BODY_HI[1], BODY_HI[2], 0.8);
  }

  // ---- a simple background tree --------------------------------------------
  function bgTree(D, x, baseY, scale) {
    // trunk
    D.rect(x - 1.8 * scale, baseY - 10 * scale, 3.6 * scale, 10 * scale, TRUNK[0], TRUNK[1], TRUNK[2], 1);
    // two triangle canopies stacked
    D.tri(x - 11 * scale, baseY - 9 * scale, x + 11 * scale, baseY - 9 * scale, x, baseY - 26 * scale,
          TREE[0], TREE[1], TREE[2], 1);
    D.tri(x - 8.5 * scale, baseY - 18 * scale, x + 8.5 * scale, baseY - 18 * scale, x, baseY - 32 * scale,
          TREE[0], TREE[1], TREE[2], 1);
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;

    var horizonY = 0.55 * H;
    var roadTopY = 0.70 * H;
    var roadBotY = 0.92 * H;

    /* 1. SKY GRADIENT — warm sunny day --------------------------------- */
    SK.vGradient(D, W, horizonY, [
      [0.00, [150, 195, 230]],
      [0.55, [200, 220, 235]],
      [1.00, [248, 232, 200]]
    ], Math.round(4 * sc));

    /* 2. SUN — soft warm disc, off to the right ----------------------- */
    var sunX = 0.82 * W, sunY = 0.22 * H;
    SK.glow(D, sunX, sunY, 0.022 * W, [255, 240, 200],
            { halo: [[5.0, 0.05], [3.2, 0.10], [1.9, 0.22]], coreAlpha: 0.90 });

    /* 3. A FEW SOFT CLOUDS drifting on t ------------------------------ */
    function softCloud(xf, yf, w, a) {
      var cx = ((xf * W + t * 8 * sc) % (W + 0.35 * W)) - 0.18 * W;
      SK.cloud(D, cx, yf * H, w * W, [255, 255, 255], a);
    }
    softCloud(0.18, 0.16, 0.12, 0.55);
    softCloud(0.55, 0.10, 0.16, 0.50);
    softCloud(0.84, 0.22, 0.13, 0.45);

    /* 4. DISTANT HILLS — three layers, parallax scroll to the RIGHT --- */
    // Truck faces LEFT (driving left), so the world appears to scroll RIGHT
    // relative to the truck. We tile each ridge twice with an x-offset that
    // grows in t.
    function tiledRidge(ptsFrac, drift, baseY, col, a) {
      var shift = (drift % W) / W;
      var pts1 = ptsFrac.map(function (q) { return [q[0] + shift, q[1]]; });
      var pts2 = ptsFrac.map(function (q) { return [q[0] + shift - 1, q[1]]; });
      var pts3 = ptsFrac.map(function (q) { return [q[0] + shift + 1, q[1]]; });
      SK.ridgeFrac(D, pts1, W, baseY, col, a);
      SK.ridgeFrac(D, pts2, W, baseY, col, a);
      SK.ridgeFrac(D, pts3, W, baseY, col, a);
    }
    tiledRidge([
      [0, 0.95], [0.20, 0.78], [0.45, 0.88], [0.70, 0.75], [0.95, 0.85], [1, 0.82]
    ], t * 5 * sc, horizonY, HILL_FAR, 1);
    tiledRidge([
      [0, 1.00], [0.15, 0.90], [0.35, 0.96], [0.55, 0.86], [0.80, 0.94], [1, 0.90]
    ], t * 11 * sc, horizonY, HILL_MID, 1);
    tiledRidge([
      [0, 1.05], [0.18, 0.96], [0.40, 1.02], [0.65, 0.95], [0.88, 1.00], [1, 0.98]
    ], t * 22 * sc, horizonY, HILL_NEAR, 1);

    /* 5. ROAD SHOULDER / GROUND between hills and road --------------- */
    D.rect(0, horizonY, W, roadTopY - horizonY, SHOULDER[0], SHOULDER[1], SHOULDER[2], 1);
    // grassy band just under the hills
    D.rect(0, horizonY, W, 0.018 * H, GRASS[0], GRASS[1], GRASS[2], 1);

    /* 6. BACKGROUND TREES on the shoulder — scroll right on t -------- */
    var treeStep = 0.28 * W;
    var treeDrift = ((t * 120 * sc) % treeStep + treeStep) % treeStep;
    var treeBaseY = roadTopY - 0.005 * H;
    for (var ti = -1; ti < Math.ceil(W / treeStep) + 2; ti++) {
      var tx = ti * treeStep + treeDrift;
      var alt = ((ti % 2) + 2) % 2;
      bgTree(D, tx, treeBaseY, sc * (1.0 + alt * 0.2));
    }

    /* 7. ROAD (asphalt) ---------------------------------------------- */
    D.rect(0, roadTopY, W, roadBotY - roadTopY, ROAD[0], ROAD[1], ROAD[2], 1);
    // subtle highlight near the top of the road
    D.rect(0, roadTopY, W, 0.005 * H, ROAD_HI[0], ROAD_HI[1], ROAD_HI[2], 1);
    // top and bottom solid lines (faint shoulder stripes)
    D.rect(0, roadTopY + 0.018 * H, W, 0.005 * H, 230, 220, 195, 0.70);
    D.rect(0, roadBotY - 0.012 * H, W, 0.005 * H, 230, 220, 195, 0.65);

    /* 8. CENTER LINE DASHES — scroll right on t ---------------------- */
    var dashY = (roadTopY + roadBotY) / 2 - 0.006 * H;
    var dashH = 0.013 * H;
    var dashLen = 0.072 * W;
    var dashGap = 0.052 * W;
    var dashStep = dashLen + dashGap;
    var dashDrift = ((t * 340 * sc) % dashStep + dashStep) % dashStep;
    for (var di = -1; di * dashStep < W + dashStep; di++) {
      var dx = di * dashStep + dashDrift;
      D.rect(dx, dashY, dashLen, dashH, DASH[0], DASH[1], DASH[2], 0.95);
    }

    /* 9. LOWER FOREGROUND — darker road shoulder grass --------------- */
    D.rect(0, roadBotY, W, H - roadBotY, GRASS[0] - 20, GRASS[1] - 20, GRASS[2] - 18, 1);

    /* 10. THE TACOMA ------------------------------------------------- */
    // Subtle suspension bobble.
    var bobble = Math.sin(t * 5.5) * 1.4 * sc;
    var truckX = 0.50 * W;
    var truckScl = 4.0 * sc;
    // Position so wheels (local y = 17 + 9 = 26) sit a hair above the road
    // bottom rather than sinking into the grass below it.
    var truckY = roadBotY - 26 * truckScl - 2 * sc + bobble;
    tacoma(D, truckX, truckY, 0, truckScl, -1, t);

    /* 11. HEARTS — clustered tightly above the cab, bobbing ---------- */
    // Cab roof is at local y=-26 → world y = truckY + (-26 * truckScl).
    var cabTopY = truckY - 26 * truckScl;
    function heartAt(dxFrac, dyOffPx, size, phase, hi) {
      var hx = truckX + dxFrac * W + Math.sin(t * 1.2 + phase * 0.7) * 3 * sc;
      var hy = cabTopY - 0.04 * H + dyOffPx + Math.sin(t * 2.1 + phase) * 5 * sc;
      // soft glow behind
      D.disc(hx, hy, size * 1.4, HEART[0], HEART[1], HEART[2], 0.20);
      SK.heart(D, hx, hy, size, hi ? HEART_HI : HEART, 1);
    }
    heartAt(-0.045, 12 * sc, 22 * sc, 0.0, false);
    heartAt(-0.010, -18 * sc, 17 * sc, 1.3, true);
    heartAt( 0.025, 0 * sc, 20 * sc, 2.6, false);
    heartAt( 0.060, -22 * sc, 14 * sc, 3.9, true);
    heartAt(-0.035, -36 * sc, 11 * sc, 5.2, false);
  }

  return { id: 'tacoma', name: 'road trip', dur: 10.0, draw: draw };
});
