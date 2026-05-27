# Phase 2D 任務 4.5 完成報告

## 主持人碰撞避免系統

---

## 修改檔案

| 檔案 | 動作 |
|---|---|
| `src/scenes/OfficeScene.js` | **4 處改動**：(1) 加 2 個 module-level 常數；(2) 升級 `_walkTo`；(3) 新增 2 個 helper；(4) `_applyState` 接 discussion mode 強制站位 |

其他檔案 0 動（嚴守一次一檔）：
- `server.py` ✅ 未動
- `src/config.js` ✅ 未動（28%/72% 預設座位保留、discussion 站位在 OfficeScene 內 override）
- `src/scenes/BootScene.js` ✅ 未動
- `index.html` ✅ 未動

---

## 修改區塊

### 區塊 1：Module top 加常數（line 20-23）

```js
// 任務 4.5: 主持人碰撞避免
// HOST_MIN_DISTANCE 是兩主持人之間至少要保持的水平距離（px）
const HOST_MIN_DISTANCE = 180;
// discussion mode 下強制站位（畫面寬度比例、不動 config.js）
const DISCUSSION_HOST_X_RATIOS = { aming: 0.35, xiaomei: 0.65 };
```

### 區塊 2：新增 helper `_distanceToOtherHost(id)`（line 398）

```js
/** 回傳指定主持人與另一主持人的水平距離（px）。
 *  id 不是 aming/xiaomei 或角色不存在 → Infinity（不啟用碰撞）*/
_distanceToOtherHost(id) {
  const otherId = id === 'aming' ? 'xiaomei' : (id === 'xiaomei' ? 'aming' : null);
  if (!otherId) return Infinity;
  const ch    = this.characters[id];
  const other = this.characters[otherId];
  if (!ch || !other) return Infinity;
  return Math.abs(ch.sprite.x - other.sprite.x);
}
```

### 區塊 3：新增 helper `_enforceDiscussionPositions()`（line 408）

```js
/** discussion mode 進入時、強制兩主持人 X 移到 35% / 65%、kill 既有 tween */
_enforceDiscussionPositions() {
  if (!this.W) return;
  const targets = {
    aming:   this.W * DISCUSSION_HOST_X_RATIOS.aming,
    xiaomei: this.W * DISCUSSION_HOST_X_RATIOS.xiaomei,
  };
  for (const id of ['aming', 'xiaomei']) {
    const ch = this.characters[id];
    if (!ch) continue;
    const targetX = targets[id];
    if (Math.abs(ch.sprite.x - targetX) <= 5) continue;  // 已在位就 skip
    this.tweens.killTweensOf(ch.sprite);
    ch.isWalking = false;
    this.tweens.add({
      targets: ch.sprite,
      x: targetX,
      y: ch.homeY,        // 同時把 Y 拉回 home（避免停留跳起狀態）
      duration: 200,
      ease: 'Power2',
      onUpdate: () => this._syncBubble(id),
      onComplete: () => { ch.sprite.play(`${id}_idle`); },
    });
  }
}
```

### 區塊 4：`_walkTo` 升級（3 處內部改動）

#### 4a. 開頭加 discussion 短路（line 450-453）
```js
// 任務 4.5: discussion mode 禁止主持人走動（必須固定 35%/65% 站位）
if (this.state?.mode === 'discussion' && (id === 'aming' || id === 'xiaomei')) {
  if (onComplete) onComplete();
  return;
}
```

#### 4b. 目標 X 用 safeOffset、確保停下時距離 >= HOST_MIN_DISTANCE（line 467-470）
```js
// 任務 4.5: 走向另一主持人時、確保停下時距離 >= HOST_MIN_DISTANCE
const targetIsHost = (targetId === 'aming' || targetId === 'xiaomei');
const safeOffset   = targetIsHost ? Math.max(wo, HOST_MIN_DISTANCE) : wo;
const stopX = target.x + (target.x > ch.x ? -safeOffset : safeOffset);
```

#### 4c. tween onUpdate 即時距離檢查（line 474-490）
```js
let aborted = false;
const walkTween = this.tweens.add({
  targets: ch.sprite,
  x: stopX,
  duration: dist * 2.2,
  ease: 'Linear',
  onUpdate: () => {
    this._syncBubble(id);
    // 任務 4.5: 即時檢查、太近就停（避免移動中與對方碰撞）
    if (!aborted && this._distanceToOtherHost(id) < HOST_MIN_DISTANCE) {
      aborted = true;
      walkTween.stop();
      ch.sprite.play(`${id}_idle`);
      ch.isWalking = false;
      if (onComplete) onComplete();
    }
  },
  onComplete: () => {
    if (aborted) return;  // 已中止、不再執行正常流程
    ch.sprite.play(`${id}_thinking`);
    this.time.delayedCall(400, () => { if (onComplete) onComplete(); });
  },
});
```

### 區塊 5：`_applyState` 接 discussion 強制站位（line 326-329）

```js
// 任務 4.5: discussion mode 強制阿明/小美 35% / 65% 站位（內含防抖、已在位就 skip）
if (data.mode === 'discussion') {
  this._enforceDiscussionPositions();
}
```

---

## 三大功能對照表

| 需求 | 實作位置 | 機制 |
|---|---|---|
| **1. 目標點生成不得距 < 180** | `_walkTo` 區塊 4b | `safeOffset = max(walkOffset 36, HOST_MIN_DISTANCE 180)` |
| **2. 移動中距離 < 180 立即停止** | `_walkTo` 區塊 4c | tween onUpdate 內檢查 `_distanceToOtherHost`、太近 `tween.stop()` + idle |
| **3. discussion 固定 35%/65%** | `_enforceDiscussionPositions` + 區塊 4a + 區塊 5 | mode 變 discussion → 拉到位 + 禁止走動 |

---

## 測試方式

### A. 純邏輯/視覺測試（瀏覽器）

1. 啟 server：`python server.py`
2. 開 `http://localhost:8765`
3. **觀察 idle mode**：主持人偶爾走動聊天、但**不會走到對方身上**（距離永遠 >= 180px）
4. **切到 discussion**：
   ```bash
   curl -X POST http://localhost:8765/api/topic \
     -H "Content-Type: application/json" \
     -d "{\"topic\":\"房價創新高\"}"
   ```
   - 阿明應「滑」到畫面 35% 位置
   - 小美應「滑」到畫面 65% 位置
   - 之後**不再走動**（即使有對話 trigger）
5. **切回 idle**：
   ```bash
   curl -X POST http://localhost:8765/api/state \
     -H "Content-Type: application/json" \
     -d "{\"mode\":\"idle\"}"
   ```
   - 主持人恢復可走動

### B. 邏輯走查驗證點

| 情境 | 觸發 | 預期行為 |
|---|---|---|
| 兩人都在 idle、A 被 demo loop 觸發走向 B | `_walkTo('aming', 'xiaomei')` | stopX = B.x − 180（不是原本 -36）|
| A 走到一半、B 突然動了靠近 A | onUpdate 每 frame 檢查 | A 距 B < 180 → `walkTween.stop()` + idle、不再前進 |
| POST mode=discussion | `_applyState` | `_enforceDiscussionPositions` 觸發、200ms 滑到 35%/65% |
| Discussion 期間 demo loop 想觸發走路 | `_walkTo` 開頭 | discussion 短路、直接 return + onComplete |
| 走向非主持人（如 agent 角色）| `targetIsHost = false` | safeOffset = walkOffset（不啟用碰撞、保留原邏輯）|

### C. 程式碼 sanity check

```bash
node -c src/scenes/OfficeScene.js   # ✅ syntax OK
```

---

## 前後對照（_walkTo 行為差異）

### 場景 1：阿明走向小美

| 步驟 | 修改前 | 修改後 |
|---|---|---|
| 計算 stopX | `target.x - 36`（小美 X - 36px）| `target.x - max(36, 180) = target.x - 180` |
| 走路途中 | 沒檢查、可能撞到對方移動中的位置 | 每 frame 檢查距離、< 180 立即停 |
| 停下後 | 距小美 36px（緊貼）| 距小美 ≥ 180px（保持距離）|

### 場景 2：mode 切到 discussion

| 修改前 | 修改後 |
|---|---|
| 角色保持在 28%/72%（原 home）、可能正在走路狀態 | 自動 200ms 滑到 35%/65%、進入 idle |
| 仍可被 demo loop / state 觸發 `_walkTo` | `_walkTo` 開頭直接 return、保持固定站位 |

### 場景 3：兩主持人「同時」想靠近（極端 case）

| 修改前 | 修改後 |
|---|---|
| `_walkTo` 開頭只擋 `target.isWalking`、但 race condition 可能讓兩個同時走 | 即使 race condition、兩邊 tween onUpdate 都會檢查距離、誰先觸發 < 180 誰先停 |

---

## 邊界處理

| 邊界 | 處理 |
|---|---|
| `_distanceToOtherHost('agent')` | 回 Infinity、不啟用碰撞（保留 agent 角色行為）|
| `this.W` 還沒初始化（早期 frame）| `_enforceDiscussionPositions` 開頭 `if (!this.W) return` |
| 主持人已在 35%/65% ±5px | `_enforceDiscussionPositions` 內部 `continue`、不重複 tween |
| `state` 還沒被 set（首次 `_walkTo`）| `this.state?.mode` 用 optional chaining、null safe |

---

## Git Commit 建議

```
feat(OfficeScene): Phase 2D 任務 4.5 — 主持人碰撞避免系統

加入 HOST_MIN_DISTANCE = 180px 安全距離規則：
1. _walkTo 計算 stopX 用 max(walkOffset, HOST_MIN_DISTANCE)
2. tween onUpdate 即時檢查距離、< 180 立即 stop + idle
3. discussion mode 強制阿明 35% / 小美 65% 固定站位
4. discussion 期間 _walkTo 短路、禁止主持人走動

新增 module const:
- HOST_MIN_DISTANCE = 180
- DISCUSSION_HOST_X_RATIOS = {aming: 0.35, xiaomei: 0.65}

新增 helpers:
- _distanceToOtherHost(id) → px
- _enforceDiscussionPositions() — 滑到固定站位

修改 _walkTo: 3 處（discussion 短路、safeOffset、onUpdate 距離檢查）
修改 _applyState: mode===discussion 觸發強制站位

只動 OfficeScene.js、不改 server / config / index.html
config.js 預設 28%/72% 不變、discussion 站位在 OfficeScene 內 override
```
