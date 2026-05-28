# Phase 2D Task 6 測試報告：F2 Debug Overlay + API 驗證

## 測試環境

| 項目 | 值 |
|---|---|
| Server | FastAPI + uvicorn，port 8765 |
| 測試時間 | 2026-05-28 |
| Canvas | 1920×1080 FIT（Phase 2F 已完成） |

---

## 測試項目 1：/api/topic POST

### 問題症狀

```
curl -X POST http://localhost:8765/api/topic ^
-H "Content-Type: application/json" ^
-d "{\"topic\":\"台積電再創新高\"}"
→ Internal Server Error (HTTP 500)
```

### 根因

Windows CMD `curl -d "..."` 傳送中文時，`cmd.exe` 將字串轉為 ANSI（CP950）編碼後送出，FastAPI 收到的 JSON body 格式損壞 → `request.json()` parse 失敗 → 500。

**server.py 本身邏輯無誤**，用 ASCII topic 測試即回 200：

```
POST {"topic":"test123"} → 200 OK
```

### 解法

改用 PowerShell `Invoke-WebRequest` + 明確 UTF-8 encode：

```powershell
$body = [System.Text.Encoding]::UTF8.GetBytes('{"topic":"台積電再創新高"}')
Invoke-WebRequest -Method POST -Uri "http://localhost:8765/api/topic" `
  -ContentType "application/json; charset=utf-8" -Body $body
```

結果：**HTTP 200**，state 正確寫入。

---

## 測試項目 2：State 驗證

POST 成功後 `/api/state` 回傳：

```json
{
  "mode": "discussion",
  "topic": "台積電再創新高",
  "topic_summary": "",
  "mood": "heated",
  "activity": "prepare_show",
  "keywords": ["台積電再創新高", "生活", "新聞", "鄉民", "時事"],
  "keywords_locked": false,
  "hosts": {
    "aming":   { "status": "thinking", ... },
    "xiaomei": { "status": "thinking", ... }
  }
}
```

**keywords 行為：** "台積電再創新高" 未命中 `_TOPIC_KEYWORDS_MAP`（字典只有「股票」條目，沒有「台積電」），fallback 規則啟動 → topic 本身 + 通用詞 ["生活","新聞","鄉民","時事"]。

若要精確命中，需在 `_TOPIC_KEYWORDS_MAP` 加入：
```python
("台積電", ["台積電", "半導體", "晶圓", "輝達", "CoWoS"]),
```

---

## 測試項目 3：F2 Debug Overlay 預期行為

| 動作 | 預期結果 |
|---|---|
| 頁面載入 | overlay `display:none`，不可見 |
| 按 F2 | overlay 出現，顯示目前 state |
| 再按 F2 | overlay 隱藏 |
| server 離線 | fetch 靜默失敗，overlay 顯示 `— waiting —` |
| OBS 擷取 | 無鍵盤事件，overlay 永遠不出現 |

POST topic 成功後，F2 overlay 應顯示：

```
▸ DEBUG  [F2 to hide]
────────────────────────────
mode:        discussion
topic:       台積電再創新高
keywords:    台積電再創新高, 生活, 新聞, 鄉民, 時事
last_update: 11:53:17
resolution:  1920×1080
scale:       FIT
```

---

## Windows CMD curl 中文傳輸注意事項

| 工具 | 中文傳輸 | 建議 |
|---|---|---|
| `cmd.exe` + `curl -d "..."` | ❌ ANSI 編碼，JSON 損壞 | 避免 |
| PowerShell `Invoke-WebRequest` + UTF-8 bytes | ✅ 正確 | 推薦 |
| `curl --data-binary @file.json`（UTF-8 檔） | ✅ 正確 | 替代方案 |

---

## 目前 WWT 專案狀態

| 功能 | 狀態 |
|---|---|
| Phase 2F Step 1：main.js 固定 1920×1080 + FIT | ✅ 完成 |
| Phase 2F Step 2：移除 resize handler | ✅ 完成 |
| Phase 2D Task 6：F2 Debug Overlay | ✅ 完成 |
| /api/topic 中文傳輸 | ✅ 已確認（用 PowerShell） |
