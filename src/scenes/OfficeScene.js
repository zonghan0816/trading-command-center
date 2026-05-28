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

// 熱門關鍵字（state.keywords 不存在時的預設值、最多顯示 5 個）
const DEFAULT_KEYWORDS = ['台北房價', 'AI工作', '演唱會', '健保費', '物價指數'];
const KEYWORD_COLORS   = ['#FF6B35', '#00E5FF', '#00E676', '#FFB300', '#BB86FC'];
const KEYWORD_MAX      = 5;

// 任務 4.5: 主持人碰撞避免
// HOST_MIN_DISTANCE 是兩主持人之間至少要保持的水平距離（px）
const HOST_MIN_DISTANCE = 180;
// discussion mode 下強制站位（畫面寬度比例、不動 config.js）
const DISCUSSION_HOST_X_RATIOS = { aming: 0.35, xiaomei: 0.65 };
// Phase 2F Step 3: 主持人 Lane 邊界（aming 永遠左半場、xiaomei 永遠右半場）
const HOST_LANES = { aming: 0.35, xiaomei: 0.65 };
const LANE_MARGIN = 20; // 距中線最小留白（px）

export class OfficeScene extends Phaser.Scene {
  constructor() { super('OfficeScene'); }

  create() {
    try {
      this.W = 1920;
      this.H = 1080;
      this.wallH = this.H * WALL_H_RATIO;

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

    // 牆面股市螢幕
    this.add.image(W * 0.565 + wsOff.x, H * 0.50 + wsOff.y, 'wall_screen')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(W * 0.18, W * 0.18 * (9 / 16))
      .setDepth(3);

    // TOP5 資訊板（純色面板，不用 whiteboard texture 以免烘焙彩色列框）
    const wbOffY = CONFIG.layout.whiteboardOffsetY ?? 20;
    const wbCX   = W - 214 + (CONFIG.layout.decorOffsets?.whiteboard?.x ?? 0);
    const wbTopY = wallH + wbOffY + (CONFIG.layout.decorOffsets?.whiteboard?.y ?? 0);
    const brd = this.add.graphics().setDepth(28);
    brd.fillStyle(0x060d1e, 0.97);
    brd.fillRect(wbCX - 204, wbTopY, 408, 321);
    brd.lineStyle(2, 0xFF6B35, 0.75);
    brd.strokeRect(wbCX - 204, wbTopY, 408, 321);
    brd.lineStyle(1, 0xFF6B35, 0.35);
    brd.lineBetween(wbCX - 200, wbTopY + 44, wbCX + 200, wbTopY + 44);

    // TOP5 標題
    this.add.text(wbCX, wbTopY + 14, '▸ TOP 5', {
      fontSize: '18px', color: '#FF6B35', fontFamily: 'Consolas, monospace',
      shadow: { offsetX: 0, offsetY: 0, color: '#FF6B35', blur: 8, fill: true },
    }).setOrigin(0.5, 0).setDepth(28.5);

    // 儲存座標、給 _renderKeywords / state poll 用
    this._kwBaseX        = wbCX;
    this._kwBaseY        = wbTopY;
    this._kwTexts        = [];     // 當前渲染的 text 物件陣列、用來 destroy 重畫
    this._currentKeywordsSig = null;  // 防抖簽章
    this._renderKeywords(DEFAULT_KEYWORDS);

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

      // 名稱標籤（降飽和度、無 stroke）
      this.add.text(charX, deskY - 80, st.label, {
        fontSize: '14px', color: '#AA7850',
        fontFamily: 'Consolas, monospace',
      }).setOrigin(0.5, 1).setDepth(depth + 2);

      // 對話泡泡（往上移避免貼角色）
      const bubbleBg = this.add.image(charX, charY - 117, 'bubble_bg')
        .setOrigin(0.5, 1).setDepth(depth + 3).setAlpha(0)
        .setDisplaySize(290, 54);
      const bubbleText = this.add.text(charX, charY - 140, '', {
        fontSize: '20px', color: '#D8EEFB',
        fontFamily: 'Consolas, monospace',
        lineSpacing: 8,
        wordWrap: { width: 270, useAdvancedWrap: true }, align: 'center',
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

  // ── 霓虹招牌 ─────────────────────────────────────────────────
  _buildSign() {
    const { signXRatio } = CONFIG.layout;
    const { line1, line2, color, glowBlur } = CONFIG.sign;
    const cx = this.W * signXRatio;
    this.add.text(cx, 32, line1, {
      fontSize: '24px', fontFamily: 'Consolas, monospace',
      color,
      shadow: { offsetX: 0, offsetY: 0, color, blur: glowBlur, fill: true },
    }).setOrigin(0.5, 0.5).setDepth(6);
    this.add.text(cx, 60, line2, {
      fontSize: '14px', fontFamily: 'Consolas, monospace',
      color: '#0099aa',
    }).setOrigin(0.5, 0.5).setDepth(6);
  }


  // ── API Poll ─────────────────────────────────────────────────
  /**
   * 動態渲染熱門關鍵字（給 state.keywords 變化時呼叫）
   * - 傳 null / undefined / 空陣列 → 用預設關鍵字
   * - 超過 KEYWORD_MAX 個只取前 5 個
   * - 防抖：跟上次內容相同就 skip 重畫
   */
  _renderKeywords(keywords) {
    // 預設值 fallback
    let kws = (Array.isArray(keywords) && keywords.length > 0)
      ? keywords.slice(0, KEYWORD_MAX)
      : DEFAULT_KEYWORDS;
    // 全部轉字串、防止 server 推非字串值
    kws = kws.map(k => String(k));

    // 防抖簽章：內容相同就不重畫、避免每 5 秒 destroy + recreate text
    const sig = JSON.stringify(kws);
    if (sig === this._currentKeywordsSig) return;
    this._currentKeywordsSig = sig;

    // 清除舊 text 物件
    this._kwTexts.forEach(t => t.destroy());
    this._kwTexts = [];

    const RANKS = ['①', '②', '③', '④', '⑤'];
    const boardLeft = this._kwBaseX - 192;
    kws.forEach((kw, i) => {
      const y = this._kwBaseY + 54 + i * 46;
      const isFirst = i === 0;
      const rn = this.add.text(boardLeft, y, RANKS[i] ?? '', {
        fontSize: '17px', color: '#FF6B35', fontFamily: 'Consolas, monospace',
        shadow: isFirst ? { offsetX: 0, offsetY: 0, color: '#FF6B35', blur: 6, fill: true } : undefined,
      }).setOrigin(0, 0).setDepth(28.5);
      const kt = this.add.text(boardLeft + 28, y, kw, {
        fontSize: '17px', color: '#E8F4FF', fontFamily: 'Consolas, monospace',
      }).setOrigin(0, 0).setDepth(28.5);
      this._kwTexts.push(rn, kt);
    });
  }

  async _pollState() {
    try {
      const res = await fetch('http://localhost:8765/api/state');
      if (res.ok) {
        this._usingRealAPI = true;
        this._applyState(await res.json());
        return;
      }
      console.warn('[WWT] /api/state 回應非 OK:', res.status);
    } catch (e) {
      console.warn('[WWT] /api/state 連線失敗，保留上一次 state:', e.message);
    }
    this._usingRealAPI = false;
    // 失敗時保留 this.state（不清空），畫面維持上一次內容
  }

  _applyState(data) {
    this.state = data;
    const ACTIVE = ['talking', 'thinking', 'researching', 'reacting'];

    // 熱門關鍵字：state.keywords 變化時動態重繪（_renderKeywords 內含防抖）
    if (data.keywords !== undefined) {
      this._renderKeywords(data.keywords);
    }

    // 任務 4.5: discussion mode 強制阿明/小美 35% / 65% 站位（內含防抖、已在位就 skip）
    if (data.mode === 'discussion') {
      this._enforceDiscussionPositions();
    }

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

  // ── 任務 4.5: 主持人碰撞避免 helpers ───────────────────────────

  /** 回傳指定主持人與另一主持人的水平距離（px）。
   *  id 不是 aming/xiaomei 或角色不存在 → Infinity（不啟用碰撞）*/
  _distanceToOtherHost(id) {
    const otherId = id === 'aming' ? 'xiaomei' : (id === 'xiaomei' ? 'aming' : null);
    if (!otherId) return Infinity;
    const ch    = this.characters[id];
    const other = this.characters[otherId];
    if (!ch || !other) return Infinity;
    return Math.abs(ch.sprite.x - other.sprite.x);
  }

  /** discussion mode 進入時、強制兩主持人 X 移到 35% / 65%、kill 既有 tween */
  _enforceDiscussionPositions() {
    if (!this.W) return;
    const targets = {
      aming:   this.W * DISCUSSION_HOST_X_RATIOS.aming,
      xiaomei: this.W * DISCUSSION_HOST_X_RATIOS.xiaomei,
    };
    for (const id of ['aming', 'xiaomei']) {
      const ch = this.characters[id];
      if (!ch) continue;
      const targetX = targets[id];
      // 已在目標 ±5px 內、不動
      if (Math.abs(ch.sprite.x - targetX) <= 5) continue;

      // kill 既有走路 tween + 重設 isWalking、避免狀態卡住
      this.tweens.killTweensOf(ch.sprite);
      ch.isWalking = false;

      // 平滑移到目標位置（200ms 短 tween、避免突然 snap）
      this.tweens.add({
        targets: ch.sprite,
        x: targetX,
        y: ch.homeY,    // 同時把 Y 拉回 home（避免停留在「跳起」狀態）
        duration: 200,
        ease: 'Power2',
        onUpdate: () => this._syncBubble(id),
        onComplete: () => {
          ch.sprite.play(`${id}_idle`);
        },
      });
    }
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

    // 任務 4.5: discussion mode 禁止主持人走動（必須固定 35%/65% 站位）
    if (this.state?.mode === 'discussion' && (id === 'aming' || id === 'xiaomei')) {
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
        // 任務 4.5: 走向另一主持人時、確保停下時距離 >= HOST_MIN_DISTANCE
        const targetIsHost = (targetId === 'aming' || targetId === 'xiaomei');
        const safeOffset   = targetIsHost ? Math.max(wo, HOST_MIN_DISTANCE) : wo;
        const rawStopX = target.x + (target.x > ch.x ? -safeOffset : safeOffset);
        const stopX = this._clampToLane(id, rawStopX);
        const dist  = Math.abs(stopX - ch.sprite.x);

        // 任務 4.5: tween 進行中、即時檢查與另一主持人距離、太近就立即停止
        let aborted = false;
        const walkTween = this.tweens.add({
          targets: ch.sprite,
          x: stopX,
          duration: dist * 2.2,
          ease: 'Linear',
          onUpdate: () => {
            this._syncBubble(id);
            if (!aborted && this._distanceToOtherHost(id) < HOST_MIN_DISTANCE) {
              aborted = true;
              walkTween.stop();
              ch.sprite.play(`${id}_idle`);
              ch.isWalking = false;
              if (onComplete) onComplete();
            }
          },
          onComplete: () => {
            if (aborted) return;  // 已被距離檢查中止、不再執行正常流程
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

  // Phase 2F Step 3: 將 X 座標限制在主持人所屬半場（防止 crossing）
  _clampToLane(id, x) {
    const mid = this.W * 0.5;
    if (id === 'aming')   return Math.min(x, mid - LANE_MARGIN);
    if (id === 'xiaomei') return Math.max(x, mid + LANE_MARGIN);
    return x;
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

    const labels    = { aming: '阿明哥', xiaomei: '小美姐' };
    const hostColor = { aming: '#FF8C00', xiaomei: '#00E5FF' };
    const modeMap   = { discussion: '討論中', working: '工作中', coffee: '茶水間', idle: '待機' };

    // 話題列（最高層級）
    const topicLine = data.topic
      ? `<div style="font-size:15px;font-weight:bold;color:#FF8C55;margin-bottom:8px;white-space:normal;line-height:1.4;">📌 ${data.topic}</div>`
      : '';

    // 模式（降低權重）
    const modeLabel    = modeMap[data.mode] || data.mode || '—';
    const activityNote = (data.activity && data.activity !== 'idle') ? ` · ${data.activity}` : '';
    const modeLine     = `<div style="font-size:11px;opacity:0.65;margin-bottom:10px;">模式：${modeLabel}${activityNote}</div>`;

    // 主持人狀態（橘/青色區分）
    const hostLines = Object.entries(data.hosts || {}).map(([id, mod]) => {
      if (!mod) return '';
      const status  = mod.status || 'idle';
      const output  = mod.last_output ? String(mod.last_output).slice(0, 45) : '—';
      return `
        <div class="module-status">
          <div class="status-dot ${status}"></div>
          <div class="module-name" style="color:${hostColor[id] || '#A8C0D8'};font-weight:bold;">🎙 ${labels[id] || id}</div>
        </div>
        <div class="module-output">${output}</div>
      `;
    }).join('');

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
