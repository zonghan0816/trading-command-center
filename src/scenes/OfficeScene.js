// OfficeScene: 等角辦公室主場景
const ISO_W = 96;   // tile screen width  (64 × 1.5)
const ISO_H = 48;   // tile screen height (32 × 1.5)
const S     = 1.5;  // uniform sprite / texture scale

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
  market: { tx: 1, ty: 1, label: '📊 市場分析師' },
  news:   { tx: 7, ty: 1, label: '📰 新聞記者'   },
  swing:  { tx: 1, ty: 4, label: '📈 波段交易員' },
  dca:    { tx: 7, ty: 4, label: '💰 定投經理'   },
  ml:     { tx: 5, ty: 6, label: '🤖 ML 工程師'  },
  agent:  { tx: 2, ty: 6, label: '🤖 AI 交易員'  },
  boss:   { tx: 4, ty: 2, label: '🎯 策略長'      },
};

// 資料流向
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
    try {
      const { width, height } = this.scale;
      // shift left so map doesn't overlap right-panel (~220px)
      this.originX = width  * 0.40;
      this.originY = height * 0.11;

      this.characters = {};
      this.state = null;

      this._buildFloor();
      this._buildFurniture();
      this._buildCharacters();
      this._buildLighting();

      // Poll API 每 5 秒
      this._pollState();
      this.time.addEvent({ delay: 5000, callback: this._pollState, callbackScope: this, loop: true });

      // 點角色切換泡泡
      this.input.on('gameobjectdown', (ptr, obj) => {
        if (obj.roleId) this._toggleBubble(obj.roleId);
      });

      this.scale.on('resize', this._onResize, this);
    } catch (e) {
      console.error('OfficeScene create error:', e);
    }
  }

  // ── 地板 ──────────────────────────────────────────────────────
  _buildFloor() {
    for (let ty = 0; ty < MAP.length; ty++) {
      for (let tx = 0; tx < MAP[ty].length; tx++) {
        const key = MAP[ty][tx] === 2 ? 'tile_aisle' : 'tile_floor';
        const { x, y } = isoToScreen(tx, ty, this.originX, this.originY);
        this.add.image(x, y, key).setOrigin(0.5, 0.5).setScale(S).setDepth(tx + ty);
      }
    }
  }

  // ── 家具（桌子 + 椅子 + 螢幕）────────────────────────────────
  _buildFurniture() {
    Object.entries(DESK_POSITIONS).forEach(([id, pos]) => {
      const { tx, ty } = pos;
      const { x, y } = isoToScreen(tx, ty, this.originX, this.originY);
      const depth = tx + ty + 0.5;

      this.add.image(x,      y - 12,  'desk'   ).setOrigin(0.5, 0.5).setScale(S      ).setDepth(depth);
      this.add.image(x - 9,  y - 45,  'monitor').setOrigin(0.5, 0.5).setScale(S      ).setDepth(depth + 0.1);
      if (id === 'boss') {
        this.add.image(x + 15, y - 48, 'monitor').setOrigin(0.5, 0.5).setScale(S * 0.85).setDepth(depth + 0.1);
      }
      this.add.image(x + 6,  y + 21,  'chair'  ).setOrigin(0.5, 0.5).setScale(S      ).setDepth(depth - 0.1);

      this.add.text(x, y - 72, pos.label, {
        fontSize: '12px', color: '#6E8AA8', fontFamily: 'Consolas, monospace',
      }).setOrigin(0.5, 1).setDepth(depth + 0.5);
    });
  }

  // ── 角色 ──────────────────────────────────────────────────────
  _buildCharacters() {
    Object.entries(DESK_POSITIONS).forEach(([id, pos]) => {
      const { tx, ty } = pos;
      const { x, y } = isoToScreen(tx, ty, this.originX, this.originY);

      const sprite = this.add.sprite(x, y - 21, `char_${id}`, 0)
        .setOrigin(0.5, 1)
        .setDepth(tx + ty + 1)
        .setScale(S)
        .setInteractive();
      sprite.roleId = id;
      sprite.play(`${id}_idle`);

      // 輕微浮動
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 3,
        duration: 800 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Math.random() * 800,
      });

      // 思考泡泡背景
      const bubbleBg = this.add.image(x, y - 102, 'bubble_bg')
        .setOrigin(0.5, 1).setDepth(tx + ty + 2).setAlpha(0).setScale(S * 0.8);

      // 泡泡文字
      const bubbleText = this.add.text(x, y - 110, '...', {
        fontSize: '10px', color: '#D8EEFB',
        fontFamily: 'Consolas, monospace',
        wordWrap: { width: 150 }, align: 'center',
      }).setOrigin(0.5, 1).setDepth(tx + ty + 2.1).setAlpha(0);

      // 狀態指示燈
      const statusDot = this.add.graphics()
        .setDepth(tx + ty + 2.2)
        .setPosition(x + 9, y - 60);
      this._drawStatusDot(statusDot, 'idle');

      this.characters[id] = {
        sprite, bubbleBg, bubbleText, statusDot,
        homeX: x, homeY: y - 21,
        tx, ty,
        state: 'idle',
        bubbleVisible: false,
        isWalking: false,
      };
    });
  }

  _drawStatusDot(g, status) {
    const colors = { idle: 0x3a5068, running: 0xFFB300, done: 0x00E676, live: 0x00E5FF, thinking: 0xBB86FC };
    g.clear();
    g.fillStyle(colors[status] || 0x3a5068, 1);
    g.fillCircle(0, 0, 4);
  }

  // ── 環境光層（最底層，略帶漸層）──────────────────────────────
  _buildLighting() {
    const light = this.add.graphics().setDepth(-1);
    light.fillGradientStyle(0x001428, 0x001428, 0x0e1e30, 0x0e1e30, 0.25);
    light.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  // ── Poll API 狀態 ─────────────────────────────────────────────
  async _pollState() {
    try {
      const res = await fetch('http://localhost:8765/api/state');
      if (res.ok) {
        const data = await res.json();
        this._applyState(data);
        return;
      }
    } catch (_) { /* 離線 */ }
    this._applyState(this._demoState());
  }

  _applyState(data) {
    this.state = data;
    const modules = data.modules || {};

    Object.entries(modules).forEach(([id, mod]) => {
      const ch = this.characters[id];
      if (!ch) return;

      const prevState = ch.state;
      ch.state = mod.status;

      this._drawStatusDot(ch.statusDot, mod.status);

      const txt = (mod.last_output || '...').slice(0, 60);
      ch.bubbleText.setText(txt);

      // 剛變成 running → 走路去目標桌
      if (prevState !== 'running' && mod.status === 'running' && !ch.isWalking) {
        const targets = DATA_FLOWS[id] || [];
        if (targets.length > 0) {
          this._walkTo(id, targets[0], () => this._walkHome(id));
        }
        this._showBubble(id);
      }

      // 回 idle/done
      if ((mod.status === 'idle' || mod.status === 'done') && !ch.isWalking) {
        ch.sprite.play(`${id}_idle`);
      }

      // thinking → 打字效果
      if (mod.status === 'thinking') {
        ch.sprite.play(`${id}_walk_n`);
        this._animateTyping(id);
      }
    });

    this._updateHTMLPanel(data);

    if (data.data_flows) {
      data.data_flows.forEach(flow => {
        if (flow.active) this._triggerDataFlow(flow.from, flow.to);
      });
    }
  }

  // ── 走路 ──────────────────────────────────────────────────────
  _walkTo(id, targetId, onComplete) {
    const ch     = this.characters[id];
    const target = this.characters[targetId];
    if (!ch || !target || ch.isWalking) return;

    ch.isWalking = true;
    const dir = (target.homeX - ch.sprite.x) > 0 ? 's' : 'w';
    ch.sprite.play(`${id}_walk_${dir}`);

    this.tweens.add({
      targets: ch.sprite,
      x: target.homeX,
      y: target.homeY,
      duration: 1200,
      ease: 'Linear',
      onUpdate: () => {
        const sx = ch.sprite.x;
        const sy = ch.sprite.y;
        ch.bubbleBg.setPosition(sx, sy - 81);
        ch.bubbleText.setPosition(sx, sy - 89);
        ch.statusDot.setPosition(sx + 9, sy - 39);
        const iso = this._screenToIso(sx, sy);
        ch.sprite.setDepth(iso.tx + iso.ty + 1);
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
      x: ch.homeX,
      y: ch.homeY,
      duration: 1000,
      ease: 'Linear',
      onUpdate: () => {
        ch.bubbleBg.setPosition(ch.sprite.x, ch.sprite.y - 81);
        ch.bubbleText.setPosition(ch.sprite.x, ch.sprite.y - 89);
        ch.statusDot.setPosition(ch.sprite.x + 9, ch.sprite.y - 39);
      },
      onComplete: () => {
        ch.isWalking = false;
        ch.sprite.play(`${id}_idle`);
        ch.bubbleBg.setPosition(ch.homeX, ch.homeY - 81);
        ch.bubbleText.setPosition(ch.homeX, ch.homeY - 89);
        ch.statusDot.setPosition(ch.homeX + 9, ch.homeY - 39);
        this._hideBubble(id);
      },
    });
  }

  _screenToIso(sx, sy) {
    const rx = sx - this.originX;
    const ry = sy - this.originY;
    return {
      tx: Math.round((rx / (ISO_W / 2) + ry / (ISO_H / 2)) / 2),
      ty: Math.round((ry / (ISO_H / 2) - rx / (ISO_W / 2)) / 2),
    };
  }

  // ── 泡泡 ──────────────────────────────────────────────────────
  _showBubble(id) {
    const ch = this.characters[id];
    if (!ch || ch.bubbleVisible) return;
    this.tweens.add({
      targets: [ch.bubbleBg, ch.bubbleText],
      alpha: 1, duration: 200, ease: 'Back.easeOut',
    });
    ch.bubbleVisible = true;
  }

  _hideBubble(id) {
    const ch = this.characters[id];
    if (!ch || !ch.bubbleVisible) return;
    this.tweens.add({
      targets: [ch.bubbleBg, ch.bubbleText],
      alpha: 0, duration: 300,
    });
    ch.bubbleVisible = false;
  }

  _toggleBubble(id) {
    const ch = this.characters[id];
    if (!ch) return;
    ch.bubbleVisible ? this._hideBubble(id) : this._showBubble(id);
  }

  // ── 打字動畫 ──────────────────────────────────────────────────
  _animateTyping(id) {
    const ch = this.characters[id];
    if (!ch || !this.state) return;
    const full = (this.state.modules?.[id]?.last_output || '思考中...').slice(0, 60);
    let i = 0;
    this._showBubble(id);
    this.time.addEvent({
      delay: 55, repeat: full.length - 1,
      callback: () => {
        i++;
        ch.bubbleText.setText(i < full.length ? full.slice(0, i) + '▌' : full);
      },
    });
  }

  // ── 資料流粒子 ────────────────────────────────────────────────
  _triggerDataFlow(fromId, toId) {
    const from = this.characters[fromId];
    const to   = this.characters[toId];
    if (!from || !to) return;
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 110, () => {
        const dot = this.add.image(from.sprite.x, from.sprite.y - 20, 'particle')
          .setDepth(99).setAlpha(0.9).setScale(0.8);
        this.tweens.add({
          targets: dot,
          x: to.sprite.x + Phaser.Math.Between(-8, 8),
          y: to.sprite.y - 20 + Phaser.Math.Between(-8, 8),
          alpha: 0, scale: 0.3, duration: 800, ease: 'Power2',
          onComplete: () => dot.destroy(),
        });
      });
    }
  }

  // ── HTML 狀態面板 ─────────────────────────────────────────────
  _updateHTMLPanel(data) {
    const list   = document.getElementById('module-list');
    const timeEl = document.getElementById('update-time');
    if (!list || !timeEl) return;

    const labels = {
      market: '📊 市場', news: '📰 新聞', boss: '🎯 策略長',
      swing:  '📈 波段', dca:  '💰 DCA',  ml:   '🤖 ML', agent: '🤖 Agent',
    };
    list.innerHTML = Object.entries(data.modules || {}).map(([id, mod]) => `
      <div class="module-status">
        <div class="status-dot ${mod.status}"></div>
        <div class="module-name">${labels[id] || id}</div>
      </div>
      <div class="module-output">${(mod.last_output || '—').slice(0, 50)}</div>
    `).join('');

    timeEl.textContent = `更新 ${data.updated_at || '—'}`;
  }

  // ── Demo 假資料（API 離線時）──────────────────────────────────
  _demoState() {
    const cycle = Math.floor(Date.now() / 3000) % 7;
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
        status:      i === cycle ? 'running' : (i < cycle ? 'done' : 'idle'),
        last_output: outputs[id],
        confidence:  0.7,
      };
    });
    modules['boss'].status  = 'live';
    modules['agent'].status = cycle === 6 ? 'thinking' : 'idle';
    return {
      updated_at: new Date().toLocaleTimeString('zh-TW'),
      modules,
      data_flows: [
        { from: 'market', to: 'boss',  active: cycle === 0 },
        { from: 'news',   to: 'boss',  active: cycle === 1 },
        { from: 'ml',     to: 'agent', active: cycle === 5 },
        { from: 'agent',  to: 'boss',  active: cycle === 6 },
      ],
    };
  }

  _onResize(gameSize) {
    this.originX = gameSize.width  * 0.40;
    this.originY = gameSize.height * 0.11;
  }

  update() {
    Object.values(this.characters).forEach(ch => {
      if (!ch.isWalking) return;
      const iso = this._screenToIso(ch.sprite.x, ch.sprite.y);
      ch.sprite.setDepth(iso.tx + iso.ty + 1);
    });
  }
}
