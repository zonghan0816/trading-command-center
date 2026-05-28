# Phase 2F Step 3 實作報告：Host Lane Lock System

## 目標

修正主持人偶爾左右互換站位的問題。阿明哥永遠在左半場，小美姐永遠在右半場。

---

## 修改檔案

`src/scenes/OfficeScene.js`（唯一修改）

---

## 根因分析

### 數值場景

| 角色 | Home X | Discussion X | 中線 |
|---|---|---|---|
| 阿明哥 | 537（W×0.28） | 672（W×0.35） | 960（W×0.5） |
| 小美姐 | 1382（W×0.72） | 1248（W×0.65） | 960（W×0.5） |

### 舊邏輯 Bug

`_walkTo` 的 `stopX` 計算：

```js
const stopX = target.x + (target.x > ch.x ? -safeOffset : safeOffset);
```

阿明哥（x=537）走向小美姐（x=1382）：
```
target.x > ch.x → 1382 > 537 → true
stopX = 1382 - 180 = 1202
1202 > 960（中線）→ 阿明哥跨入右半場 ← BUG
```

`HOST_MIN_DISTANCE = 180` 的碰撞保護距離不足以阻止 crossing（1382 - 180 = 1202 > 960）。

---

## Diff

### 常數新增（第 23 行後）

```diff
  const DISCUSSION_HOST_X_RATIOS = { aming: 0.35, xiaomei: 0.65 };
+ // Phase 2F Step 3: 主持人 Lane 邊界
+ const HOST_LANES = { aming: 0.35, xiaomei: 0.65 };
+ const LANE_MARGIN = 20; // 距中線最小留白（px）
```

### 新增 `_clampToLane` helper

```js
_clampToLane(id, x) {
  const mid = this.W * 0.5;
  if (id === 'aming')   return Math.min(x, mid - LANE_MARGIN);
  if (id === 'xiaomei') return Math.max(x, mid + LANE_MARGIN);
  return x;
}
```

### `_walkTo` stopX 修正

```diff
- const stopX = target.x + (target.x > ch.x ? -safeOffset : safeOffset);
+ const rawStopX = target.x + (target.x > ch.x ? -safeOffset : safeOffset);
+ const stopX = this._clampToLane(id, rawStopX);
  const dist  = Math.abs(stopX - ch.sprite.x);
```

---

## 保護邏輯

| 場景 | stopX 結果 | clamp 後 |
|---|---|---|
| aming(537) → xiaomei(1382) | 1202（越界） | 940（W×0.5 - 20）|
| xiaomei(1382) → aming(537) | 717（越界） | 980（W×0.5 + 20）|
| aming(537) → xiaomei(1248, discussion) | 1068（越界） | 940 |
| xiaomei(1248) → aming(672, discussion) | 852（越界） | 980 |

---

## 不需修改的路徑

| 路徑 | 目標 X | 是否在正確半場 |
|---|---|---|
| `_walkHome` | `ch.x`（home 位置） | ✅ aming=537, xiaomei=1382 均在各自半場 |
| `_enforceDiscussionPositions` | `W × DISCUSSION_HOST_X_RATIOS` | ✅ 0.35/0.65 均在各自半場 |
| `_buildWorkstations` 初始化 | `W × hostCfg.xRatio`（0.28/0.72） | ✅ 均在各自半場 |

只有 `_walkTo` 的 `stopX` 有越界風險，已修正。

---

## Phase 2F 完整進度

| Step | 內容 | 狀態 |
|---|---|---|
| 🅰 Step 1 | `main.js` 固定 1920×1080 + FIT | ✅ |
| 🅱 Step 2 | `OfficeScene.js` 移除 resize handler | ✅ |
| Step 3 | Host Lane Lock System | ✅ |

---

## 實作規則（已遵守）

- 一次只修改一個檔案（`src/scenes/OfficeScene.js`）
- 不重構現有架構（`DISCUSSION_HOST_X_RATIOS` 保留不動）
- 未修改 `main.js` / CSS / `server.py`
