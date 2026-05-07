export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.add.text(
      this.scale.width / 2, this.scale.height / 2,
      'Loading...', { color: '#00E5FF', fontSize: '18px', fontFamily: 'Consolas' }
    ).setOrigin(0.5);
  }

  create() {
    try {
      this._makeDesk();
      this._makeDeskBoss();
      this._makeMonitor();
      this._makeMonitorDual();
      this._makeChairBack();
      this._makePlant(36, 52, 'plant_sm');
      this._makePlant(44, 64, 'plant_lg');
      this._makeCeilingLight();
      this._makeWhiteboard();
      this._makeServerRack();
      this._makeBubble();
      this._makeParticle();
      this._makeCharacters();
    } catch (e) {
      console.error('BootScene error:', e);
    }
    this.scene.start('OfficeScene');
  }

  // ── 桌子（前視角，96×44）──────────────────────────────────────
  _makeDesk() {
    const g = this.make.graphics({ add: false });
    const W = 96, H = 44;
    // 桌面
    g.fillStyle(0x7a5530, 1);
    g.fillRect(0, 0, W, 8);
    // 前板
    g.fillStyle(0x5e3f20, 1);
    g.fillRect(0, 8, W, H - 8);
    // 抽屜
    g.fillStyle(0x4a3018, 1);
    g.fillRect(5, 14, 38, 22);
    g.fillRect(53, 14, 38, 22);
    // 拉手
    g.fillStyle(0x9a7050, 1);
    g.fillRect(20, 24, 12, 3);
    g.fillRect(67, 24, 12, 3);
    // 左右邊緣
    g.fillStyle(0x8a6040, 1);
    g.fillRect(0, 0, 3, H);
    g.fillRect(W - 3, 0, 3, H);
    g.generateTexture('desk', W, H);
    g.destroy();
  }

  _makeDeskBoss() {
    const g = this.make.graphics({ add: false });
    const W = 132, H = 48;
    g.fillStyle(0x6b4820, 1);
    g.fillRect(0, 0, W, 10);
    g.fillStyle(0x52361a, 1);
    g.fillRect(0, 10, W, H - 10);
    g.fillStyle(0x3e2810, 1);
    g.fillRect(5, 16, 56, 24);
    g.fillRect(71, 16, 56, 24);
    g.fillStyle(0x8a6040, 1);
    g.fillRect(26, 27, 14, 3);
    g.fillRect(92, 27, 14, 3);
    g.fillStyle(0x7a5030, 1);
    g.fillRect(0, 0, 4, H);
    g.fillRect(W - 4, 0, 4, H);
    g.generateTexture('desk_boss', W, H);
    g.destroy();
  }

  // ── 螢幕（44×40）─────────────────────────────────────────────
  _makeMonitor() {
    const g = this.make.graphics({ add: false });
    const W = 44, H = 40;
    // 底座
    g.fillStyle(0x1e1e2a, 1);
    g.fillRect(17, 30, 10, 6);
    g.fillRect(11, 35, 22, 4);
    // 外框
    g.fillStyle(0x1a1a28, 1);
    g.fillRect(0, 0, W, 30);
    // 螢幕內容
    g.fillStyle(0x00050f, 1);
    g.fillRect(3, 3, W - 6, 24);
    // K 線圖
    g.lineStyle(1, 0x00E5FF, 0.9);
    g.beginPath();
    const pts = [[5,23],[9,19],[13,21],[17,13],[21,17],[25,11],[30,14],[35,8],[39,12]];
    g.moveTo(pts[0][0] + 3, pts[0][1] + 3);
    pts.slice(1).forEach(([x, y]) => g.lineTo(x + 3, y + 3));
    g.strokePath();
    g.fillStyle(0x00E676, 1);
    g.fillRect(19, 14, 4, 6);
    g.fillStyle(0xFF5252, 1);
    g.fillRect(26, 12, 4, 7);
    g.generateTexture('monitor', W, H);
    g.destroy();
  }

  _makeMonitorDual() {
    const g = this.make.graphics({ add: false });
    const mW = 42, mH = 30;
    for (let i = 0; i < 2; i++) {
      const ox = i * 48;
      g.fillStyle(0x1a1a28, 1);
      g.fillRect(ox, 0, mW, mH);
      g.fillStyle(i === 0 ? 0x00050f : 0x0a0505, 1);
      g.fillRect(ox + 3, 3, mW - 6, mH - 6);
      g.lineStyle(1, i === 0 ? 0x00E5FF : 0x00E676, 0.8);
      g.beginPath();
      g.moveTo(ox + 4, 22);
      for (let x = 0; x < 34; x += 3) {
        g.lineTo(ox + 4 + x, 22 - (Math.sin(x * 0.45 + i * 1.5) * 6 + 0.5));
      }
      g.strokePath();
      // 底座
      g.fillStyle(0x1e1e2a, 1);
      g.fillRect(ox + 15, 30, 8, 5);
      g.fillRect(ox + 10, 34, 18, 3);
    }
    g.generateTexture('monitor_dual', 96, 38);
    g.destroy();
  }

  // ── 椅背（48×40）─────────────────────────────────────────────
  _makeChairBack() {
    const g = this.make.graphics({ add: false });
    const W = 48, H = 40;
    // 靠背
    g.fillStyle(0x1c1c28, 1);
    g.fillRect(5, 0, W - 10, 32);
    // 靠背墊
    g.fillStyle(0x282838, 1);
    g.fillRect(8, 3, W - 16, 26);
    // 中線縫
    g.lineStyle(1, 0x383848, 0.9);
    g.lineBetween(24, 5, 24, 28);
    // 扶手
    g.fillStyle(0x141420, 1);
    g.fillRect(0, 24, 10, 16);
    g.fillRect(W - 10, 24, 10, 16);
    g.generateTexture('chair_back', W, H);
    g.destroy();
  }

  // ── 植物 ──────────────────────────────────────────────────────
  _makePlant(W, H, key) {
    const g = this.make.graphics({ add: false });
    const potH = 18, potW = W - 4;
    const potY = H - potH;
    const cx = W / 2;
    // 花盆
    g.fillStyle(0x9a5520, 1);
    g.fillRect(2, potY, potW, potH);
    g.fillStyle(0x7a4010, 1);
    g.fillRect(0, potY + potH - 8, W, 8);
    // 土壤
    g.fillStyle(0x2d1e10, 1);
    g.fillRect(3, potY, potW - 2, 5);
    // 葉子
    g.fillStyle(0x256325, 1);
    g.fillCircle(cx, potY - 14, 14);
    g.fillCircle(cx - 10, potY - 22, 10);
    g.fillCircle(cx + 9, potY - 20, 11);
    g.fillStyle(0x1d4d1d, 1);
    g.fillCircle(cx, potY - 16, 8);
    g.fillCircle(cx - 9, potY - 23, 6);
    g.fillCircle(cx + 8, potY - 21, 7);
    g.fillStyle(0x348034, 0.6);
    g.fillCircle(cx - 4, potY - 18, 4);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // ── 吊燈（30×42）─────────────────────────────────────────────
  _makeCeilingLight() {
    const g = this.make.graphics({ add: false });
    // 電線
    g.lineStyle(2, 0x888888, 1);
    g.lineBetween(15, 0, 15, 14);
    // 燈罩
    g.fillStyle(0xcccccc, 1);
    g.fillEllipse(15, 18, 22, 8);
    g.fillStyle(0xaaaaaa, 1);
    g.fillRect(5, 16, 20, 5);
    // 燈泡
    g.fillStyle(0xfff2aa, 1);
    g.fillCircle(15, 26, 8);
    // 光暈
    g.fillStyle(0xfff2aa, 0.10);
    g.fillCircle(15, 26, 20);
    g.generateTexture('ceiling_light', 30, 42);
    g.destroy();
  }

  // ── 白板（124×108）───────────────────────────────────────────
  _makeWhiteboard() {
    const g = this.make.graphics({ add: false });
    const W = 124, H = 90;
    // 外框
    g.fillStyle(0x777777, 1);
    g.fillRect(0, 0, W, H);
    // 板面
    g.fillStyle(0xf2f2f0, 1);
    g.fillRect(4, 4, W - 8, H - 10);
    // 支架
    g.fillStyle(0x555555, 1);
    g.fillRect(22, H - 2, 6, 18);
    g.fillRect(W - 28, H - 2, 6, 18);
    // 流程圖
    g.lineStyle(1, 0x1133aa, 0.7);
    g.strokeRect(47, 10, 30, 12);
    g.strokeRect(18, 34, 26, 12);
    g.strokeRect(80, 34, 26, 12);
    g.strokeRect(47, 56, 30, 12);
    g.lineBetween(62, 22, 31, 34);
    g.lineBetween(62, 22, 93, 34);
    g.lineBetween(31, 46, 62, 56);
    g.lineBetween(93, 46, 62, 56);
    g.fillStyle(0x2244cc, 0.35);
    g.fillRect(48, 11, 28, 10);
    g.fillRect(19, 35, 24, 10);
    g.fillRect(81, 35, 24, 10);
    g.fillRect(48, 57, 28, 10);
    g.generateTexture('whiteboard', W, H + 18);
    g.destroy();
  }

  // ── 機架（72×138）────────────────────────────────────────────
  _makeServerRack() {
    const g = this.make.graphics({ add: false });
    const W = 72, H = 138;
    g.fillStyle(0x181820, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x0e0e16, 1);
    g.fillRect(4, 0, W - 8, H);
    const colors = [0x162416, 0x141624, 0x241414, 0x141e1e, 0x1e1424];
    for (let i = 0; i < 8; i++) {
      const y = 6 + i * 16;
      g.fillStyle(colors[i % 5], 1);
      g.fillRect(6, y, W - 12, 13);
      const lc = [0x00E676, 0x00E5FF, 0xFFB300][i % 3];
      g.fillStyle(lc, 1);
      g.fillRect(10, y + 4, 4, 4);
      g.fillRect(16, y + 4, 4, 4);
      g.fillStyle(0x336688, 0.5);
      g.fillRect(24, y + 3, W - 36, 6);
    }
    g.generateTexture('server_rack', W, H);
    g.destroy();
  }

  // ── 對話泡泡（180×52）────────────────────────────────────────
  _makeBubble() {
    const g = this.make.graphics({ add: false });
    const W = 180, H = 44;
    g.fillStyle(0x0d1f33, 0.94);
    g.fillRoundedRect(0, 0, W, H, 6);
    g.lineStyle(1, 0x00E5FF, 0.55);
    g.strokeRoundedRect(0, 0, W, H, 6);
    g.fillStyle(0x0d1f33, 0.94);
    g.fillTriangle(W / 2 - 6, H, W / 2 + 6, H, W / 2, H + 8);
    g.lineStyle(1, 0x00E5FF, 0.4);
    g.lineBetween(W / 2 - 6, H, W / 2, H + 8);
    g.lineBetween(W / 2 + 6, H, W / 2, H + 8);
    g.generateTexture('bubble_bg', W, H + 8);
    g.destroy();
  }

  _makeParticle() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x00E5FF, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  // ── 角色 Spritesheet（32×48，4 幀）───────────────────────────
  _makeCharacters() {
    const ROLES = [
      { id:'market', shirt:0x1a6fbb, hair:0x1a0f08, skin:0xf5c8a0, acc:'none'       },
      { id:'news',   shirt:0xd4930f, hair:0xdd4400, skin:0xf5c8a0, acc:'none'       },
      { id:'swing',  shirt:0x20914d, hair:0x100800, skin:0xc8804a, acc:'none'       },
      { id:'dca',    shirt:0x7d35a8, hair:0x111122, skin:0xf5c8a0, acc:'glasses'    },
      { id:'ml',     shirt:0x0aabb8, hair:0x1a1a1a, skin:0xc8804a, acc:'headphones' },
      { id:'agent',  shirt:0xc0392b, hair:0x100800, skin:0xf5c8a0, acc:'none'       },
      { id:'boss',   shirt:0xd4850a, hair:0x2a1800, skin:0xf5c8a0, acc:'glasses'    },
    ];
    const FW = 32, FH = 48, FRAMES = 4;

    ROLES.forEach(role => {
      const g = this.make.graphics({ add: false });
      for (let f = 0; f < FRAMES; f++) {
        this._drawChar(g, f * FW, 0, FW, FH, role, f);
      }
      g.generateTexture(`char_${role.id}`, FW * FRAMES, FH);
      g.destroy();

      const tex = this.textures.get(`char_${role.id}`);
      for (let i = 0; i < FRAMES; i++) {
        tex.add(i, 0, i * FW, 0, FW, FH);
      }

      this.anims.create({
        key: `${role.id}_idle`,
        frames: [{ key: `char_${role.id}`, frame: 0 }],
        frameRate: 1, repeat: -1,
      });
      this.anims.create({
        key: `${role.id}_typing`,
        frames: [0, 1, 2, 1].map(f => ({ key: `char_${role.id}`, frame: f })),
        frameRate: 5, repeat: -1,
      });
      this.anims.create({
        key: `${role.id}_thinking`,
        frames: [0, 3].map(f => ({ key: `char_${role.id}`, frame: f })),
        frameRate: 3, repeat: -1,
      });
    });
  }

  _drawChar(g, ox, oy, W, H, role, frame) {
    const cx = ox + W / 2;
    const bob  = [0, -1, 0, 1][frame];
    const armY = [0,  2, 0, -1][frame];

    // 頭髮（後層）
    g.fillStyle(role.hair, 1);
    g.fillRect(cx - 7, oy + bob, 14, 7);

    // 頭部
    g.fillStyle(role.skin, 1);
    g.fillRect(cx - 6, oy + 4 + bob, 12, 11);

    // 頭髮（前層）
    g.fillStyle(role.hair, 1);
    g.fillRect(cx - 7, oy + bob, 14, 4);
    g.fillRect(cx - 7, oy + 3 + bob, 2, 4);
    g.fillRect(cx + 5, oy + 3 + bob, 2, 4);

    // 耳朵
    g.fillStyle(role.skin, 1);
    g.fillRect(cx - 8, oy + 7 + bob, 2, 4);
    g.fillRect(cx + 6, oy + 7 + bob, 2, 4);

    // 眼睛
    g.fillStyle(0x111111, 1);
    g.fillRect(cx - 4, oy + 8 + bob, 2, 2);
    g.fillRect(cx + 2, oy + 8 + bob, 2, 2);

    // 嘴巴
    if (frame === 0 || frame === 3) {
      g.fillStyle(0xaa4433, 1);
      g.fillRect(cx - 2, oy + 13 + bob, 4, 1);
    }

    // 頸部
    g.fillStyle(role.skin, 1);
    g.fillRect(cx - 2, oy + 15 + bob, 4, 4);

    // 上衣
    g.fillStyle(role.shirt, 1);
    g.fillRect(cx - 10, oy + 18, 20, 18);

    // 領口
    g.fillStyle(role.skin, 0.7);
    g.fillTriangle(cx, oy + 19, cx - 3, oy + 19, cx, oy + 25);
    g.fillTriangle(cx, oy + 19, cx + 3, oy + 19, cx, oy + 25);

    // 左臂
    g.fillStyle(role.shirt, 1);
    g.fillRect(cx - 14, oy + 19 + armY, 5, 12);
    // 右臂
    g.fillRect(cx + 9, oy + 19 - armY, 5, 12);

    // 手
    g.fillStyle(role.skin, 1);
    g.fillRect(cx - 14, oy + 30 + armY, 5, 4);
    g.fillRect(cx + 9, oy + 30 - armY, 5, 4);

    // 配件：眼鏡
    if (role.acc === 'glasses') {
      g.lineStyle(1, 0xaaaaaa, 1);
      g.strokeRect(cx - 5, oy + 7 + bob, 4, 3);
      g.strokeRect(cx + 1, oy + 7 + bob, 4, 3);
      g.lineBetween(cx - 1, oy + 8 + bob, cx + 1, oy + 8 + bob);
    }

    // 配件：耳機
    if (role.acc === 'headphones') {
      g.fillStyle(0x2a2a3a, 1);
      g.fillRect(cx - 9, oy + 5 + bob, 3, 7);
      g.fillRect(cx + 6, oy + 5 + bob, 3, 7);
      g.lineStyle(2, 0x3a3a4a, 1);
      g.beginPath();
      g.arc(cx, oy + 6 + bob, 8, Math.PI, 0, false);
      g.strokePath();
    }

    // 特殊：策略長加領帶
    if (role.id === 'boss') {
      g.fillStyle(0x880000, 1);
      g.fillTriangle(cx, oy + 19, cx - 2, oy + 22, cx, oy + 32);
      g.fillTriangle(cx, oy + 19, cx + 2, oy + 22, cx, oy + 32);
    }
  }
}
