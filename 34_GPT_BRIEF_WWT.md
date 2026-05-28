# Phase 2F Step 5.2 實作報告：TOP5 + Bubble Final Readability Fix

## 目標

修正畫面可讀性問題，不新增功能，不重構。

---

## 修改檔案

`src/scenes/OfficeScene.js`（唯一修改）

---

## Fix 1 — TOP5 Board ×1.5 放大

### 尺寸

```diff
- .setDisplaySize(272, 214)
+ .setDisplaySize(408, 321)     // ×1.5（Step 5.1 基礎再放大）
```

### 位置修正（避免超出右緣）

```diff
- const wbCX = W * wbX + wbOff.x      // W*0.94 = 1805 → 右緣超出 1920
+ const wbCX = W - 214 + wbOff.x      // 右緣 = 1920-10 = 1910，留 10px 邊距
```

### `_renderKeywords` 排版調整

| 屬性 | Step 5.1 | Step 5.2 |
|---|---|---|
| boardLeft offset | `kwBaseX - 124` | `kwBaseX - 192`（配合 408px 板寬） |
| 起始 Y | `kwBaseY + 42` | `kwBaseY + 54` |
| 行距 | `i × 28` | `i × 46`（真正不擠） |
| 字體 | 16px | **17px** |
| 第一名 glow | ① 所有排名都有 | **只有第一名有 orange glow** |

顯示效果：

```
▸ TOP 5
① 台積電再創新高   ← orange glow
② AI 供應鏈
③ 升息預期
④ 外資買超
⑤ 台幣走強
```

---

## Fix 2 — Bubble Readability

主持人（aming / xiaomei）+ agent 三處均修改：

| 屬性 | Step 5.1 | Step 5.2 |
|---|---|---|
| fontSize | 18px | **20px** |
| lineSpacing | 7 | **8** |
| wordWrap width | 210 | **240** |
| bubble_bg bottom Y（主持人） | `charY - 52` | **`charY - 82`**（往上 30px） |
| bubbleText Y（主持人） | `charY - 83` | **`charY - 105`**（置於 bubble 中心） |
| bubble_bg bottom Y（agent） | `y - 68` | **`y - 92`** |
| bubbleText Y（agent） | `y - 99` | **`y - 115`** |

---

## Fix 3 — Host Name Label 降飽和度

| 角色 | 修改前 | 修改後 |
|---|---|---|
| 主持人（aming / xiaomei） | `#FF8C55` + stroke 2px | **`#AA7850`，無 stroke** |
| agent | `#8aabb8` + stroke 2px | **`#6a8a9a`，無 stroke** |

stroke 是視覺重量主要來源（非 glow），移除後 label 降至第四焦點層。

---

## 未修改

- `index.html`（spec 禁止）
- API / mode system / host movement / camera / LED logic / state schema（禁止）
- `BootScene.js`（bubble_bg texture 保留，opacity 已 0.96）

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
