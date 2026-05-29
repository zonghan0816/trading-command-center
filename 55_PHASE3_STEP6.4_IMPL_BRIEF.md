# Phase 3 Step 6.4 — Initial News Topic Seeding Fix

**狀態：** 完成
**檔案動作：** 單檔 `server.py` 4 處改動
**承接：** Phase 3 Step 6 / 6.1 / 6.2 / 6.3

---

## 一、為什麼做

使用者反應：

> 「怎麼這麼久也沒有新聞進來？」

實際診斷：新聞 RSS **已抓到**、也存了 cache：

```
[news] loaded 15 headlines from disk
[news] initial fetch: 15 headlines（已存檔）
[news] cache refreshed: 15 headlines（已存檔）
```

但 `/api/state` 仍是：

```json
{ "mode": "idle", "topic": "", "keywords": [] }
```

→ **真正問題**：抓到了新聞、但**沒有人在啟動後立刻把它寫進 state.topic**。

---

## 二、根因

```python
async def _topic_rotate_loop():
    if _news_topics_cache and _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC:
        # ... rotate
```

兩個前置條件**互相卡死**：

- `_current_topic_rounds = 0`（剛啟動）
- 需要 `>= 5` 才會 rotate
- 要累積到 5 必須跑 `/api/chat` 5 次
- 但 chat 沒 topic、跑不出有意義內容
- **死循環、topic 永遠是空**

---

## 三、修法（4 處改動）

### A. 新增共用 helper `_apply_news_topic(chosen, *, unlock=False)`

放在 `_news_refresh_loop` 之前、給 startup / rotate loop / endpoint 三方共用：

```python
def _apply_news_topic(chosen: str, *, unlock: bool = False) -> dict:
    """把指定新聞標題寫入 state、同步 keywords / mode / activity / rounds 歸零。

    - 用 normalize_state 流程（透過 _load_state / _save_state）保證 schema 正確
    - keywords_locked=True 時保留手動 keywords、不覆寫
    - unlock=True 時把 topic_locked 設為 False（手動 /api/news/rotate_topic 用）
    - 不論呼叫者誰、_current_topic_rounds 都歸零（新 topic 重新累積）

    回傳：寫入後的完整 state dict。
    """
    global _current_topic_rounds
    st = _load_state()
    st["topic"]         = chosen
    st["topic_summary"] = ""
    st["mode"]          = "discussion"
    st["mood"]          = "heated"
    st["activity"]      = "prepare_show"
    st["updated_at"]    = datetime.now().strftime("%H:%M:%S")
    if unlock:
        st["topic_locked"] = False
    if not st.get("keywords_locked"):
        st["keywords"] = derive_keywords(chosen)
    _save_state(st)
    _current_topic_rounds = 0
    return st
```

避免 startup / rotate / endpoint 三處邏輯重複。

### B. `_topic_rotate_loop` 加空 topic seed 分支

```diff
 async def _topic_rotate_loop():
     await asyncio.sleep(15)
     while True:
         try:
-            if _news_topics_cache and _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC:
+            if _news_topics_cache:
                 st = _load_state()
-                if not st.get("topic_locked"):
-                    chosen = random.choice(_news_topics_cache)
-                    # ... rotate
+                has_topic = bool(str(st.get("topic", "")).strip())
+                should_seed   = not has_topic
+                should_rotate = has_topic and _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC
+
+                # seed 不受 topic_locked 限制（空 topic 沒什麼好保護的）
+                if should_seed or (should_rotate and not st.get("topic_locked")):
+                    chosen = random.choice(_news_topics_cache)
+                    _apply_news_topic(chosen, unlock=False)
+                    if should_seed:
+                        print(f"[news] seeded missing topic → {chosen}")
+                    else:
+                        print(f"[news] rotated topic → {chosen}（前 topic 跑了 5+ 輪）")
```

**Seed vs Rotate 兩條路徑**：

| 情境 | 條件 | 動作 |
|---|---|---|
| **Seed** | topic 為空 + cache 有 | 立即換、不管 rounds、不管 locked |
| **Rotate** | topic 有值 + rounds≥5 + not locked | 換新一條 |
| **Protect** | topic 有值 + locked | 不動（使用者手動 POST 的 topic）|

### C. `_startup_news_tasks` 新增第 3 步「立即 seed first topic」

```diff
     # 2. 背景去抓 fresh RSS（不阻塞 startup）
     try:
         fresh = await asyncio.to_thread(fetch_news_topics)
         ...

+    # 3. Phase 3 Step 6.4：啟動 seed first topic（如果 cache 有內容 + state 沒 topic）
+    if _news_topics_cache:
+        try:
+            st = _load_state()
+            has_topic = bool(str(st.get("topic", "")).strip())
+            if not has_topic:
+                chosen = random.choice(_news_topics_cache)
+                _apply_news_topic(chosen, unlock=False)
+                print(f"[news] seeded initial topic → {chosen}")
+            else:
+                print(f"[news] state already has topic（{st.get('topic')}）、不 seed")
+        except Exception as e:
+            print(f"[news] seed initial topic error: {e}")

     asyncio.create_task(_news_refresh_loop())
     asyncio.create_task(_topic_rotate_loop())
```

→ 啟動完成、瀏覽器一開就看得到 topic、不用等 5 輪 chat。

### D. `/api/news/rotate_topic` refactor 共用 helper

```diff
 if not _news_topics_cache:
     return JSONResponse({"ok": False, "error": "news cache empty"}, status_code=503)
 chosen = random.choice(_news_topics_cache)
-st = _load_state()
-st["topic"]         = chosen
-st["topic_summary"] = ""
-st["mode"]          = "discussion"
-...
-st["topic_locked"]  = False
-if not st.get("keywords_locked"):
-    st["keywords"] = derive_keywords(chosen)
-_save_state(st)
-global _current_topic_rounds
-_current_topic_rounds = 0
+# Phase 3 Step 6.4: 共用 _apply_news_topic、避免邏輯重複
+st = _apply_news_topic(chosen, unlock=True)
 return {"ok": True, "topic": chosen, "keywords": st["keywords"],
         "topic_locked": False, "topic_round": 0}
```

---

## 四、行為對照

### 啟動流程（之前）

```
1. _save_state(_default_state())     ← topic=""
2. load disk cache (15 headlines)
3. fetch fresh RSS (15 headlines)
4. 起 _news_refresh_loop + _topic_rotate_loop
5. _topic_rotate_loop 等 15s → 檢查 rounds<5、不換
6. 前端瀏覽器：mode=idle、topic=""、看不到任何話題 ❌
7. ... 等 5 輪 chat 後才會被 rotate（但 chat 沒 topic 也跑不出來）
```

### 啟動流程（之後）

```
1. _save_state(_default_state())     ← topic=""
2. load disk cache (15 headlines)
3. fetch fresh RSS (15 headlines)
4. ★ Step 6.4：seed first topic ← topic="..."、mode=discussion、keywords=[...]
5. 起 _news_refresh_loop + _topic_rotate_loop
6. _topic_rotate_loop 等 15s → 檢查 has_topic=True + rounds<5、不換（保護中）
7. 前端瀏覽器：mode=discussion、topic 有值、LED + TOP5 立刻有東西 ✅
8. /api/chat 開始有 topic 內容、5 輪後 rotate 換新一條
```

### Rotate loop 4 種情境矩陣

| state.topic | rounds | topic_locked | rotate loop 行為 |
|---|---|---|---|
| 空 | 0 | False | **seed**（不管 rounds、不管 locked）|
| 空 | 0 | True | **seed**（不管 locked、空 topic 沒東西可保護）|
| 有值 | < 5 | * | 不動（保護現 topic）|
| 有值 | ≥ 5 | False | **rotate**（換新一條）|
| 有值 | ≥ 5 | True | 不動（保護手動 POST 的 topic）|

---

## 五、驗收實測（已通過）

### A. Sanity check

```bash
$ python -c "import server; print('IMPORT OK')"
IMPORT OK
```

### B. `_apply_news_topic` helper 單測

```
before seed: topic='', mode=idle, keywords=[]
after seed:  topic='颱風假爭議', mode=discussion, keywords=['颱風', '停班', '停課', '豪雨', '災害']
  activity=prepare_show, mood=heated
```
✅ topic / mode / keywords / activity / mood 全部同步、derive_keywords 命中字典

### C. Startup seed 分支模擬

```
cache len: 3
state has_topic: False
seeded initial topic -> 測試新聞A

state.topic: '測試新聞A'
state.mode:  discussion
state.keywords: ['測試新聞A', '生活', '新聞', '鄉民', '時事']
```
✅ 啟動 seed 流程在 in-memory 驗證下正確啟用

### D. 實跑 server 預期 console（未實跑、邏輯預測）

```
[news] loaded 15 headlines from disk
[news] initial fetch: 15 headlines（已存檔）
[news] seeded initial topic → XXX        ← Step 6.4 新增
[news] cache refreshed: 15 headlines（已存檔）
```

### E. 預期前端表現

| 元素 | 之前 | 之後 |
|---|---|---|
| LED 中央 topic | 空 / 「待機」| 立即顯示新聞 |
| 右上 panel topic | 無 | 📌 {新聞標題} |
| TOP5 keywords | 預設 5 個 | 從新聞 derive 的 |
| `/api/chat` 對白 | 空泛閒聊 | 圍繞新聞時事 |

---

## 六、保留沒動的部分

| 項目 | 狀態 |
|---|---|
| Step 6.1 RSS replace 策略 | ✅ 完整保留 |
| Step 6.1 同 topic 至少 5 輪才 rotate | ✅ 完整保留（只新增 seed 分支）|
| Step 6.3 tone queue / angle queue / dialogue memory | ✅ 完整保留 |
| Step 6.3 prompt anti-repetition block | ✅ 完整保留 |
| `topic_locked` 保護手動 topic | ✅ 保留（rotate 時生效、seed 時跳過）|
| `keywords_locked` 保護手動 keywords | ✅ 保留 |
| 前端 `OfficeScene` Step 6.2 動作邏輯 | ✅ 未動 |
| API schema | ✅ 未動 |

---

## 七、未動的部分（嚴守限制）

- ❌ `src/*` / `assets/*` / `.env` / `wwt_state.json`

---

## 八、🚨 小美 PNG 視覺問題（沿用提醒）

仍存在、不在本次範圍。詳見 51 / 52 / 53 / 54 BRIEF 的素材層說明。
**等 Codex 重生 `char_xiaomei_actions.png`**。

---

## 九、邊界處理

| 邊界 | 處理 |
|---|---|
| 啟動時 RSS fetch 失敗 + 沒 disk cache | `_news_topics_cache` 為空、seed 分支 skip、退回 mode=idle |
| 啟動時 fetch 失敗 + 有 disk cache | seed 從 disk cache 取一條（仍能起來）|
| state 已有 topic（debug 狀況、不應發生）| startup 印「state already has topic、不 seed」、不覆寫 |
| seed 期間 `_load_state` 失敗 | try/except、印 log、不 crash startup |
| Rotate loop seed 時 cache 變空（極端）| `if _news_topics_cache` 守住、不執行 |

---

## 十、下一步建議

1. **實跑 `python server.py`** → 觀察 console 是否印「seeded initial topic → ...」
2. **瀏覽器開 `http://localhost:8765`** → LED 跟 TOP5 應立即有內容
3. **`/api/chat` 應立刻有圍繞新聞的對白**（不再是空泛閒聊）
4. **若驗收 OK**：commit + push（Step 6.3 + 6.4 一起 commit）
5. **PNG 視覺問題**：交給 Codex
