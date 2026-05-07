// OfficeScene: 等角辦公室主場景
const ISO_W = 64;  // 磚寬
const ISO_H = 32;  // 磚高

// 等角座標 → 螢幕座標
function isoToScreen(tx, ty, originX, originY) {
  return {
    x: originX + (tx - ty) * ISO_W / 2,
    y: originY + (tx + ty) * ISO_H / 2,
  };
}

// 辦公室地圖（10×8），1=地板, 2=走道
const MAP = [
  [1,1,1,1,1,1,1,1,1,1],
  [1,2,1,1,2,2,1,1,2,1],
  [1,1,1,1,2,2,1,1,1,1],
  [1,1,1,1,2,2,1,1,1,1],
  [1,2,1,1,2,2,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,2,2,1,1,2,2,1,1],
  [1,1,1,1,1,1,1,1,1,1],
];

// 7 個模組的桌子位置（tile x, tile y）
const DESK_POSITIONS = {
  market:  { tx: 1, ty: 1, label: '📊 市場分析師' },
  news:    { tx: 7, ty: 1, label: '📰 新聞記者'   },
  swing:   { tx: 1, ty: 4, label: '📈 波段交易員' },
  dca:     { tx: 7, ty: 4, label: '💰 定投經理'   },
  ml:      { tx: 5, ty: 6, label: '🤖 ML 工程師'  },
  agent:   { tx: 2, ty: 6, label: '🤖 AI 交易員'  },
  boss:    { tx: 4, ty: 2, label: '🎯 策略長'      },
};

// 資料流向（誰把資料送給誰）
const DATA_FLOWS = {
  market: ['boss'],
  news:   ['boss'],
  ml:     ['agent'],
  agent:  ['boss'],
  boss:   ['market', 'news', 'swing', 'dca'],
};

export class OfficeScene extends Phaser.Scene {
  constructor() { super('OfficeScene'); }

  create() {
    const { width, height } = this.scale;
    this.originX = width  * 0.5;
    this.originY = height * 0.15;

    this.characters = {};   // id → { sprite, desk, state, bubble }
    this.state = null;      // 從 API 拿到的最新狀態

    this._buildFloor();
    this._buildFurniture();
    this._buildCharacters();
    this._buildLighting();

    // 每 5 秒 poll API
    this._pollState();
    this.time.addEvent({ delay: 5000, callback: this._pollState, callbackScope: this, loop: true });

    // 互動：點角色放大泡泡
    this.input.on('gameobjectdown', (ptr, obj) => {
      if (obj.roleId) this._toggleBubble(obj.roleId);
    });

    // 視窗縮放
    this.scale.on('resize', this._onResize, this);
  }

  // ── 地板 ────────────────────────────────────────────────────
  _buildFloor() {
    this.floorGroup = this.add.group();
    for (let ty = 0; ty < MAP.length; ty++) {
      for (let tx = 0; tx < MAP[ty].length; tx++) {
        const key = MAP[ty][tx] === 2 ? 'tile_aisle' : 'tile_floor';
        const { x, y } = isoToScreen(tx, ty, this.originX, this.originY);
        const tile = this.add.image(x, y, key).setOrigin(0.5, 0.5);
        tile.setDepth(tx + ty);
        this.floorGroup.add(tile);
      }
    }
  }

  // ── 家具（桌子+椅子+螢幕）──────────────────────────────────
  _buildFurniture() {
    this.furnitureGroup = this.add.group();
    Object.entries(DESK_POSITIONS).forEach(([id, pos]) => {
      const { tx, ty } = pos;
      const { x, y } = isoToScreen(tx, ty, this.originX, this.originY);
      const depth = tx + ty + 0.5;

      // 桌子
      const desk = this.add.image(x, y - 8, 'desk').setOrigin(0.5, 0.5).setDepth(depth);
      // 螢幕（桌上）
      const mon = this.add.image(x - 6, y - 30, 'monitor').setOrigin(0.5, 0.5).setDepth(depth + 0.1);
      // 第二個螢幕（大老闆有兩個）
      if (id === 'boss') {
        this.add.image(x + 10, y - 32, 'monitor').setOrigin(0.5, 0.5).setDepth(depth + 0.1).setScale(0.85);
      }
      // 椅子
      const chair = this.add.image(x + 4, y + 14, 'chair').setOrigin(0.5, 0.5).setDepth(depth - 0.1);

      this.furnitureGroup.addMultiple([desk, mon, chair]);

      // 桌子名稱標籤
      this.add.text(x, y - 50, pos.label, {
        fontSize: '10px',
        color: '#6E8AA8',
        fontFamily: 'Consolas, monospace',
      }).setOrigin(0.5, 1).setDepth(depth + 0.5);
    });
  }

  // ── 角色 ────────────────────────────────────────────────────
  _buildCharacters() {
    Object.entries(DESK_POSITIONS).forEach(([id, pos]) => {
      const { tx, ty } = pos;
      const { x, y } = isoToScreen(tx, ty, this.originX, this.originY);

      // 角色 sprite（使用 spritesheet）
      const sprite = this.add.sprite(x, y - 14, `char_${id}`, 0)
        .setOrigin(0.5, 1)
        .setDepth(tx + ty + 1)
        .setInteractive();
      sprite.roleId = id;
      sprite.play(`${id}_idle`);

      // 輕微浮動動畫（idle 時上下晃動）
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 2,
        duration: 800 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 800,
      });

      // 思考泡泡
      const bubbleBg = this.add.image(x, y - 68, 'bubble_bg')
        .setOrigin(0.5, 1)
        .setDepth(tx + ty + 2)
        .setAlpha(0)
        .setScale(0.8);

      const bubbleText = this.add.text(x, y - 80, '...', {
        fontSize: '9px',
        color: '#D8EEFB',
        fontFamily: 'Consolas, monospace',
        wordWrap: { width: 140 },
        align: 'center',
      }).setOrigin(0.5, 1).setDepth(tx + ty + 2.1).setAlpha(0);

      // 狀態指示燈（小圓點在角色頭上）
      const statusDot = this.add.graphics().setDepth(tx + ty + 2.2);
      this._drawStatusDot(statusDot, x + 6, y - 40, 'idle');

      this.characters[id] = {
        sprite, bubbleBg, bubbleText, statusDot,
        tx, ty, x, y,
        state: 'idle',
        bubbleVisible: false,
        isWalking: false,
        homeTx: tx, homeTy: ty,
      };
    });
  }

  _drawStatusDot(g, x, y, status) {
    g.clear();
    const colors = { idle: 0x3a5068, running: 0xFFB300, done: 0x00E676, live: 0x00E5FF, thinking: 0xBB86FC };
    g.fillStyle(colors[status] || 0x3a5068, 1);
    g.fillCircle(x, y, 4);
  }

  // ── 燈光效果 ────────────────────────────────────────────────
  _buildLighting() {
    // 頂部微光（像辦公室天花板燈）
    const light = this.add.graphics().setDepth(0.1);
    light.fillGradientStyle(0x001830, 0x001830, 0x0e1e30, 0x0e1e30, 0.3);
    light.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  // ── Poll API 狀態 ────────────────────────────────────────────
  async _pollState() {
    try {
      const res = await fetch('http://localhost:8765/api/state');
      if (!res.ok) return;
      const data = await res.json();
      this._applyState(data);
    } catch (e) {
      // 離線時用假資料
      this._applyState(this._demoState());
    }
  }

  _applyState(data) {
    this.state = data;
    const modules = data.modules || {};

    Object.entries(modules).forEach(([id, mod]) => {
      const ch = this.characters[id];
      if (!ch) return;

      const prevState = ch.state;
      ch.state = mod.status;

      // 更新狀態燈
      this._drawStatusDot(ch.statusDot, ch.x + 6, ch.y - 40, mod.status);

      // 更新泡泡文字
      const txt = mod.last_output || '...';
      ch.bubbleText.setText(txt);

      // 狀態剛變成 running → 開始走路到相關桌子
      if (prevState !== 'running' && mod.status === 'running' && !ch.isWalking) {
        const targets = DATA_FLOWS[id] || [];
        if (targets.length > 0) {
          this._walkTo(id, targets[0], () => this._walkHome(id));
        }
        ch.sprite.play(`${id}_walk_s`);
        // 顯示思考泡泡
        this._showBubble(id);
      }

      // 狀態變成 done/idle → 回動畫
      if (mod.status === 'idle' || mod.status === 'done') {
        if (!ch.isWalking) ch.sprite.play(`${id}_idle`);
      }

      // running/thinking → 動畫顯示打字感覺
      if (mod.status === 'thinking') {
        ch.sprite.play(`${id}_walk_n`);
        this._showBubble(id);
        this._animateTyping(id);
      }
    });

    // 更新 HTML 狀態面板
    this._updateHTMLPanel(data);

    // 觸發資料流粒子效果
    if (data.data_flows) {
      data.data_flows.forEach(flow => {
        if (flow.active) this._triggerDataFlow(flow.from, flow.to);
      });
    }
  }

  // ── 走路到指定桌子 ──────────────────────────────────────────
  _walkTo(id, targetId, onComplete) {
    const ch = this.characters[id];
    const target = this.characters[targetId];
    if (!ch || !target || ch.isWalking) return;

    ch.isWalking = true;
    const dx = target.x - ch.x;
    // 選擇方向
    const dir = dx > 0 ? 's' : 'w';
    ch.sprite.play(`${id}_walk_${dir}`);

    this.tweens.add({
      targets: [ch.sprite, ch.bubbleBg, ch.bubbleText, ch.statusDot],
      x: target.x,
      y: { value: `+=${target.y - ch.y}`, ease: 'Linear' },
      duration: 1200,
      ease: 'Linear',
      onUpdate: () => {
        // 保持泡泡在角色頭上
        const sy = ch.sprite.y;
        ch.bubbleBg.y = sy - 54;
        ch.bubbleText.y = sy - 66;
        // 更新深度
        const iso = this._screenToIso(ch.sprite.x, ch.sprite.y);
        const d = iso.tx + iso.ty + 1;
        ch.sprite.setDepth(d);
      },
      onComplete: () => {
        ch.isWalking = false;
        ch.sprite.play(`${id}_idle`);
        if (onComplete) onComplete();
      },
    });
  }

  _walkHome(id) {
    const ch = this.characters[id];
    if (!ch) return;
    ch.isWalking = true;
    ch.sprite.play(`${id}_walk_e`);
    this.tweens.add({
      targets: ch.sprite,
      x: ch.x,
      y: ch.y - 14,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        ch.isWalking = false;
        ch.sprite.setPosition(ch.x, ch.y - 14);
        ch.sprite.play(`${id}_idle`);
        this._hideBubble(id);
      },
    });
  }

  // 粗略的 screen → iso 換算（用於深度排序）
  _screenToIso(sx, sy) {
    const rx = sx - this.originX;
    const ry = sy - this.originY;
    return {
      tx: Math.round((rx / (ISO_W / 2) + ry / (ISO_H / 2)) / 2),
      ty: Math.round((ry / (ISO_H / 2) - rx / (ISO_W / 2)) / 2),
    };
  }

  // ── 泡泡顯示/隱藏 ─────────────────────────────────────────
  _showBubble(id) {
    const ch = this.characters[id];
    if (!ch) return;
    this.tweens.add({
      targets: [ch.bubbleBg, ch.bubbleText],
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 200, ease: 'Back.easeOut',
    });
    ch.bubbleVisible = true;
  }

  _hideBubble(id) {
    const ch = this.characters[id];
    if (!ch) return;
    this.tweens.add({
      targets: [ch.bubbleBg, ch.bubbleText],
      alpha: 0,
      duration: 300,
    });
    ch.bubbleVisible = false;
  }

  _toggleBubble(id) {
    const ch = this.characters[id];
    if (!ch) return;
    if (ch.bubbleVisible) this._hideBubble(id);
    else this._showBubble(id);
  }

  // ── 打字動畫（泡泡文字逐字顯示）────────────────────────────
  _animateTyping(id) {
    const ch = this.characters[id];
    if (!ch || !this.state) return;
    const full = this.state.modules?.[id]?.last_output || '思考中...';
    let i = 0;
    this._showBubble(id);
    const timer = this.time.addEvent({
      delay: 60,
      repeat: full.length - 1,
      callback: () => {
        i++;
        ch.bubbleText.setText(full.slice(0, i) + '▌');
        if (i >= full.length) ch.bubbleText.setText(full);
      },
    });
  }

  // ── 資料流粒子（從 A 飛向 B）───────────────────────────────
  _triggerDataFlow(fromId, toId) {
    const from = this.characters[fromId];
    const to   = this.characters[toId];
    if (!from || !to) return;

    const NUM = 5;
    for (let i = 0; i < NUM; i++) {
      this.time.delayedCall(i * 100, () => {
        const dot = this.add.image(from.x, from.y - 20, 'particle')
          .setDepth(99)
          .setAlpha(0.9)
          .setScale(0.8);
        this.tweens.add({
          targets: dot,
          x: to.x + Phaser.Math.Between(-8, 8),
          y: (to.y - 20) + Phaser.Math.Between(-8, 8),
          alpha: 0,
          scale: 0.3,
          duration: 800,
          ease: 'Power2',
          onComplete: () => dot.destroy(),
        });
      });
    }
  }

  // ── 更新右側 HTML 狀態面板 ──────────────────────────────────
  _updateHTMLPanel(data) {
    const list = document.getElementById('module-list');
    const timeEl = document.getElementById('update-time');
    if (!list || !timeEl) return;

    const labels = {
      market: '📊 市場', news: '📰 新聞', boss: '🎯 策略長',
      swing: '📈 波段',  dca: '💰 DCA',   ml: '🤖 ML', agent: '🤖 Agent',
    };
    list.innerHTML = Object.entries(data.modules || {}).map(([id, mod]) => `
      <div class="module-status">
        <div class="status-dot ${mod.status}"></div>
        <div class="module-name">${labels[id] || id}</div>
      </div>
      <div class="module-output">${mod.last_output || '—'}</div>
    `).join('');

    timeEl.textContent = `更新 ${data.updated_at || '—'}`;
  }

  // ── Demo 假資料（API 離線時）────────────────────────────────
  _demoState() {
    const t = Date.now();
    const cycle = Math.floor(t / 3000) % 7;
    const ids = ['market', 'news', 'boss', 'swing', 'dca', 'ml', 'agent'];
    const outputs = {
      market: 'RISK_ON  VIX 14.2',
      news:   '+0.82 台積電利多',
      boss:   '建議買進 2330  停損 -5%',
      swing:  'RSI 32 超賣訊號',
      dca:    '0050 定期定額執行',
      ml:     '漲機率 72%  未來3日',
      agent:  '分析市場中...',
    };
    const modules = {};
    ids.forEach((id, i) => {
      modules[id] = {
        status: i === cycle ? 'running' : (i < cycle ? 'done' : 'idle'),
        last_output: outputs[id],
        confidence: 0.7,
      };
    });
    modules['boss'].status = 'live';
    modules['agent'].status = cycle === 6 ? 'thinking' : 'idle';

    return {
      updated_at: new Date().toLocaleTimeString('zh-TW'),
      modules,
      data_flows: [
        { from: 'market', to: 'boss', active: cycle === 0 },
        { from: 'news',   to: 'boss', active: cycle === 1 },
        { from: 'ml',     to: 'agent', active: cycle === 5 },
        { from: 'agent',  to: 'boss', active: cycle === 6 },
      ],
    };
  }

  _onResize(gameSize) {
    this.originX = gameSize.width * 0.5;
    this.originY = gameSize.height * 0.15;
  }

  update() {
    // 每幀確保角色深度排序正確
    Object.values(this.characters).forEach(ch => {
      if (!ch.isWalking) return;
      const iso = this._screenToIso(ch.sprite.x, ch.sprite.y);
      ch.sprite.setDepth(iso.tx + iso.ty + 1);
    });
  }
}
