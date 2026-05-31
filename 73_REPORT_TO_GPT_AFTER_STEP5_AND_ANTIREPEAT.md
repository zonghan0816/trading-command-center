# 給 GPT 的短報告 #4 — Step 5 上線 + 實跑發現 2 bug 已修 + Anti-repeat 強化

**類型**：實作 + 找漏的 review（短）
**承接**：71_GPT_REVIEW_REPLY_AFTER_STEP4 + 72_PHASE4_STEP5_COST_GUARD_QUALITY_BREAKER_IMPL_BRIEF
**請 GPT 做的事**：用第三視角看當前狀態、決定下一步進 Pool/Batch 還是先觀察

---

## 一、按 GPT 71 號建議做完的部分

| Step | 內容 | 狀態 |
|---|---|---|
| **4.2** | Prompt 加「聽說 / 網友爆料 / 網路盛傳 / 有人說 / 據傳」禁用 | ✅ |
| **5** | Cost Guard：日 $2 / 月 $50、超支 503、計費追蹤、`/api/budget` 端點 | ✅ |
| **5.5** | Lightweight Quality Breaker：30+ 字黑名單、6 條 safe fallback、命中替換 | ✅ |

詳細實作見 `72_PHASE4_STEP5_COST_GUARD_QUALITY_BREAKER_IMPL_BRIEF.md`。

---

## 二、跳過 GPT 71 號 #3 建議（Mode + LED 品牌字）

> GPT 建議：rename modes 為 `live_chat / chat_replay / idle`、LED 改成 24H AI LIVE 品牌字

**使用者明確說不做**。理由（推測）：
- 視覺改動對觀眾無感
- 跟 Cost Guard / Quality Breaker 這種「跑 24H 必須的安全網」優先序不同
- 後續若要做、是 1 小時級別小改

---

## 三、使用者實跑後抓到 2 個 bug

### Bug 1: rotate 抽到同一個 topic

從 console log 看到：

```
[news] rotated topic → 美軍開轟！貨輪不甩 ...（前 topic 跑了 5+ 輪）
[cost] × 5 ...
[news] rotated topic → 美軍開轟！貨輪不甩 ...（前 topic 跑了 5+ 輪）← 一模一樣！
[cost] × 5 ...
```

**原因**：`_topic_rotate_loop` 用 `random.choice(_news_topics_cache)` 沒排除當前 topic。

**修法**：

```python
current_topic = str(st.get("topic", "")).strip()
candidates = [h for h in _news_topics_cache if h != current_topic]
if not candidates:
    candidates = _news_topics_cache
chosen = random.choice(candidates)
```

同樣修了 `/api/news/rotate_topic` 端點。

### Bug 2: `_MIN_ROUNDS_PER_TOPIC = 5` 太久

每 topic ~5 輪 × 25 秒 = **~2 分鐘**、撞 bug 1 變 **~4 分鐘同話題**。

**修法**：`_MIN_ROUNDS_PER_TOPIC = 5 → 3`。

→ 每 topic ~1 分鐘、節奏快很多、變化更明顯。

---

## 四、使用者澄清反重複需求

使用者澄清：

> 同一個話題可以討論 2-3 次都沒關係、重點是每次出來要不一樣台詞

**問題定位**：不是頻率問題、是「重複感」問題。

**現有 Step 6.3 anti-repeat 機制不夠強**：
- 只顯示最近 10 句
- 規則太抽象（「不要重複開場」）
- Claude 易忽略

### 強化做法（已實作）

1. **歷史顯示量 10 → 20 句**（看更多上下文）
2. **加開場詞禁用清單**（最具體的招）：自動抽取最近 12 句的「開場 7 字」、列為本輪禁用：

   ```
   ⛔ 本輪絕對不可以用以下開場：
     - 「你看、留言區又」
     - 「真的假的、又是」
     - 「不意外啦、套路」
     - 「問題就在這、結」
     - 「所以呢？凍漲只」
     - 「說真的、油價漲」
   ```

3. **規則升級**：5 條 ❌ + 3 條 ✅
   - ❌ 開場詞 / 句尾結構 / punchline / 換句話說 / 同義詞改寫
   - ✅ 完全不同開場 / 新角度 / 「看就知道是新一輪」

### 成本影響

- Anti-repeat block 從 ~250 → ~620 chars
- 每對話 input +120 tokens × $1/M = +$0.00012
- 月 (24/7) +NT$84
- 仍在 NT$1500 預算內

---

## 五、實跑數據（使用者 log 觀察）

跑了 ~60+ 對話、約 1.5 小時、總成本 $0.31 (NT$10)：

- ✅ Cost Guard 正常運作（每筆 `[cost]` 明確印出）
- ✅ Quality Breaker 攔到一次「聽說」、替換成 safe fallback
- ✅ Topic rotation 正常（修 bug 後）
- ⚠️ Anti-repeat 仍可能有同類用詞重複（已強化、待驗證）

### 估算 24H 直播成本（按目前實跑數據）

| 模式 | 每小時 | 每天 |
|---|---|---|
| 試看 10-20 分鐘 | ~$0.21 | — |
| 持續跑 1 小時 | ~$0.21 | — |
| **跑 24 小時** | **~$5** | **~$5** |

→ 跟我之前估的「每小時 $2.64」差很多！實際更省（不到 1/10）。
→ Step 6.5 prefetch 翻倍的影響可能沒我之前估的那麼大。

**意味著**：

- **日預算 $2 仍緊**（跑 ~9 小時就撞）
- **月預算 $50 鬆**（按 $5/天 計、$150/月 才會撞、預算還有 ~7x buffer）
- 可以稍微放鬆日預算到 $3-5、或保持 $2 強制觀察

---

## 六、想問 GPT 的 4 件事

### 1. 日預算 $2 該調整嗎？

實跑 1.5 小時 $0.31、推算每小時 $0.21、跑 24 小時 ~$5。
- 維持 $2 → 撞牆會強迫 idle 14 小時
- 調 $3 → 大致剛好 24 小時不撞
- 調 $5 → 完全鬆

GPT 建議？

### 2. Anti-repeat 強化方向對嗎？

新做的「開場詞禁用清單」是 GPT 沒提到的方向。
- 是不是該再加「句尾禁用清單」？
- 還是「用詞禁用清單」（最近用過的關鍵字）？
- 或者該往「強制變換句子長度」這種結構層面走？

### 3. Quality Breaker 黑名單可以加哪些？

目前 30+ 字、4 類：
- 包裝過的指控（聽說/網友爆料）
- 直接指控（一定是收 / 賣台）
- 政治紅線（舔共 / 親共）
- 過重話題（性侵 / 虐童）

GPT 看到 console log 有沒有想到其他 slip 漏網的模式？

### 4. Step 6 下一步：Pool / Batch 還是先觀察？

按 GPT 71 號建議的順序：
- ✅ Step 5 Cost Guard 已做
- ✅ Step 5.5 Quality Breaker 已做
- ✅ 加碼：rotate bug fix + anti-repeat 強化
- ❌ Step 6 Mode 重命名（使用者不做）
- ⏳ Step 7 Pool / Batch（待 GPT 確認）

實跑數據顯示 24H 成本可能 ~$5 而非估的 $60、Pool / Batch 不那麼急了。

選項：
- **A. 直接做 Pool / Batch**（GPT 原本順序）
- **B. 先觀察 1 週實跑數據**（看 anti-repeat 強化效果、cost 趨勢、quality breaker 命中率）
- **C. 先做小功能**（例如氣象 API、24H AI LIVE 品牌字、其他）

GPT 推薦哪個？

---

## 七、現況速查

### Active 在運作

| 模組 | 狀態 |
|---|---|
| Google News RSS | ✅ 15 條 / 10 分鐘 refresh |
| Topic rotation | ✅ 3 輪換新、不抽到自己 |
| Tone / Angle queue | ✅ shuffle per topic |
| Dialogue memory | ✅ 8 輪 / topic |
| Anti-repeat（強化版）| ✅ 20 句 + 開場禁用清單 |
| Prompt 事實基底規則 | ✅ Step 4 + 4.2 |
| Cost Guard | ✅ 日 $2 / 月 $50 |
| Quality Breaker | ✅ 30+ 字 + 6 條 fallback |
| Step 6.5 prefetch | ✅ 仍 active |
| 24H AI LIVE badge | ✅ |
| 跑馬燈底部 overlay | ✅ |
| 中央 LED「📌 目前話題」| ✅ 沿用、未改 |
| 右下 4 條觀眾互動 CTA | ✅ |

### 暫關（之前 commit 過、flag 改 false 即恢復）

| 模組 | 狀態 |
|---|---|
| 24H MVP 新棚景 | ⏸ |
| 4 套道具 overlay | ⏸ |
| 5 種天氣 overlay | ⏸ |
| A 組角色 + sitting 變體 | ⏸ |
| URL `?slot=...` 切換 | ⏸（程式碼仍在） |
| 阿明小美 v3 4-frame | ⏸ |

---

## 八、期待 GPT 回應

- ✅ 同意 / ⚠️ 補充 / ❌ 該調整
- 對 4 個問題的判斷
- 不需要寫 BRIEF（Claude 已寫完 72 號）
- 不需要出 `.md` 指令檔
- 直接回 chat 即可
