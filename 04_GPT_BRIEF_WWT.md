# WWT index.html 修改簡報

## 目前進度

已完成：
- server.py ✅
- config.js ✅
- BootScene.js ✅
- OfficeScene.js ✅

下一步：
- index.html

---

## 現有 index.html 結構

```html
<title>AI Trading Command Center</title>

<!-- header -->
<div id="header">
  <div class="title">◆ AI TRADING COMMAND CENTER</div>
  <div class="subtitle">TAIWAN STOCK MARKET — REAL-TIME</div>
  <div class="live" id="live-status">LIVE</div>
</div>

<!-- 右上角狀態面板 -->
<div id="status-panel">
  <div class="panel-title">Module Status</div>
  <div id="module-list"></div>
  <div id="update-time">— 等待資料 —</div>
</div>

<!-- 左下角持倉損益面板（現在用不到，可移除或保留空著）-->
<div id="portfolio-panel">...</div>
```

現有主題色：`#00E5FF`（青藍）

現有 status dot CSS：
```css
.status-dot.idle    { background: #3a5068; }
.status-dot.running { background: #FFB300; animation: blink 0.8s infinite; }
.status-dot.done    { background: #00E676; }
.status-dot.live    { background: #00E5FF; animation: blink 1.2s infinite; }
.status-dot.thinking{ background: #BB86FC; animation: blink 1s infinite; }
```

---

## 需要改動的項目

### 1. `<title>`
```
AI Trading Command Center → 晚晚嘴台灣 WWT
```

### 2. Header 主題色
- 原本：`#00E5FF`（青藍）
- 改為：`#FF6B35`（橘紅）
- border-bottom、text-shadow、letter-spacing 保留

### 3. Header 文字
```
◆ AI TRADING COMMAND CENTER → ◆ 晚晚嘴台灣 WWT
TAIWAN STOCK MARKET — REAL-TIME → AI 鄉民談話台 · Taiwan Tonight
```

### 4. 右上角面板（status-panel）
- panel-title：`Module Status` → `今日話題`
- 移除舊 `.module-status` / `.module-output` 樣式嗎？不用，OfficeScene._updateHTMLPanel() 還在用
- 保留 `#module-list` 和 `#update-time`

### 5. Status dot 新增 WWT 狀態
新的 status 值：`talking` / `reacting` / `researching` / `coffee_break` / `meeting` / `walking`

建議顏色：
```css
.status-dot.talking      { background: #FF6B35; animation: blink 0.8s infinite; }
.status-dot.reacting     { background: #FFB300; animation: blink 0.8s infinite; }
.status-dot.researching  { background: #00E5FF; animation: blink 1s infinite; }
.status-dot.coffee_break { background: #A0C878; }
.status-dot.meeting      { background: #BB86FC; }
.status-dot.walking      { background: #80DEEA; animation: blink 1.2s infinite; }
```

### 6. portfolio-panel
WWT 不需要持倉面板，可以：
- 設 `display: none` 或直接移除 HTML（CSS 可保留不動）

---

## 技術架構（保留不變）

- Phaser.js canvas 在 `#game-container` 裡
- `#status-panel` 是 HTML overlay（absolute 定位，pointer-events: none）
- OfficeScene._updateHTMLPanel() 動態寫入 `#module-list`
- 不需要改 JS，只改 HTML + CSS

---

## 規則

1. 只修改 index.html
2. 不修改 server.py / config.js / BootScene.js / OfficeScene.js
3. 保留 Phaser canvas 結構
4. 保留 #module-list 和 #update-time（OfficeScene 會寫入）
5. 完成後列出修改摘要
