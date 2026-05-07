export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // 顯示載入文字（確認 Phaser 有在跑）
    this.add.text(
      this.scale.width / 2, this.scale.height / 2,
      'Loading...', { color: '#00E5FF', fontSize: '18px', fontFamily: 'Consolas' }
    ).setOrigin(0.5);
  }

  create() {
    try {
      this._makeTiles();
      this._makeDesk();
      this._makeChair();
      this._makeMonitor();
      this._makeCharacters();
      this._makeBubble();
      this._makeParticle();
    } catch(e) {
      console.error('BootScene error:', e);
    }
    this.scene.start('OfficeScene');
  }

  // ── 畫菱形路徑（等角地板磚）─────────────────────────────────
  _diamond(g, x, y, w, h) {
    g.beginPath();
    g.moveTo(x + w/2, y);
    g.lineTo(x + w,   y + h/2);
    g.lineTo(x + w/2, y + h);
    g.lineTo(x,       y + h/2);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  _makeTiles() {
    const W = 64, H = 32;
    const g = this.make.graphics({ add: false });

    // 深木色地板
    g.fillStyle(0x1a2c1e, 1);
    g.lineStyle(1, 0x2a4030, 0.8);
    this._diamond(g, 0, 0, W, H);
    g.generateTexture('tile_floor', W, H);

    // 走道（稍亮）
    g.clear();
    g.fillStyle(0x1e3424, 1);
    g.lineStyle(1, 0x2a4830, 0.7);
    this._diamond(g, 0, 0, W, H);
    g.generateTexture('tile_aisle', W, H);

    g.destroy();
  }

  _makeDesk() {
    const g = this.make.graphics({ add: false });
    // 桌面
    g.fillStyle(0x5a4535, 1);
    g.lineStyle(1, 0x7a6050, 0.8);
    this._diamond(g, 0, 10, 64, 26);
    // 左側面
    g.fillStyle(0x332518, 1);
    g.fillRect(0, 23, 32, 12);
    // 右側面
    g.fillStyle(0x40301f, 1);
    g.fillRect(32, 23, 32, 12);
    g.generateTexture('desk', 64, 40);
    g.destroy();
  }

  _makeChair() {
    const g = this.make.graphics({ add: false });
    // 椅墊（等角俯視）
    g.fillStyle(0x1e0f06, 1);
    g.fillRect(4, 8, 18, 12);
    // 椅背
    g.fillStyle(0x150a04, 1);
    g.fillRect(4, 3, 18, 7);
    // 椅腳
    g.fillStyle(0x0d0d0d, 1);
    g.fillRect(5,  19, 3, 7);
    g.fillRect(18, 19, 3, 7);
    g.generateTexture('chair', 26, 26);
    g.destroy();
  }

  _makeMonitor() {
    const g = this.make.graphics({ add: false });
    // 外框
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(1, 0, 30, 20);
    // 螢幕
    g.fillStyle(0x000d1a, 1);
    g.fillRect(3, 2, 26, 16);
    // K線圖效果
    g.lineStyle(1, 0x00E5FF, 0.7);
    const pts = [[4,14],[7,10],[10,13],[13,7],[16,10],[20,8],[24,5],[27,9]];
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => g.lineTo(p[0], p[1]));
    g.strokePath();
    // 底座
    g.fillStyle(0x111122, 1);
    g.fillRect(11, 20, 10, 4);
    g.fillRect(7, 23, 18, 3);
    g.generateTexture('monitor', 32, 27);
    g.destroy();
  }

  // ── 像素角色（20×44，真人比例，7色，16幀 spritesheet）──────
  _makeCharacters() {
    const ROLES = [
      { id:'market', shirt:0x1a6fbb, pants:0x0f2a4a, skin:0xf5c8a0 },
      { id:'news',   shirt:0xd4930f, pants:0x4a2e05, skin:0xf5c8a0 },
      { id:'swing',  shirt:0x20914d, pants:0x0e3d20, skin:0xd4956a },
      { id:'dca',    shirt:0x7d35a8, pants:0x310f52, skin:0xf5c8a0 },
      { id:'ml',     shirt:0x0aabb8, pants:0x063040, skin:0xd4956a },
      { id:'agent',  shirt:0xc0392b, pants:0x4a0f0f, skin:0xf5c8a0 },
      { id:'boss',   shirt:0xd4850a, pants:0x3d2000, skin:0xf5c8a0 },
    ];
    const FW = 20, FH = 44;
    const DIRS = 4, FRAMES = 4;

    ROLES.forEach(role => {
      const totalW = DIRS * FRAMES * FW;
      const g = this.make.graphics({ add: false });

      for (let d = 0; d < DIRS; d++) {
        for (let f = 0; f < FRAMES; f++) {
          const ox = (d * FRAMES + f) * FW;
          this._drawChar(g, ox, 0, FW, FH, role, d, f);
        }
      }

      g.generateTexture(`char_${role.id}`, totalW, FH);
      g.destroy();

      // 手動把每個 frame 加進 texture（讓 anims 可以用）
      const tex = this.textures.get(`char_${role.id}`);
      for (let i = 0; i < DIRS * FRAMES; i++) {
        tex.add(i, 0, i * FW, 0, FW, FH);
      }

      // 定義動畫
      const mk = (key, start, end) => this.anims.create({
        key, frames: [{ key: `char_${role.id}`, frame: start },
                      { key: `char_${role.id}`, frame: start+1 },
                      { key: `char_${role.id}`, frame: end-1 },
                      { key: `char_${role.id}`, frame: end }],
        frameRate: 6, repeat: -1,
      });
      mk(`${role.id}_walk_s`, 0, 3);
      mk(`${role.id}_walk_w`, 4, 7);
      mk(`${role.id}_walk_n`, 8, 11);
      mk(`${role.id}_walk_e`, 12, 15);
      this.anims.create({
        key: `${role.id}_idle`,
        frames: [{ key: `char_${role.id}`, frame: 0 }],
        frameRate: 1, repeat: -1,
      });
    });
  }

  // 畫一格角色（ox=左邊起點）
  _drawChar(g, ox, oy, W, H, role, dir, frame) {
    const cx = ox + W / 2;
    const legSwing = ([0, 3, 0, -3])[frame] || 0;

    // 陰影
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(cx, oy + H - 1, 14, 4);

    // 鞋
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(cx - 8 + legSwing,  oy + 38, 7, 4);
    g.fillRect(cx + 1 - legSwing,  oy + 38, 7, 4);

    // 腿
    g.fillStyle(role.pants, 1);
    g.fillRect(cx - 8 + legSwing,  oy + 24, 7, 16);
    g.fillRect(cx + 1 - legSwing,  oy + 24, 7, 16);

    // 腰帶
    g.fillStyle(0x222222, 1);
    g.fillRect(cx - 8, oy + 23, 16, 2);

    // 上衣
    g.fillStyle(role.shirt, 1);
    g.fillRect(cx - 9, oy + 10, 18, 14);

    // 手臂
    g.fillStyle(role.shirt, 1);
    g.fillRect(cx - 13, oy + 11, 5, 12);
    g.fillRect(cx + 8,  oy + 11, 5, 12);

    // 脖子
    g.fillStyle(role.skin, 1);
    g.fillRect(cx - 2, oy + 7, 5, 5);

    // 頭
    g.fillStyle(role.skin, 1);
    g.fillRect(cx - 5, oy, 11, 9);

    // 頭髮
    g.fillStyle(0x1a1000, 1);
    g.fillRect(cx - 5, oy, 11, 3);

    // 眼睛（正面方向）
    if (dir === 0) {
      g.fillStyle(0x111111, 1);
      g.fillRect(cx - 3, oy + 4, 2, 2);
      g.fillRect(cx + 1, oy + 4, 2, 2);
    }

    // 策略長加眼鏡
    if (role.id === 'boss' && dir === 0) {
      g.lineStyle(1, 0x999999, 1);
      g.strokeRect(cx - 4, oy + 3, 3, 3);
      g.strokeRect(cx + 1, oy + 3, 3, 3);
    }
  }

  _makeBubble() {
    const g = this.make.graphics({ add: false });
    const W = 160, H = 40;
    g.fillStyle(0x0d1f33, 0.93);
    g.fillRoundedRect(0, 0, W, H, 5);
    g.lineStyle(1, 0x00E5FF, 0.55);
    g.strokeRoundedRect(0, 0, W, H, 5);
    // 三角指向下
    g.fillStyle(0x0d1f33, 0.93);
    g.fillTriangle(W/2-5, H, W/2+5, H, W/2, H+7);
    g.lineStyle(1, 0x00E5FF, 0.4);
    g.lineBetween(W/2-5, H, W/2, H+7);
    g.lineBetween(W/2+5, H, W/2, H+7);
    g.generateTexture('bubble_bg', W, H+8);
    g.destroy();
  }

  _makeParticle() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x00E5FF, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }
}
