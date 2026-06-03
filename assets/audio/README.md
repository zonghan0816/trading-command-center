# BGM 音檔目錄

## 規格（Phase 4 Step 5.25、走 GPT 82 B' 方案、公司端改成雙首輪流）

放兩個檔案：**`bgm_1.mp3`** + **`bgm_2.mp3`**

- 程式行為：bgm_1 → 播完 → bgm_2 → 播完 → bgm_1 →（無限循環）
- 曲風：lofi / soft podcast background / chill beat
- 節奏：中慢速
- 情緒：中性、穩定、不搶對話
- 長度：3-10 分鐘無縫即可（程式會接歌）
- 音量：歸一化、程式預設 0.28

## 開關（隱藏式）

**沒有畫面按鈕**。點左上角「24H AI LIVE」品牌 badge 切換 mute / unmute、觀眾看不出來是控制 BGM。

狀態存在 localStorage `bgm_muted = "0" / "1"`、重整保留。

## 合法來源（GPT 推薦）

| 來源 | 網址 | 備註 |
|---|---|---|
| YouTube Audio Library | studio.youtube.com → 音效庫 | 完全免費、YT 直播零風險 |
| Pixabay Music | pixabay.com/music | CC0、商用 OK |
| Free Music Archive | freemusicarchive.org | 看授權、選 CC0 / CC-BY |
| Incompetech | incompetech.com | Kevin MacLeod、CC-BY |
| Uppbeat | uppbeat.io | 部分免費、需註冊 |
| Bensound | bensound.com | 部分免費、要標註 |

**避免**：Spotify / YouTube Music / 一般流行歌 / 不明來源 BGM / AI 生成但版權不清楚的音樂

## 目前放入的曲目

| key | 曲名 | 來源 | YT 直播風險 |
|---|---|---|---|
| bgm_1 | PCH | YouTube Audio Library | ✅ 零風險 |
| bgm_2 | Patrick Patrikios「Lets Go Back」 | YouTube Audio Library | ✅ 零風險 |

兩首都是 YT Audio Library 取得、上自家頻道直播不會被 ContentID 標記。

## 沒放音檔的話

`_startBgm()` 會 `cache.audio.exists()` 過濾、缺哪首就跳過、兩首都缺則 console.warn 並無聲帶過、整體不 crash。

## 不會進 git

`.gitignore` 已排除 `*.{mp3,ogg,wav}`、版權檔不會被推上 GitHub。
