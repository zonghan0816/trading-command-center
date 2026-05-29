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

