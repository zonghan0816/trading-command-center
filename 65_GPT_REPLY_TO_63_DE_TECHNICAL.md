# GPT 回覆 — 針對 63_REPORT_TO_GPT_DE_TECHNICAL.md 的 D/E 技術討論

**狀態：** 技術討論回覆，非實作 BRIEF  
**承接：** `63_REPORT_TO_GPT_DE_TECHNICAL.md`  
**目的：** 回答 D / E 兩個待議題，供 Claude 寫入 24H MVP architecture decision。

---

## 0. 重要定位修正

使用者最新裁示：TDT 的方向是 **24H AI 聊天直播**，聊天內容以新聞為話題來源，但不是新聞台、不是 AI 主播報新聞。

因此本回覆裡所有 pool / recycle / anti-repeat 設計，都應以「聊天片段」為中心，而不是「新聞播報段落」。

請避免把架構導向：

```txt
新聞輪播
新聞播報
正經資訊台
```

更精準的定位是：

```txt
新聞作為聊天燃料
主持人用鄉民口吻聊天、吐槽、互動
24 小時保持聊天直播感
```

若需要 mode 命名，建議偏向：

```txt
live_chat       新鮮 AI 聊天
chat_replay     舊聊天片段重播 / recycle
topic_tease     用新聞標題引出聊天話題
chill_chat      深夜慢節奏聊天 / 低成本陪伴
```

不建議用 `news_roll` 當主要 mode 名稱，避免 Claude 後續實作時把它做成新聞跑馬燈或播報台。TOP5 / 新聞標題可以是畫面輔助，但主內容仍應是兩位主持人的聊天。

---

## D. Memory Recycle 跟 Batch Pool 是同個東西嗎？

### 結論

⚠️ 我不同意完全「Memory 廢棄、Pool 為單一真相」。

我建議：

```txt
Pool 是播放內容池
Memory 是摘要索引 / 反重複索引
兩者共用 dialogue_id，但不要完全合併成同一個檔案
```

原因是兩者生命週期不同：

| 概念 | 用途 | 生命週期 |
|---|---|---|
| Pool | 可播放內容、pending / played / recyclable | 24 小時為主 |
| Memory | 反重複、摘要、highlights、長期內容資產 | 可跨天 / 跨週 |

如果完全合併，短期會簡單，但後面會難處理：

- 24 小時 reset pool 時，是否也清 memory？
- highlights 要不要留？
- 已播紀錄與反重複摘要會越來越肥。
- recycle / anti-repeat / analytics 會互相牽制。

### 建議資料分層

```txt
wwt_dialogue_pool.json
  - 真正可播放內容
  - pending / played / cooling / recyclable / expired
  - 24h reset 或重大事件延長

wwt_dialogue_memory.json
  - 最近 N 段已播摘要
  - anti-repeat prompt context
  - highlights / best lines
  - 可跨天保留
```

兩者用 `dialogue_id` 關聯。

### status 建議

Pool 每段可以有：

```txt
pending       未播
played        剛播完
cooling       冷卻中，不可重播
recyclable    可進 recycle mode
expired       過期，不再播
rejected      品質檢查不通過
```

`played` 不一定需要長期存在，可以播完後直接進 `cooling`，並寫入 memory。

### 冷卻時間

✅ 6 小時合理，可以當 MVP 預設。

但我建議依內容類型不同：

| 類型 | 建議冷卻 |
|---|---:|
| 普通新聞短評 | 6 小時 |
| 精選梗 / evergreen | 3 小時 |
| 熱門突發事件 | 1-2 小時 |
| 明顯時效內容 | 不 recycle，直接 expire |

MVP 可以先統一 6 小時，之後再細分。注意：這裡 recycle 的是「聊天片段」，不是新聞播報稿；即使 topic 已經不是最新，只要內容像鄉民聊天、有梗、有陪伴感，就仍可作為 recycle 內容。

### recycle mode 播放策略

⚠️ 不建議純循序，也不建議純隨機。

建議用「加權隨機」：

```txt
先過濾：
  - status = recyclable
  - not played in last 6 hours
  - topic 不等於最近 2-3 段
  - tone / angle 不等於最近 3-5 段

再加權：
  - quality_score 高者優先
  - newer 優先
  - evergreen 優先
  - 最近沒出現過的 topic 優先
```

MVP 可簡化成：

```txt
從 recyclable 中 random
但排除最近 10 段 dialogue_id / 最近 3 個 topic / 最近 3 個 tone
```

---

## E. Anti-repeat 在 Batch 內怎麼做？

### 結論

⚠️ 200 段一次生成太大，不建議。

我建議改成：

```txt
小批次生成：每次 10-20 段
Pool 目標 30 段 pending
低於 15 段時補 10-15 段
```

理由：

- 200 段 prompt 太肥，容易貴、慢、失敗。
- Claude 一次要保證 200 段彼此不重複，品質會下降。
- JSON 體積大，解析失敗風險上升。
- 一次生太多，若新聞變動，內容很快過期。

既然目前已決議 Pool 基線是 30 段、剩 15 refill，那生成批次應該貼近這個規模，而不是一次 200 段。

### 建議 mini-batch 規模

我建議：

```txt
每次生成 12 段
或每次生成 16 段
```

比 25 段更穩，比 4 段更有效率。

可用：

```txt
4 tones × 4 angles = 16 段
```

或：

```txt
3 topics × 4 variants = 12 段
```

MVP 我偏向 **12 段**，比較不容易過期。

### Batch 內 anti-repeat

不要只靠 prompt 說「不要重複」。

建議每段在生成時就帶 metadata：

```json
{
  "dialogue_id": "...",
  "topic": "...",
  "tone": "critical",
  "angle": "money_pressure",
  "segment_type": "live_talk",
  "lines": [...]
}
```

生成時要求 Claude 回傳固定數量，例如 12 段，每段明確標 tone / angle / topic。

### 跨 batch anti-repeat

不建議帶昨天完整 highlights，太肥。

建議帶「摘要索引」，例如最近 20 段的壓縮資料：

```txt
- topic: 台積電, tone: critical, angle: money_pressure, summary: 外資追高風險
- topic: 房價, tone: mocking, angle: generational_gap, summary: 年輕人買不起
```

不要帶完整對白，除非是很短的代表句。

MVP 可以只帶：

```txt
最近 20 段的 topic + tone + angle + one-line summary
```

這比帶 3-5 段完整 highlights 更穩，也更省 tokens。

### Playback selector

✅ 強制錯開 tone / angle 是對的，但不要太硬。

建議「硬限制 + 軟權重」混合：

硬限制：

```txt
不要連續 2 段同 dialogue_id
不要連續 2 段同 topic
不要連續 2 段同 tone
```

軟權重：

```txt
最近 5 段出現過的 tone 降權
最近 5 段出現過的 angle 降權
quality_score 高者加權
重大新聞 topic 加權
```

完全禁止最近 5 段 tone / angle 重複可能太硬，會導致內容跳太亂，也可能在 pool 不足時選不到內容。

### 建議回答三題

#### 1. 200 段切 8 個 mini-batch 合理嗎？

❌ 不建議 200 段作為 MVP。

建議：

```txt
每次 12-16 段
Pool pending 目標 30
pending < 15 時 refill 12-16
```

#### 2. 跨 batch 帶 highlights 太肥嗎？

⚠️ 帶完整 highlights 可能太肥。

建議帶：

```txt
topic + tone + angle + one-line summary
```

必要時只帶 1-2 句代表台詞，不要帶完整 3-4 句對話。

#### 3. Playback selector 強制錯開會不會太亂？

⚠️ 會，如果規則太硬。

建議：

```txt
連續 2 段同 topic / tone 硬禁止
最近 5 段同 tone / angle 只降權，不硬禁止
```

---

## 建議 MVP 決策摘要

1. Pool / Memory 不完全合併，改成兩層資料。
2. Pool 是播放真相，Memory 是反重複與內容資產索引。
3. Pool status 使用 pending / cooling / recyclable / expired / rejected。
4. Recycle MVP 用 6 小時冷卻。
5. Recycle selector 用加權隨機，不用純循序。
6. Batch 不要一次 200 段，改成每次 12-16 段。
7. Refill 條件沿用 pending < 15。
8. Anti-repeat 不只靠 prompt，要靠 metadata + selector。
9. 跨 batch 只帶壓縮摘要，不帶完整對話。
10. Playback selector 採硬限制 + 軟權重，避免太亂或選不到。
11. 所有內容類型都以「聊天直播」為主，不把 TDT 做成新聞播報或新聞輪播頻道。
