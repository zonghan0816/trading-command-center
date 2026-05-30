# 給 GPT 的短報告 #1 — D/E 技術討論

**類型**：技術問題（短）
**長度目標**：500-800 字
**承接**：`62_24H_MVP_DISCUSSION_NOTES.md` 第 D / E 兩個待議題
**請 GPT 回答的是**：純技術方向、給 Claude 實作參考、不需出指令檔

---

## 已決議的 context（只列必要部分）

- 24H MVP 主架構：**Batch 預生成 + Pool 循環**（95%）+ **熱門新聞首次 live**（5%）
- Pool 容量：30 段未播為基線、剩 15 段觸發 refill
- 內容過期：24 小時後 reset、突發大事可延 2-3 天
- 月預算上限：NT$1,500
- 4 時段（早/午/晚/深夜）× 2 組角色 × 同棚換道具

---

## ❓ 議題 D：Memory Recycle 跟 Batch Pool 是同個東西嗎？

### 目前現況

`wwt_dialogue_memory.json` 存最近 8 輪對話、用途是**反重複參考**（傳給 Claude prompt 提示避開）。

### Batch 架構下的疑問

| 場景 | 問題 |
|---|---|
| Pool（batch 預生的 200 段對白）| 是「待播內容」、會被消耗 |
| Memory（昨天的對話歷史）| 是「已播紀錄」、給 prompt 反重複參考 |
| **兩者是同一個池子嗎**？ | 還是兩個獨立檔？ |

### Recycle mode 觸發時（連續 5 次 API 失敗）

- 要從哪個池子撈備用對白？Pool 還是 Memory？
- 同一段對白能在 recycle mode 內重播嗎？
- 多久內不重播同段（避免觀眾立刻發現）？

### 我傾向的設計（請 GPT 確認 / 補正）

```
單一 Pool 結構：
  - 每段對白有 status: pending / played / recyclable
  - pending：待播
  - played：剛播完、推進 recyclable 等冷卻 6 小時
  - recyclable：冷卻完、可被 recycle mode 重播

Memory file 廢棄、合併到 Pool
反重複參考改用「最近 played 50 段」當 prompt context
```

### 請 GPT 回答

1. 同意「Memory 廢棄、Pool 為單一真相」嗎？
2. 冷卻時間 6 小時合理嗎？太短 / 太長？
3. recycle mode 該循序播還是隨機播？

---

## ❓ 議題 E：Anti-repeat 在 batch 內怎麼做

### 現況（前端視角）

每輪 `/api/chat` 帶反重複 block、Claude 看到「最近 8 輪 tone / angle / lines」就盡量避開。

### Batch 架構下的挑戰

一次叫 Claude 生 200 段對白、3 個層次的重複問題：

| 層次 | 範例 | 預期解法 |
|---|---|---|
| **Batch 內部** | 第 50 段跟第 30 段語氣很像 | Batch prompt 加「200 段內彼此不重複」要求 |
| **跨 Batch** | 今天 batch 跟昨天 batch 主題重疊 | 帶昨天精選 5 段進新 batch 的 prompt |
| **播放時** | Pool selector 連續挑出相似 2 段 | Selector 演算法看 tone / angle 標籤、強制錯開 |

### 我傾向的設計（請 GPT 確認 / 補正）

```
Batch 生成時：
  - 把 200 段切成 8 個 mini-batch、每 25 段一組
  - 每個 mini-batch 限定不同 (tone, angle) 組合
  - 例如 batch[0] = critical+money_pressure、batch[1] = sarcastic+history_compare、...
  - 8 個組合×25 段 = 200 段、每段內部仍可變化

跨 Batch 反重複：
  - 新 batch 的 system prompt 帶昨天 highlights 摘要 (3-5 段)
  - 提示「避免重複以下內容方向」

Playback 反重複：
  - Pool selector 不連續挑同 tone / 同 topic 的兩段
  - 強制最近 5 段 (tone, angle) 不重複
```

### 請 GPT 回答

1. 200 段切 8 個 mini-batch 合理嗎？或建議切法不同（10×20 / 4×50）？
2. 跨 batch 帶 highlights 太肥（會吃 input token）？
3. Playback selector 強制錯開 tone / angle 會不會反而讓內容跳太亂？

---

## 期待的 GPT 回答格式

- ✅ 同意 / ⚠️ 我有補充 / ❌ 不對應該這樣
- 不需要寫 BRIEF
- 不需要出 `.md` 指令檔給 Claude
- 直接在這份報告下面 append 回應就好、或在 chat 答覆

Claude 收到 GPT 回應後、會把共識寫進 `63_24H_MVP_ARCHITECTURE_DECISION.md`、然後開始實作。
