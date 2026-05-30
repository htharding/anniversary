/* ============================================================================
 * scenes/placeholder.js — a minimal scene proving the per-file loader works.
 *
 * UMD shape every scene file should follow:
 *   - Node:    module.exports = factory(require('../scene-kit.js'))
 *   - Browser: root.registerScene(factory(root.SceneKit))
 * Add this file's id to the manifest in scenes.js. Order in the manifest =
 * order in the gallery flip-through.
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../scene-kit.js'));
  else root.registerScene(factory(root.SceneKit));
})(typeof self !== 'undefined' ? self : this, function (SK) {
  'use strict';

  function draw(D, W, H, u, t) {
    var sc = W / 680;
    SK.vGradient(D, W, H, [[0, [12, 14, 30]], [1, [40, 30, 60]]], Math.round(4 * sc));
    SK.starfield(D, W, H * 0.85, 90, 42, t);
    var cx = SK.lerp(0.2, 0.8, u) * W, cy = (0.55 + 0.05 * Math.sin(t * 1.6)) * H;
    SK.glow(D, cx, cy, 0.05 * W, [255, 220, 160], { halo: [[2.4, 0.18], [1.5, 0.4]] });
  }

  return { id: 'placeholder', name: 'placeholder', dur: 6.0, draw: draw };
});
