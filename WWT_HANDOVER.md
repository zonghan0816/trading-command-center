# TDT 天天嘴台灣 — 專案交接總結

**更新日期：** 2026-05-29  
**當前完成至：** Phase 3 Step 3.1  
**目前狀態：** Visual Base Ready / MVP Runtime Ready  
**下一階段：** Phase 3 Step 4 — Host Action & Expression Assets  

> 檔名仍為 `WWT_HANDOVER.md`，但節目品牌已從 WWT / 晚晚嘴台灣 改為 TDT / 天天嘴台灣。程式內部分 legacy 名稱如 `wwt_state.json` 可暫時保留，不需為改名而大重構。

---

## 一、專案簡介

**TDT 天天嘴台灣（Taiwan Daily Talk）** 是一個 AI 驅動的台灣鄉民談話節目模擬器，設計用於 OBS 24 小時直播。

兩位 AI 主持人：

- 阿明哥：街頭政治直播主持風格，嘴砲、直接、鄉民感
- 小美姐：知性女主播風格，理性吐槽、節目感

目前畫面為 1920×1080 Phaser 場景，包含：

- 中央 LED 主題螢幕
- 阿明哥與小美姐 v2 角色圖
- 角色頭部旁對話泡泡
- 右下 TOP5 熱門議題榜
- 右上狀態 panel
- 早 / 中 / 晚棚景背景 crossfade

---

## 二、技術架構

```txt
瀏覽器 / OBS
  index.html
  Phaser 3.60, 1920×1080 FIT
    BootScene.js    載入 / 生成資源
    OfficeScene.js  場景、角色、背景、TOP5、bubble、API polling

HTTP API, port 8765
  server.py, FastAPI
    POST /api/topic
    GET  /api/state
    POST /api/chat
    POST /api/state
  Anthropic Claude API
  wwt_state.json 持久化 state
```

### 技術棧

| 元件 | 說明 |
|---|---|
| 前端 | Phaser 3.60 CDN |
| 後端 | FastAPI + uvicorn |
| AI | Anthropic Claude |
| 啟動方式 | `python server.py` 或雙擊 `啟動.bat` |
| 靜態檔案 | FastAPI StaticFiles |
| State | `wwt_state.json`，legacy 名稱先保留 |

---

## 三、啟動方式

```bash
python server.py
```

或 Windows 直接雙擊：

```txt
啟動.bat
```

瀏覽器：

```txt
http://localhost:8765
```

OBS：

```txt
Browser Source → http://localhost:8765 → 1920×1080
```

環境變數：

```txt
ANTHROPIC_API_KEY=sk-ant-...
```

安裝依賴：

```bash
pip install fastapi uvicorn anthropic python-dotenv
```

---

## 四、主要檔案

| 檔案 | 說明 |
|---|---|
| `index.html` | Header、LED overlay、右上 status panel、F2 debug overlay |
| `src/main.js` | Phaser 設定，固定 1920×1080 FIT |
| `src/config.js` | 主要視覺設定：角色比例、站位、customAssets 等 |
| `src/scenes/BootScene.js` | 載入背景 / 角色圖，建立必要 texture / animations |
| `src/scenes/OfficeScene.js` | 主場景：背景 crossfade、角色、bubble、TOP5、API polling |
| `server.py` | FastAPI API、Claude prompt、state 管理 |
| `wwt_state.json` | 本機 state 持久化，不進 git |
| `.env` | API key，不進 git |

---

## 五、目前品牌文字

目前可見品牌已改為：

```txt
天天嘴台灣  TDT
AI 鄉民聊天室 • Taiwan Daily Talk LIVE
```

LED label：

```txt
TDT Taiwan Daily Talk
```

舊字串替換方向：

| 舊 | 新 |
|---|---|
| 晚晚嘴台灣 | 天天嘴台灣 |
| WWT | TDT |
| Taiwan Tonight | Taiwan Daily Talk |
| Taiwan Tonight LIVE | Taiwan Daily Talk LIVE |

---

## 六、目前 Assets

### 主持人

| 檔案 | 說明 |
|---|---|
| `assets/char_aming_v2_draft.png` | 阿明哥 v2 單張 PNG，目前啟用 |
| `assets/char_xiaomei_v2_draft.png` | 小美姐 v2 單張 PNG，目前啟用 |
| `assets/char_aming.png` | 舊版阿明 spritesheet，保留回退 |
| `assets/char_xiaomei.png` | 舊版小美 spritesheet，保留回退 |

### 背景

| 檔案 | 說明 |
|---|---|
| `assets/wwt_studio_background_morning_v1.png` | 時段背景素材，注意目前 key / 檔名曾因視覺判定交換 |
| `assets/wwt_studio_background_noon_v1.png` | 時段背景素材，注意目前 key / 檔名曾因視覺判定交換 |
| `assets/wwt_studio_background_night_v1.png` | 夜晚背景素材 |
| `assets/wwt_studio_background_v1.png` | 初版背景概念，可作備份 |

### Legacy / 目前少用

| 檔案 | 說明 |
|---|---|
| `assets/desk.png` | 舊桌子，Phase 3 新背景下已停用 render |
| `assets/office-complete.png` | 舊交易中心背景，保留回退 |
| `assets/1.png` | 舊牆面螢幕圖，Phase 3 已停用 |

---

## 七、背景時段與 Crossfade

目前 `OfficeScene.js` 使用本機時間計算背景 mix。

### 穩定時段

```txt
06:30 - 14:29  morning
15:30 - 16:59  noon
18:00 - 05:29  night
```

### Crossfade 時段

```txt
05:30 - 06:30  night → morning
14:30 - 15:30  morning → noon
17:00 - 18:00  noon → night
```

實作方式：

- `bgBase` alpha = 1
- `bgNext` alpha = 0~1
- 每 60 秒更新一次 alpha
- 不 tween，不重建 scene
- 不新增 API / state 欄位

> 注意：Claude 回報曾提到 `studio_bg_morning` 與 `studio_bg_noon` 的實際 PNG 檔案依視覺結果交換過。未來若調整，請以 `BootScene.js` 實際 key 對應為準，不要只看檔名。

---

## 八、主持人目前策略

### Movement Frozen

主持人已凍結走動邏輯。

目前要求：

- 阿明哥固定站左側
- 小美姐固定站右側
- 不 wander
- 不 lane walking
- 不 random movement
- 不 tween 移動角色座標

保留：

- `sprite.play(idle / typing / thinking / reacting)`
- speaker status 切換
- bubble show / hide
- dialogue chunking

### 下一階段角色表現方式

之後不要再做走動系統。  
請改用動作圖 / 表情圖來表現狀態：

- idle
- talking
- thinking
- reaction
- happy / serious / surprised 等 emotion

---

## 九、Dialogue Bubble 現況

目前對話泡泡：

- 放在角色頭部旁
- 阿明使用橘色框
- 小美使用青色框
- 長台詞會自動切成多個 bubble chunk
- 不再直接截斷吃字

切分規則：

- 優先用 `，。！？、；：` 斷句
- 無標點才依字數切
- 同 speaker chunks 連續播放
- 每段約 2.8 秒以上

已知小瑕疵：

- 小美泡泡偶爾可能略靠近角色上半身，但目前可接受

---

## 十、TOP5 / Status Panel 現況

TOP5：

- 右下背景已有內建框
- 程式只保留 title 與 keywords 文字
- 不再恢復 graphics 外框
- 橘白單色系

右上 Status Panel：

- 已改為較融入背景的深藍黑
- 橘色邊框降低亮度
- 內容邏輯不變

---

## 十一、State Schema

```json
{
  "updated_at": "14:30:00",
  "scene": "studio",
  "mode": "discussion",
  "topic": "台積電再創新高",
  "topic_summary": "",
  "mood": "heated",
  "activity": "prepare_show",
  "keywords": ["台積電", "半導體", "AI", "外資", "股市"],
  "keywords_locked": false,
  "hosts": {
    "aming": {
      "status": "talking",
      "last_output": "...",
      "emotion": "neutral"
    },
    "xiaomei": {
      "status": "thinking",
      "last_output": "...",
      "emotion": "neutral"
    }
  }
}
```

目前不要改 schema。後續若要加入更細表情，可先使用既有 `emotion` 欄位，不急著新增欄位。

---

## 十二、API 使用方式

### 設定話題

```powershell
$body = [System.Text.Encoding]::UTF8.GetBytes('{"topic":"台積電再創新高"}')
Invoke-WebRequest -Method POST -Uri "http://localhost:8765/api/topic" `
  -ContentType "application/json; charset=utf-8" -Body $body
```

### 取得狀態

```bash
curl http://localhost:8765/api/state
```

### 觸發對話

```bash
curl -X POST http://localhost:8765/api/chat
```

---

## 十三、Phase 歷程摘要

| Phase | 內容 | 狀態 |
|---|---|---|
| 2C | 角色 PNG / desk PNG | 完成 |
| 2D | Topic pipeline / F2 debug | 完成 |
| 2E | AI 對話升級 | 完成 |
| 2F | 1920×1080、host lane、TOP5、bubble readability | 完成 |
| 2G | End-to-end runtime / hardening | 完成 |
| 3 Step 1.2 | 接入阿明 / 小美 v2 sprites | 完成 |
| 3 Step 2 | 新棚景背景接線 | 完成 |
| 3 Step 2.3~2.4 | 對話泡泡重定位 + 長台詞 chunks | 完成 |
| 3 Step 2.5 | TOP5 / Right Panel 對齊 | 完成 |
| 3 Step 3 | 早中晚背景選擇 | 完成 |
| 3 Step 3.1 | TDT 改名 + crossfade + freeze movement | 完成 |

---

## 十四、下一步建議

### Phase 3 Step 4 — Host Action & Expression Assets

目標：

- 不走動
- 固定站位
- 用動作圖 / 表情圖表示主持狀態

建議先做小美或阿明其中一人，避免一次炸掉：

```txt
char_xiaomei_idle.png
char_xiaomei_talking.png
char_xiaomei_thinking.png
char_xiaomei_reacting.png
```

或：

```txt
char_aming_idle.png
char_aming_talking.png
char_aming_thinking.png
char_aming_reacting.png
```

Claude 接線時只做：

- load image / spritesheet
- 根據 `status` 播放對應 frame
- 不改 API
- 不改站位
- 不恢復 walking

---

## 十五、重要注意事項

| 事項 | 說明 |
|---|---|
| 中文 API 傳輸 | Windows CMD curl 可能 ANSI 編碼，PowerShell 用 UTF-8 bytes 最穩 |
| 瀏覽器快取 | 改 JS/CSS 後請 `Ctrl+Shift+R` |
| OBS | Browser Source, 1920×1080 |
| Git | `.env`、`wwt_state.json` 不要進 git |
| Google Drive | 適合放素材 / 備份，不建議當主要程式碼版本控管 |
| GitHub | 程式碼與 assets 最好 commit/push，同步到家裡電腦 |

---

## 十六、快速 Debug

| 工具 | 說明 |
|---|---|
| F2 | Debug overlay |
| `GET /api/state` | 查看完整 state |
| `wwt_state.json` | 查看目前持久化狀態 |
| Console | 背景 key / API warning 會在 console 顯示 |


---

## 十七、Codex / Claude 協作模式（2026-05-31 重大更新、Phase 4 24H MVP 起改新工作流）

### 為什麼改新工作流

舊版（Phase 1~3）：使用者 → GPT (Codex) 出指令檔 → Claude 實作 → BRIEF → 下一輪
- 問題 1：GPT 越來越慢、長指令易漏讀
- 問題 2：62_24H_MVP_DISCUSSION_NOTES.md 已詳細到 Claude 可直接動工、再排 GPT 指令檔等於浪費一輪
- 問題 3：GPT 強項在圖像生成、應該專注做這個

新版（Phase 4 起）：**Claude 直接讀 62 notes 實作 + GPT 平行做圖 + GPT 定期 review**

### 新版分工

| 角色 | 職責 |
|---|---|
| **使用者** | 提供畫面截圖、描述觀感、決定產品方向 + 美學取向 |
| **Claude** | **直接讀 62 notes 實作**程式、不再等 GPT 指令檔；完成 Step 後寫 BRIEF |
| **GPT (Codex)** | **圖像生成**（PNG、spritesheet、UI 元素）+ **定期 review 補漏**（不再每 Step 出指令檔）|

### 新工作流

```
程式碼部分（Claude）
    Claude 從 62 notes 直接實作
    完成 Step 後寫 BRIEF
    
平行進行
    
圖像素材（GPT/Codex）
    從 Claude 給的素材清單排程生成
    完成後丟進 assets/ 給 Claude 接線
    
定期 review（GPT）
    Claude 每 1-2 Step 寫短報告請 GPT「找漏的」
    GPT 用第三視角給建議、不下指令
```

### Claude 給 GPT 的「短報告」三種類型

| # | 類型 | 用途 | 長度 |
|---|---|---|---|
| 1 | **D/E 技術問題** | 純技術討論、Claude 沒把握的議題 | 500 字內 |
| 2 | **「找漏的」review** | 列當下狀態、請 GPT 補盲點 | 1 頁內 |
| 3 | **素材製作清單** | 具體列要 PNG 規格、尺寸、命名 | 1 頁內 |

→ 每份報告自成獨立、GPT 不用追溯全脈絡、不會漏讀。

### 重要習慣（仍適用）

- Claude 已讀過 `WWT_HANDOVER.md` 時、不要再要求重複摘要
- 圖片素材由 GPT/Codex 生成、裁切、整理；Claude 只負責把圖接進程式
- Claude 不重新生成圖片（API 不支援、也不該做）
- Claude 完成 Step 後、在專案根目錄新增 `XX_PHASE4_STEPX.X_IMPL_BRIEF.md`

### 素材流程（簡化）

1. Claude 在 BRIEF 中列「需要的素材清單」（檔名 / 規格 / 用途）
2. 使用者把清單轉交給 GPT/Codex
3. GPT/Codex 生成、放到 `C:\Users\miner3\trading-command-center\assets`
4. Claude 偵測新檔、自動接線（或下次 Step 接線）

### 程式限制繼續沿用

- 不改 API schema、除非使用者明確批准
- 不恢復 walking / wander / random movement（movement 是設計、不是 bug）
- `.env`、`wwt_state.json`、`wwt_news_cache.json`、`wwt_dialogue_memory.json` 不進 git
- 改 JS/CSS 後、瀏覽器請用 `Ctrl+Shift+R` 強制重整
- 先小步驗收、再擴到下一個功能

### 24H MVP 程式限制（新）

- 不違反月預算 NT$1,500 上限（Cost Guard 強制）
- Quality Breaker 必須有 fallback 路徑（沒對話時 idle / recycle pool）
- Pool 容量、refill 觸發、過期判定要可調（不寫死）
- 支援 4 時段 × 2 組角色 × 季節變化 × 即時天氣（不全做、但架構保留）

### 快速開工流程（新版）

新聊天或換電腦時、建議順序：

1. Claude 自動讀 `CLAUDE.md`（包含 24H MVP 產品定位）
2. Claude 讀 `62_24H_MVP_DISCUSSION_NOTES.md`（11 項已決議）
3. Claude 讀最新 `*_IMPL_BRIEF.md` 確認上次做到哪
4. 使用者一句指令「接續」或「存進度」、Claude 自己判斷
5. **不再等 GPT 指令檔、Claude 直接動工**
6. GPT 只在「需要圖」或「使用者要 review」時才出場

---

## 2026-05-30 換聊天最新進度摘要（Phase 3 Step 6.5 後）

這段是給下一個 Codex / Claude 聊天快速接續用。Claude 已經讀過本交接檔時，不要再要求 Claude 重讀同一份舊內容；Codex 只需要讀本段、最新 implementation brief，以及使用者最新截圖即可開始。

### 一、目前已完成到哪裡

目前進度已完成到：

```txt
57_PHASE3_STEP6.5_IMPL_BRIEF.md
Phase 3 Step 6.5 — Dialogue Gap Reduction (Prefetch + Shorten Delays)
狀態：完成
```

Step 6 系列重點：

- `51_PHASE3_STEP6_IMPL_BRIEF.md`：Google News RSS 即時話題接線完成。
- `52_PHASE3_STEP6.1_IMPL_BRIEF.md`：RSS cache / 同話題多輪討論 / tone 變化完成。
- `53_PHASE3_STEP6.2_IMPL_BRIEF.md`：小美對話動作連貫、chunk-level action、講完回 idle 完成。
- `54_PHASE3_STEP6.3_IMPL_BRIEF.md`：同一話題防重複，加入 tone queue、angle queue、dialogue memory。
- `55_PHASE3_STEP6.4_IMPL_BRIEF.md`：新聞初始灌入修正，啟動時能從 cache/RSS seed 第一個 topic。
- `56_DIALOGUE_GAP_REPORT.md`：分析上一輪結束到下一輪開始有 5~10 秒空窗。
- `57_PHASE3_STEP6.5_IMPL_BRIEF.md`：完成 prefetch 下一輪 dialogue + 縮短 delay，理論上對話空窗降到約 0.5~1 秒。

### 二、Step 6.5 最新實作摘要

Claude 修改範圍：只改 `src/scenes/OfficeScene.js`。

新增狀態：

```js
this._nextDialogue = null;
this._prefetchInProgress = false;
this._prefetchStartedForSeq = null;
```

核心流程：

```txt
_fetchAndPlayDialogue()
  1. 若 _nextDialogue 有 prefetch cache，直接 consume 並播放
  2. 若 prefetch 還在跑，250ms 後 retry，不重複開請求
  3. 若沒有 cache，也沒有 prefetch，才 live fetch /api/chat
```

播放開始 2 秒後背景呼叫 `/api/chat` 預抓下一輪；下一輪開始時直接吃 `_nextDialogue`。

已縮短 delay：

```txt
next dialogue gap：1100ms -> 350ms
afterWalk delay：300ms -> 100ms
frozen path delay：300ms -> 100ms
line gap：300ms -> 180ms
```

驗收時 F12 Console 應看到：

```txt
[TDT] prefetch started
[TDT] prefetch ready
[TDT] using prefetched dialogue
```

注意：prefetch 會讓 `/api/chat` 呼叫頻率約翻倍，token 用量也會增加，但目前可接受。

### 三、目前畫面與已知狀態

目前前端網址：

```txt
http://localhost:8765
```

目前畫面狀態大致是：

- 1920x1080 TDT studio。
- 阿明固定左側，小美固定右側。
- 主持人不 walking、不 wander、不 random movement。
- 對話泡泡、右 panel、TOP5、中央 topic board 都已正常運作。
- RSS topic 可從 `wwt_news_cache.json` 讀取，沒有新 topic 時可以沿用舊 topic 做不同角度討論。
- 同 topic 已有防重複策略，但若使用者仍覺得重複，可再調 prompt / memory / tone-angle policy。

### 四、仍待處理或下一步

1. 先驗收 Step 6.5：
   - `Ctrl+Shift+R` 強制重整。
   - F12 Console 確認 prefetch log。
   - 連續看 5 輪，確認上一輪結束到下一輪開始不再有 5~10 秒空窗。
   - 確認沒有兩個泡泡同時跳、沒有對話重疊、沒有主持人卡在上一個動作。

2. 小美 PNG 素材仍待 Codex 重生：
   - 目前 `char_xiaomei_actions.png` 有素材層問題。
   - 白外套被 alpha / 去背吃掉，在深色背景看起來像黑色或深藍衣服。
   - 角色邊緣有白色光暈 / halo。
   - 這不是 Phaser bug，Claude 不要用程式硬修。
   - 後續應由 Codex 重新生成 / 修圖後輸出新的 `assets/char_xiaomei_actions.png` 與單張 pose PNG。

3. 若 Step 6.5 驗收還是慢：
   - 產生下一份 Claude 指令檔，例如 `claude_STEP6.6_預抓穩定化指令檔.md`。
   - 優先檢查 `_prefetchNextDialogue()` 是否有跑、是否被 `_chatInProgress` 或 seq guard 擋掉。
   - 可考慮把 prefetch 觸發從 2000ms 改 1000ms。
   - 可考慮讓 server 端預先產內容，但這會是較大改動。

4. 若新聞仍不更新：
   - 先查 server console。
   - 查 `/api/state`、`/api/news`、`wwt_news_cache.json`。
   - 重點檢查 `_apply_news_topic`、topic seed、rotate loop、`topic_locked`、`_current_topic_rounds`。

### 五、Codex / Claude 協作規則（2026-05-31 重大更新、舊版作廢）

**舊版（Phase 1~3）已作廢**：Codex 出指令檔 → Claude 實作 → BRIEF 的單線流程不再使用。

**新版（Phase 4 / 24H MVP 起）**：

- **Claude 不再等 GPT 指令檔**、直接讀 `62_24H_MVP_DISCUSSION_NOTES.md` 開工
- **GPT 專心做圖**（PNG / spritesheet / UI 元素）
- **GPT 只在 Claude 寫短報告請 review 時出場**、不每 Step 出指令

**Claude 給 GPT 的 3 種短報告**：

1. D/E 技術問題（500 字內）
2. 「找漏的」review（1 頁內）
3. 素材製作清單（1 頁內）

每份報告自成獨立、GPT 不用追溯全脈絡、不會漏讀。

### 六、下一個聊天建議起手（新版）

下一個 Claude 聊天：

1. 自動讀 `CLAUDE.md`（含 24H MVP 產品定位章節）
2. Claude 讀 `62_24H_MVP_DISCUSSION_NOTES.md`（11 項已決議）
3. Claude 讀最新 `*_IMPL_BRIEF.md` 確認上次做到哪
4. 使用者一句「**接續**」、Claude 自己判斷下一步、直接動工
5. 不需要 GPT 指令檔、不需要使用者貼長指令

下一個 GPT 聊天：

1. 只看 Claude 給的短報告（3 種類型之一）
2. 給建議、補漏、找盲點
3. 不要試圖出指令檔給 Claude
4. 圖像需求專心做圖、不討論程式

