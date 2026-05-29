# Phase 3 Step 6.3 — Topic Dialogue Variety / Anti-Repetition

**狀態：** 完成
**檔案動作：** `server.py` 5 處改動 + `.gitignore` 加 1 行
**承接：** Phase 3 Step 6 / 6.1 / 6.2（RSS / tone / chunk action）

---

## 一、為什麼做

Step 6.1 已讓動作變多了、但**同一個話題 5 輪對話內容容易重複**：
- 連續抽到同 tone 的機率高
- Prompt 沒告訴 Claude「前幾輪講了什麼」
- 同個 punchline / 開場一直出現

---

## 二、四大改動

### A. Tone shuffled queue（取代純 random）

```python
# /api/chat 之前：
turn_type = random.choice(_DIALOGUE_TONES)

# 改為：
turn_type = _next_tone_for_topic(topic)
```

- 每個 topic 維護一個 shuffled queue
- 同 topic 跑滿 8 輪內 tone 絕不重複
- Topic 換了 queue 自動歸零、重新 shuffle

### B. Angle shuffled queue（同 topic 多輪、不同角度切入）

新增 8 個討論 angle：

| Angle | 切入指引 |
|---|---|
| `money_pressure` | 錢、薪水、價格、成本 |
| `policy_responsibility` | 政策、政府、管理責任 |
| `public_reaction` | 網友 / 民眾反應 |
| `who_benefits` | 誰得利、誰受害 |
| `daily_life` | 一般人生活感受 |
| `data_gap` | 數字落差、比例、趨勢 |
| `history_compare` | 以前 vs 現在 |
| `absurd_metaphor` | 荒謬比喻、笑點 |

跟 tone queue 用同模式：`_next_angle_for_topic(topic)`

### C. Per-topic dialogue memory（`wwt_dialogue_memory.json`）

新增持久化檔案、紀錄同 topic 最近 8 輪對話：

```json
{
  "topic": "油價飆漲",
  "rounds": [
    {
      "at": "2026-05-30 02:55:00",
      "tone": "critical",
      "angle": "money_pressure",
      "lines": ["說真的，中油這次壓力大。", "所以呢？凍漲只是把問題往後推啊。"]
    },
    ...
  ]
}
```

- Topic 換了 → 整個 rounds 重置（不混前後 topic 的歷史）
- 每行截斷至 40 字（避免 prompt 過長）
- 最多保留最近 8 輪、超過自動丟頭

### D. Prompt 加 angle 區塊 + 反重複區塊

Claude 收到的 prompt 多兩段：

```
## 🎯 本輪切入角度（嚴格遵守）
- angle = `history_compare`
- 切入指引：從以前與現在比較切入：以前怎樣、現在怎麼變。
- 本輪內容必須鎖死在這個角度切入、不要混進其他角度。

## 🚫 最近已講過、本輪請避開
- 最近 tone：critical, mocking
- 最近 angle：money_pressure, public_reaction
- 最近台詞摘要：
  - 「說真的，中油這次壓力大。」
  - 「所以呢？凍漲只是把問題往後推啊。」
  - 「你看，留言區又炸了。」
  - 「笑死，每次都這樣演。」

### 反重複規則
- 不要重複出現過的句子（包含開場、句尾、punchline）。
- 不要每輪都用相同開場（例如連續用「所以呢」「問題就在這」）。
- 不要一直用同一個 punchline 收尾。
- 同 topic 每輪要推進新觀點、不是換句話說同一件事。
```

最近台詞最多取 10 句（避免 prompt 變太肥）。

---

## 三、檔案改動

### 1. `.gitignore`

```diff
 wwt_news_cache.json
+wwt_dialogue_memory.json
```

### 2. `server.py`

#### 2a. 常數區（`_DIALOGUE_TONES` 後追加）

```python
_DIALOGUE_ANGLES = [...]    # 8 個
_ANGLE_NOTES = {...}        # 每個 angle 的切入說明
_current_topic_key: str = ""
_tone_queue: list[str] = []
_angle_queue: list[str] = []
```

#### 2b. `DIALOGUE_MEMORY_FILE` 路徑 + 上限常數

```python
DIALOGUE_MEMORY_FILE = _HERE / "wwt_dialogue_memory.json"
_DIALOGUE_MEMORY_MAX_ROUNDS = 8
_DIALOGUE_MEMORY_LINE_MAX_LEN = 40
```

#### 2c. 新增 helpers（接在 `fetch_news_topics` 後、`_news_refresh_loop` 前）

- `_topic_key(topic)` — 規範化
- `_reset_topic_queues_if_changed(topic)` — topic 換了清 queue
- `_next_tone_for_topic(topic)` — shuffled queue 拿一個
- `_next_angle_for_topic(topic)` — shuffled queue 拿一個
- `_load_dialogue_memory()` / `_save_dialogue_memory()` — 磁碟 I/O
- `_get_recent_dialogue_memory(topic)` — 讀現 topic 記憶
- `_append_dialogue_memory(topic, tone, angle, dialogue)` — 寫一輪

#### 2d. `_build_prompt` 簽章 + body

```diff
-def _build_prompt(state: dict, turn_type: str) -> str:
+def _build_prompt(state: dict, turn_type: str,
+                  angle: str = "", recent_memory: dict | None = None) -> str:
```

body 加 `angle_block` + `anti_repeat_block` 兩個區塊建構、插入 prompt template 對應位置。

#### 2e. `/api/chat` 改用 queue + memory + 回傳 angle

```diff
     state     = _load_state()
-    turn_type = random.choice(_DIALOGUE_TONES)
-    prompt    = _build_prompt(state, turn_type)
+    topic     = state.get("topic", "")
+    turn_type = _next_tone_for_topic(topic)
+    angle     = _next_angle_for_topic(topic)
+    recent_memory = _get_recent_dialogue_memory(topic)
+    prompt    = _build_prompt(state, turn_type, angle, recent_memory)
     ...
+        # 寫入這一輪 dialogue 到 memory（給下一輪做反重複參考）
+        _append_dialogue_memory(topic, turn_type, angle, dialogue)
     ...
-    return {"dialogue": dialogue, ..., "tone": turn_type, "topic_round": _current_topic_rounds}
+    return {"dialogue": dialogue, ..., "tone": turn_type, "angle": angle,
+            "topic_round": _current_topic_rounds}
```

---

## 四、驗收實測

### A. Sanity check
```bash
$ python -c "import server; print('IMPORT OK')"
IMPORT OK
```

### B. Tone queue 不重複

```
=== Test 1: tone shuffle queue ===
tones: ['debate', 'sarcastic', 'humorous', 'mocking', 'critical', 'monologue', 'casual', 'react']
unique: 8 (expect 8)
```
✅ 同 topic 8 輪 tone 完全不重複

### C. Angle queue 不重複

```
=== Test 2: angle shuffle queue ===
angles: ['daily_life', 'data_gap', 'public_reaction', 'policy_responsibility', 'who_benefits', 'money_pressure', 'absurd_metaphor', 'history_compare']
unique: 8 (expect 8)
```
✅ 同 topic 8 輪 angle 完全不重複

### D. Topic 換了 queue reset

```
=== Test 3: topic change resets queue ===
first tone for topic_B after switch: debate
```
✅ 切換 topic 後重新一輪 shuffle

### E. Memory 流程

```
topic: 油價飆漲
rounds: 2
  Round 1: tone=critical, angle=money_pressure, lines=['說真的，中油這次壓力大。', '所以呢？凍漲只是把問題往後推啊。']
  Round 2: tone=mocking, angle=public_reaction, lines=['你看，留言區又炸了。', '笑死，每次都這樣演。']

switched topic memory rounds: 0 (expect 0)
after switch, topic: 另一話題, rounds: 1 (expect 1)
```
✅ 同 topic append、換 topic 自動 reset

### F. Prompt 區塊輸出

實際渲染後 angle 區塊：
```
## 🎯 本輪切入角度（嚴格遵守）
- angle = `history_compare`
- 切入指引：從以前與現在比較切入：以前怎樣、現在怎麼變。
- 本輪內容必須鎖死在這個角度切入、不要混進其他角度。
```

反重複區塊：
```
## 🚫 最近已講過、本輪請避開
- 最近 tone：critical, mocking
- 最近 angle：money_pressure, public_reaction
- 最近台詞摘要：
  - 「說真的，中油這次壓力大。」
  - 「所以呢？凍漲只是把問題往後推啊。」
  - ...
```
✅ 兩個區塊正確注入 prompt

---

## 五、保留的部分（沒動到）

- ✅ RSS cache replace 策略（Step 6.1）— `_news_topics_cache` 仍是 replace、不 append
- ✅ Topic rotate 5 輪規則（Step 6.1）— `_MIN_ROUNDS_PER_TOPIC` 不變
- ✅ `topic_locked` 手動 POST 暫停 rotate（Step 6）
- ✅ 前端 `OfficeScene` Step 6.2 動作邏輯（_chooseLineAction / chunk-level action / idle restore）
- ✅ API schema（state schema 完全沒動、memory 是獨立檔）
- ✅ 阿明任何邏輯
- ✅ 8 種 tone 既有的 structures 描述

---

## 六、未動的部分（嚴守限制）

| 項目 | 狀態 |
|---|---|
| `src/*` | ✅ 未動 |
| `assets/*` | ✅ 未動 |
| `wwt_state.json` schema | ✅ 未動 |
| `.env` | ✅ 未動 |
| 前端 OfficeScene / BootScene / config | ✅ 未動 |
| Walking / movement frozen | ✅ 未動 |

---

## 七、已知限制

1. **Memory 是 module-level 變數 + 磁碟、不是 per-session**
   - server 重啟、queue 從空開始
   - 但磁碟 memory 還在、所以 prompt 仍能有歷史
   - 重啟後第一輪 tone / angle 可能跟前一個 session 重複（機率 1/8）

2. **Memory 同 topic 撐 8 輪、跨 topic 不串**
   - Topic A → Topic B → Topic A：第二次回 Topic A 時 memory 已重置
   - 設計簡化、保 prompt 短

3. **Prompt 多了兩個區塊、token 用量略增**
   - 估計多 200-400 token / 次（含台詞摘要）
   - Claude Haiku 4.5 仍非常便宜、可接受

4. **新 tone（critical/mocking/humorous/sarcastic）描述仍偏短**
   - Step 6 既有的內容、本次未動
   - 若 Claude 表現不如預期、未來可在 structures 加範例

---

## 八、🚨 小美 PNG 視覺問題（沿用提醒）

仍存在、不在本次範圍。詳見 51 / 52 / 53 BRIEF 的素材層說明。
**等 Codex 重生 `char_xiaomei_actions.png`**。

---

## 九、下一步建議

1. **實跑 server 驗收**：`python server.py` + 設 topic、觀察 5-8 輪、看 console `[news]` log + 觀察對話多樣性
2. **如果反重複效果不夠**：
   - 增加 `_DIALOGUE_MEMORY_MAX_ROUNDS`（8 → 12）
   - 在 prompt 加更具體禁用句型範例
3. **如果 Claude 違反 angle 約束**：在 angle_block 加範例對白
4. **PNG 視覺問題**：交給 Codex
5. **若驗收 OK**：commit + push
