// OfficeScene: 前視角像素辦公室
import { CONFIG } from '../config.js';
const WALL_H_RATIO = CONFIG.layout.wallHeightRatio;

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
      this._usingRealAPI = false;
      this._demoStep = 0;
      this._chatInProgress = false;

      this._buildBackground();
      this._buildDecorations();
      this._buildWorkstations();
      this._buildSign();

      // 嘗試連 API；離線時自動啟動 Demo 步驟序列
      this._pollState();
      this.time.addEvent({ delay: 5000, callback: this._pollState, callbackScope: this, loop: true });
      // Demo 延遲 1.5s 啟動（等角色都建好）
      this.time.delayedCall(1500, this._fetchAndPlayDialogue, [], this);

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

    const { ceilingColor, brickColors, floorColors } = CONFIG.background;

    // 天花板（深色木梁）
    g.fillStyle(ceilingColor, 1);
    g.fillRect(0, 0, this.W, 22);

    // 磚牆
    const bW = 38, bH = 14, gap = 2;
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
    const plankPalette = floorColors;
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
    CONFIG.layout.lightsXRatios.forEach(ratio => {
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

    // 白板（agent 右側）
    const wbX = CONFIG.layout.whiteboardXRatio ?? 0.94;
    this.add.image(W * wbX, wallH + 20, 'whiteboard')
      .setOrigin(0.5, 0).setScale(CONFIG.scale.whiteboard).setDepth(28);

    // 伺服器機架（最右側靠牆）
    this.add.image(W - 48, wallH - 138, 'server_rack')
      .setOrigin(0.5, 1).setDepth(10).setScale(CONFIG.scale.serverRack);
  }

  // ── 各工作站（椅背 + 角色 + 桌子 + 螢幕 + 標籤）─────────────
  _buildWorkstations() {
    const { W, H, wallH } = this;

    const { backRowOffsetY, frontRowOffsetY, backXRatios, frontXRatios } = CONFIG.layout;
    const S = CONFIG.scale;

    const backY  = wallH + backRowOffsetY;
    const frontY = wallH + frontRowOffsetY;
    const backXs  = backXRatios.map(r => W * r);
    const frontXs = frontXRatios.map(r => W * r);

    Object.entries(STATIONS).forEach(([id, st]) => {
      if (st.row === 'special') return;

      const isBack = st.row === 'back';
      const x = isBack ? backXs[st.col] : frontXs[st.col];
      const deskY = isBack ? backY : frontY;
      const baseDepth = isBack ? 12 : 32;

      // 椅背（在角色後面）
      this.add.image(x, deskY - 8, 'chair_back')
        .setOrigin(0.5, 1).setDepth(baseDepth - 1).setScale(S.chairBack);

      // 角色 sprite
      const charY = deskY - 12;
      const sprite = this.add.sprite(x, charY, `char_${id}`, 0)
        .setOrigin(0.5, 1).setDepth(baseDepth).setScale(S.character).setInteractive();
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
      this.add.image(x, deskY, deskTex)
        .setOrigin(0.5, 0).setDepth(baseDepth + 1).setScale(S.desk);

      // 螢幕
      if (st.mon) {
        const monSX = (id === 'market' ? 1.1 : 1.0) * S.monitor;
        this.add.image(x, deskY - 2, st.mon)
          .setOrigin(0.5, 1).setDepth(baseDepth + 1.5).setScale(monSX, S.monitor);
      }

      // 名稱標籤
      this.add.text(x, deskY - (isBack ? 78 : 80), st.label, {
        fontSize: '11px', color: '#8aabb8',
        fontFamily: 'Consolas, monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(baseDepth + 2);

      // 泡泡 & 狀態燈（bubble_bg 185×54, origin底部）
      const bubbleBg = this.add.image(x, charY - 52, 'bubble_bg')
        .setOrigin(0.5, 1).setDepth(baseDepth + 3).setAlpha(0);
      const bubbleText = this.add.text(x, charY - 83, '', {
        fontSize: '12px', color: '#D8EEFB',
        fontFamily: 'Consolas, monospace',
        wordWrap: { width: 158, useAdvancedWrap: true }, align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(baseDepth + 3.1).setAlpha(0);

      this.characters[id] = {
        sprite, bubbleBg, bubbleText,
        x, homeY: charY, state: 'idle', bubbleVisible: false,
        isWalking: false, floatTween: null,
        depth: baseDepth,
      };
    });

    // AI 交易員（白板旁站立）
    this._buildAgentStation();
  }

  _buildAgentStation() {
    const { W, wallH } = this;
    const x = W * CONFIG.layout.agentXRatio;
    const y = wallH + CONFIG.layout.agentOffsetY;
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

    const bubbleBg = this.add.image(x, y - 68, 'bubble_bg')
      .setOrigin(0.5, 1).setDepth(depth + 2).setAlpha(0);
    const bubbleText = this.add.text(x, y - 99, '', {
      fontSize: '12px', color: '#D8EEFB',
      fontFamily: 'Consolas, monospace',
      wordWrap: { width: 158, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(depth + 2.1).setAlpha(0);


    this.characters['agent'] = {
      sprite, bubbleBg, bubbleText,
      x, homeY: y, state: 'idle', bubbleVisible: false,
      isWalking: false, depth,
    };
  }

  // ── 霓虹招牌 ─────────────────────────────────────────────────
  _buildSign() {
    const { signXRatio } = CONFIG.layout;
    const { line1, line2, color, glowBlur } = CONFIG.sign;
    const cx = this.W * signXRatio;
    this.add.text(cx, 32, line1, {
      fontSize: '18px', fontFamily: 'Consolas, monospace',
      color,
      shadow: { offsetX: 0, offsetY: 0, color, blur: glowBlur, fill: true },
    }).setOrigin(0.5, 0.5).setDepth(6);
    this.add.text(cx, 54, line2, {
      fontSize: '11px', fontFamily: 'Consolas, monospace',
      color: '#0099aa',
    }).setOrigin(0.5, 0.5).setDepth(6);
  }


  // ── API Poll ─────────────────────────────────────────────────
  async _pollState() {
    try {
      const res = await fetch('http://localhost:8765/api/state');
      if (res.ok) {
        this._usingRealAPI = true;
        this._applyState(await res.json());
        return;
      }
    } catch (_) {}
    this._usingRealAPI = false;
    // Demo loop (_runDemoStep) handles animation when offline
  }

  _applyState(data) {
    this.state = data;
    Object.entries(data.modules || {}).forEach(([id, mod]) => {
      const ch = this.characters[id];
      if (!ch) return;
      const prev = ch.state;
      ch.state = mod.status;

      const wasActive = prev === 'running' || prev === 'thinking';
      const isActive = mod.status === 'running' || mod.status === 'thinking';
      const justBecameActive = !wasActive && isActive;
      const justBecameInactive = wasActive && !isActive;

      // chat 進行中 → 狀態同步只更新內部 ch.state，完全不動 bubble / 動畫
      // 避免每 5 秒輪詢時 status 文字插話 chat 對話
      if (this._chatInProgress) return;

      // 狀態變動才更新泡泡文字 + 顯示泡泡（不再每輪重新塞、不再重複打字）
      if (justBecameActive) {
        if (mod.last_output) {
          ch.bubbleText.setText(mod.last_output.slice(0, 50));
          this._showBubble(id);
        }
        if (mod.status === 'running' && !ch.isWalking) {
          ch.sprite.play(`${id}_typing`);
          const targets = DATA_FLOWS[id] || [];
          if (targets.length > 0 && this.characters[targets[0]]) {
            this._walkTo(id, targets[0], () => this._walkHome(id));
          }
        } else if (mod.status === 'thinking') {
          ch.sprite.play(`${id}_thinking`);
          this._animateTyping(id);
        }
      } else if (justBecameInactive && !ch.isWalking) {
        // 結束 → 收泡泡 + 回 idle 動畫（保留泡泡文字本身，下次需要時直接顯示）
        ch.sprite.play(`${id}_idle`);
        this._hideBubble(id);
      } else if (mod.status === 'idle' && !ch.isWalking) {
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

  // ── 走路動畫 ──────────────────────────────────────────────────
  _walkTo(id, targetId, onComplete) {
    const ch     = this.characters[id];
    const target = this.characters[targetId];
    // target 正在走路時不靠近，避免重疊
    if (!ch || !target || ch.isWalking || target.isWalking) {
      if (onComplete) onComplete();
      return;
    }

    ch.isWalking = true;
    this.tweens.killTweensOf(ch.sprite);

    this.tweens.add({
      targets: ch.sprite,
      y: ch.homeY - 28,
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => {
        const stopX = target.x + (target.x > ch.x ? -36 : 36);
        const dist  = Math.abs(stopX - ch.sprite.x);
        this.tweens.add({
          targets: ch.sprite,
          x: stopX,
          duration: dist * 2.2,
          ease: 'Linear',
          onUpdate: () => this._syncBubble(id),
          onComplete: () => {
            ch.sprite.play(`${id}_thinking`);
            this.time.delayedCall(400, () => { if (onComplete) onComplete(); });
          },
        });
      },
    });
  }

  _walkHome(id, onComplete) {
    const ch = this.characters[id];
    if (!ch) { if (onComplete) onComplete(); return; }

    ch.sprite.play(`${id}_typing`);
    const dist = Math.abs(ch.x - ch.sprite.x);
    this.tweens.add({
      targets: ch.sprite,
      x: ch.x,
      duration: dist * 2.2,
      ease: 'Linear',
      onUpdate: () => this._syncBubble(id),
      onComplete: () => {
        this.tweens.add({
          targets: ch.sprite,
          y: ch.homeY,
          duration: 250,
          ease: 'Power2.easeIn',
          onComplete: () => {
            ch.isWalking = false;
            ch.sprite.play(`${id}_idle`);
            this._syncBubble(id);
            this._hideBubble(id);
            this.tweens.add({
              targets: ch.sprite, y: ch.homeY - 2,
              duration: 900 + Math.random() * 400,
              yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            if (onComplete) onComplete();
          },
        });
      },
    });
  }

  // 同步泡泡和狀態燈跟著 sprite 移動
  _syncBubble(id) {
    const ch = this.characters[id];
    if (!ch) return;
    const sx = ch.sprite.x, sy = ch.sprite.y;
    ch.bubbleBg.setPosition(sx, sy - 52);
    ch.bubbleText.setPosition(sx, sy - 83);
  }

  _animateTyping(id) {
    const ch = this.characters[id];
    if (!ch || !this.state) return;
    if (ch.typingTimer) { ch.typingTimer.remove(); ch.typingTimer = null; }
    const full = (this.state.modules?.[id]?.last_output || '思考中...').slice(0, 60);
    let i = 0;
    this._showBubble(id);
    ch.typingTimer = this.time.addEvent({
      delay: 55, repeat: full.length - 1,
      callback: () => {
        i++;
        ch.bubbleText.setText(i < full.length ? full.slice(0, i) + '▌' : full);
        if (i >= full.length - 1) ch.typingTimer = null;
      },
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
      <div class="module-output">${['running','thinking'].includes(mod.status) ? (mod.last_output || '').slice(0, 45) : '—'}</div>
    `).join('');
    timeEl.textContent = `更新 ${data.updated_at || '—'}`;
  }

  // ── AI 即時對話系統 ──────────────────────────────────────────
  async _fetchAndPlayDialogue() {
    if (this._chatInProgress) return;
    this._chatInProgress = true;
    try {
      const res = await fetch('/api/chat', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.dialogue && data.dialogue.length >= 2) {
          this._playDialogue(data.dialogue);
          return;
        }
      }
    } catch (_) {}
    // API 失敗 → 3 秒後靜默重試，不播固定台詞
    this._chatInProgress = false;
    this.time.delayedCall(3000, this._fetchAndPlayDialogue, [], this);
  }

  _playDialogue(lines) {
    const walkerId = lines[0].speaker;
    const targetId = lines.find((l, i) => i > 0 && l.speaker !== walkerId)?.speaker;
    const walker   = this.characters[walkerId];

    if (!walker || walker.isWalking) {
      this._chatInProgress = false;
      this.time.delayedCall(800, this._fetchAndPlayDialogue, [], this);
      return;
    }

    // 走路時不顯示泡泡 — 到達後才開始逐句對話
    walker.sprite.play(`${walkerId}_typing`);
    this._updateHTMLPanel(this._buildPanelData());

    const afterWalk = () => {
      // 短暫停頓後開始逐句
      this.time.delayedCall(300, () => {
        this._playLineSequence(lines, walkerId, () => {
          this._walkHome(walkerId, () => {
            this._chatInProgress = false;
            this.time.delayedCall(1500, this._fetchAndPlayDialogue, [], this);
          });
        });
      });
    };

    if (targetId && this.characters[targetId]) {
      this._triggerDataFlow(walkerId, targetId);
      this._walkTo(walkerId, targetId, afterWalk);
    } else {
      this.time.delayedCall(500, afterWalk);
    }
  }

  _playLineSequence(lines, walkerId, onComplete) {
    if (lines.length === 0) { onComplete(); return; }
    const [line, ...rest] = lines;
    const ch = this.characters[line.speaker];

    if (!ch) {
      this.time.delayedCall(300, () => this._playLineSequence(rest, walkerId, onComplete));
      return;
    }

    ch.bubbleText.setText(line.text.slice(0, 36));
    ch.sprite.play(`${line.speaker}_typing`);
    this._showBubble(line.speaker);
    if (line.speaker === walkerId) this._syncBubble(walkerId);

    // 依文字長度計算顯示時間（最短 2.5s，每多 10 字加 0.3s）
    const readMs = Math.max(2500, 2500 + Math.floor(line.text.length / 10) * 300);

    this.time.delayedCall(readMs, () => {
      this._hideBubble(line.speaker);
      if (line.speaker !== walkerId) {
        ch.sprite.play(`${line.speaker}_idle`);
      }
      // 說完後停頓 500ms 再換下一句
      this.time.delayedCall(500, () => this._playLineSequence(rest, walkerId, onComplete));
    });
  }

  // ── Demo 步驟序列（無 API 時的備援，一次只跑一步）─────────
  _runDemoStep() {
    this._chatInProgress = true;   // 避免 pollState 插入
    const DEMO_SEQ = [
      { id: 'market', out: 'RISK_ON  VIX 14.2  台積電+0.8%', flow: 'boss'  },
      { id: 'news',   out: '+0.82 台積電 AI 訂單利多',         flow: 'boss'  },
      { id: 'swing',  out: 'RSI 32 超賣  均線支撐',             flow: null    },
      { id: 'dca',    out: '0050 定期定額本月執行',             flow: null    },
      { id: 'ml',     out: '漲機率 72%  未來 3 日 2330',        flow: 'agent' },
      { id: 'agent',  out: '分析中…建議買進 2330  停損 -5%',    flow: 'boss'  },
    ];

    const { id, out, flow } = DEMO_SEQ[this._demoStep % DEMO_SEQ.length];
    this._demoStep++;

    const ch = this.characters[id];
    if (!ch) {
      this.time.delayedCall(400, this._fetchAndPlayDialogue, [], this);
      return;
    }

    const text = (this._usingRealAPI && this.state?.modules?.[id]?.last_output) || out;
    ch.state = 'running';
    ch.bubbleText.setText(text.slice(0, 60));
    ch.sprite.play(`${id}_typing`);
    this._showBubble(id);

    const done = () => {
      ch.state = 'done';
      this._updateHTMLPanel(this._buildPanelData());
      this._chatInProgress = false;
      this.time.delayedCall(800, this._fetchAndPlayDialogue, [], this);
    };

    if (flow && this.characters[flow]) {
      this._triggerDataFlow(id, flow);
      this._walkTo(id, flow, () => this._walkHome(id, done));
    } else {
      this.time.delayedCall(3000, () => {
        this._hideBubble(id);
        done();
      });
    }
  }

  _buildPanelData() {
    const labels = {
      market: 'RISK_ON VIX14.2', news: '+0.82 台積電',
      boss: '策略長待命', swing: 'RSI分析', dca: '定投執行',
      ml: 'ML預測', agent: 'Agent決策',
    };
    const modules = {};
    Object.entries(this.characters).forEach(([id, ch]) => {
      modules[id] = {
        status: ch.state,
        last_output: ch.bubbleText.text || labels[id] || '',
        confidence: 0,
      };
    });
    return { updated_at: new Date().toLocaleTimeString('zh-TW'), modules, data_flows: [] };
  }

  update() {}
}
