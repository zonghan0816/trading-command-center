# Phase 2C Step 4 完成報告

## 修改檔案

| 檔案 | 動作 |
|---|---|
| `index.html` | **3 處修改**：(1) `#led-overlay` 加 transition + `.fading` class；(2) 加 `#led-mode-badge.working` / `.coffee` 樣式；(3) JS 重寫為 `MODE_VIEWS` dict + 淡入淡出 |

其他檔案 0 動：
- `src/config.js` ✅ 未動
- `src/scenes/BootScene.js` ✅ 未動
- `src/scenes/OfficeScene.js` ✅ 未動
- `server.py` ✅ 未動

---

## 1. mode 切換邏輯

### MODE_VIEWS dict（依 GPT 指令）

| mode | label | text | badge | badgeClass |
|---|---|---|---|---|
| `idle` | ◆ WWT Taiwan Tonight | 晚晚嘴台灣 | STANDBY | （無 class、灰色預設）|
| `discussion` | 📌 今日話題 | **{topic}**（從 state.topic 動態取）| ON AIR | `discussing`（橘色發光）|
| `working` | ⚙ 後台準備中 | 準備下一話題 | WORKING | `working`（琥珀色）|
| `coffee` | ☕ 休息片刻 | 茶水間閒聊 | COFFEE BREAK | `coffee`（棕褐色）|

### 切換時機

每 3 秒 poll `/api/state`、偵測 `mode` 或 `topic` 有變化才觸發切換。

### 防抖邏輯

```js
if (mode === lastMode && topic === lastTopic) return;
```

沒變就不重畫、避免每 3 秒閃爍。

### 首次載入處理

```js
if (lastMode === null) {
  applyView(mode, topic);   // 直接套用、不淡出
} else {
  // 淡出 → swap → 淡入
}
```

第一次載入 mode 沒「上一個狀態」、不需要淡出、直接顯示避免空畫面。

### 未知 mode 容錯

```js
const view = MODE_VIEWS[mode] || MODE_VIEWS.idle;
```

server 回傳奇怪的 mode 字串 → fallback 顯示 idle 樣式、不會空白或閃爍。

---

## 2. topic 來源

### 資料路徑

```
GET /api/state
└── JSON.topic   ← 來自 wwt_state.json 的 topic 欄位
└── JSON.mode    ← 來自 wwt_state.json 的 mode 欄位
```

### 寫入路徑

```
POST /api/topic
└── body: {"topic": "台北房價創新高", "summary": "..."}
└── server.py 更新 wwt_state.json
└── 下次 poll 時 LED 自動顯示
```

### 顯示策略

- **只有 `mode === "discussion"` 時才顯示 topic**（其他 mode 用各自固定文字、不洩漏設定中的 topic）
- discussion 但 topic 為空 → 顯示 fallback「尚未設定話題」（避免空字串黑屏）

### 邊界 case

| 情境 | LED 顯示 |
|---|---|
| `mode=idle, topic=""` | 晚晚嘴台灣（不顯示 topic）|
| `mode=idle, topic="房價"` | 晚晚嘴台灣（**故意**忽略 topic、idle 時不洩漏）|
| `mode=discussion, topic=""` | 尚未設定話題 |
| `mode=discussion, topic="房價"` | 房價 |
| `mode=working, topic="任何"` | 準備下一話題 |
| `mode=coffee, topic="任何"` | 茶水間閒聊 |
| `mode=未知字串` | 退回 idle 顯示 |

---

## 3. 動畫效果

### CSS

```css
#led-overlay {
  opacity: 1;
  transition: opacity 0.35s ease;
}
#led-overlay.fading { opacity: 0; }
```

純 CSS transition、無 JS 動畫、無第三方套件。

### JS 觸發流程

```
mode/topic 變化偵測
  ↓
overlay.classList.add('fading')   ← opacity 1 → 0（350ms）
  ↓
setTimeout(() => {                  ← 等淡出完
  applyView(mode, topic)            ← swap label/text/badge 內容
  overlay.classList.remove('fading') ← opacity 0 → 1（350ms）
}, 350)
```

**總切換時間**：~700ms（350 fade out + 350 fade in），跟 GPT 要求的「簡單淡入淡出」一致。

### 動畫覆蓋範圍

整個 `#led-overlay` 一起 fade（label + text + badge 同步），視覺上是「整塊 LED 重整資訊」的感覺、不是各元素獨立飛動。符合電視 LED 切換的觀感。

---

## 4. 修改檔案

### 完整 diff 摘要

#### CSS 變化（line 157-211 區段）

```diff
   #led-overlay {
     ... 既有屬性 ...
     z-index: 10;
+    opacity: 1;
+    transition: opacity 0.35s ease;
   }
+  #led-overlay.fading { opacity: 0; }

   #led-mode-badge.discussing {
     ...（既有）
   }
+  #led-mode-badge.working {
+    color: #FFB300;
+    border-color: rgba(255,179,0,0.55);
+    text-shadow: 0 0 8px rgba(255,179,0,0.65);
+    background: rgba(30, 22, 2, 0.85);
+  }
+  #led-mode-badge.coffee {
+    color: #C8A07A;
+    border-color: rgba(200,160,122,0.55);
+    text-shadow: 0 0 8px rgba(200,160,122,0.5);
+    background: rgba(24, 18, 12, 0.85);
+  }
```

#### JS 變化（line 242-264 區段）

```diff
   (function ledOverlay() {
+    const overlay = document.getElementById('led-overlay');
     const label   = document.getElementById('led-topic-label');
     const text    = document.getElementById('led-topic-text');
     const badge   = document.getElementById('led-mode-badge');
-    const MODE_LABELS = { idle: 'STANDBY', discussion: 'ON AIR', casual: 'CHAT' };
+
+    const MODE_VIEWS = {
+      idle:       { label: '◆ WWT  Taiwan Tonight', text: '晚晚嘴台灣',   badge: 'STANDBY',      badgeClass: '' },
+      discussion: { label: '📌 今日話題',             text: null,           badge: 'ON AIR',       badgeClass: 'discussing' },
+      working:    { label: '⚙ 後台準備中',            text: '準備下一話題',  badge: 'WORKING',      badgeClass: 'working' },
+      coffee:     { label: '☕ 休息片刻',               text: '茶水間閒聊',   badge: 'COFFEE BREAK', badgeClass: 'coffee' },
+    };
+
+    let lastMode = null, lastTopic = null;
+
+    function applyView(mode, topic) {
+      const view = MODE_VIEWS[mode] || MODE_VIEWS.idle;
+      label.textContent = view.label;
+      text.textContent  = mode === 'discussion' ? (topic || '尚未設定話題') : view.text;
+      badge.textContent = view.badge;
+      badge.className   = 'led-mode-badge ' + view.badgeClass;
+    }

     async function poll() {
       try {
         const r = await fetch('/api/state');
         const d = await r.json();
-        const topic = d.topic || '';
         const mode  = d.mode  || 'idle';
-        text.textContent  = topic || '晚晚嘴台灣';
-        badge.textContent = MODE_LABELS[mode] || mode.toUpperCase();
-        badge.className   = mode === 'discussion' ? 'led-mode-badge discussing' : 'led-mode-badge';
-        label.textContent = topic ? '📌 今日話題' : '◆ WWT  Taiwan Tonight';
+        const topic = d.topic || '';
+        if (mode === lastMode && topic === lastTopic) return;
+
+        if (lastMode === null) {
+          applyView(mode, topic);
+        } else {
+          overlay.classList.add('fading');
+          setTimeout(() => {
+            applyView(mode, topic);
+            overlay.classList.remove('fading');
+          }, 350);
+        }
+        lastMode  = mode;
+        lastTopic = topic;
       } catch (_) {}
     }
     poll();
     setInterval(poll, 3000);
   })();
```

---

## 驗證清單（給使用者測試用）

開瀏覽器 Ctrl+F5 後測試：

```bash
# 1. 預設 idle 應顯示「晚晚嘴台灣 / STANDBY」
curl http://localhost:8765/api/state

# 2. 切 discussion + 設 topic
curl -X POST http://localhost:8765/api/topic \
  -H "Content-Type: application/json" \
  -d '{"topic":"台北房價創新高","summary":"信義區突破180萬"}'
# → LED 應淡入「📌 今日話題 / 台北房價創新高 / ON AIR」

# 3. 切 working（如果 server.py 有 /api/mode endpoint、或直接改 wwt_state.json）
# → LED 應淡入「⚙ 後台準備中 / 準備下一話題 / WORKING」

# 4. 切 coffee
# → LED 應淡入「☕ 休息片刻 / 茶水間閒聊 / COFFEE BREAK」
```

### 視覺確認點

- [ ] mode 切換時可看到「整塊 LED 淡出 → 換內容 → 淡入」流暢過渡
- [ ] mode 不變時沒有閃爍（防抖邏輯 work）
- [ ] discussion 時 badge 變橘色「ON AIR」
- [ ] working 時 badge 變琥珀色「WORKING」
- [ ] coffee 時 badge 變棕褐色「COFFEE BREAK」
- [ ] idle 時 badge 是灰色「STANDBY」
- [ ] 未知 mode 字串退回 idle 顯示、不顯示亂碼

---

## Git Commit 建議

```
feat(index): Phase 2C Step 4 — LED 依 mode 顯示 + 淡入淡出

依 GPT 指令支援 4 個 mode：
- idle:       晚晚嘴台灣 / STANDBY
- discussion: 今日話題 / {topic} / ON AIR
- working:    準備下一話題 / WORKING
- coffee:     茶水間閒聊 / COFFEE BREAK

CSS:
- #led-overlay 加 transition: opacity 0.35s ease
- 新增 .working / .coffee badge 樣式

JS:
- MODE_VIEWS dict 集中 4 個 mode 的顯示模板
- lastMode/lastTopic 防抖：沒變不重畫
- 首次載入不淡出、之後切換才 fade out → swap → fade in
- 未知 mode 退回 idle 顯示

只動 index.html、未動 config / BootScene / OfficeScene / server.py
```
