# Phase 2C 角色 Sprite 規劃報告

## 現況

阿明哥 / 小美姐 目前為 BootScene.js **程序生成**色塊角色。
`config.js` 中 `customAssets.char_aming / char_xiaomei` 皆為 `false`。

---

## 任務一：正式角色 Sprite

### 修改順序

| 步驟 | 檔案 | 動作 |
|---|---|---|
| 1 | `gen_assets.py` | 新增角色 PNG 生成函式，輸出 spritesheet |
| 2 | `BootScene.js` | 改 frameWidth/Height 48×64 + 動畫 frame 索引 |
| 3 | `config.js` | `customAssets.char_aming / char_xiaomei` → `true` |

---

### Spritesheet 格式

```
每格：48 × 64 px
幀數：4 幀
總尺寸：192 × 64 px

Frame 0 — idle   : 站立，表情平靜
Frame 1 — talk   : 嘴巴張開，微前傾
Frame 2 — react  : 眉毛上揚，驚訝/吐槽
Frame 3 — think  : 手碰下巴，思考
```

動畫對應：

```
idle     → [0]
typing   → [0, 1, 1, 0]
thinking → [2, 3]
```

---

### 阿明哥視覺規格

| 屬性 | 值 |
|---|---|
| 髮色 | 深褐 #3a2810 |
| 膚色 | 中等 #d4956a |
| 上衣 | 藍色 #2255aa，V 領 |
| 褲子 | 深灰 #2a2a3a |
| 配件 | 銀框眼鏡 |
| 體型 | 肩寬稍大，腰圍 +4px |
| Frame 0 | 右手持咖啡杯 |
| Frame 1 | 嘴張，略前傾 |
| Frame 2 | 眉高，嘴微開（驚訝） |
| Frame 3 | 左手碰下巴 |

---

### 小美姐視覺規格

| 屬性 | 值 |
|---|---|
| 髮色 | 黑 #1a1a1a，俐落短髮耳上齊 |
| 膚色 | 較亮 #e8b08a |
| 上衣 | 白 #ddeeff，冷色調 |
| 裙褲 | 深色 #1e1e2e |
| 配件 | 右手持手機/平板 |
| 體型 | 標準，稍窄肩 |
| Frame 0 | 手持手機，側身微傾 |
| Frame 1 | 嘴張，表情生動 |
| Frame 2 | 眉毛上挑，嘴角下撇（吐槽） |
| Frame 3 | 抬頭，手上舉思考 |

---

### BootScene.js 需修改的地方

目前 `customAssets: true` 路徑寫死 `frameWidth: 16, frameHeight: 32`（Pixel Agents 格式）。
需改為 `48, 64`。

動畫 frame 索引也需更新（現在用 Pixel Agents 的 0/1/2/5/6，改為 0/1/2/3）。

---

## 任務二：LED 話題顯示（規劃）

index.html JS 的 `poll()` 函式依 `mode` 決定顯示內容：

| mode | 顯示內容 |
|---|---|
| `idle` | 晚晚嘴台灣 / Taiwan Tonight |
| `discussion` | 今日話題 + {topic} + ON AIR |
| `working` | 準備下一話題 |
| `coffee` | 茶水間閒聊 |

目前 `poll()` 已有 `mode` 判斷，只需擴充 `text.textContent` 邏輯。
修改檔案：`index.html`（單一函式）。

---

## 任務三：熱門關鍵字動態化（規劃）

`/api/state` 若回傳 `keywords: ["房價", "AI", ...]` 則顯示；否則用靜態預設值。

OfficeScene.js 的 `_updateHTMLPanel` 或 `_applyState` 呼叫時更新 Phaser Text 物件。
需在 `_buildDecorations()` 建立時保留 Text 物件參照，`_applyState()` 時更新內容。

修改檔案：`OfficeScene.js`（兩處：建立時保留參照 + applyState 時更新）。

---

## 任務四：LED 淡入淡出（規劃）

index.html 目前直接 `textContent =`，改為：

```
fade out (300ms) → 更新文字 → fade in (300ms)
```

用 CSS `transition: opacity 0.3s` + JS 控制即可，不需額外套件。
修改檔案：`index.html`。

---

## 任務五：場景生活感（規劃）

在 `OfficeScene.js _buildDecorations()` 新增 4~6 個小物件（Phaser Graphics 程序生成）：

| 物件 | 位置 | 備註 |
|---|---|---|
| 咖啡杯 | 阿明哥桌面 | 小圓柱 + steam 線 |
| 手機/平板 | 小美姐桌面 | 薄矩形 |
| 小盆栽 | 舞台左角 | 複用 plant_sm |
| 收音設備/boom mic | 桌旁 | 懸臂矩形 |

修改檔案：`OfficeScene.js`（_buildDecorations 尾端新增）。

---

## 完整修改計畫

| 順序 | 檔案 | 任務 |
|---|---|---|
| 1 | `gen_assets.py` | 阿明哥 + 小美姐 spritesheet 生成 |
| 2 | `BootScene.js` | frameSize 48×64 + 動畫 frame 索引 |
| 3 | `config.js` | customAssets char_aming/xiaomei → true |
| 4 | `index.html` | LED mode 顯示邏輯 + 淡入淡出 |
| 5 | `OfficeScene.js` | 關鍵字動態化 + 場景裝飾物件 |

---

## 禁止事項確認

- API 架構 ✅ 不動
- Bubble 系統 ✅ 不動
- State 系統 ✅ 不動
- Phaser 核心架構 ✅ 不動
- server.py ✅ 不動
