# Phase 2D 任務 4 完成報告

## derive_keywords(topic) + /api/topic 同步

---

## 修改檔案

| 檔案 | 動作 |
|---|---|
| `server.py` | **2 處改動**：(1) 新增 `_TOPIC_KEYWORDS_MAP` 主題字典 + `_FALLBACK_KEYWORDS` + `derive_keywords()` function；(2) `/api/topic` 加 keywords 同步邏輯（含 keywords_locked flag） |

其他檔案 0 動：
- `src/scenes/OfficeScene.js` ✅ 未動（任務 5 才動 prompt）
- `src/scenes/BootScene.js` ✅ 未動
- `src/config.js` ✅ 未動
- `index.html` ✅ 未動

---

## a. derive_keywords 設計

### 字典結構（純規則式、不需 LLM）

```python
_TOPIC_KEYWORDS_MAP: list[tuple[str, list[str]]] = [
    ("房價",     ["房價", "房貸", "買房", "租屋", "利率"]),
    ("AI",       ["AI", "ChatGPT", "失業", "自動化", "科技"]),
    ("颱風",     ["颱風", "停班", "停課", "豪雨", "災害"]),
    ("演唱會",   ["演唱會", "搶票", "黃牛", "票價", "場地"]),
    ("健保",     ["健保", "醫療", "保費", "醫院", "藥價"]),
    ("物價",     ["物價", "通膨", "薪資", "民生", "凍漲"]),
    ("便利商店", ["便利商店", "御飯糰", "茶葉蛋", "店員", "24小時"]),
    ("外送",     ["外送", "外送員", "外送費", "Uber", "foodpanda"]),
    ("股票",     ["股票", "台股", "投資", "ETF", "K線"]),
    ("早餐店",   ["早餐店", "蛋餅", "鐵板麵", "豆漿", "美而美"]),
    ("選舉",     ["選舉", "投票", "候選人", "政見", "罷免"]),
    ("教育",     ["教育", "升學", "補習", "學測", "108課綱"]),
    ("油價",     ["油價", "中油", "汽油", "柴油", "通膨"]),
    ("電價",     ["電價", "台電", "用電", "電費", "夏月"]),
    ("交通",     ["交通", "塞車", "捷運", "高鐵", "機車"]),
    ("夜市",     ["夜市", "小吃", "排隊", "雞排", "珍奶"]),
    ("珍奶",     ["珍奶", "手搖飲", "波霸", "鮮奶茶", "糖度"]),
    ("航空",     ["航空", "機票", "出國", "航班", "桃機"]),
]
_FALLBACK_KEYWORDS = ["生活", "新聞", "鄉民", "時事", "話題"]
```

**為什麼用 list of tuples 而不是 dict**：保留**插入順序**（Python 3.7+ dict 也保序、但 list of tuples 意圖更明確）。順序很重要 — 用最具體主題在前避免誤命中。

### 邏輯

```python
def derive_keywords(topic: str) -> list[str]:
    if not isinstance(topic, str) or not topic.strip():
        return list(_FALLBACK_KEYWORDS)
    topic_str = topic.strip()

    # 規則 1: 子字串包含匹配
    for key, kws in _TOPIC_KEYWORDS_MAP:
        if key in topic_str:
            return list(kws)

    # 規則 2: fallback — topic 本身 + 通用詞、去重截 5
    candidates = [topic_str] + _FALLBACK_KEYWORDS
    seen, out = set(), []
    for k in candidates:
        if k and k not in seen:
            seen.add(k); out.append(k)
        if len(out) >= 5:
            break
    return out
```

### 設計考量

| 點 | 決定 |
|---|---|
| 為何不用 LLM | 任務 4 只說「自動產生」、規則式更快、零延遲、零 token 成本 |
| 順序很重要 | `_TOPIC_KEYWORDS_MAP` 是 list（不是 dict）、第一個匹配就 return |
| Fallback 設計 | 沒命中時、topic 本身當第 1 個關鍵字（永遠相關）+ 通用詞 |
| 防呆 | None / 非字串 / 空字串 都回完全 fallback、不 crash |
| 回傳長度 | 固定 5 個、跟 OfficeScene.KEYWORD_MAX 對齊 |

---

## b. 測試案例

### A. derive_keywords() 函式直測（12 cases 全 PASS）

```
[PASS] topic='房價創新高'        → ['房價','房貸','買房','租屋','利率']
[PASS] topic='AI取代工作'        → ['AI','ChatGPT','失業','自動化','科技']
[PASS] topic='颱風假爭議'        → ['颱風','停班','停課','豪雨','災害']
[PASS] topic='便利商店漲價'      → ['便利商店','御飯糰','茶葉蛋','店員','24小時']
[PASS] topic='早餐店記錯餐'      → ['早餐店','蛋餅','鐵板麵','豆漿','美而美']
[PASS] topic='珍奶又漲'          → ['珍奶','手搖飲','波霸','鮮奶茶','糖度']
[PASS] topic='油價凍漲'          → ['油價','中油','汽油','柴油','通膨']
[PASS] topic='中秋連假塞車'      → ['中秋連假塞車','生活','新聞','鄉民','時事']
       ↑ 字典沒「中秋」或「塞車」、走 fallback、topic 本身當第 1 個
[PASS] topic='某個沒對應的話題'  → ['某個沒對應的話題','生活','新聞','鄉民','時事']
[PASS] topic=''                  → ['生活','新聞','鄉民','時事','話題']
[PASS] topic=None                → ['生活','新聞','鄉民','時事','話題']
[PASS] topic=123                 → ['生活','新聞','鄉民','時事','話題']
```

### B. /api/topic 端到端（6 條路徑全 PASS）

| Path | 操作 | 預期 | 結果 |
|---|---|---|---|
| 1 | POST 不帶 keywords，topic="房價創新高" | auto derive → 房價系 + locked=False | ✅ |
| 2 | POST 帶 keywords=["自訂A","自訂B","自訂C"]，topic="AI取代工作" | 用手動值 + locked=True | ✅ |
| 3 | 在 Path 2 之後、再 POST 不帶 keywords，topic="颱風假爭議" | **保留 [自訂A,B,C]**、不被新 topic 覆蓋 + locked=True | ✅ |
| 4 | POST 帶 keywords=[] 空陣列，topic="演唱會搶票" | 視為手動清空、keywords=[] + locked=True | ✅ |
| 5 | POST /api/state 解鎖 locked=False、再 POST /api/topic | 重新 auto derive | ✅ |
| 6 | locked=False 時連續換 2 個 topic | 第 2 次 keywords 完全跟著新 topic 變化 | ✅ |

---

## c. 修改位置

### server.py 2 處

| # | 區段 | 改動 |
|---|---|---|
| 1 | normalize_state 後方 / _load_state 前方 | 新增 `_TOPIC_KEYWORDS_MAP` 常數 + `_FALLBACK_KEYWORDS` 常數 + `derive_keywords(topic)` function |
| 2 | `@app.post("/api/topic")` handler | 加 keywords 同步邏輯：手動帶 → locked=True / locked=True 保留 / 其他 auto derive |

---

## d. 手動 vs Auto 行為矩陣

| state.keywords_locked | request 是否帶 keywords | 行為 | 結果 keywords | 結果 locked |
|---|---|---|---|---|
| False / 缺 | 否 | auto derive | derive(topic) | False |
| False / 缺 | 是（list）| 用手動值 | request.keywords[:5] | True |
| True | 否 | **保留現有** | （不變）| True（不變）|
| True | 是（list）| 用新手動值 | request.keywords[:5] | True |

### 解鎖方法（給使用者）

```bash
# 切換回 auto derive 模式
curl -X POST http://localhost:8765/api/state \
  -H "Content-Type: application/json" \
  -d '{"keywords_locked": false, "keywords": []}'
```

---

## e. response body 變更

`/api/topic` response 從：
```json
{"ok": true, "topic": "房價", "mode": "discussion"}
```

擴成：
```json
{
  "ok": true,
  "topic": "房價",
  "mode": "discussion",
  "keywords": ["房價","房貸","買房","租屋","利率"],
  "keywords_locked": false
}
```

讓 client 一發出去就知道 server 算出什麼 keywords、不用再 GET /api/state。

---

## 已知 / 之後可加強

1. **同義詞庫不夠**：「中秋連假塞車」沒命中「交通」、因為字典只匹配「交通」這個 key。未來可加 alias：
   ```python
   ("塞車",  ["交通", "塞車", "捷運", "高鐵", "機車"]),  # 「塞車」當另一個 key 也指向「交通」
   ```
2. **LLM 升級**：規則式不夠精準時可改用 Claude 生 keywords、但會增加 API 成本。當前任務只要規則式即可。

兩點都不阻擋本任務、留給 future enhancement。

---

## Git Commit 建議

```
feat(server): Phase 2D 任務 4 — derive_keywords + /api/topic 同步

新增：
- _TOPIC_KEYWORDS_MAP（18 個常見主題的 5-tuple keywords 字典）
- _FALLBACK_KEYWORDS（沒命中時混入 topic 本身的通用詞）
- derive_keywords(topic) → list[str] (規則式、純字串包含匹配)

/api/topic 加同步邏輯：
- 帶 keywords (list) → 用手動值、keywords_locked=True
- state.keywords_locked=True 且有值 → 保留（手動優先）
- 其他 → derive_keywords(topic)、keywords_locked=False
- response 多回 keywords + keywords_locked

驗證：
- derive_keywords 函式 12 case PASS（命中/fallback/None/空/型別錯）
- /api/topic 端到端 6 path PASS（auto/manual/locked 保留/解鎖/多 topic 切換）

只動 server.py、其他檔未動
```

---

## 下一步

依 12_PHASE2D 規劃剩下：

- 任務 3：驗證 discussion mode LED 顯示 topic（純前端視覺驗證、不改檔）
- 任務 5：主持人對話自動引用 topic（改 `_build_prompt`、仍在 server.py）
- 任務 6：F2 Debug Overlay（改 index.html）

**等 GPT 確認任務 4 後再進**。
