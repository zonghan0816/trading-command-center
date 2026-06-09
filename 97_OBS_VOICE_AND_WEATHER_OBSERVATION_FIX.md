# 97 — OBS 主持人沒聲音修復 + 天氣改吃「即時觀測」

> 2026-06-09。本次處理使用者回報的兩個現場問題：① OBS 只有 BGM 沒主持聲音；② 台北背景一直顯示雷雨。
> 兩者都不是表面看到的那回事，根因都在「資料/依賴」層。

---

## 問題 1：OBS 只有 BGM、沒有主持人聲音（網頁卻有）

### 症狀
瀏覽器開 `localhost:8765` 主持人有聲音；同一頁丟進 OBS Browser Source 只剩 BGM、主持人啞掉。

### 根因（不是 OBS 設定問題）
主持聲音有兩條路（`OfficeScene._playLineSequence`）：
1. **首選**：server 用 Edge-TTS 產生的 mp3（`/tts/xxx.mp3`）→ `new Audio()` 播 → **OBS 支援**。
2. **備援**：`speechSynthesis`（瀏覽器內建 Web Speech API）。

三個事實串起來：
- **`啟動.bat` 第 6 行只裝 `fastapi uvicorn anthropic python-dotenv`、漏裝 `edge-tts`**（requirements.txt 有列、但 .bat 用另一份寫死的清單）。
- 實測本機 `import edge_tts` → ModuleNotFoundError、TTS 快取 0 個 mp3（從沒成功產生過）。
- 所以 server 每句走 `_gen_tts_line` 的 `except ImportError: return None` → `audio_urls` 全 null → 前端 `line._audio` null → **每句掉到 `speechSynthesis` 備援**。

致命點：**OBS 內嵌的 CEF/Chromium 沒有內建任何 TTS 語音引擎**，`speechSynthesis` 在 OBS 裡完全靜音；桌面瀏覽器則有 Windows 語音 → 所以「網頁有、OBS 沒有」。BGM 走 Phaser Web Audio + 打包 mp3、OBS 支援 → 只剩 BGM。

### 修法
1. `pip install edge-tts`（本機補裝、實測能對微軟產出 19728 bytes 真實 mp3）。
2. 改 `啟動.bat`：安裝清單補上 `edge-tts`，以後雙擊啟動不再漏。

### 生效方式
重啟 server → 開始產 mp3 → 前端走 `new Audio()` → OBS 有聲音。
驗證：主持聲音從機械 Windows 嗓音變成自然台灣 Edge 語音（陳柏偉 YunJhe／王于安 HsiaoChen）= 走的是 mp3、OBS 同步有聲。

---

## 問題 2：台北背景一直雷雨

### 根因（兩層）
- **對應太貪心**：`_map_wx_to_weather` 只要文字含「雷」就回 `thunder`。台灣夏天 36hr 預報幾乎天天「午後/短暫雷陣雨」→ 背景永遠閃電。
- **更根本：來源用錯**。原本吃 `F-C0032-001`（36hr **預報**），預報會「賭最壞情況」。實測今天台北：
  - 預報 time[0] = 「陰陣雨或雷雨」（**沒帶**短暫/午後）→ 即使修了對應仍判 thunder。
  - **即時觀測** = 「陰」（25.2°C、沒在打雷）← 這才是窗外當下真相。

### 修法（觀測優先、預報後備）
- 對應 `_map_wx_to_weather`：午後/短暫雷陣雨降級 `rain`，只有非短暫的雷雨/大雷雨才 `thunder`（讓預報後備也不亂打雷）。
- 新增 `_fetch_cwa_observation()` 吃 **`O-A0003-001` 即時觀測**（測站「當下」`WeatherElement.Weather`）。
- `_fetch_cwa_weather()` 改成 `_fetch_cwa_observation() or _fetch_cwa_forecast()`（觀測拿不到才退預報）。
- 測站名自動推導：縣市去「市/縣」（臺北市→臺北、臺中市→臺中…剛好對得上局屬測站），少數例外列 `_CWA_CITY_STATION`（新北→板橋、桃園→新屋、屏東→恆春、南投→日月潭、連江→馬祖），可用 `CWA_STATION` 覆寫。

### 為什麼這樣改（決策路徑）
產品 DNA 要的是「窗外跟我家一樣」=「**現在這一刻**的實況」、不是預報。預報本質是會 hedge 的未來推測，拿來當「現況」必然過度報雨/雷。所以正解是換資料源到觀測，而不是繼續在預報文字上做更多 regex 補丁。預報只留作觀測缺資料時的後備。

### 實測（對真 CWA API）
| 函式 | 回傳 |
|---|---|
| 推導測站名 | 臺北 |
| `_fetch_cwa_observation()`（新、優先）| `('cloudy', '觀測:陰')` ✅ |
| `_fetch_cwa_forecast()`（後備）| `('thunder', '預報:陰陣雨或雷雨')` ← 舊 bug |
| `_fetch_cwa_weather()` 最終 | `('cloudy', '觀測:陰')` ✅ |

`python -m py_compile server.py` 通過。

### 生效方式
重啟 server。state 每次啟動 reset（`_save_state(_default_state())`）、`weather_auto` 由 `.env` 有無 CWA key 決定 → 有 key 就自動開。約 20–30 秒後第一次抓到觀測立即同步背景。
配額：觀測每 15 分一次 ≈ 96 次/天、很安全。

---

## 跟之前方案的差異
- Step 5.41 的天氣自動只吃預報（`F-C0032-001`）。本次**改為觀測優先**、預報降為後備。`_weather_auto_loop` 邏輯不動（仍呼叫 `_fetch_cwa_weather`、只是底下資料源換了）。
- `啟動.bat` 的依賴清單長期漏 `edge-tts`（造成雲端/他機 OBS 沒聲音的隱性 bug）、本次補上。

## 待辦 / 注意
- 另一台直播機要同樣：`.env` 補 `CWA_API_KEY` + `git pull` + 重啟。
- 觀測 `Weather` 欄極少數會回無資料（`-99`/`X`）→ 已視為無效、自動退預報。
