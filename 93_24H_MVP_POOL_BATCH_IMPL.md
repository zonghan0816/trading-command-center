# 93 — 24H MVP：batch 預生成 + pool 循環（實作報告）

**Step**：Phase 4 Step 5.42
**日期**：2026-06-06
**觸發**：使用者拍板「直接做」24H MVP 核心架構（不再只算成本）
**對應討論**：[62_24H_MVP_DISCUSSION_NOTES.md](62_24H_MVP_DISCUSSION_NOTES.md)（GPT 65 號 11 項決策全採用）

---

## 1. 為什麼做（跟舊架構的差異）

| | 舊：即時生成 | 新：batch 預生成 + pool 循環 |
|---|---|---|
| 每輪對白來源 | 每輪打一次 Claude（即時） | **背景批次預生成、播放只從 pool 撈** |
| Claude call 頻率 | 每播一輪 = 1 call | **每 12 段 = 1 call**（播放時 0 call） |
| 觀眾看到的 | 真即時（但有生成 gap） | 看起來像 live（其實循環播 pool） |
| 重複控制 | 只靠 prompt 反重複區塊 | **metadata + 選球器**（硬限制 + 軟權重） |
| 成本 | 跟播放量線性掛鉤 | **跟「內容多樣性需求」掛鉤、播放免費** |

核心理念（CLAUDE.md 產品定位）：**這是「24H 表演」不是「新聞台」**。內容真實、即時性是錯覺。預生成一池對白循環播放，看起來像 live 就夠了。

實測成本：一批 12 段 = **$0.0175（約 NT$0.54）**、每段 ~NT$0.045。播放本身只跑 edge-tts（免費）。

---

## 2. 架構（三層）

```
[新聞快取 _news_topics_cache]
        ↓ 每段配一個 topic + tone + angle（沿用既有 shuffled queue）
[_generate_batch] 一次 Claude call → 12 段 JSON 陣列
        ↓ 各段帶 metadata、quality_check、存檔
[wwt_dialogue_pool.json]  ← pending / played(+cooling) / 過期 sweep
        ↓ _pick_segment（硬限制 + 軟權重）
[/api/next_segment] 撈一段 → 生 TTS → 回前端
        ↓
[前端 _fetchAndPlayDialogue / _prefetch] 改撈 /api/next_segment（取代 /api/chat）
```

背景 `_pool_refill_loop`：pending < 15 且沒在生 → 自動補一批。啟動後自動把 pool 補到目標水位。

---

## 3. Pool segment schema（wwt_dialogue_pool.json，list of）

```json
{
  "dialogue_id": "uuid",
  "topic": "...", "tone": "critical", "angle": "data_gap",
  "segment_type": "live_chat",
  "lines": [ {"speaker":"aming","text":"...","emotions":["..."]}, ... ],
  "status": "pending | played",
  "quality_score": 0.8,
  "created_at": 1717..., "played_at": null, "cooling_until": null
}
```

生命週期：`pending` →（被選中）→ `played` + `cooling_until = now + 6h` →（6h 後）可被 recycle 重播 →（created 超過 24h）sweep 移除。

---

## 4. 選球器 `_pick_segment`（GPT 65 號決策）

1. 候選 = pending（優先）；pending 空才用「已冷卻完的 played」recycle。
2. **硬限制**：不連 2 段同 `topic` / 同 `tone` / 同 `dialogue_id`（候選不足時才放寬）。
3. **軟權重**：
   - 基礎權重 = 1.0 + quality_score
   - 近 5 段出現過的 tone → ×0.4；近 5 段出現過的 angle → ×0.6
   - 加權隨機選一段。
4. 選中標 `played` + 6h cooldown，更新 `_last_picked` / `_recent_picks`。

實測連選 8 段：**無連續重複 topic/tone**（PASS）。

---

## 5. 新增 / 改動

**server.py（Step 5.42 區塊，`_run_voice_meta_round` 前）**
- 常數：`POOL_FILE` / `_POOL_REFILL_AT=15` / `_BATCH_SIZE=12` / `_SEG_COOLDOWN_SEC=6h` / `_SEG_EXPIRE_SEC=24h`
- `_load_pool` / `_save_pool` / `_sweep_pool` / `_pending_count`
- `_build_batch_prompt`（批次動態 prompt、要求回 JSON 陣列）
- `_generate_batch`（一次 Claude call → 解析 → 寫 pool、含預算守門 + 成本累計 + JSON 容錯）
- `_pick_segment`（上面選球器）
- `_pool_refill_loop`（背景補貨、startup 註冊）

**server.py 端點**
- `GET /api/next_segment`：pool 撈段 → 生 TTS → 回 `{dialogue, audio_urls, speaker_a/b, tone, angle, topic, from_pool, dialogue_id}`；pool 空回 503 + 觸發背景 batch；pause 中回 503
- `GET /api/pool/status`：pool 健康度（total/pending/played/recyclable/過期）
- `POST /api/pool/refill`：手動觸發一批（測試用）

**src/scenes/OfficeScene.js**
- `_fetchAndPlayDialogue` + `_prefetchNextDialogue` 的 fetch 從 `POST /api/chat` → `GET /api/next_segment`（其餘 prefetch/seq guard 邏輯不動）

**.gitignore**：加 `wwt_dialogue_pool.json`（runtime state、不進 git）

---

## 6. 注意 / 取捨

- **`/api/chat` 保留沒刪**：仍可手動打（debug / 之後「熱門新聞首次 live」5% 用途）。前端日常走 pool。
- **成本只來自 batch**：播放（含 prefetch）只撈 pool + edge-tts，不打 Claude。超預算時 batch 停 → pool 排乾 → `/api/next_segment` 回 503 → 前端定格在最後一輪（等同暫停），預算恢復後自動補。
- **TTS 在 serve 時生**：cache by 內容，recycle 重播命中快取、不重生。
- **`_last_picked`/`_recent_picks` 是 module 全域**：重開會重置（無妨，只影響「重開後第一段」可能與重開前重複，機率低）。
- **批次大小 12**：落在 GPT 65 號建議的 12-16，避免單次 JSON 太大解析失敗（max_tokens=4000）。

---

## 7. 還沒做 / 下一步候選

- [ ] **LIVE 部署**：git pull + 重啟 `啟動.bat`（pool 會自動建）。
- [ ] 觀察實跑多樣性（連播數十段看會不會膩）→ 不夠再調 `_recent_picks` 窗口或加 angle 種類。
- [ ] 「熱門新聞首次 live」5% 路徑（偵測爆紅新聞 → 走 `/api/chat` 即時生一輪插隊）尚未接。
- [ ] 跨輪對話記憶（pool 段彼此獨立、目前不接話跨段）。
