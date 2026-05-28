# Phase 2F Step 2 實作報告

## 目標

移除 OfficeScene.js 中污染 world-space 的 resize handler，使 `this.W / this.H / this.wallH` 成為固定常數 1920×1080。

---

## 修改檔案

`src/scenes/OfficeScene.js`（唯一修改）

---

## Diff

```diff
// create() 初始化
- const { width, height } = this.scale;
- this.W = width;
- this.H = height;
- this.wallH = height * WALL_H_RATIO;
+ this.W = 1920;
+ this.H = 1080;
+ this.wallH = this.H * WALL_H_RATIO;

// resize handler（完整移除）
- this.scale.on('resize', (size) => {
-   this.W = size.width; this.H = size.height;
-   this.wallH = size.height * WALL_H_RATIO;
- });
```

---

## 為什麼 resize handler 有害

Phase 2F Step 1 後，Phaser canvas world-space 固定 1920×1080，但 FIT 模式仍會觸發 resize 事件。

觸發時傳入的 `size` 是 **CSS 縮放後的視窗尺寸**，不是 world-space：

```
4K TV + 250% → 邏輯視窗 1536×864
resize 事件 size.width = 1536（不是 1920）
```

一旦觸發：
- `this.W` 被設為 1536（本該永遠是 1920）
- 所有依賴 `this.W * ratio` 的物件全部偏移：
  - LED center：`W * 0.565` → 錯誤
  - discussion 站位：`W * 0.35 / 0.65` → 錯誤
  - 麥克風：`W * 0.36 / 0.64` → 錯誤
  - 中央桌：`W * 0.5` → 錯誤

---

## world-space 污染源全面清查

| 位置 | 改前 | 改後 | 狀態 |
|---|---|---|---|
| `create()` 初始化 | 讀 `this.scale.width/height`（動態） | 硬碼 1920/1080 | ✅ 已修 |
| `resize` handler | 每次觸發覆寫 `this.W/H` | 已移除 | ✅ 已修 |
| `_enforceDiscussionPositions` | 讀 `this.W`（已是常數） | 不需修改 | ✅ 安全 |
| `_buildAgentStation` | 讀 `this.W`（已是常數） | 不需修改 | ✅ 安全 |
| `_buildDecorations` | `create()` 時一次呼叫 | 不需修改 | ✅ 安全 |
| `_buildWorkstations` | `create()` 時一次呼叫 | 不需修改 | ✅ 安全 |

`this.W / this.H / this.wallH` 現在是初始化後不再改變的常數，無其他污染源。

---

## Phase 2F 完整結果

| Step | 檔案 | 內容 | 狀態 |
|---|---|---|---|
| 🅰 Step 1 | `src/main.js` | 固定 1920×1080 + FIT 模式 | ✅ 完成 |
| 🅱 Step 2 | `src/scenes/OfficeScene.js` | 移除 resize handler + 固定初始化 | ✅ 完成 |

canvas world-space 現在在任何環境下（4K TV / OBS / 非 16:9 視窗）都永遠是 1920×1080。

---

## 實作規則（已遵守）

- 一次只修改一個檔案（`src/scenes/OfficeScene.js`）
- 完成後停止，不繼續下一步
- 不重構現有架構
- 未修改 `main.js` / CSS
