# Phase 2F Step 4 實作報告：UI Readability Pass — 移除彩色 Monitor

## 目標

提升 WWT 畫面可讀性與直播質感，移除右側無語意的彩色條狀 monitor。

---

## 修改檔案

`src/scenes/OfficeScene.js`（唯一修改）

---

## 根因分析

### 彩色 Monitor 來源

| 元件 | 位置 |
|---|---|
| Texture 生成 | `src/scenes/BootScene.js` → `_makeMonitor()` |
| 場景渲染 | `src/scenes/OfficeScene.js` → `_buildWorkstations()` |

`_makeMonitor()` 生成一個 44×40 的 K 線圖紋理（彩色條狀），
`_buildWorkstations()` 在每個工作站的 `st.mon` 屬性存在時，將其放置於桌面上方。

### 問題

- 無語意，像 placeholder decoration
- 分散 LED 與主持人視覺焦點
- 不像真正新聞台 UI
- OBS 直播下可讀性低

---

## Diff

### 移除 `_buildWorkstations` 中的 monitor 渲染區塊

```diff
  // 桌子
  this.add.image(baseX + stOff.x, deskY + stOff.y, 'desk')
    .setOrigin(0.5, 1).setDepth(depth + 1).setScale(S.desk);

- // 螢幕
- if (st.mon) {
-   this.add.image(baseX, deskY - 2, st.mon)
-     .setOrigin(0.5, 1).setDepth(depth + 1.5).setScale(S.monitor, S.monitor);
- }

  // 椅子
```

---

## 未修改

| 檔案 | 原因 |
|---|---|
| `src/scenes/BootScene.js` | `_makeMonitor()` texture 生成保留（只是不渲染，不影響效能） |
| `index.html` | 不相關 |
| `src/config.js` | 不相關 |

---

## 預期效果

| 項目 | 結果 |
|---|---|
| 畫面乾淨度 | ✅ 提升 |
| LED 視覺焦點 | ✅ 更突出 |
| 新聞台感 | ✅ 更強 |
| Prototype 感 | ✅ 降低 |
| OBS framing | ✅ 更集中 |

---

## Phase 2F 完整進度

| Step | 內容 | 狀態 |
|---|---|---|
| 🅰 Step 1 | `main.js` 固定 1920×1080 + FIT | ✅ |
| 🅱 Step 2 | `OfficeScene.js` 移除 resize handler | ✅ |
| Step 3 | Host Lane Lock System | ✅ |
| Step 4 | UI Readability Pass — 移除彩色 Monitor | ✅ |

---

## 實作規則（已遵守）

- 一次只修改一個檔案（`src/scenes/OfficeScene.js`）
- 未重構 UI 系統、API、mode system、角色動畫、Phaser camera
- 未修改 `BootScene.js` / `index.html` / `config.js`
