# 96 — YouTube 聊天室 × AI 互動：實作報告（Step 5.45）

**日期**：2026-06-07
**狀態**：**完整實作完成 + 本機端到端測過**。**預設 OFF + shadow（只記 log 不播）**，私測確認再開。
**依據**：`91_YT_CHAT_SECURITY_FINAL_v2.md`（權威設計）+ `95_*`（審查請求）+ 兩份外部 AI review（本機）。

---

## 1. 一句話

讓 YouTube 直播聊天室留言能跟 AI 主持人互動，但把「留言當敵對流動資料」處理：**主 AI 不看 raw、只看 intent；最後一道閘審實際播出文字；互動段 ephemeral 不進 pool；全程可 shadow**。

---

## 2. 完整 pipeline（全在 `server.py` Step 5.45 區塊）

```
來源（fake 注入 / pytchat）→ _yt_ingest
  P0：token bucket 限流（每人 2/分、全頻道 30/分）→ _yt_normalize（去零寬/NFKC全形/去控制字/疊字截斷/長度上限）
      → _yt_hard_rules（URL/email/phone/硬黑名單詞 直接擋）→ _yt_is_grey（注音規避/具名政治人物 → grey）
      → _yt_sanitize_name（暱稱一律「這位朋友」）
  ↓ 進 _yt_buffer（in-memory、ephemeral）
[_yt_run_round 每 interval 跑一次]
  P1 _yt_classify：grey 直接標、其餘批次 Haiku 分類 risk(safe/soft_redirect/grey/hard_block)+categories
  P2 _yt_select：hard_block 不選、user 冷卻(1h)、粗略去重、評分(safe>soft>grey、SC 加權上限 500)
  P3 _yt_build_intent：raw 不進主 AI、只給 20 字中性 intent（grey→neutral_taichi）
  P4 _yt_generate：固定人設(_build_static_prompt cache) + 今日新聞 + intent、無記憶、不看 raw、不遵循留言指令
  P5：_safety_gate_segment（複用輸出閘）+ _yt_tts_sanitize（去URL/email/phone/XML）+ _yt_leak_check（金鑰/prompt 洩漏）
  P6：_yt_record_metrics（spike）→ mode 自動降級；audit log；shadow 則只記不播、否則進 _yt_play_queue
[/api/next_segment] 播放優先序：YT 互動段 > 熱門 live 插隊 > pool（互動段 ephemeral、絕不進 pool）
```

---

## 3. 安全層對照「上線前必補 10 項」

| # | 必補項 | 狀態 |
|---|---|---|
| 1 | output gate 審實際播出文字 | ✅ 複用 `_safety_gate_segment` + leak check |
| 2 | raw 不進主 AI、只看 intent | ✅ P3 intent-only |
| 3 | display name sanitizer | ✅ 一律「這位朋友」 |
| 4 | TTS/字幕/overlay 審核 | ✅ `_yt_tts_sanitize`（前端 overlay 不顯示 raw） |
| 5 | Super Chat 預算 + 安全上限 | ✅ 限流 + SC 加權上限 500、不免審、走完整 gate |
| 6 | 選舉/誹謗/兒少/個資 | ✅ P0 硬黑名單 + grey 政治人物 + 分類器 + 輸出閘（選舉模式=待，見下） |
| 7 | 互動不進循環 pool | ✅ `_yt_play_queue` ephemeral、不寫 pool |
| 8 | unsafe spike 自動降級 | ✅ Mode Controller（OPEN/GUARDED/LOCKDOWN/OFF）+ ratio 觸發 |
| 9 | 外部來源也敵對 | ✅（新聞早已走輸出閘；聊天全程 untrusted） |
| 10 | 人格不可被馴化（無狀態） | ✅ 每 round 只 = 人設+新聞+intent、不回寫記憶 |

**額外採納**：token bucket（Cost-DoS）、Chat Source Adapter（可換源）、Kill Switch、audit log（建議存 6 個月＝告訴乃論時效）、紅隊測試資料集、shadow 模式。

---

## 4. 控制端點（測試/營運）

| 端點 | 用途 |
|---|---|
| `GET /api/yt/status` | 看設定/mode/buffer/queue/spike 指標 |
| `POST /api/yt/config` | `{enabled,shadow,mode,source,video_id,interval_sec,window_sec}` |
| `POST /api/yt/inject` | `{text,name,is_sc,sc_amount}` 假留言注入（**不需 live 就能測**） |
| `POST /api/yt/round` | 手動觸發一次互動 round |
| `POST /api/yt/kill` | 🛑 Kill switch：停互動 + 清佇列 |
| `POST /api/yt/redteam` | 跑 12 類紅隊資料集、回 P0/grey 判定報告 |

預設值：`enabled=False, shadow=True, mode=GUARDED, source=fake`。

---

## 5. 本機端到端測試結果（真 Claude、shadow）

- P0 紅隊：自殘/兒少→hard 擋、詐騙連結→url 擋、注音規避→grey、零寬字清除、全形正規化、疊字截斷 ✅
- 限流：同人 2 則後擋 ✅
- 完整 round：注入 5 則（含燒炭→P0丟、賴清德→grey、system prompt 注入、safe+SC）→ 選中 safe+SC、**注入留言變成中性 intent 無法操控主 AI**、生成正常、稱呼「這位朋友」、過輸出閘、shadow 不播 ✅

---

## 6. 上線流程（reviewer 強調、務必照走）

1. **私人直播 + shadow 連跑 24h+**：`source=pytchat` 接真聊天室、`shadow=True`（只記 log 不播）。看 audit log 有沒有漏網。
2. 確認 0 漏、kill switch 測過、spike 自動降級測過 → 才 `shadow=False` 真的播。
3. 公開長跑前再評估：官方 API（取代 pytchat）、選舉模式、replay 事故流程、律師。

> ⚠️ 預設就是 OFF + shadow，不會自己跑。要測：`POST /api/yt/config {"enabled":true}` + `POST /api/yt/inject` + `POST /api/yt/round`。

---

## 7. 已知限制 / 之後（🟡）

- pytchat 已接（lazy、斷線重連），但**官方 API + key 輪替**留之後（公開長跑較穩）。
- **選舉模式**（選前 10 日禁民調等）尚未專段實作 → 接近選舉再加（同 B 待辦）。
- 喜劇「引用原句」(safe quote)：reviewer 說太早、**先 intent-only**，公開穩定後再考慮。
- 前端：互動段會以 `topic="觀眾互動"` 播放；之後可加 LED「回應觀眾中」+ 倒數（複用 ticker）。
- audit log 保存/清理排程、replay 事故移除流程：公開前補。
