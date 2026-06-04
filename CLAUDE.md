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

**TDT 天天嘴台灣（Taiwan Daily Talk）** — 一個**「假 24H AI 直播」**、兩位 AI 角色「陳柏偉」「王于安」**不停聊新聞、像 24 小時 live 但其實是預生成內容循環播放**的長時間表演。Phaser 3.60 + FastAPI + Claude Haiku 4.5、設計用於 **OBS Browser Source 串 YouTube 24H 私人/公開直播**。

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

### 🎭 4 時段 × 同棚換道具 × 2 組角色（輕量設計）

**核心**：還是「兩個 AI 永遠聊天」、只是擴成「**最多 4 個 AI 永遠直播聊天**」、**沒有主節目層級**。

| 時段 | 棚景 | 道具疊加 | 姿勢 | 角色 |
|---|---|---|---|---|
| 6AM-12PM | 基本棚 | 麥克風架、咖啡杯 | 站著 | A 組（暫定）|
| 12PM-6PM | 基本棚 | 桌、茶杯、蛋糕盤 | 坐 | A 組（暫定）|
| 6PM-12AM | 基本棚 | 主播台 | 站 | B 組（含阿明 / 王于安） |
| 12AM-6AM | 基本棚 | 2 張床、枕頭、床頭燈 | 坐床上 | B 組（暫定）|

**設計重點**：

- **1 個棚景** + **4 套道具疊加**（不是 4 個新場景）
- **2 組角色 = 4 個獨立 character**（不是 8 個）
- **4 時段平起平坐**（沒有主節目 / 黃金時段優越論）
- 季節：同棚 + 換衣服 + 季節道具（暖爐、棉被）

### 🌤️ 窗外天氣即時氣象（產品 DNA）

中央氣象署 OpenData API（免費）→ 棚外 overlay 跟現實天氣同步：

- 真晴 / 真雨 / 真雷 / 真颱風 → 棚景窗外動態變化
- 觀眾看到「窗外真的在下雨、跟我家窗外一樣」→ 懷疑「這真的不是 live？」
- **真實感大幅躍進、跟成本無關**（API 免費、素材一次做完）

詳見 [62_24H_MVP_DISCUSSION_NOTES.md](62_24H_MVP_DISCUSSION_NOTES.md) 第 8 節。

### 🤖 自我感知 AI = 內容特色、不是 bug

| 一般 AI 產品 | TDT 反向操作 |
|---|---|
| 隱藏 AI 痕跡、假裝是人 | **大方承認是 AI、AI bug 變梗** |
| Hallucination = 災難 | **「陳柏偉：哎呀我是 GPT」= 笑點** |
| API 半垮 = 故障 | **「啊」「喔」「呵」三段 = 卡關喜劇橋段** |

→ 使用者明確說：**「我標題都打 AI 了、還會怕被發現是 AI?」**
→ Quality Breaker 規則因此放寬：擋會出事的、留會笑的。
→ 詳見 [62_24H_MVP_DISCUSSION_NOTES.md](62_24H_MVP_DISCUSSION_NOTES.md) 第 9 節。

### 「假 24H 直播」並不算造假

| 元素 | 真假 |
|---|---|
| AI 生成內容 | ✅ 真的（Claude 生成）|
| 新聞內容 | ✅ 真的（Google News）|
| 角色設定 | ✅ 真的（阿明 / 王于安一致） |
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
| Batch 大小 | **12-16 段/batch**（GPT 65 號修正、不是 200 段、避免 JSON 解析風險）|
| Pool / Memory | **兩層獨立檔**（GPT 65 號修正、不合併、Pool 24h reset / Memory 跨天保留）|
| Anti-repeat | **metadata + selector**（不單靠 prompt、硬限制+軟權重）|
| 月成本估算 | **~NT$700-1000**（校正後、之前 NT$100-150 太樂觀、漏算 24H 播放總量）|
| 預算上限 | **NT$1,500/月**（buffer ~50%）|

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
| **陳柏偉** | 左半場 (35%) | 3Q 陳柏惟風 + 議論派、草根直率、敢嗆但不指控個人 | individual PNG 9 emotion（assets/char_3q/） |
| **王于安** | 右半場 (65%) | 30 歲女主播底子轉政論主持（王乃伃風）、反差萌、網感重、Podcast 控場 | emotion sheet 7 emotions（idle/talk/smile/thinking/surprised/skeptical/wave） |

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
| 右下 觀眾互動 CTA | ✅ Step 6.7（2026-05-31）改自 TOP5、固定顯示 5 條 CTA（按讚/訂閱/小鈴鐺等）、不再連動 state.keywords |
| 右上 Status Panel | ✅ Step 6.7 已隱藏（`display: none`）、等 24H AI LIVE 品牌字素材到位再放 |
| 棚景背景 | 早 / 中 / 晚三套、依本機時間自動 crossfade（60 秒 alpha 過渡）|

**解析度**：固定 1920×1080、`Phaser.Scale.FIT`、給 OBS Browser Source 直播。

---

## 📍 目前進度（每次工作結束更新）

**最後更新**：2026-06-04
**目前階段**：Phase 4 Step 5.32 — TTS 音訊主導泡泡同步（長句子不再被截斷）
**下一階段候選**：真人半身×看螢幕循環（87）/ 24H MVP batch 預生成 / TTS 聲線微調（測試後）
**⚠️ 下一個 Claude 注意**：Step 5.32 已 merge，需要 `git pull` + 重啟 `啟動.bat` + 點畫面解鎖音訊才能聽到效果。TTS 雙層保險：① server-side Edge-TTS mp3（本機正常）② Web Speech API fallback（雲端/proxy 環境）。`_playLineSequence` 改為音訊主導，等 `ended`/`onend` 才換句。

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
| **3 Step 6.7** | UX 微調：chunkMs 調慢（讀完才換）、bubble 放大 550×155×26px、`/api/pause`+`/api/resume`、右上 panel 隱藏、TOP 5 改觀眾互動 CTA |
| **★ 重大澄清** | **2026-05-31 產品定位澄清**：不是新聞台、是「假 24H AI 角色聊天表演」。月成本估算從 NT$57k 降到 ~NT$700-1000（校正後、非最初的 NT$100-150）。**改變整個 24H MVP 架構方向** |
| **★ GPT 65 號** | **2026-06-01 GPT 對 D/E 技術回覆**：Pool/Memory 雙層、Batch 12-16 段、metadata+selector anti-repeat、模式命名去新聞化（live_chat/chat_replay/topic_tease/chill_chat）|
| **24H MVP** | 規劃中（討論於 62 筆記、共識見 63 決策文件、Phase 4 開始實作）|
| **4 Step 5.12~5.14** | 接小美 emotion sheet（7 表情）+ idle 呼吸浮動 + V3 修怪手嘴位 |
| **4 Step 5.15~5.16** | 小美套王乃伃《狠狠抖內幕》風格 + emotion 欄位映射 + **改名「王于安」** + 15 張角色圖去綠幕 + 舊素材歸檔瘦身 |
| **4 Step 5.17~5.18** | 王于安 individual PNG 接線（load.image / `__BASE` frame 修正）+ emotion 多段陣列 + 分布 log |
| **4 Step 5.19~5.20** | 預算上調（月 $50→$80、日 $6→$12）+ **Anthropic prompt caching**（降 ~30% input cost）|
| **4 色彩修正** | 王于安 14~15 張 PNG 色彩對齊 emo_idle、chromakey 保留 100% alpha、histogram matching 修暗化 bug、`/preview` 比對頁 |
| **4 Step 5.22** | prompt 加「同情當事人 / 不貶低真實傷害」引導 |
| **4 陳柏偉系統** | **阿明哥 → 陳柏偉** 整套改名（3Q 陳柏惟風）+ 9 emotion individual PNG + 新聞歧義消解三層架構 |
| **4 Step 5.23~5.25** | 右下 CTA 雙欄並排（來賓/陳柏偉、主播/王于安）+ 陳柏偉 +8 emotion |
| **4 BGM 雙首** | 兩首輪流播放（PCH / Let's go back — Patrick Patrikios）、YT Audio Library 零 ContentID 風險、開關藏在「24H AI LIVE」badge 隱藏點擊、畫面不顯示按鈕 |
| **4 UI 微調** | 對話泡泡字級 26→30px、框避免遮到王于安 |
| **4 Step 5.27** | 加 **Yahoo News TW RSS** 第二來源、補 Google 夜間新聞稀疏 |
| **★ 4 Step 5.28~5.29** | **Shorts 短影音自動化 pipeline**：Phase 1 punchline 笑點評分 + 報告 → Phase 2+3 剪片 + metadata + thumbnail + **YouTube 上傳**全套 |
| **★ 4 Step 5.30** | **Shorts pipeline 實戰跑通**（2026-06-04）：第一支成功上傳 YT（private）。過程修 4 問題：①YT 授權工具 `authorize_yt.py` + Google 測試人員 ②評分快取 `.score_cache.json`（不重評省 API）③錄影涵蓋過濾 + `find_recording_for` 沒檢查錄影結束時間 bug ④cut_clip 模糊背景濾鏡改 cover 模式（修 ffmpeg Invalid argument）。+ README 對齊現況 |
| **★ 87 下一代架構** | **真人半身 × 看螢幕循環 × 語音** 設計筆記（使用者口述）：轉頭看螢幕遮生成延遲、TTS 補語音（最大痛點）、順帶解直式 Shorts 空洞。決定 **Edge-TTS 免費試、橫式版先加語音**。詳見 `87_REALISTIC_SCREEN_WATCH_LOOP.md` |
| **★ 4 Step 5.31** | **TTS 語音實作**：後端 `_gen_tts_dialogue` 平行生成 edge-tts mp3（陳柏偉 YunJheNeural / 王于安 HsiaoChenNeural）+ 快取；前端優先播 server mp3、失敗 fallback 到 `speechSynthesis`（Web Speech API）；SSL patch 處理企業/雲端 proxy 環境 |
| **★ 4 Step 5.32** | **TTS 音訊主導泡泡同步**：重寫 `_playLineSequence`，用 `ended`/`onend` 事件驅動（非固定計時器），長句子不再被截斷；`_stopCurrentAudio()` 防音訊重疊；陳柏偉語速 `+10%`→`+0%`；BGM 音量 `0.28`→`0.14` |

### 已知待辦 / 限制

- [ ] **24H MVP batch 預生成架構尚未實作**：目前仍是「即時生成」、Step 6.5 prefetch 還在。改 batch 預生成 + pool 循環。詳見 `62_24H_MVP_DISCUSSION_NOTES.md` / `63` 決策文件
- [x] ~~**★ TTS 語音（最優先）**~~ → **已實作（Step 5.31）**：Edge-TTS server-side（mp3 快取）+ Web Speech API browser fallback。本機 Windows 跑 edge-tts 正常；雲端 SSL/403 環境 fallback 到 speechSynthesis。合 PR 後本機測試聲線效果。
- [ ] **真人半身 × 看螢幕循環**：下一代大改造（87 筆記）、開 `realistic` 分支、真人 PNG 交 GPT 生圖
- [x] ~~Shorts pipeline 實戰測試~~ → 已跑通、第一支成功上傳 YT（Step 5.30）
- [ ] **事實基底 + 活潑風格 prompt 規則**：`server.py` `_build_prompt()` 已有「同情當事人」引導、24H 公開前再 review 一次法律風險
- [x] ~~小美 PNG 視覺問題~~ → 已改名王于安、15 張去綠幕 + histogram matching 色彩對齊完成
- [x] ~~阿明 actions spritesheet 未接~~ → 已改名陳柏偉、9 emotion individual PNG 完成
- [x] ~~BGM / 環境音~~ → 雙首輪流播放實作完成（badge 隱藏點擊開關）

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

## 🤝 GPT / Claude 協作模式（2026-05-31 更新）

### 新版分工（Phase 4 / 24H MVP 起、平行進行）

| 角色 | 職責 |
|---|---|
| **使用者** | 提供畫面截圖、描述觀感、決定產品方向 + 美學取向 |
| **Claude** | **直接讀 62 notes 實作**程式、不再等 GPT 指令檔；完成後寫 BRIEF |
| **GPT (Codex)** | **圖像生成**（PNG、spritesheet、UI 元素）+ **定期 review 補漏**（不再每 Step 出指令檔）|

### 為什麼改

- 62 notes 已詳細到 Claude 可以直接動工、再排 GPT 指令檔等於浪費一輪
- GPT 反應越來越慢、長指令易漏讀
- 圖像生成是 GPT 無可替代的強項、應該專注做這個
- Claude 不會生圖（API 不支援）、這部分絕對交 GPT

### 新工作流

```
程式碼部分（Claude）
    ↓ Claude 從 62 notes 直接實作
    ↓ 完成 Step 後寫 BRIEF
    ↓
平行進行
    ↓
圖像素材（GPT/Codex）
    ↓ 從 Claude 給的素材清單排程生成
    ↓ 完成後丟進 assets/ 給 Claude 接線
    ↓
定期 review（GPT）
    ↓ Claude 每 1-2 Step 寫短報告請 GPT「找漏的」
    ↓ GPT 用第三視角給建議、不下指令
```

### Claude 給 GPT 的「短報告」三種

| # | 類型 | 用途 |
|---|---|---|
| 1 | **D/E 技術問題** | 純技術討論、500 字內 |
| 2 | **「找漏的」review** | 列當下狀態、請 GPT 補盲點 |
| 3 | **素材製作清單** | 具體列要 PNG 規格 |

> ⚠️ Claude 不重新生成圖片素材。視覺問題（白光暈、衣服透明等）屬 PNG 層、Claude 在 BRIEF 註記給 GPT 處理。

詳細協作守則見 [WWT_HANDOVER.md](WWT_HANDOVER.md) 第十七章（已更新）。

---

## 💡 給 Claude 的工作守則

- **使用者有記憶障礙** — 每次完成段落工作後，**主動更新「📍 目前進度」並提醒使用者 commit + push**
- **重大改動寫 .md 步驟報告**（home Claude / office Claude 都適用）— commit message 只能說「做了什麼」、`NN_DESCRIPTION.md` 才能說「為什麼這樣做 + 決策路徑 + 跟之前方案的差異」。範例見 [`82_REPORT_TO_GPT_BGM_DECISION.md`](82_REPORT_TO_GPT_BGM_DECISION.md) + [`83_BGM_DUAL_TRACK_FINAL.md`](83_BGM_DUAL_TRACK_FINAL.md)。觸發條件：新增功能、改架構、跨檔案 refactor、改方向覆蓋前一個 Claude 的方案。不需要寫的：純 bugfix、單檔 typo、UI 微調。檔名約定：高位數遞增（80 → 81 → 82...）、複數 Claude 同號用 suffix 區分。
- 改 `OfficeScene.js` 的 polling / state apply 邏輯時、確認 `_chatInProgress` 不會被狀態同步覆蓋（Step 5.1 已修過）
- 改 `OfficeScene.js` 的 `_playLineSequence` / `_playDialogue` 時、注意 `_dialogueSeq` seq guard 不要漏（防 race condition）
- 不要把 `ANTHROPIC_API_KEY` 寫進任何 commit 檔案
- 修改 `config.js` 的角色比例 / scale 不需要動 BootScene 程式
- `啟動.bat` 檔頂須有 `chcp 65001`（UTF-8）
- 不恢復 walking / wander / random movement（Movement frozen 是設計、不是 bug）
- **PNG 視覺問題**（白光暈 / 衣服透明）程式端不修、註記給 Codex
