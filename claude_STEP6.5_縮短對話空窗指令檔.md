# Claude 指令檔：Step 6.5 縮短對話空窗

請接續 `C:\Users\miner3\trading-command-center` 專案。

你已讀過 `WWT_HANDOVER.md`，也已完成：

- `51_PHASE3_STEP6_IMPL_BRIEF.md`
- `52_PHASE3_STEP6.1_IMPL_BRIEF.md`
- `53_PHASE3_STEP6.2_IMPL_BRIEF.md`
- `54_PHASE3_STEP6.3_IMPL_BRIEF.md`
- `55_PHASE3_STEP6.4_IMPL_BRIEF.md`

另請參考：

- `56_DIALOGUE_GAP_REPORT.md`

不要重複交接摘要，直接做本任務。

## 任務定位

本次做 **Phase 3 Step 6.5：Dialogue Gap Reduction**。

使用者觀察：

```txt
一輪對話結束後，到下一輪第一句出現，中間會冷場 5~10 秒。
```

`56_DIALOGUE_GAP_REPORT.md` 已分析：

- Claude API 生成時間是主要瓶頸：3~8 秒。
- 人為 delay 約 1.7 秒。
- Step 6.3 反重複 prompt 變長後，API 生成時間更明顯。

本輪採用報告推薦的最有感方案：

```txt
方案 A + B：背景預抓下一輪 + 縮短人為 gap。
```

## 修改範圍

優先只改：

```txt
src/scenes/OfficeScene.js
```

不要修改：

```txt
server.py
src/scenes/BootScene.js
src/config.js
assets/*
.env
wwt_state.json
wwt_news_cache.json
wwt_dialogue_memory.json
```

## 重要限制

- 不改 API schema。
- 不改 Step 6.3 的 tone / angle / dialogue memory 後端邏輯。
- 不恢復 walking / wander / random movement。
- 保留 `_dialogueSeq` token 防 race condition。
- 不動小美 PNG 素材問題。
- 若 prefetch 失敗，不應中斷目前播放；只 fallback 到原本現抓流程。

## 目標行為

### 改前

```txt
上一輪最後一句結束
→ 角色回 idle
→ 等 1.1s
→ 才開始 POST /api/chat
→ 等 Claude 3~8s
→ 再等 0.3s + 0.3s
→ 下一輪第一句出現
```

### 改後

```txt
本輪開始播放後約 2 秒
→ 背景預抓下一輪 /api/chat
→ 本輪繼續播放
→ 本輪結束時，如果預抓已完成，直接播放下一輪
→ gap 主要只剩 0.3~0.6s 的人為節奏
```

如果預抓尚未完成：

```txt
本輪結束
→ 顯示短暫 thinking / idle 過渡
→ 等預抓完成，或 fallback 現抓
```

## 建議實作

### 1. 新增前端 prefetch 狀態

在 `create()` 初始化：

```js
this._nextDialogue = null;
this._prefetchInProgress = false;
this._prefetchStartedForSeq = null;
```

### 2. 新增 helper：`_prefetchNextDialogue(seq)`

行為：

- 如果 `seq !== this._dialogueSeq`，return。
- 如果 `this._prefetchInProgress`，return。
- 如果 `this._nextDialogue` 已有資料，return。
- 設 `this._prefetchInProgress = true`。
- `fetch('/api/chat', { method: 'POST' })`。
- response ok 且 `data.dialogue.length >= 2` 時，存到：

```js
this._nextDialogue = data;
```

- finally 設 `this._prefetchInProgress = false`。
- 如果 fetch 失敗，只 console.warn，不中斷目前 dialogue。

注意：

```txt
prefetch API 跑完時，server.py 會先更新 dialogue memory / topic_round。
這是可接受的，因為這輪 next dialogue 已經生成，下一輪會直接播放它。
```

### 3. 新增 helper：`_consumePrefetchedDialogue()`

行為：

```js
const data = this._nextDialogue;
this._nextDialogue = null;
return data;
```

可加防呆：若 data invalid 回 null。

### 4. 新增 helper：`_startDialogueFromData(data)`

把「拿到 dialogue 後開始播放」集中成一個 helper，避免 `_fetchAndPlayDialogue()` 和 prefetch 重複邏輯。

建議：

```js
_startDialogueFromData(data) {
  if (!data?.dialogue || data.dialogue.length < 2) return false;
  this._chatInProgress = true;
  this._dialogueSeq = (this._dialogueSeq || 0) + 1;
  const seq = this._dialogueSeq;
  this._prefetchStartedForSeq = null;
  this._playDialogue(data.dialogue, seq);
  return true;
}
```

### 5. 改 `_fetchAndPlayDialogue()`

流程改成：

1. 如果 `_chatInProgress`，return。
2. 先檢查 `_nextDialogue`：
   - 有就 consume，呼叫 `_startDialogueFromData(data)`，不要再 fetch。
3. 沒有 cached next dialogue，才 fetch `/api/chat`。
4. fetch 成功後呼叫 `_startDialogueFromData(data)`。
5. fetch 失敗時，3 秒後重試。

請避免：

```txt
在 fetch 開始前過早遞增 `_dialogueSeq`。
```

`_dialogueSeq` 應在真正開始播放一輪 dialogue 時才遞增。

### 6. 在 `_playDialogue()` 開始後排 prefetch

當本輪 dialogue 已開始播放，排一個 2 秒後的 prefetch：

```js
this.time.delayedCall(2000, () => {
  if (seq !== this._dialogueSeq) return;
  this._prefetchNextDialogue(seq);
});
```

只應該每輪觸發一次。可以用：

```js
if (this._prefetchStartedForSeq !== seq) {
  this._prefetchStartedForSeq = seq;
  ... delayedCall ...
}
```

### 7. 整輪結束時優先播放 prefetched dialogue

目前結束時大概是：

```js
this._chatInProgress = false;
this.time.delayedCall(1100, this._fetchAndPlayDialogue, [], this);
```

改成：

```js
this._chatInProgress = false;
const nextDelay = this._nextDialogue ? 350 : 600;
this.time.delayedCall(nextDelay, this._fetchAndPlayDialogue, [], this);
```

或更直接：

```js
this.time.delayedCall(350, this._fetchAndPlayDialogue, [], this);
```

因為 `_fetchAndPlayDialogue()` 會優先 consume cached dialogue；沒有 cache 才現抓。

### 8. 縮短人為 delay（方案 B）

請同步調小以下 delay：

| 位置 | 現在 | 建議 |
|---|---:|---:|
| `_playDialogue` 裡 `afterWalk` 之前 | 300ms | 100ms |
| freeze movement 直接 `afterWalk` | 300ms | 100ms |
| `_playLineSequence` 每句 line gap | 300ms | 180ms |
| next dialogue gap | 1100ms | 350~600ms |

不要調 `chunkMs`，避免台詞看不完。

## 可選視覺過渡

如果 prefetch 還沒完成，本輪結束後畫面會短暫 idle。可不做。

如果要做，請只做極輕量：

- 不顯示新的假台詞。
- 不改 API。
- 可讓兩位主持人維持 idle，或短暫 thinking 500ms。

本輪優先處理真正 gap，不要做複雜 loading UI。

## Race condition 注意事項

### seq guard

所有 delayedCall 都要保留：

```js
if (seq !== this._dialogueSeq) return;
```

### prefetch 結果不可打斷目前播放

`_prefetchNextDialogue()` 只存資料到 `_nextDialogue`，不要直接呼叫 `_playDialogue()`。

### 新一輪開始時清理

新一輪開始播放時：

- `_prefetchStartedForSeq = null`
- 不要清掉已 consume 的 `_nextDialogue` 以外資料。

### prefetch 失敗

只 warn，不要 throw。

## 驗收

### A. 正常對話不中斷

開 `http://localhost:8765`，觀察 3~5 輪。

預期：

- 小美 / 阿明仍照原本順序講。
- 小美 chunk-level action 仍正常。
- 對話完仍回 idle。
- 不會出現兩個泡泡同時亂跳。

### B. gap 明顯縮短

用肉眼觀察：

```txt
上一輪最後泡泡消失 → 下一輪第一泡泡出現
```

預期：

- 如果 prefetch 已完成：gap 約 0.5~1 秒。
- 如果 prefetch 未完成：仍可能 2~4 秒，但應少於原本 5~10 秒。

### C. console 可加 debug log

可暫時加低噪音 log：

```js
console.info('[TDT] prefetch started');
console.info('[TDT] prefetch ready');
console.info('[TDT] using prefetched dialogue');
```

如果保留，請不要太吵；每輪最多 2~3 行。

### D. server memory / topic round

因為 prefetch 會提早呼叫 `/api/chat`，`topic_round` 會在前一輪播放中先增加。這是可接受的。

但請確認：

- 沒有連續發出多個 prefetch。
- 每輪最多：目前播放 fetch 一次 + 下一輪 prefetch 一次。
- 不會在同一輪裡無限打 `/api/chat`。

## 完成後輸出

請新增 implementation brief：

```txt
57_PHASE3_STEP6.5_IMPL_BRIEF.md
```

brief 需包含：

- prefetch 狀態欄位
- `_fetchAndPlayDialogue()` 如何優先 consume cache
- `_playDialogue()` 何時開始 prefetch
- 哪些 delay 被縮短
- race condition 如何避免
- 實測或預期 gap 改善
