# Phase 3 Step 2.3 實作報告：Dialogue Bubble Placement Fix

## 目標

修正主持人對話泡泡位置（頭部旁）、尺寸放大、中文字裁切修正。

---

## 修改檔案

`src/scenes/OfficeScene.js`（唯一修改）

---

## Fix 1 — 泡泡移至頭部旁（左/右側）

### 問題

舊做法：泡泡用 `bubble_bg` Image，固定在 `(charX, charY - 117)`（角色腳底上方固定偏移），對話時看起來像字幕貼在地板。

### 解法

改用 `Phaser.GameObjects.Graphics` 建立泡泡背景，定位在角色頭部旁邊。

```js
// 計算角色高度（v2 = 1536 * 0.28 = 430px，v1 = 64 * 4 = 256px）
const charHeight = isV2
  ? Math.round(1536 * (S.characterV2 ?? 0.28))
  : Math.round(64 * S.character);

const bW = 400, bH = 165;
const accentColor = (id === 'aming') ? 0xFF8C00 : 0x00E5FF;  // 橘 / 青

const headTopY = charY - charHeight;
let bCX = (id === 'aming')
  ? Math.max(40 + bW / 2, charX - 290)   // 阿明：頭部左側
  : Math.min(1880 - bW / 2, charX + 290); // 小美：頭部右側
let bCY = Math.max(190 + bH / 2, Math.min(900 - bH / 2, headTopY + 110));

// Graphics 以相對座標繪製（定位在 bCX, bCY）
const bubbleBg = this.add.graphics({ x: bCX, y: bCY });
bubbleBg.fillStyle(0x071828, 0.95);
bubbleBg.fillRoundedRect(-bW / 2, -bH / 2, bW, bH, 12);
bubbleBg.lineStyle(2, accentColor, 0.85);
bubbleBg.strokeRoundedRect(-bW / 2, -bH / 2, bW, bH, 12);
```

| 角色 | 泡泡位置 | 邊框色 |
|---|---|---|
| 阿明哥 | 頭部左側（charX - 290） | Orange `#FF8C00` |
| 小美姐 | 頭部右側（charX + 290） | Cyan `#00E5FF` |

Safe area 已 clamp：`left ≥ 40 + bW/2`、`right ≤ 1880 - bW/2`、`top/bottom` 同理。

---

## Fix 2 — `_syncBubble` 修正（對話時跟隨角色）

### 問題

`_syncBubble` 用舊的 `setPosition(sx, sy - 52)` 強制把泡泡移回角色正上方，且對 `Graphics` 物件無效（Graphics 以絕對座標繪製，`setPosition` 會位移整個畫布）。

### 解法

在建立泡泡時，將偏移量存入角色資料，`_syncBubble` 改用儲存的偏移量計算：

```js
// _buildWorkstations 建立時：
this.characters[id] = {
  ...
  bubbleXOff: bCX - charX,  // 阿明 ≈ -290，小美 ≈ +290
  bubbleYOff: bCY - charY,
};

// _syncBubble 修正後：
_syncBubble(id) {
  const ch = this.characters[id];
  const bX = ch.sprite.x + (ch.bubbleXOff ?? 0);
  const bY = ch.homeY    + (ch.bubbleYOff ?? -140);
  ch.bubbleBg.setPosition(bX, bY);
  ch.bubbleText.setPosition(bX, bY);
}
```

---

## Fix 3 — 泡泡高度放大（支援 4 行台詞）

| 屬性 | 修改前 | 修改後 |
|---|---|---|
| bH（高度） | 115px | **165px** |
| 最大行數 | ~3 行 | **4 行** |
| 截斷字數（_playLineSequence） | 36 | **64** |
| 截斷字數（_animateTyping） | 60 | **80** |
| 截斷字數（_applyState） | 50 | **80** |

---

## Fix 4 — 中文字 descender 裁切修正

### 問題

Phaser 以 **Consolas（Latin 字型）** 的 metrics 計算 text canvas 高度，但中文字符由系統 fallback 字型渲染（高度更高），導致每行底部被裁切。即使 `padding: { y: 100 }` 也無效，因為裁切發生在 font metrics 計算層。

### 解法

改用中文字型優先：

```diff
- fontFamily: 'Consolas, monospace'
+ fontFamily: '"Microsoft JhengHei", "PingFang TC", Arial, sans-serif'
```

Phaser 從中文字型取得正確 metrics → canvas 高度足夠 → 字符完整顯示。

其餘調整：
- `lineSpacing: 9` → `6`（中文字型行距本身較寬，不需額外 spacing）
- `padding: { x: 0, y: 6 }`（保留少量安全緩衝）

---

## Graphics vs Image 差異說明

| 特性 | `add.image()` | `add.graphics({ x, y })` |
|---|---|---|
| setPosition 行為 | 移動整個物件 ✓ | 移動整個物件 ✓（需用相對座標繪製） |
| 邊框顏色控制 | 需不同 texture | 可程式化指定 ✓ |
| setAlpha tween | ✓ | ✓ |

關鍵：Graphics 必須用 `this.add.graphics({ x: bCX, y: bCY })` 定位，再以相對 `(-bW/2, -bH/2)` 繪製，`setPosition` 才能正確移動整個泡泡。

---

## 未修改

- LED overlay、背景圖、角色 x/y 站位、scale
- TOP5 邏輯、right status panel 邏輯
- server.py、API routes、state schema、mode system
- Phaser config
