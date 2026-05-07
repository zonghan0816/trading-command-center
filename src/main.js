import { BootScene }   from './scenes/BootScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';

const container = document.getElementById('game-container');

const config = {
  type: Phaser.AUTO,
  width:  container.clientWidth  || 1200,
  height: container.clientHeight || 650,
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
