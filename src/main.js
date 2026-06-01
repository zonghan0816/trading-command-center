import { BootScene }   from './scenes/BootScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';

// Phaser 3.60 用 XHR 載入圖片成 blob，再用 blob URL 建 Image
// 攔截 XMLHttpRequest.open — 修正版：顯式傳入修改後的 url
(function() {
  const _ts = Date.now();
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
    if (typeof url === 'string' && url.includes('/assets/') && url.indexOf('?') === -1) {
      url = url + '?v=' + _ts;
    }
    // 顯式展開所有參數，不用 arguments（strict mode 下 arguments 不隨變數更新）
    if (pass !== undefined)      return _open.call(this, method, url, async, user, pass);
    if (user !== undefined)      return _open.call(this, method, url, async, user);
    if (async !== undefined)     return _open.call(this, method, url, async);
    return _open.call(this, method, url);
  };
})();

window.addEventListener('load', () => {
  const config = {
    type: Phaser.AUTO,
    width:  1920,
    height: 1080,
    backgroundColor: '#0e1e30',
    parent: 'game-container',
    pixelArt: false,
    antialias: true,
    scene: [BootScene, OfficeScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
  window._game = new Phaser.Game(config);

});
