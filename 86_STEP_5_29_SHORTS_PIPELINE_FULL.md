# Phase 4 Step 5.29 — Shorts Pipeline Phase 2 + 3 全套

**類型**：實作紀錄
**承接**：Step 5.28（Phase 1 punchline 評分）+ GPT 82 + 使用者選 A（95% 自動 + 30 秒/天 review）
**狀態**：✅ 程式完成、待安裝套件 + 測試

---

## 全自動流程（一個指令完成 5 件事）

```
python scripts/run_shorts_pipeline.py
        ↓
1. 讀今天 wwt_dialogue_archive.jsonl
2. Claude 批次評分（1-10）
3. 取 top 5 高分輪
4. 對每一輪：
   ├─ ffmpeg 切 70 秒 9:16 vertical clip
   ├─ Claude 生標題 / 描述 / hashtags
   ├─ Pillow 生縮圖（截圖 + 大字 overlay）
   └─ YT API 上傳「私人模式」
5. .processed.jsonl 標記、避免重複處理
        ↓
你打開 YT Studio
看 5 個候選、好的按公開、爛的刪掉（30 秒）
```

---

## 6 個檔案

### 1. `scripts/shorts_lib.py` — 共用工具

- `find_ffmpeg()` / `find_ffprobe()`：PATH 找不到 fallback 到 winget 路徑
- `find_recording_for(dialogue_ts)`：根據 archive ts 找對應的 OBS 錄影檔 + offset
- `parse_obs_filename_ts()`：解析 `2026-06-03 18-40-36.mp4` 檔名時戳
- `round_uid()`：每輪唯一 ID（ts + round_num + topic 前 10 字）
- `load_processed()` / `mark_processed()`：去重機制
- `clip_path` / `metadata_path` / `thumbnail_path` / `subtitle_path`：檔名規範

### 2. `scripts/cut_clip.py` — ffmpeg 剪片

關鍵設計：
- **9:16 vertical（1080x1920）+ 模糊背景**：16:9 原片置中、上下用同源放大裁切 + 高斯模糊 + 暗化當背景、不裁掉主持人
- **clip 長度 70 秒**（30-60 秒 Shorts 規範、留 buffer）
- **時間對齊**：archive ts 前 5 秒開始、保險

filter_complex 結構：
```
[0:v] scale 2160 → crop 1080x1920 → boxblur 20 → eq dim → [bg]
[0:v] scale 1080 wide                              → [fg]
[bg][fg] overlay center
```

額外產出 .srt 字幕檔（從 archive 對話文字）、之後可加 burn-in。

### 3. `scripts/gen_metadata.py` — Claude 標題生成

Prompt 規則：
- 標題 ≤ 50 字、必須含「AI 主持人」或「AI」字眼
- 描述 150-250 字、結尾固定 hashtag
  - `#天天嘴台灣 #TDT #AI主持人 #24H直播 #台灣新聞`
- tags 5-8 個、繁中 + 英文混用
- 排除農場字眼（「驚！」「太扯！」）

### 4. `scripts/gen_thumbnail.py` — Pillow 縮圖

設計：
- ffmpeg 抽 clip 第 8 秒 frame
- Pillow 疊：
  - 上條黑半透明 + 「24H AI 主持人」品牌字
  - 中央 topic 大字（橙色 #FF6B35 + 黑色描邊）
  - 下條黑半透明 + 「▶ 看 24H 直播」CTA
- 使用微軟正黑體 `C:/Windows/Fonts/msjh.ttc`

### 5. `scripts/upload_yt.py` — YT API 上傳

行為：
- OAuth 流程：第一次跑開瀏覽器、token 存 `youtube_token.json`
- refresh token 自動續期（Testing 模式 7 天會失效、要重跑）
- 上傳：`privacyStatus="private"` ← 你 YT Studio 手動公開
- categoryId = 25（新聞與政治）
- 語言 zh-Hant
- 縮圖用 force-ssl scope 設

### 6. `scripts/run_shorts_pipeline.py` — 主編排器

CLI 選項：
```bash
python scripts/run_shorts_pipeline.py                # 預設、上限 5 支
python scripts/run_shorts_pipeline.py --top 3        # 上限 3 支
python scripts/run_shorts_pipeline.py --min-score 7  # 提高門檻
python scripts/run_shorts_pipeline.py --dry-run      # 看會做啥
python scripts/run_shorts_pipeline.py --skip-upload  # 剪片但不上傳（測試用）
```

行為：
- 自動去重（`.processed.jsonl` uid 追蹤）
- 失敗一支不擋其他（每支獨立 try）
- 上傳成功才標 processed

---

## 配套改動

### `requirements.txt` +4 套件
```
Pillow
google-auth
google-auth-oauthlib
google-api-python-client
```

### `.gitignore` +3 項
```
youtube_credentials.json   # OAuth secret、絕不 commit
youtube_token.json         # refresh token、絕不 commit
output/                    # 剪好的 mp4 / json / jpg、不用 git
```

---

## 你要做的事（**按順序**）

### 1. 裝套件（1 分鐘）

```bash
pip install Pillow google-auth google-auth-oauthlib google-api-python-client
```

### 2. 確認 ffmpeg 可用（新開 terminal）

```bash
ffmpeg -version
```

### 3. 確認 YT credentials 就位

```
C:\Users\miner3\trading-command-center\youtube_credentials.json
```

### 4. 確認對話 archive 有資料（重啟 server.py 後跑 1-2 小時）

```bash
ls C:/Users/miner3/trading-command-center/wwt_dialogue_archive.jsonl
```

### 5. 第一次 dry-run

```bash
python scripts/run_shorts_pipeline.py --dry-run
```

看會挑哪 5 輪。

### 6. 測試剪片但不上傳

```bash
python scripts/run_shorts_pipeline.py --skip-upload --top 1
```

跑完看 `output/shorts/` 有沒有：
- `clip_xxx.mp4`（9:16 vertical）
- `clip_xxx.json`（標題 + 描述）
- `clip_xxx.jpg`（縮圖）
- `clip_xxx.srt`（字幕）

確認剪片品質 OK。

### 7. 全套跑

```bash
python scripts/run_shorts_pipeline.py --top 3
```

第一次跑會：
- 開瀏覽器叫你 OAuth 授權 → 用你的 Gmail 登入
- 完成後 `youtube_token.json` 存好
- 之後 7 天內不用再授權

跑完打開 YT Studio、看 3 支私人 Shorts。

---

## Phase 4 排程（可選、跑穩了再做）

Windows 工作排程器設每 6 小時跑一次：

```
schtasks /create /tn "TDT_Shorts_Pipeline" ^
  /tr "python C:\Users\miner3\trading-command-center\scripts\run_shorts_pipeline.py --top 2" ^
  /sc HOURLY /mo 6
```

每天最多 8 支（2 × 4 次）、留 YT quota buffer。

---

## 限制 / 已知問題

### 1. 時間對齊不精準

archive ts = Claude 後端生成時間、跟前端真實播放時間有差（前端 prefetch + queue）。

**目前做法**：archive ts 前 5 秒開始切 70 秒、把對話包進去。
**未來可改**：前端 `_playLineSequence` 結束時打個 `dialogue_played` event 到 server.py、紀錄真實播放時間戳。

### 2. 字幕沒 burn-in

目前 .srt 是獨立檔、ffmpeg 沒燒進影片。要燒的話加 `-vf subtitles=clip.srt:force_style='Fontname=Microsoft JhengHei'`、但 Windows 字型路徑要處理。

**現在不做**：YT 自己會吃 .srt 字幕（上傳時 captions.insert）、可後續加。

### 3. Thumbnail 簡陋

目前是「截圖 + 文字 overlay」、視覺強度普通。

**未來可改**：用 AI 生圖 API（DALL-E 3 一張 $0.04）做更吸睛的縮圖。

### 4. 沒做的（後續）

- ❌ 對話 ducking（剪片時壓低 BGM）— 70 秒 clip 內 BGM 跟對話會稍混
- ❌ 多語版本（英文標題給海外觀眾）
- ❌ 自動退稿（觀眾 retention 太低的 round 標記不再處理）
- ❌ 互動分析（哪題爆紅 → 反饋給評分 prompt）

---

## 成本估算

| 項目 | 成本 |
|---|---|
| Claude 評分（每天 ~30 輪）| $0.05-0.10 |
| Claude metadata 生成（每天 5 支）| $0.02 |
| 縮圖（Pillow 本機）| $0 |
| ffmpeg 剪片（本機 CPU）| $0 |
| YT API 上傳 | $0（quota 內）|
| **合計** | **$0.07-0.12 / 天** |

跟 24H 直播本身（~$1-3/天 cache hit 良好時）相比、Shorts pipeline 加成 ~10% 成本、收益是潛在 100x 觀眾、值。

---

## 給未來 Claude 的提醒

1. **改 cut_clip.py filter_complex 前**、先用 `--skip-upload` 跑單支確認視覺
2. **改 metadata prompt** 後、第一支跑出來必須看標題是否符合 YT 規則
3. **不要動 privacyStatus="private"**、這是使用者明確要求的人工 review 機制
4. **token 失效**（7 天）→ 直接刪 `youtube_token.json` 重跑、會再開瀏覽器授權
5. **錄影檔太大** → 寫個 `cleanup_recordings.py` 自動刪 7 天前未處理的（之後加）
