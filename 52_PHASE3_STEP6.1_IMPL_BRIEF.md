# Phase 3 Step 6.1 — Persistent Cache + 8-Tone + Topic Stickiness

**狀態：** 完成
**檔案動作：** `server.py` 6 處改動、`.gitignore` 加 1 行
**承接：** Phase 3 Step 6（Google News RSS 接線）

---

## 一、為什麼做這個

Step 6 完成「即時抓 RSS」後、發現三個改進點：

1. **server 重啟就失憶** — 抓過的新聞沒持久化、重開機要等網路重新抓
2. **變化度有限** — 4 種 tone 不夠、同 topic 講 1 輪就換、看不到角色多種表情
3. **後台沒喘息時間** — Topic 每 5 分鐘換、Codex 沒空產動作圖 / 表情圖

使用者一句話的設計：

> 「同一個話題可以不同聊天討論，批評，嘲笑，詼諧，諷刺，這樣會多很多變化，
>   而且也給後台有多餘時間產生不同內容跟動作圖或是表情圖也會有多餘時間來搭配」

---

## 二、三大改動

### A. 新聞快取持久化

| 機制 | 行為 |
|---|---|
| 啟動 | 先 load 磁碟 `wwt_news_cache.json`（立即可用）→ 背景去抓 fresh RSS |
| 抓成功 | 整批**覆寫**舊快取（記憶體 + 磁碟）— **replace 策略、不 append** |
| 抓失敗 | 保留上次快取、不影響直播 |
| 持久 | 每次 fetch 都存檔、重啟後直接可用 |

**檔案結構**：
```json
{
  "updated_at": "2026-05-30 02:08:47",
  "headlines": [
    "他沒簽所以川普也不簽!...",
    "蕭旭岑曾與馬英九爆激烈爭執...",
    "..."
  ]
}
```

### B. 8 種對話 tone

從 4 種擴成 8 種、給同 topic 不同調性：

| Tone | 結構 | 預期觸發小美動作 |
|---|---|---|
| `debate` ⭐既有 | 阿明觀點、小美反嗆、阿明補刀 | thinking |
| `react` ⭐既有 | 小美提問、阿明分析、小美吐槽收 | thinking → reacting |
| `monologue` ⭐既有 | 阿明連說 2 句、小美短回應 | talking |
| `casual` ⭐既有 | 隨機誰先說、輕鬆閒聊 | talking |
| `critical` 🆕 | 「問題在...」「重點是...」「應該要...」| **pointing** |
| `mocking` 🆕 | 「真的假的」「靠夭喔」「甘有可能」| **reacting** |
| `humorous` 🆕 | 幽默梗 / 玩笑話、輕鬆有趣 | talking |
| `sarcastic` 🆕 | 「以前不是這樣」「不意外」反諷語氣 | reacting / **tired** |

每次 `/api/chat` 從 8 種 tone 隨機抽 → 同 topic 撐 5 輪 → 5 種不同 tone 的對話 → 觸發 5 種不同小美動作。

### C. Topic 黏 5 輪、慢一點換

| 設定 | 之前 | 之後 |
|---|---|---|
| Rotate check 間隔 | 5 分鐘 | **1 分鐘**（檢查更細）|
| Rotate 條件 | 純時間 | **round count >= 5 AND topic_locked=False** |
| 同 topic 撐多久 | 5 分鐘固定 | 5 輪 × 約 30 秒/輪 ≈ **2.5 分鐘**、但對話內容變化度 ×5 |

**回合計數機制**：
- module-level `_current_topic_rounds: int = 0`
- `/api/chat` 每次 +1
- `_topic_rotate_loop` 看夠 5 輪才換、換後歸 0
- `/api/topic` 手動 POST、`/api/news/rotate_topic`、自動 rotate → 都歸 0

---

## 三、修改檔案

### 1. `.gitignore`

```diff
 wwt_state.json
 wwt_state.json.tmp
+wwt_news_cache.json
```

### 2. `server.py` 6 處

#### 2a. 常數區（替換 + 擴充）

```diff
-_TOPIC_ROTATE_SEC = 300   # 5 分鐘自動換 topic
+_TOPIC_ROTATE_CHECK_SEC = 60         # 1 分鐘檢查一次是否該換 topic
+_MIN_ROUNDS_PER_TOPIC = 5            # 同 topic 至少跑 5 輪不同 tone 才換新話題
 _NEWS_FETCH_LIMIT = 15

 _news_topics_cache: list[str] = []
+_current_topic_rounds: int = 0       # /api/chat 每次 +1、rotate / 手動換 topic 後歸 0
+
+# Phase 3 Step 6 擴充：8 種對話 tone（前 4 既有、後 4 新增、給同 topic 不同調性）
+_DIALOGUE_TONES = [
+    "debate", "react", "monologue", "casual",
+    "critical", "mocking", "humorous", "sarcastic",
+]
```

#### 2b. `STATE_FILE` 同層加 `NEWS_CACHE_FILE`

```diff
 STATE_FILE = _HERE / "wwt_state.json"
+NEWS_CACHE_FILE = _HERE / "wwt_news_cache.json"
```

#### 2c. 新增 `_load_news_cache()` / `_save_news_cache()`

完整 helper 兩個函式、try/except 包好、失敗回 `[]`/不 raise。

#### 2d. `_news_refresh_loop()` 加存檔

```diff
             if topics:
                 _news_topics_cache = topics
+                _save_news_cache(topics)  # 覆寫磁碟、舊話題自動被新一輪取代
                 print(f"[news] cache refreshed: ...")
```

#### 2e. `_topic_rotate_loop()` 用 round count

```diff
-async def _topic_rotate_loop():
-    """每 5 分鐘從新聞快取選一條當 topic。"""
-    await asyncio.sleep(15)
-    while True:
-        if _news_topics_cache:
-            st = _load_state()
-            if not st.get("topic_locked"):
-                chosen = random.choice(_news_topics_cache)
-                # ... rotate
+async def _topic_rotate_loop():
+    """每 1 分鐘檢查、條件全滿足才換 topic。"""
+    global _current_topic_rounds
+    await asyncio.sleep(15)
+    while True:
+        if _news_topics_cache and _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC:
+            st = _load_state()
+            if not st.get("topic_locked"):
+                chosen = random.choice(_news_topics_cache)
+                # ... rotate
+                _current_topic_rounds = 0  # 歸零、新 topic 重新累積回合
```

#### 2f. `@app.on_event("startup")` 先 load disk cache

```diff
 @app.on_event("startup")
 async def _startup_news_tasks():
     global _news_topics_cache
+    # 1. 先 load 磁碟快取（如果有的話、不需等網路）
+    disk_cache = _load_news_cache()
+    if disk_cache:
+        _news_topics_cache = disk_cache
+        print(f"[news] loaded {len(disk_cache)} headlines from disk")
+
+    # 2. 背景去抓 fresh RSS
     try:
-        initial = await asyncio.to_thread(fetch_news_topics)
-        if initial:
-            _news_topics_cache = initial
-            print(f"[news] initial fetch: {len(initial)} headlines")
+        fresh = await asyncio.to_thread(fetch_news_topics)
+        if fresh:
+            _news_topics_cache = fresh
+            _save_news_cache(fresh)
+            print(f"[news] initial fetch: {len(fresh)} headlines（已存檔）")
```

#### 2g. `_build_prompt()` `structures` 加 4 種 tone

```diff
     structures = {
         "debate":    "阿明哥先說觀點，小美姐反嗆，...",
         "react":     "小美姐先提問，阿明哥分析，...",
         "monologue": "阿明哥連說 2 句，...",
         "casual":    "隨機誰先說都行，...",
+        # 新增（Phase 3 Step 6）
+        "critical":  "兩人輪流批評 topic 細節，明確指出『問題在...』『重點是...』『應該要...』，3-4 句。",
+        "mocking":   "兩人輪流嘲笑 topic 的荒謬處，用『真的假的』『靠夭喔』『甘有可能』語氣，3-4 句。",
+        "humorous":  "兩人用幽默梗或玩笑話討論 topic，輕鬆有趣但仍有觀點，3-4 句。",
+        "sarcastic": "兩人用反諷語氣（『以前不是這樣』『不意外』『所以呢』『唉』），表面平靜實則在嘴，3-4 句。",
     }
```

#### 2h. `/api/chat` 用 8-tone + 累積 round count + 回傳 tone

```diff
-    turn_type = random.choice(["debate", "react", "monologue", "casual"])
+    turn_type = random.choice(_DIALOGUE_TONES)
     ...
     _save_state(st)
+    global _current_topic_rounds
+    _current_topic_rounds += 1
     ...
-    return {"dialogue": dialogue, "speaker_a": speaker_a, "speaker_b": speaker_b}
+    return {"dialogue": dialogue, "speaker_a": speaker_a, "speaker_b": speaker_b,
+            "tone": turn_type, "topic_round": _current_topic_rounds}
```

#### 2i. `/api/topic` 跟 `/api/news/rotate_topic` 都歸零 round count

```diff
     st["topic_locked"] = True
+    global _current_topic_rounds
+    _current_topic_rounds = 0
```

---

## 四、流程圖

```
啟動 server.py
    ↓
@on_event("startup")
    ├─ load 磁碟快取 → 立即可用（即使網路掛也有 topic）
    ├─ 背景 fetch fresh RSS → 成功就覆寫快取 + 存檔
    ├─ 起 _news_refresh_loop()    每 600s 刷快取（成功則覆寫磁碟）
    └─ 起 _topic_rotate_loop()    每 60s 檢查：rounds>=5 且 not locked → 換
    ↓
T=15s   首次 rotate 檢查（rounds=0、不換）
T=15s   /api/chat #1 用 tone=critical    → rounds=1
T=45s   /api/chat #2 用 tone=mocking     → rounds=2
T=75s   /api/chat #3 用 tone=sarcastic   → rounds=3
T=105s  /api/chat #4 用 tone=humorous    → rounds=4
T=135s  /api/chat #5 用 tone=debate      → rounds=5
T=180s  rotate 檢查 → rounds>=5 → 換 topic、rounds=0、新一輪 5 tone 變化
    ↓
T=600s  _news_refresh_loop 第一次刷新 → 整批覆寫快取（舊話題消失）
```

---

## 五、驗收實測

### RSS 抓取 + 持久化

```bash
$ python -c "from server import fetch_news_topics, _save_news_cache, _load_news_cache, NEWS_CACHE_FILE; \
  topics = fetch_news_topics(8); print(f'Fetched {len(topics)}'); \
  _save_news_cache(topics); loaded = _load_news_cache(); print(f'Loaded {len(loaded)}')"
Fetched 8 headlines
Loaded 8 from disk
```

✅ `wwt_news_cache.json` 自動建檔、reload 完整保留 8 條 headline

### 快取檔內容

```json
{
  "updated_at": "2026-05-30 02:08:47",
  "headlines": [
    "他沒簽所以川普也不簽! 傳美伊敲定60天停火備忘錄...",
    "蕭旭岑曾與馬英九爆激烈爭執 原因竟是「為了挺賴清德」",
    "雨彈開轟！7縣市豪、大雨特報 水利署發布淹水警戒",
    "..."
  ]
}
```

### Import check

```bash
$ python -c "import server; print('IMPORT OK')"
IMPORT OK
```

---

## 六、未動的部分

- ❌ `wwt_state.json` schema：不變
- ❌ `.env`：未動
- ❌ 前端 `index.html` / `src/*`：未動
- ❌ Anthropic Claude API 流程：未動（會自動拿到擴充後的 prompt）
- ❌ `_CHARS` / `_FALLBACK_KEYWORDS` / `_TOPIC_KEYWORDS_MAP`：未動
- ❌ `_CASUAL_TOPICS`：保留（mode=idle 時仍 fallback 用）

---

## 七、已知限制

1. **`_current_topic_rounds` 是 module var、重啟歸零**：
   - 重啟後 disk cache 還在、可立即抓 topic
   - 但 round count 從 0 開始、新 topic 要再等 5 輪
   - 影響輕微（重啟本來就會打斷觀眾體驗）

2. **8 種 tone 純隨機、可能連抽兩次同 tone**：
   - 5 輪內理論上不會全部抽到不同 tone
   - 視覺上仍有變化（同 tone 內容也不同）
   - 若要避免、可改成「shuffle 8 種 → pop」、但複雜化 module state

3. **新 tone 的 Claude prompt 結構描述較簡略**：
   - 「critical / mocking / humorous / sarcastic」只一句說明
   - 若 Claude 表現不如預期、可再加範例 / 細節
   - 留給 Step 6.2（觀察實測後再調）

---

## 八、🚨 待處理（沿用 Step 6）：小美 PNG 視覺問題

提醒：51_PHASE3_STEP6_IMPL_BRIEF.md 第九章已詳述、白色西裝在深色背景變透明、邊緣白色光暈。
**程式端無法修、需 PNG 重生**。建議 GPT 跟 Codex 重出 `char_xiaomei_actions.png`。

---

## 九、下一步建議

1. **驗收 8 種 tone**：實際跑 `python server.py` + 設 topic、觀察 5 輪對話的 tone 變化、看小美動作是否確實切到 pointing / reacting / tired
2. **若某 tone 表現不佳**：在 `structures` 加更詳細描述 / 引用範例
3. **若 5 輪不夠**：調 `_MIN_ROUNDS_PER_TOPIC` 到 6 或 8（用 8 等於把 8 tone 都用過一次）
4. **PNG 視覺修復**：GPT + Codex 處理
5. **commit + push**：Step 6 + 6.1 一起 commit
