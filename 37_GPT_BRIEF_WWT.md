# Phase 2G.1 實作報告：Runtime Hardening Cleanup

## 目標

移除潛在 dead code TypeError、加強 API 失敗防護、修正 state undefined 輸出。  
不改美術、不改 mode system、不改 API schema。

---

## 修改檔案

`src/scenes/OfficeScene.js`（唯一修改）

---

## Fix 1 — 移除 `_buildAgentStation()` 死碼

### 根因

```js
// STATIONS 只有 aming / xiaomei，無 agent
const STATIONS = {
  aming:   { desk: 'desk', mon: 'monitor', label: '🎙 阿明哥' },
  xiaomei: { desk: 'desk', mon: 'monitor', label: '🎙 小美姐' },
};

// _buildAgentStation() 第 220 行：
this.add.text(x, y - 68, STATIONS.agent.label, ...);
//                        ^^^^^^^^^^^^^^^^ → TypeError: Cannot read properties of undefined
```

`_buildAgentStation()` 從未在 `create()` 中被呼叫，但若日後意外被引用會立即炸掉。

### 處置

整個方法移除（38 行）。畫面完全不受影響。

---

## Fix 2 — API Fail Fallback 加強

### 修改前

```js
async _pollState() {
  try {
    const res = await fetch('http://localhost:8765/api/state');
    if (res.ok) { this._applyState(await res.json()); return; }
  } catch (_) {}   // 靜默吞錯，無任何提示
  this._usingRealAPI = false;
}
```

### 修改後

```js
async _pollState() {
  try {
    const res = await fetch('http://localhost:8765/api/state');
    if (res.ok) { this._usingRealAPI = true; this._applyState(await res.json()); return; }
    console.warn('[WWT] /api/state 回應非 OK:', res.status);
  } catch (e) {
    console.warn('[WWT] /api/state 連線失敗，保留上一次 state:', e.message);
  }
  this._usingRealAPI = false;
  // 失敗時保留 this.state（不清空），畫面維持上一次內容
}
```

| 行為 | 修改前 | 修改後 |
|---|---|---|
| API 失敗時 | 靜默，`this.state` 不更新 | **console.warn 可見** |
| 畫面 | 保留（不更新） | 保留（不更新）✓ |
| LED | 由 index.html 獨立 poll，不受影響 | 同左 ✓ |
| Bubble | 不噴錯（僅在 `_animateTyping` 觸發時才渲染） | 同左 ✓ |

---

## Fix 3 — State Reset Safety（`_updateHTMLPanel`）

### 問題

`data.hosts` 的 `mod` 值若為 null 會在讀取 `mod.status` 時 TypeError。

### 修改前

```js
const hostLines = Object.entries(data.hosts || {}).map(([id, mod]) => `
  <div class="status-dot ${mod.status}"></div>
  <div class="module-output">${mod.last_output ? mod.last_output.slice(0, 45) : '—'}</div>
`).join('');
```

### 修改後

```js
const hostLines = Object.entries(data.hosts || {}).map(([id, mod]) => {
  if (!mod) return '';                                    // null guard
  const status = mod.status || 'idle';                   // undefined → 'idle'
  const output = mod.last_output ? String(mod.last_output).slice(0, 45) : '—';  // 強制字串
  return `
    <div class="status-dot ${status}"></div>
    <div class="module-output">${output}</div>
  `;
}).join('');
```

### 其他 Fix 3 項目（已確認已安全）

| 項目 | 狀態 | 說明 |
|---|---|---|
| topic fallback | ✅ 已有 | `data.topic ? ... : ''` |
| keywords fallback | ✅ 已有 | `_renderKeywords` 使用 DEFAULT_KEYWORDS（5 筆） |
| updated_at fallback | ✅ 已有 | `data.updated_at \|\| '—'` |
| mode fallback | ✅ 已有 | `modeMap[data.mode] \|\| data.mode \|\| '—'` |
| 頁面重整後 state | ✅ 已有 | 伺服器從 `wwt_state.json` 讀取，持久化 |

---

## 未修改

- 美術、sprites、desk、background、LED style、TOP5 layout
- mode system、API schema、Phaser config
- `server.py`（不需要修改）

---

## Phase 2G 完整進度

| Step | 內容 | 狀態 |
|---|---|---|
| Phase 2G | End-to-End Runtime 驗證（10 項全通過） | ✅ |
| Phase 2G.1 | Runtime Hardening Cleanup | ✅ |
