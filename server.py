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
_DIALOGUE_MEMORY_MAX_ROUNDS = 8           # 同 topic 最多保留最近 8 輪記憶
_DIALOGUE_MEMORY_LINE_MAX_LEN = 40        # 寫入 memory 時、每行截斷字數


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


# Phase 4 Step 4.1: 敏感主題關鍵字黑名單（24H 聊天直播不適合的內容）
# 含這些字的新聞 headline 不會進 news cache、不會被選為 topic
_SENSITIVE_TOPIC_KEYWORDS = [
    # 性侵 / 性犯罪（含未成年保護）
    '性侵', '性侵害', '性騷擾', '性虐', '強姦', '強暴', '戀童', '猥褻', '亂倫',
    # 未成年案件
    '未成年', '幼童', '孩童', '童遭', '童被', '童慘',
    # 自殺 / 自我傷害
    '自殺', '跳樓', '輕生', '上吊', '燒炭', '尋短', '割腕',
    # 命案 / 暴力（含 兇 / 凶 雙字形）
    '命案', '兇殺', '殺人', '砍死', '砍人', '砍傷', '刺死', '勒死', '虐死', '虐待', '虐童',
    '凌虐', '凶手', '凶嫌', '兇手', '兇嫌', '弒', '殺害', '槍殺', '撕票',
    # 屍體 / 死亡（過重話題）
    '屍體', '遺體', '陳屍', '死者', '死於',
    # 其他不適合聊天直播
    '戕', '焚屍', '分屍', '爆頭',
]


def _is_topic_sensitive(headline: str) -> bool:
    """檢查新聞標題是否含敏感字、避免進入聊天直播。
    24H 聊天節目要可以播給觀眾看、這類內容嚴肅 / 沈重 / 涉及未成年 / 法律敏感、不適合詼諧討論。
    """
    if not headline:
        return False
    for kw in _SENSITIVE_TOPIC_KEYWORDS:
        if kw in headline:
            return True
    return False


def fetch_news_topics(limit: int = _NEWS_FETCH_LIMIT) -> list[str]:
    """從 Google News Taiwan RSS 抓即時頭條、回傳乾淨 headline list。

    用 stdlib（urllib + xml.etree）、不引入新依賴。
    失敗（網路 / 解析錯）回 []、不 raise、不影響服務啟動。
    Google News title 格式為 "headline - 來源名稱"、會自動去掉尾部來源。

    Phase 4 Step 4.1: 過濾敏感主題（性侵 / 命案 / 未成年 / 自殺 / 虐待 等）
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
        skipped_count = 0
        for item in items[: limit * 3]:  # Phase 4: 多抓 3 倍、過濾後仍有足夠量
            title_el = item.find("title")
            if title_el is None or not title_el.text:
                continue
            raw = title_el.text.strip()
            cleaned = raw.rsplit(" - ", 1)[0].strip()
            if len(cleaned) < 6:  # 過短的不要
                continue
            # Phase 4 Step 4.1: 敏感主題過濾
            if _is_topic_sensitive(cleaned):
                skipped_count += 1
                print(f"[news] 過濾敏感: {cleaned[:40]}")
                continue
            headlines.append(cleaned)
            if len(headlines) >= limit:
                break
        if skipped_count > 0:
            print(f"[news] 過濾掉 {skipped_count} 條敏感新聞、剩 {len(headlines)} 條可用")
        return headlines
    except Exception as e:
        print(f"[news] fetch failed: {e}")
        return []


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
    _current_topic_rounds = 0
    return st


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
                    chosen = random.choice(_news_topics_cache)
                    _apply_news_topic(chosen, unlock=False)
                    if should_seed:
                        print(f"[news] seeded missing topic → {chosen}")
                    else:
                        print(f"[news] rotated topic → {chosen}（前 topic 跑了 {_MIN_ROUNDS_PER_TOPIC}+ 輪）")
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
                print(f"[news] seeded initial topic → {chosen}")
            else:
                print(f"[news] state already has topic（{st.get('topic')}）、不 seed")
        except Exception as e:
            print(f"[news] seed initial topic error: {e}")

    asyncio.create_task(_news_refresh_loop())
    asyncio.create_task(_topic_rotate_loop())


def _build_prompt(state: dict, turn_type: str,
                  angle: str = "", recent_memory: dict | None = None) -> str:
    """依當前 state 和對話節奏，組出 Claude prompt。

    Phase 2E Task 5：Topic Driven
    Phase 3 Step 6.3：加入 angle 切入指引 + 「最近已講過、請避開」反重複區塊
    """
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
            "- 對白要有實質內容（具體看法、引述、吐槽 topic 細節），不是空泛感嘆\n"
            "- **諷刺/批評針對『現象 / 結構 / 規律』、不針對特定人或政黨**（見下方事實基底規則）\n\n"
            "### 引用範例（topic='油價飆漲'）\n"
            "  ✅ 阿明：油價一漲、物價就跟著漲、消費者最後買單。（諷刺現象）\n"
            "  ✅ 小美：所以呢？凍漲只是把問題往後推啊。（諷刺套路）\n"
            "  ✅ 阿明：這個結構年年炸、修了又修還是漏水。（諷刺制度）\n"
            "  ❌ 阿明：中油又在搶錢、政府放任不管。（指控特定公司+政府）\n"
            "  ❌ 小美：執政黨從不認錯。（指控特定政黨）\n"
            "  ❌ 阿明：以前不是這樣。（沒提油價、沒實質內容）\n"
        )
    else:
        casual = random.choice(_CASUAL_TOPICS)
        topic_block = f"## 閒聊話題（沒設定正式 topic、輕鬆聊）\n{casual}"
        cite_rule = "## 引用規則\n- 話題輕鬆即可、不強制深度引用，但對白仍要有具體內容、不是空泛口頭禪。"

    # 依 turn_type 決定結構說明（8 種 tone、給同 topic 不同調性）
    # Phase 4 Step 4: 全部鎖在「諷刺現象不指控人」、不站隊不點名
    structures = {
        # 既有
        "debate":    "阿明哥先說觀點，小美姐反嗆，阿明哥再補充或認輸。共 3 句。觀點針對『現象/制度/規律』、不針對個人或政黨。",
        "react":     "小美姐先提問，阿明哥認真分析（1-2 句），小美姐一句吐槽收尾。共 3-4 句。分析基於新聞事實、不臆測動機。",
        "monologue": "阿明哥連說 2 句分析，小美姐一句簡短回應結尾。共 3 句。",
        "casual":    "隨機誰先說都行，輕鬆閒聊，3 句。",
        # 新增（Phase 3 Step 6 / Phase 4 Step 4 鎖規則）
        "critical":  "兩人輪流批評 topic 的『結構問題 / 制度設計 / 套路』、用『問題在...』『重點是...』『應該要...』，3-4 句。"
                     "❌ 不要批評特定人 / 政黨 / 公司、❌ 不要說『誰一定有問題』。✅ 批評現象本身、批評年年炸的規律。",
        "mocking":   "兩人輪流嘲笑 topic 的『荒謬處 / 套路 / 重複歷史』、用『真的假的』『靠夭喔』『甘有可能』語氣，3-4 句。"
                     "❌ 不嘲笑個人 / 政黨 / 受害者。✅ 嘲笑現象 / 規律 / 制度的荒謬。",
        "humorous":  "兩人用幽默梗 / 玩笑話討論 topic 現象、輕鬆有趣不失分析、3-4 句。"
                     "❌ 不開特定人玩笑、❌ 不開政治玩笑。✅ 開現象 / 套路 / 結構的玩笑。",
        "sarcastic": "兩人用反諷語氣（『以前不是這樣』『不意外』『所以呢』『唉』），表面平靜實則在嘴 topic 的『規律 / 結構 / 套路』，3-4 句。"
                     "❌ 不反諷特定人 / 政黨。✅ 反諷『十年前就這樣演、十年後還是這樣』、『制度設計問題』。",
    }
    structure = structures.get(turn_type, structures["casual"])

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

    # ── Phase 3 Step 6.3：反重複區塊（明確列出最近 tone / angle / 台詞摘要）──
    anti_repeat_block = ""
    if recent_memory and isinstance(recent_memory.get("rounds"), list) and recent_memory["rounds"]:
        recent_rounds = recent_memory["rounds"][-_DIALOGUE_MEMORY_MAX_ROUNDS:]
        recent_tones  = [r.get("tone", "")  for r in recent_rounds if r.get("tone")]
        recent_angles = [r.get("angle", "") for r in recent_rounds if r.get("angle")]
        # 攤平所有 lines、最多取最近 10 句（保 prompt 不過長）
        recent_lines: list[str] = []
        for r in recent_rounds:
            for ln in r.get("lines", []) or []:
                if ln:
                    recent_lines.append(str(ln))
        recent_lines = recent_lines[-10:]

        bullet_lines = "\n".join(f"  - 「{ln}」" for ln in recent_lines) if recent_lines else "  - （尚無）"
        anti_repeat_block = (
            "## 🚫 最近已講過、本輪請避開\n"
            f"- 最近 tone：{', '.join(recent_tones) if recent_tones else '（尚無）'}\n"
            f"- 最近 angle：{', '.join(recent_angles) if recent_angles else '（尚無）'}\n"
            "- 最近台詞摘要：\n"
            f"{bullet_lines}\n\n"
            "### 反重複規則\n"
            "- 不要重複出現過的句子（包含開場、句尾、punchline）。\n"
            "- 不要每輪都用相同開場（例如連續用「所以呢」「問題就在這」）。\n"
            "- 不要一直用同一個 punchline 收尾。\n"
            "- 同 topic 每輪要推進新觀點、不是換句話說同一件事。\n"
        )

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

{angle_block}
## 對話節奏
{turn_type}：{structure}

{cite_rule}

{anti_repeat_block}

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
    topic     = state.get("topic", "")
    # Phase 3 Step 6.3: tone / angle 都改用 per-topic shuffled queue（同 topic 8 輪內不重複）
    turn_type = _next_tone_for_topic(topic)
    angle     = _next_angle_for_topic(topic)
    # Phase 3 Step 6.3: 取得同 topic 最近 8 輪記憶、放進 prompt 提示 Claude 避開
    recent_memory = _get_recent_dialogue_memory(topic)
    prompt    = _build_prompt(state, turn_type, angle, recent_memory)

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        msg = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            # Phase 3 Step 6.6: 400 → 800、避免被截斷在字串中間導致 JSON 不完整
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
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

            # Phase 4 Step 4.1: 偵測 Claude 倫理拒絕、自動 rotate 到新 topic
            # 主要場景：敏感新聞漏網（_SENSITIVE_TOPIC_KEYWORDS 沒涵蓋的）、Claude 自律拒絕
            refusal_patterns = [
                'I cannot', "I can't", 'I won\'t', 'cannot generate',
                'I appreciate', 'I need to respectfully decline',
                'ethical line', 'crosses an ethical',
                '我無法', '抱歉', '我不能', '無法生成',
            ]
            if any(p in raw for p in refusal_patterns):
                print(f"[chat] 偵測到 Claude 拒絕本 topic、自動 rotate")
                if _news_topics_cache:
                    safe_pool = [h for h in _news_topics_cache if h != topic]
                    if safe_pool:
                        chosen = random.choice(safe_pool)
                        _apply_news_topic(chosen, unlock=False)
                        print(f"[chat] 自動 rotate → {chosen[:40]}")
                        return JSONResponse(
                            {"error": "topic_refused_rotated", "new_topic": chosen},
                            status_code=422
                        )
                return JSONResponse({"error": "topic_refused_no_safe_pool"}, status_code=422)

            # 一般 JSON 解析失敗、嘗試擷取 [...] 區段救一下
            start = raw.find("[")
            end   = raw.rfind("]")
            if start >= 0 and end > start:
                try:
                    dialogue = json.loads(raw[start:end + 1])
                except json.JSONDecodeError:
                    return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)
            else:
                return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)

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

        # Phase 3 Step 6.3: 寫入這一輪 dialogue 到 memory（給下一輪做反重複參考）
        _append_dialogue_memory(topic, turn_type, angle, dialogue)

        # speaker_a = 第一句說話的人；speaker_b = 另一人（走路目標）
        speaker_a = dialogue[0]["speaker"]
        speaker_b = next(
            (l["speaker"] for l in dialogue[1:] if l["speaker"] != speaker_a),
            None,
        )
        return {"dialogue": dialogue, "speaker_a": speaker_a, "speaker_b": speaker_b,
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
    # Phase 3 Step 6.4: 共用 _apply_news_topic、避免邏輯重複
    st = _apply_news_topic(chosen, unlock=True)
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
