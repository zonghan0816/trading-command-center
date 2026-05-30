# 24H MVP 滾動討論筆記

**用途：** 在使用者跟 Claude / GPT 討論 24H 直播架構期間、即時記錄每個決定 / 待議題目、避免跨 session 失憶
**寫法：** 邊討論邊 append、不寫長報告、討論結束後再整理成正式 architecture decision doc
**承接：** `60_COST_ANALYSIS_REPORT.md`、`61_24H_LIVESTREAM_STRATEGY_CLAUDE_DISCUSSION.md`、GPT 62 報告

---

## 狀態圖例

- ✅ **已確認** — 雙方共識、會做、等實作時機
- 🟡 **討論中** — 已聊但還沒完全定案
- ❓ **待問** — 尚未討論的策略問題
- ❌ **已否決** — 討論後決定不做

---

## ✅ 已確認項目

### 1. 內容原則：事實基底 + 活潑風格分離

**確認時間**：2026-05-30 對話

**規則**：
- 語氣可以詼諧、諷刺、批評現象、嘲笑荒謬
- 內容只能引用 topic 跟 keywords 裡實際出現的事實
- ❌ 不替任何政黨/政府/公司/個人下道德判斷
- ❌ 不添加新聞沒提到的指控或陰謀論
- ❌ 不說「政府就是XX」「OO一定收錢」這種臆測
- ✅ 可以諷刺「結構」、「現象」、「規律」、不諷刺特定人
- ✅ 觀察、調侃、反諷都歡迎、但事實基底要乾淨

**Tone 調整對照**：

| Tone | 之前（容易跑偏）| 調整後 |
|---|---|---|
| critical | 「政府爛、政策失敗」 | 「這結構年年炸、修了又修還是漏水」 |
| mocking | 「賴清德這次又踩雷」 | 「政策上路一週就翻車、紀錄保持中」 |
| sarcastic | 「不意外、執政黨從不認錯」 | 「不意外、十年前就這樣演、十年後還是這樣」 |

**落腳處**：`server.py` `_build_prompt()` 加 ~20 行規則 + 修 8 種 tone 的 structure 描述
**優先序**：⭐⭐⭐⭐⭐（24H 開放前必做、法律風險最高）
**改動規模**：5 分鐘 prompt 改動

---

### 2. 新聞來源現況：單源 Google News RSS

**確認時間**：2026-05-30 對話

**現況**：
- 唯一來源：`https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant`
- 每 10 分鐘抓 15 條
- 完全免費、不需 API key

**限制**：
- 單源觀點偏 Google 演算法
- 國際 + 國內混雜
- 沒分類、沒在地度評分

**24H MVP 前需評估加多源**：
- 中央社、自由、聯合、ETtoday RSS
- Yahoo 奇摩新聞 RSS
- ⚠️ PTT 不要爬（會被擋）

**落腳處**：News Curation 中間層（24H MVP Step 2 的一部分）
**優先序**：⭐⭐⭐（24H 上線後可漸進加）
**改動規模**：每多 1 個源 +20 行

---

### 3. 抓新聞成本：完全零成本

**確認時間**：2026-05-30 對話

- Google News RSS = 免費、不限流（合理使用下）
- 多源仍 0 成本（都是免費 RSS）
- 只有 Claude curation（去重/分類）會花錢、但 ~NT$72-360/月、極低

---

### 4. 不能用 Claude.ai / ChatGPT Plus 跑 TDT

**確認時間**：2026-05-30 對話

**原因**：
1. 網頁版沒有 API、無法自動化呼叫
2. 用 Selenium 自動化 = 違反 Anthropic ToS、會封帳號
3. 訂閱有每日訊息上限、24H = 1440 次撐不住

**結論**：必須用 Anthropic API、無法用網頁版訂閱省錢

---

## 🟡 討論中項目

### 5. Batch 預生成架構（使用者構想）

**討論時間**：2026-05-30 對話

**使用者原話**：
> 抓 30-50 則新聞 → 用 AI 處理 → 套 prompt 規則 → 2 位 AI 講出來

**Claude 翻譯**：
- 不是用網頁版（不可行）
- 而是「批次 API 預生成」(pre-generation batch)
- 每幾小時抓新聞 → 一次 API 處理出 100-200 段對白 → 存 pool → 24H 慢慢播

**成本對照**：

| 模式 | 月成本 |
|---|---|
| 現況（即時 + Step 6.5 prefetch）| NT$58,800 |
| Batch 預生成 | **~NT$300-450** |
| **省幅** | **99.4%** |

**Trade-off**：
- ✅ 超省錢
- ✅ 品質可預挑（人工或自動）
- ✅ 不會即時翻車
- ❌ 失去「即時新聞反應」感
- ❌ 觀眾留言互動更難（但 YouTube Chat 本來就延後）
- ❌ 變成「半小時前錄的廣播」感

**混合策略選項**：
- 90% 時間放 batch 預生成
- 10% 時間（黃金時段或重大新聞）即時生成
- 月成本 ~NT$2,400

**工程挑戰**：
- Batch 一次生 200 段、品質可能比一次生 3 段差
- 解法：每段獨立 prompt + 共享 system message + Anthropic batch API（折扣 50%）
- Pool 管理機制（refill / 過期 / topic 換）

**跟既有 roadmap 的位置**：
- 等於 GPT Phase E（生成-播放分離）的核心
- 等於 Claude Memory Recycle 進階版 + Production Pipeline 具體實作

**待決定**：
- 走純 batch 還是混合？
- Pool 大小 / refill 頻率
- 黃金時段定義（哪幾小時要 live、哪些 batch）

**落腳處**：24H MVP Step 2-3（核心架構轉折）
**優先序**：⭐⭐⭐⭐⭐（這個方向定了、其他都跟著改）
**改動規模**：中-大、server.py 新增 ~200 行 + 前端 OfficeScene 改播放邏輯

---

## ❓ 待問 / 待討論

（discussion 過程中持續加）

### A. 黃金時段 / live 時段定義
- 哪幾小時要 live 生成？（新聞峰值？觀眾峰值？）
- live 跟 batch 切換規則

### B. Pool 容量 / 過期策略
- 一次預生成多少段？
- 多久算「過期」？（topic 換了還能播嗎？）
- 怎麼從 pool 選下一段？（FIFO / random / context-aware）

### C. 重大新聞處理
- 突發事件怎麼定義？
- 是否強制 break batch 流、進 live 模式？

### D. Memory Recycle 整合
- `wwt_dialogue_memory.json` 跟新的 batch pool 是同個池子嗎？
- 還是分開（live 進 memory / batch 進 pool）？

### E. Anti-repeat 邏輯怎麼搬到 batch
- 現在反重複是「跨輪比較」、batch 是「一次生 200 段」
- 怎麼在 batch 內保證不重複？

### F. 預算護欄落點
- 每月上限 NT$X
- 超過後 fallback 到什麼模式？（memory recycle / 靜音 / 跑馬燈）

### G. 內容過期判定
- 新聞 6 小時後就算「舊聞」嗎？
- pool 裡的對白能播多久？

### H. 主持人「日夜情緒」要不要做
- 深夜 sleepy / 黃金時段 heated
- 對 batch 來說、每段都標時段嗎？還是播放時動態套？

### I. YouTube Live Chat 互動
- 延後到 Phase 5、但要不要在架構上先預留 hook？

### J. Quality Circuit Breaker
- 連續失敗自動切 recycle mode
- batch 模式下還需要嗎？（理論上已經 quality-filtered）

---

## 📋 跨報告引用

| 議題 | 相關報告 |
|---|---|
| 成本拆解 | 60、61、62（GPT）|
| 策略路徑 | 61、GPT 62 |
| Step 6.5 prefetch 命運 | 61 |
| GPT 5 階段 roadmap | GPT 62 |
| 此筆記檔 | **62**（本檔、滾動）|

---

## 🎯 預計結束流程

當所有 ❓ 待問項目都討論完、會合成正式報告：

```
63_24H_MVP_ARCHITECTURE_DECISION.md
  ├─ 最終共識架構規格
  ├─ 5 步實作順序（含時程估算）
  ├─ Step 7.1 / 7.2 / 7.3 指令檔範圍
  └─ 給 GPT 裁示
```

到時這份 62 筆記檔的角色就完成、保留當 audit。

---

## 🗓️ 更新紀錄

- 2026-05-30 建檔、寫入前 4 項已確認 + Batch 預生成討論中
- （下次討論完後 append）
