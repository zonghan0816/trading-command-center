# Phase 3 Step 6 — Google News RSS 即時話題接線

**狀態：** 完成
**檔案動作：** 單檔 `server.py` 5 處改動
**附帶：** Phase 3 Step 5.2（移除 Panel host 區塊、modeMap 清 legacy）也已完成

---

## 一、為什麼做這個

之前 topic 來源只有兩條路徑：
1. 手動 `POST /api/topic`
2. mode=idle 時、Claude 從 10 個硬編碼 `_CASUAL_TOPICS` 隨機抽

→ 對話內容變化太少、`_chooseLineAction()` 的關鍵字判斷（reacting / tired / pointing / thinking / talking）很難全部 trigger、看不到小美 actions 不同 frame。

**解法**：接 Google News Taiwan RSS、即時抓真實時事頭條、自動 rotate 當 topic。

---

## 二、修改檔案

### 1. imports（檔頂）

```diff
+import asyncio
 import json
 import os
 import random
+import urllib.request
+import xml.etree.ElementTree as ET
 from datetime import datetime
 from pathlib import Path
```

純 stdlib、無新依賴。

### 2. 常數區（接在 `_CASUAL_TOPICS` 後）

```python
# ── Google News RSS（即時話題來源、Phase 3 Step 6）──────────────
_GOOGLE_NEWS_TW_RSS = "https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
_NEWS_REFRESH_SEC = 600   # 10 分鐘刷新一次新聞快取
_TOPIC_ROTATE_SEC = 300   # 5 分鐘自動換 topic（手動 POST /api/topic 後暫停）
_NEWS_FETCH_LIMIT = 15

# Module-level 新聞快取
_news_topics_cache: list[str] = []
```

### 3. 三個 helper function（接在 `_save_state(_default_state())` 後）

- `fetch_news_topics(limit=15)` — sync 抓 RSS、去尾部「- 來源」、過濾過短、回 list[str]
- `_news_refresh_loop()` — async 背景、每 600s 刷快取
- `_topic_rotate_loop()` — async 背景、每 300s 從快取選一條當 topic（檢查 `topic_locked`）
- `@app.on_event("startup")` `_startup_news_tasks()` — 啟動立即抓 + 起兩個 background task

關鍵 guard：
```python
# _topic_rotate_loop 內
st = _load_state()
if not st.get("topic_locked"):
    # ... rotate
    if not st.get("keywords_locked"):
        st["keywords"] = derive_keywords(chosen)
```

→ 手動 POST `/api/topic` 後 `topic_locked=True`、自動 rotate 不會搶
→ 手動鎖 keywords（`keywords_locked=True`）→ topic 換但 keywords 保留

### 4. `/api/topic` handler 加一行

```diff
     st["hosts"]["aming"]["status"]   = "thinking"
     st["hosts"]["xiaomei"]["status"] = "thinking"
+    # Phase 3 Step 6: 手動 POST /api/topic → 標記 topic_locked、暫停自動 rotate
+    st["topic_locked"] = True
```

### 5. 三個新 API endpoint（在 `/api/topic` 後、static mount 前）

| Endpoint | 方法 | 用途 |
|---|---|---|
| `/api/news` | GET | 回傳目前快取的 headline list |
| `/api/news/refresh` | POST | 手動觸發快取刷新（不等 10 分鐘）|
| `/api/news/rotate_topic` | POST | 立即從快取選一條當 topic、`topic_locked` 解鎖 |

---

## 三、驗收 — RSS 抓取已實測

```bash
$ python -c "from server import fetch_news_topics; print(fetch_news_topics(5))"
1. 他沒簽所以川普也不簽! 傳美伊敲定60天停火備忘錄伊朗要求先給錢、美不允| 國際
2. 蕭旭岑曾與馬英九爆激烈爭執 原因竟是「為了挺賴清德」 | 蕭宥宸 | 新聞
3. 強降雨「開啟水冷降溫模式」由北往南大降溫 粉專曝薔蜜颱風侵台機率
4. 勞動部宣布：這類人提早下班！
5. 周玉蔻開嗆黃仁勳用「Maybe」唱衰台灣？蔣萬安用一字回應
```

✅ 真實時事頭條、繁體中文、跟 Google News 台灣版同步、無 API 成本、無金鑰需求。

---

## 四、流程圖

```
啟動 server.py
    ↓
@on_event("startup")
    ├─ 立即 fetch_news_topics() → cache 15 條
    ├─ 起 _news_refresh_loop()    每 600s 刷 cache
    └─ 起 _topic_rotate_loop()    每 300s 換 topic
    ↓
T=15s   首次 rotate：state.topic = 隨機新聞、keywords derive、mode=discussion
    ↓
前端 _pollState 每 5s 拉 /api/state
    ├─ LED 看到新 topic
    └─ TOP5 看到 derive 出來的 keywords
    ↓
前端 _fetchAndPlayDialogue 呼叫 /api/chat
    └─ Claude 收到 prompt 含新 topic → 生成圍繞此話題的對話
    ↓
T=315s  下一次自動 rotate
    （除非 topic_locked=True）
```

---

## 五、控制 / 解鎖方式

### 手動換成自選 topic
```bash
curl -X POST http://localhost:8765/api/topic \
  -H "Content-Type: application/json" \
  -d '{"topic":"自選話題"}'
# → topic_locked=True、自動 rotate 暫停
```

### 看快取目前有什麼新聞
```bash
curl http://localhost:8765/api/news
```

### 立即換一條新聞（解鎖 topic_locked）
```bash
curl -X POST http://localhost:8765/api/news/rotate_topic
```

### 手動刷新新聞快取
```bash
curl -X POST http://localhost:8765/api/news/refresh
```

### 重新啟用自動 rotate
```bash
curl -X POST http://localhost:8765/api/state \
  -H "Content-Type: application/json" \
  -d '{"topic_locked": false}'
```

---

## 六、未動的部分

- ❌ `wwt_state.json` / `.env`：未動
- ❌ 前端 `index.html` / `src/*`：未動
- ❌ Anthropic Claude API 流程：未動（會自動收到新 topic）
- ❌ `_TOPIC_KEYWORDS_MAP` / `derive_keywords()`：未動（新 topic 走相同 derive 邏輯）
- ❌ `_CASUAL_TOPICS`：保留（沒網路 / fetch 失敗時 mode=idle 仍能 fallback）

---

## 七、已知限制

1. **rotate 期間蓋掉 `/api/chat` 正在生成的 topic**：若 `/api/chat` 呼叫時 topic=A、生成中（5-10 秒）、剛好 `_topic_rotate_loop` 把 topic 換成 B、dialogue 仍是 A 的內容、但 state 已經是 B。視覺上會有一輪不同步、下一輪就跟上。
   - 影響輕微、5 分鐘 rotate 間隔下發生機率很低
   - 若要修：rotate 前檢查 `_chatInProgress`（但這在前端、server 不知道）

2. **Google News RSS 偶爾無法連線**：fetch_news_topics 已 try/except、失敗回 []、不影響服務啟動。連續失敗時 cache 仍是上一輪內容。

3. **首輪 fetch 失敗的話、cache 為空、`_topic_rotate_loop` 會 skip**：mode 維持 idle、前端 Claude prompt 走 fallback _CASUAL_TOPICS。

---

## 八、附帶：Phase 3 Step 5.2（同 commit 一起做完）

| 改動 | 位置 | 用途 |
|---|---|---|
| 移除 panel host 區塊 | `OfficeScene._updateHTMLPanel` | 跟泡泡播放重複、容易不同步 |
| 移除 skipHostLines / `_lastHostLines` 快取 | 同上 | Step 5.1 的凍結機制不再需要 |
| `modeMap` 清掉 working / coffee | 同上 | legacy 狀態、實際只用 discussion + idle |
| `_applyState` 回 `_updateHTMLPanel(data)` | 同上 | 不再需要傳 opts |

保留 Step 5.1 的有用部分：
- `_dialogueSeq` token + seq guard（防 race condition）
- 新 chunkMs 公式 / line gap 300 / next dialogue gap 1100（節奏調快）

---

## 九、🚨 待處理：小美 PNG 視覺問題（GPT 修）

實測截圖顯示小美角色有兩個視覺問題、**程式端無法乾淨修、需 PNG 重生**：

### 問題 1：白色西裝在深色背景下變透明

**現象**：`char_xiaomei_actions.png` 內西裝外套是白色、但實際渲染在 `studio_bg_night` 背景上顯示為「深藍黑色」。

**證據**：截圖中可見背景舞台燈條的橘藍色透過外套區域。

**原因**：AI 生圖工具去白底時、**白色外套也被一起變透明**了（白底去背的副作用）。

**影響**：
- 看起來像穿黑色西裝、不是設計的白色
- 換到 morning / noon 背景一樣會透出背景色
- 每個 action frame（idle/talking/thinking/reacting/pointing/tired）都有同樣問題

### 問題 2：角色邊緣白色光暈

**現象**：角色周圍（特別是頭髮、肩膀）有明顯白色細邊。

**原因**：PNG 邊緣抗鋸齒（feathered edge）的灰白色 alpha matte 沒被清乾淨。

### 建議解法（請 GPT / Codex 處理）

| 方案 | 工具 | 預估時間 |
|---|---|---|
| **A. Codex 重生（推薦）** | 提示語加 `solid opaque white blazer, no transparency on body, no white halo on edges, pure transparent background only outside character silhouette` | 重跑一次 |
| **B. Photoshop / GIMP 手動修** | 把外套填純白（保 alpha=1）、邊緣用「contract selection」清光暈 | 30 分鐘 |
| **C. 改設計成深色衣服** | 直接讓 Codex 畫深藍/深紫實心外套、避開白色透明問題 | 跟 A 一樣 |

需要替換的檔案：
- `assets/char_xiaomei_actions.png`（6 frame spritesheet、1024×1536 per frame）

如果只重做 actions、其他單張 PNG（idle/talking/thinking/reacting/pointing/tired 各一張）可保持不動、因為前端只載入 `_actions.png`。

---

## 十、Sanity Check

```bash
$ python -c "import server; print('IMPORT OK')"
IMPORT OK

$ python -c "from server import fetch_news_topics; print(len(fetch_news_topics(5)))"
5
```

---

## 十一、下一步建議

1. **PNG 視覺問題修復**：GPT 跟 Codex 重生 `char_xiaomei_actions.png`
2. **驗收 Step 6 自動 rotate**：實際跑 `python server.py`、等 15 秒看 console 是否 print `[news] rotated topic → ...`、瀏覽器 LED 是否變
3. **若 rotate 太快/太慢**：調 `_TOPIC_ROTATE_SEC`（建議 180~600s 間）
4. **若 Claude prompt 在新聞 topic 下表現不好**：可能要在 `_build_prompt` 加「對於新聞類 topic、可以引述標題具體內容」的規則
