# BGM 音檔目錄

## 規格（Phase 4 Step 5.25、走 GPT 82 B' 方案）

放一個檔案：**`bgm_main.mp3`** 或 **`bgm_main.ogg`**（兩個都放更穩、瀏覽器自動選）。

- 曲風：lofi / soft podcast background / chill beat
- 節奏：中慢速
- 情緒：中性、穩定、不搶對話
- 長度：3-10 分鐘無縫 loop（程式會 loop）
- 音量：歸一化即可、程式預設 0.28

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

## 找好後

1. 改名 → `bgm_main.mp3`
2. 拖到這個目錄
3. **不要 commit 進 git**（已加入 `.gitignore`、避免版權檔大小爆）
4. 啟動 server、瀏覽器 Ctrl+Shift+R、應該聽到聲音
5. 右上角會有 BGM ON/OFF 按鈕

## 沒放音檔的話

程式會 console.warn 提示、整體無聲帶過、不會 crash。
