# Phase 2F 前置：Resolution / Scaling 架構審查報告

## 環境前提

| 項 | 值 |
|---|---|
| 顯示器 | 4K TV |
| Windows 解析度 | 3840 × 2160 |
| Windows 縮放 | 250% |
| Browser | Edge |
| 邏輯視窗 | 1536 × 864（3840 / 2.5、2160 / 2.5）|
| `window.devicePixelRatio` | 2.5 |
| 未來用途 | OBS Browser Source 擷取 → 串流 |

⚠️ 本次只做 architecture review、**未修改任何檔案**。

---

## 1. 目前 Phaser 設定（src/main.js）

```js
const config = {
  type: Phaser.AUTO,
  width:  window.innerWidth,
  height: window.innerHeight - 52,
  backgroundColor: '#0e1e30',
  parent: 'game-container',
  pixelArt: true,
  antialias: false,
  scene: [BootScene, OfficeScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
```

### 解讀

| 項 | 現況 | 評估 |
|---|---|---|
| `width / height` | 跟著 `window.innerWidth` 動態 | ⚠️ 4K + 250% → 1536×864；視窗大小變動會持續觸發 resize |
| `scale.mode` | `RESIZE`（畫布跟著容器尺寸變）| ⚠️ canvas 不固定、OBS 擷取會抓到不一致的尺寸 |
| `pixelArt: true` + `antialias: false` | 為 48×64 角色 spritesheet 設計 | ✅ 對的 |
| `autoCenter` | `CENTER_BOTH` | 在 `RESIZE` 模式下幾乎無作用 |

---

## 2. 十項分析點

### a. `Phaser.Scale.RESIZE` 是否合適？

**結論：不合適**

- `RESIZE` 模式下、Phaser 把畫布尺寸 = 視窗尺寸、**沒有縮放**
- 任何 world-space 座標（如 `this.W * 0.35`）都跟視窗連動 → 不同尺寸的視窗、角色位置不一致
- OBS Browser Source 需要**固定尺寸**才能穩定擷取
- 建議切到 `Phaser.Scale.FIT`（保比例、letterbox）或 `ENVELOP`（保比例、滿版裁切）

### b. `window.devicePixelRatio` 影響

- 4K + 250% scaling 下、`devicePixelRatio = 2.5`
- Phaser 預設**不**讀 `devicePixelRatio`、canvas 內部解析度 = CSS 尺寸 × 1
- 像素藝術角色（48×64）在 4K 螢幕上會因為瀏覽器把 1 CSS px 對應到 2.5 物理 px、變得**模糊**
- 解法 A：`resolution: window.devicePixelRatio`（Phaser 3 部分支援、需測試）
- 解法 B：基準改大（如 1920×1080）、用 `Phaser.Scale.FIT` 讓瀏覽器負責放大

### c. CSS `vw`/`vh` 與 Phaser canvas 的混搭問題

- `index.html` LED overlay 用 `26vw` 寬、`1.2vw`/`1.7vw` 字級
- Phaser canvas 用 `px`（跟 `window.innerWidth` 連動）
- 兩個系統**沒對齊基準**：vw 是 viewport 百分比、Phaser 是 canvas px
- 一旦改成固定 1920×1080 canvas、LED overlay 還是會跟著視窗（不是 canvas）走 → **錯位**
- 解法：把 LED overlay 也釘在固定基準（用 px、不用 vw）

### d. World-space 座標 vs Responsive

`OfficeScene.js` 內所有定位用 `this.W * ratio`、`this.H * ratio`：

```js
DISCUSSION_HOST_X_RATIOS = { aming: 0.35, xiaomei: 0.65 }
// 計算：targetX = this.W * 0.35
```

- 「比例」方式有彈性、但每次 W 變動都要重畫
- 目前的 resize handler 只更新 W/H 變數、**沒有重新計算**角色 / 物件位置 → 視窗縮放時版面跑掉
- 解法 A：固定 W=1920、不再 responsive、所有比例式座標都 freeze
- 解法 B：保持比例制、補完 resize handler 重畫邏輯（工作量大）

### e. OBS Browser Source 擷取策略

業界做法：

| 策略 | 設定 | 適用 |
|---|---|---|
| **固定 1920×1080** | OBS Browser Source 寬高 1920×1080、Phaser canvas 也 1920×1080 | ✅ 推薦、最穩 |
| **2K（2560×1440）** | 同上、但 2K | 畫面銳利、效能負擔較高 |
| **跟 OBS 輸出對齊** | 看最終直播輸出格式（多半 1080p）| 等同策略 1 |

OBS Browser Source 會用無頭 Chromium、`devicePixelRatio` 通常 = 1、**不會**有 4K + 250% 的問題。但本地開發 / debug 仍會遇到模糊。

### f. Baseline 解析度建議

**1920×1080**（FHD、16:9）

理由：
- OBS 串流主流輸出
- 角色 48×64 在 1920×1080 上有合理顯示比例
- 4K 螢幕上瀏覽器會 2× 縮放（清晰）
- 跟未來 YouTube/Twitch 規格對齊

不選 4K（3840×2160）的原因：
- 串流端極少用 4K（頻寬成本高）
- 像素藝術不需 4K
- canvas 越大 GPU 負擔越高

### g. Fixed canvas 策略可行性

**可行、推薦**

```js
// 改法（不要實作、僅示意）
const config = {
  width:  1920,
  height: 1080,
  scale: {
    mode: Phaser.Scale.FIT,        // 保比例、自動縮放
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
```

優點：
- canvas 內部尺寸固定 1920×1080、所有座標可預測
- `Phaser.Scale.FIT` 自動算縮放比、letterbox（上下黑邊）
- OBS 擷取 1920×1080 → 1:1 對應、零失真

代價：
- 4K TV 上方 / 下方會有黑邊（比例不一致時）
- index.html 的 vw overlay 需要一起改成固定基準

### h. Letterbox 處理

`Phaser.Scale.FIT` 自動產生 letterbox：

- 視窗寬高比 > 16:9 → 左右黑邊
- 視窗寬高比 < 16:9 → 上下黑邊
- 1536×864 = 16:9 → **不會有黑邊**（理想）
- 4K TV 全螢幕也是 16:9 → 不會有黑邊

唯一會有黑邊的場景：使用者拉視窗成非 16:9。OBS 不會、實際播放也不會。

### i. resize handler 命運

目前 `OfficeScene.js` 有 `this.scale.on('resize', ...)`、只更新 W/H、沒重畫。

固定 canvas 後：
- canvas 內部尺寸不變、`resize` 事件**不會觸發**內部尺寸變化
- 只有當瀏覽器視窗變動時、瀏覽器去縮放 canvas DOM、但 game-space 不變
- **resize handler 可以拿掉**（或保留為空殼）

### j. 跟 server.py 的關係

server 端純後端 API、跟畫面尺寸**沒有耦合**。
- 不需要改 server.py
- state schema 不變
- 所有 scaling 屬於前端範疇

---

## 3. 建議策略對照

### 🅰 最小改動（推薦先試）

**修改 1 個檔案、約 10 行**

| 檔案 | 改動 |
|---|---|
| `src/main.js` | `width: 1920` / `height: 1080` / `scale.mode: Phaser.Scale.FIT` |

優點：
- 一次改完、立即看到效果
- 不動 index.html、不動 OfficeScene
- 風險最低、可隨時回退

缺點：
- index.html 的 vw overlay 仍會跟視窗走、可能跟 canvas 錯位（但在標準 16:9 視窗下幾乎察覺不到）
- OfficeScene 的 W=1920 是固定值、原本 `this.W * 0.35` 算出 672、角色定位不變

### 🅱 中等改動（之後若 overlay 錯位再做）

**修改 2~3 個檔案、約 50 行**

| 檔案 | 改動 |
|---|---|
| `src/main.js` | 同 🅰 |
| `index.html` | LED overlay vw → px、用 1920 基準；外層加 transform scale 包覆 |
| `src/scenes/OfficeScene.js` | 移除 resize handler、或留空 |

優點：
- canvas 跟 HTML overlay 完全同步
- OBS 擷取畫面 = 開發畫面 = 串流畫面（1:1）

缺點：
- 動到 index.html、需要視覺驗證 4 種 mode 切換
- transform scale 在 OBS 內可能有額外考量

### 🅲 重度改動（不建議現階段做）

- 完全重寫成 world-space + camera zoom
- 加入 `devicePixelRatio` 感知 resolution scaling
- 多解析度資產（@1x、@2x）

→ 對自用串流過度工程、放未來再說。

---

## 4. 風險與邊界

| 風險 | 機率 | 應對 |
|---|---|---|
| 1920×1080 在 1536×864 視窗下 Phaser.FIT 縮成 ~80% | 高 | 預期行為、letterbox 自動處理 |
| 像素藝術角色經過 FIT 縮放會稍微模糊 | 中 | `pixelArt: true` + `antialias: false` 已抗鋸齒、可接受 |
| 改完 OfficeScene 角色比例式座標 `this.W * 0.35` 變成 `1920 * 0.35 = 672` | 確定 | 跟原本動態值差異不大、視覺幾乎一樣 |
| index.html LED 仍用 vw、跟 canvas 不同步 | 中 | 🅰 階段先觀察、若有錯位再進 🅱 |
| OBS Browser Source 內 `devicePixelRatio = 1`、跟本地 2.5 不同 | 確定 | 預期、OBS 端會看到「正確」畫面、本地開發可能略糊 |

---

## 5. 不會碰的事

- ❌ server.py（後端無關 scaling）
- ❌ BootScene.js（assets 載入、跟 scaling 無關）
- ❌ config.js（角色比例參數、改 main.js 後仍適用）
- ❌ 角色 spritesheet 換資產（48×64 已合適）

---

## 6. 建議下一步

請 GPT 在以下三選一：

1. **走 🅰 路線**：只改 main.js、看效果、之後再決定是否進 🅱
2. **直接走 🅱 路線**：一次改 main.js + index.html + OfficeScene（resize handler 拿掉）
3. **先擱置 scaling、做其他任務**：如 Phase 2D 任務 6（F2 Debug Overlay）

---

## 7. 補充：F2 Debug Overlay（任務 6）獨立性

任務 6 跟 scaling 不衝突、可以在任一階段做：
- 純 HTML overlay、`position: fixed`、`z-index: 9999`
- 按 F2 toggle 顯示 `state.mode / topic / keywords / updated_at`
- 不動 Phaser canvas、不動 server
- 預估工作量：index.html 加 ~40 行 JS + CSS

如果 GPT 認為 scaling 還沒急、可以先做任務 6 補完 Phase 2D。

---

## 8. 已完成里程碑速覽（給 GPT 對齊）

| Phase | Task | 檔案 | 狀態 |
|---|---|---|---|
| 2C | Step 2 角色資產旗標 | config.js | ✅ |
| 2C | Step 3 BootScene frame size | BootScene.js | ✅ |
| 2C | Step 4 LED overlay mode 切換 | index.html | ✅ |
| 2C | Step 5 keywords 動態渲染 | OfficeScene.js | ✅ |
| 2D | Task 1 /api/topic 500 修復 | server.py | ✅ |
| 2D | Task 2 normalize_state | server.py | ✅ |
| 2D | Task 3 LED 顯示 topic 驗證 | （視覺驗證、無檔改）| ✅ |
| 2D | Task 4 derive_keywords | server.py | ✅ |
| 2D | Task 4.5 主持人碰撞避免 | OfficeScene.js | ✅ |
| 2D | Task 6 F2 Debug Overlay | index.html | ⏳ 待做 |
| 2E | Task 5 Topic Driven Prompt | server.py | ✅ |
| 2F | Resolution/Scaling | main.js（+） | ⏳ 本報告、待決策 |

---

## 9. 待 GPT 裁決

請選擇下一步路線（🅰 / 🅱 / 任務 6 / 其他），我會嚴守一次一檔規則執行。
