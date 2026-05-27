# WWT MVP 測試簡報

## 目前進度

五個檔案全部完成：

- server.py ✅（2 角色、WWT prompt、/api/topic、wwt_state.json）
- config.js ✅（aming/xiaomei、橘紅主題、layout.hosts）
- BootScene.js ✅（preload 改為 char_aming/char_xiaomei）
- OfficeScene.js ✅（STATIONS 換 2 人、_applyState 讀 hosts、Bubble 保留）
- index.html ✅（WWT 標題、橘紅主題色、今日話題面板）

---

## 啟動方式

```
雙擊 啟動.bat
或
python server.py
瀏覽 http://localhost:8765
```

---

## 現有架構

```
trading-command-center/
├── index.html        ← WWT 標題 + 橘紅 header
├── server.py         ← FastAPI :8765
├── wwt_state.json    ← runtime state（server 啟動自動建立）
├── src/
│   ├── config.js     ← aming/xiaomei 設定
│   └── scenes/
│       ├── BootScene.js    ← preload + 程序生成 sprite
│       └── OfficeScene.js  ← 主場景
└── assets/
    └── desk.png, office-complete.png, 1.png ...
```

---

## State 格式（wwt_state.json）

```json
{
  "updated_at": "21:00:00",
  "scene": "studio",
  "mode": "idle",
  "topic": "",
  "topic_summary": "",
  "mood": "neutral",
  "activity": "idle",
  "hosts": {
    "aming":   { "status": "idle", "last_output": "", "emotion": "neutral" },
    "xiaomei": { "status": "idle", "last_output": "", "emotion": "neutral" }
  }
}
```

---

## MVP 測試清單

### 基本啟動
- [ ] server.py 無報錯啟動
- [ ] 瀏覽器打開 http://localhost:8765 無白畫面
- [ ] Header 顯示「晚晚嘴台灣 WWT」橘紅色
- [ ] 右上角面板顯示「今日話題」

### 角色顯示
- [ ] 阿明哥出現在畫面左側（色塊 sprite）
- [ ] 小美姐出現在畫面右側（色塊 sprite）
- [ ] 兩人有上下浮動動畫
- [ ] 名稱標籤「🎙 阿明哥」「🎙 小美姐」可見

### 對話系統
- [ ] 啟動後 1.5 秒自動發出 /api/chat
- [ ] Claude 生成 2-4 句對話
- [ ] 說話者走向對方、Bubble 顯示台詞
- [ ] 台詞有鄉民風格（常用語出現）
- [ ] 說完後走回原位、Bubble 消失
- [ ] 1.5 秒後自動觸發下一輪對話

### 手動輸入 topic
```bash
curl -X POST http://localhost:8765/api/topic \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"台北房價創新高\",\"summary\":\"信義區均價突破 180 萬/坪\"}"
```
- [ ] 回傳 `{"ok": true, "topic": "台北房價創新高", "mode": "discussion"}`
- [ ] 右上角面板顯示 📌 台北房價創新高
- [ ] 下一輪對話圍繞房價話題

### OBS 截取
- [ ] OBS 新增「瀏覽器來源」http://localhost:8765
- [ ] 畫面正常顯示

---

## 常見問題排查

### 畫面空白
- 確認 Python 版本 3.11+
- 確認 `pip install -r requirements.txt` 完成
- 開 F12 看 Console 有無 JS 錯誤

### 角色不出現
- 確認 config.js characters 只有 aming / xiaomei
- 確認 BootScene._makeCharacters() 有生成 char_aming 和 char_xiaomei

### 對話不生成
- 確認 .env 有 ANTHROPIC_API_KEY
- curl GET http://localhost:8765/api/state 確認 JSON 格式正確

### _chatInProgress 卡住
- 重新整理瀏覽器即可重置

---

## 下一步（MVP 通過後）

Phase 2：
- Google News RSS 自動抓話題
- newsdesk / coffee 場景切換
- 滾動留言牆

Phase 3：
- PTT / Dcard 資料串接
- 正式角色 sprite 美術
