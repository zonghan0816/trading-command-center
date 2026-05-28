# Phase 2F Step 4 實作報告（補充）：Server Rack 移除 + 字體放大

## 目標

1. 移除右緣 server_rack 裝飾（與已移除的 monitor 視覺效果相似，同樣影響焦點）
2. 全站 UI 字體放大，提升直播可讀性

---

## 修改檔案

- `src/scenes/OfficeScene.js`
- `index.html`

---

## Part 1：Server Rack 移除

### 根因

`_makeServerRack()`（BootScene.js）生成 72×138 的機架紋理，每排含 2 個 LED 燈（green `#00E676` / cyan `#00E5FF` / amber `#FFB300`）。  
`_buildDecorations()`（OfficeScene.js）將其放置於 `x = W - 48 = 1872`（右緣）。  
視覺上與已移除的 K 線 monitor 相似，同樣分散焦點。

### Diff（OfficeScene.js）

```diff
- const srOff = dOff.serverRack ?? { x: 0, y: 0 };

- // 伺服器機架
- this.add.image(W - 48 + srOff.x, wallH - 138 + srOff.y, 'server_rack')
-   .setOrigin(0.5, 1).setDepth(10).setScale(CONFIG.scale.serverRack);
```

> BootScene.js 的 `_makeServerRack()` 保留不動（texture 生成但不渲染）。

---

## Part 2：字體放大

### OfficeScene.js

| 元件 | 修改前 | 修改後 |
|---|---|---|
| 對話泡泡 bubbleText（主持人 + agent） | 12px，wrap 158 | **16px，wrap 170** |
| 角色標籤 label（主持人 + agent） | 11px | **14px** |
| 熱門關鍵字 `# 熱門` 標題 | 9px | **13px** |
| 熱門關鍵字各條目 | 9px，行距 13 | **13px，行距 17** |
| 招牌 line1（晚晚嘴台灣 WWT） | 18px | **24px** |
| 招牌 line2（副標） | 11px，y=54 | **14px，y=60**（避與 line1 重疊） |

### index.html

| 元件 | 修改前 | 修改後 |
|---|---|---|
| Header `.title` | 15px | **18px** |
| Header `.subtitle` / `.live` | 11px | **13px** |
| `#status-panel` 內文 | 11px | **13px** |
| `#status-panel .panel-title` | 10px | **12px** |
| `.module-output` / `#update-time` | 10px | **12px** |
| `#portfolio-panel` 內文 | 11px | **13px** |
| `#portfolio-panel .panel-title` | 10px | **12px** |
| `.port-summary .label` | 10px | **12px** |
| `.port-summary .value` | 12px | **14px** |
| `.pos-row`（持倉列） | 10px | **12px** |

---

## 未修改

| 元件 | 原因 |
|---|---|
| LED 字幕區（`#led-topic-text` 等） | 已使用 vw 單位，自動縮放 |
| F2 Debug Overlay | 開發工具，不需直播可讀性 |
| BootScene.js | 不渲染，不需改 texture 生成 |
| 角色動畫 / mode system / API | 未在 Step 4 範圍內 |

---

## Phase 2F 完整進度

| Step | 內容 | 狀態 |
|---|---|---|
| 🅰 Step 1 | `main.js` 固定 1920×1080 + FIT | ✅ |
| 🅱 Step 2 | `OfficeScene.js` 移除 resize handler | ✅ |
| Step 3 | Host Lane Lock System | ✅ |
| Step 4 | UI Readability Pass（Monitor + ServerRack 移除 + 字體） | ✅ |
