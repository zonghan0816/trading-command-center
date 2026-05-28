# WWT 晚晚嘴台灣 — 專案交接總結

**更新日期：** 2026-05-28  
**當前完成至：** Phase 2G.1  
**下一階段：** Phase 3（Asset 替換）

---

## 一、專案簡介

**WWT 晚晚嘴台灣（Taiwan Tonight）** 是一個 AI 驅動的台灣鄉民談話節目模擬器。  
兩位 AI 主持人（阿明哥、小美姐）在 1920×1080 像素辦公室場景中，圍繞當日話題進行 AI 生成對話，設計用於 OBS 直播串流。

---

## 二、技術架構

```
┌─────────────────────────────────────────┐
│              瀏覽器 / OBS               │
│  index.html  ←  FastAPI StaticFiles    │
│  Phaser 3.60 (1920×1080 FIT)           │
│    ├── BootScene.js  (資源生成)          │
│    └── OfficeScene.js (場景主邏輯)       │
└──────────────┬──────────────────────────┘
               │ HTTP API (port 8765)
┌──────────────▼──────────────────────────┐
│           server.py (FastAPI)           │
│  POST /api/topic   → 設定話題           │
│  GET  /api/state   → 取得目前狀態       │
│  POST /api/chat    → 生成主持人對話     │
│  POST /api/state   → 直接更新 state     │
│           Anthropic Claude API          │
│           wwt_state.json (持久化)       │
└─────────────────────────────────────────┘
```

### 技術棧

| 元件 | 版本/說明 |
|---|---|
| 前端框架 | Phaser 3.60（CDN 載入） |
| 後端 | FastAPI + uvicorn |
| AI 模型 | Anthropic Claude（claude-3-5-haiku / opus） |
| 啟動方式 | `python server.py`（無 npm / webpack） |
| 靜態檔案 | FastAPI StaticFiles 直接 serve |
| State 持久化 | `wwt_state.json`（啟動時讀入，每次更新寫出） |

---

## 三、啟動方式

```bash
# 方法 1
python server.py

# 方法 2（Windows）
雙擊 啟動.bat

# 瀏覽器
http://localhost:8765

# OBS 擷取
瀏覽器來源 → http://localhost:8765 → 1920×1080
```

**環境變數：**（`.env` 放在專案根目錄，不進 git）
```
ANTHROPIC_API_KEY=sk-ant-...
```

**依賴安裝：**
```bash
pip install fastapi uvicorn anthropic python-dotenv
```

---

## 四、主要檔案說明

### 前端

| 檔案 | 說明 |
|---|---|
| `index.html` | 主 HTML：LED 字幕區、右上 status panel、F2 debug overlay、portfolio panel |
| `src/main.js` | Phaser 設定（1920×1080、FIT mode、BootScene→OfficeScene） |
| `src/config.js` | **主要視覺設定檔**：位置比例、顏色、縮放、角色外觀。簡單調整從這裡改。但許多 layout / TOP5 / bubble 座標目前仍寫死在 OfficeScene.js 中，Phase 3 換圖時很可能也需要調 OfficeScene.js 的座標、scale、safe area |
| `src/scenes/BootScene.js` | 程序生成所有 texture（角色、桌子、泡泡、燈具等），載入自訂 PNG |
| `src/scenes/OfficeScene.js` | 主場景：背景、裝飾、主持人、TOP5 板、bubble、API polling、對話播放 |

### 後端

| 檔案 | 說明 |
|---|---|
| `server.py` | FastAPI 伺服器：所有 API、Claude prompt 建構、state 管理 |
| `wwt_state.json` | 持久化 state（不進 git） |
| `.env` | API key（不進 git） |

### Assets

| 路徑 | 說明 |
|---|---|
| `assets/char_aming.png` | 阿明哥 spritesheet（自訂 PNG） |
| `assets/char_xiaomei.png` | 小美姐 spritesheet（自訂 PNG） |
| `assets/desk.png` | 工作站桌子（自訂 PNG） |
| `assets/office-complete.png` | 辦公室背景圖 |
| `assets/1.png` | 牆面股市螢幕圖 |

---

## 五、State Schema

```json
{
  "updated_at":    "14:30:00",
  "scene":         "studio",
  "mode":          "discussion",    // idle | discussion | working | coffee
  "topic":         "台積電再創新高",
  "topic_summary": "",
  "mood":          "heated",        // neutral | heated | cold
  "activity":      "prepare_show",
  "keywords":      ["台積電", "半導體", "AI", "外資", "股市"],
  "keywords_locked": false,
  "hosts": {
    "aming":   { "status": "talking", "last_output": "...", "emotion": "neutral" },
    "xiaomei": { "status": "thinking", "last_output": "...", "emotion": "neutral" }
  }
}
```

---

## 六、API 使用方式

### 設定話題（啟動討論模式）

```powershell
# PowerShell（中文需 UTF-8 bytes）
$body = [System.Text.Encoding]::UTF8.GetBytes('{"topic":"台積電再創新高"}')
Invoke-WebRequest -Method POST -Uri "http://localhost:8765/api/topic" `
  -ContentType "application/json; charset=utf-8" -Body $body
```

```bash
# ASCII topic（curl 可直接用）
curl -X POST http://localhost:8765/api/topic \
  -H "Content-Type: application/json" \
  -d '{"topic":"test123"}'
```

### 取得狀態

```bash
curl http://localhost:8765/api/state
```

### 觸發對話生成

```bash
curl -X POST http://localhost:8765/api/chat
```

---

## 七、視覺焦點層級（Phase 2F 確立）

```
第一焦點：LED 中央螢幕（最大、最亮）
    ↓
第二焦點：主持人 + Bubble（18→20px, lineSpacing 8）
    ↓
第三焦點：TOP5 熱門榜（右下 408×321 px 純色面板）
    ↓
第四焦點：Header / Status Panel（降亮處理）
```

---

## 八、Phase 歷程總結

| Phase | 內容 | 關鍵檔案 |
|---|---|---|
| 2C | 角色 PNG spritesheet、desk PNG | BootScene.js、config.js |
| 2D | Topic pipeline、F2 Debug overlay | server.py、index.html |
| 2E | AI 對話升級（台灣鄉民人設） | server.py |
| 2F Step 1 | 固定 1920×1080 + Phaser.Scale.FIT | main.js |
| 2F Step 2 | 移除 resize handler（世界座標污染修正） | OfficeScene.js |
| 2F Step 3 | Host Lane Lock（阿明左半場、小美右半場） | OfficeScene.js |
| 2F Step 4 | 移除 K-line monitor + server_rack 裝飾 + 字體放大 | OfficeScene.js、index.html |
| 2F Step 5~5.3 | TOP5 排名榜、bubble 放大、移除烘焙彩色列框 | OfficeScene.js、index.html |
| 2G | End-to-End runtime 驗證（10 項全通過） | — |
| 2G.1 | Runtime hardening：移除死碼、API fallback、undefined 防護 | OfficeScene.js |

---

## 九、已知死碼（無害，可日後清理）

| 位置 | 項目 | 說明 |
|---|---|---|
| OfficeScene.js | `KEYWORD_COLORS` | `_renderKeywords` 已改用橘/白直接指定，此常數未使用 |
| OfficeScene.js | `HOST_LANES` | `_clampToLane` 直接用 `LANE_MARGIN`，此常數未使用 |
| OfficeScene.js | `wbOff` | `_buildDecorations` 改用 optional chaining，此變數未使用 |
| config.js | `backRowOffsetY` 等舊版欄位 | 保留避免 undefined 報錯，實際未使用 |

> ⚠️ **行號不記錄**：表格中已移除行號。OfficeScene.js 每次修改後行號即失準，接手時請用關鍵字搜尋（如 `KEYWORD_COLORS`、`wbOff`）定位，不要依賴行號。

---

## 十、下一階段：Phase 3（Asset 替換）

**暫停美術的範圍（Phase 2F 規定）：**
- 主持人造型（sprites）
- 桌子
- 背景
- 整體像素藝術風格

**Phase 3 建議替換順序：**

> ⚠️ **不要一開始就換背景。** 背景一換，安全區、LED 位置、TOP5 板、人物座標可能一起跑版，難以逐一排查。

| 順序 | 工作 | 原因 |
| --- | --- | --- |
| 1 | Replace Host Sprites | 影響範圍最小，只牽涉 spritesheet frame |
| 2 | Replace Desk | 桌子尺寸改變 → 調 config.js scale |
| 3 | 調 bubble / 主持人站位 | 確認人物在桌後、bubble 不超出畫面 |
| 4 | Replace Background | 最後換，此時 safe area 已確立，才能安全調整 |

**替換步驟（每項）：**
1. 更換 `assets/` 下對應 PNG 檔案
2. 在 `config.js` 的 `customAssets` 中將對應 key 改為 `true`
3. 若新圖**尺寸與現有不同**，還需要：
   - 調整 `config.js` 的 `scale.*` 數值（縮放比例）
   - 若是 spritesheet，調整 `BootScene.js` 的 frame 寬高設定（`frameWidth`、`frameHeight`）
   - 若 anchor 位置不對，調整 OfficeScene.js 的 `setOrigin` 或座標偏移

---

## 十一、重要注意事項

| 事項 | 說明 |
|---|---|
| 中文 API 傳輸 | Windows CMD curl 會 ANSI 編碼，用 PowerShell `Invoke-WebRequest` + UTF-8 bytes |
| 瀏覽器快取 | 改 JS/CSS 後需 **Ctrl+Shift+R** 強制重整（ES module 快取） |
| OBS 設定 | 瀏覽器來源，1920×1080，無縮放 |
| .gitignore | `.env`、`wwt_state.json`、`command_center_state.json`、`*.tmp` 不進 git |
| BootScene 彩色列框 | `_makeWhiteboard()` texture 有烘焙彩色 row，OfficeScene 已改用 `graphics` 繪製取代，texture 不再被渲染 |

---

## 十二、快速 Debug 工具

| 工具 | 說明 |
|---|---|
| **F2 鍵** | 開啟/關閉 debug overlay（mode、topic、keywords、resolution） |
| `GET /api/state` | 即時查看完整 state JSON |
| `wwt_state.json` | 直接查看/修改持久化 state |
| Console | API 失敗時會顯示 `[WWT] /api/state ...` warning |
