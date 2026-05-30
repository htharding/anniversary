/* ============================================================================
 * scenes/market.js — bird's-eye farmers market. Couple enters from opposite
 * sides, meets at center (smile), walks to perimeter and does 4 laps together.
 * Background NPCs progressively exit during the laps until only the couple
 * remains. Couple returns to center, hearts appear, then they exit to
 * opposite sides of the scene.
 *
 * Composition matches sceneRefs/scene4FarmersMarket.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  // ---- palette ----------------------------------------------------------
  var COBBLE     = [ 96,  88,  78];      // outer paving (between market & buffer edge)
  var SQ_FLOOR   = [184, 162, 122];      // single market floor tone (no busy/empty split)
  var SQ_FLOOR_2 = [172, 150, 110];      // slight variation for paving rows
  var FRAME      = [ 60,  52,  44];      // dark border of the square
  var SKIN       = [238, 208, 178];
  var MAN_HAIR   = [ 22,  18,  28];
  var MAN_SHIRT  = [ 40,  62, 110];
  var WOM_HAIR   = [112,  72,  50];
  var WOM_SHIRT  = [200,  92, 112];
  var HEART_COL  = [235,  88, 110];

  // canopy colour palette — varied for visual life
  var CANOPIES = [
    [232,  92,  88],   // red
    [ 78, 158, 210],   // blue
    [248, 196,  82],   // yellow
    [108, 178,  92],   // green
    [232, 142,  72],   // orange
    [180, 124, 196]    // purple
  ];

  // baskets / produce on the ground in front of each stall
  var BASKET_TONES = [
    [220, 130,  72],   // squash
    [200,  62,  62],   // tomato
    [108, 168,  88],   // greens
    [220, 200, 110]    // grain
  ];

  // NPC skin tones for ambient figures
  var NPC_TONES = [
    [240, 210, 178], [218, 178, 140], [188, 138, 100],
    [142,  96,  72], [230, 196, 168], [200, 158, 124]
  ];
  var NPC_CLOTHES = [
    [200,  92,  92], [ 90, 130, 200], [ 80, 168, 120],
    [232, 188,  82], [180,  92, 168], [232, 132,  62],
    [ 60,  82, 142], [220, 220, 220]
  ];

  // stall grid layout (square-local fractions, used by NPC reject + draw)
  var STALL_ROWS = 3, STALL_COLS = 4;
  var STALL_W_FRAC = 0.18, STALL_H_FRAC = 0.13;
  var STALL_PADX   = 0.07, STALL_PADY   = 0.08;

  function stallCellCenterFrac(rr, cc) {
    var cellW = (1 - STALL_PADX * 2) / STALL_COLS;
    var cellH = (1 - STALL_PADY * 2) / STALL_ROWS;
    return [STALL_PADX + (cc + 0.5) * cellW, STALL_PADY + (rr + 0.5) * cellH];
  }
  function isStallCell(rr, cc) {
    var c = stallCellCenterFrac(rr, cc);
    var distC = Math.hypot(c[0] - 0.5, c[1] - 0.5);
    return distC >= 0.18;  // central plaza cell has no stall
  }

  /* ----------------------------------------------------------------------
   * Pre-seeded NPCs distributed across the WHOLE market (not just one half).
   * Each NPC has an exit time and a nearest-edge exit target so they can
   * progressively walk off during the perimeter-walk phase.
   * --------------------------------------------------------------------*/
  function buildNpcs() {
    var r = SK.rng(7777);
    function nearStall(sx, sy) {
      for (var rr = 0; rr < STALL_ROWS; rr++) {
        for (var cc = 0; cc < STALL_COLS; cc++) {
          if (!isStallCell(rr, cc)) continue;
          var c = stallCellCenterFrac(rr, cc);
          if (Math.abs(sx - c[0]) < STALL_W_FRAC * 0.55 &&
              Math.abs(sy - c[1]) < STALL_H_FRAC * 0.55) return true;
        }
      }
      return false;
    }
    var out = [];
    for (var i = 0; i < 800 && out.length < 80; i++) {
      var sx = 0.05 + r() * 0.90;
      var sy = 0.05 + r() * 0.90;
      // keep central plaza relatively clear so the couple's meeting reads
      if (Math.hypot(sx - 0.5, sy - 0.5) < 0.09) continue;
      if (nearStall(sx, sy)) continue;
      // exit target = nearest edge of the square (just off the edge)
      var dL = sx, dR = 1 - sx, dT = sy, dB = 1 - sy;
      var m = Math.min(dL, dR, dT, dB);
      var ex, ey;
      if      (m === dL) { ex = -0.06; ey = sy; }
      else if (m === dR) { ex =  1.06; ey = sy; }
      else if (m === dT) { ex = sx;    ey = -0.06; }
      else               { ex = sx;    ey =  1.06; }
      out.push({
        sx: sx, sy: sy,
        skin:  NPC_TONES  [(r() * NPC_TONES.length)   | 0],
        cloth: NPC_CLOTHES[(r() * NPC_CLOTHES.length) | 0],
        ph: r() * 6.283,
        sp: 1.6 + r() * 2.2,
        sz: 0.85 + r() * 0.35,
        // each NPC exits at a random moment during the perimeter walk so the
        // market thins out smoothly rather than all-at-once
        exitU:  0.30 + r() * 0.48,   // start of their exit in [0.30, 0.78]
        exitTx: ex, exitTy: ey
      });
    }
    return out;
  }
  var NPCS = buildNpcs();
  var NPC_EXIT_DUR = 0.06;  // u-fraction each NPC takes to walk off

  /* ----------------------------------------------------------------------
   * Loose produce / baskets scattered in walkways across the WHOLE square.
   * --------------------------------------------------------------------*/
  function buildLooseBaskets() {
    var r = SK.rng(303);
    var out = [];
    for (var i = 0; i < 22; i++) {
      out.push({
        sx: 0.10 + r() * 0.80,
        sy: 0.10 + r() * 0.80,
        col: BASKET_TONES[(r() * BASKET_TONES.length) | 0],
        sz: 0.6 + r() * 0.5
      });
    }
    return out;
  }
  var LOOSE = buildLooseBaskets();

  // ---- helpers ----------------------------------------------------------

  function drawStall(D, x, y, w, h, col, sc) {
    D.rect(x - w / 2 + 1.5 * sc, y - h / 2 + 1.8 * sc, w, h, 30, 22, 16, 0.28);
    D.rect(x - w / 2, y - h / 2, w, h, col[0], col[1], col[2], 1);
    D.rect(x - w / 2, y - 0.06 * h, w, 0.12 * h,
           col[0] * 0.65, col[1] * 0.65, col[2] * 0.65, 0.85);
    var pr = 1.1 * sc;
    D.disc(x - w / 2, y - h / 2, pr, 32, 22, 14, 0.85);
    D.disc(x + w / 2, y - h / 2, pr, 32, 22, 14, 0.85);
    D.disc(x - w / 2, y + h / 2, pr, 32, 22, 14, 0.85);
    D.disc(x + w / 2, y + h / 2, pr, 32, 22, 14, 0.85);
  }

  function drawBasket(D, x, y, sz, col) {
    D.rect(x - sz, y - sz, sz * 2, sz * 2, 124, 86, 52, 1);
    D.disc(x - sz * 0.45, y - sz * 0.20, sz * 0.55, col[0], col[1], col[2], 1);
    D.disc(x + sz * 0.40, y - sz * 0.10, sz * 0.55, col[0], col[1], col[2], 1);
    D.disc(x,             y + sz * 0.30, sz * 0.60, col[0], col[1], col[2], 1);
  }

  // Top-down figure (the couple): hair halo + skin face + body ellipse.
  function drawFigure(D, x, y, skin, hair, shirt, sz) {
    var bodyR = sz * 1.65;
    D.ellipse(x, y + sz * 0.70, bodyR, sz * 1.05, 0, shirt[0], shirt[1], shirt[2], 1);
    D.disc(x, y, sz * 1.18, hair[0], hair[1], hair[2], 1);
    D.disc(x, y + sz * 0.05, sz * 0.78, skin[0], skin[1], skin[2], 1);
  }

  // Tiny NPC dot (head + body) with alpha so we can fade them out.
  function drawNpc(D, x, y, skin, cloth, sz, a) {
    if (a == null) a = 1;
    D.ellipse(x, y + sz * 0.5, sz * 1.15, sz * 0.7, 0, cloth[0], cloth[1], cloth[2], a);
    D.disc(x, y, sz * 0.75, skin[0], skin[1], skin[2], a);
  }

  function smileIcon(D, x, y, sz, a) {
    var col = [255, 215, 70];
    D.disc(x, y, sz, col[0], col[1], col[2], a);
    D.disc(x - sz * 0.36, y - sz * 0.18, sz * 0.16, 30, 22, 18, a);
    D.disc(x + sz * 0.36, y - sz * 0.18, sz * 0.16, 30, 22, 18, a);
    for (var i = -2; i <= 2; i++) {
      var ax = x + i * sz * 0.20;
      var ay = y + sz * 0.22 + Math.abs(i) * sz * 0.06;
      D.disc(ax, ay, sz * 0.11, 30, 22, 18, a);
    }
  }

  // Walk position on the inside perimeter of the square at parameter s in [0,1).
  // Goes CLOCKWISE starting from the top-left corner. Returns {pos, theta}
  // where theta is the walking direction (0=right, π/2=down, π=left, -π/2=up).
  function perimeterPos(s, insX, insR, insY, insB) {
    var w = insR - insX, h = insB - insY;
    var per = 2 * (w + h);
    var d = ((s % 1) + 1) % 1 * per;   // wrap into [0, per)
    if (d < w) return [insX + d, insY, 0];
    d -= w;
    if (d < h) return [insR, insY + d, Math.PI / 2];
    d -= h;
    if (d < w) return [insR - d, insB, Math.PI];
    d -= h;
    return [insX, insB - d, -Math.PI / 2];
  }

  function draw(D, W, H, u, t) {
    var sc = W / 680;

    /* 1. OUTER PAVING -----------------------------------------------------*/
    D.bg(COBBLE[0], COBBLE[1], COBBLE[2]);
    var pr = SK.rng(11);
    for (var i = 0; i < 80; i++) {
      var fx = pr() * W, fy = pr() * H;
      D.disc(fx, fy, 1.4 * sc, 60, 54, 46, 0.45);
    }

    /* 2. MARKET SQUARE (uniform floor — no busy/empty split) -------------*/
    var sqW = 0.78 * W, sqH = 0.78 * H;
    var sqX = (W - sqW) / 2, sqY = (H - sqH) / 2;
    D.rect(sqX, sqY, sqW, sqH, SQ_FLOOR[0], SQ_FLOOR[1], SQ_FLOOR[2], 1);
    // a few alternating paving rows for subtle ground texture
    for (var pri = 0; pri < 6; pri++) {
      var py = sqY + (pri + 0.5) * sqH / 6;
      D.rect(sqX, py, sqW, 0.008 * H, SQ_FLOOR_2[0], SQ_FLOOR_2[1], SQ_FLOOR_2[2], 0.4);
    }
    // square border
    var bThick = 2.6 * sc;
    SK.line(D, sqX, sqY,             sqX + sqW, sqY,             FRAME, bThick, 0.85);
    SK.line(D, sqX + sqW, sqY,       sqX + sqW, sqY + sqH,       FRAME, bThick, 0.85);
    SK.line(D, sqX + sqW, sqY + sqH, sqX,       sqY + sqH,       FRAME, bThick, 0.85);
    SK.line(D, sqX, sqY + sqH,       sqX,       sqY,             FRAME, bThick, 0.85);

    /* 3. STALL GRID ------------------------------------------------------*/
    var cellW = (sqW - sqW * STALL_PADX * 2) / STALL_COLS;
    var cellH = (sqH - sqH * STALL_PADY * 2) / STALL_ROWS;
    var stallW = STALL_W_FRAC * sqW * 0.8;
    var stallH = STALL_H_FRAC * sqH * 0.8;
    for (var rr = 0; rr < STALL_ROWS; rr++) {
      for (var cc = 0; cc < STALL_COLS; cc++) {
        if (!isStallCell(rr, cc)) continue;
        var c = stallCellCenterFrac(rr, cc);
        var cx = sqX + c[0] * sqW;
        var cy = sqY + c[1] * sqH;
        var col = CANOPIES[(rr * STALL_COLS + cc * 3) % CANOPIES.length];
        var bob = 0.5 + 0.5 * Math.sin(t * 1.4 + rr * 0.7 + cc * 1.3);
        var canCol = [
          SK.lerp(col[0] * 0.92, col[0], bob),
          SK.lerp(col[1] * 0.92, col[1], bob),
          SK.lerp(col[2] * 0.92, col[2], bob)
        ];
        drawStall(D, cx, cy, stallW, stallH, canCol, sc);
        // baskets in front of each stall
        var bx1 = cx - stallW * 0.30;
        var bx2 = cx + stallW * 0.30;
        var by  = cy + stallH * 0.62;
        var bsz = 2.3 * sc;
        var bc1 = BASKET_TONES[(rr + cc) % BASKET_TONES.length];
        var bc2 = BASKET_TONES[(rr + cc * 2 + 1) % BASKET_TONES.length];
        drawBasket(D, bx1, by, bsz, bc1);
        drawBasket(D, bx2, by, bsz, bc2);
      }
    }

    /* 4. LOOSE BASKETS scattered across the whole square ----------------*/
    for (var li = 0; li < LOOSE.length; li++) {
      var lo = LOOSE[li];
      var lx = sqX + lo.sx * sqW;
      var ly = sqY + lo.sy * sqH;
      drawBasket(D, lx, ly, 1.8 * sc * lo.sz, lo.col);
    }

    /* 5. AMBIENT NPCS — progressively exit during the perimeter walk ----*/
    var npcSz = 4.2 * sc;
    for (var n = 0; n < NPCS.length; n++) {
      var p = NPCS[n];
      if (u >= p.exitU + NPC_EXIT_DUR) continue;  // already gone
      var nx, ny, alpha;
      var bobY = Math.sin(t * p.sp + p.ph) * 1.2 * sc;
      if (u < p.exitU) {
        // still shopping — in place with bob
        nx = sqX + p.sx * sqW;
        ny = sqY + p.sy * sqH + bobY;
        alpha = 1;
      } else {
        // walking off toward nearest edge
        var ex = (u - p.exitU) / NPC_EXIT_DUR;       // 0..1
        var eased = SK.easeInOutCubic(ex);
        var srcX = sqX + p.sx * sqW;
        var srcY = sqY + p.sy * sqH;
        var dstX = sqX + p.exitTx * sqW;
        var dstY = sqY + p.exitTy * sqH;
        nx = SK.lerp(srcX, dstX, eased);
        ny = SK.lerp(srcY, dstY, eased) + bobY * (1 - eased);
        alpha = 1 - SK.smoothstep(0.65, 1.0, ex);
      }
      drawNpc(D, nx, ny, p.skin, p.cloth, npcSz * p.sz, alpha);
    }

    /* 6. COUPLE animation -----------------------------------------------*
     *   0.00–0.12  ENTER  : man from LEFT edge, woman from RIGHT edge
     *   0.12–0.22  MEET   : centred, smile emoji rises
     *   0.22–0.28  TO RIM : walk from centre to top-left corner of perimeter
     *   0.28–0.85  4 LAPS : clockwise along the inside perimeter
     *   0.85–0.91  TO MID : walk back to centre
     *   0.91–0.97  HEARTS : at centre, hearts grow above them
     *   0.97–1.00  EXIT   : man exits LEFT, woman exits RIGHT
     * ------------------------------------------------------------------*/

    var cX = sqX + sqW * 0.5;
    var cY = sqY + sqH * 0.5;
    var edgeMargin = sqW * 0.045;
    var insX = sqX + edgeMargin;
    var insR = sqX + sqW - edgeMargin;
    var insY = sqY + edgeMargin;
    var insB = sqY + sqH - edgeMargin;

    // entry / exit anchor points (just outside the square on opposite sides)
    var manEnter = [sqX - sqW * 0.06, cY];   // off LEFT
    var womEnter = [sqX + sqW + sqW * 0.06, cY]; // off RIGHT
    var meetMan  = [cX - 10 * sc, cY];
    var meetWom  = [cX + 10 * sc, cY];

    var mx, my, wx, wy;
    var phaseSmile = 0, phaseHeart = 0;
    var figSz = 8.5 * sc;

    if (u < 0.12) {
      /* ENTER from opposite sides */
      var tr = u / 0.12;
      var e  = SK.easeInOutCubic(tr);
      mx = SK.lerp(manEnter[0], meetMan[0], e);
      my = SK.lerp(manEnter[1], meetMan[1], e);
      wx = SK.lerp(womEnter[0], meetWom[0], e);
      wy = SK.lerp(womEnter[1], meetWom[1], e);
    } else if (u < 0.22) {
      /* MEET — smile emoji */
      var tr2 = (u - 0.12) / 0.10;
      mx = meetMan[0]; my = meetMan[1] + Math.sin(t * 2) * 0.5 * sc;
      wx = meetWom[0]; wy = meetWom[1] + Math.sin(t * 2 + 1) * 0.5 * sc;
      phaseSmile = SK.clamp(SK.smoothstep(0, 0.30, tr2) - SK.smoothstep(0.75, 1.0, tr2), 0, 1);
    } else if (u < 0.28) {
      /* walk from CENTRE → top-left perimeter start */
      var tr3 = (u - 0.22) / 0.06;
      var e3  = SK.easeInOutCubic(tr3);
      var rimX = insX + 10 * sc;        // a hair inside the corner
      var rimY = insY + 10 * sc;
      mx = SK.lerp(meetMan[0], rimX - 6 * sc, e3);
      my = SK.lerp(meetMan[1], rimY - 4 * sc, e3);
      wx = SK.lerp(meetWom[0], rimX + 6 * sc, e3);
      wy = SK.lerp(meetWom[1], rimY + 4 * sc, e3);
    } else if (u < 0.85) {
      /* 4 LAPS around the inside perimeter, side by side */
      var lapU = (u - 0.28) / 0.57;          // 0..1
      var s = lapU * 4;                       // 0..4 (4 full revolutions)
      // smooth wrap into [0,1) for perimeterPos
      var pp = perimeterPos(s, insX, insR, insY, insB);
      var px = pp[0], py = pp[1], theta = pp[2];
      // perpendicular pointing INTO the square (for clockwise walk)
      var perpX = -Math.sin(theta), perpY = Math.cos(theta);
      // push pair centre slightly INSIDE the perimeter
      var pairOff = 11 * sc;
      var pcx = px + perpX * pairOff;
      var pcy = py + perpY * pairOff;
      // man slightly to the OUTER side of the pair, woman INNER (toward centre)
      var sep = 6 * sc;
      mx = pcx - perpX * sep;
      my = pcy - perpY * sep;
      wx = pcx + perpX * sep;
      wy = pcy + perpY * sep;
      // gentle walking bob — out of phase between them
      var step = Math.sin(t * 7) * 0.6 * sc;
      mx += -Math.sin(theta) * 0;  // (no-op placeholder, walk bob kept tiny)
      my += step * 0.5;
      wy -= step * 0.5;
    } else if (u < 0.91) {
      /* walk from top-left rim BACK TO CENTRE together */
      var tr5 = (u - 0.85) / 0.06;
      var e5  = SK.easeInOutCubic(tr5);
      var rimX2 = insX + 10 * sc;
      var rimY2 = insY + 10 * sc;
      mx = SK.lerp(rimX2 - 6 * sc, meetMan[0], e5);
      my = SK.lerp(rimY2 - 4 * sc, meetMan[1], e5);
      wx = SK.lerp(rimX2 + 6 * sc, meetWom[0], e5);
      wy = SK.lerp(rimY2 + 4 * sc, meetWom[1], e5);
    } else if (u < 0.97) {
      /* HEARTS — stationary at centre */
      var tr6 = (u - 0.91) / 0.06;
      mx = meetMan[0]; my = meetMan[1] + Math.sin(t * 2) * 0.5 * sc;
      wx = meetWom[0]; wy = meetWom[1] + Math.sin(t * 2 + 1) * 0.5 * sc;
      phaseHeart = SK.smoothstep(0, 0.45, tr6);
    } else {
      /* EXIT to opposite sides — man LEFT, woman RIGHT */
      var tr7 = (u - 0.97) / 0.03;
      var e7  = SK.easeInQuad(tr7);
      mx = SK.lerp(meetMan[0], manEnter[0], e7);
      my = SK.lerp(meetMan[1], manEnter[1], e7);
      wx = SK.lerp(meetWom[0], womEnter[0], e7);
      wy = SK.lerp(meetWom[1], womEnter[1], e7);
      phaseHeart = 1 - SK.smoothstep(0, 0.6, tr7);
    }

    // soft shadow under each figure
    D.ellipse(mx, my + figSz * 0.95, figSz * 1.4, figSz * 0.55, 0, 20, 14, 8, 0.35);
    D.ellipse(wx, wy + figSz * 0.95, figSz * 1.4, figSz * 0.55, 0, 20, 14, 8, 0.35);

    drawFigure(D, mx, my, SKIN, MAN_HAIR, MAN_SHIRT, figSz);
    drawFigure(D, wx, wy, SKIN, WOM_HAIR, WOM_SHIRT, figSz);

    /* 7. SMILE icon during meeting ---------------------------------------*/
    if (phaseSmile > 0.01) {
      var sxI = (mx + wx) / 2;
      var syI = (my + wy) / 2 - figSz * 2.6;
      smileIcon(D, sxI, syI, 6 * sc, phaseSmile);
    }

    /* 8. HEARTS above the couple after they return to centre -------------*/
    if (phaseHeart > 0.01) {
      var ax = (mx + wx) / 2;
      var ay = (my + wy) / 2 - figSz * 2.4;
      var hearts = [
        { dx: -12 * sc, dy:  2 * sc, sz: 11 * sc, ph: 0.0 },
        { dx:   0,      dy: -8 * sc, sz: 14 * sc, ph: 1.1 },
        { dx:  12 * sc, dy:  3 * sc, sz: 10 * sc, ph: 2.3 }
      ];
      for (var hi = 0; hi < hearts.length; hi++) {
        var hh = hearts[hi];
        var bobH = Math.sin(t * 3 + hh.ph) * 1.8 * sc;
        var fade = SK.clamp(phaseHeart * (0.75 + 0.25 * Math.sin(t * 2.4 + hh.ph)), 0, 1);
        SK.heart(D, ax + hh.dx, ay + hh.dy + bobH, hh.sz, HEART_COL, fade);
      }
    }

    /* 9. CAPTION (lower-right corner of paving) -------------------------*/
    var capStr = 'MARKET';
    var capPx = Math.max(1, Math.round(2 * sc));
    var capW = SK.textWidth(capStr, capPx);
    SK.text(D, W - capW - 8 * sc, H - 12 * sc, capStr, capPx, [230, 220, 200], 0.55);
  }

  return { id: 'market', name: 'meet at market', dur: 16.0, draw: draw };
});
