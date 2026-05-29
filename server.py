"""
WWT 晚晚嘴台灣 - FastAPI 伺服器
啟動: python server.py
瀏覽: http://localhost:8765
"""
import asyncio
import json
import os
import random
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

load_dotenv()

app = FastAPI(title="WWT 晚晚嘴台灣")

# ── 角色定義 ──────────────────────────────────────────────────────
# Phase 2E Task 5：升級為「議論時事的台灣鄉民」人設、不是空泛口頭禪機器
_CHARS = {
    'aming': {
        'name': '阿明哥',
        'personality': '50歲台灣大叔，議論派、碎念、退休風、喜歡回憶以前、對時事有看法',
        'catchphrases': ['我跟你講喔', '以前不是這樣', '說真的'],
    },
    'xiaomei': {
        'name': '小美姐',
        'personality': '30歲都會女性，吐槽派、反諷型、反應快、看穿事物本質',
        'catchphrases': ['所以呢？', '不意外', '問題就在這'],
    },
}

# 閒聊話題庫（沒有新聞時使用，降低 API 成本）
_CASUAL_TOPICS = [
    '珍珠奶茶又漲價', '便利商店新推出的東西', '夜市美食推薦',
    'AI最近又出什麼新工具', '台股今天走勢', '颱風季快到了',
    '房價到底什麼時候會跌', '外送平台收太多手續費', '網購退貨很麻煩', '早餐店排隊文化',
]

# ── Google News RSS（即時話題來源、Phase 3 Step 6）──────────────
_GOOGLE_NEWS_TW_RSS = "https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
_NEWS_REFRESH_SEC = 600              # 10 分鐘刷新一次新聞快取
_TOPIC_ROTATE_CHECK_SEC = 60         # 1 分鐘檢查一次是否該換 topic
_MIN_ROUNDS_PER_TOPIC = 5            # 同 topic 至少跑 5 輪不同 tone 才換新話題
_NEWS_FETCH_LIMIT = 15

# Module-level 新聞快取 + topic round 計數
_news_topics_cache: list[str] = []
_current_topic_rounds: int = 0       # /api/chat 每次 +1、rotate / 手動換 topic 後歸 0

# Phase 3 Step 6 擴充：8 種對話 tone（前 4 既有、後 4 新增、給同 topic 不同調性）
_DIALOGUE_TONES = [
    "debate", "react", "monologue", "casual",
    "critical", "mocking", "humorous", "sarcastic",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_HERE = Path(__file__).parent
STATE_FILE = _HERE / "wwt_state.json"
NEWS_CACHE_FILE = _HERE / "wwt_news_cache.json"


def _default_state() -> dict:
    """完整 state schema 預設值（與 normalize_state schema 一致）。"""
    return {
        "updated_at": datetime.now().strftime("%H:%M:%S"),
        "scene": "studio",
        "mode": "idle",
        "topic": "",
        "topic_summary": "",
        "mood": "neutral",
        "activity": "idle",
        "keywords": [],
        "hosts": {
            "aming": {
                "status": "idle",
                "last_output": "",
                "emotion": "neutral",
            },
            "xiaomei": {
                "status": "idle",
                "last_output": "",
                "emotion": "neutral",
            },
        },
    }


# 字串欄位 default 對照（normalize_state 用、與 _default_state 對齊）
_STR_FIELD_DEFAULTS = {
    "mode":          "idle",
    "topic":         "",
    "topic_summary": "",
    "scene":         "studio",
    "mood":          "neutral",
    "activity":      "idle",
}


def normalize_state(state) -> dict:
    """補齊 wwt_state 結構、修正型別錯誤、保證 downstream 安全存取。

    所有流入點（API POST、檔案 load）都先過這個 helper、確保下游不會 KeyError / TypeError。

    強制 schema：
    - mode/topic/topic_summary/scene/mood/activity (str): 各自有 default
    - updated_at (str): 缺則補當前 HH:MM:SS
    - keywords (list[str]): default []、成員自動 str() 化
    - hosts (dict): default {}、保證含 aming/xiaomei 兩個 dict
    - 其他未列出欄位 → 不動（向下相容、不破壞自訂擴充）
    """
    if not isinstance(state, dict):
        state = {}

    # 字串欄位
    for k, default in _STR_FIELD_DEFAULTS.items():
        if not isinstance(state.get(k), str):
            state[k] = default

    # updated_at（特殊：缺則補當前時間、不是空字串）
    if not isinstance(state.get("updated_at"), str):
        state["updated_at"] = datetime.now().strftime("%H:%M:%S")

    # keywords: 必須是 list、成員強制轉字串
    kws = state.get("keywords")
    if not isinstance(kws, list):
        state["keywords"] = []
    else:
        state["keywords"] = [str(k) for k in kws]

    # hosts: 必須是 dict、含 aming/xiaomei 兩個 dict
    hosts = state.get("hosts")
    if not isinstance(hosts, dict):
        hosts = {}
    for host_id in ("aming", "xiaomei"):
        if not isinstance(hosts.get(host_id), dict):
            hosts[host_id] = {}
    state["hosts"] = hosts

    return state


# ── 主題關鍵字字典（derive_keywords 用、純規則式不需要 LLM）─────────────
# 鍵 = topic 包含的子字串、值 = 對應的 5 個關鍵字
# 順序很重要：用最具體的主題在前、避免「房價」誤命中「便利商店房價」
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

# 通用 fallback 關鍵字（topic 沒命中任何主題時用、會混入 topic 本身）
_FALLBACK_KEYWORDS = ["生活", "新聞", "鄉民", "時事", "話題"]


def derive_keywords(topic: str) -> list[str]:
    """根據 topic 自動產生最多 5 個關鍵字（純規則式、不需 LLM）。

    流程：
    1. 字串包含匹配 _TOPIC_KEYWORDS_MAP（依字典順序、第一個命中就用）
    2. 沒命中 → 把 topic 本身當第 1 個關鍵字 + 通用 fallback 補滿

    Args:
        topic: 話題字串

    Returns:
        list[str] 最多 5 個關鍵字、保證去重、空輸入回完全 fallback
    """
    if not isinstance(topic, str) or not topic.strip():
        return list(_FALLBACK_KEYWORDS)

    topic_str = topic.strip()

    # 規則 1：主題字典匹配
    for key, kws in _TOPIC_KEYWORDS_MAP:
        if key in topic_str:
            return list(kws)  # 複製避免外部修改污染字典

    # 規則 2：fallback — topic 本身 + 通用詞、去重截 5
    candidates = [topic_str] + _FALLBACK_KEYWORDS
    seen: set = set()
    out: list[str] = []
    for k in candidates:
        if k and k not in seen:
            seen.add(k)
            out.append(k)
        if len(out) >= 5:
            break
    return out


def _load_state() -> dict:
    if STATE_FILE.exists():
        try:
            data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            return normalize_state(data)
        except Exception:
            pass
    return _default_state()


def _save_state(state: dict):
    state = normalize_state(state)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


# 啟動時重置 state
_save_state(_default_state())


# ── Google News RSS 抓取 + 背景任務 ────────────────────────────────
def _load_news_cache() -> list[str]:
    """從磁碟 load 上次 fetch 的新聞快取、回傳 list[str]。
    失敗回 []、不影響服務啟動。
    """
    if not NEWS_CACHE_FILE.exists():
        return []
    try:
        data = json.loads(NEWS_CACHE_FILE.read_text(encoding="utf-8"))
        headlines = data.get("headlines")
        if isinstance(headlines, list):
            return [str(h) for h in headlines if h]
    except Exception as e:
        print(f"[news] load cache failed: {e}")
    return []


def _save_news_cache(headlines: list[str]) -> None:
    """把當前快取覆寫到磁碟（replace 策略、舊話題自動被新一輪取代）。"""
    try:
        payload = {
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "headlines": [str(h) for h in headlines],
        }
        NEWS_CACHE_FILE.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        print(f"[news] save cache failed: {e}")


def fetch_news_topics(limit: int = _NEWS_FETCH_LIMIT) -> list[str]:
    """從 Google News Taiwan RSS 抓即時頭條、回傳乾淨 headline list。

    用 stdlib（urllib + xml.etree）、不引入新依賴。
    失敗（網路 / 解析錯）回 []、不 raise、不影響服務啟動。
    Google News title 格式為 "headline - 來源名稱"、會自動去掉尾部來源。
    """
    try:
        req = urllib.request.Request(
            _GOOGLE_NEWS_TW_RSS,
            headers={"User-Agent": "Mozilla/5.0 (TDT-WWT/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            xml_bytes = resp.read()
        root = ET.fromstring(xml_bytes)
        items = root.findall(".//item")
        headlines: list[str] = []
        for item in items[: limit * 2]:  # 多抓一些、過濾後再截
            title_el = item.find("title")
            if title_el is None or not title_el.text:
                continue
            raw = title_el.text.strip()
            cleaned = raw.rsplit(" - ", 1)[0].strip()
            if len(cleaned) < 6:  # 過短的不要
                continue
            headlines.append(cleaned)
            if len(headlines) >= limit:
                break
        return headlines
    except Exception as e:
        print(f"[news] fetch failed: {e}")
        return []


async def _news_refresh_loop():
    """背景任務：每 10 分鐘刷新新聞快取。
    replace 策略：新一輪 fetch 整批覆蓋舊快取（記憶體 + 磁碟）。
    """
    global _news_topics_cache
    while True:
        try:
            topics = await asyncio.to_thread(fetch_news_topics)
            if topics:
                _news_topics_cache = topics
                _save_news_cache(topics)  # 覆寫磁碟、舊話題自動被新一輪取代
                print(f"[news] cache refreshed: {len(topics)} headlines（已存檔）")
        except Exception as e:
            print(f"[news] refresh loop error: {e}")
        await asyncio.sleep(_NEWS_REFRESH_SEC)


async def _topic_rotate_loop():
    """背景任務：每 1 分鐘檢查、條件全滿足才換 topic。

    條件：
    - news cache 有內容
    - state.topic_locked == False（手動 POST /api/topic 後會 lock）
    - _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC（同 topic 至少跑 N 輪不同 tone）

    若 state.keywords_locked == True、保留手動 keywords、只換 topic。
    """
    global _current_topic_rounds
    await asyncio.sleep(15)  # 啟動後等 15 秒、讓 news cache 先有內容
    while True:
        try:
            if _news_topics_cache and _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC:
                st = _load_state()
                if not st.get("topic_locked"):
                    chosen = random.choice(_news_topics_cache)
                    st["topic"]         = chosen
                    st["topic_summary"] = ""
                    st["mode"]          = "discussion"
                    st["mood"]          = "heated"
                    st["activity"]      = "prepare_show"
                    st["updated_at"]    = datetime.now().strftime("%H:%M:%S")
                    # keywords：若沒被手動鎖、跟著新 topic derive
                    if not st.get("keywords_locked"):
                        st["keywords"] = derive_keywords(chosen)
                    _save_state(st)
                    _current_topic_rounds = 0  # 歸零、新 topic 重新累積回合
                    print(f"[news] rotated topic → {chosen}（前 topic 跑了 {_MIN_ROUNDS_PER_TOPIC}+ 輪）")
        except Exception as e:
            print(f"[news] rotate loop error: {e}")
        await asyncio.sleep(_TOPIC_ROTATE_CHECK_SEC)


@app.on_event("startup")
async def _startup_news_tasks():
    """啟動時：先 load 磁碟快取（立即可用）→ 背景去 fetch fresh RSS → 起兩個背景任務。
    若網路掛、靠磁碟上次的快取撐、不影響直播。
    """
    global _news_topics_cache
    # 1. 先 load 磁碟快取（如果有的話、不需等網路）
    disk_cache = _load_news_cache()
    if disk_cache:
        _news_topics_cache = disk_cache
        print(f"[news] loaded {len(disk_cache)} headlines from disk")

    # 2. 背景去抓 fresh RSS（不阻塞 startup）
    try:
        fresh = await asyncio.to_thread(fetch_news_topics)
        if fresh:
            _news_topics_cache = fresh
            _save_news_cache(fresh)  # 覆寫磁碟、舊話題被新一輪取代
            print(f"[news] initial fetch: {len(fresh)} headlines（已存檔）")
        elif not disk_cache:
            print("[news] no disk cache & RSS fetch failed → 等下一輪 refresh")
    except Exception as e:
        print(f"[news] initial fetch error: {e}")

    asyncio.create_task(_news_refresh_loop())
    asyncio.create_task(_topic_rotate_loop())


def _build_prompt(state: dict, turn_type: str) -> str:
    """依當前 state 和對話節奏，組出 Claude prompt（Phase 2E Task 5：Topic Driven）"""
    aming_catch   = "、".join(_CHARS['aming']['catchphrases'])
    xiaomei_catch = "、".join(_CHARS['xiaomei']['catchphrases'])

    topic    = state.get("topic", "").strip()
    summary  = state.get("topic_summary", "").strip()
    keywords = state.get("keywords") or []
    mode     = state.get("mode", "idle")

    # ── 話題區塊（discussion 強制引用、其他模式寬鬆閒聊）─────────────
    if mode == "discussion" and topic:
        topic_block_parts = [f"## 🎯 今日話題（對話必須圍繞此話題）\n{topic}"]
        if summary:
            topic_block_parts.append(f"## 話題背景\n{summary}")
        if keywords:
            kws_str = "、".join(str(k) for k in keywords[:5])
            topic_block_parts.append(f"## 相關關鍵字\n{kws_str}")
        topic_block = "\n\n".join(topic_block_parts)

        cite_rule = (
            "## 🚨 引用規則（最重要、違反這條就是失敗的輸出）\n"
            "- **每 3 句對白至少要有一次**明確提到 topic 或上方關鍵字、或具體引用 topic 背景\n"
            "- 對白主體必須圍繞此話題、絕不能變成跟 topic 無關的閒聊\n"
            "- 對白要有實質內容（具體看法、引述、吐槽 topic 細節），不是空泛感嘆\n\n"
            "### 引用範例（topic='油價飆漲'）\n"
            "  ✅ 阿明：說真的，中油這次壓力其實很大。\n"
            "  ✅ 小美：所以呢？凍漲只是把問題往後推啊。\n"
            "  ✅ 阿明：我跟你講喔，油價一漲，物價全跟著漲。\n"
            "  ❌ 阿明：以前不是這樣。（沒提油價、沒實質內容）\n"
            "  ❌ 小美：真的假的。（純空泛、沒看法）\n"
        )
    else:
        casual = random.choice(_CASUAL_TOPICS)
        topic_block = f"## 閒聊話題（沒設定正式 topic、輕鬆聊）\n{casual}"
        cite_rule = "## 引用規則\n- 話題輕鬆即可、不強制深度引用，但對白仍要有具體內容、不是空泛口頭禪。"

    # 依 turn_type 決定結構說明（8 種 tone、給同 topic 不同調性）
    structures = {
        # 既有
        "debate":    "阿明哥先說觀點，小美姐反嗆，阿明哥再補充或認輸。共 3 句。",
        "react":     "小美姐先提問，阿明哥認真分析（1-2 句），小美姐一句吐槽收尾。共 3-4 句。",
        "monologue": "阿明哥連說 2 句分析，小美姐一句簡短回應結尾。共 3 句。",
        "casual":    "隨機誰先說都行，輕鬆閒聊，3 句。",
        # 新增（Phase 3 Step 6）
        "critical":  "兩人輪流批評 topic 細節，明確指出『問題在...』『重點是...』『應該要...』，3-4 句。",
        "mocking":   "兩人輪流嘲笑 topic 的荒謬處，用『真的假的』『靠夭喔』『甘有可能』語氣，3-4 句。",
        "humorous":  "兩人用幽默梗或玩笑話討論 topic，輕鬆有趣但仍有觀點，3-4 句。",
        "sarcastic": "兩人用反諷語氣（『以前不是這樣』『不意外』『所以呢』『唉』），表面平靜實則在嘴，3-4 句。",
    }
    structure = structures.get(turn_type, structures["casual"])

    return f"""你是「晚晚嘴台灣 WWT」AI 鄉民談話台的對話生成器。

## 主持人設定

### 阿明哥
- 個性：{_CHARS['aming']['personality']}
- 常用語：{aming_catch}
- 風格：碎念、回憶以前、議論時事；常用語只能**穿插**在對白中、不能整句就是口頭禪

### 小美姐
- 個性：{_CHARS['xiaomei']['personality']}
- 常用語：{xiaomei_catch}
- 風格：吐槽、反諷、看穿本質；常用語只能**穿插**在對白中、不能整句就是口頭禪

{topic_block}

## 對話節奏
{turn_type}：{structure}

{cite_rule}

## 生成規則

### 字數
- 每句 **20~40 字**（嚴格範圍、過短沒實質內容、過長變論文）
- 句尾自然口語結束

### 風格
- 繁體中文、台灣鄉民口語、有溫度有看法
- ❌ 禁止論文風（「綜上所述」「就此議題而言」）
- ❌ 禁止官方新聞稿風（「政府表示」「相關單位指出」）
- ✅ 像真實朋友在電視棚口頭討論時事的感覺

### 禁止當作整句對白（這些只能當對白前綴或穿插、不能就只說這一句）
- 「以前不是這樣」
- 「真的假的」
- 「我跟你講喔」
- 「甘有可能」
- 「有夠扯」
- 任何**完全不引用 topic / 沒有具體看法**的空泛短語

### 內容限制
- 政治人身攻擊、宗教歧視、種族歧視、死亡案件、未成年、性侵、個資、誹謗、未證實指控、犯罪定罪判斷一律禁止

## 輸出格式

只輸出 JSON 陣列、不要任何其他文字、不要 markdown code fence：
[
  {{"speaker": "aming",   "text": "..."}},
  {{"speaker": "xiaomei", "text": "..."}}
]"""


@app.post("/api/chat")
async def generate_chat():
    """讓阿明哥與小美姐用 Claude 生成鄉民對話"""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "ANTHROPIC_API_KEY not set"}, status_code=503)

    state     = _load_state()
    # Phase 3 Step 6: 從 8 種 tone 隨機抽（既有 4 + 新增 4）
    turn_type = random.choice(_DIALOGUE_TONES)
    prompt    = _build_prompt(state, turn_type)

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        msg = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        dialogue = json.loads(raw.strip())

        # 更新 state：把最後對白存入 hosts
        st = _load_state()
        for line in dialogue:
            spk = line.get("speaker")
            if spk in st.get("hosts", {}):
                st["hosts"][spk]["status"]      = "talking"
                st["hosts"][spk]["last_output"] = line["text"]
        st["updated_at"] = datetime.now().strftime("%H:%M:%S")
        _save_state(st)

        # Phase 3 Step 6: 同 topic 累積回合數、rotate loop 依此決定是否該換新話題
        global _current_topic_rounds
        _current_topic_rounds += 1

        # speaker_a = 第一句說話的人；speaker_b = 另一人（走路目標）
        speaker_a = dialogue[0]["speaker"]
        speaker_b = next(
            (l["speaker"] for l in dialogue[1:] if l["speaker"] != speaker_a),
            None,
        )
        return {"dialogue": dialogue, "speaker_a": speaker_a, "speaker_b": speaker_b,
                "tone": turn_type, "topic_round": _current_topic_rounds}

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/state")
def get_state():
    return JSONResponse(_load_state())


@app.post("/api/state")
async def update_state(request: Request):
    """接收外部推送的狀態更新"""
    data = await request.json()
    STATE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True}


@app.post("/api/topic")
async def set_topic(request: Request):
    """手動輸入話題，觸發討論模式。
    用法：
        {"topic":"房價"}                              → 自動 derive 5 個關鍵字
        {"topic":"房價","keywords":["A","B","C"]}     → 用手動值、後續同 topic POST 不會覆蓋
        {"topic":"房價","summary":"信義區..."}        → 帶背景說明
    """
    data    = await request.json()
    topic   = data.get("topic", "").strip()
    summary = data.get("summary", "").strip()

    if not topic:
        return JSONResponse({"error": "topic is required"}, status_code=400)

    st = _load_state()  # 已 normalize、hosts.aming/xiaomei 保證是 dict
    st["topic"]         = topic
    st["topic_summary"] = summary
    st["mode"]          = "discussion"
    st["mood"]          = "heated"
    st["activity"]      = "prepare_show"
    st["updated_at"]    = datetime.now().strftime("%H:%M:%S")
    st["hosts"]["aming"]["status"]   = "thinking"
    st["hosts"]["xiaomei"]["status"] = "thinking"
    # Phase 3 Step 6: 手動 POST /api/topic → 標記 topic_locked、暫停自動 rotate
    st["topic_locked"] = True
    # Phase 3 Step 6: 新 topic、回合計數歸零
    global _current_topic_rounds
    _current_topic_rounds = 0

    # 任務 4: 同步 keywords
    # 1. request 帶 keywords (list) → 用手動值、標記 keywords_locked=True（之後 topic 變化不覆蓋）
    # 2. state.keywords_locked=True 且已有 keywords → 保留（手動值優先）
    # 3. 其他 → derive_keywords(topic) 自動產生、keywords_locked=False
    manual_kws = data.get("keywords")
    if isinstance(manual_kws, list):
        st["keywords"] = [str(k) for k in manual_kws][:5]
        st["keywords_locked"] = True
    elif st.get("keywords_locked") is True and isinstance(st.get("keywords"), list) and len(st["keywords"]) > 0:
        # 之前手動鎖定的 keywords 保留、不被新 topic 覆蓋
        pass
    else:
        st["keywords"] = derive_keywords(topic)
        st["keywords_locked"] = False

    _save_state(st)

    return {"ok": True, "topic": topic, "mode": "discussion",
            "keywords": st["keywords"],
            "keywords_locked": st.get("keywords_locked", False)}


# ── Google News 相關 API（Phase 3 Step 6）────────────────────────
@app.get("/api/news")
def get_news_cache():
    """回傳目前新聞快取的 headline list。"""
    return {"headlines": list(_news_topics_cache), "count": len(_news_topics_cache)}


@app.post("/api/news/refresh")
async def refresh_news_cache():
    """手動觸發新聞快取刷新（不等下一輪 10 分鐘）。覆寫磁碟、舊話題被新一輪取代。"""
    global _news_topics_cache
    topics = await asyncio.to_thread(fetch_news_topics)
    if topics:
        _news_topics_cache = topics
        _save_news_cache(topics)
    return {"ok": True, "count": len(_news_topics_cache),
            "headlines": list(_news_topics_cache)}


@app.post("/api/news/rotate_topic")
def rotate_topic_now():
    """手動觸發 topic 換成新聞快取中的隨機一條。

    會 unlock topic_locked（讓自動 rotate 之後也能繼續換）。
    若 keywords_locked=True、保留手動 keywords。
    回合計數歸零、新 topic 重新累積。
    """
    if not _news_topics_cache:
        return JSONResponse({"ok": False, "error": "news cache empty"}, status_code=503)
    chosen = random.choice(_news_topics_cache)
    st = _load_state()
    st["topic"]         = chosen
    st["topic_summary"] = ""
    st["mode"]          = "discussion"
    st["mood"]          = "heated"
    st["activity"]      = "prepare_show"
    st["updated_at"]    = datetime.now().strftime("%H:%M:%S")
    st["topic_locked"]  = False  # 解鎖、讓自動 rotate 之後也能繼續換
    if not st.get("keywords_locked"):
        st["keywords"] = derive_keywords(chosen)
    _save_state(st)
    global _current_topic_rounds
    _current_topic_rounds = 0
    return {"ok": True, "topic": chosen, "keywords": st["keywords"],
            "topic_locked": False, "topic_round": 0}


# ── 靜態檔案 ──────────────────────────────────────────────────────
app.mount("/src", StaticFiles(directory=str(_HERE / "src")), name="src")

_ASSETS = _HERE / "assets"
_ASSETS.mkdir(exist_ok=True)
app.mount("/assets", StaticFiles(directory=str(_ASSETS)), name="assets")


@app.get("/")
def index():
    return FileResponse(str(_HERE / "index.html"))


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  晚晚嘴台灣 WWT")
    print("  http://localhost:8765")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="warning")
