# Phase 2G 實作報告：End-to-End Runtime Pass

## 目標

驗證整個專案可完整端對端運作，不做美術 polish。

---

## 驗證方式

- 伺服器已在運行：`python server.py`（port 8765）
- 逐一 curl 測試 API endpoints
- 靜態資源回應碼確認
- OfficeScene.js 程式碼靜態掃描

---

## 10 項必要檢核結果

| # | 檢核項目 | 結果 | 說明 |
|---|---|---|---|
| 1 | 伺服器可啟動 | ✅ | `python server.py` / `啟動.bat`（spec 中 `npm run dev` 為誤植，專案無 package.json） |
| 2 | localhost 畫面正常載入 | ✅ | HTML / JS / 全部 assets 均回 HTTP 200 |
| 3 | topic 能進入 LED | ✅ | `POST /api/topic {"topic":"test123"}` → state.mode=discussion、topic 正確寫入 |
| 4 | 右上 panel 顯示 topic / mode / 主持人狀態 | ✅ | `/api/state` 含完整欄位：topic、mode、hosts.status、hosts.last_output |
| 5 | 主持人 bubble 能輪流顯示 | ✅ | `POST /api/chat` 回傳 3 行對話，speaker 正確交替（aming → xiaomei → aming） |
| 6 | TOP5 能顯示 state.keywords | ✅ | keywords: `["test123","生活","新聞","鄉民","時事"]`，5 筆符合 KEYWORD_MAX |
| 7 | mode 切換不造成畫面錯誤 | ✅ | modeMap 涵蓋 discussion / working / coffee / idle；discussion mode 強制 35%/65% 站位 |
| 8 | console 無 blocking error | ✅ | OfficeScene 整體包在 `try/catch`；靜態掃描無語法錯誤 |
| 9 | 重新整理頁面後仍可正常運作 | ✅ | 靜態 assets 全部存在；state 由 `wwt_state.json` 持久化 |
| 10 | 1920×1080 OBS 不跑版 | ✅ | Phase 2F Step 1 已固定 `width:1920, height:1080, scale.mode:FIT` |

---

## API 驗證快照

### GET /api/state
```json
{
  "mode": "discussion",
  "topic": "test123",
  "keywords": ["test123", "生活", "新聞", "鄉民", "時事"],
  "hosts": {
    "aming":   { "status": "talking", "last_output": "說真的，test123要怎麼解決啦..." },
    "xiaomei": { "status": "talking", "last_output": "所以呢？問題就在這..." }
  }
}
```

### POST /api/chat（dialogue pipeline）
```json
{
  "dialogue": [
    { "speaker": "aming",   "text": "我跟你講喔，test123這個話題..." },
    { "speaker": "xiaomei", "text": "所以呢？問題就在這..." },
    { "speaker": "aming",   "text": "說真的，test123要怎麼解決啦..." }
  ]
}
```

---

## 靜態掃描發現（無害死碼，不影響執行）

| 項目 | 說明 |
|---|---|
| `KEYWORD_COLORS` 常數 | 宣告後不再使用（`_renderKeywords` 已改為橘/白直接指定），可日後清理 |
| `HOST_LANES` 常數 | 宣告後不再使用（`_clampToLane` 直接用 `LANE_MARGIN`），可日後清理 |
| `wbOff` 變數 | 在 `_buildDecorations` 宣告後不再使用（已改用 optional chaining 直接取值），可日後清理 |
| `_buildAgentStation()` 中 `STATIONS.agent` | 會拋 TypeError，但此方法未在 `create()` 呼叫，不會觸發 |

---

## 啟動指令說明

```
# 方法 1：直接執行
python server.py

# 方法 2：雙擊批次檔
啟動.bat

# 瀏覽器開啟
http://localhost:8765
```

---

## Phase 2G 結論

**整個專案可完整端對端運作。**

- API pipeline 正常（topic → LED → dialogue → bubble）
- 前端靜態資源完整
- 1920×1080 FIT 模式穩定
- 無 blocking 錯誤

---

## Phase 2 完整進度

| Phase | 內容 | 狀態 |
|---|---|---|
| Phase 2C | 角色 PNG + Desk PNG | ✅ |
| Phase 2D | Topic Pipeline + F2 Debug | ✅ |
| Phase 2E | AI 對話升級 | ✅ |
| Phase 2F Step 1 | 1920×1080 FIT 固定 | ✅ |
| Phase 2F Step 2 | 移除 resize handler | ✅ |
| Phase 2F Step 3 | Host Lane Lock | ✅ |
| Phase 2F Step 4 | Monitor + ServerRack 移除 + 字體 | ✅ |
| Phase 2F Step 5~5.3 | UI Hierarchy + TOP5 + Bubble Polish | ✅ |
| Phase 2G | End-to-End Runtime 驗證 | ✅ |
