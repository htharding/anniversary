/* ============================================================================
 * preview.js  —  headless validation tool (Node)
 *
 * Renders any registered scene without a browser, two ways:
 *   • raw 3-up   : the colour buffer at u = .15 / .5 / .85 (composition + motion)
 *   • styled 3-up: the calla DOTS, PIXELS and ASCII passes at u = .85 (the look).
 *                  ASCII is approximated by stamping the SK 5x7 bitmap font for
 *                  each cell — close enough to the browser's real-text pass to
 *                  validate legibility without opening the engine.
 *
 * Usage:
 *   node preview.js            # render every scene
 *   node preview.js camping    # render just one scene id
 * ==========================================================================*/
var zlib = require('zlib'), fs = require('fs');
var SCENES = require('./scenes.js');
var SK = require('./scene-kit.js');

/* ---- D adapter over an RGB byte buffer (matches the D contract) ----------*/
function makeD(fb, S) {
  function blend(i, r, g, b, a) { fb[i] = fb[i] * (1 - a) + r * a; fb[i + 1] = fb[i + 1] * (1 - a) + g * a; fb[i + 2] = fb[i + 2] * (1 - a) + b * a; }
  return {
    bg: function (r, g, b) { for (var i = 0; i < S * S; i++) { fb[i * 3] = r; fb[i * 3 + 1] = g; fb[i * 3 + 2] = b; } },
    rect: function (x, y, w, h, r, g, b, a) { if (a == null) a = 1; var x0 = Math.max(0, Math.floor(x)), x1 = Math.min(S, Math.ceil(x + w)), y0 = Math.max(0, Math.floor(y)), y1 = Math.min(S, Math.ceil(y + h)); for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) blend((yy * S + xx) * 3, r, g, b, a); },
    disc: function (cx, cy, rad, r, g, b, a) { if (a == null) a = 1; var x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(S, Math.ceil(cx + rad)), y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(S, Math.ceil(cy + rad)), r2 = rad * rad; for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) { var dx = xx - cx + 0.5, dy = yy - cy + 0.5; if (dx * dx + dy * dy <= r2) blend((yy * S + xx) * 3, r, g, b, a); } },
    ellipse: function (cx, cy, rx, ry, ang, r, g, b, a) { if (a == null) a = 1; var c = Math.cos(-ang), s = Math.sin(-ang), R = Math.max(rx, ry), x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(S, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(S, Math.ceil(cy + R)); for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) { var dx = xx - cx + 0.5, dy = yy - cy + 0.5, lx = dx * c - dy * s, ly = dx * s + dy * c; if ((lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1) blend((yy * S + xx) * 3, r, g, b, a); } },
    tri: function (ax, ay, bx, by, cx, cy, r, g, b, a) { if (a == null) a = 1; var minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(S - 1, Math.ceil(Math.max(ax, bx, cx))), miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(S - 1, Math.ceil(Math.max(ay, by, cy))), d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) return; for (var yy = miny; yy <= maxy; yy++) for (var xx = minx; xx <= maxx; xx++) { var px = xx + 0.5, py = yy + 0.5, w1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, w2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d, w3 = 1 - w1 - w2; if (w1 >= 0 && w2 >= 0 && w3 >= 0) blend((yy * S + xx) * 3, r, g, b, a); } }
  };
}

/* ---- the calla DOTS / PIXELS passes (mode 1 / 2 of the real stylizer) -----*/
function stylise(src, S, gEff, mode, out) {
  for (var i = 0; i < S * S * 3; i++) out[i] = 0;
  var half = gEff * 0.5;
  function setDisc(cx, cy, rad, r, g, b) { var x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(S, Math.ceil(cx + rad)), y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(S, Math.ceil(cy + rad)), r2 = rad * rad; for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) { var dx = xx - cx + 0.5, dy = yy - cy + 0.5; if (dx * dx + dy * dy <= r2) { var i = (yy * S + xx) * 3; out[i] = r; out[i + 1] = g; out[i + 2] = b; } } }
  function setRect(cx, cy, side, r, g, b) { var x0 = Math.max(0, Math.floor(cx - side / 2)), x1 = Math.min(S, Math.ceil(cx + side / 2)), y0 = Math.max(0, Math.floor(cy - side / 2)), y1 = Math.min(S, Math.ceil(cy + side / 2)); for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) { var i = (yy * S + xx) * 3; out[i] = r; out[i + 1] = g; out[i + 2] = b; } }
  for (var sy = 0; sy < S; sy += gEff) for (var sx = 0; sx < S; sx += gEff) {
    var idx = (sy * S + sx) * 3, r = src[idx], g = src[idx + 1], b = src[idx + 2];
    if (r + g + b < 12) continue;
    var bright = r * 0.299 + g * 0.587 + b * 0.114, cx = sx + half, cy = sy + half;
    if (mode === 1) { var d = gEff * (0.25 + bright * 0.0030); setDisc(cx, cy, d / 2, r, g, b); }
    else setRect(cx, cy, gEff * 0.93, r, g, b);
  }
}

/* ---- ASCII pass: stamp SK._font glyphs density-ordered by brightness ------*
 * The engine uses native canvas text; here we approximate by drawing the
 * SK 5x7 bitmap for the chosen glyph. Chars are ordered sparse→dense so
 * brightness maps to ink coverage (dark cells → '.', bright cells → 'M').
 * Only chars present in SK._font are used.                                   */
function styliseAscii(src, S, gEff, out) {
  for (var i = 0; i < S * S * 3; i++) out[i] = 0;
  var chars = " .,:-IJLO0BM".split('');
  var charsN = chars.length;
  // Glyph footprint scales with the cell, but always >= 1 buffer-pixel per
  // bitmap pixel so glyphs are at least faintly visible.
  var pxSize = Math.max(1, Math.floor(gEff / 6));
  var charW = 5 * pxSize, charH = 7 * pxSize;
  for (var sy = 0; sy < S; sy += gEff) {
    for (var sx = 0; sx < S; sx += gEff) {
      var idx = (sy * S + sx) * 3;
      var r = src[idx], g = src[idx + 1], b = src[idx + 2];
      if (r + g + b < 12) continue;
      var bright = r * 0.299 + g * 0.587 + b * 0.114;
      var b01 = bright / 255;
      var ci = Math.floor(b01 * (charsN - 1)) + (((sx * 7 + sy * 13) & 1));
      if (ci < 0) ci = 0; else if (ci >= charsN) ci = charsN - 1;
      var ch = chars[ci];
      var glyph = SK._font[ch] || SK._font[' '];
      var ox = sx + Math.floor((gEff - charW) / 2);
      var oy = sy + Math.floor((gEff - charH) / 2);
      for (var row = 0; row < 7; row++) {
        var bits = glyph[row];
        for (var c = 0; c < 5; c++) {
          if (!(bits & (1 << (4 - c)))) continue;
          var px0 = ox + c * pxSize, py0 = oy + row * pxSize;
          for (var py = 0; py < pxSize; py++) {
            var yy = py0 + py; if (yy < 0 || yy >= S) continue;
            for (var px = 0; px < pxSize; px++) {
              var xx = px0 + px; if (xx < 0 || xx >= S) continue;
              var oi = (yy * S + xx) * 3;
              out[oi] = r; out[oi + 1] = g; out[oi + 2] = b;
            }
          }
        }
      }
    }
  }
}

/* ---- PNG encoder ---------------------------------------------------------*/
function crc32(buf) { var c = ~0; for (var i = 0; i < buf.length; i++) { c ^= buf[i]; for (var k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(type, data) { var len = Buffer.alloc(4); len.writeUInt32BE(data.length); var cd = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cd)); return Buffer.concat([len, cd, crc]); }
function writePNG(fb, W, H, path) {
  var raw = Buffer.alloc(H * (W * 3 + 1));
  for (var y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (var x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = fb[y * W * 3 + x]; }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/* ---- render ---------------------------------------------------------------*/
var S = 460;
function frame(scene, u) { var fb = new Uint8Array(S * S * 3); scene.draw(makeD(fb, S), S, S, u, 2.0); return fb; }
function row(frames, cols) { var sheet = new Uint8Array(cols * S * S * 3); frames.forEach(function (fb, ci) { for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) { var si = (y * S + x) * 3, di = (y * (cols * S) + ci * S + x) * 3; sheet[di] = fb[si]; sheet[di + 1] = fb[si + 1]; sheet[di + 2] = fb[si + 2]; } }); return sheet; }

var only = process.argv[2];
var list = only ? SCENES.filter(function (s) { return s.id === only; }) : SCENES;
if (!list.length) { console.log('no scene matched "' + only + '". ids:', SCENES.map(function (s) { return s.id; }).join(', ')); process.exit(1); }

list.forEach(function (sc) {
  writePNG(row([frame(sc, 0.15), frame(sc, 0.5), frame(sc, 0.85)], 3), 3 * S, S, 'preview_' + sc.id + '_raw.png');
  var base = frame(sc, 0.85);
  var dots = new Uint8Array(S * S * 3), pix = new Uint8Array(S * S * 3), asc = new Uint8Array(S * S * 3);
  stylise(base, S, 5, 1, dots);
  stylise(base, S, 4, 2, pix);
  styliseAscii(base, S, 5, asc);
  writePNG(row([dots, pix, asc], 3), 3 * S, S, 'preview_' + sc.id + '_styled.png');
  console.log('rendered', sc.id, '-> preview_' + sc.id + '_raw.png, preview_' + sc.id + '_styled.png');
});
// quick gallery: one mid-frame per scene in a row (skipped in single-scene mode
// so parallel scene authors don't race on the gallery file).
if (!only) {
  writePNG(row(SCENES.map(function (s) { return frame(s, 0.5); }), SCENES.length), SCENES.length * S, S, 'preview_gallery.png');
  console.log('gallery -> preview_gallery.png');
}
