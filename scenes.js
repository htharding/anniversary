/* ============================================================================
 * scenes.js  —  scene manifest + loader
 *
 * Single source of truth for which scenes exist and in what display order.
 * Each scene lives in scenes/<id>.js as a self-contained UMD module that
 * returns { id, name, dur, draw(D, W, H, u, t) }.
 *
 * Node:    requires every manifest entry and exports the assembled array.
 *          preview.js consumes that directly.
 * Browser: sets up window.registerScene, injects a <script> per manifest
 *          entry, and exposes window.scenesReady (a Promise resolving to
 *          the assembled array in manifest order). index.html waits on
 *          that promise before calling SceneEngine.boot.
 *
 * Add a scene:
 *   1. drop scenes/<id>.js (copy the placeholder for the right UMD shape)
 *   2. append '<id>' to MANIFEST below
 * ==========================================================================*/
(function (root) {
  'use strict';

  var MANIFEST = [
    'placeholder'
  ];

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MANIFEST.map(function (id) { return require('./scenes/' + id + '.js'); });
    return;
  }

  // ---- browser: registry + async script-tag loader ------------------------
  var byId = {};
  root.SCENES = [];
  root.SCENE_MANIFEST = MANIFEST.slice();
  root.registerScene = function (scene) {
    if (!scene || !scene.id) throw new Error('registerScene: scene must have an id');
    byId[scene.id] = scene;
  };

  root.scenesReady = new Promise(function (resolve) {
    if (MANIFEST.length === 0) { resolve(root.SCENES); return; }
    var remaining = MANIFEST.length, missing = [];
    MANIFEST.forEach(function (id) {
      var el = document.createElement('script');
      el.src = 'scenes/' + id + '.js';
      el.onload = function () { if (--remaining === 0) finish(); };
      el.onerror = function () { missing.push(id); if (--remaining === 0) finish(); };
      document.head.appendChild(el);
    });
    function finish() {
      if (missing.length) console.warn('[scenes] failed to load:', missing.join(', '));
      root.SCENES.length = 0;
      MANIFEST.forEach(function (id) { if (byId[id]) root.SCENES.push(byId[id]); });
      resolve(root.SCENES);
    }
  });
})(typeof self !== 'undefined' ? self : this);
