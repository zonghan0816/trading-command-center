# Phase 4 Step 5.27 — 加入 Yahoo News TW RSS 第二新聞源

**類型**：實作紀錄
**承接**：使用者觀察「夜間新聞重複感重」、Google News 單源在媒體下班後池子疲乏
**狀態**：✅ 上線、推到 origin/master

---

## 為什麼做

Step 5.7 起新聞抓取只用 Google News TW RSS、8 個分類各抓 4 條 = 30 條池子。

實測觀察（使用者反饋）：
- **早上 / 下午**：Google News RSS 內容豐富、感覺多樣
- **晚上 / 深夜**：媒體下班、Google News 池子變舊聞重洗、快取每 5 分鐘 refresh 但實質內容變動小

→ 夜間對話「重複感」變重、不是程式 bug、是 Google News 供應端的問題。

## 怎麼解

最小改動原則：**加 Yahoo News TW 為第二來源**、編輯時間不一定跟 Google 同步、夜間補位。

### 沒做（待後續觀察）

- 提高 `_PER_CATEGORY_LIMIT = 4` → 6 / 8（沒改、因為加 Yahoo 後變化先觀察）
- 時段制抓取量（早午 4 條、夜間 6 條）
- 中央社 / ETtoday / 自由時報 RSS（單 Yahoo 看效果先）

---

## 程式改動

### 新增常數

```python
_YAHOO_NEWS_BASE = "https://tw.news.yahoo.com/rss"
_YAHOO_NEWS_SECTIONS: dict[str, str] = {
    "焦點":       "",
    "台灣":       "/politics",
    "國際":       "/world",
    "商業":       "/finance",
    "科學與科技": "/technology",
    "娛樂":       "/entertainment",
    "體育":       "/sports",
    "健康":       "/health",
}
```

### 新增函數

`_fetch_one_yahoo(label, section, per_limit)` — 結構同 `_fetch_one_section`、URL format 不同、失敗回 `[]` 不 raise。

### 主迴圈調整

`fetch_news_topics()` 內每個 label 跑兩次抓取：

```
Google News（sections list）→ cat_pool
        +
Yahoo News（_YAHOO_NEWS_SECTIONS[label]）→ cat_pool
        ↓
random.shuffle(cat_pool) → 取前 _PER_CATEGORY_LIMIT 個 unique
```

### log 改動

breakdown 加上 source 細分：

```
焦點=4(g8+y8)、台灣=4(g8+y8)、國際=4(g8+y0)、...
```

- `gN` = Google raw 抓 N 條（dedupe 前）
- `yM` = Yahoo raw 抓 M 條
- 主數字 = 該類最後留下的 unique 條數

---

## 第一次測試結果

```
焦點=4(g8+y8)  台灣=4(g8+y8)  國際=4(g8+y0)  商業=4(g8+y8)
科學與科技=4(g16+y8)  娛樂=4(g8+y8)  體育=4(g8+y8)  健康=2(g8+y8) | total=30
```

### 觀察

1. **大部分類別 Yahoo 抓進 8 條 raw** — Yahoo RSS 活著、回傳結構正常
2. **國際 y0** — Yahoo `/world` 那次回空、graceful 退回純 Google
3. **健康 2 條** — 池子有 16 條（g8+y8）但只 2 個沒被前面類別 dedupe 吃掉、跟 Google 單源時一樣

### 限制（用戶體感差異不會立即明顯）

`_PER_CATEGORY_LIMIT = 4` 沒改 + `_NEWS_FETCH_LIMIT = 30` 沒改 → 總池子上限仍是 30。

Yahoo 帶來的好處是：
- 每類 raw pool 從 ~8 變 ~16
- shuffle 後選出的 4 條**多樣性提高**（不同編輯選題會混進）
- 夜間 Google 疲乏時、Yahoo 還在抓 → 池子的「新鮮度」拉高

不是「pool 變大」、是「pool 同樣大但內容更多元」。

---

## 後續觀察點

跑 24 小時後看：
1. 夜間 topic 重複感是否下降
2. `breakdown` log 看 Yahoo 抓進率（特別是國際、健康）
3. 兩源命中同一條的比例（從 raw 16 → final 4 看 dedupe 力道）

如果效果不夠：
- 提高 `_PER_CATEGORY_LIMIT = 4 → 6`（單行改）
- 提高 `_NEWS_FETCH_LIMIT = 30 → 48`
- 加第三源（中央社 RSS）

---

## 不影響的東西

- Anthropic API 成本（抓 RSS 不花錢、Claude prompt 仍是同樣 30 條）
- prompt caching hit rate（static prompt 完全沒動）
- 對話節奏（每 topic 仍跑 2 輪、`_MIN_ROUNDS_PER_TOPIC = 2` 沒改）
- 8 種 tone / 8 種 angle 隨機性
