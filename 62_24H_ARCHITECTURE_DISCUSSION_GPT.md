# GPT 討論報告 — TDT 24H 直播架構重新判斷

**狀態：** 討論報告，非實作 BRIEF  
**目的：** 重新討論 TDT 若確定要往 24 小時直播發展，應如何調整架構。  
**承接：** `60_COST_ANALYSIS_REPORT.md`、`61_24H_LIVESTREAM_STRATEGY_CLAUDE_DISCUSSION.md`  
**重要前提：** 使用者方向已明確偏向 24 小時直播，不是短期 YouTube 測試。

---

## 一、核心重新判斷

如果 TDT 的目標確定是 24 小時直播，現在就不能只把問題當成「API 成本優化」。

這其實是產品型態改變：

```txt
目前架構：即時 AI 對話展示系統
目標架構：24H 自動化節目頻道系統
```

目前架構是：

```txt
前端快播完
  ↓
呼叫 /api/chat
  ↓
Claude 即時生成
  ↓
前端播放
```

這適合 demo、短時段直播、私人測試。

但 24 小時直播需要的是：

```txt
排程
  ↓
決定節目模式
  ↓
控制是否生成新內容
  ↓
過濾 / 保存 / 重用內容
  ↓
前端播放
  ↓
成本與異常保護
```

所以重點不是「要不要把某個 delay 調長」或「要不要關 prefetch」，而是要把 TDT 從即時對話系統，升級成可長時間運作的節目系統。

---

## 二、為什麼現在就要討論架構

使用者原本只是發現成本過高，但成本問題揭露的是架構問題。

若照現在 Step 6.5 架構長跑：

- AI 對話幾乎不停產生。
- prefetch 讓 `/api/chat` 呼叫次數翻倍。
- 反重複 prompt 讓 input token 偏大。
- 沒有節目段落概念。
- 沒有預算上限。
- 沒有 recycle。
- 沒有 production queue。

這會導致：

```txt
成本高
節奏過密
內容疲乏
半夜也像黃金時段一樣吵
遇到異常需要人工處理
```

因此如果方向是 24H，就應該現在定架構，不應該先一路補小功能到後面再重構。

---

## 三、我對 Claude 路徑的重新評價

Claude 在 `61_24H_LIVESTREAM_STRATEGY_CLAUDE_DISCUSSION.md` 提出三條路徑：

```txt
路徑 1：先省再說
路徑 2：節目化
路徑 3：正式頻道
```

我現在的看法：

### 路徑 1 太短視

只做預算護欄與 prompt caching，可以降低成本，但仍保留「即時對話 demo」的本質。

它比較像：

```txt
把現在系統省一點錢
```

而不是：

```txt
讓它變成 24H 頻道
```

### 路徑 3 太激進

完整 production pipeline、YouTube chat、內容池、filter、selector、queue server、OAuth 等都做，確實是正式頻道方向。

但現在就做會太大，因為：

- 開發量可能 1-2 週以上。
- 很多產品假設還沒驗證。
- Step 6.x 還在打底。
- 使用者現在需要的是先看清方向，不是立刻進入大重構。

### 我建議：24H MVP 架構

介於路徑 2 和路徑 3 之間。

目標不是完整正式頻道，而是先把「可控成本、可長時間運作、有節目感」的骨架建立起來。

---

## 四、建議的新路線：24H MVP 架構

我建議下一階段定義為：

```txt
Phase 4 / Step 7：24H MVP Architecture
```

或類似名稱。

它不應該一開始就大改所有東西，而是先建立五個核心能力。

---

## 五、24H MVP 的五個核心能力

### 1. 成本閥門 Cost Guard

24H 第一個必備能力不是排程，也不是美術，是成本護欄。

至少需要：

```txt
今日 / 本小時 API 呼叫次數
今日 / 本小時估算成本
每日預算上限
每小時生成上限
超標後切換到非生成模式
```

這是安全底線。

如果沒有 Cost Guard，24H 直播最危險的不是品質問題，而是忘記關機後月底爆帳。

### 2. 節目模式 Program Modes

不要讓主持人永遠 live_talk。

至少先定義：

```txt
live_talk      新鮮 AI 對話
recycle        播舊對話 / 精選片段
news_roll      新聞標題 / TOP5 輪播
idle_bgm       棚景、BGM、輕量動態
```

注意：idle 不能真的完全靜止，否則對 YouTube 與觀眾都不好。即使 idle，也要有畫面小變化、跑馬燈、時間、TOP5 或舊梗。

### 3. Memory Recycle

24H 成本的關鍵是「已花錢生成過的內容要變資產」。

目前已有 `wwt_dialogue_memory.json`，但它主要用於 anti-repeat。24H 應該把它升級成內容來源之一。

先不需要自動精選很複雜，可以先做簡化版：

```txt
把最近成功生成的 dialogue 保存成 replay pool
recycle mode 時從 pool 撈出來播放
可依 topic / time / tone 做簡單篩選
```

這能讓非 live_talk 時段不用打 API，但畫面仍有對話內容。

### 4. Prompt Caching

Prompt caching 仍是必要優化，但我同意 Claude 的補充：不要過度期待它單獨解決問題。

它的定位應該是：

```txt
降低 live_talk 單次成本
但不能取代節目排程與 recycle
```

因此 prompt caching 應該做，但不應被視為 24H 的唯一解。

### 5. 簡單節目排程 Scheduler

先不做完整 production pipeline，但需要一個簡單 scheduler 決定目前模式。

例如：

```txt
黃金時段：live_talk 比例高
深夜：recycle / news_roll 比例高
預算快到上限：自動進 recycle
RSS 有重大新話題：插入 live_talk
```

這會讓 24H 直播變得像節目，而不是無限對話。

---

## 六、暫時不建議第一階段做的事

### 1. 不建議現在做 YouTube Live Chat 互動

這是好功能，而且長期很重要。

但它涉及：

- YouTube OAuth
- Live Chat API
- 留言安全過濾
- prompt 插入策略
- spam / abuse 處理

現在做太早。

建議等 24H MVP 穩定後，再作為 Phase 5 或正式頻道升級。

### 2. 不建議現在換模型

換便宜模型能省很多，但會直接影響 TDT 核心：中文鄉民語氣。

在節目骨架還沒定前換模型，容易同時失去品質與方向。

### 3. 不建議現在做完整 Production Pipeline

Claude 提的 production pipeline 是正確長期方向，但不應第一步就做完整。

現在先做：

```txt
簡單 scheduler
recycle pool
cost guard
mode-based playback
```

之後再演進成：

```txt
Scheduler → Generation Worker → Quality Filter → Content Pool → Playback Selector
```

### 4. 不建議立刻砍 Step 6.5 prefetch

Step 6.5 會提高成本，但它解決了短時段觀看的節奏問題。

24H MVP 可以先讓 prefetch 只在 `live_talk` 模式啟用，其他模式不啟用或繞過。

不需要現在整段砍掉。

---

## 七、我建議的下一階段順序

若要往 24H 走，我建議不是直接開工，而是先做架構決策檔。

### Step 0：架構決策

產出：

```txt
62_24H_ARCHITECTURE_DECISION.md
```

決定：

- 24H MVP 有哪些 mode。
- 每小時 live_talk 佔比多少。
- 每日預算上限。
- 超標後切到哪個 mode。
- recycle pool 用什麼資料。
- Step 6.5 prefetch 在哪些 mode 保留。
- 哪些功能延後。

### Step 1：Cost Guard + Usage Counter

先知道自己花多少。

### Step 2：Program Modes + Scheduler

讓系統能在不同 mode 間切換。

### Step 3：Recycle Pool

讓非 live_talk 時段不用打 API 也能播內容。

### Step 4：Prompt Caching

降低 live_talk 單次成本。

### Step 5：Quality / Safety 基礎版

基本敏感詞、連續失敗切 recycle、JSON 失敗監控。

---

## 八、建議的 24H MVP 節奏範例

先用保守可控的比例。

### 白天 / 晚間

```txt
每小時：
20 分鐘 live_talk
20 分鐘 recycle
10 分鐘 news_roll
10 分鐘 idle_bgm / TOP5
```

### 深夜

```txt
每小時：
5 分鐘 live_talk
25 分鐘 recycle
20 分鐘 news_roll
10 分鐘 idle_bgm / TOP5
```

這樣直播是 24 小時在線，但 AI 新生成內容不是 24 小時全速。

---

## 九、產品定位補充

我認為 TDT 的 24H 定位不該是：

```txt
兩個 AI 永遠聊天
```

而應該是：

```txt
AI 鄉民新聞電台
```

它可以有：

- 即時新聞熱聊
- 舊梗回放
- 今日 TOP5
- 深夜低語 / 放慢節奏
- 黃金時段激辯
- 重要新聞插播

這樣比較合理，也比較有機會長期經營。

---

## 十、我目前的結論

Claude 的 `61_24H_LIVESTREAM_STRATEGY_CLAUDE_DISCUSSION.md` 方向是對的，尤其是：

- Memory Recycle
- Quality Circuit Breaker
- News Curation
- 時段情緒
- Production Pipeline 長期方向

但我建議不要立刻走完整路徑 3。

我的建議是：

```txt
先定 24H MVP 架構
先做 Cost Guard / Program Modes / Recycle / Scheduler
Prompt Caching 跟著做
YouTube Chat / 完整 Queue Pipeline / 換模型 延後
```

這樣可以避免兩個極端：

```txt
只做小修 → 仍然不是 24H 架構
一次大重構 → 太早、太重、風險太高
```

真正下一步應該是討論並產出：

```txt
62_24H_ARCHITECTURE_DECISION.md
```

等使用者裁示後，再拆成 Claude 可實作的 Step 7.1 / 7.2 / 7.3。
