# Phase 2F Step 1 實作報告

## 目標

固定 WWT 專案為 1920×1080 logical canvas，避免 4K TV + Windows scaling 導致 Phaser world 座標漂移。

---

## 修改檔案

`src/main.js`（唯一修改）

---

## Diff

```diff
- width:  window.innerWidth,
- height: window.innerHeight - 52,
+ width:  1920,
+ height: 1080,

- mode: Phaser.Scale.RESIZE,
+ mode: Phaser.Scale.FIT,
```

其餘設定（`pixelArt`、`antialias`、`backgroundColor`、`autoCenter`）不動。

---

## 環境

| 項目 | 值 |
|---|---|
| 顯示器 | 4K TV 3840×2160 |
| Windows scaling | 250% |
| 邏輯視窗 | 1536×864 |
| `window.devicePixelRatio` | 2.5 |
| Browser | Edge |
| OBS Browser Source | 1920×1080 |

---

## FIT 模式行為

Phaser.Scale.FIT：canvas 保持 1920×1080 world-space，等比縮放以填滿視窗，多餘空間留黑邊（letterbox）。

4K TV + 250% → 邏輯視窗 1536×864 = 16:9 = 1920×1080 相同比例 → **scale factor 精確 0.8，無 letterbox**。

---

## LED Overlay 影響分析

`#led-overlay` 使用 CSS `26vw` 定寬，不跟隨 Phaser canvas 縮放。

```
4K TV 邏輯視窗 1536px × 16:9
Phaser LED world-space 寬：1920 × 0.26 = 499px
FIT 縮放後 CSS px：499 × 0.8 = 399px
26vw = 1536 × 0.26 = 399px  ← 恰好相等，對齊不受影響
```

只有手動拉成非 16:9 視窗時才偏移，OBS 和正常 16:9 不受影響。

---

## OBS Browser Source 影響

| 項目 | 改前 | 改後 |
|---|---|---|
| Phaser canvas 尺寸 | `window.innerWidth`（=1536 on 4K） | 固定 1920×1080 |
| OBS viewport | 1920×1080 | 1920×1080 |
| scale factor | RESIZE（無縮放概念，canvas 尺寸跑掉） | FIT = 1.0（完美 1:1）|
| pixel art 清晰度 | 受 devicePixelRatio 影響 | OBS dPR=1，1px=1px 完全銳利 |

改後 OBS 擷取完全正確，消除舊版 canvas 尺寸錯誤。

---

## 未完成（Phase 2F Step 2）

`src/scenes/OfficeScene.js` 仍有 resize handler：

```js
this.scale.on('resize', (size) => {
  this.W = size.width;   // ← 污染 world 座標
  this.H = size.height;
  this.wallH = size.height * WALL_H_RATIO;
});
```

固定 canvas 後此 handler 雖然不常觸發，但一旦觸發會把 `this.W` 設為 CSS 縮放後的值（1536），破壞所有比例座標。建議下一步移除。

---

## 實作規則（已遵守）

- 一次只修改一個檔案（`src/main.js`）
- 完成後停止，不繼續下一步
- 不重構現有架構
- 未修改 `OfficeScene.js` / CSS
