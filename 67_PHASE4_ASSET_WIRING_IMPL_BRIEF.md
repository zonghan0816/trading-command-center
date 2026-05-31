# Phase 4 Step 1 — 24H MVP 素材接線（基礎接入）

**狀態：** Step 1 完成（基礎接線）、Step 2/3 待續
**檔案動作：** 3 個檔（`src/config.js`、`src/scenes/BootScene.js`、`src/scenes/OfficeScene.js`）
**承接：** `66_CLAUDE_ASSET_WIRING_INSTRUCTIONS.md` GPT 指令

---

## 一、Step 1 範圍（已完成）

| 項 | 狀態 |
|---|---|
| 新棚景接線（`studio_base_window_separate`）| ✅ |
| 天氣 overlay 圖層（5 種、依時段隨機選 1 張）| ✅ |
| 阿明 4-frame standing actions 接線 | ✅ |
| 小美 4-frame standing actions 接線（白光暈問題已修）| ✅ |
| 4-frame animation mapping（含 pointing/tired fallback）| ✅ |
| 坐姿 + A 組 sprite 預載（Step 2 用）| ✅ |
| 道具 / UI badge / 跑馬燈 載入到 texture（Step 2 接線）| ✅ |

## 二、Step 2/3 待續

| 項 | Step |
|---|---|
| 道具 overlay 接到畫面（4 時段切換）| Step 2 |
| 24H AI LIVE badge 接到 LED 區或角落 | Step 2 |
| 跑馬燈底部 overlay + 滾動文字 | Step 2 |
| 4 時段切換邏輯（time of day detection）| Step 3 |
| 角色組切換（A 組 ↔ B 組）| Step 3 |
| 姿勢切換（站姿 ↔ 坐姿）| Step 3 |
| 即時氣象 API 接線（中央氣象署）| Step 3 |

---

## 三、修改檔案

### 1. `src/config.js`（+30 行）

`customAssets` 區塊新增 24H MVP 全部開關：

```js
customAssets: {
  // Phase 4 Step 1: 24H MVP v3 actions（優先於前面所有）
  char_aming_v3_actions:   true,
  char_xiaomei_v3_actions: true,
  char_aming_v3_sitting:   true,   // 坐姿備用
  char_xiaomei_v3_sitting: true,
  char_A_man_standing:     true,   // A 組白天時段
  char_A_man_sitting:      true,
  char_A_woman_standing:   true,
  char_A_woman_sitting:    true,

  // 新棚景
  studio_base_window_separate: true,

  // 天氣 5 種
  weather_sunny:   true,
  weather_cloudy:  true,
  weather_rainy:   true,
  weather_thunder: true,
  weather_typhoon: true,

  // 道具 4 時段
  prop_morning:    true,
  prop_afternoon:  true,
  prop_evening:    true,
  prop_late_night: true,

  // UI 元素
  ui_brand_24h:  true,
  ui_marquee_bg: true,

  // ...（向下相容、保留 v2 / actions / v1）
}
```

### 2. `src/scenes/BootScene.js`（+35 行）

#### preload 新增

```js
// 新棚景
if (ca.studio_base_window_separate) {
  this.load.image('studio_base', '/assets/studio_base_window_separate.png');
}

// 天氣 5 種
['sunny', 'cloudy', 'rainy', 'thunder', 'typhoon'].forEach(w => {
  if (ca[`weather_${w}`]) this.load.image(`weather_${w}`, `/assets/weather_${w}.png`);
});

// 道具 4 時段
[['morning', 'prop_morning_set'], ['afternoon', 'prop_afternoon_set'],
 ['evening', 'prop_evening_set'], ['late_night', 'prop_late_night_set']].forEach(([slot, fname]) => {
  if (ca[`prop_${slot}`]) this.load.image(`prop_${slot}`, `/assets/${fname}.png`);
});

// UI
if (ca.ui_brand_24h)  this.load.image('ui_brand_24h',  '/assets/ui_brand_24h_ai_live.png');
if (ca.ui_marquee_bg) this.load.image('ui_marquee_bg', '/assets/ui_marquee_bg.png');
```

#### 阿明 / 小美 載入優先序更新

```js
// 阿明：v3 > v2 > v1
if (ca.char_aming_v3_actions) {
  this.load.spritesheet('char_aming', '/assets/char_aming_standing_actions.png',
    { frameWidth: 1024, frameHeight: 1536 });
} else if (ca.char_aming_v2) { ... }

// 小美：v3 > actions > v2 > v1
if (ca.char_xiaomei_v3_actions) {
  this.load.spritesheet('char_xiaomei', '/assets/char_xiaomei_standing_actions.png',
    { frameWidth: 1024, frameHeight: 1536 });
} else if (ca.char_xiaomei_actions) { ... }
```

#### 坐姿 + A 組預載（texture key 規劃）

| Texture key | 檔 | Step |
|---|---|---|
| `char_aming` | `char_aming_standing_actions.png` | 1 (active) |
| `char_aming_sitting` | `char_aming_sitting_actions.png` | 2 (swap) |
| `char_xiaomei` | `char_xiaomei_standing_actions.png` | 1 (active) |
| `char_xiaomei_sitting` | `char_xiaomei_sitting_actions.png` | 2 (swap) |
| `char_a_man` | `char_A_man_standing_actions.png` | 3 (swap) |
| `char_a_man_sitting` | `char_A_man_sitting_actions.png` | 3 (swap) |
| `char_a_woman` | `char_A_woman_standing_actions.png` | 3 (swap) |
| `char_a_woman_sitting` | `char_A_woman_sitting_actions.png` | 3 (swap) |

切換時用 `sprite.setTexture('char_aming_sitting')` swap、不另建 sprite instance。

#### `_makeCharacters` 新增 v3 分支（4-frame mapping）

放在 `char_xiaomei_actions` 分支之前、優先生效：

```js
} else if ((role.id === 'aming'   && CONFIG.customAssets.char_aming_v3_actions) ||
           (role.id === 'xiaomei' && CONFIG.customAssets.char_xiaomei_v3_actions)) {
  // Phase 4 Step 1: 24H MVP v3 4-frame spritesheet
  // frame order: 0=idle, 1=talking, 2=thinking, 3=reacting
  const FRAME_MAP = {
    idle:     0,
    talking:  1,
    typing:   1,  // legacy alias
    thinking: 2,
    reacting: 3,
    pointing: 1,  // fallback → talking（GPT 指令）
    tired:    2,  // fallback → thinking（GPT 指令）
  };
  Object.entries(FRAME_MAP).forEach(([anim, frame]) => {
    this.anims.create({
      key: `${role.id}_${anim}`,
      frames: [{ key: texKey, frame }],
      frameRate: 1, repeat: -1,
    });
  });
}
```

### 3. `src/scenes/OfficeScene.js`（+30 行）

#### `_buildBackground` 改 24H MVP 圖層

```js
_buildBackground() {
  if (this.textures.exists('studio_base')) {
    // depth 0: weather overlay（窗外）
    const weatherKey = this._pickInitialWeatherKey();
    this.weatherLayer = this.add.image(0, 0, weatherKey)
      .setOrigin(0, 0).setDepth(0).setDisplaySize(this.W, this.H);
    // depth 0.5: studio_base（窗框 + 棚景、窗戶區透明）
    this.bgBase = this.add.image(0, 0, 'studio_base')
      .setOrigin(0, 0).setDepth(0.5).setDisplaySize(this.W, this.H);
    this.bgNext = null;
    return;
  }
  // 向下相容：舊三套背景 + crossfade
  // ...原本邏輯保留...
}
```

#### `_pickInitialWeatherKey` 新增（Step 2 會替換成氣象 API）

```js
_pickInitialWeatherKey() {
  const hour = new Date().getHours();
  const candidates = (hour >= 6 && hour < 18)
    ? ['weather_sunny', 'weather_sunny', 'weather_cloudy']
    : ['weather_cloudy', 'weather_rainy'];
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return this.textures.exists(pick) ? pick : 'weather_sunny';
}
```

#### `_updateBackgroundMix` 加 early return

```js
_updateBackgroundMix() {
  // Phase 4 Step 1: 新棚景沒 crossfade 邏輯、直接 return
  if (this.textures.exists('studio_base')) return;
  // ...舊邏輯保留...
}
```

---

## 四、圖層深度規劃

```
depth 0   : weather overlay（窗外天氣）
depth 0.5 : studio_base_window_separate（棚景 + 窗框）
depth 0.6 : prop overlay（道具、Step 2 加）
depth 6   : sign / 中央 LED（沿用）
depth 28~28.5 : 觀眾互動面板文字
depth 30  : 主持人 sprite
depth 32  : bubble bg
depth 32.1: bubble text
depth 33~ : UI brand badge / marquee（Step 2 加）
depth 99  : 資料流粒子
```

---

## 五、未動的部分（嚴守規則）

| 項 | 狀態 |
|---|---|
| API schema | ✅ 未動 |
| `_chooseLineAction` 邏輯 | ✅ 未動（pointing/tired 仍會 query、但動畫 fallback 到 talking/thinking）|
| 主持人站位、scale、xRatio | ✅ 未動 |
| Walking / wander / random movement | ✅ 未恢復 |
| `_dialogueSeq` seq guard | ✅ 完整保留 |
| Step 6.5 prefetch / Step 6.3 tone-angle queue | ✅ 完整保留 |
| 舊角色檔 / 舊棚景 | ✅ 保留向下相容 |
| Cost guard / News curation / Pool 架構 | ⏳ Phase 4 Step 4+ 後續做 |

---

## 六、Sanity Check

```bash
$ node -c src/config.js              # ✅ OK
$ node -c src/scenes/BootScene.js    # ✅ OK
$ node -c src/scenes/OfficeScene.js  # ✅ OK
```

---

## 七、視覺驗收方式

### A. 重整瀏覽器

`Ctrl+Shift+R` 強制重整 `http://localhost:8765`。

### B. 觀察點

| 觀察點 | 預期 |
|---|---|
| 棚景 | 新棚景（窗框分離版）、不再是舊 v1 三套 |
| 窗外天氣 | 隨機選 1 張（白天偏晴/陰、晚上偏陰/雨）|
| 阿明站姿 | 新 4-frame、frame 0 idle 站姿 |
| 小美站姿 | 新 4-frame、白光暈問題已修 |
| Idle | frame 0 |
| Talking | frame 1（自動切換、依 `_chooseLineAction`）|
| Thinking | frame 2 |
| Reacting | frame 3 |
| Pointing | frame 1（fallback 到 talking、不 crash）|
| Tired | frame 2（fallback 到 thinking、不 crash）|

### C. F12 console 預期

```
[TDT] bg: studio_base + weather=weather_sunny
```

或其他 weather key（依時段隨機）。

---

## 八、已知待調（給 GPT 或下次接續用）

### 1. 角色 scale / position 是否要重設？

新 sprite frame 仍是 1024×1536、跟 v2 相同尺寸、`S.characterV2 = 0.28` 應該還適用。
但若視覺上發現角色變太大 / 太小、可調 `config.js` 的 `scale.characterV2`。

### 2. 天氣選擇邏輯目前是隨機

Step 2 會接氣象 API（中央氣象署 OpenData）、目前隨機僅為過渡。

### 3. 道具 + UI badge + 跑馬燈尚未顯示

已預載到 texture cache、Step 2 在 OfficeScene 加 `this.add.image(...)` 連接。

### 4. 4 時段切換尚未實作

`_pickInitialWeatherKey` 只判斷白天/晚上選天氣、沒切角色組或姿勢。
Step 3 會做完整時段邏輯：
```
06-12 morning   → A 組 standing + prop_morning
12-18 afternoon → A 組 sitting + prop_afternoon
18-24 evening   → 阿明小美 standing + prop_evening
00-06 late_night→ 阿明小美 sitting + prop_late_night
```

---

## 九、下一步建議

| 順序 | 動作 | 改動範圍 |
|---|---|---|
| Step 2.1 | 接 24H AI LIVE badge + 跑馬燈底部 overlay | OfficeScene +20 行 |
| Step 2.2 | 接道具 overlay（先固定一套、可手動切）| OfficeScene +15 行 |
| Step 2.3 | 接氣象 API（中央氣象署 OpenData）| server.py 新 endpoint + OfficeScene poll |
| Step 3.1 | 4 時段切換 detection | OfficeScene +30 行 |
| Step 3.2 | 角色組切換（A 組 ↔ B 組）| OfficeScene +20 行 |
| Step 3.3 | 姿勢切換（站姿 ↔ 坐姿、用 setTexture swap）| OfficeScene +15 行 |

完成後再開 Phase 4 Step 4 進入 24H MVP 主架構（Cost Guard / Batch Pool / News Curation）。

---

## 十、規格不符 / 失敗時的備援

| 情境 | 備援 |
|---|---|
| `studio_base` 未載入成功 | OfficeScene 自動 fallback 舊三套棚景 crossfade |
| `weather_*` 都未載入 | weatherLayer 顯示 sunny（也沒就空白、棚景仍正常）|
| 動畫 key 不存在（pointing/tired 在舊角色檔）| Phaser 印警告、sprite 維持當前 frame、不 crash |
| 4-frame spritesheet 尺寸不對 | Frame 0-3 仍能顯示、可能視覺裁切、不 crash |

---

## 結語

Step 1 是「**讓畫面變新 + 動畫架構升級**」的最小可用版本、不破壞任何既有邏輯。
Step 2/3 才會加道具 / UI / 時段切換、屬於體驗強化。

請 GPT 確認：
1. v3 spritesheet 規格（1024×1536 × 4 frames）跟我接的程式對齊嗎？
2. 圖層深度規劃是否符合 GPT 設想？
3. 角色 texture key 命名（`char_aming` / `char_aming_sitting` / `char_a_man` 等）是否 OK？
4. 下一步進 Step 2.1（UI badge / 跑馬燈）OK 嗎？
