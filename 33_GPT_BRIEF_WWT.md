# Phase 2F Step 5.1 實作報告：UI Hierarchy Polish Pass

## 目標

提升 OBS 可讀性，建立清晰視覺焦點層級：
**LED → 主持人 + Bubble → TOP5 → Header / Status Panel**

---

## 修改檔案

- `src/scenes/OfficeScene.js`
- `index.html`

---

## Part 1 — TOP5 Board 真正放大

### 白板尺寸

```diff
- .setScale(CONFIG.scale.whiteboard)          // 124×108 × 1.1 ≈ 136×119
+ .setDisplaySize(272, 214)                   // 約 2x 寬、1.8x 高
```

### TOP5 標題

```diff
- fontSize: '13px', color: '#FF6B35'          // 無 glow
+ fontSize: '17px', color: '#FF6B35'
+ shadow: { blur: 8, color: '#FF6B35', fill: true }  // 微 glow
```

### `_renderKeywords` — 雙物件排版

每列拆成兩個 text 物件，分別設色：

```js
// 排名數 — 橘色 + 微 glow
rn = this.add.text(boardLeft, y, '①', {
  fontSize: '16px', color: '#FF6B35',
  shadow: { blur: 5, color: '#FF6B35', fill: true },
});

// 關鍵字 — 白色
kt = this.add.text(boardLeft + 26, y, kw, {
  fontSize: '16px', color: '#E8F4FF',
});
```

| 屬性 | 修改前 | 修改後 |
|---|---|---|
| 字體大小 | 13px | **16px** |
| 排名編號色 | KEYWORD_COLORS 彩虹 | **橘 #FF6B35** |
| 關鍵字文字色 | KEYWORD_COLORS 彩虹 | **白 #E8F4FF** |
| 行距 | i × 21 | **i × 28** |
| 起始 Y offset | 30 | **42** |
| 文字對齊 | 置中 | **左對齊（boardLeft）** |

---

## Part 2 — Bubble Readability Pass

主持人 + agent 兩處均修改：

| 屬性 | 修改前 | 修改後 |
|---|---|---|
| fontSize | 16px | **18px** |
| lineSpacing | 無 | **7** |
| wordWrap width | 170 | **210** |

---

## Part 3 — Status Panel Hierarchy（`_updateHTMLPanel`）

### 話題列（最高層級）

```diff
- font-size 預設、color: #FF8C55
+ font-size: 15px; font-weight: bold; color: #FF8C55; line-height: 1.4
```

### 主持人名稱（色彩區分）

| 角色 | 修改前 | 修改後 |
|---|---|---|
| 阿明哥 | `#A8C0D8`（統一色） | **`#FF8C00`（橘）** |
| 小美姐 | `#A8C0D8`（統一色） | **`#00E5FF`（青）** |

### mode 列（降低權重）

```diff
- 無特殊樣式
+ font-size: 11px; opacity: 0.65; margin-bottom: 10px
```

---

## Part 4 — Header Hierarchy（index.html）

| 元件 | 修改前 | 修改後 |
|---|---|---|
| `.title` font-size | 18px | **21px** |
| `.title` letter-spacing | 3px | **4px** |
| `.subtitle` opacity | 無 | **0.7** |

---

## 視覺焦點層級（完成後）

| 層級 | 元件 | 特徵 |
|---|---|---|
| 第一 | LED 中央螢幕 | 最大、最亮 |
| 第二 | 主持人 + Bubble | 18px + lineSpacing |
| 第三 | TOP5 熱門榜 | 放大 2x、橘/白排版 |
| 第四 | Header / Status Panel | title 21px、mode 降亮 |

---

## 未修改

| 項目 | 原因 |
|---|---|
| KEYWORD_COLORS 常數 | 保留供未來使用，`_renderKeywords` 改為直接指定橘/白色 |
| BootScene.js | whiteboard texture 保留，只改場景中 setDisplaySize |
| LED overlay | 已使用 vw，自動縮放，無需調整 |
| API / mode / host movement | 禁止範圍 |

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
