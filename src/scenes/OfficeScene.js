// OfficeScene: 前視角像素辦公室
const WALL_H_RATIO = 0.44;   // 牆壁佔畫面高度比例

// 工作站定義：前後兩排 + 特殊位置
const STATIONS = {
  market: { row: 'back',    col: 0, desk: 'desk',      mon: 'monitor_dual', label: '📊 市場分析師' },
  boss:   { row: 'back',    col: 1, desk: 'desk_boss',  mon: 'monitor',      label: '🎯 策略長'     },
  ml:     { row: 'back',    col: 2, desk: 'desk',       mon: 'monitor',      label: '🤖 ML 工程師'  },
  news:   { row: 'front',   col: 0, desk: 'desk',       mon: 'monitor',      label: '📰 新聞記者'   },
  swing:  { row: 'front',   col: 1, desk: 'desk',       mon: 'monitor',      label: '📈 波段交易員' },
  dca:    { row: 'front',   col: 2, desk: 'desk',       mon: 'monitor',      label: '💰 定投經理'   },
  agent:  { row: 'special', col: 0, desk: null,         mon: null,           label: '🤖 AI 交易員'  },
};

const DATA_FLOWS = {
  market: ['boss'], news: ['boss'], ml: ['agent'], agent: ['boss'],
  boss: ['market', 'news', 'swing', 'dca'],
};

export class OfficeScene extends Phaser.Scene {
  constructor() { super('OfficeScene'); }

  create() {
    try {
      const { width, height } = this.scale;
      this.W = width;
      this.H = height;
      this.wallH = height * WALL_H_RATIO;

      this.characters = {};
      this.state = null;

      this._buildBackground();
      this._buildDecorations();
      this._buildWorkstations();
      this._buildSign();

      this._pollState();
      this.time.addEvent({ delay: 5000, callback: this._pollState, callbackScope: this, loop: true });

      this.input.on('gameobjectdown', (_, obj) => {
        if (obj.roleId) this._toggleBubble(obj.roleId);
      });

      this.scale.on('resize', (size) => {
        this.W = size.width; this.H = size.height;
        this.wallH = size.height * WALL_H_RATIO;
      });
    } catch (e) {
      console.error('OfficeScene error:', e);
    }
  }

  // ── 背景（磚牆 + 木地板）─────────────────────────────────────
  _buildBackground() {
    const g = this.add.graphics().setDepth(0);

    // 天花板（深色木梁）
    g.fillStyle(0x1e1008, 1);
    g.fillRect(0, 0, this.W, 22);

    // 磚牆
    const bW = 38, bH = 14, gap = 2;
    const brickColors = [0x7a2d18, 0x8a3820, 0x6e2812, 0x7d3215, 0x852e18, 0x713015];
    for (let row = 0; row * (bH + gap) < this.wallH + bH; row++) {
      const offset = row % 2 === 0 ? 0 : (bW + gap) / 2;
      const y = 22 + row * (bH + gap);
      for (let col = -1; col * (bW + gap) < this.W + bW; col++) {
        const x = col * (bW + gap) + offset;
        const ci = (row * 7 + Math.abs(col) * 5) % brickColors.length;
        g.fillStyle(brickColors[ci], 1);
        g.fillRoundedRect(x, y, bW, bH, 1);
      }
    }

    // 牆面漸暗遮罩（底部近地板處）
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.35, 0.35);
    g.fillRect(0, this.wallH - 40, this.W, 40);

    // 木地板
    const plankH = 26;
    const plankPalette = [0x8a5520, 0x9a6030, 0x7a4a18, 0x8e5825, 0x966232];
    const floorStart = this.wallH;
    for (let row = 0; row * plankH < this.H - floorStart + plankH; row++) {
      const y = floorStart + row * plankH;
      const offset = row % 2 === 0 ? 0 : 160;
      for (let col = -1; col * 340 < this.W + 340; col++) {
        const x = col * 340 + offset;
        const ci = (row * 3 + Math.abs(col) * 11 + 7) % plankPalette.length;
        g.fillStyle(plankPalette[ci], 1);
        g.fillRect(x, y, 338, plankH - 2);
        // 木紋
        g.lineStyle(1, 0x4a2808, 0.25);
        g.lineBetween(x + 20, y + 9, x + 310, y + 11);
        g.lineBetween(x + 60, y + 18, x + 270, y + 20);
      }
    }

    // 地板與牆壁交界陰影
    g.fillStyle(0x000000, 0.3);
    g.fillRect(0, this.wallH - 10, this.W, 10);
  }

  // ── 裝飾（燈、植物、白板、機架）─────────────────────────────
  _buildDecorations() {
    const { W, H, wallH } = this;

    // 天花板吊燈
    [0.16, 0.42, 0.68, 0.88].forEach(ratio => {
      this.add.image(W * ratio, 14, 'ceiling_light')
        .setOrigin(0.5, 0).setDepth(2);
      // 燈光圓暈（Graphics）
      const glow = this.add.graphics().setDepth(1);
      glow.fillStyle(0xfff2aa, 0.06);
      glow.fillCircle(W * ratio, 56, 80);
    });

    // 牆面植物（後排）
    this.add.image(55,  wallH + 5,  'plant_lg').setOrigin(0.5, 1).setDepth(8);
    this.add.image(W - 50, wallH + 5, 'plant_lg').setOrigin(0.5, 1).setDepth(8);
    this.add.image(W * 0.32, wallH + 5, 'plant_sm').setOrigin(0.5, 1).setDepth(8);
    this.add.image(W * 0.70, wallH + 5, 'plant_sm').setOrigin(0.5, 1).setDepth(8);

    // 地板植物（前排）
    this.add.image(40,  H - 40, 'plant_lg').setOrigin(0.5, 1).setDepth(42);
    this.add.image(W - 40, H - 40, 'plant_lg').setOrigin(0.5, 1).setDepth(42);

    // 白板（右側，agent 旁邊）
    this.add.image(W * 0.88, wallH + 20, 'whiteboard')
      .setOrigin(0.5, 0).setScale(1.1).setDepth(28);

    // 伺服器機架（最右側靠牆）
    this.add.image(W - 48, wallH - 138, 'server_rack')
      .setOrigin(0.5, 1).setDepth(10).setScale(1);
  }

  // ── 各工作站（椅背 + 角色 + 桌子 + 螢幕 + 標籤）─────────────
  _buildWorkstations() {
    const { W, H, wallH } = this;

    // 後排 3 個工作站 y 基準（桌面 y）
    const backY  = wallH + 50;
    // 前排 y
    const frontY = wallH + 220;

    // 後排 x 位置
    const backXs  = [W * 0.16, W * 0.46, W * 0.74];
    // 前排 x 位置
    const frontXs = [W * 0.22, W * 0.49, W * 0.72];

    Object.entries(STATIONS).forEach(([id, st]) => {
      if (st.row === 'special') return;

      const isBack = st.row === 'back';
      const x = isBack ? backXs[st.col] : frontXs[st.col];
      const deskY = isBack ? backY : frontY;
      const baseDepth = isBack ? 12 : 32;

      // 椅背（在角色後面）
      this.add.image(x, deskY - 8, 'chair_back')
        .setOrigin(0.5, 1).setDepth(baseDepth - 1);

      // 角色 sprite
      const charY = deskY - 12;
      const sprite = this.add.sprite(x, charY, `char_${id}`, 0)
        .setOrigin(0.5, 1).setDepth(baseDepth).setScale(1.4).setInteractive();
      sprite.roleId = id;
      sprite.play(`${id}_idle`);

      // 輕微 idle 浮動
      this.tweens.add({
        targets: sprite, y: charY - 2,
        duration: 900 + Math.random() * 500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Math.random() * 1000,
      });

      // 桌子（蓋住角色下半身）
      const deskTex = st.desk || 'desk';
      const deskImg = this.add.image(x, deskY, deskTex)
        .setOrigin(0.5, 0).setDepth(baseDepth + 1).setScale(1.4);

      // 螢幕
      if (st.mon) {
        const monScaleX = id === 'market' ? 1.3 : 1.2;
        this.add.image(x, deskY - 2, st.mon)
          .setOrigin(0.5, 1).setDepth(baseDepth + 1.5).setScale(monScaleX, 1.2);
      }

      // 名稱標籤
      this.add.text(x, deskY - (isBack ? 78 : 80), st.label, {
        fontSize: '11px', color: '#8aabb8',
        fontFamily: 'Consolas, monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(baseDepth + 2);

      // 泡泡 & 狀態燈
      const bubbleBg = this.add.image(x, charY - 52, 'bubble_bg')
        .setOrigin(0.5, 1).setDepth(baseDepth + 3).setAlpha(0);
      const bubbleText = this.add.text(x, charY - 60, '...', {
        fontSize: '9px', color: '#D8EEFB',
        fontFamily: 'Consolas, monospace',
        wordWrap: { width: 160 }, align: 'center',
      }).setOrigin(0.5, 1).setDepth(baseDepth + 3.1).setAlpha(0);

      const dot = this.add.graphics().setDepth(baseDepth + 4).setPosition(x + 11, charY - 58);
      this._drawDot(dot, 'idle');

      this.characters[id] = {
        sprite, bubbleBg, bubbleText, dot,
        x, homeY: charY, state: 'idle', bubbleVisible: false,
      };
    });

    // AI 交易員（白板旁站立）
    this._buildAgentStation();
  }

  _buildAgentStation() {
    const { W, wallH } = this;
    const x = W * 0.82;
    const y = wallH + 155;
    const depth = 30;

    const sprite = this.add.sprite(x, y, 'char_agent', 0)
      .setOrigin(0.5, 1).setDepth(depth).setScale(1.5).setInteractive();
    sprite.roleId = 'agent';
    sprite.play('agent_idle');

    this.tweens.add({
      targets: sprite, y: y - 2,
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 200,
    });

    this.add.text(x, y - 68, STATIONS.agent.label, {
      fontSize: '11px', color: '#8aabb8',
      fontFamily: 'Consolas, monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(depth + 1);

    const bubbleBg = this.add.image(x, y - 76, 'bubble_bg')
      .setOrigin(0.5, 1).setDepth(depth + 2).setAlpha(0);
    const bubbleText = this.add.text(x, y - 84, '...', {
      fontSize: '9px', color: '#D8EEFB',
      fontFamily: 'Consolas, monospace',
      wordWrap: { width: 160 }, align: 'center',
    }).setOrigin(0.5, 1).setDepth(depth + 2.1).setAlpha(0);

    const dot = this.add.graphics().setDepth(depth + 3).setPosition(x + 11, y - 82);
    this._drawDot(dot, 'idle');

    this.characters['agent'] = {
      sprite, bubbleBg, bubbleText, dot,
      x, homeY: y, state: 'idle', bubbleVisible: false,
    };
  }

  // ── 霓虹招牌 ─────────────────────────────────────────────────
  _buildSign() {
    const cx = this.W * 0.46;
    // 主標題
    this.add.text(cx, 32, 'AI TRADING COMMAND CENTER', {
      fontSize: '18px', fontFamily: 'Consolas, monospace',
      color: '#00E5FF',
      shadow: { offsetX: 0, offsetY: 0, color: '#00E5FF', blur: 14, fill: true },
    }).setOrigin(0.5, 0.5).setDepth(6);
    // 副標題
    this.add.text(cx, 54, 'TAIWAN STOCK MARKET · REAL-TIME', {
      fontSize: '11px', fontFamily: 'Consolas, monospace',
      color: '#0099aa',
    }).setOrigin(0.5, 0.5).setDepth(6);
  }

  // ── 狀態燈 ───────────────────────────────────────────────────
  _drawDot(g, status) {
    const c = { idle:0x3a5068, running:0xFFB300, done:0x00E676, live:0x00E5FF, thinking:0xBB86FC };
    g.clear();
    g.fillStyle(c[status] || 0x3a5068, 1);
    g.fillCircle(0, 0, 4);
  }

  // ── API Poll ─────────────────────────────────────────────────
  async _pollState() {
    try {
      const res = await fetch('http://localhost:8765/api/state');
      if (res.ok) { this._applyState(await res.json()); return; }
    } catch (_) {}
    this._applyState(this._demoState());
  }

  _applyState(data) {
    this.state = data;
    Object.entries(data.modules || {}).forEach(([id, mod]) => {
      const ch = this.characters[id];
      if (!ch) return;
      const prev = ch.state;
      ch.state = mod.status;
      this._drawDot(ch.dot, mod.status);
      ch.bubbleText.setText((mod.last_output || '...').slice(0, 60));

      if (prev !== 'running' && mod.status === 'running') {
        ch.sprite.play(`${id}_typing`);
        this._showBubble(id);
      }
      if (mod.status === 'thinking') {
        ch.sprite.play(`${id}_thinking`);
        this._animateTyping(id);
      }
      if (mod.status === 'idle' || mod.status === 'done') {
        ch.sprite.play(`${id}_idle`);
      }
    });

    this._updateHTMLPanel(data);

    (data.data_flows || []).forEach(f => {
      if (f.active) this._triggerDataFlow(f.from, f.to);
    });
  }

  // ── 泡泡 ─────────────────────────────────────────────────────
  _showBubble(id) {
    const ch = this.characters[id];
    if (!ch || ch.bubbleVisible) return;
    this.tweens.add({ targets: [ch.bubbleBg, ch.bubbleText], alpha: 1, duration: 200 });
    ch.bubbleVisible = true;
  }
  _hideBubble(id) {
    const ch = this.characters[id];
    if (!ch || !ch.bubbleVisible) return;
    this.tweens.add({ targets: [ch.bubbleBg, ch.bubbleText], alpha: 0, duration: 300 });
    ch.bubbleVisible = false;
  }
  _toggleBubble(id) {
    const ch = this.characters[id];
    if (ch) ch.bubbleVisible ? this._hideBubble(id) : this._showBubble(id);
  }

  _animateTyping(id) {
    const ch = this.characters[id];
    if (!ch || !this.state) return;
    const full = (this.state.modules?.[id]?.last_output || '思考中...').slice(0, 60);
    let i = 0;
    this._showBubble(id);
    this.time.addEvent({
      delay: 55, repeat: full.length - 1,
      callback: () => { i++; ch.bubbleText.setText(i < full.length ? full.slice(0, i) + '▌' : full); },
    });
  }

  // ── 資料流粒子 ───────────────────────────────────────────────
  _triggerDataFlow(fromId, toId) {
    const from = this.characters[fromId];
    const to   = this.characters[toId];
    if (!from || !to) return;
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 120, () => {
        const dot = this.add.image(from.x, from.homeY - 30, 'particle')
          .setDepth(99).setAlpha(0.9).setScale(0.9);
        this.tweens.add({
          targets: dot,
          x: to.x + Phaser.Math.Between(-10, 10),
          y: to.homeY - 30 + Phaser.Math.Between(-10, 10),
          alpha: 0, scale: 0.3, duration: 900, ease: 'Power2',
          onComplete: () => dot.destroy(),
        });
      });
    }
  }

  // ── HTML 狀態面板 ────────────────────────────────────────────
  _updateHTMLPanel(data) {
    const list = document.getElementById('module-list');
    const timeEl = document.getElementById('update-time');
    if (!list || !timeEl) return;
    const labels = {
      market:'📊 市場', news:'📰 新聞', boss:'🎯 策略長',
      swing:'📈 波段', dca:'💰 DCA', ml:'🤖 ML', agent:'🤖 Agent',
    };
    list.innerHTML = Object.entries(data.modules || {}).map(([id, mod]) => `
      <div class="module-status">
        <div class="status-dot ${mod.status}"></div>
        <div class="module-name">${labels[id] || id}</div>
      </div>
      <div class="module-output">${(mod.last_output || '—').slice(0, 45)}</div>
    `).join('');
    timeEl.textContent = `更新 ${data.updated_at || '—'}`;
  }

  // ── Demo 假資料 ──────────────────────────────────────────────
  _demoState() {
    const cycle = Math.floor(Date.now() / 3000) % 7;
    const ids = ['market','news','boss','swing','dca','ml','agent'];
    const out = {
      market:'RISK_ON  VIX 14.2', news:'+0.82 台積電利多',
      boss:'建議買進 2330  停損 -5%', swing:'RSI 32 超賣訊號',
      dca:'0050 定期定額執行', ml:'漲機率 72%  未來3日', agent:'分析市場中...',
    };
    const modules = {};
    ids.forEach((id, i) => {
      modules[id] = { status: i===cycle?'running':(i<cycle?'done':'idle'), last_output:out[id], confidence:0.7 };
    });
    modules.boss.status = 'live';
    modules.agent.status = cycle===6 ? 'thinking' : 'idle';
    return {
      updated_at: new Date().toLocaleTimeString('zh-TW'), modules,
      data_flows: [
        { from:'market', to:'boss',  active: cycle===0 },
        { from:'news',   to:'boss',  active: cycle===1 },
        { from:'ml',     to:'agent', active: cycle===5 },
        { from:'agent',  to:'boss',  active: cycle===6 },
      ],
    };
  }

  update() {}
}
