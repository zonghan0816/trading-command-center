"""
WWT 晚晚嘴台灣 - FastAPI 伺服器
啟動: python server.py
瀏覽: http://localhost:8765
"""
import asyncio
import json
import os
import random
import re
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
        'name': '陳柏偉',
        # 3Q 陳柏惟風格 — 熱血行動派、草根網路政治人物
        # 核心情緒比例：熱情(40%) > 好鬥(25%) > 幽默(15%) > 誠懇(10%) > 不屈(10%)
        # 優勢：草根親和力、議題創造力、快速吸引注意
        # 弱點：容易把議論放大、情緒直接外顯、容易形成兩極評價
        'personality': '30多歲台灣政治人物兼 YouTuber（3Q 陳柏惟風）— 熱血行動派、草根親和力強、網感極強；節奏快、情緒起伏大、常用台語和網路用語；立場鮮明、敢正面交鋒、不喜歡打太極；看到不公義會直接爆氣、但也會自嘲幽默化解氣氛；說話方式像跟朋友閒聊、不端架子；遇到強烈認同的事情會大力鼓掌呼籲',
        'catchphrases': ['3Q', '就是這樣啊', '你嘛幫幫忙', '靠夭喔', '說真的啦'],
    },
    'xiaomei': {
        'name': '王于安',
        # Phase 4 Step 5.15: 套王乃伃《狠狠抖內幕》風格 — 年輕政治娛樂主持
        # 反差萌（甜美外型 + 犀利直率）、網感重、Podcast 式控場、參與感取代權威感
        'personality': '30歲女、主播底子轉政論主持（王乃伃風）— 反差萌：甜美外型 + 犀利直率；網感重、敢用時事梗 / 迷因；不端著、會吐槽會自嘲；Podcast 控場（讓對方先講、再進去收線幫觀眾畫重點）；用「我也是觀眾」的參與感、不擺權威；咬字清楚節奏穩、能在激烈交鋒中抓回核心',
        'catchphrases': ['不會吧', '所以呢？', '我幫大家畫重點', '等等等等'],
    },
}

# 閒聊話題庫（沒有新聞時使用，降低 API 成本）
_CASUAL_TOPICS = [
    '珍珠奶茶又漲價', '便利商店新推出的東西', '夜市美食推薦',
    'AI最近又出什麼新工具', '台股今天走勢', '颱風季快到了',
    '房價到底什麼時候會跌', '外送平台收太多手續費', '網購退貨很麻煩', '早餐店排隊文化',
]

# ── Google News RSS（即時話題來源、Phase 3 Step 6）──────────────
# Phase 4 Step 5.7: 改抓 7 個分類、避免只有政治頭條、增加娛樂/運動/科技多樣性
_GOOGLE_NEWS_TW_BASE = "https://news.google.com/rss"
_GOOGLE_NEWS_TW_TAIL = "?hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
# Phase 4 Step 5.8: 使用者指定 8 分類（對應 Google News 中文 UI tabs、不要當地）
# 每 tuple = (顯示 label, [sections to fetch and merge])
# section "" → 預設 top stories；其他 → topic 區段
_NEWS_CATEGORIES: list[tuple[str, list[str]]] = [
    ("焦點",       [""]),                          # Top stories
    ("台灣",       ["NATION"]),
    ("國際",       ["WORLD"]),
    ("商業",       ["BUSINESS"]),
    ("科學與科技", ["SCIENCE", "TECHNOLOGY"]),    # 兩個 RSS 合併、外面當一類
    ("娛樂",       ["ENTERTAINMENT"]),
    ("體育",       ["SPORTS"]),
    ("健康",       ["HEALTH"]),
]
_PER_CATEGORY_LIMIT = 4              # 每類抓 4 條、合計 ~32 條、dedupe 後 ~28（Step 5.9）

# Phase 4 Step 5.27: Yahoo News TW RSS 第二來源、補 Google News 夜間稀疏
# 8 個 label → Yahoo 對應 section path（""=top stories）
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

_NEWS_REFRESH_SEC = 300              # 5 分鐘刷新一次（Step 5.9: 對話追話題、刷快一點）
_TOPIC_ROTATE_CHECK_SEC = 60         # 1 分鐘檢查一次是否該換 topic
_MIN_ROUNDS_PER_TOPIC = 2            # 同 topic 跑 2 輪就換（節奏快、避免重複感）
_NEWS_FETCH_LIMIT = 30               # 總上限（多類別合併後）
_RECENT_TOPICS_LIMIT = 6             # 記住最近 6 個 topic、rotate 排除

# Module-level 新聞快取 + topic round 計數
_news_topics_cache: list[str] = []
_pending_og_enrichment: list[tuple[str, str]] = []  # 層三暫存：(disambig_title, url)
_current_topic_rounds: int = 0       # /api/chat 每次 +1、rotate / 手動換 topic 後歸 0
# Phase 4 Step 5.7: 最近用過的 topic queue、避免短期重複（rotate / 手動換 topic 都會 push）
_recent_topics_history: list[str] = []
# Phase 4 Step 5.10: 下一棒 topic queue、永遠預備 N 個、rotate 直接 pop（不再臨時抽）
_TOPIC_QUEUE_TARGET = 2              # 永遠預備好 2 個下一個 topic
_topic_queue: list[str] = []

# ── Phase 4 Step 5: Cost Guard 預算護欄 ───────────────────────
# Anthropic Claude Haiku 4.5 定價（每 1M token）
_PRICE_INPUT_PER_MTOK         = 1.00   # USD - 一般 input
_PRICE_OUTPUT_PER_MTOK        = 5.00   # USD - output
# Phase 4 Step 5.20: prompt caching 計費
_PRICE_CACHE_WRITE_PER_MTOK   = 1.25   # USD - cache write、~1.25x base input（5min TTL）
_PRICE_CACHE_READ_PER_MTOK    = 0.10   # USD - cache read、~0.1x base input（90% off）
# 預算上限（USD、NT$1=$1/30、Haiku 4.5 起家用量）
# Phase 4 Step 5.1: 使用者調整、日 $2 太緊、改 $6（24/7 跑滿 ~$5/天、有 ~20% buffer）
_DAILY_BUDGET_USD   = 12.00     # Step 5.19: B 選項、上調可 24/7、≈ NT$360/天
_MONTHLY_BUDGET_USD = 80.00     # Step 5.19: 紅線 $50 → $80、≈ NT$2400/月

# Phase 3 Step 6 擴充：8 種對話 tone（前 4 既有、後 4 新增、給同 topic 不同調性）
_DIALOGUE_TONES = [
    "debate", "react", "monologue", "casual",
    "critical", "mocking", "humorous", "sarcastic",
]

# Phase 3 Step 6.3：8 種討論 angle（給同 topic 多輪用不同切入角度）
_DIALOGUE_ANGLES = [
    "money_pressure",        # 錢、薪水、價格、成本
    "policy_responsibility", # 政策、政府、管理責任
    "public_reaction",       # 網友 / 民眾反應
    "who_benefits",          # 誰得利、誰受害
    "daily_life",            # 一般人生活感受
    "data_gap",              # 數字落差、比例、趨勢
    "history_compare",       # 以前 vs 現在
    "absurd_metaphor",       # 荒謬比喻、笑點
]

# Angle 對應 prompt 切入說明
_ANGLE_NOTES = {
    "money_pressure":         "從錢與壓力切入：薪水、物價、房價、成本、誰負擔。",
    "policy_responsibility":  "從政策與責任切入：誰該管、制度哪裡失靈。",
    "public_reaction":        "從民眾與網友反應切入：留言區、社群風向、日常抱怨。",
    "who_benefits":           "從利益分配切入：誰得利、誰買單、誰被犧牲。",
    "daily_life":             "從生活感受切入：上班族、學生、家庭、通勤、消費。",
    "data_gap":               "從數字落差切入：比例、趨勢、前後對比；不要硬編精確數字。",
    "history_compare":        "從以前與現在比較切入：以前怎樣、現在怎麼變。",
    "absurd_metaphor":        "用荒謬比喻或笑點切入、但仍要跟 topic 有關。",
}

# Phase 3 Step 6.3：tone / angle queue（per-topic shuffle、避免連續抽到同一個）
_current_topic_key: str = ""
_tone_queue: list[str] = []
_angle_queue: list[str] = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_HERE = Path(__file__).parent
STATE_FILE = _HERE / "wwt_state.json"
NEWS_CACHE_FILE = _HERE / "wwt_news_cache.json"
DIALOGUE_MEMORY_FILE = _HERE / "wwt_dialogue_memory.json"
OBSERVE_LOG_FILE = _HERE / "wwt_observe_log.jsonl"   # Phase 4 Step 5.11: 24H 觀察期 JSONL 記錄
DIALOGUE_ARCHIVE_FILE = _HERE / "wwt_dialogue_archive.jsonl"  # Step 5.28: 全文持久化、給 Shorts pipeline

# ── TTS (Edge-TTS) ────────────────────────────────────────────────
TTS_DIR = _HERE / "output" / "tts"
TTS_DIR.mkdir(parents=True, exist_ok=True)

_TTS_VOICES = {
    "aming":   "zh-TW-YunJheNeural",    # 男聲（陳柏偉）
    "xiaomei": "zh-TW-HsiaoChenNeural", # 女聲（王于安）
}
_TTS_RATE = {
    "aming":   "+10%",  # 陳柏偉：稍快有活力
    "xiaomei": "+0%",   # 王于安：正常速
}
_DIALOGUE_MEMORY_MAX_ROUNDS = 8           # 同 topic 最多保留最近 8 輪記憶
_DIALOGUE_MEMORY_LINE_MAX_LEN = 40        # 寫入 memory 時、每行截斷字數


def _log_observe(event: str, **payload) -> None:
    """Phase 4 Step 5.11: append-only JSONL 觀察日誌、不阻塞 runtime。
    寫失敗一律吞掉、不能因 log 寫不出而干擾直播。
    """
    try:
        line = {
            "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "event": event,
            **payload,
        }
        with open(OBSERVE_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(line, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _append_dialogue_archive(topic: str, tone: str, angle: str,
                              round_num: int, dialogue: list) -> None:
    """Phase 4 Step 5.28: 每輪對話全文持久化、給 Shorts 自動挑片 pipeline 用。
    跟 observe log 分開：observe log = 摘要統計、archive = 全文素材。
    寫失敗一律吞掉。
    """
    try:
        line = {
            "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "topic": topic,
            "tone": tone,
            "angle": angle,
            "round_num": round_num,
            "lines": [
                {
                    "speaker": l.get("speaker", ""),
                    "text": str(l.get("text", ""))[:250],
                }
                for l in dialogue if isinstance(l, dict)
            ],
        }
        with open(DIALOGUE_ARCHIVE_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(line, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _default_state() -> dict:
    """完整 state schema 預設值（與 normalize_state schema 一致）。"""
    return {
        "updated_at": datetime.now().strftime("%H:%M:%S"),
        "scene": "studio",
        "mode": "idle",
        "topic": "",                # 排隊中的「下一個話題」（rotate loop 控制）
        "speaking_topic": "",       # 角色「現在正在播放」的話題（前端 /api/now_speaking 控制）
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
    "mode":           "idle",
    "topic":          "",
    "speaking_topic": "",
    "topic_summary":  "",
    "scene":          "studio",
    "mood":           "neutral",
    "activity":       "idle",
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


# ── Phase 4 Step 5: Cost Guard helpers ─────────────────────────────
def _get_cost_usage(st: dict) -> dict:
    """從 state 取出當前用量、自動處理日/月切換歸零。
    結構: {"today": {"date": "2026-06-01", "amount_usd": 0.00},
           "month": {"month": "2026-06",   "amount_usd": 0.00}}
    """
    today = datetime.now().strftime("%Y-%m-%d")
    month = datetime.now().strftime("%Y-%m")
    usage = st.get("cost_usage") if isinstance(st.get("cost_usage"), dict) else {}
    if not isinstance(usage.get("today"), dict) or usage["today"].get("date") != today:
        usage["today"] = {"date": today, "amount_usd": 0.0}
    if not isinstance(usage.get("month"), dict) or usage["month"].get("month") != month:
        usage["month"] = {"month": month, "amount_usd": 0.0}
    return usage


def _add_cost_to_state(st: dict, cost_usd: float) -> dict:
    """累積 cost 到 state、回傳更新後的 usage。Mutate state in-place。"""
    usage = _get_cost_usage(st)
    usage["today"]["amount_usd"] = round(usage["today"]["amount_usd"] + cost_usd, 6)
    usage["month"]["amount_usd"] = round(usage["month"]["amount_usd"] + cost_usd, 6)
    st["cost_usage"] = usage
    return usage


def _check_budget(st: dict) -> tuple[bool, str]:
    """檢查是否超預算、回傳 (是否超支, 原因字串)"""
    usage = _get_cost_usage(st)
    daily   = usage["today"]["amount_usd"]
    monthly = usage["month"]["amount_usd"]
    if monthly >= _MONTHLY_BUDGET_USD:
        return True, f"monthly budget exceeded: ${monthly:.3f}/${_MONTHLY_BUDGET_USD:.2f}"
    if daily >= _DAILY_BUDGET_USD:
        return True, f"daily budget exceeded: ${daily:.3f}/${_DAILY_BUDGET_USD:.2f}"
    return False, ""


def _estimate_cost_usd(
    input_tokens: int,
    output_tokens: int,
    cache_write_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> float:
    """估算單次 Claude call 的 USD 成本"""
    return (
        (input_tokens         * _PRICE_INPUT_PER_MTOK       / 1_000_000) +
        (output_tokens        * _PRICE_OUTPUT_PER_MTOK      / 1_000_000) +
        (cache_write_tokens   * _PRICE_CACHE_WRITE_PER_MTOK / 1_000_000) +
        (cache_read_tokens    * _PRICE_CACHE_READ_PER_MTOK  / 1_000_000)
    )


# ── Phase 4 Step 5.5.1: Quality Breaker 輕量化（使用者 74 號指示）──
# TDT 定位 = 24H AI 聊天直播、像張雅琴等真人政論的犀利風格、不需自我鎖死
# 黑名單只擋「絕對不適合任何聊天節目」的極端內容（性暴力 / 對未成年暴力）
# 其他靠 Step 4 prompt 規則 + Claude 自律就好
# 新聞 headline 本來就是真實新聞、針對「現象」討論、政論犀利都 OK
_QUALITY_BLOCK_PATTERNS = [
    # 性暴力（含未成年）— 純極端、無正常 commentary 用途
    "性侵", "強姦", "戀童", "性虐", "猥褻",
    # 對未成年的暴力
    "虐童",
]

# Fallback line 保留（極少觸發、但保險）
_QUALITY_FALLBACK_LINES = [
    "說真的、這事看下去蠻有意思的、要繼續觀察。",
    "你看、這現象其實年年都這樣演、不意外。",
    "問題就在這、十年前是這樣、十年後還是這樣。",
    "我跟你講喔、這種事看新聞看到都麻木了。",
]


def _quality_check_line(text: str) -> tuple[str, bool]:
    """檢查單句、若命中危險字 → 替換為 safe fallback。
    回傳 (text_or_safe_line, was_blocked)
    """
    if not text:
        return text, False
    for pat in _QUALITY_BLOCK_PATTERNS:
        if pat in text:
            print(f"[quality] blocked pattern '{pat}' in: {text[:60]}")
            _log_observe("quality_hit", pattern=pat, original=text[:120])
            return random.choice(_QUALITY_FALLBACK_LINES), True
    return text, False


def _quality_check_dialogue(dialogue: list) -> tuple[list, int]:
    """掃整輪 dialogue、回傳 (clean_dialogue, blocked_count)"""
    if not isinstance(dialogue, list):
        return dialogue, 0
    blocked_count = 0
    clean = []
    for line in dialogue:
        if not isinstance(line, dict):
            clean.append(line)
            continue
        text = line.get("text", "")
        safe_text, blocked = _quality_check_line(text)
        if blocked:
            blocked_count += 1
            line = dict(line)
            line["text"] = safe_text
        clean.append(line)
    return clean, blocked_count


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


def _build_news_url(section: str) -> str:
    """依 section 形態組 RSS URL。
    "" → top stories；"geo/XXX" → 地理區段；其他 → topic 區段。
    """
    if not section:
        return f"{_GOOGLE_NEWS_TW_BASE}{_GOOGLE_NEWS_TW_TAIL}"
    if section.startswith("geo/"):
        return f"{_GOOGLE_NEWS_TW_BASE}/headlines/section/{section}{_GOOGLE_NEWS_TW_TAIL}"
    return f"{_GOOGLE_NEWS_TW_BASE}/headlines/section/topic/{section}{_GOOGLE_NEWS_TW_TAIL}"


# ── 層二：實體歧義規則表 ──────────────────────────────────────────
# surface = RSS 標題中的短形式；require_any = 上下文需命中至少 1 個關鍵字才套用
_ENTITY_RULES: list[dict] = [
    {
        'surface': '高市',
        'canonical': '高市早苗（日本政治人物）',
        'require_any': ['日本', '首相', '自民黨', 'LDP', '日系', '外務省', '參議院', 'Takaichi'],
    },
    {
        'surface': '高市',
        'canonical': '高雄市',
        'require_any': ['高雄', '市長', '陳其邁', '南台灣', '地方政府'],
    },
    {
        'surface': '荷',
        'canonical': '荷莫茲海峽',
        'require_any': ['伊朗', '波斯灣', '石油', '船隻', '海峽', '波灣', '中東'],
    },
    {
        'surface': '賴',
        'canonical': '賴清德（台灣總統）',
        'require_any': ['總統', '民進黨', '府', '兩岸', '執政'],
    },
    {
        'surface': '侯',
        'canonical': '侯友宜（新北市長）',
        'require_any': ['新北', '市長', '國民黨', '候選人', '警察'],
    },
    {
        'surface': '柯',
        'canonical': '柯文哲（民眾黨）',
        'require_any': ['民眾黨', '台北', '北市', '市長', '司法', '京華城'],
    },
]
_AMBIGUOUS_SURFACES: set[str] = {r['surface'] for r in _ENTITY_RULES}


def _disambiguate_title(title: str, context: str = '') -> str:
    """層二：根據 context 替換標題中的歧義短詞。
    context = RSS description 文字 + 層三 og 內容。
    命中 → 替換成 canonical；無法判斷 → 加【?】標記讓 Claude 不猜測。
    """
    full = title + ' ' + context
    result = title
    for surface in _AMBIGUOUS_SURFACES:
        if surface not in result:
            continue
        candidates = [r for r in _ENTITY_RULES if r['surface'] == surface]
        best, best_score = None, 0
        for c in candidates:
            score = sum(1 for kw in c['require_any'] if kw in full)
            if score > best_score:
                best_score, best = score, c
        if best and best_score >= 1:
            result = result.replace(surface, best['canonical'])
            print(f"[disambig] '{surface}' → '{best['canonical']}' (score={best_score})")
        else:
            result = result.replace(surface, f'{surface}【?含義不明，請勿推測】')
            print(f"[disambig] '{surface}' 無上下文 → 標記歧義")
    return result


def _fetch_og_context(url: str) -> str:
    """層三：抓原始文章的 og:title + og:description。
    只讀前 32KB、失敗回 ''、不 raise。
    """
    try:
        req = urllib.request.Request(
            url, headers={'User-Agent': 'Mozilla/5.0 (TDT-WWT/1.0)'}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read(32768).decode('utf-8', errors='ignore')
        parts: list[str] = []
        for prop in ('og:title', 'og:description'):
            # 支援兩種屬性順序
            m = re.search(
                rf'<meta[^>]+property=["\']{{prop}}["\'][^>]+content=["\']([^"\']+)',
                html,
            ) or re.search(
                rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']{{prop}}["\']',
                html,
            )
            if m:
                parts.append(m.group(1))
        return ' '.join(parts)
    except Exception as e:
        print(f"[disambig] og fetch failed: {e}")
        return ''


def _fetch_one_yahoo(label: str, section: str, per_limit: int) -> list[tuple[str, str, str]]:
    """抓一個 Yahoo News TW section 的 RSS。
    Yahoo title 不像 Google 帶 " - 媒體名"、保險仍 rsplit 處理。
    失敗回 []、不 raise。
    """
    url = f"{_YAHOO_NEWS_BASE}{section}"
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0 (TDT-WWT/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            xml_bytes = resp.read()
        root = ET.fromstring(xml_bytes)
        items = root.findall(".//item")
        results: list[tuple[str, str, str]] = []
        for item in items[: per_limit * 2]:
            title_el = item.find("title")
            if title_el is None or not title_el.text:
                continue
            raw = title_el.text.strip()
            cleaned = raw.rsplit(" - ", 1)[0].strip()
            if len(cleaned) < 6:
                continue
            link_el  = item.find("link")
            desc_el  = item.find("description")
            link_url = (link_el.text or '').strip() if link_el is not None else ''
            desc_raw = (desc_el.text or '') if desc_el is not None else ''
            snippet  = re.sub(r'<[^>]+>', ' ', desc_raw)[:300]
            results.append((cleaned, link_url, snippet))
            if len(results) >= per_limit:
                break
        return results
    except Exception as e:
        print(f"[news] yahoo '{label}' failed: {e}")
        return []


def _fetch_one_section(label: str, section: str, per_limit: int) -> list[tuple[str, str, str]]:
    """抓一個 Google News section 的 RSS。
    回傳 list[(title, link_url, rss_snippet)]。
    失敗回 []、不 raise。
    """
    url = _build_news_url(section)
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (TDT-WWT/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            xml_bytes = resp.read()
        root = ET.fromstring(xml_bytes)
        items = root.findall(".//item")
        results: list[tuple[str, str, str]] = []
        for item in items[: per_limit * 2]:
            title_el = item.find("title")
            if title_el is None or not title_el.text:
                continue
            raw = title_el.text.strip()
            cleaned = raw.rsplit(" - ", 1)[0].strip()
            if len(cleaned) < 6:
                continue
            link_el  = item.find("link")
            desc_el  = item.find("description")
            link_url = (link_el.text or '').strip() if link_el is not None else ''
            desc_raw = (desc_el.text or '') if desc_el is not None else ''
            snippet  = re.sub(r'<[^>]+>', ' ', desc_raw)[:300]  # 去 HTML tag、截 300 字
            results.append((cleaned, link_url, snippet))
            if len(results) >= per_limit:
                break
        return results
    except Exception as e:
        print(f"[news] fetch '{label}/{section or 'top'}' failed: {e}")
        return []


def fetch_news_topics(limit: int = _NEWS_FETCH_LIMIT) -> list[str]:
    """從 Google News Taiwan 多個分類抓即時頭條、合併 + dedupe 回傳乾淨 headline list。

    用 stdlib（urllib + xml.etree）、不引入新依賴。
    分類：焦點 / 台灣 / 國際 / 當地 / 商業 / 科學與科技 / 娛樂 / 體育 / 健康
    一個 label 底下可能對應多個 section（例如 科學與科技）、會合併。
    全部失敗回 []、不 raise、不影響服務啟動。
    """
    all_tuples: list[tuple[str, str, str]] = []  # (title, url, snippet)
    seen: set[str] = set()
    breakdown: list[str] = []
    raw_per_section = max(_PER_CATEGORY_LIMIT * 2, 6)
    for label, sections in _NEWS_CATEGORIES:
        cat_pool: list[tuple[str, str, str]] = []
        # Source 1: Google News（多 section 可合併）
        for section in sections:
            cat_pool.extend(_fetch_one_section(label, section, raw_per_section))
        google_count = len(cat_pool)
        # Source 2: Yahoo News TW（Step 5.27、補 Google 夜間稀疏）
        yahoo_section = _YAHOO_NEWS_SECTIONS.get(label)
        if yahoo_section is not None:
            cat_pool.extend(_fetch_one_yahoo(label, yahoo_section, raw_per_section))
        yahoo_count = len(cat_pool) - google_count
        random.shuffle(cat_pool)
        new_in_cat = 0
        for tup in cat_pool:
            title = tup[0]
            if title in seen:
                continue
            seen.add(title)
            all_tuples.append(tup)
            new_in_cat += 1
            if new_in_cat >= _PER_CATEGORY_LIMIT or len(all_tuples) >= limit:
                break
        breakdown.append(f"{label}={new_in_cat}(g{google_count}+y{yahoo_count})")
        if len(all_tuples) >= limit:
            break
    if breakdown:
        print(f"[news] fetched by category → {', '.join(breakdown)} | total={len(all_tuples)}")

    # 層二：用 RSS snippet 做歧義詞消解
    all_headlines: list[str] = []
    for title, url, snippet in all_tuples:
        disambig = _disambiguate_title(title, context=snippet)
        all_headlines.append(disambig)

    # 把帶 url 的資料暫存、供 _news_refresh_loop 層三使用
    global _pending_og_enrichment
    _pending_og_enrichment = [(h, t[1]) for h, t in zip(all_headlines, all_tuples)]

    return all_headlines


def _push_recent_topic(t: str) -> None:
    """Phase 4 Step 5.7: 紀錄最近用過的 topic、給 rotate 排除用。"""
    global _recent_topics_history
    t = (t or "").strip()
    if not t:
        return
    if t in _recent_topics_history:
        _recent_topics_history.remove(t)  # 提到最新位置
    _recent_topics_history.append(t)
    if len(_recent_topics_history) > _RECENT_TOPICS_LIMIT:
        _recent_topics_history = _recent_topics_history[-_RECENT_TOPICS_LIMIT:]


def _pick_fresh_topic(current_topic: str, also_exclude: set | None = None) -> str:
    """從 cache 選一個避開最近 N 個用過的 topic + 額外 exclude set、再隨機抽。
    放寬順序：避最近+額外 → 只避當前+額外 → 只避額外 → 隨便挑。
    """
    if not _news_topics_cache:
        return ""
    extra = also_exclude or set()
    recent_set = set(_recent_topics_history) | extra
    candidates = [h for h in _news_topics_cache if h not in recent_set]
    if not candidates:
        ban = {current_topic} | extra if current_topic else set(extra)
        candidates = [h for h in _news_topics_cache if h not in ban]
    if not candidates:
        candidates = [h for h in _news_topics_cache if h not in extra]
    if not candidates:
        candidates = _news_topics_cache
    return random.choice(candidates)


def _refill_topic_queue() -> int:
    """補滿 _topic_queue 到 _TOPIC_QUEUE_TARGET、回傳實際補了幾個。
    候選排除：當前 topic + recent_history + 已在 queue 的。
    cache 太空 → 補不滿就停（下次 cache refresh 後會再補）。
    """
    global _topic_queue
    if not _news_topics_cache:
        return 0
    added = 0
    safety = 8  # 避免死迴圈
    while len(_topic_queue) < _TOPIC_QUEUE_TARGET and safety > 0:
        safety -= 1
        try:
            current = str(_load_state().get("topic", "")).strip()
        except Exception:
            current = ""
        already = set(_topic_queue)
        chosen = _pick_fresh_topic(current, also_exclude=already)
        if not chosen or chosen in already:
            break
        _topic_queue.append(chosen)
        added += 1
    return added


def _pop_next_topic() -> str:
    """從 queue 拿下一棒、然後立即補滿、回傳 topic。queue 空 + cache 也空 → 回 ''。"""
    global _topic_queue
    if not _topic_queue:
        _refill_topic_queue()
    if not _topic_queue:
        return ""
    next_topic = _topic_queue.pop(0)
    _refill_topic_queue()  # 拿一個就補一個、永遠保持 target 個在線
    return next_topic


# ── Phase 3 Step 6.3：tone / angle queue helpers ────────────────
def _topic_key(topic: str) -> str:
    """topic 規範化 key、用來判斷是否換了話題。"""
    return (topic or "").strip()


def _reset_topic_queues_if_changed(topic: str) -> None:
    """topic 換了 → tone / angle queue 都歸零、之後 next_* 會重新 shuffle。"""
    global _current_topic_key, _tone_queue, _angle_queue
    key = _topic_key(topic)
    if key != _current_topic_key:
        _current_topic_key = key
        _tone_queue = []
        _angle_queue = []


def _next_tone_for_topic(topic: str) -> str:
    """從 tone shuffled queue 拿下一個、queue 空就 shuffle 一輪。
    同 topic 跑滿 8 輪內 tone 不重複（比純 random 穩）。
    """
    global _tone_queue
    _reset_topic_queues_if_changed(topic)
    if not _tone_queue:
        _tone_queue = _DIALOGUE_TONES[:]
        random.shuffle(_tone_queue)
    return _tone_queue.pop(0)


def _next_angle_for_topic(topic: str) -> str:
    """從 angle shuffled queue 拿下一個、queue 空就 shuffle 一輪。
    同 topic 8 輪內 angle 不重複、確保每輪切入角度都不同。
    """
    global _angle_queue
    _reset_topic_queues_if_changed(topic)
    if not _angle_queue:
        _angle_queue = _DIALOGUE_ANGLES[:]
        random.shuffle(_angle_queue)
    return _angle_queue.pop(0)


# ── Phase 3 Step 6.3：per-topic dialogue memory ─────────────────
def _load_dialogue_memory() -> dict:
    """從磁碟 load 對話記憶。失敗回空結構、不 raise。"""
    if not DIALOGUE_MEMORY_FILE.exists():
        return {"topic": "", "rounds": []}
    try:
        data = json.loads(DIALOGUE_MEMORY_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("rounds"), list):
            return {"topic": str(data.get("topic", "")), "rounds": data["rounds"]}
    except Exception as e:
        print(f"[memory] load failed: {e}")
    return {"topic": "", "rounds": []}


def _save_dialogue_memory(memory: dict) -> None:
    """覆寫對話記憶到磁碟。失敗印 log、不 raise。"""
    try:
        DIALOGUE_MEMORY_FILE.write_text(
            json.dumps(memory, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        print(f"[memory] save failed: {e}")


def _get_recent_dialogue_memory(topic: str) -> dict:
    """讀目前 topic 的最近 dialogue 記憶。若磁碟上的 topic 跟現在不同、回空。"""
    mem = _load_dialogue_memory()
    if _topic_key(mem.get("topic", "")) != _topic_key(topic):
        return {"topic": _topic_key(topic), "rounds": []}
    return mem


def _append_dialogue_memory(topic: str, tone: str, angle: str, dialogue: list[dict]) -> None:
    """把這一輪生成內容寫入 memory。
    - topic 換了 → 重置 rounds 從這一輪開始
    - 同 topic → append、保留最近 _DIALOGUE_MEMORY_MAX_ROUNDS 輪
    - 每行截斷至 _DIALOGUE_MEMORY_LINE_MAX_LEN 字、避免檔案無限長
    """
    try:
        mem = _load_dialogue_memory()
        cur_topic = _topic_key(topic)
        if _topic_key(mem.get("topic", "")) != cur_topic:
            mem = {"topic": cur_topic, "rounds": []}

        lines = []
        for line in dialogue or []:
            text = str(line.get("text", "")).strip()
            if not text:
                continue
            if len(text) > _DIALOGUE_MEMORY_LINE_MAX_LEN:
                text = text[:_DIALOGUE_MEMORY_LINE_MAX_LEN]
            lines.append(text)

        mem["rounds"].append({
            "at":    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "tone":  tone,
            "angle": angle,
            "lines": lines,
        })
        # 只保留最近 N 輪
        if len(mem["rounds"]) > _DIALOGUE_MEMORY_MAX_ROUNDS:
            mem["rounds"] = mem["rounds"][-_DIALOGUE_MEMORY_MAX_ROUNDS:]

        _save_dialogue_memory(mem)
    except Exception as e:
        print(f"[memory] append failed: {e}")


# ── Phase 3 Step 6.4：套用新聞 topic 到 state 的共用 helper ─────────
def _apply_news_topic(chosen: str, *, unlock: bool = False) -> dict:
    """把指定新聞標題寫入 state、同步 keywords / mode / activity / rounds 歸零。

    - 用 normalize_state 流程（透過 _load_state / _save_state）保證 schema 正確
    - keywords_locked=True 時保留手動 keywords、不覆寫
    - unlock=True 時把 topic_locked 設為 False（手動 `/api/news/rotate_topic` 用）
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
    prev_rounds = _current_topic_rounds
    _current_topic_rounds = 0
    _log_observe("topic_set", topic=chosen, prev_rounds=prev_rounds, unlock=unlock,
                 queue_size=len(_topic_queue), recent_size=len(_recent_topics_history))
    return st


async def _og_enrich_ambiguous(topics: list[str]) -> list[str]:
    """層三：只對仍有【?】標記的 title 抓原始 og context 再做一次消解。
    最多並行 5 個請求、每條 timeout 8 秒、不影響其他 title。
    """
    global _pending_og_enrichment
    pending = _pending_og_enrichment[:]
    _pending_og_enrichment = []

    if not pending:
        return topics

    result = list(topics)
    sem = asyncio.Semaphore(5)  # 最多 5 個並行

    async def enrich_one(idx: int, title: str, url: str):
        if '【?' not in title or not url:
            return
        async with sem:
            og_ctx = await asyncio.to_thread(_fetch_og_context, url)
        if not og_ctx:
            return
        enriched = _disambiguate_title(title, context=og_ctx)
        if enriched != title:
            result[idx] = enriched
            print(f"[disambig] 層三補強: {title!r} → {enriched!r}")

    ambiguous_idxs = [i for i, (h, _) in enumerate(pending) if '【?' in h]
    if ambiguous_idxs:
        print(f"[disambig] 層三：{len(ambiguous_idxs)} 條歧義標題發 og 請求")
        tasks = [
            enrich_one(i, pending[i][0], pending[i][1])
            for i in ambiguous_idxs
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    return result


async def _news_refresh_loop():
    """背景任務：每 N 分鐘刷新新聞快取。
    層二消解在 fetch_news_topics() 同步完成；層三 og 補強在這裡 async 執行。
    """
    global _news_topics_cache
    while True:
        try:
            topics = await asyncio.to_thread(fetch_news_topics)  # 層二在此完成
            if topics:
                topics = await _og_enrich_ambiguous(topics)       # 層三補強
                prev_set = set(_news_topics_cache)
                _news_topics_cache = topics
                _save_news_cache(topics)
                added = _refill_topic_queue()
                new_count = sum(1 for h in topics if h not in prev_set)
                print(f"[news] cache refreshed: {len(topics)} headlines（queue +{added}、剩 {len(_topic_queue)}）")
                _log_observe("news_refresh", total=len(topics), new_in_batch=new_count,
                             queue_refilled=added, queue_size=len(_topic_queue))
        except Exception as e:
            print(f"[news] refresh loop error: {e}")
        await asyncio.sleep(_NEWS_REFRESH_SEC)


async def _topic_rotate_loop():
    """背景任務：每 1 分鐘檢查、條件滿足就換 topic。

    Phase 3 Step 6.4：兩種觸發路徑
    - **Seed**：state.topic 為空、cache 有內容 → 立即 seed（不管 rounds 數、不管 locked）
      （沒 topic 沒什麼好保護的、locked 在這狀態無意義）
    - **Rotate**：state.topic 已有值 → 跑滿 _MIN_ROUNDS_PER_TOPIC 且 not locked 才換

    若 state.keywords_locked == True、保留手動 keywords、只換 topic。
    """
    await asyncio.sleep(15)  # 啟動後等 15 秒、讓 news cache 先有內容
    while True:
        try:
            if _news_topics_cache:
                st = _load_state()
                has_topic = bool(str(st.get("topic", "")).strip())
                should_seed   = not has_topic
                should_rotate = has_topic and _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC

                # seed 不受 topic_locked 限制（空 topic 沒什麼好保護的）
                if should_seed or (should_rotate and not st.get("topic_locked")):
                    # Phase 4 Step 5.10: 直接從 queue 取下一棒、永遠預備 2 個
                    chosen = _pop_next_topic()
                    if not chosen:
                        continue  # cache 全空、跳過這輪
                    _apply_news_topic(chosen, unlock=False)
                    _push_recent_topic(chosen)
                    if should_seed:
                        print(f"[news] seeded missing topic → {chosen}（queue 剩 {len(_topic_queue)}）")
                    else:
                        print(f"[news] rotated topic → {chosen}（前 topic 跑了 {_MIN_ROUNDS_PER_TOPIC}+ 輪、queue 剩 {len(_topic_queue)}）")
        except Exception as e:
            print(f"[news] rotate loop error: {e}")
        await asyncio.sleep(_TOPIC_ROTATE_CHECK_SEC)


@app.on_event("startup")
async def _startup_news_tasks():
    """啟動時：先 load 磁碟快取（立即可用）→ 背景去 fetch fresh RSS → seed first topic → 起兩個背景任務。
    若網路掛、靠磁碟上次的快取撐、不影響直播。

    Phase 3 Step 6.4：啟動完成後、如果 cache 有內容且 state.topic 為空、立即 seed 一條新聞當 topic、
    不再等 5 輪 chat（chat 沒 topic 也跑不出有意義內容、會卡住）。
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

    # 3. Phase 3 Step 6.4：啟動 seed first topic（如果 cache 有內容 + state 沒 topic）
    #    note: 啟動時 _save_state(_default_state()) 會把 topic 清空、所以正常情況都會 seed
    if _news_topics_cache:
        try:
            st = _load_state()
            has_topic = bool(str(st.get("topic", "")).strip())
            if not has_topic:
                chosen = random.choice(_news_topics_cache)
                _apply_news_topic(chosen, unlock=False)
                _push_recent_topic(chosen)
                print(f"[news] seeded initial topic → {chosen}")
            else:
                print(f"[news] state already has topic（{st.get('topic')}）、不 seed")
                _push_recent_topic(str(st.get("topic", "")))  # 接續上次 state、把它列入歷史
            # Phase 4 Step 5.10: 啟動完先把下一棒 queue 預備好
            added = _refill_topic_queue()
            print(f"[news] topic queue 初始化、預備 {added} 個下一棒")
        except Exception as e:
            print(f"[news] seed initial topic error: {e}")

    asyncio.create_task(_news_refresh_loop())
    asyncio.create_task(_topic_rotate_loop())


def _build_static_prompt() -> str:
    """Phase 4 Step 5.20: prompt 的「靜態」部分、每次呼叫都一樣的內容。

    放這裡：
    - 主持人設定（_CHARS 來源、穩定）
    - 8 種 tone 模板表（全部列出、給 Claude 對應）
    - 生成規則、事實基底、emotion 表、輸出格式

    用 Anthropic prompt caching 緩存這段、後續 5 分鐘內呼叫只付 ~0.1x input cost。
    Haiku 4.5 cache 門檻 = 4096 tokens、此段約 4000-5000 tokens、應可命中。
    """
    aming_catch   = "、".join(_CHARS['aming']['catchphrases'])
    xiaomei_catch = "、".join(_CHARS['xiaomei']['catchphrases'])

    return f"""你是「晚晚嘴台灣 WWT」AI 鄉民談話台的對話生成器。

## 主持人設定

### 陳柏偉
- 個性：{_CHARS['aming']['personality']}
- 常用語：{aming_catch}
- 風格：3Q 陳柏惟風 — 熱血議論派、草根直率、敢嗆但不指控個人、Podcast 鋪線者；常用語穿插對白、不能整句口頭禪

### 王于安
- 個性：{_CHARS['xiaomei']['personality']}
- 常用語：{xiaomei_catch}
- 風格：王乃伃式 — 主播底子但有網感、犀利直率、會用時事梗 / 迷因接球、Podcast 控場（先讓陳柏偉說、再進去吐槽 / 收線 / 畫重點）、用「我也是觀眾」的參與感取代權威感、不端著敢自嘲；常用語穿插對白、不能整句口頭禪

## 對話節奏（8 種 tone 對照表、本輪 tone 在動態區指定）

- **debate**：陳柏偉先說觀點，王于安反嗆，陳柏偉再補充或認輸。共 3 句。觀點針對『現象/制度/規律』、不針對個人或政黨。
- **react**：王于安先提問，陳柏偉認真分析（1-2 句），王于安一句吐槽收尾。共 3-4 句。分析基於新聞事實、不臆測動機。
- **monologue**：陳柏偉連說 2 句分析，王于安一句簡短回應結尾。共 3 句。
- **casual**：隨機誰先說都行，輕鬆閒聊，3 句。
- **critical**：兩人輪流批評 topic 的『結構問題 / 制度設計 / 套路』、用『問題在...』『重點是...』『應該要...』，3-4 句。❌ 不要批評特定人 / 政黨 / 公司、❌ 不要說『誰一定有問題』。✅ 批評現象本身、批評年年炸的規律。
- **mocking**：兩人輪流嘲笑 topic 的『荒謬處 / 套路 / 重複歷史』、用『真的假的』『靠夭喔』『甘有可能』語氣，3-4 句。❌ 不嘲笑個人 / 政黨 / 受害者。✅ 嘲笑現象 / 規律 / 制度的荒謬。
- **humorous**：兩人用幽默梗 / 玩笑話討論 topic 現象、輕鬆有趣不失分析、3-4 句。❌ 不開特定人玩笑、❌ 不開政治玩笑。✅ 開現象 / 套路 / 結構的玩笑。
- **sarcastic**：兩人用反諷語氣（『以前不是這樣』『不意外』『所以呢』『唉』），表面平靜實則在嘴 topic 的『規律 / 結構 / 套路』，3-4 句。❌ 不反諷特定人 / 政黨。✅ 反諷『十年前就這樣演、十年後還是這樣』、『制度設計問題』。

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

### 🛡️ 事實基底 + 活潑風格（最重要、違反就是失敗的輸出）

這是 24H 直播能不能播給公眾看的關鍵規則。

#### 語氣維度（這些都可以、要的就是這個）
- ✅ 詼諧、諷刺、嘲諷、批評現象、嘲笑荒謬
- ✅ 鄉民口語、有溫度有看法、有梗
- ✅ 像脫口秀主持人在電視棚口頭討論時事

#### 內容維度（嚴格區分「事實」vs「臆測」）
- ✅ 只引用 topic 跟相關關鍵字裡**實際出現的事實**
- ✅ 對「現象 / 結構 / 規律 / 套路」可以諷刺批評
- ❌ **不替任何政黨 / 政府 / 公司 / 個人下道德判斷**
- ❌ **不添加新聞沒提到的指控或陰謀論**
- ❌ **不說「OO 一定是收錢」「OO 就是要 XX」這種臆測**
- ❌ **不替任何訴訟未定的案件下有罪推定**
- ❌ **不在兩岸 / 統獨 / 藍綠議題站隊**
- ❌ **不用「聽說」「網友爆料」「網路盛傳」「有人說」「據傳」這種包裝過的指控**
  （把未證實的事用「聽說」開頭並不會讓它變成可以說的事實）

#### 諷刺方向（區分「諷刺現象」vs「指控個人」）

❌ 不要這樣（指控特定人 / 政黨）：
- 「政府爛、政策失敗」← 指控政府
- 「XXX 又踩雷」← 點名特定政治人物
- 「執政黨從不認錯」← 政黨指控
- 「中油又在搶錢」← 公司指控
- 「OO 一定是收了錢」← 陰謀論

✅ 改成這樣（諷刺現象 / 結構）：
- 「這個結構年年炸、修了又修還是漏水」
- 「政策上路一週就翻車、紀錄保持中」
- 「不意外、十年前就這樣演、十年後還是這樣」
- 「油價一漲、物價就跟著漲、消費者最後買單」
- 「制度設計本身就有問題、誰來都一樣」

#### 邊界判定（不確定就走保守）
- 新聞裡明寫的事 → 可以引用
- 新聞沒寫但你「覺得」的事 → 不要說
- 對「人」的評價 → 不要說
- 對「現象 / 趨勢 / 制度」的評價 → 可以說

#### 涉及實際傷害事件時（傷亡 / 受害者 / 嚴重後果、最重要）

只要 topic 涉及「死亡 / 受傷 / 受害 / 災難 / 嚴重損失」、語氣立刻要重新校準：

- ✅ **先承認傷害是真實的、再進制度討論**
- ✅ 至少 1 句話讓觀眾感覺到「這是嚴重的事」、不是抽象政策辯論
- ✅ 制度檢討時、保留對受害者的同理心（「家屬肯定希望嚴罰、執行面該怎麼做才不誤傷」這類）
- ❌ **不要用「不意外」「以前就這樣」「只是 XX 而已」「套路」這種輕飄對比、會貶低真實受害**
- ❌ **不要把焦點從受害者轉到「歷史比對 / 政治攻防 / 法理辯論」**、即使你接著要批評制度
- ❌ 不要諷刺受害者本人或家屬
- ❌ 不要拿傷亡事件當笑話或開玩笑材料

##### 對照範例（topic = 毒駕加重罰則、實際有傷亡）

❌ 失真寫法（只談制度、忽略傷害）：
- 「以前毒駕就只是罰錢吊照、現在連沒開車都要吊銷？」← 把舊罰則說成「只是」、貶低過去受害者
- 「靠夭喔！同車乘客也一起罰？這根本在罰認識吸毒的人」← 框成連坐、忽略毒駕傷亡的源頭

✅ 平衡寫法（先承認傷害、再進制度）：
- 「毒駕傷亡這幾年真的越來越多、新法把吸毒跟駕照綁、是想從源頭擋。」
- 「同車乘客一起罰、法理會有爭議、執行面要怎麼設計才不誤傷一般人、是真議題。」
- 「受害者家屬肯定希望嚴罰、但邊界該畫在哪、值得慢慢談。」

##### 對照範例（topic = 性犯罪 / 虐童 / 兒少議題）

質量守門線已經擋掉黑名單詞。即使新聞標題沒命中、語氣也要：
- ✅ 同情受害者、批評制度漏洞
- ❌ 不開玩笑、不諷刺受害者、不檢討受害者行為

### 🔤 專有名詞 / 縮寫處理（RSS 標題截斷防呆）

Google News RSS 標題常被截斷、2 字縮寫可能有多重含義：

- ❌ **不要**看到「高市」就當成高雄市、看到「荷」就當成荷蘭
- ✅ 若 topic 已標注「高市早苗（日本政治人物）」→ 直接用全名討論
- ✅ 若 topic 標注【?含義不明，請勿推測】→ 改說「新聞裡提到的這件事」、不猜身分
- ✅ 只引用 topic 文字裡**明確出現**的事實、不補充標題沒寫的背景

### 內容限制
- 政治人身攻擊、宗教歧視、種族歧視、死亡案件、未成年、性侵、個資、誹謗、未證實指控、犯罪定罪判斷一律禁止

## 🚨 引用規則（discussion mode 用、本輪 mode = discussion 才生效）

- **每 3 句對白至少要有一次**明確提到 topic 或上方關鍵字、或具體引用 topic 背景
- 對白主體必須圍繞此話題、絕不能變成跟 topic 無關的閒聊
- 對白要有實質內容（具體看法、引述、吐槽 topic 細節），不是空泛感嘆
- **諷刺/批評針對『現象 / 結構 / 規律』、不針對特定人或政黨**（見上方事實基底規則）

### 引用範例（topic='油價飆漲'）

  ✅ 陳柏偉：油價一漲、物價就跟著漲、消費者最後買單。（諷刺現象）
  ✅ 王于安：所以呢？凍漲只是把問題往後推啊。（諷刺套路）
  ✅ 陳柏偉：這個結構年年炸、修了又修還是漏水。（諷刺制度）
  ❌ 陳柏偉：中油又在搶錢、政府放任不管。（指控特定公司+政府）
  ❌ 王于安：執政黨從不認錯。（指控特定政黨）
  ❌ 陳柏偉：以前不是這樣。（沒提油價、沒實質內容）

### 額外失敗對白範例（不要這樣寫）

- ❌「政府應該負責」← 太抽象、沒提現象
- ❌「這就是台灣的悲哀」← 沒引述 topic、純情緒
- ❌「OO 一定是想 XX」← 臆測動機
- ❌「我跟你講喔」← 純口頭禪、沒實質
- ❌「不意外啦」← 短語、沒延伸觀察

### 成功對白特徵

- 1 句 20-40 字
- 第一個 7 字之內出現具體名詞（topic / 關鍵字）
- 句中至少 1 個觀察點（現象 / 比喻 / 數字 / 規律）
- 句尾自然口語結束（不用句號接論述）
- 整輪有「鋪墊 → 收線」起伏、不全平調

## 表情 / 情緒（emotion 欄位、兩位主持人都要填）

每句 JSON 必須帶 `emotion` 欄位、值從各自的清單挑一個。

### 王于安 emotion（12 種）

| emotion | 王乃伃式使用時機 |
|---|---|
| `surprised` | 「不會吧」、「真的假的」、聽到爆料、新聞反轉、誇張反應、被嚇到 |
| `skeptical` | 質疑、懷疑、追問動機、「所以呢？」、挑眉式吐槽 |
| `smile` | 自嘲、輕鬆吐槽、認同對方梗、聊天室式溫和 |
| `thinking` | 整理觀點、要畫重點前、Podcast 式收線 |
| `talk` | 一般敘述、轉場、報新聞主軸 |
| `wave` | 開場打招呼、跟觀眾互動、收場 CTA |
| `angry` | 怒嗆、義憤填膺、「太誇張了吧」、看不下去 |
| `laughing` | 大笑、真的覺得好笑到爆、笑到瞇眼 |
| `sad` | 失望、「真的不行了」、對社會 / 來賓無奈 |
| `relieved` | 「還好還好」、危機過、新聞反轉變好 |
| `cheering` | 「加油」「大家撐住」、鼓勵觀眾 / 來賓 |
| `idle` | 不說話時用（不會輸出）|

王于安挑選原則：
- 一輪對話內 emotion 要**有起伏**、不要每句都 talk
- 「網感反應 → 整理 → 收線」三段式：surprised → thinking → smile/skeptical
- 角度激烈時用 angry / sad、化解時用 relieved / laughing / cheering

### 3Q 陳柏惟 emotion（17 種）

| emotion | 3Q 式使用時機 |
|---|---|
| `idle` | 待機、等對方說完、還沒進入狀態 |
| `passionate` | 熱血說話、帶動氣氛、說到自己最在乎的議題、情緒上升中 |
| `combat` | 正面交鋒、反駁對方、進入辯論模式、「你嘛幫幫忙」 |
| `excited` | 聽到好消息、完全認同、忍不住鼓掌、高興過頭 |
| `humor` | 自嘲、幽默化解、說了個梗、「靠夭喔」帶笑意 |
| `sincere` | 感謝支持者、說到真心話、認真拜託大家、低頭致謝 |
| `resilient` | 被攻擊後堅守立場、「沒關係我繼續」、逆風仍站穩 |
| `angry` | 義憤填膺、看不下去、大聲批評不公義、情緒直接外顯 |
| `speech` | 對觀眾總結發言、呼籲行動、演說收尾、「3Q 大家」 |
| `thinking` | 分析制度成因、討論模式、「我來想一下喔」、托下巴沉思 |
| `mocking` | 諷刺現象、嘲諷政策荒謬、單邊冷笑、「你嘛幫幫忙」帶酸 |
| `sympathy` | **涉及真實傷害題必備**、承認傷亡嚴重、不嘲弄當事人、凝重 |
| `surprised` | 反應頭條、意外消息、「真的假的」、瞪大眼睛 |
| `explain` | monologue 解釋政策邏輯、攤手比劃、「事情是這樣啦」 |
| `mocking_laugh` | 嘲諷式爆笑收尾、punchline 完仰頭大笑 |
| `greeting` | 開場 / 整點換場、揮手或抱拳、「3Q 大家好」 |
| `disgusted` | 對荒謬政策、行為的不屑反應、揮手推遠 |

3Q 挑選原則：
- 核心比例：passionate 最常用（30%）、combat 次之（20%）、mocking + explain + thinking 加總 30%
- 「熱情開場 → 衝突交鋒 → 幽默或誠懇收線」三段式：passionate/greeting → combat/mocking → humor/sincere/mocking_laugh
- 遇到不公義直接 angry / disgusted、勝利時刻用 excited、逆境用 resilient
- 結尾常用 speech 或 sincere 或 mocking_laugh 帶 CTA 感
- 分析題用 thinking → explain 組合、討論制度
- **涉及真實傷害（傷亡、受害者、家屬）必須先用 sympathy** 承認嚴重再進制度討論
- **不要每句都 passionate**、要有情緒起伏

## 輸出格式

只輸出 JSON 陣列、不要任何其他文字、不要 markdown code fence。

每行有兩種寫法：

**A. 單一 emotion**（整句一個情緒）：
```
{{"speaker": "aming", "text": "你看油價又漲了", "emotion": "talk"}}
```

**B. 多 emotion 陣列**（一句內按標點分段、每段一個情緒）：
```
{{"speaker": "xiaomei", "text": "不會吧！這也太誇張。所以呢？", "emotions": ["surprised", "skeptical", "thinking"]}}
```

**建議優先用 B**、給字幕跟表情一起切的戲劇感：
- 句子用「，。！？、；：」分段
- emotions 陣列長度 = 標點分段後的句數（前端會 idx % length 容錯）
- 3Q 和王于安都要用 emotions 陣列、讓前端能逐句切換表情

完整範例：
[
  {{"speaker": "aming", "text": "這個結構年年炸、靠夭喔。說真的啦、問題就在這裡！", "emotions": ["humor", "angry"]}},
  {{"speaker": "xiaomei", "text": "不會吧！這也太誇張。所以呢、政府要做什麼？", "emotions": ["surprised", "skeptical", "thinking"]}}
]"""


def _build_dynamic_prompt(state: dict, turn_type: str,
                          angle: str = "", recent_memory: dict | None = None) -> str:
    """Phase 4 Step 5.20: prompt 的「動態」部分、每次呼叫不同的內容。

    放這裡：
    - topic / keywords（每 2 輪換）
    - 本輪 tone（從靜態表挑一個）
    - angle（每輪不同）
    - cite_rule（依 mode）
    - anti_repeat（最近 20 句、每次都不一樣）

    這段不 cache、每次算全價 input。

    Phase 2E Task 5：Topic Driven
    Phase 3 Step 6.3：加入 angle 切入指引 + 「最近已講過、請避開」反重複區塊
    """

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

        # Step 5.20: discussion mode 的 cite_rule 已搬進 static prompt（cache 友好）
        # 這裡只標註本輪 mode、Claude 看靜態 cite_rule 即可
        cite_rule = "## 本輪 mode = discussion（請套用靜態 prompt 中的「引用規則」段落）"
    else:
        casual = random.choice(_CASUAL_TOPICS)
        topic_block = f"## 閒聊話題（沒設定正式 topic、輕鬆聊）\n{casual}"
        cite_rule = "## 引用規則\n- 話題輕鬆即可、不強制深度引用，但對白仍要有具體內容、不是空泛口頭禪。"

    # 8 種 tone 模板已移到 _build_static_prompt()（cache 命中、省 input cost）
    # 這裡只指定本輪用哪個 tone、靜態區的對照表會生效

    # ── Phase 3 Step 6.3：本輪 angle 區塊（從不同角度切入、不重複前幾輪角度）─
    if angle and angle in _ANGLE_NOTES:
        angle_block = (
            "## 🎯 本輪切入角度（嚴格遵守）\n"
            f"- angle = `{angle}`\n"
            f"- 切入指引：{_ANGLE_NOTES[angle]}\n"
            "- 本輪內容必須鎖死在這個角度切入、不要混進其他角度。\n"
        )
    else:
        angle_block = ""

    # ── Phase 3 Step 6.3 / Phase 4 強化：反重複區塊 ──
    anti_repeat_block = ""
    if recent_memory and isinstance(recent_memory.get("rounds"), list) and recent_memory["rounds"]:
        recent_rounds = recent_memory["rounds"][-_DIALOGUE_MEMORY_MAX_ROUNDS:]
        recent_tones  = [r.get("tone", "")  for r in recent_rounds if r.get("tone")]
        recent_angles = [r.get("angle", "") for r in recent_rounds if r.get("angle")]
        # Phase 4: 攤平 lines、最多取最近 20 句（之前 10 太少、容易重複）
        recent_lines: list[str] = []
        for r in recent_rounds:
            for ln in r.get("lines", []) or []:
                if ln:
                    recent_lines.append(str(ln))
        recent_lines = recent_lines[-20:]

        # Phase 4: 抓最近台詞的「開場 7 字」當禁用清單、比抽象規則更具體
        recent_openings = []
        seen_open = set()
        for ln in reversed(recent_lines[-12:]):  # 取最後 12 句、近距離反重複
            head = ln[:7].strip()
            if head and head not in seen_open:
                seen_open.add(head)
                recent_openings.append(head)
        recent_openings = recent_openings[:8]  # 最多列 8 個禁用開場

        bullet_lines = "\n".join(f"  - 「{ln}」" for ln in recent_lines) if recent_lines else "  - （尚無）"
        opening_ban_lines = "\n".join(f"  - 「{o}」" for o in recent_openings) if recent_openings else "  - （尚無）"

        anti_repeat_block = (
            "## 🚫🚫🚫 反重複規則（最最最重要、違反就是失敗的輸出）🚫🚫🚫\n"
            f"- 最近 tone（不要再用同一個）：{', '.join(recent_tones) if recent_tones else '（尚無）'}\n"
            f"- 最近 angle（不要再用同一個）：{', '.join(recent_angles) if recent_angles else '（尚無）'}\n"
            "\n### ⛔ 本輪**絕對不可以**用以下開場（最近用過、用了就是失敗）：\n"
            f"{opening_ban_lines}\n"
            "\n### 最近台詞（**不可重複任何一句的開場 / 結尾 / 用詞 / punchline**）：\n"
            f"{bullet_lines}\n"
            "\n### 嚴格規則\n"
            "- ❌ 不要重複上面任何句子的開場詞（即使整句不同、開頭相同也算失敗）\n"
            "- ❌ 不要重複上面任何句子的句尾結構\n"
            "- ❌ 不要重複同一個 punchline\n"
            "- ❌ 不要「換句話說」同一個觀點（要推進新角度）\n"
            "- ❌ 不要把上一輪的話用同義詞改寫\n"
            "- ✅ 本輪用**完全不同的開場詞**\n"
            "- ✅ 本輪換新觀察 / 新比喻 / 新切入角度\n"
            "- ✅ 跟上面台詞比、必須要有「看就知道是新一輪」的感覺\n"
        )

    return f"""## 🎬 本輪設定（動態、每次不同）

{topic_block}

{angle_block}## 對話節奏（本輪指定）
**tone = `{turn_type}`** — 對照靜態區的 8 種 tone 表、按該 tone 寫對白。

{cite_rule}

{anti_repeat_block}"""


# ── TTS helpers ───────────────────────────────────────────────────
def _tts_cache_path(speaker: str, text: str) -> Path:
    import hashlib
    key = f"{speaker}:{text}"
    h = hashlib.md5(key.encode("utf-8")).hexdigest()
    return TTS_DIR / f"{h}.mp3"


def _patch_tts_ssl() -> None:
    """雲端環境有 self-signed proxy、patch edge_tts 的 SSL context 跳過驗證。只執行一次。"""
    try:
        import ssl
        import edge_tts.communicate as et_comm
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        et_comm._SSL_CTX = ctx
    except Exception:
        pass


_tts_ssl_patched = False


async def _gen_tts_line(speaker: str, text: str) -> str | None:
    """生成單句 TTS mp3、命中快取直接回 url。
    失敗回 None、不 raise。
    """
    global _tts_ssl_patched
    try:
        import edge_tts
    except ImportError:
        return None
    if not _tts_ssl_patched:
        _patch_tts_ssl()
        _tts_ssl_patched = True
    voice = _TTS_VOICES.get(speaker)
    if not voice or not text:
        return None
    cache = _tts_cache_path(speaker, text)
    if not cache.exists():
        try:
            rate = _TTS_RATE.get(speaker, "+0%")
            communicate = edge_tts.Communicate(text, voice, rate=rate)
            await communicate.save(str(cache))
        except Exception as e:
            print(f"[tts] gen failed ({speaker}): {e}")
            return None
    return f"/tts/{cache.name}"


async def _gen_tts_dialogue(dialogue: list) -> list:
    """平行生成整輪對話的 TTS、回傳 audio_urls（與 dialogue 等長、失敗位置為 null）。"""
    tasks = [
        _gen_tts_line(
            line.get("speaker", "") if isinstance(line, dict) else "",
            line.get("text", "")    if isinstance(line, dict) else "",
        )
        for line in dialogue
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [None if isinstance(r, Exception) else r for r in results]


@app.post("/api/chat")
async def generate_chat():
    """讓陳柏偉與王于安用 Claude 生成鄉民對話"""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "ANTHROPIC_API_KEY not set"}, status_code=503)

    state     = _load_state()

    # Phase 4 Step 5: Cost Guard 入口檢查、超支立刻擋下、不打 Claude API
    over, reason = _check_budget(state)
    if over:
        usage = _get_cost_usage(state)
        print(f"[budget] BLOCKED: {reason}")
        return JSONResponse({
            "error": "over_budget",
            "reason": reason,
            "paused": True,
            "usage": usage,
            "limits": {
                "daily_usd":   _DAILY_BUDGET_USD,
                "monthly_usd": _MONTHLY_BUDGET_USD,
            },
        }, status_code=503)

    topic     = state.get("topic", "")
    # Phase 3 Step 6.3: tone / angle 都改用 per-topic shuffled queue（同 topic 8 輪內不重複）
    turn_type = _next_tone_for_topic(topic)
    angle     = _next_angle_for_topic(topic)
    # Phase 3 Step 6.3: 取得同 topic 最近 8 輪記憶、放進 prompt 提示 Claude 避開
    recent_memory = _get_recent_dialogue_memory(topic)
    # Phase 4 Step 5.20: prompt caching
    # 靜態部分（角色 / 規則 / emotion 表）放第一個 block + cache_control、5 分鐘 TTL
    # 動態部分（topic / angle / anti-repeat）放第二個 block、不 cache
    # 預期：cache hit 時 input cost ~75% off
    static_prompt  = _build_static_prompt()
    dynamic_prompt = _build_dynamic_prompt(state, turn_type, angle, recent_memory)

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        msg = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            # Phase 3 Step 6.6: 400 → 800、避免被截斷在字串中間導致 JSON 不完整
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": static_prompt,
                        "cache_control": {"type": "ephemeral"},
                    },
                    {
                        "type": "text",
                        "text": dynamic_prompt,
                    },
                ],
            }],
        )
        raw = msg.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        # Phase 3 Step 6.6: JSON 解析容錯
        # - 主解析失敗時印 raw 到 server console（除錯用）
        # - 嘗試擷取第一個 `[` 到最後一個 `]` 區段再 parse 一次
        # - 仍失敗才回 500、其他 Anthropic / network exception 走外層 except
        try:
            dialogue = json.loads(raw.strip())
        except json.JSONDecodeError as e:
            print(f"[chat] JSON parse failed: {e}")
            print(f"[chat] raw text preview: {raw[:800]}")
            start = raw.find("[")
            end   = raw.rfind("]")
            if start >= 0 and end > start:
                try:
                    dialogue = json.loads(raw[start:end + 1])
                except json.JSONDecodeError:
                    return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)
            else:
                return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)

        # Phase 4 Step 5.5: Lightweight Quality Breaker — 對白回傳前掃描、命中危險字替換
        dialogue, blocked_count = _quality_check_dialogue(dialogue)
        if blocked_count > 0:
            print(f"[quality] 替換掉 {blocked_count} 句 (本輪共 {len(dialogue)} 句)")

        # TTS：平行生成本輪所有台詞的語音（失敗不影響對話）
        audio_urls = await _gen_tts_dialogue(dialogue)
        tts_ok = sum(1 for u in audio_urls if u)
        print(f"[tts] 生成 {tts_ok}/{len(dialogue)} 句語音")

        # 更新 state：把最後對白存入 hosts + Step 5 累積 cost
        st = _load_state()
        for line in dialogue:
            spk = line.get("speaker")
            if spk in st.get("hosts", {}):
                st["hosts"][spk]["status"]      = "talking"
                st["hosts"][spk]["last_output"] = line["text"]
        st["updated_at"] = datetime.now().strftime("%H:%M:%S")

        # Phase 4 Step 5: 累積本次 API call 成本
        # Step 5.20: 加 cache tokens（cache_creation = write、cache_read = read）
        # 注意 input_tokens 是「沒被 cache 的部分」、不是 total
        usage_obj = getattr(msg, 'usage', None)
        input_tokens         = int(getattr(usage_obj, 'input_tokens', 0) or 0)
        output_tokens        = int(getattr(usage_obj, 'output_tokens', 0) or 0)
        cache_write_tokens   = int(getattr(usage_obj, 'cache_creation_input_tokens', 0) or 0)
        cache_read_tokens    = int(getattr(usage_obj, 'cache_read_input_tokens', 0) or 0)
        cost_usd = _estimate_cost_usd(input_tokens, output_tokens, cache_write_tokens, cache_read_tokens)
        usage_after = _add_cost_to_state(st, cost_usd)
        # cache hit ratio：cache_read / (cache_read + input_tokens)
        total_input_tokens = input_tokens + cache_write_tokens + cache_read_tokens
        cache_hit_pct = (cache_read_tokens / total_input_tokens * 100) if total_input_tokens else 0
        print(f"[cost] +${cost_usd:.5f} (in={input_tokens}/out={output_tokens} "
              f"cw={cache_write_tokens}/cr={cache_read_tokens} hit={cache_hit_pct:.0f}%) | "
              f"today ${usage_after['today']['amount_usd']:.3f}/${_DAILY_BUDGET_USD:.2f} | "
              f"month ${usage_after['month']['amount_usd']:.3f}/${_MONTHLY_BUDGET_USD:.2f}")

        _save_state(st)

        # Phase 3 Step 6: 同 topic 累積回合數、rotate loop 依此決定是否該換新話題
        global _current_topic_rounds
        _current_topic_rounds += 1

        # Phase 3 Step 6.3: 寫入這一輪 dialogue 到 memory（給下一輪做反重複參考）
        _append_dialogue_memory(topic, turn_type, angle, dialogue)

        # Phase 4 Step 5.11: 觀察日誌、記每輪對白關鍵指標（不含全文）
        # Phase 4 Step 5.18: 加 emotions_used（給王于安 emotion 分布統計用）
        first_words = ""
        emotions_used: list[str] = []
        if dialogue and isinstance(dialogue[0], dict):
            first_words = str(dialogue[0].get("text", ""))[:14]
        for line in dialogue:
            if not isinstance(line, dict):
                continue
            if line.get("speaker") != "xiaomei":
                continue  # 只記王于安、陳柏偉 emotion 暫沒接
            if isinstance(line.get("emotions"), list):
                emotions_used.extend(str(e) for e in line["emotions"])
            elif isinstance(line.get("emotion"), str):
                emotions_used.append(line["emotion"])
        # Phase 4 Step 5.28: 全文持久化、給 Shorts pipeline 之後用
        _append_dialogue_archive(topic, turn_type, angle,
                                 _current_topic_rounds, dialogue)

        _log_observe(
            "dialogue",
            topic=topic, tone=turn_type, angle=angle,
            round_num=_current_topic_rounds, line_count=len(dialogue),
            first_line_opener=first_words, quality_blocked=blocked_count,
            emotions_used=emotions_used,
            input_tokens=input_tokens, output_tokens=output_tokens,
            cache_write_tokens=cache_write_tokens,
            cache_read_tokens=cache_read_tokens,
            cost_usd=round(cost_usd, 6),
        )

        # speaker_a = 第一句說話的人；speaker_b = 另一人（走路目標）
        speaker_a = dialogue[0]["speaker"]
        speaker_b = next(
            (l["speaker"] for l in dialogue[1:] if l["speaker"] != speaker_a),
            None,
        )
        return {"dialogue": dialogue, "audio_urls": audio_urls,
                "speaker_a": speaker_a, "speaker_b": speaker_b,
                "tone": turn_type, "angle": angle,
                "topic": topic,  # Phase 4: 回傳 topic、給前端 prefetch 比對用
                "topic_round": _current_topic_rounds}

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


# ── Phase 3 Step 6.7: 暫停 / 恢復對話生成 ───────────────────────────
# ── Phase 4 Step 5: 預算查詢 / 重置 ───────────────────────
@app.get("/api/budget")
def get_budget():
    """取得當前預算用量。"""
    st = _load_state()
    usage = _get_cost_usage(st)
    over, reason = _check_budget(st)
    return {
        "usage": usage,
        "limits": {
            "daily_usd":   _DAILY_BUDGET_USD,
            "monthly_usd": _MONTHLY_BUDGET_USD,
        },
        "over_budget": over,
        "reason":      reason,
    }


@app.post("/api/budget/reset")
def reset_budget():
    """手動重置今日 + 本月用量（測試 / 異常處理用）。"""
    st = _load_state()
    st["cost_usage"] = {
        "today": {"date": datetime.now().strftime("%Y-%m-%d"), "amount_usd": 0.0},
        "month": {"month": datetime.now().strftime("%Y-%m"),    "amount_usd": 0.0},
    }
    _save_state(st)
    return {"ok": True, "cost_usage": st["cost_usage"]}


@app.post("/api/pause")
def pause_chat():
    """暫停新對話生成。當前播放的對話會完成、但不會 fetch 下一輪。
    保持 OBS 畫面不中斷、適合直播時讓觀眾喘口氣讀字幕。
    """
    st = _load_state()
    st["paused"] = True
    st["updated_at"] = datetime.now().strftime("%H:%M:%S")
    _save_state(st)
    return {"ok": True, "paused": True}


@app.post("/api/resume")
def resume_chat():
    """恢復對話生成。"""
    st = _load_state()
    st["paused"] = False
    st["updated_at"] = datetime.now().strftime("%H:%M:%S")
    _save_state(st)
    return {"ok": True, "paused": False}


@app.post("/api/now_speaking")
async def set_now_speaking(request: Request):
    """前端開始播某段對話時呼叫、告訴後端「角色現在正在講這個 topic」。
    LED 顯示讀 state.speaking_topic、避免 prefetch 造成「螢幕話題跑前面、角色還在講上一個」的錯位。
    Phase 4 Step 5.6: LED 跟對話同步。
    """
    data = await request.json()
    topic = str(data.get("topic", "")).strip()
    st = _load_state()
    st["speaking_topic"] = topic
    st["updated_at"] = datetime.now().strftime("%H:%M:%S")
    _save_state(st)
    return {"ok": True, "speaking_topic": topic}


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
    _push_recent_topic(topic)  # 手動設的 topic 也算近期、rotate 不會立刻抽回

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


@app.get("/api/topic_queue")
def get_topic_queue():
    """Phase 4 Step 5.10: 查目前預備好的下一棒 topics（debug 用）。"""
    return {
        "target":  _TOPIC_QUEUE_TARGET,
        "queue":   list(_topic_queue),
        "size":    len(_topic_queue),
        "cache_size":   len(_news_topics_cache),
        "recent_history": list(_recent_topics_history),
    }


@app.get("/api/observe/summary")
def get_observe_summary():
    """Phase 4 Step 5.11: 從 wwt_observe_log.jsonl 算 24H 觀察期關鍵指標。

    回傳：
    - dialogues / rotates / refreshes / quality_hits 件數
    - 總成本、平均每對話成本、推算 24/7 日成本
    - topic 出現次數 + 撞題 (出現 ≥ 2 次的 topic)
    - 開場詞重複（重複感的代理指標）
    - 同事件不同標題撞題（標題前 6 字相同）
    """
    if not OBSERVE_LOG_FILE.exists():
        return {"ok": False, "error": "no observe log yet"}
    events: list[dict] = []
    try:
        with open(OBSERVE_LOG_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(json.loads(line))
                except Exception:
                    continue
    except Exception as e:
        return {"ok": False, "error": f"read failed: {e}"}

    if not events:
        return {"ok": True, "events_total": 0}

    first_ts = events[0].get("ts", "")
    last_ts = events[-1].get("ts", "")

    dialogues = [e for e in events if e.get("event") == "dialogue"]
    rotates = [e for e in events if e.get("event") == "topic_set"]
    refreshes = [e for e in events if e.get("event") == "news_refresh"]
    quality_hits = [e for e in events if e.get("event") == "quality_hit"]

    # 成本
    total_cost = sum(float(d.get("cost_usd", 0)) for d in dialogues)
    avg_cost = (total_cost / len(dialogues)) if dialogues else 0.0

    # 推算 24/7 日成本（假設等速）
    elapsed_sec = 0
    if len(dialogues) >= 2:
        try:
            t0 = datetime.strptime(dialogues[0]["ts"], "%Y-%m-%d %H:%M:%S")
            t1 = datetime.strptime(dialogues[-1]["ts"], "%Y-%m-%d %H:%M:%S")
            elapsed_sec = max(int((t1 - t0).total_seconds()), 1)
        except Exception:
            elapsed_sec = 0
    projected_24h = (total_cost / elapsed_sec * 86400) if elapsed_sec > 0 else 0.0

    # Topic 撞題（同 topic 出現 ≥ 2 次）
    topic_counts: dict[str, int] = {}
    for r in rotates:
        t = str(r.get("topic", "")).strip()
        if not t:
            continue
        topic_counts[t] = topic_counts.get(t, 0) + 1
    collisions = {t: c for t, c in topic_counts.items() if c >= 2}

    # 同事件不同標題（前 6 字相同的 topic 視為同事件）
    prefix_groups: dict[str, list[str]] = {}
    for t in topic_counts.keys():
        key = t[:6]
        prefix_groups.setdefault(key, []).append(t)
    near_collisions = {k: v for k, v in prefix_groups.items() if len(v) >= 2}

    # 重複感代理：開場 7 字相同的對話次數
    opener_counts: dict[str, int] = {}
    for d in dialogues:
        opener = str(d.get("first_line_opener", "")).strip()
        if not opener:
            continue
        opener_counts[opener] = opener_counts.get(opener, 0) + 1
    repeated_openers = {o: c for o, c in opener_counts.items() if c >= 2}

    # Phase 4 Step 5.18: emotion 分布統計（王于安）
    ALL_EMOTIONS = ['idle', 'talk', 'smile', 'thinking', 'surprised', 'skeptical',
                    'wave', 'angry', 'laughing', 'sad', 'relieved', 'cheering']
    emotion_counts: dict[str, int] = {e: 0 for e in ALL_EMOTIONS}
    for d in dialogues:
        for e in d.get("emotions_used", []) or []:
            if e in emotion_counts:
                emotion_counts[e] += 1
            else:
                emotion_counts[e] = 1  # 未知 emotion 也記
    total_emotions = sum(emotion_counts.values())
    emotion_distribution = {
        e: {
            "count": c,
            "pct": round(c / total_emotions * 100, 1) if total_emotions else 0.0,
        }
        for e, c in emotion_counts.items()
    }
    # 每對白平均 emotion 切換次數（多 emotion 陣列 vs 單 emotion 用量）
    avg_emotions_per_dialogue = (
        round(total_emotions / len(dialogues), 2) if dialogues else 0.0
    )

    # Phase 4 Step 5.20: prompt caching 統計
    total_input         = sum(int(d.get("input_tokens", 0) or 0)        for d in dialogues)
    total_cache_write   = sum(int(d.get("cache_write_tokens", 0) or 0)  for d in dialogues)
    total_cache_read    = sum(int(d.get("cache_read_tokens", 0) or 0)   for d in dialogues)
    total_input_all     = total_input + total_cache_write + total_cache_read
    cache_hit_rate = (
        round(total_cache_read / total_input_all * 100, 1)
        if total_input_all else 0.0
    )
    # 推算「沒 cache 的話會花多少」、實際花多少、省了多少
    cost_no_cache = ((total_input + total_cache_write + total_cache_read) * _PRICE_INPUT_PER_MTOK +
                     sum(int(d.get("output_tokens", 0) or 0) for d in dialogues) * _PRICE_OUTPUT_PER_MTOK) / 1_000_000
    cost_savings = max(0.0, cost_no_cache - total_cost)
    cost_savings_pct = (cost_savings / cost_no_cache * 100) if cost_no_cache else 0.0

    return {
        "ok": True,
        "window": {"first": first_ts, "last": last_ts, "elapsed_sec": elapsed_sec},
        "counts": {
            "dialogues":    len(dialogues),
            "topic_sets":   len(rotates),
            "news_refresh": len(refreshes),
            "quality_hits": len(quality_hits),
        },
        "cost": {
            "total_usd":     round(total_cost, 4),
            "avg_per_dialogue_usd": round(avg_cost, 6),
            "projected_24h_usd":    round(projected_24h, 3),
            "daily_budget":  _DAILY_BUDGET_USD,
            "monthly_budget": _MONTHLY_BUDGET_USD,
        },
        "cache": {
            "hit_rate_pct":      cache_hit_rate,
            "total_input_tokens":      total_input,
            "total_cache_write_tokens": total_cache_write,
            "total_cache_read_tokens":  total_cache_read,
            "cost_no_cache_usd":  round(cost_no_cache, 4),
            "cost_savings_usd":   round(cost_savings, 4),
            "cost_savings_pct":   round(cost_savings_pct, 1),
        },
        "topic_collisions":        collisions,        # 完全相同的撞題
        "topic_near_collisions":   near_collisions,   # 同事件不同標題
        "repeated_openers":        repeated_openers,  # 重複感指標
        "quality_hit_patterns":    [q.get("pattern", "") for q in quality_hits],
        "emotion_distribution":    emotion_distribution,    # 王于安 12 emotion 用量分布
        "emotion_total":           total_emotions,           # 總 emotion 次數
        "avg_emotions_per_dialogue": avg_emotions_per_dialogue,  # 每對白平均切換
    }


@app.post("/api/news/rotate_topic")
def rotate_topic_now():
    """手動觸發 topic 換成新聞快取中的隨機一條。

    會 unlock topic_locked（讓自動 rotate 之後也能繼續換）。
    若 keywords_locked=True、保留手動 keywords。
    回合計數歸零、新 topic 重新累積。
    """
    if not _news_topics_cache:
        return JSONResponse({"ok": False, "error": "news cache empty"}, status_code=503)
    # Phase 4 Step 5.10: 走 queue 路徑、跟自動 rotate 統一
    chosen = _pop_next_topic()
    if not chosen:
        return JSONResponse({"ok": False, "error": "no fresh topic available"}, status_code=503)
    st = _apply_news_topic(chosen, unlock=True)
    _push_recent_topic(chosen)
    return {"ok": True, "topic": chosen, "keywords": st["keywords"],
            "topic_locked": False, "topic_round": 0, "queue_size": len(_topic_queue)}


# ── 靜態檔案 ──────────────────────────────────────────────────────
app.mount("/tts", StaticFiles(directory=str(TTS_DIR)), name="tts")
app.mount("/src", StaticFiles(directory=str(_HERE / "src")), name="src")

_ASSETS = _HERE / "assets"
_ASSETS.mkdir(exist_ok=True)
app.mount("/assets", StaticFiles(directory=str(_ASSETS)), name="assets")


@app.get("/")
def index():
    return FileResponse(str(_HERE / "index.html"))


@app.get("/preview")
def preview_emotions():
    """Phase 4 Step 5.21: 王于安 15 張 PNG 色彩比對頁、可切換背景。"""
    return FileResponse(str(_HERE / "preview_emotions.html"))


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  晚晚嘴台灣 WWT")
    print("  http://localhost:8765")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="warning")
