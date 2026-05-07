import { BootScene }   from './scenes/BootScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';

window.addEventListener('load', () => {
  const config = {
    type: Phaser.AUTO,
    width:  window.innerWidth,
    height: window.innerHeight - 52,  // 52 = header height
    backgroundColor: '#0e1e30',
    parent: 'game-container',
    pixelArt: true,
    antialias: false,
    scene: [BootScene, OfficeScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
  window._game = new Phaser.Game(config);
});
