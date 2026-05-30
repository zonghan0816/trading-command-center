# TDT 天天嘴台灣 — Claude 助理導讀

> **這個檔案是給 Claude Code 自動讀取的專案導覽**。每次 Claude 在這個資料夾開啟，會自動把這份檔案載入 context。
> 使用者**有記憶障礙**，沒有這份紀錄前一次做到哪會完全失憶。請主動參考「📍 目前進度」段落，並在每次工作結束時更新它。

> ⚠️ **目錄名仍是 `trading-command-center`、檔名仍有 `wwt_*.json`** — 那是 legacy（這專案原本是 7 個 AI 交易員 dashboard、後來轉型成 TDT 鄉民談話節目）。**不需要為改名而重構**、繼續沿用就好。

---

## 🚀 兩句口訣（使用者請記兩句就好）

| 時機 | 跟 Claude 說 | Claude 應做 |
|---|---|---|
| **開工** | 「**接續**」或「**看 CLAUDE.md 接續做**」 | 讀本檔「📍 目前進度」+ `git log` 最近 commit，告訴使用者上一次做到什麼、下一步候選 |
| **收工** | 「**存進度**」 | 1. 更新本檔「📍 目前進度」<br>2. `git add . && git commit && git push` |

> Claude 給自己的提示：使用者使用上面任一關鍵字時，**立刻執行對應動作**，不要回「你確定嗎」之類的反問。「存進度」是該主動 commit + push 的指令、不是徵詢。

---

## 一句話介紹

**TDT 天天嘴台灣（Taiwan Daily Talk）** — 一個**「假 24H AI 直播」**、兩位 AI 角色「阿明哥」「小美姐」**不停聊新聞、像 24 小時 live 但其實是預生成內容循環播放**的長時間表演。Phaser 3.60 + FastAPI + Claude Haiku 4.5、設計用於 **OBS Browser Source 串 YouTube 24H 私人/公開直播**。

---

## 🎯 ★ 產品定位（2026-05-31 重大澄清）

**這不是新聞台、不是即時新聞評論頻道**。是**「24H AI 角色聊新聞的長時間表演」**。

### 真實定位

| 之前誤解（要打破）| 真實定位 |
|---|---|
| 24H 新聞台 / 即時新聞頻道 | **24H AI 角色聊天表演** |
| 重視新聞即時性 | 重視「角色一致、不停聊天的氛圍」 |
| 需要 live 緊張感 | 只需要「看起來像 live」 |
| 像 ETtoday 雲端電視 | **像 LoFi Girl 24H 直播 / 預錄廣播電台** |

### 內容風格

- 💬 詼諧、批評、嘲諷、討論
- 🗞️ 真實新聞當素材（從 RSS 抓）
- 🎭 兩個 AI 角色「不停聊天」的表演感
- 📺 新聞大到宇宙末日、小到某細菌外遇都可以聊

### 「假 24H 直播」並不算造假

| 元素 | 真假 |
|---|---|
| AI 生成內容 | ✅ 真的（Claude 生成）|
| 新聞內容 | ✅ 真的（Google News）|
| 角色設定 | ✅ 真的（阿明小美一致）|
| 即時性 | ❌ 是錯覺（預生成循環播）|

像「報紙印好次日上市」本來就有時差、沒人說那是假報紙。

### 目標架構（24H MVP、尚未實作）

| 機制 | 目標 |
|---|---|
| 內容生成 | **Batch 預生成**（一次處理 30-50 條新聞、生成 200-300 段對白）|
| 內容供應 | **Pool 循環播放**（剩 15 段時觸發 refill）|
| Live 模式 | 僅熱門新聞首次出現（佔 ~5% 用量）|
| Topic UI | **拿掉 LED 顯示**（觀眾不需看到「今日話題」）|
| 後端 prompt | **保留** topic / 新聞素材（Claude 仍需具體素材）|
| Step 6.5 prefetch | **砍掉**（batch 模式不需要）|
| 月成本估算 | **NT$100-150**（之前估的 NT$57k 是因為按「即時」算）|

詳細討論在 `62_24H_MVP_DISCUSSION_NOTES.md`、最終決策會合成 `63_24H_MVP_ARCHITECTURE_DECISION.md`。

### ⚠️ 給未來 Claude session 的提示

**不要再把這個專案當「新聞直播」、不要建議「優化即時性」**。
使用者多次澄清：**這是表演、不是新聞**。內容真實、時間是錯覺。
不要被「Step 6.5 prefetch」「reduce gap」「real-time」這些既有 BRIEF 名詞帶偏。
**真正方向 = batch 預生成 + pool 循環、看起來像 live 即可**。

---

---

## 🎙 主持人設定

| 主持人 | 站位 | 個性 | 動作 |
|---|---|---|---|
| **阿明哥** | 左半場 (35%) | 50 歲台灣大叔、議論派、碎念、退休風 | v2 draft 單張 PNG（暫無 multi-frame actions）|
| **小美姐** | 右半場 (65%) | 30 歲都會女性、吐槽派、反諷型 | actions spritesheet 6 frames（idle/talking/thinking/reacting/pointing/tired）|

主持人**固定站位、不走動**（Phase 2F Step 3 以後 movement frozen）。對話用泡泡 + sprite frame 切換表現。

---

## 🔄 對話 pipeline（現況 — Phase 3 Step 6.6 為止）

⚠️ **以下是目前的「即時生成」架構**、會在 24H MVP 改成 batch 預生成 + pool 循環。詳見上面「產品定位」章節。

```
Google News Taiwan RSS（每 10 分鐘 fetch、replace 策略）
        ↓
_news_topics_cache + wwt_news_cache.json（持久化）
        ↓
_topic_rotate_loop：跑滿 5 輪 chat 才換 topic
        ↓
_apply_news_topic → state.topic / mode='discussion' / derive keywords
        ↓
/api/chat：
  - tone shuffled queue（8 種、同 topic 內不重複）
  - angle shuffled queue（8 種、同 topic 內不重複）
  - prompt 含 anti-repetition block（最近 8 輪 tone/angle/lines）
        ↓
Claude Haiku 4.5 生成 dialogue（3~8 秒）
        ↓
寫入 wwt_state.json + wwt_dialogue_memory.json（最近 8 輪）
        ↓
前端 OfficeScene._playLineSequence
  - 每 chunk 自選 action（_chooseLineAction 關鍵字 + PHRASE_OVERRIDE）
  - 完句一律回 idle
  - 整輪結束、前端 prefetch 已預抓下一輪 → gap ≈ 0.5s
```

---

## 🎨 視覺架構

| 元素 | 說明 |
|---|---|
| 中央 LED 螢幕 | 第一焦點、顯示 topic 與 mode 切換動畫 |
| 主持人 + Bubble | 第二焦點、依台詞語氣切 sprite frame |
| 右下 TOP5 熱門榜 | 第三焦點、純文字、依 state.keywords 動態渲染 |
| 右上 Status Panel | 第四焦點、只顯示 topic + mode + 時間（host 區塊已移除）|
| 棚景背景 | 早 / 中 / 晚三套、依本機時間自動 crossfade（60 秒 alpha 過渡）|

**解析度**：固定 1920×1080、`Phaser.Scale.FIT`、給 OBS Browser Source 直播。

---

## 📍 目前進度（每次工作結束更新）

**最後更新**：2026-05-30
**目前階段**：Phase 3 Step 6.5 — Dialogue Gap Reduction（prefetch + 縮 delay）
**下一階段候選**：阿明 actions spritesheet 接線 / PNG 視覺問題修復 / 環境音

### 重點里程碑（依 commit 由舊到新）

| Phase | 內容 |
|---|---|
| 2C | 角色 PNG / desk PNG |
| 2D | Topic pipeline / F2 debug overlay |
| 2E | Topic Driven 對話 prompt 升級 |
| 2F | 1920×1080 FIT / host lane lock / TOP5 readability |
| 2G | End-to-end runtime hardening |
| 3.1 ~ 3.2 | v2 sprites + 新棚景背景 + bubble re-position + TOP5 alignment |
| 3 Step 3.1 | 早中晚背景 crossfade + TDT 改名 + freeze movement |
| 3 Step 4 | 小美 actions spritesheet（6 frames）接線 |
| 3 Step 5 | `_chooseLineAction` 依台詞語氣選動作 |
| 3 Step 5.1 | dialogue pacing + `_dialogueSeq` seq guard + panel sync fix |
| 3 Step 5.2 | 移除右上 panel host 區塊 |
| **3 Step 6** | Google News Taiwan RSS 即時話題接線 |
| **3 Step 6.1** | RSS 持久化 + 8 tone + topic 黏 5 輪 |
| **3 Step 6.2** | 對話結束回 idle + chunk-level action + PHRASE_OVERRIDE |
| **3 Step 6.3** | per-topic tone/angle shuffled queue + dialogue memory + prompt 反重複區塊 |
| **3 Step 6.4** | 啟動立即 seed first topic（修空 topic 死循環）|
| **3 Step 6.5** | prefetch 下一輪 + 縮 4 個人為 delay（gap 從 5~10s 降到 0.5~1s）|
| **3 Step 6.6** | `/api/chat` 500 修復（max_tokens 400→800、JSON 容錯）|
| **★ 重大澄清** | **2026-05-31 產品定位澄清**：不是新聞台、是「假 24H AI 角色聊天表演」。月成本估算從 NT$57k 降到 NT$100-150。**改變整個 24H MVP 架構方向** |
| **24H MVP** | 規劃中（討論於 62 筆記、共識見 63 決策文件、Phase 4 開始實作）|

### 已知待辦 / 限制

- [ ] **產品定位轉向後的架構重做**：Step 6.5 prefetch 將被砍掉、改 batch 預生成 + pool 循環。詳見 `62_24H_MVP_DISCUSSION_NOTES.md`
- [ ] **事實基底 + 活潑風格 prompt 規則**：`server.py` `_build_prompt()` 加「諷刺現象不指控人」規則、24H 開放前必做（法律風險）
- [ ] **小美 PNG 視覺問題**：白色西裝在深背景變透明（AI 生圖去白底副作用）+ 邊緣白光暈。**程式端無法修、要 Codex 重生 `char_xiaomei_actions.png`**。詳見 51~55 BRIEF。
- [ ] **阿明 actions spritesheet 未接**：目前阿明仍是 v2 draft 單張、所有 status 都同 frame
- [ ] BGM / 環境音（OBS 端可加、不需動程式）

---

## 🗂️ 重要檔案地圖

```
trading-command-center/
├── index.html                  # LED overlay + 右上 status panel + F2 debug overlay
├── server.py                   # FastAPI :8765、含 RSS / topic / tone / memory 邏輯
├── 啟動.bat                    # 點兩下啟動：pip install + 開瀏覽器 + python server.py
├── requirements.txt            # fastapi / uvicorn / anthropic / python-dotenv
├── README.md                   # 簡短使用說明
├── CLAUDE.md                   # ← 本檔（Claude 自動載入）
├── WWT_HANDOVER.md             # 詳細交接文件（GPT 也讀這份）
├── wwt_state.json              # runtime state（gitignored、啟動時 reset）
├── wwt_news_cache.json         # RSS 快取（gitignored、replace 策略）
├── wwt_dialogue_memory.json    # 同 topic 最近 8 輪對話記憶（gitignored）
├── .env                        # ANTHROPIC_API_KEY（gitignored、沒設 /api/chat 503）
├── src/
│   ├── main.js                 # Phaser 1920×1080 FIT 設定
│   ├── config.js               # ★ 角色比例、站位、customAssets 開關
│   └── scenes/
│       ├── BootScene.js        # 載入背景 / 角色 spritesheet / 動畫定義
│       └── OfficeScene.js      # ★ 主場景：背景 crossfade、主持人、bubble、polling、prefetch
├── assets/
│   ├── wwt_studio_background_morning_v1.png  # 早晨棚景
│   ├── wwt_studio_background_noon_v1.png     # 中午棚景
│   ├── wwt_studio_background_night_v1.png    # 夜晚棚景
│   ├── char_aming_v2_draft.png               # 阿明 v2 單張
│   ├── char_xiaomei_actions.png              # ★ 小美 6 frame spritesheet
│   └── char_xiaomei_{idle,talking,...}.png   # 小美單張參考
├── 49 ~ 57 *_IMPL_BRIEF.md     # 各 Phase 完成報告（給 GPT 看）
├── 56_DIALOGUE_GAP_REPORT.md   # gap 分析報告
└── claude_STEP6.*_*.md         # GPT 給 Claude 的指令檔（已 commit 留 audit）
```

---

## ⚙️ 環境約定

- **Python**：3.11+
- **後端**：FastAPI on `localhost:8765`
- **Claude API**：`claude-haiku-4-5-20251001`（每對話 ~NT$1-3）
- **作業系統**：Windows 10/11
- **`啟動.bat`**：給人雙擊用、保留 `pause`、檔頂有 `chcp 65001`
- **State 檔不 commit**：`wwt_state.json` / `wwt_news_cache.json` / `wwt_dialogue_memory.json` / `.env`
- **沒有 sibling repo 依賴**：TDT 是 standalone、不再讀 `../trading-system/`（那是舊版交易中心時代）

---

## 🚀 常用指令

```bash
# 啟動（雙擊 啟動.bat 也可）
python server.py

# 瀏覽器
http://localhost:8765

# 設定手動 topic（會暫停自動 rotate）
curl -X POST http://localhost:8765/api/topic \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"自選話題\"}"

# 立即換成新聞快取中的隨機一條（解鎖 topic_locked）
curl -X POST http://localhost:8765/api/news/rotate_topic

# 看當前新聞快取
curl http://localhost:8765/api/news

# 強制刷新新聞快取
curl -X POST http://localhost:8765/api/news/refresh
```

**沒設 `ANTHROPIC_API_KEY` 也能跑**：視覺場景照常運作、`/api/chat` 回 503、前端每 3 秒重試。

---

## 🔁 同步流程（家 ↔ 公司）

| 場景 | 指令 |
|---|---|
| 開工前 | `git pull` |
| 收工前 | `git add . && git commit -m "說明" && git push` |

`.env` **不會跟著 git**、公司端要手動建立（`ANTHROPIC_API_KEY=sk-ant-...`）。

---

## 🤝 GPT / Claude 協作模式

| 角色 | 職責 |
|---|---|
| **使用者** | 提供畫面截圖、描述觀感、決定下一步方向 |
| **GPT (Codex)** | 讀 BRIEF + 交接檔、判斷方向、產生 `.md` 指令檔交給 Claude、生成 / 整理圖片素材 |
| **Claude** | 依指令檔修改程式、接 GPT 提供的素材、完成後輸出 `XX_PHASE3_STEPX.X_IMPL_BRIEF.md` |

> ⚠️ Claude 不重新生成圖片素材（除非使用者明確要求）。視覺問題（白光暈、衣服透明等）屬 PNG 層、Claude 在 BRIEF 註記給 GPT 處理。

詳細協作守則見 [WWT_HANDOVER.md](WWT_HANDOVER.md) 第十七章。

---

## 💡 給 Claude 的工作守則

- **使用者有記憶障礙** — 每次完成段落工作後，**主動更新「📍 目前進度」並提醒使用者 commit + push**
- 改 `OfficeScene.js` 的 polling / state apply 邏輯時、確認 `_chatInProgress` 不會被狀態同步覆蓋（Step 5.1 已修過）
- 改 `OfficeScene.js` 的 `_playLineSequence` / `_playDialogue` 時、注意 `_dialogueSeq` seq guard 不要漏（防 race condition）
- 不要把 `ANTHROPIC_API_KEY` 寫進任何 commit 檔案
- 修改 `config.js` 的角色比例 / scale 不需要動 BootScene 程式
- `啟動.bat` 檔頂須有 `chcp 65001`（UTF-8）
- 不恢復 walking / wander / random movement（Movement frozen 是設計、不是 bug）
- **PNG 視覺問題**（白光暈 / 衣服透明）程式端不修、註記給 Codex
