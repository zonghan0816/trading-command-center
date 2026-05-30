# Phase 3 觀察報告 — Dialogue Round Gap 分析

**狀態：** 分析報告（非實作 BRIEF）
**現象：** 一輪對話結束、到下一輪第一句出現之間、間隔約 **5~10 秒**、視覺上有「冷場感」

---

## 一、現象描述

```
上一輪最後一句說完
    ↓
（角色全部回 idle）
    ↓
（畫面靜止 5~10 秒、整場空氣）
    ↓
下一輪第一句泡泡出現
```

對 OBS 直播觀眾體感是「節目斷了一下、像 buffering」。

---

## 二、Timing 拆解

從 `OfficeScene.js` 跟 `server.py` 的實際流程：

```
T=0s       _playLineSequence onComplete（最後 chunk 顯示完）
           ↓
T=0s       _returnHostToIdle('aming') + _returnHostToIdle('xiaomei')
           _hideBubble x2
           ↓
T=0s       _walkHome（movement frozen、立即 callback、0 秒）
           ↓
T=0s       this._chatInProgress = false
           ↓
T=1.1s     delayedCall(1100) → _fetchAndPlayDialogue
           ↑ Step 5.1 定的「next dialogue gap」
           ↓
T=1.1s     fetch('/api/chat', POST) 開始
           ↓
T=4~9s     ⭐ Claude Haiku 4.5 API 生成（3~8 秒）
           ↓
T=4~9s     收到 response、呼叫 _playDialogue(seq)
           ↓
T=+0.3s    delayedCall(300) → afterWalk（凍結模式仍保留間隔）
T=+0.3s    delayedCall(300) → showChunks(0)
           ↓
T=5~10s    第一個 chunk 顯示、新一輪開始
```

### 加總

| 段 | 秒數 | 性質 |
|---|---|---|
| next dialogue gap | 1.1s | 程式設定（可調）|
| **Claude API 生成** | **3~8s** | **主要瓶頸**、不可完全消除 |
| afterWalk delay | 0.3s | 程式設定 |
| 進 showChunks gap | 0.3s | 程式設定 |
| **總計** | **≈ 5~10s** | |

人為設定可控的部分：**1.7 秒**
不可控（Claude 生成）：**3~8 秒**

---

## 三、為什麼 Step 6.3 之後更明顯

Step 6.3 在 prompt 加了反重複區塊（最近 8 輪 tone / angle + 最近 10 句台詞 + 4 條反重複規則），導致：

| 指標 | Step 6.1 | Step 6.3 |
|---|---|---|
| Prompt token 數 | ~600 | ~900~1200 |
| Claude 生成秒數（觀察） | 3~5s | 4~8s |
| 觀眾體感 gap | 4~7s | 5~10s |

Token 多了 50%、生成時間隨之增加。

---

## 四、改善方案（三選一）

### 方案 A：預抓下一輪（推薦）

**原理**：當前對話播到一半就 `background fetch` 下一輪、播完直接拿出來用、不再等。

```
T=0s     第一個 chunk 顯示
T=2s     ★ 開始 background fetch 下一輪 dialogue（同時繼續播）
T=15s    這輪播完
T=15s    next dialogue 已準備好（不用等 API）→ 立刻開始
         gap ≈ 1.7s（純人為延遲）

如果 API 比播放慢 → gap = max(0, API - 播放剩餘) ≈ 0~3s
如果 API 比播放快 → gap = 1.7s（已是純人為延遲）
```

**效果**：gap 從 5~10s 降到 0~3s。

**改動位置**：`OfficeScene.js`
- `_playDialogue` 啟動播放時、`setTimeout(2000)` 後 trigger background `fetch('/api/chat')` 並暫存到 `_nextDialogue`
- 整輪結束時、檢查 `_nextDialogue`、有就直接用、沒就走原本路徑

**改動範圍**：~50 行 JS、不動 server.py、不動 schema

**風險**：
- 需處理 race condition（pre-fetch 沒回來時整輪結束怎麼辦）
- 需處理 seq guard（pre-fetch 跨輪 token 對應）
- 需處理 `_chatInProgress` flag 在 pre-fetch 期間的語意（API 在跑 ≠ 對話在播）

**估時**：1~2 小時實作 + 邏輯走查 + 驗收

---

### 方案 B：縮短人為 gap

**原理**：把 1.1s + 0.3s + 0.3s 三個 delayedCall 砍小。

| 參數 | 現在 | 建議 |
|---|---|---|
| next dialogue gap | 1.1s | 500ms |
| afterWalk delay | 0.3s | 100ms |
| showChunks 進場 | 0.3s | 100ms |
| **省下** | — | ~1 秒 |

**效果**：gap 從 5~10s 降到 4~9s（省一秒）。

**改動位置**：`OfficeScene.js`
- `_playDialogue` 三個 delayedCall 數字
- ~3 行改動

**改動範圍**：極小

**風險**：節奏稍急、上一輪剛收尾就馬上開始下一輪、視覺上略匆忙。

**估時**：5 分鐘

---

### 方案 C：縮 prompt

**原理**：減少 prompt 長度、Claude 生成快一點。

具體：`_build_prompt` 的反重複區塊台詞從 10 句砍到 5 句。

```diff
- recent_lines = recent_lines[-10:]
+ recent_lines = recent_lines[-5:]
```

**效果**：省 ~0.5~1 秒 Claude 時間。

**改動位置**：`server.py` 1 行

**改動範圍**：1 行

**風險**：反重複效果略降（Claude 只看到最近 5 句、有可能跟 6~10 輪前的內容重複）。

**估時**：1 分鐘

---

## 五、推薦組合

**最有感**：A + B（預抓 + 縮人為 gap）→ gap 從 5~10s 降到 0~2s。
**最快做**：B（單獨）→ 5 分鐘省 1 秒。
**最保守**：B + C → 10 分鐘省 1.5 秒、不動架構。

實作優先序建議：

1. 先做 **B**（5 分鐘看效果）
2. 再決定要不要做 **A**（預抓、改動較大但效果最好）
3. **C** 看反重複實測效果決定（如果 Claude 用 5 句就夠避開、就壓）

---

## 六、跟既有機制的相容性

| 既有機制 | 方案 A | 方案 B | 方案 C |
|---|---|---|---|
| `_dialogueSeq` seq guard（Step 5.1）| ⚠️ 需擴展 seq 觸發時機 | ✅ 不影響 | ✅ 不影響 |
| Tone/Angle queue（Step 6.3）| ✅ 不影響 | ✅ 不影響 | ✅ 不影響 |
| Dialogue memory（Step 6.3）| ⚠️ 記憶順序需保證 | ✅ 不影響 | ✅ 不影響 |
| Topic seed/rotate（Step 6.4）| ✅ 不影響 | ✅ 不影響 | ✅ 不影響 |

方案 A 需小心：pre-fetch 的 dialogue memory 寫入時機要在 fetch 後立刻寫、不能延到播放後（不然反重複效果失效）。

---

## 七、不做的方案（過度工程）

- **串流回應（streaming）**：Claude SDK 支援、但 dialogue 一定要等完整 JSON 才能解析、streaming 沒幫助
- **預生成多輪 cache**：複雜度爆增、可能 cache 跟 state 不同步
- **自架 LLM**：直接降成本但延遲不一定更短、且偏離專案範圍

---

## 八、其他觀察

### Gap 看起來更久的心理因素

| 因素 | 影響 |
|---|---|
| 完句後角色立刻回 idle（Step 6.2 改的）| ✅ 動作層面正確、但「視覺鎖死」加重了等待感 |
| 泡泡完全消失（沒有「思考中」過渡）| 觀眾失去「節目正在進行中」的視覺訊號 |
| 場景沒有環境音 / BGM | 真空靜音放大時間感 |

### 可選的視覺補丁（不解 API 慢、但減輕觀感）

- 在 gap 期間、播角色 `thinking` 動畫一兩秒（讓觀眾覺得「他在組織下一句」）
- 加 LED 跑馬燈「下個話題討論中...」
- 背景輕音樂 / 環境音（OBS 端可加、不需動程式）

這些都是「掩蓋」而不是「縮短」、互補使用。

---

## 九、不在本報告範圍

- 實際實作（任何方案都需獨立 BRIEF）
- 小美 PNG 視覺問題（沿用 51~55 BRIEF 提醒、由 Codex 處理）
- 阿明 PNG 升級
- 環境音 / BGM 接線

---

## 十、結語

**這個 gap 不是 bug、是物理限制 + 設計取捨**。
- Claude 生成時間是上限
- 人為 gap 是設計（保節奏感、防語意疊壓）

**最務實的做法**：先用方案 B 省 1 秒（5 分鐘）、再評估方案 A 是否值得（1~2 小時）。

請 GPT 裁示優先序、或直接給 Claude 對應的指令檔執行。
