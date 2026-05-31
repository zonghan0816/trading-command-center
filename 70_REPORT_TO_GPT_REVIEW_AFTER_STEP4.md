# 給 GPT 的短報告 #3 — Phase 4 Step 4 完成後 Review

**類型**：找漏的 review（短）
**長度目標**：1 頁內
**承接**：69_PHASE4_STEP4_FACT_BASED_STYLE_IMPL_BRIEF
**請 GPT 做的事**：用第三視角看當前狀態、找盲點、建議下一步

---

## 一、這段時間做了什麼

| Step | 內容 | 狀態 |
|---|---|---|
| **Step 4** | 事實基底 + 活潑風格 prompt 規則（24H 公開前法律阻擋）| ✅ |
| Step 3.1 | 暫退 24H MVP 新素材（18 個 config flag 改 false、只保留 badge + 跑馬燈）| ✅ |
| Step 3.0 | URL `?slot=...` 切時段 + A 組角色 + _animKey helper | ✅（暫關）|
| Step 2.x | 24H AI LIVE badge + 跑馬燈 + prop overlay | ✅（badge / 跑馬燈 active）|
| Prefetch topic 比對 | 換 topic 不硬切 cache、讓上一輪自然講完 | ✅ |
| 小調 | bubble 480×135 / 字級 26 / chunkMs 慢 / pause API / TOP5 改 4 條 CTA | ✅ |

---

## 二、目前畫面狀態（你看到的）

```
左上: 24H AI LIVE badge
右下: 4 條觀眾互動 CTA
底部: 跑馬燈滾動
中央: LED「📌 目前話題」+ topic + ● LIVE 閃爍
舞台: 舊版 wwt_studio_background_*.png 三套（自動 crossfade）
角色: 阿明 v2 draft 單張 + 小美 6-frame actions
無:   24H MVP 新棚景、A 組角色、道具、天氣 overlay（暫關）
```

---

## 三、Step 4 prompt 規則的衝擊

### 新加進 prompt（~50 行）

- 🛡️ 「事實基底 + 活潑風格」整章
- 諷刺方向：諷刺現象 vs 指控個人對照（5 ❌ + 5 ✅）
- 邊界判定（事實 / 臆測 / 人 / 現象）
- 8 種 tone 加邊界提醒（critical/mocking/humorous/sarcastic 高風險）

### 預期攔截

- ❌ 「政府爛 / 執政黨從不認錯」
- ❌ 點名特定政治人物 / 公司
- ❌ 兩岸 / 統獨 / 藍綠站隊
- ❌ 「OO 一定收了錢」陰謀論

### 保留

- ✅ 諷刺現象 / 結構 / 規律
- ✅ 鄉民口語 / 詼諧 / 嘲諷
- ✅ 有溫度有梗

### 成本

每對話 +NT$0.01、月 24/7 +NT$25、預算 NT$1,500 內無感。

---

## 四、想問 GPT 的 4 件事

### 1. Step 4 prompt 規則夠嚴嗎？

- 是否還有 GPT 想到的指控樣式沒擋到？
- 是否還有政治紅線該明寫進 prompt？
- 是否「邊界判定」描述得太抽象、Claude 抓不到？
- 是否有反面例子應該補（給 Claude 看「絕對不要這樣」）？

### 2. 8 種 tone 的「邊界提醒」會不會讓 Claude 太保守？

- critical / mocking / humorous / sarcastic 每個都加了「❌ + ✅」
- 加總可能讓 prompt 顯得「禁忌太多」
- Claude 會不會變得太溫和、失去諷刺力道？
- 是否該把 ❌ + ✅ 合併成更簡潔的版本？

### 3. 24H MVP 主架構（Pool / Batch / Cost Guard）什麼時候做？

當前狀態：
- ✅ Prompt 規則（Step 4）— 解政治風險
- ❌ Cost Guard — 還沒做、預算護欄缺
- ❌ Pool / Batch — 即時 `/api/chat` 仍是主流程
- ❌ News Curation — RSS 抓完直接用、無過濾

如果現在開始 24H 跑、會：
- 每天燒 ~NT$60-80（依 Step 6.5 prefetch 翻倍計）
- 沒月上限保護
- 沒 quality breaker（連續失敗無 fallback）

GPT 認為下一步該做什麼順序？建議是：
- A. Cost Guard 先（5 分鐘改 server.py）
- B. Pool / Batch 大改架構（1-2 週）
- C. 中央 LED 改 24H AI LIVE 品牌字（小改動、視覺統一）
- D. 接氣象 API（中央氣象署 OpenData、視覺加分）
- E. Quality Breaker（敏感詞過濾、跟 Step 4 雙重保險）

### 4. 暫退新素材的決策對嗎？

使用者剛要求「先還原、只留 badge + 跑馬燈」。理由：
- A 組角色 sprite 比例 / 位置可能還沒調好（沒實測就退了）
- 道具 overlay 在 evening 時段擋住中央 LED（50% 縮、bottom-center、alpha 0.85 後改善、但使用者選擇全退）
- 天氣只有白天版、晚上 sunny 看起來不合理

GPT 認為：
- 該繼續用舊版直到所有素材都驗證 OK？
- 還是分批接、配合 Cost Guard / Pool 後一起走？
- 還是該跟 Codex 要「夜版天氣」+「props 縮小版」素材、把已做的接好？

---

## 五、Claude 的建議（給 GPT 比對）

我自己覺得下一步應該：

**最高優先**：**Step 5 Cost Guard 預算護欄**
- 5 分鐘改 server.py
- 加 `state.monthly_cost_usage` 累積追蹤
- 加 `state.monthly_budget_limit = 50` (USD ≈ NT$1500)
- `/api/chat` 入口檢查、超過就回 503
- 超過時前端切到「pause 模式」、不再 fetch

**次優先**：Step 6 模式命名重整 + 中央 LED 改品牌字
- mode: discussion/idle → live_chat / chat_replay / idle
- LED 中央改顯示「24H AI LIVE」品牌字 + 軟性 topic 註記

**第三優先**：Pool / Batch 主架構（大改、月省 90%+）

**先不做**：素材重接（等 Pool 架構後一起做、避免重工）

請 GPT 確認 / 修正這個順序。

---

## 六、不需要 GPT 答的部分

- 跑馬燈 / badge / TOP5 已驗收 OK
- Bubble 大小 / chunkMs 已 fine-tuned
- Prefetch topic 比對邏輯穩
- Step 4 prompt 規則靜態驗證 5/5 PASS（未實跑 live 但邏輯正確）

---

## 期待 GPT 回應格式

- ✅ 同意 / ⚠️ 補充 / ❌ 不對應該這樣
- 不需要寫 BRIEF
- 不需要出 `.md` 指令檔
- 直接在 chat 答覆、Claude 收到後決定下一步
