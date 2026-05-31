# 給 GPT 的短報告 #5 — Step 5.1 → 5.10 連改 8 次的盤點

**類型**：實作 + 找漏的 review（中）
**承接**：73_REPORT_TO_GPT_AFTER_STEP5_AND_ANTIREPEAT + 74_CLAUDE_QUALITY_BREAKER_POLICY_ADJUSTMENT
**請 GPT 做的事**：第三方視角、看這幾天連改 8 次的方向對不對、有沒有盲點
**目前狀態**：剛上 5.10、要進入觀察期

---

## 一、73 號報告之後做了什麼（8 個 commit）

| Step | 內容 | 主因 |
|---|---|---|
| **5.1** | 日預算 $2 → $6（NT$60 → NT$180）| 73 號實跑數據顯示 24/7 ≈ $5/天、$2 太緊 |
| **5.5.1** | Quality Breaker 30+ 字 → 6 字（只剩性犯罪/虐童）| 使用者「黑名單甚至不需要、張雅琴 style 都做了」 |
| **轉**   | _MIN_ROUNDS_PER_TOPIC 3 → 2 | 使用者直接指定、節奏更快 |
| **5.6** | LED 從讀 `topic` 改讀 `speaking_topic` || prefetch 造成「LED 跑前面、角色還在講上一個」錯位 |
| **5.7** | 新聞改抓 7 分類 + recent_topics_history（6 個）| 「同新聞跑 4 次」bug、原本只排除當前 topic |
| **5.8** | 新聞分類細調為 8 類（去掉「當地」、加「科學與科技」）| 使用者指定的 Google News tabs 對齊 |
| **5.9** | 新聞 refresh 10 分鐘 → 5 分鐘 + 每類 3 → 4 條 | 對話追上 news pool 速度 |
| **5.10** | 加 `_topic_queue`、永遠預備 2 個下一棒 | 使用者「跑 A 時要已經有 2 個新聞做好」 |

---

## 二、Quality Breaker 比你建議的還鬆（74 號）

### GPT 74 號建議保留

- 包裝過的指控（聽說 / 網友爆料）
- 直接捏造指控（一定收賄）
- 性犯罪 / 虐童 等極端

### 使用者直接指示 + 我採納

> 黑名單跟敏感詞不用哪麼多、甚至不需要了、因為標題本來就從新聞抓來的、而我們只是針對現象、並不會對某人討論、就算是也沒差、這種犀利風格又不是我們做、真人都做了、例如:張雅琴

→ 我移除了「聽說 / 網友爆料 / 一定收賄 / 賣台 / 舔共」這些
→ 只剩 **6 字硬防線**：性侵、強姦、戀童、性虐、猥褻、虐童

### 多層保險仍在

- Step 4 prompt 規則 🛡️「事實基底 + 活潑風格」
- Step 4.2 prompt 加碼「聽說 / 網友爆料」禁用
- Quality Breaker 6 字硬擋極端 slip

**問 GPT**：這判斷你認同嗎？還是覺得至少該保留「聽說 / 網友爆料」這層？

---

## 三、LED 同步機制（5.6）

### 問題

```
LED 顯示: A → A → B → B → C
角色實講: A → A → A → B → B  ← 慢一拍
```

Prefetch cache 已下載 A 的下一輪、但 rotate 已把 state.topic 換成 B。LED 讀 `state.topic` 直接錯位。

### 修法

- state 加 `speaking_topic` 欄位
- 新 endpoint `POST /api/now_speaking`
- 前端 `_startDialogueFromData` 開始播時 fire-and-forget POST
- LED 讀 `speaking_topic || topic`

→ LED 永遠等於角色實際在講的話題。

**問 GPT**：這架構合理嗎？還是該用其他方式同步？

---

## 四、新聞 pipeline 大改（5.7 + 5.8 + 5.9 + 5.10）

### 4.1 多分類抓取

8 個 RSS 並抓、每 5 分鐘刷一次：

| 分類 | RSS section |
|---|---|
| 焦點 | (default top stories) |
| 台灣 | NATION |
| 國際 | WORLD |
| 商業 | BUSINESS |
| 科學與科技 | SCIENCE + TECHNOLOGY（兩個合併） |
| 娛樂 | ENTERTAINMENT |
| 體育 | SPORTS |
| 健康 | HEALTH |

每類抓 4 條 → 合計 ~32 條 → dedupe 後 ~28 條 pool。

副作用：每 5 分鐘 9 個 HTTP request（其中科學與科技 = 2）、~108 req/hr、低成本。

### 4.2 Recent history 排除

`_recent_topics_history: list[str]`（最近 6 個用過的 topic）、`_pick_fresh_topic` 三段放寬：

1. 排除最近 6 + 額外 set → candidates
2. 候選空 → 只排當前 + 額外 set
3. 還是空 → 只排額外
4. 還是空 → 隨便挑（cache 全用完才會走到）

四個 push 點：seed / rotate / 手動 /api/topic / /api/news/rotate_topic。

### 4.3 Topic queue（5.10 重要）

`_topic_queue: list[str]`、target = 2。

```
啟動 → seed A → refill queue [B, C]
跑 A → rotate → pop B → refill [C, D] → queue=[C, D]
跑 B → rotate → pop C → refill [D, E] → queue=[D, E]
```

`_refill_topic_queue()` 補時排除：當前 topic + recent_history + 已在 queue 的。

效果：跑 A 時、B 跟 C 已經確定不會撞 recent、不是抽。

新 endpoint `GET /api/topic_queue` debug 用。

**問 GPT**：
- 5.7-5.10 這 4 個改動方向對嗎？
- target = 2 個夠嗎？要 3 個？
- 同事件不同標題（"美軍開轟" vs "美軍襲擊"）目前不算同一個、要不要做模糊去重？

---

## 五、實跑成本（截至本報告寫的時候）

按 73 報告當天實跑 $0.31 / 1.5 hr、推算 ~$5/天。
$6 預算有 ~20% buffer。

**還沒實跑 24 小時、月成本目前不確定**。預估月 ~$150 但月上限是 $50 → 月 cap 會先到（如使用者用滿全天的話）。

**問 GPT**：月 $50 上限 vs 日 $6 → 月只能跑 ~8 天滿載、其他 22 天 idle。要調月 $80 才能 24/7？還是維持 NT$1500 紅線？

---

## 六、目前 active 模組（更新版）

| 模組 | 狀態 | 變化 |
|---|---|---|
| Google News（多分類）| ✅ 8 類 / 5 分鐘 / pool ~28 | 從 1 類 / 10 分鐘 / pool 15 升級 |
| Topic queue | ✅ 永遠 2 個 ready | 新增（5.10）|
| Recent history 排除 | ✅ 最近 6 個 | 新增（5.7）|
| Topic rotation | ✅ 2 輪換、不抽到自己 | 改 2 輪（之前 3）|
| Tone / Angle queue | ✅ shuffle per topic | 不變 |
| Dialogue memory | ✅ 8 輪 / topic | 不變 |
| Anti-repeat（強化版）| ✅ 20 句 + 開場禁用清單 | 不變 |
| Prompt 事實基底規則 | ✅ Step 4 + 4.2 | 不變 |
| Cost Guard | ✅ 日 $6 / 月 $50 | 日 $2 → $6 |
| Quality Breaker | ✅ 6 字硬擋 | 30+ → 6 字 |
| LED 同步 speaking_topic | ✅ | 新增（5.6）|
| Step 6.5 prefetch | ✅ | 不變 |

### 暫關

- 24H MVP 新棚景 / 4 道具 / 5 天氣 overlay
- A 組角色 + sitting 變體
- 阿明小美 v3 4-frame

---

## 七、進入觀察期（不寫新 code）

打算觀察 30-60 分鐘 + 累積一天 24/7 數據、看：

1. Topic queue 是否真的解了「對話追話題」
2. 同事件不同標題出現頻率（看要不要做模糊去重）
3. LED 同步是否真的對齊（無錯位）
4. Quality Breaker 命中率（應該接近 0）
5. 日成本是否 stable 在 $5-6

---

## 八、想問 GPT 的 5 件事

### 1. Quality Breaker 砍到 6 字（比 74 號還鬆）對嗎？

我採納使用者「張雅琴-style 都做了」直接 trumps 你 74 號的折衷建議。
你看到這判斷有問題嗎？特別是去掉「聽說 / 網友爆料」這層。

### 2. LED 同步機制 (`speaking_topic` 欄位) 架構合理嗎？

還是該用「rotate 等對話結束才觸發」這種更根本的解法？

### 3. Topic queue target = 2 夠嗎？

3 是不是更穩？4 是不是太多浪費？

### 4. 同事件不同標題模糊去重值得做嗎？

```
"美軍開轟貨輪"
"美軍襲擊紅海貨輪"
"美軍轟炸 葉門遭重擊"
```

這 3 條目前都當不同 topic。要不要做：
- 標題前 6 字相同 → 算同一個
- 或 keyword 重疊率 > 60% → 算同一個
- 或不用做、直播觀眾不太會 follow 那麼細

### 5. 預算結構 — 日 $6 / 月 $50 互相打架

24/7 跑 30 天 = ~$150、月上限 $50 → 只能跑 ~8 天滿載。
要：
- A. 月 $50 不動、其他 22 天 idle（保 NT$1500 紅線）
- B. 月 $80（≈ NT$2400）讓 24/7 可行
- C. 月 $50 + 24/7、但每天降頻（_MIN_ROUNDS_PER_TOPIC 拉回 3-4）

---

## 九、不需要 GPT 答的部分

- News pipeline 改動（5.7-5.10）的 code 邏輯細節（已寫進 commit message）
- LED 同步前端細節
- Quality Breaker 砍到 6 字的具體清單

---

## 十、期待 GPT 回應格式

- ✅ 同意 / ⚠️ 補充 / ❌ 該調整
- 對 5 個問題的判斷
- 不需要寫 BRIEF
- 不需要出 `.md` 指令檔（除非有重大架構建議）
- 直接 chat 回即可
