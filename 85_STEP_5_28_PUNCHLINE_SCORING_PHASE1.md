# Phase 4 Step 5.28 — Shorts Pipeline Phase 1（Punchline 評分 + 報告）

**類型**：實作紀錄 + 多階段計劃定義
**承接**：使用者問「有什麼增加觀眾的行銷方式」→ 選 A：自動 Shorts pipeline
**狀態**：Phase 1 ✅ 上線、Phase 2/3 待後續

---

## 整體 Shorts Pipeline 三階段規劃

```
Phase 1 ✅ 評分 + 報告（無需外部工具）
    server.py 加全文 archive
    scripts/score_punchlines.py 用 Claude 評分
    出 markdown 報告供人工審查
        ↓
Phase 2 ⏳ 影片剪輯（需 ffmpeg + OBS 設定）
    OBS 連續錄影 或 24h replay buffer
    根據 archive 時間戳 + 評分、用 ffmpeg 切 30-60 秒片段
    自動加字幕 + emoji 標題
        ↓
Phase 3 ⏳ YT 自動上傳（需 YT Data API v3）
    Google Cloud Console 申請 OAuth credentials
    YT Shorts metadata（標題 / 描述 / hashtags / thumbnail）
    每天自動上傳 1-3 支
```

**為什麼分三階段**：每階段都能獨立驗證價值。Phase 1 先確認 Claude 評分品質夠不夠當挑片依據、不夠就改 prompt、夠了再進影片處理。

---

## Phase 1 程式改動

### 1. server.py 加 dialogue archive

新增 `_append_dialogue_archive()`：每輪對話完整 lines 持久化到 `wwt_dialogue_archive.jsonl`。

跟 observe log 分開：
- **observe log** = 摘要統計（給觀察期報告、成本分析）
- **dialogue archive** = 全文素材（給 Shorts pipeline）

呼叫位置：在 `_log_observe("dialogue", ...)` 前面、確保兩個都寫。

### 2. scripts/score_punchlines.py 評分腳本

- 讀 archive、按日期過濾（預設今天）
- 每批 8 輪送 Claude Haiku 4.5、結構化 JSON 評分（1-10）
- 評分標準包含：
  - 扣分項：真實傷害題強制 ≤3、政治指控個人、過於零碎
  - 加分項：台語 / 網路梗、反差幽默、「鋪墊 + 爆」結構
- 輸出 `punchline_top10_YYYYMMDD.md`：含完整對話、評分理由、最佳 punchline

### 3. .gitignore +1

`wwt_dialogue_archive.jsonl` 排除、避免全文持久化檔被 commit。

---

## 評分 prompt 設計重點

從前面 Step 5.22「真實傷害題用 sympathy」延伸：

```
扣分項：
- 涉及真實傷害（傷亡 / 受害者 / 家屬）→ 強制 ≤ 3
- 政治指控個人（不符節目風格）

加分項：
- 台語 / 網路梗使用自然
- 反差 / 黑色幽默
- 「上一句鋪墊 + 下一句爆」結構
```

這樣即使 Claude 自動挑、也不會挑到「車禍死傷 → AI 笑點」這類冒犯內容。

---

## 使用方式

```bash
# 看今天前 10 名
python scripts/score_punchlines.py

# 看 2026-06-03 前 10 名
python scripts/score_punchlines.py 20260603

# 出前 20 名（給更多選擇）
python scripts/score_punchlines.py --top 20
```

報告產出在專案根目錄 `punchline_top10_YYYYMMDD.md`。

---

## 成本估算

每輪 archive 大小 ~300 字
評分一輪 Claude tokens ~150 input + ~80 output
批次 8 輪一次 call ~1500 input + ~500 output

**24/7 跑滿一天約 200-300 輪對話**：
- 評分一次 ~30 個 API call
- 成本 ~$0.05-0.10 / 天
- 跑前要不要評全部、可以加 `--min-score 5` 過濾低分先排除（之後再加）

---

## Phase 1 上線需要的步驟

1. ✅ 程式碼已 push
2. **你重啟 server.py**（讓 `_append_dialogue_archive` 生效）
3. 等對話跑 1-2 小時、累積 ~20-30 輪 archive
4. 跑 `python scripts/score_punchlines.py`
5. 看 `punchline_top10_*.md` 報告、確認 Claude 評分品質

---

## Phase 2 要等什麼

Phase 2（影片剪輯）需要先具備：

| 前提 | 現況 | 你要做的事 |
|---|---|---|
| ffmpeg 裝在系統 | ❌ 沒裝 | 下載 ffmpeg-essentials 加入 PATH |
| OBS 連續錄影 | ❌ 沒設定 | 設定 OBS 開播時同步錄影到本機 |
| 時戳對齊機制 | ⏳ 待設計 | archive ts vs OBS 錄影檔 ts 配對 |

**建議**：等 Phase 1 跑 2-3 天、Claude 評分品質確認 OK、再啟動 Phase 2。

## Phase 3 要等什麼

YT Data API v3 申請流程：

1. Google Cloud Console 開新專案
2. 啟用 YouTube Data API v3
3. OAuth 2.0 credentials
4. 第一次跑要瀏覽器授權
5. quota 預設 10000/天（1 次上傳 ~1600 quota、所以一天 6 支內）

**建議**：Phase 2 跑穩了再做 Phase 3。否則影片剪好上傳壞掉、白工。

---

## 不在這次 scope 的事

- 自動字幕 burn-in（Phase 2）
- 自動 thumbnail（Phase 2 後期）
- 多平台導流（TikTok / IG Reels、未規劃）
- 預測哪題會爆紅（需要回饋資料、上線後才能訓）
