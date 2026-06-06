# 91 — YT 聊天室互動：整合後最終安全設計 v2（採納兩份 AI review）

**日期**：2026-06-06
**狀態**：純設計、未實作。本檔 = 之後實作的**權威依據**（取代散落在 89 的結論）。
**來源**：89（討論）+ 90（review 請求）+ 兩份外部 AI review（`ai_live_chat_safety_review.md`、`ai_livestream_security_analysis.md`）。Claude 整合 + 拍板採納。

---

## 0. Reviewer 總評（誠實轉述）

> 兩位 AI 都判：**現在設計約 70 分、可做 prototype、但不建議直接公開長時間 24H 互動直播。**

三個真正缺口（我同意、必補）：
1. **分類器「只吐標籤」不能算真的擋住 injection**（會被混淆字/編碼/分段/角色扮演繞過）。
2. **不能只有 input gate、必須有 output gate**（真正播出去的是 output、它才會出事）。
3. **主 AI 不該看 raw comment、只該看「安全摘要 / intent」**。

→ 採納決定：**全部接受**。下面是整合後的設計。

---

## 1. 核心信條（比 89 更強硬）

> 聊天室留言 = **敵對的流動資料**，不是「觀眾提問」。
> AI 回覆 = **公開播送內容**，不是私下聊天。
> **主 AI 不看 raw comment。**
> **最後一道 gate 必須審「實際會播出的文字」（口播/字幕/overlay）。**
> 一切外部文字（含 RSS 新聞）都走 untrusted pipeline。

---

## 2. 最終 pipeline（採納 reviewer 的 P0–P6）

```
[留言 / Super Chat / display name / sticker / 頻道名…全部 untrusted]
  P0 硬規則：normalization（去零寬字/homoglyph/注音/編碼還原）→ blocked words / URL / 長度上限 / 重複字截斷 / display name sanitizer
  P1 分類：risk = safe | soft_redirect | grey | hard_block；categories[]（見 §3）；每則獨立分類
  P2 選球：unsafe 不入選；SC 只加權不免審不必回；每人/每窗/每日上限；semantic dedupe；unsafe ratio 過高自動關互動
  P3 安全摘要：raw comment 不進主 AI、只給 viewer_intent（JSON）；禁止主 AI 遵循留言指令 / 複述原文
  P4 主生成：Claude（固定人設 + 今日新聞 + 當批留言摘要，無歷史記憶）→ JSON 輸出 + risk_self_check
  P5 輸出審核（★最關鍵新增）：對「實際口播文字 / 字幕 / overlay」做 final safety check + 金鑰/prompt 洩漏檢查 + TTS sanitizer
  P6 事故處理：unsafe spike → 自動關互動；canned fallback；human override；audit log（含 retention）；replay 移除流程
```

---

## 3. 紅線分四層（採納、取代 89 的軟/硬二分）

| 層 | 處理 | 內容 |
|---|---|---|
| 🔴 **HARD BLOCK** | 直接擋、不讓主 AI 看、不播、**不耍嘴皮** | 仇恨/種族滅絕否認/去人化、自殺自殘飲食失調方法、兒少性/grooming、人肉個資、暴力武器毒品詐騙駭客教學、選舉操弄假訊息、誹謗未證實指控、詐騙導流、平台規避（「怎麼講不被 YT 抓」）|
| 🟡 **SOFT REDIRECT** | 可回、但只能安全轉向、禁個案 | 醫療（禁診斷/開藥）、法律（禁個案勝敗/教規避）、投資（禁明牌/喊單）、心理（禁嘲笑/娛樂化）|
| ⚪ **GREY（新增）** | 信心低/政治社會敏感人物 → 強制走「太極罐頭」、不給實質立場 | 政治狗哨（「1450」「那個光頭」）、反串、模稜兩可的敏感人物提問 |
| 🟢 **NORMAL RAILS** | 可正常回、控語氣 | 藍綠議題、名人公開風格、新聞梗、AI bug 梗、社會現象、輕度酸民 |

**台灣在地法律紅線（強制納入、reviewer 特別點）**：選罷法選前 10 日禁發布/引述民調、刑法 310 誹謗/公然侮辱、醫師法/律師法/投信顧問法（專業建議）、個資/人肉、著作權（禁朗讀整篇付費新聞/唱完整版權歌詞）。

---

## 4. 我（Claude）拍板的幾個「採納 + 校準」

1. **raw comment 隔離 — 採納，但留一個娛樂校準**：
   - 預設：主 AI 只拿 `viewer_intent`（最安全、reviewer 立場）。
   - ⚠️ 代價：失去「拿原句吐槽」的笑點(對喜劇節目是真損失)。
   - **校準（我建議）**：只對 `risk=safe` 的留言，額外傳一段「**消毒後的引用片段**」（過 P0 normalization + 安全分類 + 嚴格定界符 `<audience_message>…</audience_message>`），讓主持人能 riff；grey/unsafe 一律 intent-only 或 drop。實作時可開關。
2. **無狀態 / 極短 window — 採納**：聊天互動**不回寫角色長期記憶**；主 AI context 每次只 = 固定人設 + 今日新聞 + 當批留言。**觀眾不能訓練主持人人格**（杜絕溫水煮青蛙 persona drift）。→ 注意：這跟之前想做的「跨輪對話記憶」衝突 —— **聊天這條線不要記憶**（新聞對話的既有 8 輪記憶可留、但絕不混入觀眾內容）。
3. **輸出 gate — 採納為最高優先**：我們原本只有「輸出 quality breaker（掃危險字）」，升級成「審實際口播/字幕/overlay 文字」的 final gate。
4. **TTS sanitizer — 採納（好 catch）**：只吃 plain text、禁 SSML/XML/HTML/Markdown link、URL/email/電話不唸、**發音字典過濾諧音髒話**、重複字截斷（防 Zalgo 疊字 → TTS OOM/當機）、限單次合成長度。
5. **display name 不直唸 — 採納**：預設稱「這位朋友 / 觀眾 A」；display name 也要分類+清洗。
6. **Super Chat 預算防火牆 — 採納**：SC = 加權不免審不跳 gate；硬性速率上限（如每分鐘最多 N 次）；每人/每窗/每日上限；多筆 SC 打包合併回。
7. **時間補白 + 錯誤邊界 — 採納**：回應延遲統一補白（防 timing 反推黑名單）；所有 API 異常 → 本地 canned 變梗音檔，**原始 error 永不上畫面**。
8. **外部來源也 untrusted — 採納、且現在就相關**：RSS 標題/新聞內文也走 untrusted（現在就在餵 prompt、不是只有未來聊天）。
9. **群體操控 — 採納**：AI 不能說「很多人都在說」當輿情，除非有外部可信來源；禁「總結大家想法」這種任務。
10. **畫面常駐免責聲明 — 採納**（法律效力有限但做）：「本節目為 AI 生成娛樂、內容虛構、不代表頻道立場」。+ **敏感實體黑名單**（台灣熱門公眾人物/企業/網紅 → 觸及就「不予評論/中立」）。

---

## 5. 上線前「必補 10 項」（缺一個都別公開長跑）

1. output gate（審實際播出文字）
2. raw comment 隔離（主 AI 只看 intent）
3. display name sanitizer
4. TTS / 字幕 / overlay 審核（+ 諧音/SSML/長度）
5. Super Chat 預算 + 安全上限
6. 選舉 / 誹謗 / 兒少 / 個資 法務 checklist
7. 互動內容不得自動進循環 pool（ephemeral、要進需人工審）
8. unsafe spike 自動降級 / 關互動
9. 外部新聞來源也視為敵對輸入
10. 主持人人格不可被聊天室長期馴化（無狀態）

---

## 6. 實作順序（修正 89 §7、加安全步驟）

1. pytchat 讀 + console 印（零風險）
2. P0 normalization + 硬規則 + display name sanitizer
3. P1 分類器（risk + categories）+ P2 選球（含 SC 上限 / dedupe / unsafe-ratio）
4. P3 安全摘要（raw 不進主 AI）→ P4 主生成（無記憶）
5. **P5 輸出 gate + TTS sanitizer**（公開前必備）
6. P6 事故處理（auto-pause / canned fallback / audit log）
7. 前端：跑馬燈倒數（複用 state.ticker）+ 「這位朋友」稱呼
8. **先私人測長跑、確認 P5/P6 穩了再考慮公開**

---

## 7. 仍可保留的（89 既有、reviewer 認可）
資料極簡、分類器 gate、紅線清單、開窗+破門+上限、batch+pool 成本控制、拒絕不破功、限「行為+紅線」不限話題廣度。

> 細節威脅清單見兩份 review 原文（`ai_live_chat_safety_review.md` 最完整、含 P0–P6 + 分類 schema + 各類繞過手法；`ai_livestream_security_analysis.md` 含台灣法條 + 架構流程圖）。討論脈絡見 89。
