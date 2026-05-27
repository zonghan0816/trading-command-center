// OfficeScene: 前視角像素辦公室
import { CONFIG } from '../config.js';
const S = CONFIG.scale;
const WALL_H_RATIO = CONFIG.layout.wallHeightRatio;

// WWT 主持人座位
const STATIONS = {
  aming:   { desk: 'desk', mon: 'monitor', label: '🎙 阿明哥' },
  xiaomei: { desk: 'desk', mon: 'monitor', label: '🎙 小美姐' },
};

const DATA_FLOWS = CONFIG.layout.dataFlows;

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
    this.add.image(0, 0, 'office_bg')
      .setOrigin(0, 0)
      .setDepth(0)
      .setDisplaySize(this.W, this.H);

  }

  // ── 裝飾（燈、植物、白板、機架）─────────────────────────────
  _buildDecorations() {
    const { W, H, wallH } = this;

    const dOff = CONFIG.layout.decorOffsets ?? {};
    const wsOff = dOff.wallScreen  ?? { x: 0, y: 0 };
    const wbOff = dOff.whiteboard  ?? { x: 0, y: 0 };
    const srOff = dOff.serverRack  ?? { x: 0, y: 0 };

    // 牆面股市螢幕
    this.add.image(W * 0.565 + wsOff.x, H * 0.50 + wsOff.y, 'wall_screen')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(W * 0.18, W * 0.18 * (9 / 16))
      .setDepth(3);

    // 白板
    const wbX   = CONFIG.layout.whiteboardXRatio  ?? 0.94;
    const wbOffY = CONFIG.layout.whiteboardOffsetY ?? 20;
    this.add.image(W * wbX + wbOff.x, wallH + wbOffY + wbOff.y, 'whiteboard')
      .setOrigin(0.5, 0).setScale(CONFIG.scale.whiteboard).setDepth(28);

    // 熱門關鍵字標題 + 標籤文字
    const wbCX   = W * wbX + wbOff.x;
    const wbTopY = wallH + wbOffY + wbOff.y;
    this.add.text(wbCX, wbTopY + 8, '# 熱門', {
      fontSize: '9px', color: '#FF6B35', fontFamily: 'Consolas, monospace',
    }).setOrigin(0.5, 0).setDepth(28.5);
    const kws = ['台北房價', 'AI工作', '演唱會', '健保費', '物價指數'];
    const kwCols = ['#FF6B35', '#00E5FF', '#00E676', '#FFB300', '#BB86FC'];
    kws.forEach((kw, i) => {
      this.add.text(wbCX, wbTopY + 28 + i * 13, kw, {
        fontSize: '9px', color: kwCols[i], fontFamily: 'Consolas, monospace',
      }).setOrigin(0.5, 0).setDepth(28.5);
    });

    // 伺服器機架
    this.add.image(W - 48 + srOff.x, wallH - 138 + srOff.y, 'server_rack')
      .setOrigin(0.5, 1).setDepth(10).setScale(CONFIG.scale.serverRack);
  }

  // ── 各工作站（主持人座位 左/右）──────────────────────────────
  _buildWorkstations() {
    const { W, wallH } = this;

    Object.entries(STATIONS).forEach(([id, st]) => {
      const hostCfg = CONFIG.layout.hosts?.[id]          ?? {};
      const stOff   = CONFIG.layout.stationOffsets?.[id]  ?? { x: 0, y: 0 };
      const charOff = CONFIG.layout.charOffsets?.[id]     ?? { x: 0, y: 0 };

      const baseX = W * (hostCfg.xRatio ?? 0.5) + (stOff.x ?? 0);
      const deskY = wallH + (hostCfg.yOffsetFromWall ?? 360) + (stOff.y ?? 0);
      const charX = baseX + (charOff.x ?? 0);
      const charY = deskY - 12 + (charOff.y ?? 0);
      const depth = 30;

      // 椅背
      this.add.image(baseX, deskY - 8, 'chair_back')
        .setOrigin(0.5, 1).setDepth(depth - 1).setScale(S.chairBack);

      // 角色 sprite
      const sprite = this.add.sprite(charX, charY, `char_${id}`, 0)
        .setOrigin(0.5, 1).setDepth(depth).setScale(S.character).setInteractive();
      sprite.play(`${id}_idle`);
      sprite.roleId = id;

      this.tweens.add({
        targets: sprite, y: charY - 2,
        duration: 900 + Math.random() * 500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Math.random() * 1000,
      });

      // 桌子
      this.add.image(baseX, deskY, st.desk || 'desk')
        .setOrigin(0.5, 0).setDepth(depth + 1).setScale(S.desk);

      // 螢幕
      if (st.mon) {
        this.add.image(baseX, deskY - 2, st.mon)
          .setOrigin(0.5, 1).setDepth(depth + 1.5).setScale(S.monitor, S.monitor);
      }

      // 名稱標籤
      this.add.text(charX, deskY - 80, st.label, {
        fontSize: '11px', color: '#FF8C55',
        fontFamily: 'Consolas, monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(depth + 2);

      // 對話泡泡
      const bubbleBg = this.add.image(charX, charY - 52, 'bubble_bg')
        .setOrigin(0.5, 1).setDepth(depth + 3).setAlpha(0);
      const bubbleText = this.add.text(charX, charY - 83, '', {
        fontSize: '12px', color: '#D8EEFB',
        fontFamily: 'Consolas, monospace',
        wordWrap: { width: 158, useAdvancedWrap: true }, align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(depth + 3.1).setAlpha(0);

      this.characters[id] = {
        sprite, bubbleBg, bubbleText,
        x: charX, homeY: charY, state: 'idle', bubbleVisible: false,
        isWalking: false, floatTween: null,
        depth,
      };
    });

    // 中央主持桌（寬版）
    const centerX    = W * 0.5;
    const centerDeskY = wallH + 380;
    const deskW      = Math.floor(W * 0.46);

    this.add.rectangle(centerX + 3, centerDeskY + 3, deskW + 4, 26, 0x050a14)
      .setOrigin(0.5, 0).setDepth(28).setAlpha(0.5);
    this.add.rectangle(centerX, centerDeskY, deskW, 22, 0x16233e)
      .setOrigin(0.5, 0).setDepth(29);
    this.add.rectangle(centerX, centerDeskY, deskW, 3, 0x2e4a72)
      .setOrigin(0.5, 0).setDepth(29);
    this.add.rectangle(centerX, centerDeskY + 19, deskW, 4, 0x0e1628)
      .setOrigin(0.5, 0).setDepth(29);

    // 左右麥克風架
    [W * 0.36, W * 0.64].forEach(mx => {
      this.add.rectangle(mx, centerDeskY + 2, 20, 4, 0x8899aa)
        .setOrigin(0.5, 0).setDepth(30);
      this.add.rectangle(mx, centerDeskY - 40, 3, 44, 0x778899)
        .setOrigin(0.5, 1).setDepth(30);
      this.add.ellipse(mx, centerDeskY - 40, 16, 12, 0x99aabb)
        .setDepth(30);
      this.add.ellipse(mx, centerDeskY - 40, 10, 8, 0x1a2a3a)
        .setDepth(30);
      this.add.rectangle(mx, centerDeskY - 40, 10, 1, 0x6688aa)
        .setDepth(30);
    });
  }

  _buildAgentStation() {
    const { W, wallH } = this;
    const agOff = CONFIG.layout.charOffsets?.agent ?? { x: 0, y: 0 };
    const x = W * CONFIG.layout.agentXRatio + (agOff.x ?? 0);
    const y = wallH + CONFIG.layout.agentOffsetY + (agOff.y ?? 0);
    const depth = 30;

    const sprite = this.add.sprite(x, y, 'char_agent', 0)
      .setOrigin(0.5, 1).setDepth(depth).setScale(S.character).setInteractive();
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
    const ACTIVE = ['talking', 'thinking', 'researching', 'reacting'];

    Object.entries(data.hosts || {}).forEach(([id, mod]) => {
      const ch = this.characters[id];
      if (!ch) return;
      const prev = ch.state;
      ch.state   = mod.status;

      const wasActive          = ACTIVE.includes(prev);
      const isActive           = ACTIVE.includes(mod.status);
      const justBecameActive   = !wasActive && isActive;
      const justBecameInactive = wasActive && !isActive;

      // chat 進行中 → 狀態同步只更新內部 ch.state，完全不動 bubble / 動畫
      if (this._chatInProgress) return;

      if (justBecameActive) {
        if (mod.last_output) {
          ch.bubbleText.setText(mod.last_output.slice(0, 50));
          this._showBubble(id);
        }
        if (['talking', 'researching'].includes(mod.status) && !ch.isWalking) {
          ch.sprite.play(`${id}_typing`);
          const targets = DATA_FLOWS[id] || [];
          if (targets.length > 0 && this.characters[targets[0]]) {
            this._walkTo(id, targets[0], () => this._walkHome(id));
          }
        } else if (['thinking', 'reacting'].includes(mod.status)) {
          ch.sprite.play(`${id}_thinking`);
          this._animateTyping(id);
        }
      } else if (justBecameInactive && !ch.isWalking) {
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

    const walkYOff = CONFIG.layout.walkYOffsets?.[id] ?? -28;
    this.tweens.add({
      targets: ch.sprite,
      y: ch.homeY + walkYOff,
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => {
        const wo = CONFIG.layout.walkOffset ?? 36;
        const stopX = target.x + (target.x > ch.x ? -wo : wo);
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

    const walkAnim = `${id}_typing`;
    ch.sprite.play(walkAnim);
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
    const full = (this.state.hosts?.[id]?.last_output || '思考中...').slice(0, 60);
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
    const list   = document.getElementById('module-list');
    const timeEl = document.getElementById('update-time');
    if (!list || !timeEl) return;

    const labels  = { aming: '🎙 阿明哥', xiaomei: '🎙 小美姐' };
    const modeMap = { discussion: '討論中', working: '工作中', coffee: '茶水間', idle: '待機' };

    // 話題列
    const topicLine = data.topic
      ? `<div class="module-output" style="color:#FF8C55;margin-bottom:6px;white-space:normal;">📌 ${data.topic}</div>`
      : '';

    // 模式 + 活動
    const modeLabel    = modeMap[data.mode] || data.mode || '—';
    const activityNote = (data.activity && data.activity !== 'idle') ? ` · ${data.activity}` : '';
    const modeLine     = `<div class="module-output" style="margin-bottom:8px;">模式：${modeLabel}${activityNote}</div>`;

    // 主持人狀態
    const hostLines = Object.entries(data.hosts || {}).map(([id, mod]) => `
      <div class="module-status">
        <div class="status-dot ${mod.status}"></div>
        <div class="module-name">${labels[id] || id}</div>
      </div>
      <div class="module-output">${mod.last_output ? mod.last_output.slice(0, 45) : '—'}</div>
    `).join('');

    list.innerHTML = topicLine + modeLine + hostLines;
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
    const walkerAnim = `${walkerId}_typing`;
    walker.sprite.play(walkerAnim);
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
      { id: 'aming',   out: '甘有可能，這也太扯了吧',       flow: 'xiaomei' },
      { id: 'xiaomei', out: '不意外啊，早就說了',            flow: 'aming'   },
      { id: 'aming',   out: '我跟你講喔，以前不是這樣',     flow: null      },
      { id: 'xiaomei', out: '留言區炸鍋了啦，靠夭喔',       flow: 'aming'   },
    ];

    const { id, out, flow } = DEMO_SEQ[this._demoStep % DEMO_SEQ.length];
    this._demoStep++;

    const ch = this.characters[id];
    if (!ch) {
      this.time.delayedCall(400, this._fetchAndPlayDialogue, [], this);
      return;
    }

    const text = (this._usingRealAPI && this.state?.hosts?.[id]?.last_output) || out;
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
    const hosts = {};
    Object.entries(this.characters).forEach(([id, ch]) => {
      hosts[id] = {
        status:      ch.state,
        last_output: ch.bubbleText.text || '',
        emotion:     'neutral',
      };
    });
    return {
      updated_at: new Date().toLocaleTimeString('zh-TW'),
      scene: 'studio',
      mode: 'idle',
      topic: '',
      activity: 'idle',
      hosts,
      data_flows: [],
    };
  }

  update() {}
}
