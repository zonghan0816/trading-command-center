# Phase 3 — 24 小時直播策略討論（Claude 補充意見）

**狀態：** 討論報告（非實作 BRIEF）
**承接：** `claude_24H_COST_STRATEGY_DISCUSSION.md`（GPT 版討論）+ `60_COST_ANALYSIS_REPORT.md`（成本分析）
**目的：** 在 GPT 策略的基礎上、補上 Claude 視角看到的盲點 + 7 個 GPT 沒提到的建議。使用者最終裁示用哪一條路。

---

## 〇、前情提要

使用者目標：**真的要做 TDT 24 小時 YouTube 直播**。

不是「上 YT 看效果」這種短期測試、而是「**長期經營一個 24/7 AI 鄉民談話頻道**」的方向。

承認的問題：**24/7 成本太高**（無優化 NT$57k/月、即使優化也要 NT$10k+/月）、**且優化路徑會動到架構**（生成-播放分離）。

---

## 一、跟 GPT 策略的對齊與分歧

### ✅ 完全同意 GPT 的部分

| GPT 主張 | Claude 看法 |
|---|---|
| 24/7 串流 ≠ 24/7 LLM 生成 | ⭐⭐⭐⭐⭐ 這是整個策略的核心觀念 |
| 先觀測再決定（Phase A）| ⭐⭐⭐⭐⭐ 不要 over-engineer |
| 預算護欄（Phase B）必做 | ⭐⭐⭐⭐⭐ 不管走哪條都得做 |
| Prompt caching（Phase C）優先 | ⭐⭐⭐⭐ 對、但效果可能比想像低 |
| 不換模型 | ⭐⭐⭐⭐⭐ Claude 中文鄉民感是強項 |
| Phase E 是「生成播放分離」 | ⭐⭐⭐⭐⭐ 確實是核心架構轉折 |

### ⚠️ 我認為 GPT 估太樂觀 / 沒談清楚的部分

#### 1. Prompt caching 實際效益沒想像中大

GPT 跟我的成本報告都暗示 caching 省 ~50%。但實際拆解：

| 區段 | Token | 是否 cache |
|---|---|---|
| 主持人設定 | ~200 | ✅ |
| Tone structures × 8 | ~400 | ✅ |
| Angle notes × 8 | ~300 | ✅ |
| 字數規則 / 風格 / 禁用 | ~400 | ✅ |
| 輸出格式 | ~50 | ✅ |
| Topic block | ~150 | ❌（每輪換）|
| Angle block | ~80 | ❌（每輪換）|
| **Anti-repeat block** | **~400** | **❌（每輪換）** |

→ 動態部分佔 ~30%、即使 caching、那 30% 仍付全價。**實際省幅 40-50%、不是 60%+**。

仍值得做、但別期待月成本砍一半那麼漂亮。

#### 2. Phase D「節目編排」的 YouTube 演算法風險

GPT 提案的編排：

```
:30-60 idle + BGM + 跑馬燈   ← 半小時沒對話
```

**YouTube 演算法會懲罰這種長時間靜止**。能成功 24/7 的頻道（LoFi Girl、Synthwave Radio）靠的是「持續視覺/聽覺變化」、不是「真的靜止」。

→ idle 段不能真的 idle、要有東西在動（見後面 Memory Recycle 建議）。

#### 3. Phase E 完成後、Step 6.5 prefetch 變廢碼

這點 GPT 沒明說。**Phase 6.5 prefetch 整套邏輯會被 Phase E 取代**：

| 機制 | Step 6.5 視角 | Phase E 視角 |
|---|---|---|
| `_nextDialogue` cache | 前端臨時暫存 | Server queue 持有 |
| `_prefetchInProgress` flag | 前端 race control | Server scheduler 狀態 |
| 2 秒後觸發 prefetch | 前端 timing | Server 自己排程 |
| `_dialogueSeq` token | 前端 seq guard | Server 出 ID + 前端 ack |
| `_fetchAndPlayDialogue` 三層 fallback | 前端決策 | Server queue 自動補 |

→ Phase E 改完後 Step 6.5 的 ~200 行 prefetch 邏輯**整段刪除**。投入要心理準備。

---

## 二、Claude 補充 — GPT 沒提到的 7 個方向

### 1. ⭐ Queue 不是 buffer、是 production pipeline

GPT 把 queue 當「fetch 結果暫存」。Claude 視角應該是「**節目製作流水線**」：

```
Server Scheduler
  ↓ 排程「下一段該產什麼類型」
  ↓ (critical_news / hot_takes / quick_quips / recap / idle_filler)
  ↓
Generation Worker
  ↓ 對應 prompt template + 對應預算
  ↓ Claude API
  ↓
Quality Filter
  ↓ 檢查 JSON / 字數 / 禁用詞
  ↓ 不過就回頭再產（不送進 queue）
  ↓
Topic-tagged Queue
  ↓ 按話題、按段落類型分組
  ↓
Playback Selector
  ↓ 依目前節目段、選相應內容
  ↓
前端播
```

→ Queue 不是 FIFO、是「**內容池**」。Scheduler + Filter 是 GPT 的 Phase E 沒涵蓋的、但對 24/7 品質至關重要。

### 2. ⭐⭐⭐ Memory Recycle 進階版：自動精選

`wwt_dialogue_memory.json` 已經累積對話歷史、但目前只用來做「反重複參考」。可以做更多：

```python
# 每天結束時用 Claude 跑一次「今日精選」
def daily_curation():
    today_dialogues = load_today_memory()
    prompt = f"""從以下 200 段對話、選出最有梗的 20 段、回傳 JSON 陣列。
標準：有觀點、有梗、不空泛、台灣鄉民味重。"""
    selected = claude_call(prompt)  # 單次成本 NT$0.5
    save_to("wwt_highlights.json", selected)
```

idle 段播這些精選：

| 效益 | 說明 |
|---|---|
| 0 成本 | 純從 highlights 撈、不打 API |
| 不靜止 | 觀眾不會看到死寂畫面 |
| 品質保證 | 都是過濾過的好對白 |
| 連續性 | 路人觀眾感覺「主持人很活躍」 |

進階：12 個月後做「年度精選」、變成節目資產（可剪成精華影片再上 YT）。

### 3. ⭐⭐ 三層觀眾理解模型

24/7 直播裡 **99% 觀眾是路過 1-10 分鐘就走**。內容設計應該假設：

| 觀眾類型 | 看多久 | 需要什麼 |
|---|---|---|
| 路人甲 | 1-3 分鐘 | 立刻看懂在聊什麼、有 hook |
| 隨意逛 | 5-15 分鐘 | 有梗、有情緒起伏 |
| 死忠粉 | 30 分鐘+ | 連續性、人設深度 |

**現在 prompt 假設「觀眾從第 1 句聽到第 N 句」、不對。**

實作建議：

```python
# 加在 prompt 規則區段
## 觀眾假設
- 假設大部分觀眾剛打開直播 30 秒
- 每段對白起手要能讓路人秒懂主題（不要假設觀眾知道前一輪講什麼）
- 但又不能每段都重複介紹（會顯得僵）
- 折衷：第一句要有 topic 關鍵字、不要從代名詞起手
```

### 4. ⭐⭐ News Curation 中間層

現在 RSS 抓 15 條、隨機選一條當 topic。問題：

| 問題 | 範例 |
|---|---|
| 重複話題 | 同事件多家媒體報、變 3 次相同 topic |
| 太敏感 | 殺人案、未成年、性侵 |
| 太冷門 | 地方小新聞、沒人關心 |
| 太相似 | 連 3 條都是政治 |
| 太國際 | 「美伊敲定 60 天停火」對台灣觀眾遙遠 |

需要 **News Producer 層**：

```python
def filter_and_balance_topics(raw_rss_15):
    # Step 1: semantic dedup（用 Haiku 跑一次 NT$0.05）
    deduped = claude_dedup(raw_rss_15)
    # Step 2: 敏感過濾（內建黑名單）
    safe = filter_blacklist(deduped)
    # Step 3: 分類（政治/經濟/社會/娛樂/科技/在地）
    categorized = categorize(safe)
    # Step 4: 配比平衡（每類保留 2-3 條）
    balanced = balance_ratio(categorized)
    # Step 5: 在地度評分（台灣相關性）
    return rank_by_locality(balanced)
```

每小時跑一次、不增加 chat 成本。

### 5. ⭐⭐⭐ 時段感知 host 情緒

GPT 提 time-of-day 排程、但沒提**情緒模型**：

```python
def get_host_mood(hour):
    if 6  <= hour < 10:  return "fresh"      # 早晨清醒
    if 10 <= hour < 14:  return "energetic"  # 中午活躍
    if 14 <= hour < 18:  return "focused"    # 下午分析
    if 18 <= hour < 22:  return "heated"     # 晚間激辯（黃金時段）
    if 22 <= hour < 24:  return "casual"     # 晚場閒談
    else:                return "sleepy"     # 深夜疲態
```

塞進 prompt：

```
## 時段氛圍
現在是凌晨 3 點、阿明應該有點累、語氣放慢、字數少。
小美可能在發呆、偶爾才回一句。
不要用早上的活力感。
```

→ 觀眾感覺「主持人是真實存在的人」、有日夜節奏、不是無情機器。

對 24/7 直播尤其重要 — 觀眾在不同時段切進來、感受到不同氛圍、增加回流動機。

### 6. ⭐⭐⭐ YouTube 互動 hook（24/7 直播的殺手鐧）

**GPT 完全沒提這個、但這是真直播 vs 假直播的分水嶺**。

24/7 AI 直播能成功的關鍵是「觀眾留言被回應」：

```
觀眾留言：「房價真的太誇張」
  ↓
YouTube Live Chat API 收到
  ↓
過濾 / 取樣（不可能每句都回）
  ↓
塞進 prompt context
  ↓
阿明：「剛剛留言區有人說『房價真的太誇張』、我跟你講喔...」
  ↓
觀眾：「我被回應了！」→ 留下、推薦給朋友
```

實作複雜：
- 需 YouTube OAuth + Live Chat API
- 需留言過濾（敏感詞、廣告、惡意）
- 需取樣（不可能每則都回）
- 需 prompt 模板支援「response to viewer」

但**這是 0 → 1 的差別**。沒互動的 24/7 AI 直播 = 看 ATM。
有互動的 24/7 AI 直播 = 像有人陪聊的電台。

### 7. ⭐ Quality Circuit Breaker

24/7 跑久了會遇到「Claude 偶爾大爆走」：

| 問題 | 頻率 |
|---|---|
| 生不出來（API timeout）| 1-2% |
| 生超怪（hallucination）| 0.5% |
| 生敏感（觸黑名單）| 0.1% |
| 連續 5 段相似內容 | 中等 |
| 字數平均過低 | 偶爾 |

需要「自動踢自己一腳」機制：

```python
class QualityBreaker:
    def check(self, dialogue):
        # 連續 5 次失敗 → 切到 memory recycle 30 分鐘
        if self.consecutive_failures >= 5:
            switch_to_recycle_mode(duration_min=30)
            send_alert_to_admin()
        
        # 偵測到敏感詞 → 不送進 queue、回頭再生
        if self.detect_sensitive(dialogue):
            return REJECT
        
        # 連續 3 段內容過於相似 → 強制 angle 換邊
        if self.too_similar_to_recent(dialogue):
            force_angle_change()
        
        # 字數平均過低 → 換 prompt template
        if self.avg_length < 15:
            switch_template("long_form")
```

→ 24/7 必須有「自動踢自己一腳」能力、不能等人工干預。

---

## 三、我會給的修正 roadmap

跟 GPT 的對照：

| GPT Phase | Claude 補充 / 修正 |
|---|---|
| A 觀測 | + 同時收集「哪些對白好 / 爛」當訓練資料 |
| B 預算護欄 | + 加 Quality Circuit Breaker |
| C Prompt caching | 同（但要管理預期效益）|
| D 節目編排 | + Memory Recycle（idle 不靜止）+ 時段情緒 + News Curation |
| E 生成-播放分離 | + Production Pipeline（不只 queue、要有 Scheduler / Filter / Selector）|
| **F（新增）** | YouTube Live Chat 互動接入 — 真假直播分水嶺 |
| **G（新增）** | Memory 自動精選 / 內容資產累積 |

### 改動規模對照

| Phase | 改動範圍 | 預估工時 |
|---|---|---|
| A 觀測 | 0 程式改動、純看數據 | 2-4 小時實跑 |
| B 預算護欄 | server.py ~50 行 | 半天 |
| **B+ Quality Breaker（Claude 加）** | server.py ~80 行 | 1 天 |
| C Prompt caching | server.py ~30 行 | 半天 |
| D 節目編排（含 Memory Recycle + 時段情緒）| server.py ~200 行 + OfficeScene ~100 行 | 3-5 天 |
| E 生成-播放分離（含 Production Pipeline）| 大改、新建 ~10 個 module、Step 6.5 prefetch 砍掉 | 1-2 週 |
| **F YouTube Chat 互動（Claude 加）** | 新 module + OAuth + 過濾邏輯 | 1-2 週 |
| **G Memory 自動精選（Claude 加）** | server.py ~50 行 + 新 daily cron | 1 天 |

---

## 四、三條路徑方案

讓使用者選擇進度節奏：

### 路徑 1：「先省再說」（最保守）

```
A (觀測 2-4hr)
  → B (預算護欄)
  → C (prompt caching)
  → 在現有架構上跑、不大改
```

**月成本**：NT$10-15k
**特點**：保留 Step 6.5 prefetch、播放體驗不變、純省 token
**適合**：先試水半年、看流量再決定要不要大改

### 路徑 2：「節目化」（中等改動）

```
A → B + Quality Breaker
  → C
  → D (節目編排 + Memory Recycle + 時段情緒)
  → G (Memory 自動精選)
  → 不做 E、保留 Step 6.5 prefetch
```

**月成本**：NT$5-8k
**特點**：有節目感、idle 段不無聊、品質有自動保護
**適合**：經營 6-12 個月、慢慢養觀眾

### 路徑 3：「正式頻道」（完全重構）

```
A → B + Quality Breaker
  → C
  → D
  → E (生成-播放分離、Production Pipeline)
  → F (YouTube Chat 互動)
  → G
  → Step 6.5 prefetch 整段砍掉
```

**月成本**：NT$3-5k
**特點**：真直播感受、互動、可規模化
**適合**：目標是「成為 YT 頻道、追求訂閱與廣告收入」

---

## 五、我的建議：路徑 2

理由：

1. **路徑 1 太保守**：保留 prefetch 但又想 24/7、prefetch 帶來的 token 翻倍會卡死預算。
2. **路徑 3 太激進**：1-2 個月開發、流量還沒驗證、可能做出沒人看的頻道。
3. **路徑 2 是甜蜜點**：3-5 天開發、月成本可承受、有節目感、可長期運作。

路徑 2 做完跑 3-6 個月、若流量起來再升級到路徑 3。

---

## 六、Step 6.5 的命運

不管走哪條路、Step 6.5 prefetch 都會被影響：

| 路徑 | Step 6.5 命運 |
|---|---|
| 路徑 1 | 完整保留、純化的 cost optimization |
| 路徑 2 | 保留、但 idle 段會被新邏輯繞過 |
| 路徑 3 | **整段砍掉**、Phase E queue 取代 |

→ **Step 6.5 投入的 1-2 天開發、在路徑 3 下會白費**。但不算白做、它解決的問題（gap 縮短）讓我們有時間做策略決策。

---

## 七、需要回答的策略問題

請使用者 / GPT 在裁示前先回答：

1. **時間框架**：3 個月內想看到什麼成果？1 年呢？
2. **預算上限**：每月願意燒多少？NT$5k / 10k / 20k+？
3. **目標 audience**：你想吸引哪種觀眾？路人、特定議題粉、政治評論愛好者？
4. **品牌定位**：「AI 鄉民聊新聞」、「AI 政治評論」、「AI 24 小時陪聊」、其他？
5. **競品**：你有看過哪些 24/7 AI 直播頻道？有哪些是你想參考的？
6. **互動需求**：YouTube 留言要不要被回應？這個改動很大、但效益極高。

不同答案會導向不同路徑、不要在沒回答前就動工。

---

## 八、不在本報告範圍

- 實作（任何方案都需獨立 BRIEF、由 GPT 給指令檔）
- YouTube 串流技術設定（OBS / RTMP / encoder）
- 廣告 / 監視 / 法律風險（24/7 AI 直播的內容責任歸屬）
- 小美 PNG 視覺問題（沿用 51-57 BRIEF 提醒）

---

## 九、結語

GPT 的策略**方向正確、架構紮實**、但有幾個盲點：

1. **節目編排 idle 段 YouTube 不喜歡** — 需要 Memory Recycle 補
2. **Prompt caching 效益沒想像中大** — 預期管理
3. **Phase E 會讓 Step 6.5 變廢碼** — 心理準備
4. **24/7 真正的殺手鐧是觀眾互動** — GPT 沒提
5. **時段情緒模型很便宜但很有感** — GPT 沒提
6. **News Curation 中間層** — GPT 沒提
7. **Quality Circuit Breaker** — 24/7 必備、GPT 沒提

最後決定權在使用者。我跟 GPT 都是參謀、提供視角、不是主帥。

請 GPT 再裁示一次、看看是否同意 Claude 的補充、然後決定走哪條路徑。
