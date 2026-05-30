# Stylised Scene System — Authoring Spec

A small framework for building short, looping, **stylised animated scenes** that all
share one visual language (the "calla" look: a colour image resampled as
ASCII / dots / pixels with glitch). You author plain 2-D scenes; the look comes
for free. Scenes are standardised so a gallery can **flip through them** with
`.` (next) and `,` (previous).

This doc is written so another Claude can produce **new scenes of the same
quality** — e.g. the airport, but also people camping, a rollercoaster, two
people lying in bed — and drop them into the same runtime.

---

## 1. The core idea (read this first)

Rendering is **two decoupled stages**:

1. **Scene (you write this)** — draw a normal, full-colour 2-D picture into an
   offscreen **680×680 buffer** using a tiny drawing API `D`.
2. **Styliser (the engine owns this)** — samples that buffer on a grid and
   redraws each cell as an ASCII glyph, a dot, or a pixel-square, sized by the
   cell's **brightness**, plus chromatic glitch slices.

The styliser never knows what the scene is. So **any** subject — a flower, an
airport, a campfire — becomes the same coherent style. Your only job is to draw
a good colour picture and animate it.

**Brightness is the signal.** The styliser maps luminance → glyph/dot size, and
**skips any cell whose r+g+b < 12** (near-black reads as empty space). Compose
with a deliberate brightness hierarchy: bright focal points, mid-tone bodies,
dark/near-black backgrounds for negative space.

---

## 2. Files

| File | Runs in | What it is |
|---|---|---|
| `scene-kit.js` | browser + Node | **SceneKit**: pure math + drawing helpers. Author against this. |
| `scenes/<id>.js` | browser + Node | **One scene per file** (UMD). Each returns `{id,name,dur,draw}`. |
| `scenes.js` | browser + Node | **Manifest + loader.** Holds the display-order list of scene ids; in Node requires them, in the browser injects `<script>` tags and exposes `scenesReady`. |
| `scene-engine.js` | browser only | The **runtime**: p5 D-adapter, styliser, glitch, loader, sequencer + `.`/`,`. |
| `index.html` | browser | Thin harness: loads p5 + the scripts, awaits `scenesReady`, calls `SceneEngine.boot`. |
| `preview.js` | Node | **Headless validator**: renders any scene to PNG (raw + stylised). |

`scene-kit.js`, `scenes.js`, and every `scenes/<id>.js` are environment-agnostic
(UMD) and contain **no** p5/DOM/canvas references — that is what lets
`preview.js` validate them in Node and the browser run them unchanged. Keep it
that way.

---

## 3. Run it, add a scene, controls

**Run:** put all files in one folder and open `index.html` (no server needed;
they are classic scripts). Loads p5 from CDN.

**Controls:** `.` next scene · `,` previous scene · `F` fullscreen · `G` glitch.
(Arrow Right/Left also flip.) Each scene **loops on its own** until you flip.

**Add a scene:** two steps.

1. Create `scenes/<id>.js`. Copy the UMD shape from `scenes/placeholder.js`:

   ```js
   (function (root, factory) {
     if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
     else root.registerScene(factory(root.SceneKit));
   })(typeof self !== 'undefined' ? self : this, function (SK) {
     'use strict';
     function draw(D, W, H, u, t) { /* ... */ }
     return { id: 'rollercoaster', name: 'the drop', dur: 12.0, draw: draw };
   });
   ```

2. Append `'rollercoaster'` to `MANIFEST` in `scenes.js`. Order in the manifest
   is the gallery flip order.

That's it — `.`/`,` navigation is automatic. Don't edit `index.html` or the
engine.

**Validate:** `node preview.js rollercoaster` → writes
`preview_rollercoaster_raw.png` (composition + motion) and
`preview_rollercoaster_styled.png` (the look). `node preview.js` does all scenes.

---

## 4. The scene contract

```js
{
  id:   'airport-sunset',     // stable string id
  name: 'wheels up',          // caption shown in the gallery
  dur:  13.0,                 // seconds for ONE loop (u goes 0 -> 1 over dur)
  draw(D, W, H, u, t) { ... } // render ONE frame
}
```

- **`D`** — the drawing adapter (section 5).
- **`W, H`** — buffer size (always 680×680 in this system, but never hard-code
  680: use `W`/`H` so a scene is resolution-independent).
- **`u`** — scene progress in **[0,1]**. Drive **subject motion** off `u`
  (a plane's takeoff, a cart's descent). Wraps to 0 each loop.
- **`t`** — continuous **seconds**. Drive **ambient life** off `t` (cloud drift,
  fire flicker, a blinking beacon, twinkling stars) so it keeps moving even when
  the subject is between beats.

**Coordinate system:** origin top-left, **+y is down**. Author in W/H-relative
terms (fractions), and derive sizes from `var sc = W / 680;` so line widths,
radii and offsets scale with the buffer.

---

## 5. The drawing adapter `D`

Five primitives. **Colours are 0–255, alpha `a` is 0–1** (default 1), coords in
buffer pixels. Alpha composites over what's already drawn, so **layer order
matters** (painter's algorithm — draw back to front).

```
D.bg(r,g,b)                                 // clear whole buffer (call first)
D.rect(x,y,w,h, r,g,b, a=1)                 // top-left origin
D.disc(x,y,rad, r,g,b, a=1)                 // filled circle, radius
D.ellipse(x,y, rx,ry, ang, r,g,b, a=1)      // rotated ellipse; rx/ry are RADII; ang in radians
D.tri(ax,ay,bx,by,cx,cy, r,g,b, a=1)        // filled triangle
```

Everything (mountains, buildings, planes, fire) is built from these. The
styliser abstracts detail, so you don't need curves or fine geometry — clean
silhouettes + a few bright accents read beautifully.

---

## 6. SceneKit reference (`SK.*`)

**Math**
```
SK.lerp(a,b,t)            SK.clamp(x,a,b)             SK.smoothstep(e0,e1,x)
SK.easeInQuad(x)          SK.easeOutQuad(x)           SK.easeInOutCubic(x)   SK.easeOutCubic(x)
SK.bez(p0,c,p1,s)         SK.bezTan(p0,c,p1,s)        // quadratic bezier point + tangent; p0/c/p1 = [x,y]
SK.rng(seed) -> fn()      // deterministic [0,1); seed ONCE for static randomness (stars, ember offsets)
```

**Subjects**
```
SK.pen(x,y,ang,scl,dir=1) -> P(lx,ly)
   // returns a transform from the subject's LOCAL space (origin at the subject,
   // +x forward, +y down) to world coords, with scale + rotation + mirror.
   // dir=-1 mirrors horizontally (faces left). Build any vehicle/figure as
   // local points and map them with P(...), then draw with D.tri / D.ellipse.
```

**Backgrounds & atmosphere**
```
SK.vGradient(D, W, yEnd, stops, step)
   // vertical multi-stop gradient, y=0..yEnd. stops = [[pos0..1,[r,g,b]], ...]
SK.glow(D, x,y, R, col, opts)            // radial halo + solid core (sun, moon, lamps, markers)
   //   opts.halo = [[radiusMult, alpha], ...]   opts.coreAlpha (default 1)
SK.feather(D, x,y, R, col, a=1)          // one soft disc stack (clouds, haze, soft mass)
SK.blob(D, x,y, R, col, lobes?)          // lumpy organic blob (landmass, foliage)
SK.cloud(D, x,y, w, col, a=0.5)          // soft horizontal cloud cluster, total width w
SK.starfield(D, W, maxY, count, seed, t) // seeded stars up to maxY; pass t to twinkle, null for steady
```

**Terrain**
```
SK.ridge(D, ptsAbs, baseY, col, a=1)         // jagged silhouette under a polyline (absolute pts)
SK.ridgeFrac(D, ptsFrac, W, baseY, col, a=1) // same, pts = [[xFrac(0..1 of W), yFrac(0..1 of baseY)], ...]
```

**Perspective**
```
SK.perspectiveDashes(D, lanes, VP, nearY, W, col, opts)
   // dashed lines fanning from lanes (xFracs at nearY) to vanishing point VP=[x,y].
   // reads as runway/tarmac/road. opts: {dashes,nearW,farW,nearH,farH,alpha,sc}
```

---

## 7. Quality & style playbook

This is what separates a scene that *reads* from one that turns to mush.

1. **Brightness hierarchy.** Decide the 2–3 brightest things (sun, lit windows,
   a glowing marker, fire) — they become the dense glyph clusters the eye lands
   on. Keep large background areas dark; **anything below r+g+b≈12 disappears**,
   which is how you get clean negative space (night sky, deep water).

2. **Layer back-to-front** (painter's order): `bg → sky gradient → celestial
   (sun/moon) → atmospherics (clouds/haze) → far→near scenery → ground →
   midground structures → foreground → the animated subject LAST` so it sits on
   top. Use **atmospheric perspective**: distant masses lighter / lower-contrast,
   near masses darker. (See the three mountain ridges in `airportSunset`.)

3. **Feather soft things.** Suns, clouds, terrain, light pools should have soft
   edges (`SK.feather`, `SK.glow`, `SK.blob`, concentric translucent discs). Hard
   edges dither into harsh boundaries; soft brightness ramps dither beautifully.
   Hard rectangles are right for built/man-made things (buildings, runways).

4. **Perspective.** Converge lines and scale elements toward a vanishing point;
   shrink dash size/spacing with distance (`SK.perspectiveDashes`). Even one
   converging element sells depth.

5. **Subjects = silhouette + accents.** Build planes/people/carts as a clean
   dark silhouette via `SK.pen`, then add 2–4 bright accents (windows, a rim
   light, a cockpit). Don't over-detail — the styliser will eat it. Compose the
   subject in local space (origin at its centre) so you can position, rotate,
   scale and mirror it as one unit.

6. **Motion = eased `u`-phases + ambient `t`.** Break subject motion into a few
   phases with eased interpolation (e.g. roll → rotate → climb), each a slice of
   `u` (`easeInQuad` to accelerate, `easeOutQuad` to settle). Layer continuous
   ambient motion on `t` (drift/flicker/twinkle/pulse) so nothing is ever
   perfectly still.

7. **Palette: limited + warm/cool contrast.** Pick ~5–7 colours. Let a warm
   accent (sun, windows, fire) pop against cool dark masses (mountains, night,
   water). When matching a reference image, sample its actual colours.

8. **Resolution independence.** Positions as fractions of `W`/`H`; sizes via
   `sc = W/680`. Never hard-code 680.

---

## 8. From a Paint sketch / reference image to a scene

The sketch is a **blueprint you read**, not something to trace pixel-for-pixel.

1. **Read the composition.** List the elements and their **back-to-front order**
   and rough positions (as fractions). Note the horizon line.
2. **Pick the palette** by sampling the reference (sky stops, mountain purples,
   warm accents, the subject's silhouette tone).
3. **Block it in, back to front**, using SceneKit helpers for the soft stuff
   (`vGradient`, `glow`, `cloud`, `blob`, `ridgeFrac`) and `D.rect`/`D.tri` for
   built structures. Get a still you like at one `u`.
4. **Add the subject + motion.** Build it with `SK.pen`; define its `u`-phases;
   add `t`-driven ambient life.
5. **Validate headlessly** (`preview.js`), iterate on composition/motion, then
   tune brightness/feathering for the styliser.

---

## 9. Validate headlessly (`preview.js`)

You usually can't open a browser, so validate in Node:

```
node preview.js <id>      # one scene  ->  preview_<id>_raw.png + preview_<id>_styled.png
node preview.js           # all scenes + preview_gallery.png
```

- `*_raw.png` (u = .15/.5/.85) — check **composition and that motion reads**
  (subject in the right place at each beat).
- `*_styled.png` — the **dots** and **pixels** passes; check the look holds and
  bright/dark areas are right. (The ASCII text pass needs a real canvas, so it
  isn't in the headless preview, but the engine cycles all three.)

Iterate: render → view → adjust constants → repeat, before wiring into the
gallery. This is exactly how the airport scene was tuned.

---

## 10. Worked examples (in `scenes.js`)

- **`airportSunset`** — the canonical template. Note the order: sky gradient →
  sun `glow` → drifting `cloud`s → three `ridgeFrac` ranges (light→dark for
  depth) → ground → `perspectiveDashes` tarmac → terminal (rects + a row of lit
  window rects) → light poles → control tower (triangles + a `t`-blinking
  beacon) → **jet last**, in three eased `u`-phases (roll / rotate / climb). The
  jet is a `SK.pen` silhouette.
- **`flyover`** — top-down. Dark base + brightness-driven water/landmass texture;
  a marker flies a **bezier arc** (`SK.bez`) with the little plane **heading
  along the tangent** (`SK.bezTan`) and a comet trail of fading discs.
- **`camping`** — a completely different palette/subject: night `vGradient`,
  twinkling `starfield`, moon `glow`, dark ridges, a tent (triangles), two
  seated figures, and a `campfire` (flickering triangle tongues + glow) with
  **rising embers** (seeded offsets + `t` progress). A shooting star streaks once
  per loop, gated on `u`. Use it as the model for a new subject + custom
  particle-ish effect.

---

## 11. Gotchas / footguns

- **Mirror pitch sign.** With `SK.pen(..., dir=-1)` (subject faces left), a
  **positive** `ang` lifts the nose **up**; a right-facing subject uses the
  opposite sign. (This exact bug made the airport jet climb nose-down once.)
- **Too dark → vanishes.** If something must be visible, keep its r+g+b above
  ~12; very dark silhouettes need a non-black tone (e.g. `[34,28,50]`).
- **Hard edges on soft things** dither harshly — feather suns/clouds/terrain.
- **Keep scenes pure.** No p5, DOM, `window`, canvas, or `localStorage` inside
  any `scenes/<id>.js`, `scenes.js`, or `scene-kit.js`, or the Node validator
  breaks. The engine calls `buf.loadPixels()` for you — don't.
- **Files together; classic scripts.** Open `index.html` with the `.js` files in
  the same folder. They're classic `<script src>` (intentionally **not** ES
  modules, which `file://` blocks).
- **Performance.** Cost scales with `680/grid` cells; the engine breathes grid
  4–14. Heavy scenes (hundreds of discs/frame) are fine, but avoid per-pixel
  loops in a scene — use the primitives.

---

## 12. New-scene checklist

- [ ] `draw(D,W,H,u,t)` defined in `scenes/<id>.js`, returned as `{id,name,dur,draw}`; id appended to `MANIFEST` in `scenes.js`.
- [ ] Drawn **back to front**; bg via `D.bg` first.
- [ ] Clear brightness hierarchy; backgrounds near-black for negative space.
- [ ] Soft things feathered; built things crisp.
- [ ] Subject built with `SK.pen`; motion in eased `u`-phases; ambient on `t`.
- [ ] W/H-relative positions; sizes via `sc = W/680`.
- [ ] Looks right in `preview.js` (raw **and** styled), then flips cleanly with `.`/`,`.
