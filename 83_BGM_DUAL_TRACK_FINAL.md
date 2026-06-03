# Step 5.25-5.26 BGM 最終實作紀錄

**類型**：實作紀錄 + 決策路徑（不是給 GPT 的請求、是給未來 Claude / 自己回頭看用）
**承接**：82 BGM 決策請求 + 82 GPT 回覆（B' 單首 lofi）
**狀態**：✅ 已上線、推到 origin/master、commit `1819608`

---

## 決策路徑全紀錄

```
Step 5.25（家裡 Claude）   GPT 82 拍板 B'（單首 lofi）→ 寫 scaffolding
        ↓
        實作：BootScene preload bgm_main、OfficeScene _startBgm()
              + 右上角顯示「BGM ON/OFF」按鈕
              + autoplay 政策保險
              + 缺音檔無聲帶過
        ↓
        commit 7b0552a 推上 GitHub
        ↓
        家裡睡覺
        ↓
Step 5.25b（公司 Claude）  改方向 → 雙首輪流播
        ↓
        commit b7800a0：BGM 兩首輪流（bgm_1 / bgm_2、PCH + Lets Go Back）
        commit df43ac8：開關移到 24H AI LIVE badge 隱藏點擊（畫面不顯示按鈕）
        commit be66c2f：存進度
        commit 79181d6：對話泡泡字級 26→30px
        ↓
        家裡 git pull 拉回
        ↓
Step 5.25c（家裡 Claude）  修兩個漏的
        ↓
        - brand-badge CSS pointer-events: none → auto（公司加了 click 監聽但 CSS 沒打開）
        - README 對齊雙首實作
        - 刪重複 3Q txt（家裡 commit 過、公司 pull 進來一份更全的）
        ↓
        commit 1819608 推上 GitHub ← **最終狀態**
```

---

## 最終實作規格

### 程式檔

| 檔案 | 內容 |
|---|---|
| `src/scenes/BootScene.js` | `this.load.audio('bgm_1', [...])` + `this.load.audio('bgm_2', [...])` + `loaderror` 監聽 |
| `src/scenes/OfficeScene.js` | `_startBgm()` 過濾存在的 key、`_playNextBgm()` 播完換下一首、`window.addEventListener('bgm-toggle')` 監聽外部切換 |
| `index.html` | `#brand-badge` 加 `pointer-events: auto` + `cursor: pointer` + click listener 改 localStorage + dispatch `bgm-toggle` event |
| `assets/audio/README.md` | 雙首規格 + 隱藏開關說明 + 目前曲目 |
| `.gitignore` | `assets/audio/*.{mp3,ogg,wav}` 排除版權檔 |

### 行為

- **預設**：兩首輪流播、第一首 bgm_1 → 播完換 bgm_2 → 播完換 bgm_1（無限循環）
- **音量**：0.28（程式 hardcoded）
- **開關**：點左上角「24H AI LIVE」badge、觀眾看不出來是 BGM 控制
- **狀態保留**：localStorage `bgm_muted = "0" / "1"`、重整保留
- **autoplay 政策**：第一次 play 失敗時、等首次 pointerdown 重試
- **缺音檔**：cache.audio.exists() 過濾、缺哪首跳過、兩首都缺 console.warn 並無聲帶過

### 跟 82 B' 原方案的差異

| 項目 | 82 B'（家裡實作） | 最終（公司改 + 家裡修） |
|---|---|---|
| 音檔數 | 1 首 `bgm_main` | **2 首輪流** `bgm_1` + `bgm_2` |
| 開關位置 | 右上角顯示按鈕 | **隱藏在 24H AI LIVE badge** |
| 觀眾可見 | 看得到「BGM ON/OFF」 | 完全看不到 BGM 元件 |
| 24H 久聽 | 同一首 loop | 兩首交替、不易膩 |

公司端的調整都是優化、跟 82 B' 大方向相容（都是 Phaser 端內建、不情緒切歌、不時段切歌、不 ducking）。

---

## 目前 BGM 曲目

| key | 檔名 | 來源 | 長度 |
|---|---|---|---|
| bgm_1 | `bgm_1.mp3` (7.2 MB) | PCH | 待補 |
| bgm_2 | `bgm_2.mp3` (6.3 MB) | Patrick Patrikios「Lets Go Back」 | 待補 |

**授權狀態**：待確認（公司端沒附來源網址、之後要追溯是否 YT Audio Library / Pixabay）。
**ContentID 風險**：未驗證、上線前應在 OBS 測試環境直播 1 小時看 YouTube 後台有沒有 claim。

---

## 為什麼分兩階段（家裡 → 公司 → 家裡）才完成

1. **B' 的 spec 本身允許演化**：「單首 loop」是最小可行設計、雙首輪流是同方案內的優化
2. **公司端發現「24H 同一首聽到膩」的實際感受**、合理改雙首
3. **隱藏式開關**符合「假 24H 直播」的視覺乾淨原則（CTA 跟 LED 已經夠多元素）
4. **家裡修小漏**（CSS pointer-events + README 同步）— 公司端寫得快、漏 CSS 細節

---

## 之後可能升級的方向（不在 5.25 scope）

- 雙首 → 3-5 首歌單輪播
- 時段制 BGM（早晨 chill / 深夜 ambient）— 跟時段制 host rotation 一起做
- 整點換場 sting（5 秒短音效）
- 對話進行時 ducking（壓低 BGM 音量 30%）
- 同 Phaser sound bus、可外控音量

這些都不在 GPT 82 拍板的範圍、等驗證一兩週看實際聽感再決定。

---

## 給未來 Claude 的提醒

1. **改 BGM 邏輯前先看 `_startBgm()` 跟 `_playNextBgm()` 的 _bgmTrack 生命週期**、不要洩漏 Phaser sound object
2. **不要把音檔 commit 進 git**（`.gitignore` 已擋、但要確認新增的 .mp3 沒被 force-add）
3. **改開關位置**前要同時改 `index.html` 跟 `OfficeScene._startBgm()`、兩邊用 `bgm-toggle` event 解耦
4. **預設音量 0.28** 是 GPT 拍板數字、要改先回頭看 82
