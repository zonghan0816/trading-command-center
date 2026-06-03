import { CONFIG } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.add.text(
      this.scale.width / 2, this.scale.height / 2,
      'Loading...', { color: '#00E5FF', fontSize: '18px', fontFamily: 'Consolas' }
    ).setOrigin(0.5);

    // 背景圖片（舊版保留不刪，但 OfficeScene 已不使用）
    this.load.image('office_bg', '/assets/office-complete.png');
    this.load.image('wall_screen', '/assets/1.png');
    // Phase 3 Step 3：三個時段背景（保留向下相容、v3 啟用時不用）
    this.load.image('studio_bg_morning', '/assets/wwt_studio_background_noon_v1.png');
    this.load.image('studio_bg_noon',    '/assets/wwt_studio_background_morning_v1.png');
    this.load.image('studio_bg_night',   '/assets/wwt_studio_background_night_v1.png');

    // 載入使用者自訂圖片（config.js 中 customAssets 設為 true 的項目）
    const ca = CONFIG.customAssets;
    const furnitureKeys = [
      'desk','desk_boss','desk_market','monitor','monitor_dual','chair_back',
      'plant_sm','plant_lg','ceiling_light','whiteboard','server_rack','bubble_bg',
    ];
    furnitureKeys.forEach(key => {
      if (ca[key]) this.load.image(key, `/assets/${key}.png`);
    });

    // ── Phase 4 Step 1: 24H MVP 新棚景 + 天氣 + 道具 + UI 載入 ──
    if (ca.studio_base_window_separate) {
      this.load.image('studio_base', '/assets/studio_base_window_separate.png');
    }
    ['sunny', 'cloudy', 'rainy', 'thunder', 'typhoon'].forEach(w => {
      if (ca[`weather_${w}`]) this.load.image(`weather_${w}`, `/assets/weather_${w}.png`);
    });
    [['morning', 'prop_morning_set'], ['afternoon', 'prop_afternoon_set'],
     ['evening', 'prop_evening_set'], ['late_night', 'prop_late_night_set']].forEach(([slot, fname]) => {
      if (ca[`prop_${slot}`]) this.load.image(`prop_${slot}`, `/assets/${fname}.png`);
    });
    if (ca.ui_brand_24h)  this.load.image('ui_brand_24h',  '/assets/ui_brand_24h_ai_live.png');
    if (ca.ui_marquee_bg) this.load.image('ui_marquee_bg', '/assets/ui_marquee_bg.png');

    // ── Phase 4 Step 1: 角色 spritesheet 載入（優先序：v3 > xiaomei_actions > v2 > v1）──
    // v3 = 4-frame standing/sitting actions（1024×1536 each、4096×1536 整張）
    // frame order: 0=idle, 1=talking, 2=thinking, 3=reacting
    // 3Q 陳柏惟 individual PNG（優先）→ 阿明哥 v2 備用 → v1 fallback
    if (ca.char_3q_individual) {
      const dir3q = '/assets/char_3q';
      this.load.image('char_aming', `${dir3q}/emo_idle.png`);  // base texture
      ['idle','passionate','combat','excited','humor','sincere','resilient','angry','speech',
       'thinking','mocking','sympathy','surprised','explain','mocking_laugh','greeting','disgusted'].forEach(e => {
        this.load.image(`aming_emo_${e}_tex`, `${dir3q}/emo_${e}.png`);
      });
    } else if (ca.char_aming_v3_actions) {
      this.load.spritesheet('char_aming', '/assets/char_aming_standing_actions.png', { frameWidth: 1024, frameHeight: 1536 });
    } else if (ca.char_aming_v2) {
      this.load.spritesheet('char_aming', '/assets/char_aming_v2_draft.png', { frameWidth: 1024, frameHeight: 1536 });
    } else if (ca.char_aming) {
      this.load.spritesheet('char_aming', '/assets/char_aming.png', { frameWidth: 48, frameHeight: 64 });
    }
    // 王于安載入 — Phase 4 Step 5.17: 個別 PNG（每 emotion/action 一張）
    // 用 load.image() — 各圖尺寸不一致（1254×1254 / 1086×1448）、用 spritesheet 會 zero-frame
    if (ca.char_xiaomei_individual) {
      const dir = '/assets/char_xiaomei';
      // emo_idle 同時當 base texture（OfficeScene 初始 sprite 用 char_xiaomei）
      this.load.image('char_xiaomei', `${dir}/emo_idle.png`);
      ['idle','talk','smile','thinking','surprised','skeptical','wave',
       'angry','laughing','sad','relieved','cheering'].forEach(e => {
        this.load.image(`xiaomei_emo_${e}_tex`, `${dir}/emo_${e}.png`);
      });
      ['tired','pointing','walking'].forEach(a => {
        this.load.image(`xiaomei_act_${a}_tex`, `${dir}/act_${a}.png`);
      });
    } else if (ca.char_xiaomei_v2) {
      // Fallback：v2 draft 單張
      this.load.spritesheet('char_xiaomei', '/assets/char_xiaomei_v2_draft.png', { frameWidth: 1024, frameHeight: 1536 });
    }

    // 坐姿備用（阿明、Step 2 切換用、現在先載）
    if (ca.char_aming_v3_sitting) this.load.spritesheet('char_aming_sitting', '/assets/char_aming_sitting_actions.png', { frameWidth: 1024, frameHeight: 1536 });
    // A 組（白天時段、Step 2 切換用）
    if (ca.char_A_man_standing)   this.load.spritesheet('char_a_man',         '/assets/char_A_man_standing_actions.png',   { frameWidth: 1024, frameHeight: 1536 });
    if (ca.char_A_man_sitting)    this.load.spritesheet('char_a_man_sitting', '/assets/char_A_man_sitting_actions.png',    { frameWidth: 1024, frameHeight: 1536 });
    if (ca.char_A_woman_standing) this.load.spritesheet('char_a_woman',       '/assets/char_A_woman_standing_actions.png', { frameWidth: 1024, frameHeight: 1536 });
    if (ca.char_A_woman_sitting)  this.load.spritesheet('char_a_woman_sitting', '/assets/char_A_woman_sitting_actions.png', { frameWidth: 1024, frameHeight: 1536 });

    // BGM 兩首輪流播（bgm_1 / bgm_2）、缺音檔 OfficeScene 會 exists() 檢查
    this.load.audio('bgm_1', ['/assets/audio/bgm_1.mp3']);
    this.load.audio('bgm_2', ['/assets/audio/bgm_2.mp3']);
    this.load.on('loaderror', (file) => {
      if (file.key === 'bgm_1' || file.key === 'bgm_2') {
        console.warn(`[audio] ${file.key} 未找到、繼續無聲播放`);
      }
    });
  }

  create() {
    try {
      const ca = CONFIG.customAssets;
      if (!ca.desk)           this._makeDesk();
      if (!ca.desk_boss)      this._makeDeskBoss();
      if (!ca.desk_market)    this._makeDeskMarket();
      if (!ca.monitor)        this._makeMonitor();
      if (!ca.monitor_dual)   this._makeMonitorDual();
      if (!ca.chair_back)     this._makeChairBack();
      if (!ca.plant_sm)       this._makePlant(36, 52, 'plant_sm');
      if (!ca.plant_lg)       this._makePlant(44, 64, 'plant_lg');
      if (!ca.ceiling_light)  this._makeCeilingLight();
      if (!ca.whiteboard)     this._makeWhiteboard();
      if (!ca.server_rack)    this._makeServerRack();
      if (!ca.bubble_bg)      this._makeBubble();
      this._makeParticle();
      this._makeCharacters();
    } catch (e) {
      console.error('BootScene error:', e);
    }
    this.scene.start('OfficeScene');
  }

  // ── 桌子（背面視角，96×44）─────────────────────────────────────
  _makeDesk() {
    const g = this.make.graphics({ add: false });
    const W = 96, H = 44;
    // 桌腳（左右外側兩支）
    g.fillStyle(0x888899, 1);
    g.fillRect(3,  12, 5, H - 12);
    g.fillRect(W - 8, 12, 5, H - 12);
    // 桌面高光
    g.fillStyle(0xd8d8e0, 1);
    g.fillRect(0, 0, W, 2);
    // 桌面
    g.fillStyle(0xb0b0be, 1);
    g.fillRect(0, 2, W, 10);
    // 桌面後緣壓條
    g.fillStyle(0x7a7a8a, 1);
    g.fillRect(0, 11, W, 2);
    // 桌身背板（深灰，無抽屜）
    g.fillStyle(0x606070, 1);
    g.fillRect(0, 13, W, H - 13);
    // 背板中段加線（結構橫條）
    g.fillStyle(0x505060, 1);
    g.fillRect(0, 26, W, 2);
    // 左右端蓋
    g.fillStyle(0x909098, 1);
    g.fillRect(0,   2, 4, 10);
    g.fillRect(W - 4, 2, 4, 10);
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

  // ── 市場分析師三螢幕工作站（96×80）──────────────────────────
  // 上半部（y=0~36）：三個螢幕 + 底座；下半部（y=36~80）：桌子本體
  _makeDeskMarket() {
    const g = this.make.graphics({ add: false });
    const TW = 96, TH = 80;
    const deskY = 36;  // 桌面頂端 y（螢幕區 / 桌子區分界）

    // ── 三個螢幕 ────────────────────────────────────────────────
    // 每個螢幕 28px 寬，間距 2px，左右各留 1px margin
    const mW = 28, mFaceH = 28, mGap = 2;
    const DARK = 0x080808;

    for (let i = 0; i < 3; i++) {
      const ox = 1 + i * (mW + mGap);

      // 螢幕外框
      g.fillStyle(0x1a1a2e, 1);
      g.fillRect(ox, 0, mW, mFaceH);
      // 外框亮邊
      g.fillStyle(0x2a2a44, 1);
      g.fillRect(ox, 0, mW, 1);
      g.fillRect(ox, 0, 1, mFaceH);

      // 螢幕面板
      const bgColor = [0x000c18, 0x000c08, 0x120008][i];
      g.fillStyle(bgColor, 1);
      g.fillRect(ox + 2, 2, mW - 4, mFaceH - 4);

      if (i === 0) {
        // 左螢幕：K 線走勢圖
        // 格線
        g.lineStyle(1, 0x002233, 1);
        [9, 14, 19, 24].forEach(y => g.lineBetween(ox + 3, y, ox + 25, y));
        // 走勢線（青色）
        g.lineStyle(1, 0x00E5FF, 1);
        g.beginPath();
        const pts = [[3,24],[6,20],[9,22],[13,14],[16,17],[20,11],[24,14]];
        g.moveTo(ox + pts[0][0], pts[0][1]);
        pts.slice(1).forEach(([x, y]) => g.lineTo(ox + x, y));
        g.strokePath();
        // 綠 K 棒
        g.fillStyle(0x00E676, 1);
        g.fillRect(ox + 13, 14, 2, 7);
        g.lineStyle(1, 0x00E676, 1);
        g.lineBetween(ox + 14, 12, ox + 14, 22);
        // 紅 K 棒
        g.fillStyle(0xFF5252, 1);
        g.fillRect(ox + 18, 12, 2, 8);
        g.lineStyle(1, 0xFF5252, 1);
        g.lineBetween(ox + 19, 10, ox + 19, 21);

      } else if (i === 1) {
        // 中螢幕：程式碼終端機
        const lines = [
          { c: 0x00E5FF, y: 5,  w: 20 },
          { c: 0xFFB300, y: 9,  w: 14 },
          { c: 0x00E676, y: 13, w: 18 },
          { c: 0x666680, y: 17, w: 9  },
          { c: 0x00E5FF, y: 21, w: 22 },
        ];
        lines.forEach(({ c, y, w }) => {
          g.fillStyle(c, 0.85);
          g.fillRect(ox + 3, y, w, 2);
        });
        // 命令提示字元 '>' 的像素方塊
        g.fillStyle(0x00E676, 0.9);
        g.fillRect(ox + 3, 25, 2, 2);
        g.fillRect(ox + 5, 26, 2, 1);
        // 游標
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(ox + 8, 25, 4, 2);

      } else {
        // 右螢幕：Alerts（橘色警示）
        // 閃爍紅點（警報指示燈）
        g.fillStyle(0xFF2200, 1);
        g.fillCircle(ox + 23, 5, 2);
        // "!" 主體
        g.fillStyle(0xFF6600, 1);
        g.fillRect(ox + 12, 5, 4, 11);
        g.fillRect(ox + 12, 19, 4, 4);
        // 側欄警示橫條
        g.fillStyle(0xFF6600, 0.55);
        g.fillRect(ox + 3,  6, 7, 1);
        g.fillRect(ox + 3,  9, 5, 1);
        g.fillRect(ox + 20, 6, 5, 1);
        g.fillRect(ox + 20, 9, 7, 1);
        // 底部數據列
        g.fillStyle(0xFF6600, 0.4);
        g.fillRect(ox + 3, 22, 22, 1);
        g.fillRect(ox + 3, 24, 14, 1);
      }

      // 螢幕底座（頸部 + 底盤）
      g.fillStyle(0x141420, 1);
      g.fillRect(ox + 11, mFaceH, 6, 4);
      g.fillStyle(0x1c1c2e, 1);
      g.fillRect(ox + 5, mFaceH + 4, 18, 3);
    }

    // ── 桌子本體（y=36~80）──────────────────────────────────────
    // 桌面高光
    g.fillStyle(0xd8d8e0, 1);
    g.fillRect(0, deskY, TW, 2);
    // 桌面
    g.fillStyle(0xb0b0be, 1);
    g.fillRect(0, deskY + 2, TW, 9);
    // 鍵盤
    g.fillStyle(0x2e2e38, 1);
    g.fillRect(26, deskY + 3, 44, 7);
    g.fillStyle(0x3a3a44, 1);
    for (let k = 0; k < 6; k++) {
      g.fillRect(28 + k * 7, deskY + 4, 5, 5);
    }
    // 桌面後緣壓條
    g.fillStyle(0x7a7a8a, 1);
    g.fillRect(0, deskY + 11, TW, 2);
    // 桌身背板
    g.fillStyle(0x606070, 1);
    g.fillRect(0, deskY + 13, TW, TH - deskY - 13);
    // 結構橫條
    g.fillStyle(0x505060, 1);
    g.fillRect(0, deskY + 27, TW, 2);
    // 桌腳
    g.fillStyle(0x888899, 1);
    g.fillRect(3,      deskY + 12, 5, TH - deskY - 12);
    g.fillRect(TW - 8, deskY + 12, 5, TH - deskY - 12);
    // 端蓋
    g.fillStyle(0x909098, 1);
    g.fillRect(0,      deskY + 2, 4, 9);
    g.fillRect(TW - 4, deskY + 2, 4, 9);

    g.generateTexture('desk_market', TW, TH);
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

  // ── 熱門關鍵字板（124×108）───────────────────────────────────
  _makeWhiteboard() {
    const g = this.make.graphics({ add: false });
    const W = 124, H = 90;
    // outer frame
    g.fillStyle(0x2a3050, 1);
    g.fillRect(0, 0, W, H);
    // board face
    g.fillStyle(0x060d1e, 1);
    g.fillRect(4, 4, W - 8, H - 10);
    // header bar
    g.fillStyle(0x0e1830, 1);
    g.fillRect(4, 4, W - 8, 20);
    // orange left accent + top rule
    g.fillStyle(0xFF6B35, 1);
    g.fillRect(4, 4, 3, 20);
    g.fillStyle(0xFF6B35, 0.5);
    g.fillRect(7, 22, W - 11, 2);
    // keyword tag rows (left accent + dim background)
    const tagColors = [0xFF6B35, 0x00E5FF, 0x00E676, 0xFFB300, 0xBB86FC];
    tagColors.forEach((col, i) => {
      const ty = 30 + i * 12;
      g.fillStyle(col, 0.9);
      g.fillRect(8, ty, 3, 9);
      g.fillStyle(col, 0.08);
      g.fillRect(11, ty, W - 23, 9);
      g.lineStyle(1, col, 0.25);
      g.strokeRect(11, ty, W - 23, 9);
    });
    // supports
    g.fillStyle(0x404060, 1);
    g.fillRect(22, H - 2, 6, 18);
    g.fillRect(W - 28, H - 2, 6, 18);
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

  // ── 對話泡泡（185×46）────────────────────────────────────────
  _makeBubble() {
    const g = this.make.graphics({ add: false });
    const W = 185, H = 46;
    // 背景
    g.fillStyle(0x071828, 0.96);
    g.fillRoundedRect(0, 0, W, H, 7);
    // 外框
    g.lineStyle(1.5, 0x00E5FF, 0.7);
    g.strokeRoundedRect(0, 0, W, H, 7);
    // 上方光邊
    g.lineStyle(1, 0x80f0ff, 0.25);
    g.lineBetween(10, 1, W - 10, 1);
    // 尾巴
    g.fillStyle(0x071828, 0.96);
    g.fillTriangle(W / 2 - 7, H, W / 2 + 7, H, W / 2, H + 8);
    g.lineStyle(1.5, 0x00E5FF, 0.5);
    g.lineBetween(W / 2 - 7, H, W / 2, H + 8);
    g.lineBetween(W / 2 + 7, H, W / 2, H + 8);
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

  // ── 角色 Spritesheet ───────────────────────────────────────────
  _makeCharacters() {
    const cfgChars = CONFIG.characters;
    const ROLES = Object.entries(cfgChars).map(([id, c]) => ({ id, ...c }));
    const FW = 48, FH = 64, FRAMES = 4;

    ROLES.forEach(role => {
      const isCustom = CONFIG.customAssets[`char_${role.id}`];

      // boss 共用 char_ml（同為 Pixel Agents char_3），不需獨立檔案
      const texKey = (role.id === 'boss' && !isCustom) ? 'char_ml' : `char_${role.id}`;

      if (!isCustom && role.id !== 'boss') {
        // 程序生成（48×64，4 幀）
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
          frames: [{ key: texKey, frame: 0 }],
          frameRate: 1, repeat: -1,
        });
        this.anims.create({
          key: `${role.id}_typing`,
          frames: [0, 1, 2, 1].map(f => ({ key: texKey, frame: f })),
          frameRate: 5, repeat: -1,
        });
        this.anims.create({
          key: `${role.id}_thinking`,
          frames: [0, 3].map(f => ({ key: texKey, frame: f })),
          frameRate: 3, repeat: -1,
        });
      } else if (role.id === 'aming' && CONFIG.customAssets.char_3q_individual) {
        // 3Q 陳柏惟 individual PNG（9 emotion）
        // status 路由：idle/talking/thinking/reacting → 對應 3Q emotion
        // 阿明哥備用：關掉 char_3q_individual → 自動走 v2 分支
        const AMING_3Q_MAP = {
          aming_idle:      'aming_emo_idle_tex',
          aming_talking:   'aming_emo_passionate_tex',
          aming_typing:    'aming_emo_passionate_tex',
          aming_thinking:  'aming_emo_sincere_tex',
          aming_reacting:  'aming_emo_excited_tex',
          // 直接 emotion 路由（未來 server.py 給 aming emotion 時用）
          aming_emo_idle:       'aming_emo_idle_tex',
          aming_emo_passionate: 'aming_emo_passionate_tex',
          aming_emo_combat:     'aming_emo_combat_tex',
          aming_emo_excited:    'aming_emo_excited_tex',
          aming_emo_humor:      'aming_emo_humor_tex',
          aming_emo_sincere:    'aming_emo_sincere_tex',
          aming_emo_resilient:  'aming_emo_resilient_tex',
          aming_emo_angry:      'aming_emo_angry_tex',
          aming_emo_speech:     'aming_emo_speech_tex',
          aming_emo_thinking:      'aming_emo_thinking_tex',
          aming_emo_mocking:       'aming_emo_mocking_tex',
          aming_emo_sympathy:      'aming_emo_sympathy_tex',
          aming_emo_surprised:     'aming_emo_surprised_tex',
          aming_emo_explain:       'aming_emo_explain_tex',
          aming_emo_mocking_laugh: 'aming_emo_mocking_laugh_tex',
          aming_emo_greeting:      'aming_emo_greeting_tex',
          aming_emo_disgusted:     'aming_emo_disgusted_tex',
        };
        Object.entries(AMING_3Q_MAP).forEach(([animKey, tex]) => {
          this.anims.create({
            key: animKey,
            frames: [{ key: tex, frame: '__BASE' }],
            frameRate: 1, repeat: -1,
          });
        });
      } else if (role.id === 'aming' && CONFIG.customAssets.char_aming_v3_actions) {
        // Phase 4 Step 1: 24H MVP v3 4-frame spritesheet
        // frame order: 0=idle, 1=talking, 2=thinking, 3=reacting
        // pointing → talking、tired → thinking 做 fallback
        const FRAME_MAP = {
          idle:     0,
          talking:  1,
          typing:   1,  // legacy alias
          thinking: 2,
          reacting: 3,
          pointing: 1,  // fallback → talking
          tired:    2,  // fallback → thinking
        };
        Object.entries(FRAME_MAP).forEach(([anim, frame]) => {
          this.anims.create({
            key: `${role.id}_${anim}`,
            frames: [{ key: texKey, frame }],
            frameRate: 1, repeat: -1,
          });
        });
      } else if (role.id === 'xiaomei' && CONFIG.customAssets.char_xiaomei_individual) {
        // Phase 4 Step 5.17: individual PNG（每 emotion/action 自己一張 texture）
        // animation key → 對應 texture key（單 frame loop、play 時 sprite 切 texture）
        const XM_ANIM_MAP = {
          // 既有 keyword-driven 路徑（OfficeScene 用、向下相容）
          xiaomei_idle:      'xiaomei_emo_idle_tex',
          xiaomei_talking:   'xiaomei_emo_talk_tex',
          xiaomei_typing:    'xiaomei_emo_talk_tex',     // legacy alias
          xiaomei_thinking:  'xiaomei_emo_thinking_tex',
          xiaomei_reacting:  'xiaomei_emo_surprised_tex',
          xiaomei_pointing:  'xiaomei_act_pointing_tex',
          xiaomei_tired:     'xiaomei_act_tired_tex',
          // 12 個 emo_* key（line.emotion 直接路由）
          xiaomei_emo_idle:      'xiaomei_emo_idle_tex',
          xiaomei_emo_talk:      'xiaomei_emo_talk_tex',
          xiaomei_emo_smile:     'xiaomei_emo_smile_tex',
          xiaomei_emo_thinking:  'xiaomei_emo_thinking_tex',
          xiaomei_emo_surprised: 'xiaomei_emo_surprised_tex',
          xiaomei_emo_skeptical: 'xiaomei_emo_skeptical_tex',
          xiaomei_emo_wave:      'xiaomei_emo_wave_tex',
          xiaomei_emo_angry:     'xiaomei_emo_angry_tex',
          xiaomei_emo_laughing:  'xiaomei_emo_laughing_tex',
          xiaomei_emo_sad:       'xiaomei_emo_sad_tex',
          xiaomei_emo_relieved:  'xiaomei_emo_relieved_tex',
          xiaomei_emo_cheering:  'xiaomei_emo_cheering_tex',
        };
        Object.entries(XM_ANIM_MAP).forEach(([animKey, tex]) => {
          // image-loaded texture 的 frame name 是 '__BASE'、明寫避免 Phaser 抓不到
          this.anims.create({
            key: animKey,
            frames: [{ key: tex, frame: '__BASE' }],
            frameRate: 1, repeat: -1,
          });
        });
      } else if ((role.id === 'aming'   && CONFIG.customAssets.char_aming_v2) ||
                 (role.id === 'xiaomei' && CONFIG.customAssets.char_xiaomei_v2)) {
        // v2 draft 單張 PNG（1024×1536，只有 frame 0）
        // 加入 talking 同義動畫、讓阿明在新 status 切換邏輯下行為不變
        ['idle', 'typing', 'talking', 'thinking', 'reacting'].forEach(anim => {
          this.anims.create({
            key: `${role.id}_${anim}`,
            frames: [{ key: texKey, frame: 0 }],
            frameRate: 1, repeat: -1,
          });
        });
      } else if (role.id === 'aming' && CONFIG.customAssets.char_aming) {
        // 阿明哥 v1 spritesheet（192×64，4 幀 × 48×64）
        // Frame 0 = idle / Frame 1 = talk / Frame 2 = react / Frame 3 = think
        this.anims.create({
          key: `${role.id}_idle`,
          frames: [{ key: texKey, frame: 0 }],
          frameRate: 1, repeat: -1,
        });
        this.anims.create({
          key: `${role.id}_typing`,
          frames: [0, 1, 1, 0].map(f => ({ key: texKey, frame: f })),
          frameRate: 5, repeat: -1,
        });
        this.anims.create({
          key: `${role.id}_thinking`,
          frames: [2, 3].map(f => ({ key: texKey, frame: f })),
          frameRate: 3, repeat: -1,
        });
        this.anims.create({
          key: `${role.id}_reacting`,
          frames: [{ key: texKey, frame: 2 }],
          frameRate: 1, repeat: -1,
        });
      } else if (role.id === 'boss' && CONFIG.customAssets.char_boss) {
        // Boss 高解析度 spritesheet（396×448，8 cols × 3 rows）
        // Row 0: 0=正面站, 1-2=走路, 3=站立, 4=放鬆站, 5=看平板, 6=指向, 7=雙手舉
        this.anims.create({
          key: 'boss_idle',
          frames: [{ key: 'char_boss', frame: 0 }],
          frameRate: 1, repeat: -1,
        });
        // typing（running 狀態）：看平板 → 站立 → 看平板，全正面
        this.anims.create({
          key: 'boss_typing',
          frames: [5, 0, 5, 3].map(f => ({ key: 'char_boss', frame: f })),
          frameRate: 2, repeat: -1,
        });
        // thinking 狀態：指向 → 放鬆
        this.anims.create({
          key: 'boss_thinking',
          frames: [6, 4].map(f => ({ key: 'char_boss', frame: f })),
          frameRate: 2, repeat: -1,
        });
        // 走路動畫（_walkTo 時使用）
        this.anims.create({
          key: 'boss_walk',
          frames: [1, 2, 1, 0].map(f => ({ key: 'char_boss', frame: f })),
          frameRate: 5, repeat: -1,
        });
      } else {
        // Pixel Agents spritesheet（16×32，7 cols × 3 rows）
        // Row 0（朝下）：col 0,1,2 = 走路；col 5,6 = 打字/動作
        this.anims.create({
          key: `${role.id}_idle`,
          frames: [{ key: texKey, frame: 1 }],
          frameRate: 1, repeat: -1,
        });
        this.anims.create({
          key: `${role.id}_typing`,
          frames: [0, 1, 2, 1].map(f => ({ key: texKey, frame: f })),
          frameRate: 6, repeat: -1,
        });
        this.anims.create({
          key: `${role.id}_thinking`,
          frames: [5, 6].map(f => ({ key: texKey, frame: f })),
          frameRate: 3, repeat: -1,
        });
      }
    });

    // Phase 4 Step 3.0b: 為 A 組 + 坐姿變體建立動畫（v3 4-frame mapping）
    // texture key 規劃：char_a_man / char_a_woman / char_aming_sitting / char_xiaomei_sitting / char_a_man_sitting / char_a_woman_sitting
    const v3FrameMap = {
      idle: 0, talking: 1, typing: 1, thinking: 2, reacting: 3,
      pointing: 1,  // fallback to talking
      tired: 2,     // fallback to thinking
    };
    const extraIds = [
      'a_man', 'a_woman',
      'aming_sitting', 'xiaomei_sitting',
      'a_man_sitting', 'a_woman_sitting',
    ];
    extraIds.forEach(id => {
      const tex = `char_${id}`;
      if (!this.textures.exists(tex)) return;
      Object.entries(v3FrameMap).forEach(([anim, frame]) => {
        const key = `${id}_${anim}`;
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: [{ key: tex, frame }],
            frameRate: 1, repeat: -1,
          });
        }
      });
    });
  }

  _drawChar(g, ox, oy, FW, FH, role, frame) {
    const cx   = ox + 24;
    const bob  = [0, -1,  0,  1][frame];
    const armS = [0,  3,  0, -2][frame];
    const DARK = 0x080808;

    // 快速填色 helper
    const f  = (col, x, y, w, h, a = 1) => { g.fillStyle(col, a); g.fillRect(x, y, w, h); };
    // 帶深色輪廓的填色 helper（讓形體輪廓清晰）
    const ol = (col, x, y, w, h) => { f(DARK, x-1, y-1, w+2, h+2); f(col, x, y, w, h); };

    // ── 頭髮 ──────────────────────────────────────────────────
    ol(role.hair, cx - 14, oy + bob,     28, 12);
    f(role.hair,  cx - 15, oy + 4 + bob,  3,  8);  // 左鬢
    f(role.hair,  cx + 12, oy + 4 + bob,  3,  8);  // 右鬢
    f(0xffffff,   cx - 10, oy + 1 + bob,  6,  3, 0.18);  // 髮光

    // ── 臉 ───────────────────────────────────────────────────
    ol(role.skin, cx - 12, oy + 10 + bob, 24, 17);
    f(0xffffff,   cx - 10, oy + 11 + bob,  7,  5, 0.12);  // 臉部光澤

    // 耳朵
    ol(role.skin, cx - 16, oy + 15 + bob, 4, 7);
    ol(role.skin, cx + 12, oy + 15 + bob, 4, 7);

    // 眉毛
    f(role.hair, cx - 10, oy + 14 + bob, 7, 2);
    f(role.hair, cx +  3, oy + 14 + bob, 7, 2);

    // 眼睛（眼白 + 虹膜 + 瞳孔 + 亮點）
    f(0xf0f0f0,  cx - 10, oy + 17 + bob,  8, 5);   // 左眼白
    f(0xf0f0f0,  cx +  2, oy + 17 + bob,  8, 5);   // 右眼白
    f(0x4477cc,  cx -  9, oy + 18 + bob,  6, 3);   // 虹膜
    f(0x4477cc,  cx +  3, oy + 18 + bob,  6, 3);
    f(DARK,      cx -  8, oy + 18 + bob,  4, 3);   // 瞳孔
    f(DARK,      cx +  4, oy + 18 + bob,  4, 3);
    f(0xffffff,  cx -  7, oy + 18 + bob,  1, 1);   // 亮點
    f(0xffffff,  cx +  5, oy + 18 + bob,  1, 1);

    // 嘴巴
    if (frame === 1 || frame === 2) {
      f(DARK,    cx - 5, oy + 24 + bob, 10, 5);
      f(0xcc4433,cx - 4, oy + 25 + bob,  8, 3);
      f(0xffffff,cx - 3, oy + 25 + bob,  6, 1, 0.5);
    } else {
      f(DARK,    cx - 4, oy + 24 + bob,  8, 2);
      f(0xaa3322,cx - 3, oy + 25 + bob,  6, 1);
    }

    // ── 頸部 ─────────────────────────────────────────────────
    f(DARK,     cx - 4, oy + 26 + bob, 8, 8);
    f(role.skin,cx - 3, oy + 27 + bob, 6, 7);

    // ── 上衣 ─────────────────────────────────────────────────
    const bY = oy + 33;
    ol(role.shirt, cx - 14, bY, 28, 18);
    f(0xffffff,    cx - 12, bY + 1, 10,  7, 0.13);  // 衣服亮部
    f(0x000000,    cx - 14, bY + 13, 28,  5, 0.18); // 衣服暗部
    // V 領
    f(role.skin,   cx - 5, bY,     10,  9, 0.9);
    f(role.skin,   cx - 3, bY + 1,  6,  8, 0.9);

    // ── 手臂 ─────────────────────────────────────────────────
    ol(role.shirt, cx - 23, bY + 2 + armS,  9, 14);
    ol(role.skin,  cx - 22, bY + 15 + armS, 7,  5);  // 左手
    ol(role.shirt, cx + 14, bY + 2 - armS,  9, 14);
    ol(role.skin,  cx + 15, bY + 15 - armS, 7,  5);  // 右手

    // ── 褲子 ─────────────────────────────────────────────────
    const pY    = bY + 18;
    const legS  = [0, 2, 0, -2][frame];
    const pants = role.pants ?? 0x1a2a4a;
    const shoes = role.shoes ?? 0x1a0a00;
    ol(pants, cx - 13, pY + legS,      11, 7);   // 左腿
    ol(pants, cx +  2, pY - legS,      11, 7);   // 右腿
    // 鞋子
    f(shoes, cx - 14, pY + 6 + legS,  13, 5);    // 左鞋
    f(shoes, cx +  1, pY + 6 - legS,  13, 5);    // 右鞋
    f(0x3a2010, cx - 13, pY + 6 + legS,   3, 2, 0.5);  // 左鞋亮部
    f(0x3a2010, cx +  2, pY + 6 - legS,   3, 2, 0.5);  // 右鞋亮部

    // ── 配件 ─────────────────────────────────────────────────
    if (role.acc === 'glasses') {
      g.lineStyle(1.5, 0xcccccc, 1);
      g.strokeRect(cx - 11, oy + 16 + bob,  8, 6);
      g.strokeRect(cx +  3, oy + 16 + bob,  8, 6);
      g.lineBetween(cx - 3, oy + 19 + bob, cx + 3, oy + 19 + bob);
      f(0xcccccc, cx - 15, oy + 18 + bob, 4, 2);
      f(0xcccccc, cx + 11, oy + 18 + bob, 4, 2);
    }
    if (role.acc === 'headphones') {
      f(0x1a1a2e, cx - 18, oy + 8 + bob,  5, 12);
      f(0x1a1a2e, cx + 13, oy + 8 + bob,  5, 12);
      g.lineStyle(3, 0x2a2a4e, 1);
      g.beginPath(); g.arc(cx, oy + 8 + bob, 16, Math.PI, 0, false); g.strokePath();
      f(0x5555bb, cx - 19, oy + 11 + bob,  5,  8);
      f(0x5555bb, cx + 14, oy + 11 + bob,  5,  8);
    }
    if (role.id === 'boss') {
      f(DARK,    cx - 5, bY,      10,  4);
      f(0xaa0000,cx - 4, bY + 1,   8,  2);
      f(DARK,    cx - 4, bY + 3,   8, 14);
      f(0xcc1111,cx - 3, bY + 4,   6, 12);
      f(0xee3333,cx - 1, bY + 5,   2,  5);
    }
  }
}
