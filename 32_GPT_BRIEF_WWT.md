# Phase 2F Step 5 實作報告：UI Hierarchy Pass — 熱門議題榜重製

## 目標

提升 OBS 可讀性：熱門關鍵字白板改為 TOP5 排名榜，增加行距與 panel spacing。

---

## 修改檔案

- `src/scenes/OfficeScene.js`
- `index.html`

---

## Part 1：熱門榜 TOP5 排名重製（OfficeScene.js）

### 白板標題

```diff
- '# 熱門'
+ '▸ TOP 5'
```

### `_renderKeywords` — 加排名編號 + 行距放大

```diff
+ const RANKS = ['①', '②', '③', '④', '⑤'];
  kws.forEach((kw, i) => {
    const t = this.add.text(
      this._kwBaseX,
-     this._kwBaseY + 30 + i * 17,
-     kw,
+     this._kwBaseY + 30 + i * 21,
+     `${RANKS[i] ?? ''} ${kw}`,
      {
        fontSize: '13px',
        color: KEYWORD_COLORS[i % KEYWORD_COLORS.length],
        fontFamily: 'Consolas, monospace',
      }
    ).setOrigin(0.5, 0).setDepth(28.5);
```

顯示效果：

```
▸ TOP 5
① 台積電再創新高
② AI 供應鏈
③ 升息預期
④ 外資買超
⑤ 台幣走強
```

- 彩色保留（KEYWORD_COLORS 不變）
- 行距 17 → 21px（配合排名編號加寬）
- 最多 5 筆（KEYWORD_MAX = 5 不變）

---

## Part 2：右上 Status Panel Spacing（index.html）

| 屬性 | 修改前 | 修改後 |
|---|---|---|
| `#status-panel` padding | 10px | **14px** |
| `#status-panel` line-height | 無 | **1.6** |
| `.module-status` margin-bottom | 5px | **8px** |
| `.module-output` margin-bottom | 3px | **6px** |

---

## 未修改

| 項目 | 原因 |
|---|---|
| KEYWORD_COLORS 彩虹色陣列 | 使用者確認保留彩色 |
| Bubble 字體 | Step 4 已升為 16px |
| API / mode / host movement | 禁止修改範圍 |
| BootScene.js | 不相關 |

---

## Phase 2F 完整進度

| Step | 內容 | 狀態 |
|---|---|---|
| 🅰 Step 1 | `main.js` 固定 1920×1080 + FIT | ✅ |
| 🅱 Step 2 | `OfficeScene.js` 移除 resize handler | ✅ |
| Step 3 | Host Lane Lock System | ✅ |
| Step 4 | UI Readability Pass（Monitor + ServerRack 移除 + 字體） | ✅ |
| Step 5 | UI Hierarchy Pass（TOP5 排名榜 + Panel Spacing） | ✅ |
