# Phase 4 Step 4.2 + 5 + 5.5 — Prompt 補強 + Cost Guard + Quality Breaker

**狀態：** 完成、單檔 `server.py` 4 處改動
**承接：** GPT 71 號 review 回覆建議
**檔案動作：** `server.py`（無前端 / 素材改動）

---

## 一、做了什麼

| Step | 內容 | 改動規模 |
|---|---|---|
| **4.2** | prompt 加「聽說 / 網友爆料」包裝過的指控禁用（GPT 71 號唯一補充）| +2 行 |
| **5** | Cost Guard 預算護欄（日 $2 / 月 $50、超支擋下、計費追蹤）| +90 行 |
| **5.5** | Lightweight Quality Breaker（對白後過濾 + safe fallback）| +60 行 |

---

## 二、跳過 GPT 建議的部分

> GPT 71 號 #3 建議「Mode 重命名 + 中央 LED 品牌字」小視覺對齊

**使用者明確說「不用做」**。沿用既有 `discussion/idle` mode 名稱、中央 LED 仍顯示「📌 目前話題」、不改。

理由（推測 + 補充）：
- 視覺改動觀眾無感、不是 24H 跑前的關鍵保護
- 中央 LED 改品牌字屬於「視覺統一」、跟 Cost Guard / Quality Breaker 這種「跑 24H 必須的安全網」優先序不同
- 後續若使用者要做、是 1 小時級別小改、隨時可加

---

## 三、Step 4.2 內容

`_build_prompt` 的「內容維度」加一行：

```diff
 - ❌ 不在兩岸 / 統獨 / 藍綠議題站隊
+- ❌ 不用「聽說」「網友爆料」「網路盛傳」「有人說」「據傳」這種包裝過的指控
+  （把未證實的事用「聽說」開頭並不會讓它變成可以說的事實）
```

→ GPT 觀察到的「常見破口」：包裝詞讓未證實指控聽起來合理。直接 prompt 禁用。

---

## 四、Step 5 Cost Guard 完整規格

### 常數

```python
_PRICE_INPUT_PER_MTOK  = 1.00   # Claude Haiku 4.5 input per MTok USD
_PRICE_OUTPUT_PER_MTOK = 5.00   # Claude Haiku 4.5 output per MTok USD
_DAILY_BUDGET_USD   = 2.00      # ≈ NT$60/天（單日 spike 防護）
_MONTHLY_BUDGET_USD = 50.00     # ≈ NT$1500/月（使用者指定上限）
```

### State 新增欄位（`cost_usage`）

```json
{
  "cost_usage": {
    "today": { "date": "2026-06-01", "amount_usd": 1.23 },
    "month": { "month": "2026-06",   "amount_usd": 12.45 }
  }
}
```

→ 日 / 月切換自動歸零。`normalize_state` 不需動（保留未知欄位）。

### 流程

```
/api/chat 進來
  ↓
_check_budget(state) → 超支？
  ↓ 是 → 503 + paused=true + usage + limits → 不打 Claude
  ↓ 否
打 Claude API
  ↓
回應後 _quality_check_dialogue（Step 5.5）
  ↓
_estimate_cost_usd(input_tokens, output_tokens) → 算這次成本
_add_cost_to_state(st, cost_usd) → 累積到 today + month
_save_state(st)
  ↓
回傳 dialogue
```

### 新增 endpoint

| 方法 | 路徑 | 用途 |
|---|---|---|
| GET | `/api/budget` | 查當前用量 + limits + 是否超支 |
| POST | `/api/budget/reset` | 手動歸零（測試 / 異常處理用）|

### Console log 範例

```
[cost] +$0.00550 (in=3000/out=500) | today $0.034/$2.00 | month $0.412/$50.00
```

→ 隨時看燒到哪、預估還能跑多久。

### 超支行為

| 預算 | 行為 |
|---|---|
| 日 < $2 + 月 < $50 | 正常運作 |
| 日 ≥ $2（單日 spike）| 503 + paused、撐到隔天 00:00 自動解 |
| 月 ≥ $50（達月上限）| 503 + paused、撐到下月 1 號自動解 |

前端目前會在 503 後 3 秒 retry、但 server 回 503 是**瞬間**的（不打 Claude）、retry 不產生成本。如果之後想優化、可以在前端偵測 `paused: true` 改成長休（每分鐘 check 一次而不是 3 秒）。

---

## 五、Step 5.5 Lightweight Quality Breaker 完整規格

### 設計哲學

跟之前做又被 revert 的「新聞過濾」**不一樣**：

| 之前（已 revert）| 現在（GPT 建議的）|
|---|---|
| 過濾新聞 headline 進 cache 前 | 過濾**Claude 已生成對白**回傳前 |
| 黑名單命中就**砍掉新聞**（連 topic 都跳）| 黑名單命中就**替換那一句**（topic 不動）|
| 24H 直播可能斷糧 | 連續性保持、單句換掉觀眾不易察覺 |

### 黑名單分 4 類

```python
_QUALITY_BLOCK_PATTERNS = [
    # 1. 包裝過的指控（Step 4.2 互相支援）
    "聽說", "網友爆料", "網路盛傳", "有人說", "據傳", "傳聞", "據說",
    # 2. 直接指控
    "一定是收", "肯定是收", "就是收了錢", "一定有問題", "肯定有問題",
    # 3. 政治紅線
    "舔共", "舔美", "舔中", "賣台", "親共", "媚共",
    # 4. 過重話題（萬一從 prompt 漏過）
    "性侵", "強姦", "虐童", "戀童", "弒",
]
```

### Safe Fallback Lines（6 條中性對白）

```python
_QUALITY_FALLBACK_LINES = [
    "說真的、這事看下去蠻有意思的、要繼續觀察。",
    "你看、這現象其實年年都這樣演、不意外。",
    "問題就在這、十年前是這樣、十年後還是這樣。",
    "我跟你講喔、這種事看新聞看到都麻木了。",
    "所以呢？結果還是回到同一個結構問題。",
    "不意外啊、套路重複到都能背了。",
]
```

→ 都是符合「事實基底 + 活潑風格」規則的諷刺現象句、不指控人、不站隊、無時效。

### 流程

```python
for line in dialogue:
    text = line["text"]
    for pat in _QUALITY_BLOCK_PATTERNS:
        if pat in text:
            line["text"] = random.choice(_QUALITY_FALLBACK_LINES)
            print(f"[quality] blocked pattern '{pat}'")
            break
```

### Console log 範例

```
[quality] blocked pattern '聽說' in: 聽說那個人有問題、真的假的
[quality] 替換掉 1 句 (本輪共 3 句)
```

### 預期攔截率

- Prompt 規則（Step 4 + 4.2）= 第一道防線、攔 90%+
- Quality Breaker = 第二道防線、攔剩下 5-10% slip 漏網
- 雙重保險、24H 無人值守敢開放

---

## 六、Sanity Check

```bash
$ python -c "import server; print('IMPORT OK')"
IMPORT OK
```

### 整合測試（已執行、3/3 PASS）

```
=== Quality Breaker 測試 ===
  原 4 句、blocked 2 句
  🚫→ aming: 不意外啊、套路重複到都能背了。      ← 替換掉「聽說那個人有問題」
      xiaomei: 油價漲、物價就跟著漲、消費者買單   ← 安全句保留
  🚫→ aming: 所以呢？結果還是回到同一個結構問題。 ← 替換掉「網友爆料說 OO 賣台」
      xiaomei: 結構問題年年都這樣                ← 安全句保留

=== Cost 估算 ===
  3000 input + 500 output → $0.00550
  6000 input + 800 output → $0.01000

=== Budget 檢查 ===
  空 state → over=False
  +$1.5 → over=False
  +$1.0 ($2.5/天) → over=True, reason=daily budget exceeded
```

---

## 七、跑 24H 預估

| 項 | 數字 |
|---|---|
| 平均每輪 input tokens | ~3000 |
| 平均每輪 output tokens | ~500 |
| 平均每輪成本 | ~$0.0055 ≈ NT$0.17 |
| Step 6.5 prefetch 翻倍 | 每實際對話 2 次 API |
| 平均每分鐘對話 | 4 輪 |
| 平均每小時成本 | 4 × 60 × $0.0055 × 2 = **$2.64** |

→ 1 小時就超過日預算 $2！

**結論**：在 Step 5 設定下、**單純打開不能跑 1 小時**。

預期使用模式：
- 你開個 10-20 分鐘看效果、Cost Guard 不會觸發
- 想長時間跑、要 Pool/Batch 架構（Step 6）配合大幅降頻

可選擇放鬆預算：
- `_DAILY_BUDGET_USD = 5.0` → 撐 ~2 小時
- `_DAILY_BUDGET_USD = 10.0` → 撐 ~4 小時
- 或關 Step 6.5 prefetch（流量砍半）

---

## 八、未動的部分

| 項 | 狀態 |
|---|---|
| API schema | ✅ 加了 `cost_usage` 在 state 內、但 normalize 不強制、向下相容 |
| 8 種 tone 描述 | ✅ Step 4.2 只加禁用詞、tone 結構不改 |
| 前端 OfficeScene | ✅ 完全不動（503 retry 既有邏輯處理）|
| 視覺 / 素材 | ✅ 不動（badge + 跑馬燈 + 舊棚景）|
| Mode 名稱 | ✅ 不動（使用者明確說不用做）|
| 中央 LED 「📌 目前話題」 | ✅ 不動（使用者明確說不用做）|
| 既有 8 endpoints | ✅ 不動、只新增 2 個（budget / budget/reset）|

---

## 九、3 個重點驗收方式

### A. 重啟 server.py

```bash
Ctrl+C
python server.py
```

### B. 看 console log

每對話應該看到：
```
[cost] +$0.00550 (in=3000/out=500) | today $0.034/$2.00 | month $0.412/$50.00
```

如果出現指控樣式：
```
[quality] blocked pattern '聽說' in: ...
[quality] 替換掉 X 句 (本輪共 N 句)
```

### C. 查預算狀態

```bash
curl http://localhost:8765/api/budget
```

回應：
```json
{
  "usage": {
    "today": {"date": "2026-06-01", "amount_usd": 1.234},
    "month": {"month": "2026-06",   "amount_usd": 12.345}
  },
  "limits": {"daily_usd": 2.0, "monthly_usd": 50.0},
  "over_budget": false,
  "reason": ""
}
```

### D. 手動歸零（測試用）

```bash
curl -X POST http://localhost:8765/api/budget/reset
```

---

## 十、給 GPT 的回應 / 後續確認

### 跟 GPT 71 號建議的對齊度

| GPT 建議 | Claude 執行 | 對齊 |
|---|---|---|
| Step 4 加「聽說/網友爆料」禁用 | ✅ Step 4.2 加了 | ✅ |
| Step 5 Cost Guard 最優先 | ✅ 做了 | ✅ |
| Lightweight Quality Breaker 緊跟 Cost Guard | ✅ 同 Step 一起做 | ✅ |
| 不要對 tone 加更多禁忌 | ✅ Step 4.2 只加禁用詞、tone 結構未動 | ✅ |
| Mode 重命名 + 中央 LED 品牌字 | ❌ **使用者明確不做** | ⚠️ |
| Pool / Batch 放後面 | ⏳ 還沒做、等 GPT / 使用者下指令 | ✅ |
| 素材重接 later | ⏳ 暫關狀態保持 | ✅ |

### 想問 GPT 的 3 件事

1. **日預算 $2 是否太緊？**
   - 跑不到 1 小時就會觸發
   - 是否該調 $5 / $10 / 或讓使用者跟 GPT 一起決定？
   - 或者你認為「就該緊、強迫做 Pool/Batch」？

2. **Quality Breaker 黑名單夠嗎？**
   - 目前 30+ 字
   - 是否還有 GPT 想到的常見破口模式沒列？
   - 例如「諧音梗」（OO 黨 → 用簡稱、暗示）算不算？

3. **Step 6 下一步直接做 Pool / Batch 嗎？**
   - GPT 71 號的優先序裡 Pool / Batch 是第 4
   - 跳過第 3（Mode 重命名）後是否直接進 Pool / Batch？
   - 還是先停一下、看一週實跑數據再說？

---

## 結語

Phase 4 Step 4.2 + 5 + 5.5 完成、**24H 跑前的法律 + 預算 + 品質三道防線到位**：

1. ✅ Prompt 規則（Step 4 + 4.2）— 源頭防止生成不當內容
2. ✅ Cost Guard（Step 5）— 月 / 日預算護欄、超支立刻擋
3. ✅ Quality Breaker（Step 5.5）— 對白後過濾、漏網靠這裡補

只動 server.py、前端 / 素材 / 視覺都不動、低風險落地。
請 GPT 看完回覆是否走 Step 6（Pool/Batch）、或先觀察一週。
