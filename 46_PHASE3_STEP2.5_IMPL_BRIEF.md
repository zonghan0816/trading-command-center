# Phase 3 Step 2.5 實作報告：TOP5 / Right Panel Alignment + Bubble Fine Tune

## 目標

TOP5 文字對齊背景右下框、Status Panel 視覺融入新背景、泡泡 X 位置最終校正。

---

## 修改檔案

- `src/scenes/OfficeScene.js`
- `index.html`

---

## Fix 1 — TOP5 Title 下移 + 整體右移

```diff
- this.add.text(wbCX, wbTopY + 14, '▸ TOP 5', ...)
+ this.add.text(wbCX + 10, wbTopY + 22, '▸ TOP 5', ...)
```

- title 往下 8px（`+14` → `+22`），更靠近框內頂部
- 整體往右 10px，對齊背景內建框

---

## Fix 2 — TOP5 Keywords 右移 + Row Spacing 縮小

```diff
- const boardLeft = this._kwBaseX - 192;
+ const boardLeft = this._kwBaseX - 178;  // 整體右移 14px

- const y = this._kwBaseY + 54 + i * 46;
+ const y = this._kwBaseY + 50 + i * 36;  // row spacing 46 → 36
```

- `boardLeft` 右移 14px，與背景框內距對齊
- row spacing `46` → `36`，避免最後一行貼底框

---

## Fix 3 — Status Panel 視覺融入新背景（index.html）

```diff
- background: rgba(20,8,2,0.92);        /* 棕黑 */
+ background: rgba(8,12,22,0.88);        /* 深藍黑，接近新棚景 */

- border: 1px solid rgba(255,107,53,0.25);
+ border: 1px solid rgba(255,107,53,0.18);  /* 橘色邊框降亮 */

- color: #D8EEFB;
+ color: #C8DDF0;                         /* 文字略降亮 */

- .panel-title color: #FF6B35;
+ .panel-title color: #CC6428;            /* panel 標題橘色降飽和 */
```

目標：讓 panel 像新背景的一部分，不像浮在外面的 debug box。

---

## Fix 4 — Bubble X 位置最終校正

### 問題溯源

| 版本 | 公式 | 小美 bCX | 問題 |
|---|---|---|---|
| Step 2.4 | `min(1460, charX + 250)` | 1460 | 泡泡左緣 (1260) 進入角色身體 |
| Step 2.5 嘗試 | `charX + charWidth/2 + bW/2 + 5` | 1659 | 泡泡太遠（sprite 寬 ≠ 角色可見寬）|
| **Step 2.5 最終** | `charX + charWidth/3 + bW/2` | **1602** | 視覺上剛好貼近頭部旁 ✓ |

### 根因說明

v2 PNG 是 1024×1536，角色圖在圖片中的可見寬度遠小於 sprite 全寬（287px）。若用 `charWidth/2` 當邊緣，泡泡視覺上離角色過遠。改用 `charWidth/3` 作偏移比例，符合實際視覺距離。

### 最終公式

```js
const charWidth = isV2
  ? Math.round(1024 * (S.characterV2 ?? 0.28))  // ≈ 287px
  : Math.round(48 * S.character);

let bCX = (id === 'aming')
  ? Math.max(40 + bW / 2, charX - charWidth / 3 - bW / 2)   // 阿明左側，bCX ≈ 376
  : Math.min(1880 - bW / 2, charX + charWidth / 3 + bW / 2); // 小美右側，bCX ≈ 1602
```

| 角色 | bCX | 泡泡範圍 |
|---|---|---|
| 阿明（charX=672） | ≈ 376 | x=176 ~ 576 |
| 小美（charX=1602） | ≈ 1602 | x=1402 ~ 1802 |

---

## 未修改

- 角色位置 / scale、LED overlay、背景圖
- dialogue bubble chunking、TOP5 邏輯
- API routes、state schema、mode system、Phaser config
