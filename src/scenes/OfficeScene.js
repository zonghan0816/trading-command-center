// OfficeScene: 前視角像素辦公室
import { CONFIG } from '../config.js';
const S = CONFIG.scale;
const WALL_H_RATIO = CONFIG.layout.wallHeightRatio;

// WWT 主持人座位
const STATIONS = {
  aming:   { desk: 'desk', mon: 'monitor', label: '🎙 陳柏偉' },
  xiaomei: { desk: 'desk', mon: 'monitor', label: '🎙 王于安' },
};

const DATA_FLOWS = CONFIG.layout.dataFlows;

// Phase 3 Step 6.7: TOP 5 改成觀眾互動 CTA（62 notes item 6 + 10 決議）
// 24H MVP 過渡、之後可能改成跑馬燈或其他形式
//
// 格式說明：
// - 'string'           = 單行單欄（占整行寬）
// - ['left', 'right']  = 雙欄並排（左欄 / 右欄）
const DEFAULT_KEYWORDS = [
  '按讚 + 訂閱 + 開啟鈴鐺',
  ['來賓', '主播'],
  ['陳柏偉', '王于安'],
];
const KEYWORD_COLORS   = ['#FF6B35', '#00E5FF', '#00E676', '#FFB300', '#BB86FC'];
const KEYWORD_MAX      = 5;

// Phase 4 Step 3.0b: 4 時段 → 視覺角色組對應
// morning/afternoon = A 組（A_man + A_woman）、evening/late_night = B 組（阿明小美）
const SLOT_VISUAL_MAP = {
  morning:    { aming: 'a_man',   xiaomei: 'a_woman'   },
  afternoon:  { aming: 'a_man',   xiaomei: 'a_woman'   },
  evening:    { aming: 'aming',   xiaomei: 'xiaomei'   },
  late_night: { aming: 'aming',   xiaomei: 'xiaomei'   },
};

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

      this._freezeMovement = true; // Part 3: 凍結走動，改用動作圖表現狀態
      this._dialogueSeq = 0;       // Phase 3 Step 5.1: dialogue 播放 token、避免舊 delayedCall 串到新一輪
      // Phase 3 Step 6.5: prefetch 下一輪 dialogue、縮短 gap
      this._nextDialogue = null;            // 已 prefetch 好的下一輪 data（待 consume）
      this._prefetchInProgress = false;     // prefetch fetch 是否進行中
      this._prefetchStartedForSeq = null;   // 已對哪個 seq 觸發過 prefetch（避免同輪重複觸發）

      // Phase 4 Step 3.0: cache 當前時段、給 _buildWorkstations / sprite.play 用
      this._currentSlot = this._getCurrentTimeSlot();
      console.info('[TDT] slot:', this._currentSlot);

      this._buildBackground();
      this._buildPropOverlay();    // Phase 4 Step 2: 依時段疊道具（depth 1、在角色之下）
      this._buildDecorations();
      this._buildWorkstations();
      this._startBgm();            // BGM 兩首輪流播（bgm_1 / bgm_2）

      // Part 2: 每 60 秒更新 crossfade alpha（長時間直播不中斷時背景慢慢變）
      this.time.addEvent({ delay: 60000, callback: this._updateBackgroundMix, callbackScope: this, loop: true });
      // this._buildSign(); // Phase 3: 新背景已有完整節目棚，暫停舊招牌

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

  // ── 背景 ──────────────────────────────────────────────────────
  _getTimeOfDayBackgroundMix() {
    const now  = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const clamp = (v) => Math.min(1, Math.max(0, v));

    // 過渡：night → morning  05:30–06:30  (330–390)
    if (mins >= 330 && mins < 390)
      return { base: 'studio_bg_night',   next: 'studio_bg_morning', alpha: clamp((mins - 330) / 60) };
    // 穩定：morning           06:30–14:29  (390–869)
    if (mins >= 390 && mins < 870)
      return { base: 'studio_bg_morning', next: null, alpha: 0 };
    // 過渡：morning → noon    14:30–15:30  (870–930)
    if (mins >= 870 && mins < 930)
      return { base: 'studio_bg_morning', next: 'studio_bg_noon',    alpha: clamp((mins - 870) / 60) };
    // 穩定：noon              15:30–16:59  (930–1019)
    if (mins >= 930 && mins < 1020)
      return { base: 'studio_bg_noon',    next: null, alpha: 0 };
    // 過渡：noon → night      17:00–18:00  (1020–1080)
    if (mins >= 1020 && mins < 1080)
      return { base: 'studio_bg_noon',    next: 'studio_bg_night',   alpha: clamp((mins - 1020) / 60) };
    // 穩定：night             18:00–05:29
    return { base: 'studio_bg_night', next: null, alpha: 0 };
  }

  _buildBackground() {
    // Phase 4 Step 1: 24H MVP 新棚景架構
    // depth 0:   weather overlay（窗外）
    // depth 0.5: studio_base_window_separate（窗框 + 棚景、窗戶區透明）
    // depth 0.6: 道具 overlay (Step 2 加)
    if (this.textures.exists('studio_base')) {
      // 預設先用晴天、之後可接氣象 API 或隨機切
      const weatherKey = this._pickInitialWeatherKey();
      this.weatherLayer = this.add.image(0, 0, weatherKey)
        .setOrigin(0, 0).setDepth(0).setDisplaySize(this.W, this.H);
      this.bgBase = this.add.image(0, 0, 'studio_base')
        .setOrigin(0, 0).setDepth(0.5).setDisplaySize(this.W, this.H);
      this.bgNext = null;
      console.info('[TDT] bg: studio_base + weather=' + weatherKey);
      return;
    }
    // 向下相容：舊三套背景 + crossfade
    const mix = this._getTimeOfDayBackgroundMix();
    console.info('[TDT] bg (legacy):', mix.base, mix.next ? `→ ${mix.next} α=${mix.alpha.toFixed(2)}` : '');
    this.bgBase = this.add.image(0, 0, mix.base)
      .setOrigin(0, 0).setDepth(0).setDisplaySize(this.W, this.H);
    this.bgNext = mix.next
      ? this.add.image(0, 0, mix.next).setOrigin(0, 0).setDepth(0.1).setDisplaySize(this.W, this.H).setAlpha(mix.alpha)
      : null;
  }

  // Phase 4 Step 1: 預設天氣（Step 2 會接氣象 API、現在依時段大致選一張）
  // Phase 4 Step 3.0c: 改用 slot 不用 hour、配合 URL ?slot= 切換
  _pickInitialWeatherKey() {
    const slot = this._currentSlot || this._getCurrentTimeSlot();
    const isDaytime = slot === 'morning' || slot === 'afternoon';
    const candidates = isDaytime
      ? ['weather_sunny', 'weather_sunny', 'weather_cloudy']
      : ['weather_cloudy', 'weather_rainy'];
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return this.textures.exists(pick) ? pick : 'weather_sunny';
  }

  // Phase 4 Step 3.0b: hostId → visualId（時段對應）+ 動畫 key helper
  _getVisualId(hostId) {
    const map = SLOT_VISUAL_MAP[this._currentSlot] || SLOT_VISUAL_MAP.evening;
    const candidate = map[hostId] || hostId;
    // A 組 texture 未載入時回退到原角色（avoid invisible sprite）
    if (candidate.startsWith('a_') && !this.textures.exists(`char_${candidate}`)) {
      return hostId;
    }
    return candidate;
  }
  _animKey(hostId, action) {
    return `${this._getVisualId(hostId)}_${action}`;
  }

  // Phase 4 Step 2: 4 時段判定（06-12 morning / 12-18 afternoon / 18-24 evening / 00-06 late_night）
  // Phase 4 Step 3.0a: 加 URL `?slot=morning|afternoon|evening|late_night` 強制切換、給開發/驗收用
  _getCurrentTimeSlot() {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const forced = params.get('slot');
      if (['morning', 'afternoon', 'evening', 'late_night'].includes(forced)) {
        console.info('[TDT] forced slot via URL:', forced);
        return forced;
      }
    }
    const hour = new Date().getHours();
    if (hour >= 6  && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'evening';
    return 'late_night';
  }

  // Phase 4 Step 2: 依當前時段疊上對應道具 PNG（depth 1、在角色之下）
  // Phase 4 Step 2.2: 縮小到 50% + 釘底部中央、避免擋到中央 LED
  _buildPropOverlay() {
    const slot = this._getCurrentTimeSlot();
    const propKey = `prop_${slot}`;
    if (this.textures.exists(propKey)) {
      // 桌子等道具縮小到 960×540（50% of 1920×1080）、bottom-center 對齊、下偏 20px
      this.propLayer = this.add.image(this.W / 2, this.H - 20, propKey)
        .setOrigin(0.5, 1)
        .setDepth(1)
        .setDisplaySize(960, 540)
        .setAlpha(0.85);
      console.info(`[TDT] prop: ${propKey} (50% size, bottom-center, alpha 0.85)`);
    } else {
      console.info(`[TDT] prop skip: ${propKey} 沒載入`);
    }
  }

  _updateBackgroundMix() {
    // Phase 4 Step 1: 新棚景沒 crossfade 邏輯、直接 return
    if (this.textures.exists('studio_base')) return;
    // 舊三套背景 crossfade
    const mix = this._getTimeOfDayBackgroundMix();
    if (this.bgBase) this.bgBase.setTexture(mix.base);
    if (mix.next) {
      if (!this.bgNext) {
        this.bgNext = this.add.image(0, 0, mix.next)
          .setOrigin(0, 0).setDepth(0.1).setDisplaySize(this.W, this.H);
      } else {
        this.bgNext.setTexture(mix.next);
      }
      this.bgNext.setAlpha(mix.alpha);
    } else if (this.bgNext) {
      this.bgNext.setAlpha(0);
    }
  }

  // ── 裝飾（燈、植物、白板、機架）─────────────────────────────
  _buildDecorations() {
    const { W, H, wallH } = this;

    const dOff = CONFIG.layout.decorOffsets ?? {};
    const wsOff = dOff.wallScreen  ?? { x: 0, y: 0 };
    const wbOff = dOff.whiteboard  ?? { x: 0, y: 0 };

    // wall_screen 已停用（新背景 studio_bg_night 已內建 LED 螢幕框）

    // TOP5 資訊板（純色面板，不用 whiteboard texture 以免烘焙彩色列框）
    const wbOffY = CONFIG.layout.whiteboardOffsetY ?? 20;
    const wbCX   = W - 214 + (CONFIG.layout.decorOffsets?.whiteboard?.x ?? 0);
    const wbTopY = wallH + wbOffY + (CONFIG.layout.decorOffsets?.whiteboard?.y ?? 0);
    // TOP5 背景/外框已停用（新背景內建右下框，避免雙框）
    // 文字元素保留在下方

    // TOP5 標題（Fix 2.5: 往下 8px，略往右對齊背景框）
    // Phase 3 Step 6.7: 標題「▸ 觀眾互動」拿掉（使用者要求、CTA 自說明）

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

      // 椅背已停用（新背景 studio 內建舞台設備）
      // this.add.image(baseX, deskY - 8, 'chair_back')
      //   .setOrigin(0.5, 1).setDepth(depth - 1).setScale(S.chairBack);

      // 角色 sprite（v2 draft 用 characterV2 scale）
      // Phase 4 Step 3.0b: 用 visualId 決定 texture（morning/afternoon = A 組、evening/late_night = 阿明小美）
      const visualId = this._getVisualId(id);
      const isV2 = CONFIG.customAssets[`char_${visualId}_v2`] || visualId.startsWith('a_') || visualId === 'aming' || visualId === 'xiaomei';
      // Phase 4 Step 5.17: 王于安 individual PNG（1254×1254）用自己的 scale
      const useIndividual = (id === 'xiaomei' && CONFIG.customAssets.char_xiaomei_individual)
                         || (id === 'aming'   && CONFIG.customAssets.char_3q_individual);
      const charScale = (id === 'aming' && CONFIG.customAssets.char_3q_individual)
        ? (S.characterIndividualAming ?? 0.39)
        : useIndividual
          ? (S.characterIndividual ?? 0.34)
          : (isV2 ? (S.characterV2 ?? 0.28) : S.character);
      // Phase 4 Step 5.17: 不傳 frame index、相容 image 跟 spritesheet 兩種 texture
      const sprite = this.add.sprite(charX, charY, `char_${visualId}`)
        .setOrigin(0.5, 1).setDepth(depth).setScale(charScale).setInteractive();

      sprite.play(this._animKey(id, 'idle'));
      sprite.roleId = id;

      this.tweens.add({
        targets: sprite, y: charY - 2,
        duration: 900 + Math.random() * 500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Math.random() * 1000,
      });

      // 桌子已停用（新背景 studio 內建舞台設備）
      // this.add.image(baseX, deskY, st.desk || 'desk')
      //   .setOrigin(0.5, 0).setDepth(depth + 1).setScale(S.desk);


      // 對話泡泡：放在頭部旁（阿明左側、小美右側）
      const charHeight = isV2
        ? Math.round(1536 * (S.characterV2 ?? 0.28))
        : Math.round(64 * S.character);
      // Phase 3 Step 6.7: bubble 放大、字更醒目（最終 480×135、不再蓋到角色身體）
      const bW = 480, bH = 135;
      const accentColor = (id === 'aming') ? 0xFF8C00 : 0x00E5FF;

      // 角色顯示寬度（v2 = 1024 * 0.28 ≈ 287px）
      const charWidth = isV2
        ? Math.round(1024 * (S.characterV2 ?? 0.28))
        : Math.round(48 * S.character);

      const headTopY = charY - charHeight;
      // 泡泡從角色邊緣外側開始、Step 6.7: 改用 charWidth/2 + 10 間距、確實不覆蓋身體
      let bCX = (id === 'aming')
        ? Math.max(40 + bW / 2, charX - charWidth / 2 - bW / 2 - 10)
        : Math.min(1880 - bW / 2, charX + charWidth / 2 + bW / 2 + 10);
      let bCY = Math.max(190 + bH / 2, Math.min(900 - bH / 2, headTopY + 70)); // Fix 5: +110 → +70

      // Graphics 用相對座標建立（定位在 bCX, bCY），setPosition 才能正確移動
      const bubbleBg = this.add.graphics({ x: bCX, y: bCY });
      bubbleBg.fillStyle(0x071828, 0.95);
      bubbleBg.fillRoundedRect(-bW / 2, -bH / 2, bW, bH, 12);
      bubbleBg.lineStyle(2, accentColor, 0.85);
      bubbleBg.strokeRoundedRect(-bW / 2, -bH / 2, bW, bH, 12);
      bubbleBg.setDepth(depth + 3).setAlpha(0);

      const bubbleText = this.add.text(bCX, bCY, '', {
        // Phase 3 Step 6.7: 字級 24 → 26、配合更大 bubble
        fontSize: '26px', color: '#E8F4FF',
        fontFamily: '"Microsoft JhengHei", "PingFang TC", Arial, sans-serif',
        lineSpacing: 8,
        padding: { x: 0, y: 6 },
        wordWrap: { width: bW - 44, useAdvancedWrap: true }, align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(depth + 3.1).setAlpha(0);

      this.characters[id] = {
        sprite, bubbleBg, bubbleText,
        x: charX, homeY: charY, state: 'idle', bubbleVisible: false,
        isWalking: false, floatTween: null,
        depth,
        bubbleXOff: bCX - charX,   // 泡泡相對角色的 X 偏移（正=右，負=左）
        bubbleYOff: bCY - charY,   // 泡泡相對角色的 Y 偏移
      };
    });

    // 中央主持桌 + 麥克風架已停用（新背景 studio_bg_night 已內建舞台設備）
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
    // 保留 array（雙欄）、其他轉字串、防止 server 推非字串值
    kws = kws.map(k => (Array.isArray(k) ? k.map(s => String(s)) : String(k)));

    // 防抖簽章：內容相同就不重畫、避免每 5 秒 destroy + recreate text
    const sig = JSON.stringify(kws);
    if (sig === this._currentKeywordsSig) return;
    this._currentKeywordsSig = sig;

    // 清除舊 text 物件
    this._kwTexts.forEach(t => t.destroy());
    this._kwTexts = [];

    const boardLeft = this._kwBaseX - 178;
    // Phase 4 Step 5.23: 雙欄 layout 用固定 X 位置、避免中文非等寬字體跑掉
    const COL_LEFT_X  = boardLeft + 4;
    const COL_RIGHT_X = boardLeft + 150;
    const TEXT_STYLE_BASE = {
      fontSize: '25px',
      fontFamily: 'Consolas, "Microsoft JhengHei", "PingFang TC", sans-serif',
    };
    // 顏色規則：第 0 行 CTA = 橘、第 1 行標籤 = 青、第 2 行名字 = 金
    const LINE_COLORS = ['#FF6B35', '#00E5FF', '#FFD700'];

    kws.forEach((kw, i) => {
      const y     = this._kwBaseY + 50 + i * 52;
      const color = LINE_COLORS[i] ?? '#E8F4FF';
      if (Array.isArray(kw)) {
        // 雙欄並排：兩個獨立 text、左右各一個 X
        const [left, right] = [kw[0] ?? '', kw[1] ?? ''];
        const tL = this.add.text(COL_LEFT_X, y, left, { ...TEXT_STYLE_BASE, color })
          .setOrigin(0, 0).setDepth(28.5);
        const tR = this.add.text(COL_RIGHT_X, y, right, { ...TEXT_STYLE_BASE, color })
          .setOrigin(0, 0).setDepth(28.5);
        this._kwTexts.push(tL, tR);
      } else {
        // 單欄整行
        const kt = this.add.text(COL_LEFT_X, y, kw, { ...TEXT_STYLE_BASE, color })
          .setOrigin(0, 0).setDepth(28.5);
        this._kwTexts.push(kt);
      }
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

    // Phase 3 Step 6.7: TOP 5 已改成觀眾互動 CTA 固定文案、不再跟 state.keywords 連動
    // 24H MVP 之後改成跑馬燈或其他形式時、再重新接

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
          ch.bubbleText.setText(mod.last_output.slice(0, 80));
          this._showBubble(id);
        }
        if (['talking', 'researching'].includes(mod.status) && !ch.isWalking) {
          // Phase 3 Step 4: talking 用 _talking 動畫（小美 actions frame 1）
          ch.sprite.play(this._animKey(id, 'talking'));
          // Part 3: 移動凍結，不再走到其他角色
          if (!this._freezeMovement) {
            const targets = DATA_FLOWS[id] || [];
            if (targets.length > 0 && this.characters[targets[0]]) {
              this._walkTo(id, targets[0], () => this._walkHome(id));
            }
          }
        } else if (mod.status === 'thinking') {
          ch.sprite.play(this._animKey(id, 'thinking'));
          this._animateTyping(id);
        } else if (mod.status === 'reacting') {
          // Phase 3 Step 4: reacting 獨立分支、播 _reacting（小美 actions frame 3）、不再落到 thinking
          ch.sprite.play(this._animKey(id, 'reacting'));
          this._animateTyping(id);
        }
      } else if (justBecameInactive && !ch.isWalking) {
        ch.sprite.play(this._animKey(id, 'idle'));
        this._hideBubble(id);
      } else if (mod.status === 'idle' && !ch.isWalking) {
        ch.sprite.play(this._animKey(id, 'idle'));
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
          ch.sprite.play(this._animKey(id, 'idle'));
          // Phase 4 Step 5.13: snap 後重啟 idle 浮動 tween（killTweensOf 殺掉了原本的）
          this.tweens.add({
            targets: ch.sprite, y: ch.homeY - 2,
            duration: 900 + Math.random() * 500,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
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
              ch.sprite.play(this._animKey(id, 'idle'));
              ch.isWalking = false;
              if (onComplete) onComplete();
            }
          },
          onComplete: () => {
            if (aborted) return;  // 已被距離檢查中止、不再執行正常流程
            ch.sprite.play(this._animKey(id, 'thinking'));
            this.time.delayedCall(400, () => { if (onComplete) onComplete(); });
          },
        });
      },
    });
  }

  _walkHome(id, onComplete) {
    if (this._freezeMovement) { if (onComplete) onComplete(); return; }
    const ch = this.characters[id];
    if (!ch) { if (onComplete) onComplete(); return; }

    const walkAnim = this._animKey(id, 'typing');
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
            ch.sprite.play(this._animKey(id, 'idle'));
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
    const sx = ch.sprite.x;
    // 使用建立時算好的偏移量（bubbleXOff / bubbleYOff），讓泡泡跟著角色 X 移動
    const bX = sx + (ch.bubbleXOff ?? 0);
    const bY = ch.homeY + (ch.bubbleYOff ?? -140);
    ch.bubbleBg.setPosition(bX, bY);
    ch.bubbleText.setPosition(bX, bY);
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
    const full = (this.state.hosts?.[id]?.last_output || '思考中...').slice(0, 80);
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
  // Phase 3 Step 5.2: 移除 host 區塊（跟泡泡重複、且容易跟泡泡播放不同步）
  // 目前只留 topic / mode / 時間；後續再決定 topic / 時間 該擺哪
  _updateHTMLPanel(data) {
    const list   = document.getElementById('module-list');
    const timeEl = document.getElementById('update-time');
    if (!list || !timeEl) return;

    const modeMap = { discussion: '討論中', idle: '待機' };  // working / coffee 為 legacy、已不使用

    // 話題列
    const topicLine = data.topic
      ? `<div style="font-size:15px;font-weight:bold;color:#FF8C55;margin-bottom:8px;white-space:normal;line-height:1.4;">📌 ${data.topic}</div>`
      : '';

    // 模式
    const modeLabel    = modeMap[data.mode] || data.mode || '—';
    const activityNote = (data.activity && data.activity !== 'idle') ? ` · ${data.activity}` : '';
    const modeLine     = `<div style="font-size:11px;opacity:0.65;margin-bottom:10px;">模式：${modeLabel}${activityNote}</div>`;

    list.innerHTML = topicLine + modeLine;
    timeEl.textContent = `更新 ${data.updated_at || '—'}`;
  }

  // ── AI 即時對話系統 ──────────────────────────────────────────
  async _fetchAndPlayDialogue() {
    if (this._chatInProgress) return;

    // Phase 3 Step 6.7: 暫停中、500ms 後再檢查（讓 OBS 畫面不停、但不打 API）
    if (this.state?.paused) {
      this.time.delayedCall(500, this._fetchAndPlayDialogue, [], this);
      return;
    }

    // Phase 3 Step 6.5: 先看 prefetch cache 有沒有可用的下一輪
    if (this._nextDialogue) {
      const data = this._consumePrefetchedDialogue();
      if (data && this._startDialogueFromData(data)) {
        console.info('[TDT] using prefetched dialogue');
        return;
      }
    }

    // Phase 3 Step 6.5: prefetch 還在跑 → 250ms 後再試（不開新 fetch、不疊請求）
    if (this._prefetchInProgress) {
      this.time.delayedCall(250, this._fetchAndPlayDialogue, [], this);
      return;
    }

    // 沒 cache 也沒 prefetch → live fetch
    // mark in_progress、避免並發 fetch（await 期間另一個 delayedCall 觸發又 fetch）
    this._chatInProgress = true;
    try {
      const res = await fetch('/api/chat', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data?.dialogue?.length >= 2) {
          // Reset 給 _startDialogueFromData 重新接管（它會 set true + 增 seq）
          this._chatInProgress = false;
          if (this._startDialogueFromData(data)) return;
        }
      }
    } catch (_) {}
    // API 失敗 → 3 秒後靜默重試
    this._chatInProgress = false;
    this.time.delayedCall(3000, this._fetchAndPlayDialogue, [], this);
  }

  /**
   * Phase 3 Step 6.5: 背景 prefetch 下一輪 dialogue、結果存 _nextDialogue。
   * - 重複觸發 guard：seq 一致 + 沒在進行中 + 沒已存 cache
   * - 失敗只 warn、不中斷當前播放
   */
  async _prefetchNextDialogue(seq) {
    if (seq !== this._dialogueSeq) return;
    if (this._prefetchInProgress) return;
    if (this._nextDialogue) return;
    this._prefetchInProgress = true;
    console.info('[TDT] prefetch started');
    try {
      const res = await fetch('/api/chat', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data?.dialogue?.length >= 2) {
          this._nextDialogue = data;
          // Phase 4: 紀錄 topic 給 console 看、但不丟 cache、讓它自然講完
          console.info(`[TDT] prefetch ready (topic=${(data.topic || '').slice(0, 20)})`);
        }
      }
    } catch (e) {
      console.warn('[TDT] prefetch failed:', e?.message ?? e);
    } finally {
      this._prefetchInProgress = false;
    }
  }

  /** Phase 3 Step 6.5: 取出已 prefetch 的 dialogue、清快取。invalid 回 null。
   *  Phase 4: topic 換了也讓 cached 那輪講完再換、自然過渡、不硬切。
   */
  _consumePrefetchedDialogue() {
    const data = this._nextDialogue;
    this._nextDialogue = null;
    if (!data?.dialogue || data.dialogue.length < 2) return null;
    // 注意：topic 換了仍會用 cache（讓上一個話題那輪自然講完）
    // 下一輪 _fetchAndPlayDialogue 重新呼叫時、server 已是新 topic、會拿新對白
    const currentTopic = (this.state && this.state.topic) || '';
    if (data.topic && data.topic !== currentTopic) {
      console.info(`[TDT] cache 用舊 topic (${data.topic.slice(0, 20)})、播完自然切 (${currentTopic.slice(0, 20)})`);
    }
    return data;
  }

  /**
   * Phase 3 Step 6.5: 拿到 dialogue data 後正式開始播放。
   * 共用給「consume prefetch」跟「live fetch」兩個路徑、避免邏輯重複。
   * - 真正開始播放才遞增 _dialogueSeq（而不是 fetch 起手就遞增）
   * - 重置 _prefetchStartedForSeq、讓新 seq 可以再觸發一次 prefetch
   */
  _startDialogueFromData(data) {
    if (!data?.dialogue || data.dialogue.length < 2) return false;
    if (this._chatInProgress) return false;
    this._chatInProgress = true;
    this._dialogueSeq = (this._dialogueSeq || 0) + 1;
    const seq = this._dialogueSeq;
    this._prefetchStartedForSeq = null;

    // Phase 4 Step 5.6: 告訴後端「現在正在講這個 topic」、LED 才不會跑前面
    const speakingTopic = data.topic || '';
    if (speakingTopic) {
      fetch('http://localhost:8765/api/now_speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: speakingTopic }),
      }).catch(() => {});  // fire-and-forget、失敗不影響播放
    }

    this._playDialogue(data.dialogue, seq);
    return true;
  }

  _playDialogue(lines, seq) {
    if (seq !== this._dialogueSeq) return;  // Phase 3 Step 5.1: 舊 seq、不執行
    const walkerId = lines[0].speaker;
    const targetId = lines.find((l, i) => i > 0 && l.speaker !== walkerId)?.speaker;
    const walker   = this.characters[walkerId];

    if (!walker || walker.isWalking) {
      this._chatInProgress = false;
      this.time.delayedCall(800, this._fetchAndPlayDialogue, [], this);
      return;
    }

    // Phase 3 Step 4: movement frozen → walker 直接進入 talking 狀態
    const walkerAnim = this._freezeMovement ? this._animKey(walkerId, 'talking') : this._animKey(walkerId, 'typing');
    walker.sprite.play(walkerAnim);
    // Phase 3 Step 5.1: 移除 _updateHTMLPanel(_buildPanelData())、避免假 state（topic=''、mode='idle'）覆蓋真實 polled state；
    // 改由 _pollState 維持 panel；chat 進行中 host 區塊已透過 skipHostLines 凍結

    // Phase 3 Step 6.5: 當前 dialogue 開始播放後 2 秒、背景 prefetch 下一輪
    // （讓 Claude 在當前播放期間就生成下一輪、播完直接拿、不再等 5~10s）
    if (this._prefetchStartedForSeq !== seq) {
      this._prefetchStartedForSeq = seq;
      this.time.delayedCall(2000, () => {
        if (seq !== this._dialogueSeq) return;
        this._prefetchNextDialogue(seq);
      });
    }

    const afterWalk = () => {
      if (seq !== this._dialogueSeq) return;
      // Phase 3 Step 6.5: afterWalk 內 delay 300 → 100
      this.time.delayedCall(100, () => {
        if (seq !== this._dialogueSeq) return;
        this._playLineSequence(lines, walkerId, () => {
          if (seq !== this._dialogueSeq) return;
          // Phase 3 Step 6.2: 整輪結束、確保兩主持人都回 idle + 收所有泡泡（防殘留）
          this._returnHostToIdle('aming');
          this._returnHostToIdle('xiaomei');
          this._hideBubble('aming');
          this._hideBubble('xiaomei');
          this._walkHome(walkerId, () => {
            if (seq !== this._dialogueSeq) return;
            this._chatInProgress = false;
            // Phase 3 Step 6.5: next dialogue gap 1100 → 350（prefetch 就緒時近乎無感、未就緒時也比原本快）
            this.time.delayedCall(350, this._fetchAndPlayDialogue, [], this);
          });
        }, seq);
      });
    };

    // Part 3: 移動凍結 → 直接開始對話，不走動
    if (!this._freezeMovement && targetId && this.characters[targetId]) {
      this._triggerDataFlow(walkerId, targetId);
      this._walkTo(walkerId, targetId, afterWalk);
    } else {
      // Phase 3 Step 6.5: frozen 路徑 delay 300 → 100
      this.time.delayedCall(100, afterWalk);
    }
  }

  /**
   * Phase 3 Step 5: 依台詞語氣選動作（只對小美生效）
   * 阿明 / 其他角色：永遠回傳 `${id}_${fallbackStatus}`（預設 talking、行為與 Step 4 等價）
   * 小美：依關鍵字命中、優先順序 reacting > tired > pointing > thinking > talking
   *
   * Phase 3 Step 6.2 擴充：
   * - PHRASE_OVERRIDE 多字片語優先判斷（更精準、避免單字誤命中）
   * - PATTERN_ORDER 補上經濟壓力 / 反諷 / 嘆氣常見詞
   *
   * 不改 API schema、純前端判斷；emotion 欄位若有未來也可在這裡擴展。
   */
  _chooseLineAction(id, text, fallbackStatus = 'talking', emotion = null) {
    // Phase 4 Step 3.0b: 改用 _animKey 對應到 visualId（A 組 morning/afternoon 自動切）
    const fallback = this._animKey(id, fallbackStatus);

    // 3Q 陳柏惟 emotion 路由（9 種）
    if (id === 'aming' && CONFIG.customAssets.char_3q_individual && emotion) {
      const ALLOWED_3Q = new Set([
        'idle','passionate','combat','excited','humor','sincere','resilient','angry','speech',
        'thinking','mocking','sympathy','surprised','explain','mocking_laugh','greeting','disgusted',
      ]);
      return ALLOWED_3Q.has(emotion) ? `aming_emo_${emotion}` : 'aming_emo_passionate';
    }
    if (id !== 'xiaomei') return fallback;

    // Phase 4 Step 5.17: individual PNG ON + line.emotion 有值 → 直接路由
    // 12 allowed: idle / talk / smile / thinking / surprised / skeptical / wave
    //           / angry / laughing / sad / relieved / cheering
    if (CONFIG.customAssets.char_xiaomei_individual && emotion) {
      const ALLOWED = new Set([
        'idle','talk','smile','thinking','surprised','skeptical','wave',
        'angry','laughing','sad','relieved','cheering',
      ]);
      return ALLOWED.has(emotion) ? `xiaomei_emo_${emotion}` : 'xiaomei_emo_talk';
    }

    const s = String(text || '');
    if (!s) return fallback;

    // Phase 3 Step 6.2: 多字 phrase 優先 override
    const PHRASE_OVERRIDE = [
      ['完全荒謬',     'reacting'],
      ['太誇張',       'reacting'],
      ['怎麼會這樣',   'reacting'],
      ['不是吧',       'reacting'],
      ['不可能吧',     'reacting'],
      ['我看了會瘋',   'reacting'],
      ['誰買得起',     'tired'],
      ['買不起',       'tired'],
      ['薪水漲不動',   'tired'],
      ['漲不動',       'tired'],
      ['沒辦法',       'tired'],
      ['受不了',       'tired'],
      ['沒救了',       'tired'],
      ['所以呢',       'pointing'],
      ['重點是',       'pointing'],
      ['問題在',       'pointing'],
      ['問題就在',     'pointing'],
      ['關鍵是',       'pointing'],
      ['現在就是',     'pointing'],
    ];
    for (const [phrase, action] of PHRASE_OVERRIDE) {
      if (s.includes(phrase)) return this._animKey(id, action);
    }

    const PATTERN_ORDER = [
      ['reacting', ['靠', '真的假的', '怎麼可能', '蛤', '哇', '誒', '啊？', '喔？']],
      ['tired',    ['唉', '累', '頭痛', '麻煩', '嘆氣', '煩', '失望', '無奈', '房價']],
      ['pointing', ['重點', '問題', '建議', '其實', '應該', '你看', '關鍵', '我說', '所以']],
      ['thinking', ['可能', '如果', '不過', '但是', '可是', '風險', '想法', '覺得', '假設']],
    ];

    for (const [action, keywords] of PATTERN_ORDER) {
      if (keywords.some(kw => s.includes(kw))) {
        return this._animKey(id, action);
      }
    }
    return fallback;
  }

  /**
   * Phase 3 Step 6.2: 把指定主持人 sprite 回到 idle 姿勢。
   * - isWalking 中或角色不存在：no-op
   * - 不改 state、不動 bubble；單純切回 idle 動畫
   */
  _returnHostToIdle(id) {
    const ch = this.characters[id];
    if (!ch || ch.isWalking) return;
    ch.state = 'idle';
    ch.sprite.play(this._animKey(id, 'idle'));
  }

  _chunkText(text, maxLen = 32) {
    const PUNCTS = new Set(['，', '。', '！', '？', '、', '；', '：']);
    const chunks = [];
    let s = text;
    while (s.length > 0) {
      if (s.length <= maxLen) { chunks.push(s); break; }
      let cut = -1;
      for (let i = Math.min(maxLen, s.length) - 1; i >= 8; i--) {
        if (PUNCTS.has(s[i])) { cut = i + 1; break; }
      }
      if (cut <= 0) cut = maxLen;
      chunks.push(s.slice(0, cut));
      s = s.slice(cut);
    }
    return chunks;
  }

  _playLineSequence(lines, walkerId, onComplete, seq) {
    if (seq !== this._dialogueSeq) return;  // Phase 3 Step 5.1: 舊 seq、不執行
    if (lines.length === 0) { onComplete(); return; }
    const [line, ...rest] = lines;
    const ch = this.characters[line.speaker];

    if (!ch) {
      this.time.delayedCall(300, () => this._playLineSequence(rest, walkerId, onComplete, seq));
      return;
    }

    const chunks = this._chunkText(line.text);
    // Phase 3 Step 5.1: 新 chunkMs 公式、節奏稍快但不要快到看不完
    // Phase 3 Step 6.7: 字幕讀完前不換段、放慢為接近中文閱讀速度（10 字/秒 → 5 字/秒）
    // base 1400→2000、字單價 45→100、min 1800→2500、max 4200→5500
    const chunkMs = (chunk) => Math.min(5500, Math.max(2500, 2000 + chunk.length * 100));

    const showChunks = (idx) => {
      if (seq !== this._dialogueSeq) return;  // Phase 3 Step 5.1: 舊 seq、不執行
      if (idx >= chunks.length) {
        this._hideBubble(line.speaker);
        // Phase 3 Step 6.2: 完句一律回 idle（不再限定 walkerId、修小美卡在最後動作 bug）
        this._returnHostToIdle(line.speaker);
        // Phase 3 Step 6.5: line gap 300 → 180
        this.time.delayedCall(180, () => this._playLineSequence(rest, walkerId, onComplete, seq));
        return;
      }
      const chunk = chunks[idx];
      ch.bubbleText.setText(chunk);
      // Phase 4 Step 5.18: 支援 line.emotions 陣列（每 chunk 一個 emotion）
      // 沒陣列就 fallback line.emotion 單值（向下相容）
      const emo = (Array.isArray(line.emotions) && line.emotions.length > 0)
        ? line.emotions[idx % line.emotions.length]
        : line.emotion;
      ch.sprite.play(this._chooseLineAction(line.speaker, chunk, 'talking', emo));
      if (idx === 0) {
        // Phase 3 Step 5: 小美生效；阿明維持 talking
        this._showBubble(line.speaker);
        if (line.speaker === walkerId) this._syncBubble(walkerId);
      }
      this.time.delayedCall(chunkMs(chunk), () => showChunks(idx + 1));
    };

    showChunks(0);
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
    ch.bubbleText.setText(text.slice(0, 80));
    // Phase 3 Step 4: demo 對話也用 _talking 動畫
    ch.sprite.play(this._animKey(id, 'talking'));
    this._showBubble(id);

    const done = () => {
      ch.state = 'done';
      this._updateHTMLPanel(this._buildPanelData());
      this._chatInProgress = false;
      this.time.delayedCall(800, this._fetchAndPlayDialogue, [], this);
    };

    // Part 3: 移動凍結 → 不走動
    if (!this._freezeMovement && flow && this.characters[flow]) {
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

  // ── BGM（兩首輪流播）────────────────────────────────────────────
  _startBgm() {
    this._bgmKeys   = ['bgm_1', 'bgm_2'].filter(k => this.cache.audio.exists(k));
    this._bgmIndex  = 0;
    this._bgmTrack  = null;

    const hasBgm = this._bgmKeys.length > 0;
    if (!hasBgm) {
      console.warn('[audio] BGM 音檔未找到、無聲帶過');
      this._createBgmToggle(false);
      return;
    }

    const muted = localStorage.getItem('bgm_muted') === '1';
    if (!muted) {
      const tryPlay = () => { try { this._playNextBgm(); } catch (e) {
        console.warn('[audio] BGM autoplay blocked、等首次點擊');
      }};
      tryPlay();
      if (!this._bgmTrack || !this._bgmTrack.isPlaying) {
        this.input.once('pointerdown', tryPlay);
      }
    }

    this._createBgmToggle(true);
  }

  _playNextBgm() {
    if (this._bgmTrack) { this._bgmTrack.destroy(); this._bgmTrack = null; }
    if (!this._bgmKeys || this._bgmKeys.length === 0) return;

    const key = this._bgmKeys[this._bgmIndex % this._bgmKeys.length];
    this._bgmIndex++;

    const track = this.sound.add(key, { volume: 0.28 });
    track.once('complete', () => this._playNextBgm());
    track.play();
    this._bgmTrack = track;
  }

  _createBgmToggle(hasBgm) {
    const muted = localStorage.getItem('bgm_muted') === '1';
    const label = !hasBgm ? 'NO BGM' : (muted ? 'BGM OFF' : 'BGM ON');

    const btn = this.add.text(this.W - 20, 20, label, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      fontFamily: '"Microsoft JhengHei", Consolas, sans-serif',
      padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setDepth(1000);

    if (!hasBgm) { btn.setAlpha(0.5); return; }

    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      const isMuted = localStorage.getItem('bgm_muted') === '1';
      const next = !isMuted;
      localStorage.setItem('bgm_muted', next ? '1' : '0');

      if (next) {
        if (this._bgmTrack && this._bgmTrack.isPlaying) this._bgmTrack.stop();
        btn.setText('BGM OFF');
      } else {
        this._playNextBgm();
        btn.setText('BGM ON');
      }
    });
  }

  update() {}
}
