# Claude 討論報告 — 24 小時直播成本策略

**狀態：** 討論報告，非實作 BRIEF  
**目的：** 評估 TDT 若真的要做 24 小時 YouTube 直播，如何避免 API 成本爆炸。  
**承接：** `60_COST_ANALYSIS_REPORT.md`

---

## 一、核心判斷

如果 TDT 真的要做 24 小時直播，不建議照目前架構「24 小時不停呼叫 `/api/chat`」。

比較合理的方向是：

```txt
做 24 小時頻道
不是做 24 小時 LLM 連續生成器
```

也就是 YouTube / OBS 畫面可以 24 小時在線，但 AI 對話不需要 24 小時無間斷產生。

---

## 二、目前架構的問題

目前 Step 6.5 後：

- 前端播放一輪對話時，會 prefetch 下一輪。
- 等於每個視覺輪約 2 次 `/api/chat`。
- 一輪約 12-15 秒。
- 若 24/7 不停跑，月成本可能到 `60_COST_ANALYSIS_REPORT.md` 估算的 NT$57,000 等級。

這不是 bug，而是架構選擇造成的成本型態。

---

## 三、建議方向：節目排程型 24/7

把直播分成不同節目狀態，而不是一直讓主持人講話。

範例：

```txt
每小時 00-10 分：AI 主持人講最新新聞
每小時 10-20 分：TOP5 / 今日話題輪播
每小時 20-30 分：主持人短評 / 快問快答
每小時 30-60 分：棚景 idle + BGM + 跑馬燈 + 等下一段
```

效果：

- YouTube 端仍是 24 小時有畫面。
- 使用者感覺像一個自動化頻道。
- `/api/chat` 呼叫量可直接降 50%-90%。
- 更像「節目」，不是兩個人不自然地永遠講不停。

---

## 四、建議方向：生成與播放解耦

目前是：

```txt
前端快播完
  ↓
即時呼叫 /api/chat
  ↓
Claude 生成
  ↓
立刻播放
```

長期 24/7 比較建議改成：

```txt
server 定時批次生成一批 dialogue
  ↓
存入 queue / json
  ↓
前端從 queue 慢慢播放
  ↓
queue 低於門檻才補生成
```

好處：

- 可以控制「每天最多生成幾輪」。
- 可以離峰先生成、直播時只播放。
- `/api/chat` 失敗不會立刻造成畫面空窗。
- 之後可以加入重播、精選、低成本 idle 段。

不建議第一步就做很大重構，但這是 24/7 的正確架構方向。

---

## 五、第一優先技術優化：Prompt Caching

若要長時間跑，`60_COST_ANALYSIS_REPORT.md` 的方案 A 應該是第一優先。

理由：

- 改動相對小。
- 不影響節目節奏。
- 不影響 Claude 中文語氣品質。
- 固定 prompt 占比高，適合 cache。

建議 Claude 後續若要實作，先不要改播放節奏，先做 prompt 拆分：

```txt
固定段：主持人人設、tone 說明、angle 說明、輸出規則、禁用規則
動態段：topic、keywords、recent memory、當輪 angle/tone
```

再用 Anthropic prompt caching 標記固定段。

---

## 六、必做保護：每日預算閥門

如果要真的跑 24/7，必須加預算保護。

建議至少有：

```txt
每日 API 預算上限
每小時最多生成輪數
queue 補生成上限
成本超標後切 idle mode
```

例如：

```txt
每日預算 NT$300
達標後：
  - 停止呼叫 /api/chat
  - 繼續顯示棚景
  - 輪播 TOP5 / 新聞標題
  - BGM 繼續
  - 等隔日重置
```

這比單純降 token 更重要，因為可以防止忘記關機造成月底爆帳。

---

## 七、不建議立即做的事

### 1. 不建議立刻關掉 Step 6.5 prefetch

prefetch 讓節奏順很多。若只是私人測試或每天短時段直播，先保留。

真正 24/7 時，可以改成：

```txt
節目段落中開 prefetch
idle / 輪播段落關 prefetch
```

### 2. 不建議立刻換模型

便宜模型可以省很多，但 TDT 的核心是中文鄉民語氣。

Claude Haiku 4.5 目前語氣效果已經接上，先做 caching / 排程 / 預算閥門，比換模型安全。

### 3. 不建議現在大改 server 架構

目前專案還在 YouTube 私人直播驗收前。

建議先測 2-4 小時真實效果，再決定是否進入 24/7 架構改造。

---

## 八、建議 roadmap

### Phase A：先測

1. YouTube 私人或不公開直播 2-4 小時。
2. 觀察畫面、節奏、console、API 使用量。
3. 確認 Step 6.6 `/api/chat` 500 已修好。

### Phase B：成本安全

1. 加每日 / 每小時 API 呼叫統計。
2. 加每日預算上限。
3. 超標後切 idle mode。

### Phase C：Prompt Caching

1. 拆 `_build_prompt` 固定段與動態段。
2. Anthropic system content 加 cache control。
3. 驗證成本下降。

### Phase D：節目排程

1. 加 program mode：
   - live_talk
   - headline_roll
   - idle_bgm
   - recap
2. 不同 mode 決定是否呼叫 `/api/chat`。
3. 讓 24 小時直播變成頻道排程，而不是無限對話。

### Phase E：生成播放解耦

1. dialogue queue。
2. server 背景補生成。
3. 前端只消費 queue。
4. queue 不足時才 live fetch fallback。

---

## 九、目前建議結論

若使用者只是先上 YouTube 看效果：

```txt
不用現在做成本優化
先私人直播測 2-4 小時
```

若使用者真的要準備 24/7：

```txt
第一步不是換模型
第一步是成本安全閥門 + prompt caching
第二步才是節目排程
```

最佳方向：

```txt
24 小時在線
AI 分時段講話
idle / TOP5 / BGM 填滿非對話時段
API 有每日預算上限
```

這樣比較像可長期經營的自動化頻道。
