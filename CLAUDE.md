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

## 💾 找回舊對話（換 session / 換電腦也不會掉）

> **對話紀錄不會不見** — Claude Code 按「資料夾」分開存在 `~/.claude/projects/`。換 session、換電腦、隔幾天再開，舊對話都還在。想叫回**這個資料夾**的舊對話：
> - 啟動時 `claude --resume`（或 `-r`）→ 列出歷次對話、挑一條接續
> - `claude --continue`（或 `-c`）→ 直接接最近一條
> - VSCode 擴充套件裡也有「歷史紀錄 / resume」入口
>
> ⚠️ **但接續專案不靠對話紀錄**，靠這份 CLAUDE.md「📍 目前進度」+「存進度」commit。所以開全新空白對話也沒差，說「**接續**」我讀檔就接上。真正會遺失的只有「**只用講過、沒寫進 CLAUDE.md / commit 的決定**」→ 重要的事記得叫我「**這個也記一下**」。

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

> **⚙️ 實作方式決議（2026-06-06、使用者拍板）**：**用「整張背景替換」、不用「窗戶獨立圖層」**。
> 原因：**地板上從窗戶照進來的採光，跟窗外天氣是耦合的**（晴=地亮、雨=地暗、夜=房暗）。光只在背景圖裡、不在窗戶層，所以只換窗戶會「晴天的窗配陰天的地板」對不起來。
> → 擴充現有 `OfficeScene._getTimeOfDayBackgroundMix()`（目前只看時間、3 張 crossfade）成 **「時間 × 天氣」矩陣**：背景 key = `studio_bg_{時段}_{天氣}`、缺對應天氣圖時 **fallback 回該時段的晴天版**（不會壞）。再接中央氣象署 OpenData API 取現況天氣 → 選對應背景 → 沿用 60 秒 crossfade。
> 素材（GPT 出）：每個天氣 × 時段一張**完整背景**（窗景 + 地板採光一致 render）。建議先做雨天版的早/中/晚/夜，其餘 fallback。
> 程式（Claude）：天氣 API + 時間×天氣 lookup + 缺圖 fallback；可先手動切再接 API。**尚未實作**。
>
> **★ 平滑化（2026-06-06 使用者顧慮：天氣即時變化、突然換背景太突兀）**：不可瞬間換。三層平滑、皆可調參數：
> ① **防抖/遲滯**：新天氣需「持續 ~15-30 分鐘」才採用、忽略 API 瞬間跳動（防閃爍反覆）；
> ② **crossfade**：天氣換背景沿用現有 **60 秒**淡入（不用拉長、與時間 crossfade 一致）；
> ③ **經過中間態**：晴↔雨不直接跳、先淡到陰再到雨（避免明暗暴跳）。
> 效果＝模仿真實天空漸變、不突兀、反而更像 live。

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

**最後更新**：2026-06-22
**目前階段**：Phase 4 Step 5.45 — **YouTube 聊天室 × AI 互動（完整實作 + 端到端測過、預設 OFF+shadow）**。詳見 `96_YT_CHAT_IMPL.md`
**✅ YT 互動「自己關掉」修復（spike 自動鎖太敏感，2026-06-22）**：使用者反映 YT 互動會自己 LOCKDOWN 停掉。根因＝`_yt_record_metrics` 的 spike 自動降級把 `grey`（政治/敏感）跟 `hard_block` 一起算 unsafe、最近 3 分鐘 ≥8 則且佔比 ≥60% 就自動 LOCKDOWN 15 分鐘。政論節目留言本來就大量政治 → 全被分類 grey → 輕鬆破 60% → 一直自鎖（跟 2026-06-07「grey 不再擋」決定不一致：選球那邊放行 grey、spike 這邊卻照鎖）。修法（`server.py` `_yt_record_metrics`）：spike 改**只算 `hard_block`**（真正危險：仇恨/自殘/人肉/武器毒品/詐騙導流），grey 不計。真有人洗版攻擊（hard_block 暴增）時仍自動保護；安全不靠這層粗篩——每則回覆仍過輸出閘 `_safety_gate_segment` 審實際播出文字。使用者選「只在真正危險才鎖」。**需重啟 server 生效**。
**✅ 修復 pool refill loop crash（`time` 變數遮蔽，2026-06-22）**：上線啟動後 `[pool] refill loop error: cannot access local variable 'time'` 狂洗版、生不出新內容。根因＝`_generate_batch` 第 2260 行（2026-06-22 加 quota 退避時新增的 `time.time()` 檢查）用到 `time`，但函式內 2268 行有區域 `import uuid, time, random` → Python 把整個函式的 `time` 當區域變數 → 在 import 執行前就用到 → UnboundLocalError，每輪 refill 都崩。修法：該行只留 module-level 沒有的 `uuid`、拿掉多餘的 `time, random`。**順手清掉全檔另外 7 處同款多餘的區域 `import time`**（`_pick_segment`/`_sweep_pool`/`pool_status`/`_candidate_voices`/`_mark_voice_down`/`_maybe_queue_live_insert`/`_tts_status_payload`）、全部改用 module-level、消除同類未爆彈；AST 掃描確認 0 函式再區域 import time/random。⚠️ playback 本來就獨立於 refill（從 pool 撈段），當時 pool 有 **1199 段**可播 → 此 bug 只擋「生新」、不擋「重播」。**需重啟 server 生效**。
**✅ YT 互動 pipeline 也接上額度退避（2026-06-22）**：上線發現「留言都不回復 + log 狂噴 `[yt] classify/intent/generate 出錯 …400 usage limits`」。根因＝YT 互動三步（classify→intent→generate）全要打 Claude API，但**先前只有 `_generate_batch`/`_generate_live_round` 吃退避旗標、YT pipeline 沒吃**，所以額度爆時每則留言狂打死掉的 API 洗版。修法：① `_yt_run_round` 在「關懷轉介（固定模板、不需 API、保留）之後、classify 之前」加 `_anthropic_quota_exhausted_until` 檢查、額度爆整輪跳過；② `_yt_classify` except 偵測額度錯誤時自己設退避旗標（不光靠 pool refill）。額度恢復後自動恢復互動。⚠️ **這只停掉「狂打死 API + 洗版」、不會讓留言「能被回」**——回留言本來就要打 API、額度爆就是回不了。要 7/1 前恢復回留言＝去 Anthropic console 把帳號月上限調高；否則等 7/1 自動恢復。**需重啟 server 生效**。
**⚠️ Claude API 帳號月額度又爆了 + 加退避（2026-06-22）**：公司端驗證 pool 重播修復生效後沒多久、batch 補新 + live 插隊雙雙開始噴 `400 You have reached your specified API usage limits`（帳號月額度上限被打到、要等 **2026-07-01 00:00 UTC** 才解、不是 app 出問題）。⚠️ 跟 app 內部 `_check_budget`（月上限 $80）是**兩個獨立關卡**——Anthropic 帳號實際設的硬上限是 $65、比內部追蹤的 $80 低，所以 app 自己還覺得有額度、結果先被帳號層級擋掉，導致 `_pool_refill_loop`（每 30s）+ live 插隊（每 10 分）狂打註定 400 的 call、洗版 log。**加修復**：新增 `_anthropic_quota_exhausted_until` 退避旗標（`server.py`：`_is_anthropic_quota_error()` 偵測該錯誤字串 + `_generate_batch`/`_generate_live_round` 兩處 except 設旗標、退避 30 分鐘才再試、自動偵測恢復）。**好消息**：因為前一天才修好的 pool 重播機制、這段空窗期（到 7/1 為止）show 不會斷，靠現有 1168+ 筆 recyclable 段落循環撐著、只是不會有新內容。**✅ 使用者已於 2026-06-22 把 Anthropic 帳號月上限 $65→$80**（提早恢復、不等 7/1），已用最小 API 測試呼叫驗證額度恢復（`回應:好`、token in14/out5）。⚠️ 調高後**跑著的 server 仍有 30 分鐘退避旗標**、需**重啟 server** 才立即恢復生成/互動（不重啟則退避到期後自動偵測恢復）。
**⚠️ 修復「降成本沒生效」根因 bug（2026-06-21）**：6-16 降成本改了句數(7~8→5~6)+段壽命(24h→72h)後、6-20 公司那台拉billing資料驗證**完全沒效**（每小時 output token 跟改之前差不多甚至更高）。比對公司那台 `wwt_dialogue_pool.json` 實際內容後抓到根因：**`_pick_segment()` 選球邏輯 bug**（`server.py` 約2337行）——原本 `cands = pending if pending else recyclable`，意思是「只要 pending 還有庫存就完全不碰 recyclable（可重播的舊段）」；但 `_pool_refill_loop` 只看 `pending < 15` 就補新、跟 recyclable 庫存無關，所以 pending 永遠被補滿、recyclable**永遠選不到**。實測證據：公司那台 pool 裡幾百段全部 `play_count: 1`、一個重播都沒發生過——「段活久→多重播→省成本」這個設計從沒接上。✅ 句數 5~6 那半確認**有生效**（抽查實際生成內容全是5~6句、不是舊的7~8句）、純粹是重播機制是死的拖累整個降成本。**修法**：改成 `cands = pending + recyclable`（兩邊一起當候選池、靠既有 quality/tone/angle 權重競爭）。已 commit + push（`4c83e7e`）。**✅ 2026-06-21 公司端重啟驗證確認生效**：重啟公司 server.py 後沒多久、console 就印出 `♻️第2次重播`（之前公司那台從沒出現過這個字樣）；`/api/pool/status` 顯示 `recyclable: 1168`（之前這個數字存在但選不到、bug 修完後真的被納入候選池）、`pending: 17` + `recyclable: 1168` ≈ `total: 1187` 數字對得起來。重播機制確認真的有跑、72h 段壽命降成本設計補上最後一塊、不再是死碼。
**⚠️ 降成本 + 話題同步 + TTS 殼（2026-06-16）**：① **降成本**（API 6月撞 $65/月上限、Console Usage 查出主因＝對白 output token）：對白句數 **7~8→5~6**（`_SEG_LINES`、prompt 改「短但完整的小對話、有頭有尾、不戛然而止」非截斷）；段落壽命 **24h→72h**（`_SEG_EXPIRE_SEC`、段活久→多重播少生新＝**省成本主力**、估 ~$150→~$50/月）。⚠️「重播」＝同一段對白原封不動再播（連聲音一樣）、非新聞重播；24/7 連續播下「句數變短」省有限（re-chunk）、真正省靠「過期拉長＝少生新」。`live insert` 熱門突發仍即時不受影響。② **話題跟對話同步**（解「LED 話題比對話早一截/提前跳」）：topic 推 LED 從「段被 consume 當下＋等 900ms」改到「對話真正開口同刻」（`OfficeScene._playDialogue` 收 `topic` 參數推 `tdtShowTopic`+`now_speaking`）→ 現有段播放中 LED 不動、下一段開口才換題。純前端刷新即可。③ 跑馬燈字級 22→26px（`index.html` `#marquee-bar .marquee-text`、使用者改）。④ **ElevenLabs TTS 殼（休眠、保留）**：`_eleven_tts_bytes`+`_TTS_ELEVEN_VOICE`+`_gen_tts_line` 分支，`.env` 設 `ELEVENLABS_API_KEY`/`ELEVEN_VOICE_XIAOMEI` 才啟用（空＝走 edge-tts）。⚠️ ElevenLabs 實測**比免費 edge-tts 還差**、已退訂；殼留著供未來接 Google Cloud TTS 等有 API 的（結構可重用、改 API 呼叫那段即可）。⑤ **錢的兩個錢包**（使用者搞混過）：直播 server 生對白＝**API**（console、$65 爆了、7/1 重置、要調高才恢復生成）；Claude Code 寫程式＝**訂閱**（usage credits 超量 6月 ~$354、Pro 用爆 → 關掉 usage credits 開關止血 / 或升 Max）。①④需重啟 server、②③純前端刷新。
**⚠️ 布簾過場（換裝/換幕）骨架（2026-06-10）**：為「主播每天換衣服」做。角色不能像天氣 crossfade（衣服會疊影/溶解）→ 用**舞台布簾**：拉上遮住→幕後瞬間換→拉開亮相（符合角色表演定位、換日清晨換最自然）。`OfficeScene.js` 加 `_buildCurtain`（兩片紅色塊佔位 depth50 蓋主播、過場字卡）/`_runCurtainChange`（關700ms→遮住呼叫 onCovered 換裝+字卡→停1.2s→開700ms、`_curtainBusy` 防重入）/`_applyOutfit`（**STUB**：只重播 idle、TODO 接真貼圖）/`_pickTodaysOutfit`（依日期、目前只 outfit_1）/`_maybeDailyOutfitChange`（每天清晨自動、**預設關** `_outfitAutoEnabled=false`）。測試 `window.tdtCurtainChange()`、純前端刷新即可。**待**：GPT 畫布簾 PNG + 每套 16 張衣服（陳9 emotion+王7 emotion）→ BootScene 載入 + 填 `_applyOutfit` 真換貼圖 + 開自動。詳見 `99_CURTAIN_TRANSITION_SKELETON.md`。
**⚠️ 前端 watchdog + YT「有人看才讀」省配額（2026-06-10）**：① **前端凍住自動復原**＝上線跑出主播凍死 7 小時（後端健康、是前端 Phaser 迴圈死/`_chatInProgress` 卡住、整條靠 delayedCall 串接所以一卡全死）。加**瀏覽器層 watchdog**（`index.html` 純 `setInterval`、不靠 Phaser 時鐘）+ 兩心跳（`OfficeScene` `update()` 每幀更新 `__tdtSceneAlive`、每句/重試/暫停更新 `__tdtPlayTs`）：scene 停 25s→reload、對話停 90s→軟復原(清 `_chatInProgress` 重踢)、240s→reload、reload 間隔 ≥60s。純前端、刷新即生效、console 印 `[watchdog] …已啟動`。② **YT 互動「有人看才讀」省配額**＝`liveChatMessages.list` 5unit×每8s=日 ~54k 遠超 10k/日、4-5hr 就爆 403（跟有沒有人聊無關、輪詢本身在燒）。重寫 `_yt_api_chat_loop`：抽 `_fetch_meta()`(1 unit 同時拿 lcid+concurrentViewers)、**沒人看只每 `idle_poll_sec`(40s)偷瞄人數、有人看(viewers>0)才讀聊天**。新鍵 `viewer_gate`(預設True)/`idle_poll_sec` 進 persist+`/api/yt/config`+status。⚠️ `viewers=None`(私人/關觀看數)當沒人看→不讀；要照讀就關 viewer_gate(所以**直播要公開**)。口播邀請改 10 分(`invite_every_sec`=600、machine-local 存檔)。**放棄申請提額**(審核太繁瑣、小頻道 viewer_gate 就夠、PP/ToS 草稿留著)。兩項都要**重啟 server** 載入(watchdog 純前端刷新即可)。詳見 `98_WATCHDOG_AND_YT_VIEWER_GATE.md`。
**⚠️ 額度爆梗 + 新聞標題誤植修復（2026-06-10）**：① **額度爆主播講梗**（組合拳之一、符合 AI bug 變梗 DNA）：`_yt_api_chat_loop` 抓到 403 quotaExceeded → 設 `_yt_quota_exhausted`（成功讀到自動清）；`/api/next_segment` 額度爆時改播 `_YT_QUOTA_LINES`（主播說「額度被 YouTube 收走、下午3點重置」、冷卻 `_YT_QUOTA_MSG_COOLDOWN`=1hr 不洗版）、且**不再播「會回你」邀請**（不能讀就別承諾）。額度恢復自動回正常。組合拳另兩塊：聊天框 overlay＝OBS 設定(零配額、使用者自行設)、AI 有人看才回＝viewer_gate(已做)。② **新聞標題誤植修復**：`_disambiguate_title` 原本 `result.replace('賴',…)` 盲取代→「賴瑞隆」被切成「賴清德（台灣總統）瑞隆」（高市早苗/侯漢廷/柯志恩同類雷）。改成**只替換獨立短詞**（regex 前後都非中文字 `(?<![一-鿿])…(?![一-鿿])`）→ 全名永不被切壞、語境計分(高市早苗 vs 高雄市)邏輯**不動**。取捨：短詞緊接動詞(高市挺台)不展開、但也不誤判、安全。**兩項都要重啟 server 生效**。
**⚠️ Step 5.45 新人點名歡迎（2026-06-09）**：使用者要「進來的人能被 AI 立即點名、留住人+幫宣傳」。**先講清楚平台限制**：純潛水(只看不打字)的人，YT 只給「人數」不給身分、還慢 1-2 分 → **無法點名**(無解)；只有「**有打字**」的人 YT 才給名字。所以做的是**新人第一次留言→主持人開場點名歡迎**。實作(`server.py` Step 5.45)：① `_yt_seen_users`(user_hash→上次出現時間)、`_yt_ingest` 算 `is_newcomer`(超過 `_YT_NEWCOMER_RESET_SEC`=6hr 沒出現就重新算新人、可再被歡迎)。② `_yt_clean_display_name`：YT 顯示名清成「可安全口播」的名字(只留中英數、去 emoji/零寬、長度上限12;含髒話`_YT_NAME_BAD_RE`/惡意`_YT_BLOCK_RE`/政治人物或注音`_yt_is_grey`→回''退 generic「新朋友」)。③ `_yt_select` 新人 +3 分優先被選到。④ `_yt_generate` 收 `is_newcomer/name_display`、對新人加 welcome_note 開場點名歡迎(熱情不嗆)。名字仍會過**輸出閘+TTS消毒+leak check**(防有人把名字設成攻擊字串)。⚠️ 仍有限制：(a)要他**打字**才行(純看不行、原想用 CTA 引導冒泡但使用者說 CTA 放不下、暫不改)；(b)「立即」≈幾秒排隊+等目前這段播完(那 30-60s 尾巴還在、要真正秒回需做前端打斷、風險高未做)。單元測過(名字清洗 10 例 + 新人 flag)。**改完要重啟 server 生效**。
**⚠️ 現場修復（2026-06-09）OBS 沒聲音 + 天氣一直雷雨**：① **OBS 主持人沒聲音**＝`啟動.bat` 漏裝 `edge-tts`（清單寫死、漏列）→ server 產不出 mp3 → 前端退 `speechSynthesis`（瀏覽器內建語音）→ OBS 的 CEF 沒語音引擎所以靜音、桌面瀏覽器有所以「網頁有、OBS 沒」。修：`啟動.bat` 補裝 `edge-tts` + 本機 pip install（實測產出真 mp3）。重啟即生效。② **天氣一直雷雨**＝原吃 36hr **預報**（會賭最壞、夏天天天午後雷陣雨）+ `_map_wx_to_weather` 見「雷」就 thunder。改**即時觀測優先**：新增 `_fetch_cwa_observation()`（`O-A0003-001` 測站當下 `Weather`）、`_fetch_cwa_weather()` = 觀測 or 預報後備；對應加「午後/短暫雷陣雨降 rain、只非短暫雷雨才 thunder」；測站名由縣市去「市/縣」推導（臺北市→臺北、例外列 `_CWA_CITY_STATION`、可 `CWA_STATION` 覆寫）。實測台北今天：預報→thunder、觀測→cloudy(陰) ✅、最終回 cloudy。重啟後 `weather_auto` 因 `.env` 有 key 自動開、20-30s 同步。詳見 `97_OBS_VOICE_AND_WEATHER_OBSERVATION_FIX.md`。
**⚠️ Step 5.45（2026-06-07）YT 聊天互動**：完整 P0–P6 安全 pipeline（`server.py` Step 5.45 區塊）。核心：留言=敵對流動資料、主 AI 不看 raw 只看 intent、輸出閘審實際播出文字、互動段 ephemeral 不進 pool、**全程可 shadow（只記 log 不播）**。`_yt_ingest`（token bucket 限流 + P0 normalize/硬規則/暱稱清洗/注音grey）→ `_yt_run_round`（P1 `_yt_classify` 分類 → P2 `_yt_select` 選球 → P3 `_yt_build_intent` intent-only → P4 `_yt_generate` 無記憶生成 → P5 複用 `_safety_gate_segment`+`_yt_tts_sanitize`+`_yt_leak_check` → P6 mode 降級/audit/shadow）。Mode Controller(OPEN/GUARDED/LOCKDOWN/OFF)+spike 自動降級+`_yt_kill()`。來源 `_yt_source_loop`（pytchat lazy、斷線重連、預設 idle）。播放 `/api/next_segment` 優先序：YT互動 > live插隊 > pool。控制端點 `/api/yt/{status,config,inject,round,kill,redteam}`、預設 `enabled=False/shadow=True/mode=GUARDED/source=fake`。**上線：私人+shadow 連跑 24h+ 確認 0 漏才 shadow=False**。審查請求+回覆=本機 `95_*`。
**⚠️ Step 5.45 後續調校（2026-06-07、使用者決策）**：① **grey 不再擋、改「先反問→中立回答議題」**（不迴避、不站隊、跟政黨無關）；select 修「grey 在 GUARDED 先選中再擋」污染去重/冷卻的 bug；`none selected` 回 `diag` 講原因。② **互動加上網查證（web search）**：`_yt_generate` 用 `web_search_20250305`（Haiku 4.5 可用、`_20260209` 動態過濾版 Haiku 不支援）；具名人物/時事題 → 先反問→上網查→**引用有出處的事實+強調未定讞/推定無罪**→中立，查不到就說查不到不編造；一般閒聊不觸發（零成本）。`_yt_build_intent` 改成「保留要查的人名/事件、但濾掉指令/髒話/政黨甩鍋」當消毒器。`_yt_generate` 改「人設/規則放 system、任務放 user」（否則加 tool 後 Haiku 會反問要 topic 不生成）。開關 `_yt.web_search`（預設開）、`/yt` 頁有「上網查證/不查證」鈕。⚠️ web search 走 **API 帳**（每次查詢有費用、訂閱不涵蓋）、外部結果仍過輸出閘。實測「科P有罪嗎」→反問+查到一審17年未定讞+中立導向制度 ✅。
**⚠️ Step 5.45 後續調校 ②（2026-06-07、炒熱現場 + 關懷轉介）**：使用者反應「擋太多、現場炒不熱、互嗆互罵互吐槽都沒了」+「等遇到 YT 判騷擾再說、不信 AI 多嗆」。改：① **P0 鬆綁**：嘴砲字（智障/腦殘/去死/幹你…）**不再 P0 擋**、放行進去讓主持人機智反嗆（`_YT_HARD_RE` → 拆成 `_YT_BLOCK_RE`「真惡意/違法才丟：兒少/製毒槍炸/駭/詐騙/販毒」）。② **唯一法律線靠輸出閘**：`_llm_safety_judge` 放行原則新增「對**匿名觀眾/彼此**的嗆聲嘴砲（含粗話）→ pass；只有把負評/辱罵/未證實犯罪掛到**具名真人**才 drop」（實測：匿名罵「腦殘」pass、罵「賴清德是騙子/柯文哲收錢」drop ✅）。③ **回應火力全開**：`normal` style 改「最嗆鄉民嘴砲、反嗆/互虧/機智電爆酸民」、`neutral_taichi` 改「好笑+中立、不是無聊的中立」。④ **關懷轉介**（取代冷擋）：痛苦/自傷/傷人念頭（被霸凌想殺他/想自殺/教我燒炭）→ `_YT_CRISIS_RE` 標記 → `_yt_run_round` **優先**走 `_yt_compassion_lines`（固定安全模板、承認痛苦+不展開念頭+台灣專線 1925/1995/1953/113/110，冷卻 600s 防洗版）。⑤ `_yt_build_intent` 補 answer_style 定義（嗆主持人→normal）+ 純嗆留言保留「他在虧」不回空、`_yt_generate` 加解析重試 ×3。⚠️ slur「互罵」目前**輸出閘對匿名仍放行**（YT 收益風險使用者願承擔、真遇到再調）。
**⚠️ Step 5.45 後續調校 ③（2026-06-07、反應式語氣 + 嗆辣度 + 告知觀眾）**：① **反應式語氣**（解「友善觀眾也被嗆」）：`_yt_generate` normal style 改「先看對方態度——友善/提問→熱情幽默歡迎不嗆;對方先嗆/酸→才機智反嗆」，兩種都鐵則**對事不對人**（電邏輯/行為、絕不罵人智商外貌人格）。② **嗆辣度轉盤** `_yt["spice"]` 0~100（預設 60，只影響「對方先嗆你」時反嗆多狠、友善觀眾不受影響）：`/api/yt/config` 收 spice、`/api/yt/status` 回、`/yt` 頁有「輕嗆/中嗆/火力全開」+ slider，注入 prompt 分輕/中/強三段。③ **告知觀眾可互動**（使用者選 1+2+3）：右下 CTA 第一行改「💬 留言聊天・主持人會回你！」（`OfficeScene.js` `DEFAULT_KEYWORDS`）+ 跑馬燈 CTA 改成互動導向（`index.html`）;互動段播放時畫面中上「💬 回應觀眾留言中…」綠徽章（`index.html` `#interaction-badge` + `window.tdtShowInteractionBadge`、`OfficeScene._startDialogueFromData` 依 `data.yt_interaction` 開關）;主持人**定期口播邀請**（`_YT_INVITES` 3 組固定模板、`/api/next_segment` 在 enabled 且非 shadow 且距上次 ≥`invite_every_sec`(預設 1800s) 時插一段、`yt_invite=True` 不亮徽章）。⚠️ slur 維持「對事不對人」（不飆 slur、使用者拍板）。
**⚠️ Step 5.45 修復（2026-06-07、聊天讀取改官方 API）**：上線實測發現 **pytchat 0.5.5 被 YT 改版搞壞（連得上但讀 0 則）、chat-downloader 讀不到「不公開」直播**。改用**官方 YouTube Data API**（`_yt_api_service` 用現有 `youtube_token.json` 的 `force-ssl` scope、**不用重新授權**；`_yt_api_chat_loop`：`videos().list` 取 `activeLiveChatId` → `liveChatMessages().list` 輪詢、尊重 `pollingIntervalMillis` 但設 8s 地板省配額、只收近 `window_sec` 的留言跳過 backlog）。新增來源 `source="ytapi"`（`/yt` 頁「YT(官方API推薦)」鈕、pytchat 標「已壞」保留 legacy）。實測讀到不公開直播留言、進 buffer、限流正確。⚠️ 官方 API 走配額（liveChatMessages.list 輪詢、24/7 要注意 10k/日上限、必要時申請提額）；要讀必須有 `youtube_token.json`（Shorts 那把就有）。
**⚠️ Step 5.45 易用性（2026-06-07、設定存檔 + 狀態橫幅）**：解使用者「重啟要重設 + 不知道有沒有開」。① **設定存檔**：`_yt_save_config/_yt_load_config`（`wwt_yt_config.json`、gitignore）→ `/api/yt/config` 變更即存、`_yt_kill` 也存、**啟動 `_yt_load_config()` 自動載回**（重啟免重設、含 enabled/shadow/source/video_id/interval/spice…）。⚠️ 等於開機會自動恢復上次狀態（含真的播）→ 信任後才這樣用。② **間隔可在 `/yt` 調**：加「互動間隔」90秒/3分/10分鈕 + 數字輸入（`/api/yt/config` 收 `interval_sec`、配合 5.45 短步輪詢幾秒生效）。③ **大狀態橫幅**：`/yt` 頂端一眼看出 🟢運作中/🟡shadow/⚪關閉 + 📡有沒有連上聊天室 + 上次讀到留言/上次互動幾秒前。`/api/yt/status` 多回 `source_connected/last_ingest_ago/last_round_ago/last_round_info`（`_yt_api_chat_loop` 設連線旗標、`_yt_ingest`/`_yt_record_round` 記時間）。**改完要重啟 server 才載入**；已預寫 `wwt_yt_config.json`（enabled/真的播/ytapi/M8NJh9msWnY/90s）讓重啟無痛恢復。
**⚠️ Step 5.45 降延遲（2026-06-07、「網友不會等」）**：① **互動迴圈改事件驅動**：`_yt_interaction_loop` 從「每 interval 固定跑」改「**有 buffer 留言 + 距上次 ≥ 最短間隔(min_gap) 就馬上跑**」、每 3s 檢查 → 留言進來 ~3s 內就回（interval_sec 改語意＝最短間隔、floor 降到 15s）。② **同人冷卻可調**：`user_cooldown_sec` 原 3600（1hr、防洗版）對少數測試者太長＝同一朋友被擋 → `/api/yt/config` 收 `user_cooldown_sec`、`/yt` 加「同人冷卻」鈕（30s/60s/10分/1時）、status 回傳、預設測試值 60s。③ 殘留延遲＝「要等目前 pool 段播完才插話」（pool 段 7~8 句約 30-60s）＋查證(web search)題多 10-30s → 若仍嫌慢可關查證、或之後做「互動段打斷正在播的段落」(前端改、動到 `_playLineSequence` 較有風險、尚未做)。`wwt_yt_config.json` 已設 interval=30/cooldown=60。
**⚠️ Step 5.45 觀看人數（2026-06-09）**：用官方 API 抓「同時觀看人數」`concurrentViewers`（`_yt_api_chat_loop` 每 ~60s 一次、存 `_yt_viewers`、None=未知/未連線/已結束/主播關閉顯示）。用途：① `/yt` 橫幅顯示「👁 X 人在看」② **口播邀請只在「有人看」時才講**（`next_segment` invite 加 `_yt_viewers is None or _yt_viewers>0`、抓不到仍邀不靜音）。`/api/yt/status` 多回 `viewers`。⚠️ 只給人數不給「是誰」、無「某人剛進」事件、主播關閉顯示則 None。
**⚠️ 上一階段（Step 5.42）24H MVP**：對白來源從「每輪即時打 Claude」改成「背景批次預生成一池、播放只從 pool 撈」。詳見 `93_24H_MVP_POOL_BATCH_IMPL.md`
**⚠️ 24H MVP 注意**：對白來源從「每輪即時打 Claude」改成「背景批次預生成一池、播放只從 pool 撈」。`server.py` Step 5.42 區塊：`_generate_batch`（一次 call 出 12 段、各帶 topic/tone/angle metadata、存 `wwt_dialogue_pool.json`）→ `_pick_segment`（硬限制不連 2 段同 topic/tone + 軟權重近 5 段降權）→ `GET /api/next_segment`（撈段+生 TTS）。背景 `_pool_refill_loop`（pending<15 自動補）。前端 `OfficeScene` 兩處 fetch 從 `/api/chat` 改 `/api/next_segment`。`/api/chat` 保留（debug / 之後 5% live 插隊用）。pool 健康度看 `/api/pool/status`、手動補 `POST /api/pool/refill`。
**⚠️ Step 5.42 後續調校（2026-06-07）**：① **話題多樣性**：batch 改「每批從 30 條新聞洗牌隨機抽 12 條」（不再固定前 12）。② **LED 同步**：`/api/next_segment` 不再寫 `speaking_topic`（prefetch 會害 LED 提前跳），改由前端 `_startDialogueFromData` 開播時推。③ **話題先、對話後**：`index.html` 開 `window.tdtShowTopic`，場景開口前先推 LED 換題、等 `TOPIC_LEAD_MS=900`ms 淡入才講。④ **對話長度**：使用者選「深入」，每段 **7~8 句**（`_SEG_LINES`），`max_tokens` 4000→8000（`_BATCH_MAX_TOKENS`），prompt 硬性要求 ≥7 句、實測 avg 7.1 全達標、一批 ≈ NT$1。⑤ `config.js` 天氣 slots 移除 `morning`（早上借中午、消除 4 個 404）。
**⚠️ Step 5.43（2026-06-07）熱門新聞 5% live 插隊 + 電視牆時鐘**：① **live 插隊**：`_news_refresh_loop` 偵測「焦點」分類**新出現**的頭條（`fetch_news_topics` 填 `_focus_headlines`、`_maybe_queue_live_insert` 偵測、首次只 seed 不觸發、冷卻 `_LIVE_INSERT_COOLDOWN_SEC=600`s）→ `_generate_live_round` 即時生一段短的（4~5 句、react、過品質+輸出閘+3Q）→ 進 `_live_insert_queue` → `/api/next_segment` **優先播插隊**（不進 pool）。控制：`GET /api/pool/status`（多 `live_insert_enabled/queued`）、`POST /api/live_insert {enabled / topic}`（topic 為手動測試立即插）。實測 detect→generate→入列 OK、一段 ≈ NT$0.1。② **電視牆時鐘**：`index.html` 右上角 `#clock-overlay`（時:分:秒 + 年/月/日（週X）、本機時間每秒更新）。
**⚠️ 上一階段（Step 5.41）**：窗外天氣接中央氣象署 OpenData（真天氣自動驅動）已完成驗證。
**⚠️ 真天氣自動注意**：`server.py` `_weather_auto_loop` 每 15 分抓 CWA F-C0032-001（縣市 36hr 預報）的 Wx → `_map_wx_to_weather` 對應 晴/陰/雨/雷（颱風 Wx 不含、暫手動）→ 連續 2 次（≈30 分防抖）才設 `state.weather`。需 **`.env` 設 `CWA_API_KEY`**（免費註冊 opendata.cwa.gov.tw）、`CWA_LOCATION` 預設臺北市。有 key 則 `weather_auto` 預設開。`/weather` 頁有「🛰自動/✋手動」鈕；手動切天氣會自動關 auto。**CWA 實際回傳解析未用真 key 測過、填 key 後要驗一次**。
**⚠️ 天氣系統注意**：背景 = f(時段, 天氣)。時段 4 段（早 06-11 / 中午 11-16 / 下午 16-18:30 / 晚 18:30-06、各切換提前 15 分淡入）。天氣 5 種（晴/陰/雨/雷/颱）。天氣圖對應：中午/下午/晚上各有自己的 `studio_bg_{slot}_{weather}.png`、**早上借中午天氣**（缺圖 fallback 回晴天）。手動切：`/weather`（含天氣/淡入秒數/強制時段測試鈕）；之後接中央氣象署自動。程式：`OfficeScene._getTimeSlotBgRaw`(時段)+`_resolveBgKey`(天氣 fallback)+`_crossfadeBg`(平滑)；`server.py` `state.weather/force_slot/weather_fade_sec` + `/api/weather`。
**下一階段候選**：① **熱門新聞 5% live 插隊（使用者 2026-06-07 決定要做、排入下一步）** / 真人半身×看螢幕循環（87）/ 24H 公開前法律 review（已初評、見下）
**⚠️ 2026-06-07 使用者決策**：① 熱門新聞 5% live 插隊 → **要做**（pool 架構已留位、待接） ② 切聲音「更快生效」（丟預抓段）→ **取消、不做** ③ pool 多樣性觀察工具 → **已加**（`/api/pool/status` 多了 total_plays/replayed_segments/max_play_count/distinct_topics；`_pick_segment` 每次播放 console 印 `[pool] ▶ 播放 topic=...`、重播會標 `♻️第N次`；segment 加 `play_count`） ④ 跨輪記憶 → 維持現狀（段內接話 OK、段間獨立、暫不做）
**⚠️ TTS 注意**：`zh-TW-YunJheNeural`（台灣男聲、陳柏偉）被微軟「間歇性」搞壞、回空音訊。最終設計（Step 5.35）：① 兩位都只用台灣聲音、無大陸備胎（語速陳柏偉+3%/王于安+2%）；② 聲音掛掉那位「暫時靜音」、不換聲音、改演搞笑梗（state.ticker 跑馬燈 + 下一輪王于安 AI 吐槽 meta round）、10 分鐘自動探測、微軟修好自動恢復 + 演「修好了」梗；③ 線上切聲音 API + 手機控制頁 `/voice`（免重開）。詳見 `88_TTS_VOICE_AUTO_FALLBACK.md`。
**⚠️ 下一個 Claude 注意**：Step 5.33 已 merge，需要 `git pull` + 重啟 `啟動.bat`。對話 prompt 改重點：① tone 描述改「丟球/接球/反嗆」互動動態、強調每句接住上一句 ② 句子有長有短（開球長、接球短）、不再逼每句完整論述 ③ 接話短句不用硬塞 topic。台詞是「一次 API call 生成整輪」（`server.py` 約 1597 行），Claude 看得到前句所以能接話。若還覺得僵 → 往「跨輪記憶」調。

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
| **4 Step 5.33** | **對話「丟球接話」邏輯**：8 種 tone 改寫成互動動態（丟球/接球/反嗆）、強調每句接住上一句；句子有長有短（開球長、接球短）不再每句完整論述；接話短句不用硬塞 topic。去除腳本感、像 AI 真的在互相對話 |
| **★ 4 Step 5.34** | **TTS 語音容錯 + 線上切聲音**：① 發現 `zh-TW-YunJheNeural`（台灣男聲、陳柏偉）被微軟搞壞回空音訊 → circuit-breaker 熔斷器（冷卻 10 分鐘、自動探測恢復）；② 線上切聲音 API `POST /api/tts/voice` + `GET /api/tts/status` + 手機控制頁 `/voice`（免重開伺服器）；快取 key 改用實際聲音。詳見 `88_TTS_VOICE_AUTO_FALLBACK.md` |
| **4 Step 5.37** | **傷害題 prompt 放寬**（使用者拍板）：`_build_static_prompt` 傷害題從「過度保守、不嘲諷」改成「**先同情承認傷亡 → 再嘲諷制度/結構**」（火力對準制度、不貶低傷害、不嘲諷受害者、不拿死傷當笑點）。實測傷亡 topic 輸出正確（sympathy→mocking、船員框成受害者）。BGM 觀眾控 + prompt #2 荒謬開場 / #7 陳柏偉固定先開場 → 使用者決定不做 |
| **★ 4 Step 5.36** | **修「沒聲音」根因 = edge-tts 間歇性回空音訊**（非 YunJhe 永久壞、循序 10/10 成功）：① 每句重試 `_TTS_RETRY=4`、退避遞增、單句失敗率 15%→~0.05%；② 熔斷器改「連續 `_TTS_DOWN_THRESHOLD=4` 句都失敗才算真的掛」（用 `_tts_fail_streak`、單句隨機失敗不連坐、各主持人獨立）。實測 5 輪 fresh 全 4/4、不誤觸 cooldown；真的掛時仍正常觸發梗。詳見 `88` 第 11 節 |
| **★ 4 Step 5.35** | **聲音台灣 only + 壞掉演成搞笑梗**（符合「AI bug 變梗」DNA）：① 取消大陸備胎、兩位都只用台灣聲音（語速 陳柏偉+3%/王于安+2%）；② 聲音掛掉那位「暫時靜音」不換聲音、改演梗 —— `state.ticker` 跑馬燈快訊（前端 `#marquee-bar` 接、紅字快訊模式）+ 下一輪王于安 AI 吐槽 meta round（`_run_voice_meta_round`、Claude 回 `{ticker,dialogue}`、陳柏偉變默劇靜音泡泡）；③ 微軟修好自動恢復 + 演「修好了」梗。實測 real Claude call 通過。詳見 `88_TTS_VOICE_AUTO_FALLBACK.md` 第 9~10 節 |
| **4 Step 5.39~5.41** | **窗外天氣系統**：背景 = f(時段 4 段, 天氣 5 種)、平滑 crossfade（時段切換提前 15 分淡入）、`/weather` 手機控制頁 + **接中央氣象署 OpenData**（`_weather_auto_loop` 真天氣自動驅動、需 `CWA_API_KEY`）。詳見 `92_WEATHER_BG_ASSET_BRIEF.md` |
| **★★ 4 Step 5.42** | **24H MVP：batch 預生成 + pool 循環**（核心架構轉向）：對白從「每輪即時打 Claude」改「背景批次預生成一池、播放只撈 pool」。`_generate_batch`（一次 call 12 段、各帶 metadata）+ `_pick_segment`（硬限制不連 2 段同 topic/tone + 軟權重）+ `GET /api/next_segment` + `_pool_refill_loop`（pending<15 自動補）。前端改撈 `/api/next_segment`。實測一批 12 段 ≈ NT$0.54、播放免費。詳見 `93_24H_MVP_POOL_BATCH_IMPL.md` |

### 已知待辦 / 限制

- [x] ~~**24H MVP batch 預生成架構**~~ → **已實作 + 本機測過（Step 5.42）**：batch 12 段/call + pool 循環 + 選球器（硬限制+軟權重）。播放走 `/api/next_segment`、不再每輪即時生。`/api/chat` 保留給 debug / 之後 5% live 插隊。詳見 `93_24H_MVP_POOL_BATCH_IMPL.md`
- [x] ~~**★ TTS 語音（最優先）**~~ → **已實作 + 已測試確認（Step 5.31~5.32）**：Edge-TTS server-side（mp3 快取）+ Web Speech API browser fallback。本機 Windows 跑 edge-tts 正常；雲端 SSL/403 環境 fallback 到 speechSynthesis。**2026-06-05 本機聽過、免費 Edge-TTS 效果可接受、不再微調**。
- [x] ~~**★ 搞笑梗「壞掉變梗」**~~ → **已實作 + 實測（Step 5.35）**：聲音掛掉那位暫時靜音、跑馬燈（AI 生成）+ 下一輪王于安 AI 吐槽 meta round、陳柏偉變默劇靜音泡泡、微軟修好演「修好了」梗。`state.ticker` + 前端 `#marquee-bar` + `_run_voice_meta_round`
- [x] ~~**★ YouTube 聊天室 × AI 互動**~~ → **完整實作 + 端到端測過（Step 5.45、2026-06-07）**：完整 P0–P6（`server.py` Step 5.45 區塊）+ token bucket 限流 + Mode Controller + kill switch + audit log + 紅隊資料集，**預設 OFF+shadow**。詳見 `96_YT_CHAT_IMPL.md`。設計依據 `91`（權威）+ `95_*`（請求/回覆、本機）。**仍待（🟡）**：官方 API（取代 pytchat、公開長跑較穩）、選舉模式專段、喜劇 safe quote（先 intent-only）、前端「回應觀眾中」LED、audit 保存排程/replay 事故流程、**公開前私人 shadow 連跑 24h+ 驗 0 漏 + 律師**。
- [x] ~~**★ 窗外天氣即時氣象（全完成 Step 5.39~5.41）**~~ → 4 時段×5 天氣、整張背景替換、平滑 crossfade、`/weather` 手機遙控、**中央氣象署真天氣自動驅動**（實測台北陰天→cloudy、啟動立即同步+之後防抖）。素材到位（中午/下午/晚上各自天氣、早上借中午）。⚠️ LIVE 機要自己在 `.env` 補 `CWA_API_KEY`（不跟 git）。
- [ ] **真人半身 × 看螢幕循環**：下一代大改造（87 筆記）、開 `realistic` 分支、真人 PNG 交 GPT 生圖
- [x] ~~Shorts pipeline 實戰測試~~ → 已跑通、第一支成功上傳 YT（Step 5.30）
- [~] **事實基底 + 活潑風格 prompt 規則 + 公開前安全層**：`_build_static_prompt()` 有完整「諷刺現象不指控個人 / 事實基底 / 傷害題先同情」規則。**2026-06-07 法律 review 後加固（A/C/D/E）**：A=prompt 加「具名真人只談事件、負評不掛人名」（誹謗/公然侮辱紅線）；C=「死亡案件一律禁止」改成「不可娛樂化/當笑點」（解與傷害題規則的矛盾）；D=**輸出閘（2026-06-07 升級成兩層、`_GATE_VERSION`）**：`_gate_prefilter`（regex 高風險樣式 + 新聞人名鄰近負評 = 警報器、純字串免費）→ 命中才升級 `_llm_safety_judge`（帶新聞標題當上下文的 Haiku 語意法官、分辨『討論已報導案件=放行』vs『無端指控/辱罵具名真人=drop』）。**生成時判一次、verdict 寫進 `segment.safety`；播放只查 cache（pass/warn 直接播、舊段/過期走 regex 快篩、零延遲不打 LLM）**。實測:正常段快篩免費過(一批多半 0 次 judge)、抓到關鍵字漏的「具名辱罵」、修掉「貪污新聞討論」誤殺。設計依據 `94_OUTPUT_GATE_REVIEW_REQUEST.md` + 兩份外部 AI 回覆（只做了 🟢「judge 可疑段+metadata」、🟡 rewrite/詞表治理/選舉模式/全台安全模式 之後規模大再做）；E=`index.html` 免責句「AI 生成內容・非新聞報導・觀點不代表任何真人」併進**跑馬燈最前面**（跟跑馬燈同色同字級、2026-06-07 使用者改的、原本是左下小框）。**仍待**：B=選舉期間排除候選人題（接近選舉再啟用）；輸出閘可之後升級成 LLM 語意級。**律師 review → 使用者 2026-06-07 決定暫緩**（專案還小、觀眾少、規模大了再找）。
- [x] **🇹🇼 節目價值底線（2026-06-07 使用者拍板、`_build_static_prompt` 內）**：本節目站民主/自由/人權/法治/台灣自決這邊、反對被威權一黨專政併吞、支持正當自我防衛、但不鼓吹戰爭（不避戰≠好戰）。**界線（務必守）**：針對「威權體制/併吞行為」不是中國人民/族群→不仇恨不去人化；不造謠不具名指控；用「價值與制度對照」表達不謾罵；**跟任何政黨完全無關**（不連結/代入任何政黨或政治人物）；國內藍綠仍中立。原「不在兩岸/統獨站隊」改成「藍綠政黨中立 + 民主價值可明講」。實測兩岸/一國兩制 topic：有表達立場、針對體制不針對人民、不好戰、未連政黨、過輸出閘。**＋節目精神「政治即生活」**：把新聞接回日常（房租/物價/生活）、讓人不反感政治、發現政治在身邊；但**絕不說教/不訓話/不罵冷漠**（用「有趣+有關」吸引、不逼）、一樣跟政黨無關。套用於所有生成（pool/插隊/未來聊天）。
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
