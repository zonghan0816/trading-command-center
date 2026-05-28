# Phase 2F Step 5.3 實作報告：Remove Debug Colors + Bubble Placement Fix

## 目標

修正 Step 5.2 未完成的問題：TOP5 彩色列框根治 + Bubble 位置再往上。

---

## 修改檔案

`src/scenes/OfficeScene.js`（唯一修改）

---

## Fix 1 — TOP5 Remove Debug Colors

### 根因分析

彩色列框不在 `_renderKeywords`，而是**烘焙在 whiteboard texture 本身**：

```js
// BootScene.js _makeWhiteboard()（不修改）
const tagColors = [0xFF6B35, 0x00E5FF, 0x00E676, 0xFFB300, 0xBB86FC];
tagColors.forEach((col, i) => {
  g.fillStyle(col, 0.9);   g.fillRect(8, ty, 3, 9);      // 彩色左邊框
  g.fillStyle(col, 0.08);  g.fillRect(11, ty, W-23, 9);  // 彩色底色
  g.lineStyle(1, col, 0.25); g.strokeRect(11, ty, W-23, 9); // 彩色外框
});
```

texture 被 `setDisplaySize(408, 321)` 放大後，五色列框放大顯示 → debug 感來源。

### 解法：OfficeScene.js 換用 `graphics` 直接繪製純色面板

```diff
- this.add.image(wbCX, wbTopY, 'whiteboard')
-   .setOrigin(0.5, 0).setDisplaySize(408, 321).setDepth(28);

+ const brd = this.add.graphics().setDepth(28);
+ brd.fillStyle(0x060d1e, 0.97);                          // 深色底
+ brd.fillRect(wbCX - 204, wbTopY, 408, 321);
+ brd.lineStyle(2, 0xFF6B35, 0.75);                       // 橘色外框
+ brd.strokeRect(wbCX - 204, wbTopY, 408, 321);
+ brd.lineStyle(1, 0xFF6B35, 0.35);                       // 標題分隔線
+ brd.lineBetween(wbCX - 200, wbTopY + 44, wbCX + 200, wbTopY + 44);
```

`BootScene.js` 的 `_makeWhiteboard()` 保留不動（texture 仍生成但不渲染）。

### TOP5 最終樣式

| 元素 | 樣式 |
|---|---|
| board 背景 | `#060d1e` 深色，opacity 0.97 |
| board 外框 | 橘色 `#FF6B35`，2px，opacity 0.75 |
| 標題分隔線 | 橘色，1px，opacity 0.35 |
| title `▸ TOP 5` | 橘色，18px，orange glow |
| 排名數 ①②③④⑤ | 橘色，17px，第一名有 glow |
| topic 文字 | 白色 `#E8F4FF`，17px |

---

## Fix 2 — Bubble Placement（再往上 35px）

主持人（aming / xiaomei）+ agent 三處均修改：

| 屬性 | Step 5.2 | Step 5.3 |
|---|---|---|
| bubbleBg bottom Y（主持人） | `charY - 82` | **`charY - 117`**（再上 35px） |
| bubbleText Y（主持人） | `charY - 105` | **`charY - 140`** |
| bubbleBg bottom Y（agent） | `y - 92` | **`y - 127`** |
| bubbleText Y（agent） | `y - 115` | **`y - 150`** |
| bubble_bg 尺寸 | 原始 185×46 | **`setDisplaySize(290, 54)`**（配合 wrap 加寬） |
| wordWrap width | 240 | **270** |
| fontSize | 20px | 20px（不變） |
| lineSpacing | 8 | 8（不變） |

---

## 未修改

| 項目 | 原因 |
|---|---|
| `BootScene.js` | spec 禁止；whiteboard texture 保留但不渲染 |
| `index.html` | spec 禁止 |
| API / mode / LED / host movement | 禁止範圍 |

---

## Phase 2F 完整進度

| Step | 內容 | 狀態 |
|---|---|---|
| Step 1 | `main.js` 固定 1920×1080 + FIT | ✅ |
| Step 2 | `OfficeScene.js` 移除 resize handler | ✅ |
| Step 3 | Host Lane Lock System | ✅ |
| Step 4 | UI Readability Pass（Monitor + ServerRack 移除 + 字體） | ✅ |
| Step 5 | UI Hierarchy Pass（TOP5 排名榜 + Panel Spacing） | ✅ |
| Step 5.1 | UI Hierarchy Polish Pass（Board 放大 + Bubble + Header） | ✅ |
| Step 5.2 | TOP5 + Bubble Final Readability Fix | ✅ |
| Step 5.3 | Remove Debug Colors + Bubble Placement Fix | ✅ |
