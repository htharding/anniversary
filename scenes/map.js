/* ============================================================================
 * scenes/map.js — top-down US map, plane tracing an arc from MD to WI.
 * Composition matches sceneRefs/scene2Map.png.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  // Scale fractional polygon points into absolute buffer coords each frame.
  function scalePts(pts, W, H) {
    var out = new Array(pts.length);
    for (var i = 0; i < pts.length; i++) out[i] = [pts[i][0] * W, pts[i][1] * H];
    return out;
  }

  /* ------------------------------------------------------------------------
   * Continental US perimeter (clockwise, y-down), characteristic features:
   *   Pacific NW + Olympic peninsula, Canada border, MN arrowhead, Lake
   *   Erie south shore bulge, Maine NE jut, Cape Cod + Long Island hints,
   *   Chesapeake taper, narrow Florida peninsula, MS delta dip, Brownsville
   *   TX tip, Mexico border NW, CA bend (LA → SF → Cape Mendocino).
   * ----------------------------------------------------------------------*/
  var US_PTS = [
    // ---- Pacific NW (Olympic Peninsula → Strait of Juan de Fuca → Canada) ----
    [0.075, 0.310], [0.078, 0.292], [0.084, 0.273], [0.092, 0.253],
    [0.100, 0.235], [0.110, 0.220], [0.125, 0.212],
    // ---- Canada border (~49°N), mostly flat going east ----
    [0.160, 0.209], [0.200, 0.207], [0.245, 0.205], [0.290, 0.203],
    [0.335, 0.201], [0.380, 0.199], [0.420, 0.197],
    // ---- Minnesota arrowhead (subtle bump) ----
    [0.460, 0.194], [0.485, 0.188], [0.498, 0.176], [0.515, 0.183],
    [0.530, 0.192],
    // ---- WI / UP Michigan / Lake Superior shoreline ----
    [0.548, 0.205], [0.565, 0.213], [0.583, 0.218], [0.605, 0.220],
    // ---- UP MI east / Lake Huron / Lake Erie south shore ----
    [0.625, 0.225], [0.642, 0.232], [0.658, 0.243], [0.670, 0.255],
    [0.680, 0.265], [0.695, 0.258], [0.710, 0.250],
    // ---- Upstate NY / PA top ----
    [0.722, 0.240], [0.735, 0.228], [0.748, 0.218], [0.762, 0.210],
    [0.775, 0.205],
    // ---- Maine (prominent NE jut) ----
    [0.790, 0.198], [0.805, 0.190], [0.820, 0.198], [0.832, 0.215],
    [0.838, 0.233], [0.835, 0.250], [0.828, 0.265], [0.818, 0.278],
    // ---- NH / MA coast + Cape Cod hook ----
    [0.808, 0.288], [0.798, 0.295], [0.808, 0.302], [0.802, 0.312],
    [0.792, 0.315],
    // ---- Long Island ----
    [0.798, 0.322], [0.808, 0.328], [0.798, 0.332], [0.788, 0.336],
    // ---- NJ / DE coast ----
    [0.790, 0.348], [0.793, 0.365], [0.798, 0.380], [0.800, 0.395],
    // ---- DE / MD outer coast ----
    [0.796, 0.405], [0.798, 0.418], [0.790, 0.425],
    // ---- VA / NC outer banks (bulge) ----
    [0.782, 0.435], [0.775, 0.448], [0.770, 0.460], [0.772, 0.473],
    [0.765, 0.485],
    // ---- SC / GA coast ----
    [0.758, 0.498], [0.753, 0.512], [0.748, 0.528], [0.745, 0.545],
    [0.743, 0.562], [0.742, 0.578],
    // ---- FL east coast (going south) ----
    [0.745, 0.598], [0.750, 0.622], [0.754, 0.648], [0.756, 0.672],
    [0.756, 0.695], [0.752, 0.718], [0.745, 0.737],
    // ---- FL tip + Keys curve ----
    [0.732, 0.745], [0.718, 0.742], [0.708, 0.732], [0.703, 0.715],
    // ---- FL west coast (going up) ----
    [0.702, 0.695], [0.703, 0.675], [0.706, 0.660],
    // ---- FL panhandle east shoulder ----
    [0.698, 0.654], [0.685, 0.651],
    // ---- AL / MS / LA Gulf coast (with MS delta dip) ----
    [0.670, 0.655], [0.655, 0.658], [0.640, 0.660], [0.620, 0.662],
    [0.600, 0.665], [0.580, 0.668], [0.563, 0.672], [0.550, 0.682],
    [0.542, 0.690], [0.532, 0.683], [0.520, 0.676],
    // ---- TX coast (going SW to Brownsville) ----
    [0.502, 0.670], [0.483, 0.668], [0.462, 0.670], [0.442, 0.675],
    [0.422, 0.682], [0.402, 0.690], [0.382, 0.695], [0.365, 0.698],
    // ---- Rio Grande / Mexico border NW ----
    [0.348, 0.690], [0.332, 0.678], [0.318, 0.663], [0.302, 0.648],
    [0.282, 0.633], [0.260, 0.620], [0.235, 0.610], [0.208, 0.602],
    // ---- CA south coast (San Diego) ----
    [0.180, 0.598], [0.155, 0.593], [0.135, 0.587], [0.118, 0.578],
    // ---- CA west coast (LA → SF → Cape Mendocino → OR) ----
    [0.108, 0.563], [0.100, 0.545], [0.094, 0.525], [0.088, 0.500],
    [0.083, 0.478], [0.079, 0.453], [0.075, 0.430], [0.080, 0.408],
    [0.075, 0.385], [0.072, 0.360], [0.070, 0.335]
  ];
  var US_TRIS = SK.triangulate(US_PTS);

  // Lower Michigan peninsula — drawn AFTER the Great Lakes so the mitten
  // shape pops between Lake Michigan (west) and Lake Huron (east).
  var MI_LP_PTS = [
    [0.608, 0.250], [0.628, 0.245], [0.648, 0.248], [0.658, 0.260],
    [0.662, 0.275], [0.658, 0.290], [0.650, 0.310], [0.628, 0.315],
    [0.612, 0.305], [0.605, 0.285], [0.605, 0.265]
  ];
  var MI_LP_TRIS = SK.triangulate(MI_LP_PTS);

  // Wisconsin — south of Lake Superior, west of Lake Michigan, with the
  // Door peninsula hinted on the upper-east corner.
  var WI_PTS = [
    [0.508, 0.260], [0.555, 0.258], [0.575, 0.260], [0.586, 0.275],
    [0.583, 0.305], [0.555, 0.310], [0.512, 0.297]
  ];
  var WI_TRIS = SK.triangulate(WI_PTS);

  // Maryland — east-coast state straddling the Chesapeake.
  var MD_PTS = [
    [0.748, 0.395], [0.788, 0.388], [0.797, 0.402], [0.778, 0.413], [0.756, 0.408]
  ];
  var MD_TRIS = SK.triangulate(MD_PTS);

  // Alaska perimeter
  var AK_BASE = [
    [-0.055, -0.040], [-0.030, -0.060], [0.030, -0.055], [0.060, -0.025],
    [0.075,  0.015], [ 0.050,  0.045], [0.020,  0.055], [-0.020, 0.050],
    [-0.050,  0.025], [-0.072, -0.010]
  ];
  var AK_TRIS = SK.triangulate(AK_BASE);

  /* ------------------------------------------------------------------------
   * Great Lakes — geographically positioned. Order doesn't matter (all
   * the same blue). Lake Michigan is tall+narrow, Lake Huron rounder,
   * Lake Superior the largest (horizontal), Erie horizontal, Ontario small.
   * ----------------------------------------------------------------------*/
  var LAKES = [
    // [cx, cy, rx, ry, angle]
    [0.552, 0.232, 0.052, 0.018, -0.10],  // Superior
    [0.595, 0.278, 0.012, 0.038,  0.05],  // Michigan
    [0.665, 0.275, 0.020, 0.024,  0.15],  // Huron
    [0.683, 0.305, 0.028, 0.011, -0.05],  // Erie
    [0.722, 0.290, 0.018, 0.008,  0.00]   // Ontario
  ];

  /* ------------------------------------------------------------------------
   * State borders — ~55 line segments approximating the visible boundaries
   * on the reference. Coords are fractional W/H. Drawn as thin rotated
   * ellipses (long+thin) so they survive the styliser as map-style lines.
   * ----------------------------------------------------------------------*/
  var BORDERS = [
    // ---- Pacific NW & mountain west ----
    [0.155, 0.210, 0.155, 0.275],   // WA/ID (vertical)
    [0.102, 0.275, 0.155, 0.275],   // WA/OR
    [0.155, 0.275, 0.215, 0.345],   // OR/ID (angled)
    [0.103, 0.345, 0.215, 0.345],   // OR/CA
    [0.215, 0.345, 0.198, 0.495],   // CA/NV (angled)
    [0.198, 0.495, 0.235, 0.575],   // CA/AZ (angled)
    [0.235, 0.345, 0.235, 0.495],   // NV/UT
    [0.198, 0.495, 0.235, 0.495],   // NV/AZ (short)
    [0.235, 0.495, 0.285, 0.495],   // UT/AZ
    [0.285, 0.495, 0.285, 0.575],   // AZ/NM
    [0.285, 0.345, 0.285, 0.420],   // UT/CO
    [0.215, 0.420, 0.320, 0.420],   // WY/CO + edge of UT/WY
    [0.235, 0.495, 0.320, 0.495],   // CO/NM
    [0.320, 0.420, 0.320, 0.495],   // CO/KS
    [0.320, 0.495, 0.320, 0.575],   // NM/TX panhandle east edge
    [0.285, 0.575, 0.342, 0.625],   // NM/TX south + west TX
    [0.205, 0.300, 0.320, 0.300],   // MT/WY
    [0.155, 0.210, 0.205, 0.300],   // ID/MT angled
    [0.320, 0.300, 0.320, 0.420],   // WY/SD + WY/NE
    [0.345, 0.210, 0.345, 0.300],   // ND/MT

    // ---- Northern plains ----
    [0.320, 0.300, 0.420, 0.300],   // ND/SD
    [0.320, 0.395, 0.420, 0.395],   // SD/NE
    [0.320, 0.420, 0.420, 0.420],   // NE/KS
    [0.320, 0.495, 0.420, 0.495],   // KS/OK
    [0.320, 0.525, 0.455, 0.525],   // OK/TX (Red River, simplified)

    // ---- Central US / Mississippi area ----
    [0.420, 0.210, 0.420, 0.300],   // ND/MN
    [0.420, 0.300, 0.495, 0.300],   // SD/MN + MN/IA
    [0.420, 0.420, 0.500, 0.420],   // IA/MO
    [0.420, 0.495, 0.510, 0.495],   // MO/AR
    [0.420, 0.420, 0.420, 0.495],   // KS/MO
    [0.495, 0.210, 0.495, 0.300],   // MN/WI
    [0.495, 0.300, 0.508, 0.315],   // WI/MN southern (river)
    [0.495, 0.315, 0.583, 0.318],   // WI/IL
    [0.508, 0.315, 0.508, 0.420],   // IA/IL (Mississippi)
    [0.510, 0.420, 0.530, 0.460],   // IL/MO (lower Miss)

    // ---- Eastern midwest ----
    [0.595, 0.318, 0.595, 0.450],   // IL/IN
    [0.595, 0.318, 0.640, 0.315],   // IN/MI south of Lake Mich
    [0.660, 0.318, 0.660, 0.420],   // IN/OH
    [0.530, 0.460, 0.660, 0.420],   // KY/IL+IN+OH (Ohio river curve)
    [0.510, 0.460, 0.665, 0.460],   // KY/TN
    [0.510, 0.495, 0.555, 0.495],   // TN/AR+MS
    [0.555, 0.495, 0.610, 0.495],   // TN/AL
    [0.610, 0.495, 0.665, 0.495],   // TN/GA

    // ---- South ----
    [0.455, 0.525, 0.455, 0.675],   // TX/LA
    [0.455, 0.555, 0.510, 0.555],   // AR/LA
    [0.510, 0.495, 0.510, 0.555],   // AR/MS
    [0.555, 0.495, 0.555, 0.625],   // MS/AL
    [0.510, 0.555, 0.555, 0.625],   // LA/MS coastal
    [0.610, 0.495, 0.610, 0.625],   // AL/GA
    [0.555, 0.625, 0.660, 0.625],   // AL/FL panhandle
    [0.660, 0.625, 0.748, 0.620],   // GA/FL

    // ---- Southeast atlantic ----
    [0.665, 0.460, 0.720, 0.475],   // TN/NC
    [0.665, 0.495, 0.745, 0.555],   // GA/SC (angled)
    [0.665, 0.475, 0.755, 0.515],   // SC/NC (angled, parallel)
    [0.665, 0.460, 0.785, 0.430],   // NC/VA
    [0.610, 0.460, 0.665, 0.460],   // VA/KY
    [0.610, 0.420, 0.665, 0.405],   // VA/WV/KY area
    [0.660, 0.395, 0.660, 0.420],   // OH/WV
    [0.660, 0.395, 0.748, 0.395],   // WV/PA (Mason-Dixon segment)

    // ---- Mid-Atlantic / NE ----
    [0.660, 0.275, 0.660, 0.395],   // OH/PA
    [0.683, 0.275, 0.795, 0.275],   // PA/NY
    [0.790, 0.340, 0.790, 0.385],   // PA/NJ
    [0.748, 0.395, 0.790, 0.395],   // PA/MD+DE
    [0.748, 0.418, 0.785, 0.418],   // MD/VA (south of Potomac)
    [0.797, 0.395, 0.797, 0.418],   // MD/DE
    [0.780, 0.345, 0.790, 0.340],   // NJ/NY (short)

    // ---- New England ----
    [0.778, 0.305, 0.798, 0.305],   // CT/MA + NY/CT
    [0.778, 0.275, 0.798, 0.275],   // MA/NH + MA/VT
    [0.778, 0.230, 0.778, 0.275],   // VT/NH
    [0.795, 0.225, 0.798, 0.275],   // NH/ME
    [0.768, 0.225, 0.778, 0.230]    // VT/NY corner
  ];

  function draw(D, W, H, u, t) {
    var sc = W / 680;
    var land = [108, 180, 95];
    var orange = [232, 132, 58];
    var lake = [88, 162, 205];
    var wave = [200, 228, 240];

    /* 1. OCEAN — vertical blue gradient ------------------------------------*/
    SK.vGradient(D, W, H, [
      [0, [108, 178, 218]],
      [0.5, [78, 150, 205]],
      [1, [55, 128, 185]]
    ], Math.round(4 * sc));

    /* 2. WAVE CONTOURS -----------------------------------------------------*/
    function waveLine(yBase, amp, period, phase, a) {
      var step = 0.018 * W;
      for (var x = -step; x < W + step; x += step) {
        var y = yBase + Math.sin((x / period) + phase) * amp;
        D.rect(x, y, step * 1.05, 1.8 * sc, wave[0], wave[1], wave[2], a);
      }
    }
    waveLine(0.055 * H, 0.008 * H, 0.16 * W, t * 0.40,        0.45);
    waveLine(0.115 * H, 0.008 * H, 0.14 * W, t * 0.50 + 1.30, 0.40);
    waveLine(0.170 * H, 0.008 * H, 0.15 * W, t * 0.35 + 0.50, 0.34);
    waveLine(0.480 * H, 0.006 * H, 0.12 * W, t * 0.40 + 3.00, 0.30);
    waveLine(0.835 * H, 0.008 * H, 0.15 * W, t * 0.30 + 2.10, 0.42);
    waveLine(0.900 * H, 0.008 * H, 0.13 * W, t * 0.45 + 0.70, 0.40);
    waveLine(0.955 * H, 0.008 * H, 0.15 * W, t * 0.40 + 1.80, 0.34);

    /* 3. CONTINENTAL US ----------------------------------------------------*/
    SK.fillPoly(D, scalePts(US_PTS, W, H), US_TRIS, land);

    /* 4. GREAT LAKES — overlay blue ellipses on the upper midwest ---------*/
    for (var li = 0; li < LAKES.length; li++) {
      var L = LAKES[li];
      D.ellipse(L[0] * W, L[1] * H, L[2] * W, L[3] * H, L[4], lake[0], lake[1], lake[2], 1);
    }

    /* 5. LOWER MICHIGAN — drawn after lakes to form the mitten -------------*/
    SK.fillPoly(D, scalePts(MI_LP_PTS, W, H), MI_LP_TRIS, land);

    /* 6. ALASKA + panhandle -----------------------------------------------*/
    var akCx = 0.10 * W, akCy = 0.81 * H;
    var akPtsAbs = AK_BASE.map(function (p) { return [akCx + p[0] * W, akCy + p[1] * H]; });
    SK.fillPoly(D, akPtsAbs, AK_TRIS, land);
    D.tri(akCx + 0.060 * W, akCy + 0.020 * H, akCx + 0.125 * W, akCy + 0.060 * H,
          akCx + 0.070 * W, akCy + 0.050 * H, land[0], land[1], land[2], 1);

    /* 7. HAWAII — chain of small discs -------------------------------------*/
    for (var hi = 0; hi < 6; hi++) {
      D.disc(0.21 * W + hi * 0.014 * W, 0.83 * H + hi * 0.008 * H,
             (4.2 - hi * 0.4) * sc, land[0], land[1], land[2], 1);
    }

    /* 8. WISCONSIN highlighted (orange) ------------------------------------*/
    SK.fillPoly(D, scalePts(WI_PTS, W, H), WI_TRIS, orange);

    /* 9. MARYLAND highlighted (orange) -------------------------------------*/
    SK.fillPoly(D, scalePts(MD_PTS, W, H), MD_TRIS, orange);

    /* 10. STATE BORDERS — drawn over land so they show across all states --*/
    var borderCol = [255, 255, 255], borderThick = 0.6 * sc;
    for (var bi = 0; bi < BORDERS.length; bi++) {
      var b = BORDERS[bi];
      SK.line(D, b[0] * W, b[1] * H, b[2] * W, b[3] * H, borderCol, borderThick, 0.55);
    }

    /* 11. WHITE ARC from MD to WI ------------------------------------------*/
    var P0 = [0.770 * W, 0.402 * H];   // MD
    var P1 = [0.548 * W, 0.287 * H];   // WI
    var Cp = [0.660 * W, 0.160 * H];

    for (var s = 0; s <= 1.0001; s += 0.008) {
      var ap = SK.bez(P0, Cp, P1, s);
      D.disc(ap[0], ap[1], 3.0 * sc, 255, 255, 255, 0.95);
    }

    /* 12. COMET TRAIL ------------------------------------------------------*/
    var u2 = SK.easeInOutCubic(SK.clamp(u, 0, 1)) * 0.94 + 0.03;
    for (var k = 8; k >= 1; k--) {
      var sp = SK.clamp(u2 - k * 0.013, 0, 1);
      var tp = SK.bez(P0, Cp, P1, sp);
      var f = 1 - k / 9;
      D.disc(tp[0], tp[1], (2.5 + 4.5 * f) * sc, 255, 235, 180, 0.10 + 0.30 * f);
    }

    /* 13. PLANE MARKER + arrow head ---------------------------------------*/
    var M = SK.bez(P0, Cp, P1, u2);
    SK.glow(D, M[0], M[1], 4.0 * sc, [255, 255, 240], { halo: [[2.6, 0.35], [1.6, 0.65]] });
    var T = SK.bezTan(P0, Cp, P1, u2);
    var ang = Math.atan2(T[1], T[0]);
    var P = SK.pen(M[0], M[1], ang, sc, 1);
    var L = 10;
    var a1 = P(1.7 * L, 0), a2 = P(-0.9 * L, 0.9 * L), a3 = P(-0.9 * L, -0.9 * L);
    D.tri(a1[0], a1[1], a2[0], a2[1], a3[0], a3[1], 255, 255, 245, 1);
  }

  return { id: 'map', name: 'maryland → wisconsin', dur: 9.0, draw: draw };
});
