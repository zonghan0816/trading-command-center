# Phase 3 Step 6.5 — Dialogue Gap Reduction (Prefetch + Shorten Delays)

**狀態：** 完成
**檔案動作：** 單檔 `src/scenes/OfficeScene.js`、6 處改動
**承接：** Phase 3 Step 5.1 / 6.3 / 6.4 + `56_DIALOGUE_GAP_REPORT.md` 推薦方案 A + B

---

## 一、為什麼做

`56_DIALOGUE_GAP_REPORT.md` 分析現象：

```
上一輪結束 → 下一輪第一句出現 = 5~10 秒空窗
```

組成：
- 1.1s next dialogue gap
- 3~8s Claude API（主要瓶頸）
- 0.3s + 0.3s 內部 delay

採用報告推薦的 **A + B 組合**：
- **A**：當前播放 2 秒後 background prefetch 下一輪
- **B**：縮短 4 個人為 delay

---

## 二、核心設計

### 兩個資料路徑（cache → wait → live fetch）

```
_fetchAndPlayDialogue()
    ↓
[1] _nextDialogue 有資料？
    └─ Yes → _consumePrefetchedDialogue() → _startDialogueFromData()  ⭐ 最快
    ↓ No
[2] _prefetchInProgress 中？
    └─ Yes → 250ms 後 retry（不開新 fetch、避免疊請求）
    ↓ No
[3] live fetch /api/chat → _startDialogueFromData()  ← 原本流程
```

### `_dialogueSeq` 時機改變

| 時機 | 之前 | 之後 |
|---|---|---|
| fetch 起手 | seq++ | 不動 |
| 真正開始播放 | (no-op) | seq++（在 `_startDialogueFromData`）|

→ Prefetch 不會偷遞增 seq、不會把當前播放當「舊輪」誤殺。

### Prefetch 觸發時機

播放開始後 2 秒：
```js
if (this._prefetchStartedForSeq !== seq) {
  this._prefetchStartedForSeq = seq;
  this.time.delayedCall(2000, () => {
    if (seq !== this._dialogueSeq) return;
    this._prefetchNextDialogue(seq);
  });
}
```

→ 每輪只觸發一次、seq 不一致就取消（防舊輪 timer 串新輪）。

---

## 三、改動細節（6 處）

### 1. `create()` 加 3 個 prefetch state vars

```diff
       this._freezeMovement = true;
       this._dialogueSeq = 0;
+      // Phase 3 Step 6.5: prefetch 下一輪 dialogue、縮短 gap
+      this._nextDialogue = null;
+      this._prefetchInProgress = false;
+      this._prefetchStartedForSeq = null;
```

### 2. `_fetchAndPlayDialogue` 完全重寫成三層 fallback

```js
async _fetchAndPlayDialogue() {
  if (this._chatInProgress) return;

  // [1] 先看 prefetch cache
  if (this._nextDialogue) {
    const data = this._consumePrefetchedDialogue();
    if (data && this._startDialogueFromData(data)) {
      console.info('[TDT] using prefetched dialogue');
      return;
    }
  }

  // [2] prefetch 還在跑 → 250ms 後再試（不疊請求）
  if (this._prefetchInProgress) {
    this.time.delayedCall(250, this._fetchAndPlayDialogue, [], this);
    return;
  }

  // [3] live fetch
  this._chatInProgress = true;
  try {
    const res = await fetch('/api/chat', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data?.dialogue?.length >= 2) {
        this._chatInProgress = false;
        if (this._startDialogueFromData(data)) return;
      }
    }
  } catch (_) {}
  this._chatInProgress = false;
  this.time.delayedCall(3000, this._fetchAndPlayDialogue, [], this);
}
```

### 3. 新增 `_prefetchNextDialogue(seq)` helper

```js
async _prefetchNextDialogue(seq) {
  if (seq !== this._dialogueSeq) return;
  if (this._prefetchInProgress) return;
  if (this._nextDialogue) return;
  this._prefetchInProgress = true;
  console.info('[TDT] prefetch started');
  try {
    const res = await fetch('/api/chat', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data?.dialogue?.length >= 2) {
        this._nextDialogue = data;
        console.info('[TDT] prefetch ready');
      }
    }
  } catch (e) {
    console.warn('[TDT] prefetch failed:', e?.message ?? e);
  } finally {
    this._prefetchInProgress = false;
  }
}
```

3 層 guard、try/finally 保證 `_prefetchInProgress` 一定 reset。

### 4. 新增 `_consumePrefetchedDialogue()` + `_startDialogueFromData(data)`

`_consumePrefetchedDialogue`：取出 + 清 cache、invalid 回 null。

`_startDialogueFromData`：
```js
_startDialogueFromData(data) {
  if (!data?.dialogue || data.dialogue.length < 2) return false;
  if (this._chatInProgress) return false;
  this._chatInProgress = true;
  this._dialogueSeq = (this._dialogueSeq || 0) + 1;
  const seq = this._dialogueSeq;
  this._prefetchStartedForSeq = null;
  this._playDialogue(data.dialogue, seq);
  return true;
}
```

`_chatInProgress` guard 防並發。

### 5. `_playDialogue` 加 prefetch 觸發 + 縮 delay

```diff
     walker.sprite.play(walkerAnim);
+    // Phase 3 Step 6.5: 當前播放 2 秒後 background prefetch 下一輪
+    if (this._prefetchStartedForSeq !== seq) {
+      this._prefetchStartedForSeq = seq;
+      this.time.delayedCall(2000, () => {
+        if (seq !== this._dialogueSeq) return;
+        this._prefetchNextDialogue(seq);
+      });
+    }

     const afterWalk = () => {
       if (seq !== this._dialogueSeq) return;
-      this.time.delayedCall(300, () => {
+      // Phase 3 Step 6.5: afterWalk 內 delay 300 → 100
+      this.time.delayedCall(100, () => {
         ...
         this._walkHome(walkerId, () => {
           ...
           this._chatInProgress = false;
-          this.time.delayedCall(1100, this._fetchAndPlayDialogue, [], this);
+          // Phase 3 Step 6.5: next dialogue gap 1100 → 350
+          this.time.delayedCall(350, this._fetchAndPlayDialogue, [], this);
         });
       });
     };

     ...
     } else {
-      this.time.delayedCall(300, afterWalk);
+      // Phase 3 Step 6.5: frozen 路徑 delay 300 → 100
+      this.time.delayedCall(100, afterWalk);
     }
```

### 6. `_playLineSequence` 句間 gap 300 → 180

```diff
-        // Phase 3 Step 5.1: line gap 500 → 300
-        this.time.delayedCall(300, ...);
+        // Phase 3 Step 6.5: line gap 300 → 180
+        this.time.delayedCall(180, ...);
```

---

## 四、Delay 總對照

| 位置 | 之前 | 之後 | 省 |
|---|---:|---:|---:|
| next dialogue gap | 1100ms | 350ms | -750ms |
| afterWalk 內部 | 300ms | 100ms | -200ms |
| frozen 直接 afterWalk | 300ms | 100ms | -200ms |
| line 句間 gap | 300ms | 180ms | -120ms |
| **單輪人為延遲總省** | — | — | **~1.3 秒** |

---

## 五、預期效果

### 場景 A：Claude 比播放快（多數情況）

```
T=0s     當前對話開始播
T=2s     prefetch 觸發
T=5~9s   prefetch 完成、_nextDialogue 就緒
T=15~30s 當前對話結束
T=+350ms _fetchAndPlayDialogue 觸發
T=+350ms 立刻 consume cache → 開始播下一輪
         ⭐ 用戶體感 gap ≈ 0.5 秒
```

### 場景 B：對話超短、Claude 還沒回（少數）

```
T=0s     當前對話開始播
T=2s     prefetch 觸發（剛開始 fetch）
T=4s     對話結束（很短）
T=+350ms _fetchAndPlayDialogue 觸發
T=+350ms _nextDialogue 空、_prefetchInProgress=true
T=+600ms retry 250ms 後
...      持續 retry 直到 prefetch 完成
T=+3~5s  Cache 就緒、開始播
         用戶體感 gap ≈ 3~5 秒（仍比原本 5~10 秒短）
```

### 場景 C：prefetch 失敗、進 live fetch

```
T=0s     當前對話開始播
T=2s     prefetch 觸發、但網路掛
T=5~10s  prefetch warn 完、_prefetchInProgress=false、_nextDialogue=null
T=15s    當前對話結束
T=+350ms _fetchAndPlayDialogue → live fetch /api/chat
         用戶體感 gap ≈ 5~8 秒（跟原本差不多、但 1 秒人為 gap 省了）
```

---

## 六、Race condition 處理（清單）

| 風險 | 防護 |
|---|---|
| 並發 `_fetchAndPlayDialogue` | `if (_chatInProgress) return` + live fetch 期間 `_chatInProgress=true` |
| 並發 prefetch | `_prefetchInProgress` flag + 3 層 guard |
| 同輪重複觸發 prefetch | `_prefetchStartedForSeq` 記住已觸發的 seq |
| 舊輪 timer 串到新輪 | 所有 delayedCall 內 `if (seq !== _dialogueSeq) return` |
| prefetch 完成後 cache 過期？ | 不會：data 不綁 seq、純資料、下一輪 consume 才遞增 seq |
| live fetch 期間另一個 delayedCall 又觸發 fetch | live fetch 已 set `_chatInProgress=true` 擋住 |
| prefetch 失敗永遠 stuck `_prefetchInProgress=true` | `try/finally` 保證 reset |

---

## 七、Sanity Check

```bash
$ node -c src/scenes/OfficeScene.js
SYNTAX OK
```

---

## 八、保留沒動的部分

| 項目 | 狀態 |
|---|---|
| `server.py` | ✅ 未動 |
| `BootScene.js` / `config.js` | ✅ 未動 |
| `assets/*` / `.env` / state files | ✅ 未動 |
| API schema | ✅ 未動 |
| Step 6.3 tone / angle queue / dialogue memory | ✅ 邏輯不變 |
| Step 6.4 topic seed / rotate | ✅ 不影響 |
| Step 6.2 chunk-level action / idle restore | ✅ 不變 |
| `chunkMs` 公式（每段顯示時間）| ✅ 未動 |
| seq guard | ✅ 完整保留 |
| 阿明邏輯、PNG 視覺 | ✅ 未動 |

---

## 九、Server 端影響說明

`prefetch` 等同於提早呼叫一次 `/api/chat`：

| 項目 | 影響 |
|---|---|
| `_current_topic_rounds` | 仍每次 +1（prefetch 也算一輪）→ rotate loop 提早觸發 |
| `dialogue memory` | prefetch 完當下就寫入、下次 prompt 看到 |
| `tone queue` / `angle queue` | prefetch 也 pop 一個、沒問題（同 topic 內仍不重複）|
| topic seed/rotate | 不衝突（prefetch 沒呼叫 rotate endpoint）|

> 重要：每輪播放期間、實際上會發 **2 次** `/api/chat`（current + prefetch），不是 1 次。
> Token 用量約翻倍、Claude Haiku 4.5 仍便宜可接受。

---

## 十、驗收方式

### A. 重整瀏覽器

`Ctrl+Shift+R` 強制重整 `http://localhost:8765`。

### B. F12 Console 看 prefetch log

預期看到：
```
[TDT] prefetch started      ← 第 1 輪播放 2s 後
[TDT] prefetch ready        ← Claude 回應後
[TDT] using prefetched dialogue  ← 第 2 輪開始時消費
[TDT] prefetch started      ← 第 2 輪播放 2s 後
...
```

### C. 視覺驗收

| 觀察點 | 預期 |
|---|---|
| 第 1 輪 → 第 2 輪 gap | 約 0.5~1 秒（之前 5~10s）|
| 第 2 輪 → 第 3 輪 gap | 約 0.5~1 秒 |
| 連續 5 輪 | 每輪間隔都應很順 |
| 兩個泡泡同時跳出 | ❌ 不該發生 |
| 對話中斷或重疊 | ❌ 不該發生 |
| 小美 chunk-level action | ✅ 正常 |
| 完句後回 idle | ✅ 正常 |

### D. server.py console

預期會看到 `/api/chat` 觸發頻率約翻倍（因為 prefetch）：
- 之前：~30s 一次（播放完才 fetch）
- 之後：~15s 一次（播放中 prefetch + 真實 fetch）

但 topic rotate 5 輪閾值仍生效、不會亂跳 topic。

---

## 十一、🚨 小美 PNG 視覺問題（沿用提醒）

仍存在、不在本次範圍。詳見 51~55 BRIEF 的素材層說明。
**等 Codex 重生 `char_xiaomei_actions.png`**。

---

## 十二、下一步建議

1. **實跑驗收**：開瀏覽器、F12 看 prefetch log、感受 gap
2. **若 prefetch 觸發太早 / 太晚**：調 `delayedCall(2000)` 內的 2000ms（短對話可改 1000ms）
3. **若 server 負擔太大**：把 prefetch 加 condition（例如只在第 3 輪後才 prefetch）
4. **若驗收 OK**：commit + push（Step 6.5 + 56 報告一起）
5. **PNG 視覺問題**：交給 Codex
