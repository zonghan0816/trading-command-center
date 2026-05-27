# WWT MVP 完成報告

## 目前狀態

Phase 1 全部完成，API 測試通過。

---

## 完成項目

### 已修改的 5 個檔案

| 檔案 | 修改內容 |
|---|---|
| server.py | 2 角色（阿明哥/小美姐）、WWT 鄉民 prompt、/api/topic、wwt_state.json |
| config.js | aming/xiaomei 設定、橘紅主題 #FF6B35、layout.hosts 左右座位 |
| BootScene.js | preload 改為 char_aming/char_xiaomei，程序生成色塊 sprite |
| OfficeScene.js | STATIONS 換 2 人、_applyState 讀 hosts、Bubble/走路/_chatInProgress 保留 |
| index.html | WWT 標題、橘紅 header、今日話題面板、新 status dot CSS |

---

## API 測試結果

### /api/state
```json
{
  "updated_at": "15:22:57",
  "scene": "studio",
  "mode": "idle",
  "topic": "",
  "hosts": {
    "aming":   { "status": "idle", "last_output": "", "emotion": "neutral" },
    "xiaomei": { "status": "idle", "last_output": "", "emotion": "neutral" }
  }
}
```

### /api/topic（輸入「台北房價」）
```json
{ "ok": true, "topic": "台北房價", "mode": "discussion" }
```
→ state 更新：topic 寫入、mode = discussion、兩人 status = thinking ✅

### /api/chat（閒聊模式）
```
xiaomei: 靠夭喔，最近夜市蚵仔煎生意超好，排隊排到天邊。
aming: 真的假的？我跟你講喔，以前夜市人沒那麼多啦。
xiaomei: 不意外啦，疫情後大家都想出門嗨，美食最療癒。
```

### /api/chat（討論模式，話題：台北房價）
```
aming: 信義區180萬？靠北喔，以前不是這樣的啦。
xiaomei: 有夠扯，這是坪數還是定金啦哈哈。
aming: 我跟你講喔，真的假的，這根本買不到房。
```

常用語出現：靠夭喔 / 真的假的 / 我跟你講喔 / 不意外 / 靠北喔 / 有夠扯 ✅

---

## 現有架構

```
trading-command-center/
├── index.html              ← WWT 標題 + 橘紅 header + 今日話題面板
├── server.py               ← FastAPI :8765，wwt_state.json
├── wwt_state.json          ← runtime state（自動建立）
├── .env                    ← ANTHROPIC_API_KEY
├── src/
│   ├── config.js           ← aming/xiaomei、橘紅主題、layout.hosts
│   └── scenes/
│       ├── BootScene.js    ← preload + 程序生成 sprite
│       └── OfficeScene.js  ← 主場景：2 主持人、bubble、walking、polling
└── assets/
    ├── office-complete.png ← 辦公室背景（沿用）
    ├── desk.png
    └── ...
```

---

## 目前保留的功能

- `_chatInProgress` 防覆蓋機制 ✅
- Bubble 顯示/隱藏/打字動畫 ✅
- 角色走路系統（走向對方說話、走回原位）✅
- polling 每 5 秒讀 state ✅
- Claude Haiku 4.5 對話生成 ✅
- 粒子資料流（_triggerDataFlow）✅

---

## 待解決 / 下一步

### 視覺問題（需確認）
- 阿明哥/小美姐是否正確出現在畫面左右兩側
- 中央主持桌（矩形）位置是否合適
- 背景目前沿用 office-complete.png（辦公室風），Phase 2 換直播間背景

### Phase 2 建議項目
1. **Google News RSS 自動抓話題**：抓台灣新聞 → 自動填入 /api/topic
2. **場景背景切換**：studio / newsdesk / coffee（依 state.scene 切換）
3. **滾動留言牆**：模擬觀眾留言
4. **話題冷卻機制**：同一話題討論 N 輪後自動換話題

### Phase 3
- PTT / Dcard 資料串接
- 正式角色 sprite 美術（取代色塊）
- 直播間背景美術

---

## 已知限制

- `wwt_state.json` 不 commit（runtime 狀態，gitignore）
- `.env` 不 commit
- curl 在 Windows 終端有 Big5/UTF-8 編碼衝突，測試用 Python urllib 或 PowerShell Invoke-RestMethod
- 角色目前是程序生成色塊，非正式美術
