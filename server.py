"""
WWT 晚晚嘴台灣 - FastAPI 伺服器
啟動: python server.py
瀏覽: http://localhost:8765
"""
import json
import os
import random
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
_CHARS = {
    'aming': {
        'name': '阿明哥',
        'personality': '45歲工程師，理性、數據派、喜歡分析、偶爾碎念',
        'catchphrases': ['等一下啦', '甘有可能', '真的假的', '靠北喔', '我跟你講喔', '以前不是這樣'],
    },
    'xiaomei': {
        'name': '小美姐',
        'personality': '30歲內容編輯，理性鄉民、反應快、吐槽能力強',
        'catchphrases': ['靠夭喔', '有夠扯', '笑死', '不意外', '留言區炸鍋了', '所以呢？'],
    },
}

# 閒聊話題庫（沒有新聞時使用，降低 API 成本）
_CASUAL_TOPICS = [
    '珍珠奶茶又漲價', '便利商店新推出的東西', '夜市美食推薦',
    'AI最近又出什麼新工具', '台股今天走勢', '颱風季快到了',
    '房價到底什麼時候會跌', '外送平台收太多手續費', '網購退貨很麻煩', '早餐店排隊文化',
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_HERE = Path(__file__).parent
STATE_FILE = _HERE / "wwt_state.json"


def _default_state() -> dict:
    return {
        "updated_at": datetime.now().strftime("%H:%M:%S"),
        "scene": "studio",
        "mode": "idle",
        "topic": "",
        "topic_summary": "",
        "mood": "neutral",
        "activity": "idle",
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


def _load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return _default_state()


def _save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


# 啟動時重置 state
_save_state(_default_state())


def _build_prompt(state: dict, turn_type: str) -> str:
    """依當前 state 和對話節奏，組出 Claude prompt"""
    aming_catch   = "、".join(_CHARS['aming']['catchphrases'])
    xiaomei_catch = "、".join(_CHARS['xiaomei']['catchphrases'])

    topic   = state.get("topic", "").strip()
    summary = state.get("topic_summary", "").strip()
    mode    = state.get("mode", "idle")

    # 決定話題背景
    if mode == "discussion" and topic:
        topic_ctx = f"今日話題：{topic}"
        if summary:
            topic_ctx += f"\n背景補充：{summary}"
    else:
        casual = random.choice(_CASUAL_TOPICS)
        topic_ctx = f"閒聊話題：{casual}"

    # 依 turn_type 決定結構說明
    structures = {
        "debate":    "阿明哥先說觀點，小美姐反嗆，阿明哥再補充或認輸。共 3 句。",
        "react":     "小美姐先提問，阿明哥認真分析（1-2 句），小美姐一句吐槽收尾。共 3-4 句。",
        "monologue": "阿明哥連說 2 句分析，小美姐一句簡短回應結尾。共 3 句。",
        "casual":    "隨機誰先說都行，輕鬆閒聊，3 句。",
    }
    structure = structures.get(turn_type, structures["casual"])

    return f"""你是「晚晚嘴台灣 WWT」AI 鄉民談話台的對話生成器。

主持人：
- 阿明哥（{_CHARS['aming']['personality']}）
  常用語：{aming_catch}
- 小美姐（{_CHARS['xiaomei']['personality']}）
  常用語：{xiaomei_catch}

{topic_ctx}

對話模式：{turn_type}
{structure}

規則：
- 每句不超過 15 個字，絕對不可超過 15 個字
- 繁體中文，台灣口語，有鄉民嘴砲感
- 偶爾夾入常用語，不要每句都用
- 禁止：政治人身攻擊、宗教歧視、種族歧視、死亡案件、未成年、性侵、個資
- 只輸出 JSON 陣列，不要任何其他文字

格式：
[
  {{"speaker": "aming", "text": "..."}},
  {{"speaker": "xiaomei", "text": "..."}}
]"""


@app.post("/api/chat")
async def generate_chat():
    """讓阿明哥與小美姐用 Claude 生成鄉民對話"""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "ANTHROPIC_API_KEY not set"}, status_code=503)

    state     = _load_state()
    turn_type = random.choice(["debate", "react", "monologue", "casual"])
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

        # speaker_a = 第一句說話的人；speaker_b = 另一人（走路目標）
        speaker_a = dialogue[0]["speaker"]
        speaker_b = next(
            (l["speaker"] for l in dialogue[1:] if l["speaker"] != speaker_a),
            None,
        )
        return {"dialogue": dialogue, "speaker_a": speaker_a, "speaker_b": speaker_b}

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
    """手動輸入話題，觸發討論模式。用法：{"topic":"房價","summary":"..."}"""
    data    = await request.json()
    topic   = data.get("topic", "").strip()
    summary = data.get("summary", "").strip()

    if not topic:
        return JSONResponse({"error": "topic is required"}, status_code=400)

    st = _load_state()
    st["topic"]         = topic
    st["topic_summary"] = summary
    st["mode"]          = "discussion"
    st["mood"]          = "heated"
    st["activity"]      = "prepare_show"
    st["updated_at"]    = datetime.now().strftime("%H:%M:%S")
    st["hosts"]["aming"]["status"]   = "thinking"
    st["hosts"]["xiaomei"]["status"] = "thinking"
    _save_state(st)

    return {"ok": True, "topic": topic, "mode": "discussion"}


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
