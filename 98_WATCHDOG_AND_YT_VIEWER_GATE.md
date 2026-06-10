# 98 — 前端 watchdog（凍住自動復原）+ YT 互動「有人看才讀」省配額

> 2026-06-10。本次處理上線跑出來的兩個真實問題：① 前端凍死 7 小時沒人發現；② YT Data API 每日配額被燒爆。

---

## 問題 1：主播兩位都不動不說（前端凍住 7 小時）

### 診斷
使用者回報主播凍住，但後端 log 還在出段。實打這台 server：
- 後端健康（`/api/next_segment` 正常出段、TTS 2/2、pool pending=25）。
- `/api/state` 的 `updated_at` 卡在 **03:21:27**、實際已 **10:13** → **state 卡了快 7 小時**。

結論：背景迴圈（batch refill / news / live insert / YT）跟前端死活無關、照跑照印 log；唯一跟前端有關的 `[pool] ▶ 播放` 早就停了 → **前端網頁凍住、不再呼叫 `/api/next_segment`**。

### 根因
前端出段迴圈整條靠 Phaser 的 `this.time.delayedCall` 串接（`_fetchAndPlayDialogue` → `_startDialogueFromData` → `_playDialogue` → 完句排下一輪）。兩種凍法會永久卡死：
1. `_chatInProgress` 卡在 `true`（某段播放中途丟例外、沒走到清旗標的 onComplete）→ 之後每次 `_fetchAndPlayDialogue` 一進來就 return。
2. Phaser 渲染迴圈整個死掉（CEF/瀏覽器跑久了）→ 所有 delayedCall 都停（連 idle 動畫都不動＝使用者說的「不動」）。

### 修法：瀏覽器層 watchdog（不靠 Phaser 時鐘）
心跳（OfficeScene.js 5 處）：
- `window.__tdtSceneAlive`：`update()` **每幀**更新 → Phaser 渲染迴圈活著的證明。
- `window.__tdtPlayTs`：`_playLineSequence` **每句** + `_fetchAndPlayDialogue` 的 pool 空重試 + 暫停分支都更新 → 「迴圈有在動」的證明（pool 空/暫停不會誤判）。

watchdog（index.html，純 `setInterval`、Phaser 死了也照跑）每 8s 檢查、三層：
1. `__tdtSceneAlive` 停 >25s（渲染迴圈死）→ `location.reload()`。
2. `__tdtPlayTs` 停 >90s（畫面活但對話卡）→ **軟復原**：`_chatInProgress=false`、清 prefetch、重踢 `_fetchAndPlayDialogue()`（不閃畫面）。
3. `__tdtPlayTs` 停 >240s（軟復原無效）→ reload。
- reload 至少間隔 60s（sessionStorage 記錄）、不狂閃；開場 30s 寬限等載入。

**效果**：這次的 7 小時凍死，有 watchdog 的話 25 秒內就自動 reload 復活。為什麼用 `setInterval` 不用 Phaser 時鐘 → 因為「不動」正是 Phaser 迴圈死掉，得用獨立於它的東西才救得回。

驗證：瀏覽器 console 出現 `[watchdog] 24H 前端看門狗已啟動 (scene<25s, soft 90s, hard 240s)` = 載入成功。純前端、刷新即生效、不用重啟 server。

---

## 問題 2：YT Data API 配額被燒爆（沒人聊天也爆）

### 根因
`liveChatMessages.list` 每次 **5 unit**、每 8 秒一發 → 一天 ~54,000 unit，遠超免費 **10,000 unit/日** → 約 4-5 小時就爆、之後整天 403。**關鍵：配額是「輪詢動作」在燒、跟有沒有人聊天無關**（空聊天室照扣）。

### 使用者真正的目的
不是 24/7 都要回，而是**勾住臨時闖進來的路人**（讓他發現「這 AI 會回我」就留下/幫宣傳）。但「24/7 一直開」反而達不到 —— 撐 5 小時就死，訪客若在死掉的時段進來一樣沒回應，CTA 寫「主持人會回你」卻不回更糟。

### 修法：viewer_gate「有人看才讀」
重寫 `_yt_api_chat_loop`：
- 抽出 `_fetch_meta()`：一次 `videos.list`（1 unit）同時拿 `activeLiveChatId` + `concurrentViewers`。
- **沒人看**（`viewers` 非 >0）：不讀聊天（貴）、只每 `idle_poll_sec`（預設 40s）偷瞄一次人數（便宜 1 unit）。
- **一有人看**：才進聊天輪詢（`liveChatMessages.list`）；讀聊天時每 60s 順手更新人數，人走了下一圈回省配額模式。
- 進入有人看時 `page_token=None`、從「現在」讀、不撈舊 backlog。

新設定鍵：`viewer_gate`（預設 True）、`idle_poll_sec`（預設 40），已進 `_YT_PERSIST_KEYS`（存檔/重啟保留）、`/api/yt/config` 可調、`/api/yt/status` 可看。

**效果**：把有限的 10k unit **集中在真的有訪客的那幾分鐘**。小頻道大半天沒人看時幾乎不花配額、有人來 AI 就醒著等他回。

⚠️ 限制：`viewers=None`（私人直播 / 主播關掉觀看數顯示）一律當「沒人看」→ 不讀聊天。要照讀就把 `viewer_gate` 關掉。**所以直播要公開**（本來吸引路人就得公開、剛好沒問題）。

### 順手
- **口播邀請改 10 分一次**（`invite_every_sec` 600，machine-local 存 `wwt_yt_config.json`、不進 git）。
- **放棄申請提高配額**：審核太繁瑣（要 ToS / 隱私權政策 / 首頁截圖 / OAuth 同意畫面截圖…數週、不保證過）。小頻道用 viewer_gate 就夠；等真的 24/7 都爆配額了再走審核（PP/ToS 草稿留著到時候能用）。

---

## 部署 / 跟之前的差異
- 兩項都要**重啟 server** 載入（聰明版）；watchdog 純前端、刷新即可。
- 重啟實測：`viewer_gate=True`、`idle_poll_sec=40`、`invite_every_sec=600` 都正確載入；**順帶驗證到 97 的天氣修復也成功**（`[weather] 自動：clear → rain（觀測:陰有雨）`、今天真的在下雨、不再被預報騙去打雷）。
- YT 互動從「連上就 24/7 死命讀」改成「viewer-gated 有人才讀」；`_yt_api_chat_loop` 之外的 pipeline（P0–P6）不動。

## 待辦 / 注意
- 今天配額已爆、要等**台灣下午 3 點**（美西午夜）重置才恢復；在那之前連 1 unit 的偷瞄都會 403（低頻、無害）。
- watchdog 只救「JS event loop 還活著、但 Phaser 死/對話卡」；若整個 CEF process 當掉（連 setInterval 都停）需 OBS 層重啟、頁內救不了。
