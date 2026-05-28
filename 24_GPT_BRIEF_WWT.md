# Phase 2F Resolution / Scaling 架構分析報告

## 環境

| 項目 | 值 |
|---|---|
| 顯示器 | 4K TV 3840×2160 |
| Windows scaling | 250% |
| 邏輯視窗 | 1536×864 |
| `window.devicePixelRatio` | 2.5 |
| Browser | Edge |
| 未來用途 | OBS Browser Source → 串流 |

---

## 1. Phaser Scale Mode 現況

```js
// main.js 現況
width:  window.innerWidth,       // = 1536
height: window.innerHeight - 52, // = 812
scale: { mode: Phaser.Scale.RESIZE }
```

RESIZE 模式：canvas 尺寸 = 視窗尺寸，無縮放、無 letterbox。

**問題：**
視窗 resize 時，Phaser 觸發事件，OfficeScene handler 更新 `this.W / this.H`，但所有已建立 GameObject 座標不重算 → **角色、LED、白板位置殘留在舊 W 的比例座標**。

---

## 2. devicePixelRatio 影響

Phaser 3 預設不讀 `devicePixelRatio`。

```
Phaser canvas 內部：1536×812 px
瀏覽器放大 2.5×：3840×2030 物理 px
角色 48px × scale 4 = 192px → 物理 480px
```

`pixelArt: true` 抗鋸齒，但 canvas 整體放大仍可能模糊（取決於 Edge canvas scaling）。

**OBS 無此問題**：OBS 無頭 Chromium `devicePixelRatio = 1`，1px = 1px，完全銳利。

---

## 3. CSS vw/vh 適用性

`#led-overlay` 使用 `26vw`、`left: 56.5%`、`top: 50%`。

**16:9 視窗下正好對齊（原因）：**
```
1vw = 1536 × 1% = 15.36px
Phaser LED frame = 1536 × 0.26 = 399px
LED overlay = 26vw = 399px  ← 恰好相等
```

**固定 1920×1080 + FIT 後（16:9 視窗）：**
```
scale factor = 1536/1920 = 0.8
Phaser LED CSS: 1920 × 0.26 × 0.8 = 399px
LED overlay:    26vw = 399px  ← 仍恰好相等
```

**非 16:9 視窗才有偏移。** OBS 和正常 16:9 不受影響。

---

## 4. 應改成 world-space anchor 的元素

**已正確（Phaser world-space ratio）：**
- 角色 `W * 0.28 / 0.72`
- 中央主持桌 `W * 0.5`
- 麥克風 `W * 0.36 / 0.64`
- LED image `W * 0.565`
- 白板 `W * 0.86`

**有問題（world-space 但 W 被污染）：**
- discussion 站位 `this.W * 0.35 / 0.65`：resize 後 `this.W` 更新、但 sprite 未重新定位

---

## 5. 應維持 responsive 的元素

WWT 為播出用途，**不需要 responsive**。

保留相對定位即可：
- `#status-panel`（`position: absolute; top:10; right:10`）
- `#portfolio-panel`（`position: absolute; bottom:10; left:10`）

其餘全部固定在 1920×1080 world-space。

---

## 6. OBS / Browser Source 最穩定方案

```
OBS Browser Source：1920×1080
Phaser canvas 內部：1920×1080
Scale mode：FIT（開發）/ NONE（OBS 擷取）
OBS devicePixelRatio：1（自動）
→ 1px = 1px，像素藝術完全銳利，零失真
```

---

## 7. Target Baseline Resolution

**1920×1080（FHD 16:9）**

| 理由 | 說明 |
|---|---|
| 串流標準 | YouTube / Twitch 主流輸出格式 |
| 角色比例 | 48×64 × 4scale = 192×256，佔畫高 23.7%，合理 |
| 4K TV | 瀏覽器 2× upscale，pixel art 清晰 |
| OBS 相容 | 1:1 對應，零縮放失真 |

---

## 8. 是否應固定 1920×1080 logical canvas

**是，強烈建議。**

固定後所有比例座標成為靜態常數：

| 元素 | 固定值 |
|---|---|
| `wallH` | 1080 × 0.44 = 475px |
| 阿明哥 | 1920 × 0.28 = 537px |
| 小美姐 | 1920 × 0.72 = 1382px |
| LED center | 1920 × 0.565 = 1084px |
| discussion aming | 1920 × 0.35 = 672px |
| discussion xiaomei | 1920 × 0.65 = 1248px |

---

## 9. 是否應 Letterbox

4K TV + 250% → viewport 1536×864 = **16:9 = 1920×1080 相同比例**。

→ **FIT 模式下不產生 letterbox（scale factor 精確 0.8）。**

只有使用者手動拉非 16:9 視窗時才出現，OBS 不受影響。

---

## 10. Resize Handler

**應移除。**

固定 canvas 後，game world 永遠 1920×1080。但目前 handler：
```js
this.scale.on('resize', (size) => {
  this.W = size.width;   // ← 可能被設為 CSS 縮放後的值（1536），不是 world size（1920）
  this.H = size.height;  // ← 破壞所有比例座標
  this.wallH = size.height * WALL_H_RATIO;
});
```
不移除 → `this.W` 被污染 → discussion 站位、LED 定位全部錯誤。

---

## 建議方案

### 🅰 最小改動（立即）

**只改 `main.js`，3 行：**

```js
// 改前
width:  window.innerWidth,
height: window.innerHeight - 52,
scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },

// 改後
width:  1920,
height: 1080,
scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
```

效果：OBS 擷取完全正確、LED overlay 在 16:9 下繼續對齊。

### 🅱 中期最佳（跟著做）

**再改 `OfficeScene.js`，移除 resize handler：**

```js
// 刪除整段
this.scale.on('resize', (size) => {
  this.W = size.width;
  this.H = size.height;
  this.wallH = size.height * WALL_H_RATIO;
});
```

---

## 需要修改的檔案

| 優先 | 檔案 | 原因 |
|---|---|---|
| 必要 | `src/main.js` | 固定 1920×1080 + FIT |
| 建議 | `src/scenes/OfficeScene.js` | 移除有害 resize handler |
| 選用 | `index.html` | 僅非 16:9 letterbox 才需改，觀察後決定 |

**不需改：** `server.py` / `config.js` / `BootScene.js`

---

## 風險分析

| 風險 | 機率 | 嚴重度 | 應對 |
|---|---|---|---|
| OBS 1920×1080 擷取正確 | 確定發生 | 正面效果 | 目標 |
| 4K 本地 vw LED 偏移 | 低（需非 16:9） | 低 | 觀察，必要時進 🅱 |
| FIT 縮放角色輕微模糊 | 中 | 低 | pixelArt+antialias 已處理 |
| resize handler 污染 this.W | 中 | **高** | 🅱 中移除 |
| header 52px 佈局影響 | 無 | — | CSS flex 處理，Phaser height 無關 |

---

## 實作規則（提醒）

- 一次只修改一個檔案
- 每完成一步停止並回報
- 不可重構現有架構
- 保持 MVP 可執行
