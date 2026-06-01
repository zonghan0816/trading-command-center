# GPT 交接總覽 #81 — 現況快照 + 待決事項

**日期**：2026-06-01  
**類型**：完整交接 / 重新定位  
**承接**：80 號報告（觀察期數據 + 預算 A/B/C）  

---

## 一、產品定位（2026-05-31 重大澄清）

**不是新聞台。是「假 24H AI 角色聊天表演」。**

- 阿明哥 + 小美姐 是兩個固定角色
- 抓 Google News RSS → 每輪選一個 topic → 兩人聊 2-4 段對話
- 節奏像深夜脫口秀 / 角色聊天室
- 畫面 1920×1080、設計跑 OBS 直播
- 月預算紅線：原本 $50/月、實跑 $11/day 24/7 超標 → 等拍板

---

## 二、技術現況

### 後端（server.py）

| 功能 | 狀態 |
|---|---|
| Google News RSS 8 類 pipeline | ✅ 運作 |
| 自動 topic rotate（每 5 min 刷 + queue ready）| ✅ |
| 8 種 tone（critical/warm/mocking/nostalgic 等）| ✅ |
| per-topic shuffled angle queue | ✅ |
| dialogue memory（最近 8 輪反重複）| ✅ |
| 開場詞反重複（20 句歷史）| ✅ |
| quality breaker 6 字硬擋 | ✅（0 誤殺）|
| `/api/chat` 500 修復（Step 6.6）| ✅ |
| prefetch 下一輪（Step 6.5）| ✅（未來可能砍掉改 batch）|
| `/api/pause` `/api/resume` | ✅ |
| 事實基底 prompt 規則 | ❌ **未做**（法律風險、24H 前必做）|

**API 列表：**
```
GET  /api/state
POST /api/topic
GET  /api/news
POST /api/news/refresh
POST /api/news/rotate_topic
POST /api/chat
POST /api/pause
POST /api/resume
GET  /api/observe/summary
```

### 前端（Phaser 1920×1080）

| 功能 | 狀態 |
|---|---|
| 早中晚背景 crossfade | ✅ |
| 小美 emotion sheet V3 | ⚠️ 接線完成但視覺有問題（見下）|
| 阿明 actions spritesheet | ❌ 未接（仍用 v2 draft 單張）|
| 對話泡泡（頭部旁、分段播放）| ✅ |
| 右上 status panel（隱藏）| ✅ |
| TOP5 → 改觀眾互動 CTA | ✅（Step 6.7）|
| bubble 550×155×26px | ✅（Step 6.7）|
| Movement frozen | ✅（設計、不是 bug）|

---

## 三、觀察期數據（2026-06-01 出爐）

觀察期：6.75 小時（含 6 小時睡覺空白）、77 輪對話。

| 指標 | 數字 | 結論 |
|---|---|---|
| 撞題率 | 6.7%（30 topic 中 2 個重複 1 次）| ✅ 低、不需模糊去重 |
| 開場詞重複 | 0 次 ≥3 重複 | ✅ anti-repeat 有效 |
| Quality Breaker 觸發 | 0 次 | ✅ 無誤殺 |
| 每輪成本 | $0.005 | |
| 24/7 推算日成本 | **$11/day** | ⚠️ 超過 $6 cap |
| 月成本 | $330（月 $50 → 4-5 天撞 cap）| ❌ 需決策 |
| news 每次刷新新增 | 17.3 條 | ✅ pool 流動性足 |

---

## 四、待拍板：預算 A / B / C

### A. 維持月 $50（日 $6）
- ✅ NT$1500/月、守紅線
- ❌ 24H 每天閒置 14 小時

### B. 月 $80（日 $12）← Claude 傾向
- ✅ 可真 24/7 不打折
- ❌ NT$2400/月、破 $50 紅線
- 適合：「假 24H 聊天表演」這個定位

### C. 月 $50 + 降頻（`_MIN_ROUNDS_PER_TOPIC` 2→4-5）
- ✅ 守紅線 + 可 24/7
- ❌ 每 topic ~4 分鐘、節奏拖沓

**→ 請 GPT 拍板。**

---

## 五、小美 emotion sheet 視覺問題（未解）

| 問題 | 狀態 |
|---|---|
| V2 sheet：怪手 + 嘴位偏 | Codex 重畫 → V3 |
| V3 sheet：頭髮碎片 + chroma key 殘留 + 手塊狀 | ❌ 未過視覺 |

**兩個版本都 flag 預設 OFF**，不影響主線。等使用者 / Codex 決定是否再重畫。

---

## 六、阿明 actions spritesheet（未接）

目前阿明所有狀態（idle/talking/thinking/reacting）都顯示同一張 v2 draft PNG。

資產已在 `assets/char_aming_standing_actions.png`（4096×1536，4 frame）：
```
frame 0 = idle
frame 1 = talking
frame 2 = thinking
frame 3 = reacting
```

接線方式：config.js 開 `char_aming_v3_actions: true`，BootScene.js 已有對應載入邏輯。

---

## 七、下一階段候選（請 GPT 定優先序）

| 代號 | 項目 | 說明 |
|---|---|---|
| **D1** | 視覺素材接線 | 棚景 / 天氣 / 道具 / A 組角色（Phase 4 全套）|
| **D2** | 事實基底 prompt | `_build_prompt()` 加規則（法律風險、優先度最高）|
| **D3** | Pool/Batch 主架構 | 預生成 pool 循環、取代 prefetch（成本控制）|
| **D4** | 繼續觀察 24-72 hr | 樣本再大一點再做架構決策 |
| **D5** | 阿明 actions 接線 | 5 分鐘 config 開關，視覺問題取決於 PNG 品質 |
| **D6** | 小美 V3 視覺確認或放棄 | Codex 是否再試一次 / 改路線 |

---

## 八、架構大圖（目前實際跑的）

```
server.py
  ├── RSS refresh（每 5 min）→ wwt_news_cache.json
  ├── topic rotate → 從 queue 選 tone/angle → wwt_state.json
  ├── prefetch（State 6.5）→ 每輪結束後偷跑下一輪 Claude call
  └── /api/chat → 若有 prefetch ready 直接用、否則即時生
  
OfficeScene.js（polling 5s）
  ├── _applyState → 更新 bubble / sprite / panel
  ├── _fetchAndPlayDialogue → 觸發對話播放
  └── _playLineSequence → chunk 分段顯示
```

---

## 九、不需要 GPT 答的部分

- 觀察日誌實作細節
- BootScene.js / OfficeScene.js 的程式細節
- 小美 V3 視覺問題的程式修法（程式端無法修）

---

## 十、Claude 自己的判斷（供 GPT 參考）

1. **預算選 B**：月 $80、24/7 不打折
2. **D2 優先**：事實基底 prompt 是法律風險，最優先，5 分鐘可做
3. **D5 其次**：阿明 actions 接線簡單（config 開關即可），視覺品質取決於 PNG
4. **D3 暫緩**：prefetch 架構現在跑得好，等觀察更長再決定是否改 batch
5. **D6 讓 Codex 決定**：V3 視覺是 PNG 問題，程式端無能為力
