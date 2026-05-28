# Phase 2D Task 6 實作報告：F2 Debug Overlay

## 目標

新增開發專用 Debug Overlay，F2 切換顯示 / 隱藏，顯示目前 WWT state 與 canvas 設定。

---

## 修改檔案

`index.html`（唯一修改）

---

## Diff

### CSS（新增於 `#led-overlay` 之前）

```diff
+   /* ── F2 Debug Overlay ── */
+   #debug-overlay {
+     position: absolute;
+     top: 10px;
+     right: 10px;
+     width: 230px;
+     background: rgba(0, 8, 4, 0.95);
+     border: 1px solid rgba(0, 229, 100, 0.45);
+     border-radius: 3px;
+     padding: 10px 12px;
+     color: #00E676;
+     font-family: 'Consolas', 'Courier New', monospace;
+     font-size: 11px;
+     line-height: 1.75;
+     z-index: 999;
+     pointer-events: none;
+     display: none;
+   }
+   #debug-overlay .dbg-title {
+     color: #00E5FF;
+     font-size: 10px;
+     letter-spacing: 3px;
+     border-bottom: 1px solid rgba(0, 229, 100, 0.25);
+     padding-bottom: 5px;
+     margin-bottom: 7px;
+   }
+   #debug-overlay .dbg-row { color: #6E8AA8; }
+   #debug-overlay .dbg-val { color: #00E676; }
```

### HTML（新增於 `#portfolio-panel` 之前）

```diff
+   <div id="debug-overlay">
+     <div class="dbg-title">▸ DEBUG  [F2 to hide]</div>
+     <div id="dbg-content"></div>
+   </div>
```

### JavaScript（新增 IIFE，於 `</body>` 之前）

```js
(function debugOverlay() {
  const panel   = document.getElementById('debug-overlay');
  const content = document.getElementById('dbg-content');
  let visible = false;
  let cached  = null;

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'F2') return;
    e.preventDefault();                          // 避免瀏覽器預設行為
    visible = !visible;
    panel.style.display = visible ? 'block' : 'none';
    if (visible) render();
  });

  function render() {
    if (!cached) {
      content.innerHTML = '<span style="color:#3a5068">— waiting —</span>';
      return;
    }
    const kws = Array.isArray(cached.keywords) && cached.keywords.length > 0
      ? cached.keywords.join(', ')
      : (cached.keywords ? String(cached.keywords) : '—');
    const rows = [
      ['mode',        cached.mode        || '—'],
      ['topic',       cached.topic       || '(none)'],
      ['keywords',    kws],
      ['last_update', cached.updated_at  || '—'],
      ['resolution',  '1920×1080'],
      ['scale',       'FIT'],
    ];
    content.innerHTML = rows.map(([k, v]) =>
      `<div><span class="dbg-row">${k}: </span><span class="dbg-val">${v}</span></div>`
    ).join('');
  }

  async function poll() {
    try {
      const r = await fetch('/api/state');
      if (r.ok) {
        cached = await r.json();
        if (visible) render();
      }
    } catch (_) {}   // fetch 失敗靜默略過，不 crash
  }
  poll();
  setInterval(poll, 3000);
})();
```

---

## 顯示範例

```
▸ DEBUG  [F2 to hide]
─────────────────────────────
mode:        discussion
topic:       油價凍漲
keywords:    油價, 中油, 通膨
last_update: 2026-05-28 10:39
resolution:  1920×1080
scale:       FIT
```

---

## 為什麼不影響 OBS

| 機制 | 說明 |
|---|---|
| `display: none`（預設） | 頁面載入時 overlay 不存在於 render tree，OBS 擷取時不可見 |
| OBS 無鍵盤事件 | OBS headless Chromium 不產生 keydown，F2 永遠不觸發 |
| `pointer-events: none` | 不攔截 Phaser canvas 滑鼠互動 |
| `z-index: 999` | 高於 Phaser canvas，但僅在開發者手動 F2 後才顯示 |

---

## 為什麼放 index.html 而不是 Phaser scene

| 考量 | 說明 |
|---|---|
| 固定位置 | overlay 需固定在 viewport 右上角，不跟著 FIT canvas 縮放（0.8× 後座標會錯） |
| DOM 層級 | Phaser scene 只能繪製 canvas 內部；HTML overlay 需要浮在 canvas 外層 |
| 資料來源 | 直接 fetch `/api/state`，不需要穿越 Phaser scene 取值 |
| 不污染 game logic | 純 HTML/CSS/JS IIFE，與 Phaser scene 完全隔離 |

---

## 邊界處理

| 情況 | 行為 |
|---|---|
| `keywords` 不存在或空陣列 | 顯示 `—` |
| `topic` 為空字串 | 顯示 `(none)` |
| fetch 失敗（server 未啟動） | `catch (_) {}` 靜默略過，3 秒後再試 |
| F2 按下 | `e.preventDefault()` 阻擋瀏覽器預設行為（部分瀏覽器 F2 開啟重新命名） |
| `cached` 尚未填入 | 顯示 `— waiting —` |

---

## 實作規則（已遵守）

- 一次只修改一個檔案（`index.html`）
- 完成後停止，不繼續下一步
- 不重構現有架構
- 未修改 `server.py` / `OfficeScene.js` / Phaser scene / CSS 其他部分
