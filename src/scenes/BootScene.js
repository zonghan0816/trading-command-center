// BootScene: 用 Phaser Graphics 產生所有像素素材，不需要外部圖片
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this._makeTiles();
    this._makeDesk();
    this._makeChair();
    this._makeMonitor();
    this._makeCharacters();
    this._makeBubble();
    this._makeParticle();
    this.scene.start('OfficeScene');
  }

  // ── 等角地板磚（64×32 鑽石形）──────────────────────────────────
  _makeTiles() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const W = 64, H = 32;

    // 深色木地板
    g.clear();
    g.fillStyle(0x1a2c1e, 1);
    g.fillPoints([
      { x: W/2, y: 0 }, { x: W, y: H/2 },
      { x: W/2, y: H }, { x: 0,   y: H/2 },
    ], true);
    g.lineStyle(1, 0x243d28, 0.6);
    g.strokePoints([
      { x: W/2, y: 0 }, { x: W, y: H/2 },
      { x: W/2, y: H }, { x: 0,   y: H/2 },
    ], true);
    g.generateTexture('tile_floor', W, H);

    // 淺色地板（走道）
    g.clear();
    g.fillStyle(0x1e3424, 1);
    g.fillPoints([
      { x: W/2, y: 0 }, { x: W, y: H/2 },
      { x: W/2, y: H }, { x: 0,   y: H/2 },
    ], true);
    g.lineStyle(1, 0x2a4830, 0.5);
    g.strokePoints([
      { x: W/2, y: 0 }, { x: W, y: H/2 },
      { x: W/2, y: H }, { x: 0,   y: H/2 },
    ], true);
    g.generateTexture('tile_aisle', W, H);

    g.destroy();
  }

  // ── 等角桌子（含桌面+側面立體感）──────────────────────────────
  _makeDesk() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const W = 64, H = 48;
    const deskH = 14; // 桌高

    // 桌面（頂部等角菱形）
    g.fillStyle(0x4a3728, 1);
    g.fillPoints([
      { x: W/2, y: deskH }, { x: W, y: deskH + H/4 },
      { x: W/2, y: deskH + H/2 }, { x: 0, y: deskH + H/4 },
    ], true);
    g.lineStyle(1, 0x6a5038, 0.8);
    g.strokePoints([
      { x: W/2, y: deskH }, { x: W, y: deskH + H/4 },
      { x: W/2, y: deskH + H/2 }, { x: 0, y: deskH + H/4 },
    ], true);

    // 左側面
    g.fillStyle(0x2e2218, 1);
    g.fillPoints([
      { x: 0,   y: deskH + H/4 },
      { x: W/2, y: deskH + H/2 },
      { x: W/2, y: deskH + H/2 + deskH },
      { x: 0,   y: deskH + H/4 + deskH },
    ], true);

    // 右側面
    g.fillStyle(0x382a1e, 1);
    g.fillPoints([
      { x: W/2, y: deskH + H/2 },
      { x: W,   y: deskH + H/4 },
      { x: W,   y: deskH + H/4 + deskH },
      { x: W/2, y: deskH + H/2 + deskH },
    ], true);

    // 桌面高光線
    g.lineStyle(1, 0x7a6048, 0.6);
    g.lineBetween(W/2, deskH, W, deskH + H/4);

    g.generateTexture('desk', W, H);
    g.destroy();
  }

  // ── 椅子 ──────────────────────────────────────────────────────
  _makeChair() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // 小型深色椅子
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(8, 12, 16, 14);      // 座墊
    g.fillStyle(0x16213e, 1);
    g.fillRect(12, 4, 8, 12);       // 椅背
    g.fillStyle(0x0f3460, 1);
    g.fillRect(9, 26, 4, 6);        // 椅腳
    g.fillRect(19, 26, 4, 6);
    g.generateTexture('chair', 32, 32);
    g.destroy();
  }

  // ── 電腦螢幕 ──────────────────────────────────────────────────
  _makeMonitor() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // 螢幕外框
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(2, 0, 28, 20);
    // 螢幕發光面
    g.fillStyle(0x001830, 1);
    g.fillRect(4, 2, 24, 16);
    // 螢幕內容（K線圖感覺）
    g.lineStyle(1, 0x00E5FF, 0.6);
    g.lineBetween(6, 14, 8, 10);
    g.lineBetween(8, 10, 11, 13);
    g.lineBetween(11, 13, 14, 7);
    g.lineBetween(14, 7, 17, 11);
    g.lineBetween(17, 11, 20, 8);
    g.lineBetween(20, 8, 24, 5);
    // 底座
    g.fillStyle(0x0d0d1a, 1);
    g.fillRect(12, 20, 8, 4);
    g.fillRect(8, 23, 16, 3);
    g.generateTexture('monitor', 32, 28);
    g.destroy();
  }

  // ── 角色 Sprite（真人比例：20×44px，7 種顏色，4 方向 × 4 幀）──
  _makeCharacters() {
    // 7 個角色的顏色（上衣/褲子）
    const roles = [
      { id: 'market',  shirt: 0x0077cc, pants: 0x1a3a5c, skin: 0xf5cba7, name: '市場分析師' },
      { id: 'news',    shirt: 0xe6a817, pants: 0x5c3d0a, skin: 0xf5cba7, name: '新聞記者'   },
      { id: 'swing',   shirt: 0x27ae60, pants: 0x1a4d2e, skin: 0xd4a574, name: '波段交易員' },
      { id: 'dca',     shirt: 0x8e44ad, pants: 0x3d1a5c, skin: 0xf5cba7, name: 'ETF 定投師' },
      { id: 'ml',      shirt: 0x00bcd4, pants: 0x0a3540, skin: 0xd4a574, name: 'ML 工程師'  },
      { id: 'agent',   shirt: 0xe74c3c, pants: 0x4d1a1a, skin: 0xf5cba7, name: 'AI 交易員'  },
      { id: 'boss',    shirt: 0xf39c12, pants: 0x3d2a00, skin: 0xf5cba7, name: '策略長'     },
    ];

    const W = 20, H = 44;
    // 方向: 0=南(面向鏡頭), 1=西, 2=北(背向), 3=東
    const dirs = ['s', 'w', 'n', 'e'];
    const FRAMES = 4; // 每方向 4 幀

    roles.forEach(role => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });

      dirs.forEach((dir, di) => {
        for (let f = 0; f < FRAMES; f++) {
          const ox = (di * FRAMES + f) * W;
          this._drawCharFrame(g, ox, 0, W, H, role, dir, f);
        }
      });

      const totalW = dirs.length * FRAMES * W;
      g.generateTexture(`char_${role.id}`, totalW, H);
      g.destroy();

      // 定義 animation frames
      this.anims.create({
        key: `${role.id}_walk_s`,
        frames: this.anims.generateFrameNumbers(`char_${role.id}`, { start: 0, end: 3 }),
        frameRate: 6, repeat: -1,
      });
      this.anims.create({
        key: `${role.id}_walk_w`,
        frames: this.anims.generateFrameNumbers(`char_${role.id}`, { start: 4, end: 7 }),
        frameRate: 6, repeat: -1,
      });
      this.anims.create({
        key: `${role.id}_walk_n`,
        frames: this.anims.generateFrameNumbers(`char_${role.id}`, { start: 8, end: 11 }),
        frameRate: 6, repeat: -1,
      });
      this.anims.create({
        key: `${role.id}_walk_e`,
        frames: this.anims.generateFrameNumbers(`char_${role.id}`, { start: 12, end: 15 }),
        frameRate: 6, repeat: -1,
      });
      this.anims.create({
        key: `${role.id}_idle`,
        frames: this.anims.generateFrameNumbers(`char_${role.id}`, { start: 0, end: 0 }),
        frameRate: 1, repeat: -1,
      });
    });
  }

  // 畫一幀角色（真人比例：頭 8px，身 16px，腿 16px，共 44px 高）
  _drawCharFrame(g, ox, oy, W, H, role, dir, frame) {
    const cx = ox + W / 2;
    const isFront = dir === 's';
    const isBack  = dir === 'n';
    // 腿動畫偏移
    const legSwing = [0, 3, 0, -3][frame];
    const legL = legSwing;
    const legR = -legSwing;

    // 陰影
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, oy + H - 2, 16, 5);

    // 鞋子
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(cx - 7 + legL, oy + 38, 6, 4);
    g.fillRect(cx + 1 + legR, oy + 38, 6, 4);

    // 褲子/腿
    g.fillStyle(role.pants, 1);
    g.fillRect(cx - 7 + legL, oy + 26, 6, 14);
    g.fillRect(cx + 1 + legR, oy + 26, 6, 14);

    // 腰帶
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(cx - 8, oy + 25, 16, 2);

    // 上衣/身體
    g.fillStyle(role.shirt, 1);
    g.fillRect(cx - 8, oy + 10, 16, 16);

    // 衣領（白色）
    if (isFront) {
      g.fillStyle(0xffffff, 1);
      g.fillRect(cx - 2, oy + 10, 4, 4);
    }

    // 手臂
    g.fillStyle(role.shirt, 1);
    g.fillRect(cx - 12, oy + 11 + legR * 0.5, 4, 12); // 左臂
    g.fillRect(cx + 8,  oy + 11 + legL * 0.5, 4, 12); // 右臂

    // 脖子
    g.fillStyle(role.skin, 1);
    g.fillRect(cx - 2, oy + 7, 5, 5);

    // 頭部
    g.fillStyle(role.skin, 1);
    g.fillRect(cx - 5, oy + 0, 10, 9);

    // 頭髮（深色）
    g.fillStyle(0x1a0f00, 1);
    g.fillRect(cx - 5, oy + 0, 10, 3);
    if (isFront) {
      // 眼睛
      g.fillStyle(0x1a0f00, 1);
      g.fillRect(cx - 3, oy + 4, 2, 2);
      g.fillRect(cx + 1, oy + 4, 2, 2);
    }

    // 策略長加眼鏡
    if (role.id === 'boss' && isFront) {
      g.lineStyle(1, 0x888888, 1);
      g.strokeRect(cx - 4, oy + 3, 3, 3);
      g.strokeRect(cx + 1, oy + 3, 3, 3);
    }
  }

  // ── 語音泡泡背景 ──────────────────────────────────────────────
  _makeBubble() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const W = 160, H = 40;
    g.fillStyle(0x0d1f33, 0.92);
    g.fillRoundedRect(0, 0, W, H, 6);
    g.lineStyle(1, 0x00E5FF, 0.5);
    g.strokeRoundedRect(0, 0, W, H, 6);
    // 小三角指向下方角色
    g.fillStyle(0x0d1f33, 0.92);
    g.fillTriangle(W/2 - 6, H, W/2 + 6, H, W/2, H + 8);
    g.lineStyle(1, 0x00E5FF, 0.5);
    g.lineBetween(W/2 - 6, H, W/2, H + 8);
    g.lineBetween(W/2 + 6, H, W/2, H + 8);
    g.generateTexture('bubble_bg', W, H + 8);
    g.destroy();
  }

  // ── 資料流動粒子 ─────────────────────────────────────────────
  _makeParticle() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00E5FF, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle', 6, 6);
    g.destroy();
  }
}
