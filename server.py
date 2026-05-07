"""
Trading Command Center - FastAPI 資料伺服器
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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

load_dotenv()

app = FastAPI(title="Trading Command Center")

# ── 角色個性定義 ──────────────────────────────────────────────
_CHARS = {
    'market': {'name': '市場分析師', 'personality': '技術分析專家，說話謹慎，喜歡引用數字，偶爾擔心風險'},
    'news':   {'name': '新聞記者',   'personality': '反應敏捷，有時誇張，搶第一手消息，語氣帶點興奮'},
    'swing':  {'name': '波段交易員', 'personality': '看技術形態，在意進出場，緊張時話多，猜對時很得意'},
    'dca':    {'name': '定投經理',   'personality': '沉穩，長期思維，不追高，常提醒大家別情緒化'},
    'ml':     {'name': 'ML 工程師',  'personality': '術語多，數字導向，說話偏學術，預測通常準確'},
    'agent':  {'name': 'AI 交易員',  'personality': '整合各方訊號，決策導向，說話精準簡短'},
    'boss':   {'name': '策略長',     'personality': '看大局，最終拍板，有威嚴但也關心團隊'},
}

_CONV_PAIRS = [
    ('market', 'boss',   '今日技術面分析'),
    ('news',   'boss',   '最新市場消息'),
    ('ml',     'agent',  'ML 模型預測結果'),
    ('agent',  'boss',   '交易建議'),
    ('swing',  'market', '技術形態確認'),
    ('dca',    'boss',   '定投執行狀況'),
    ('news',   'market', '消息面和技術面對比'),
    ('ml',     'market', '模型訊號和技術指標'),
    ('swing',  'agent',  '波段機會討論'),
    ('market', 'news',   '詢問最新消息'),
    ('swing',  'boss',   '請示操作策略'),
    ('ml',     'boss',   '報告模型信心度'),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# trading-system 資料夾路徑（自動偵測，預設跟本專案同層）
_HERE = Path(__file__).parent
_TS_ROOT = _HERE.parent / "trading-system"
STATE_FILE = _HERE / "command_center_state.json"

# 如果 trading-system 有 state，優先讀那邊
_TS_STATE = _TS_ROOT / "command_center_state.json"


def _load_state() -> dict:
    """讀取最新狀態，優先讀 trading-system，沒有則讀本機"""
    for f in [_TS_STATE, STATE_FILE]:
        if f.exists():
            try:
                return json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                pass
    return _default_state()


def _default_state() -> dict:
    return {
        "updated_at": datetime.now().strftime("%H:%M:%S"),
        "modules": {
            "market": {"status": "idle", "last_output": "", "confidence": 0},
            "news":   {"status": "idle", "last_output": "", "confidence": 0},
            "boss":   {"status": "idle", "last_output": "", "confidence": 0},
            "swing":  {"status": "idle", "last_output": "", "confidence": 0},
            "dca":    {"status": "idle", "last_output": "", "confidence": 0},
            "ml":     {"status": "idle", "last_output": "", "confidence": 0},
            "agent":  {"status": "idle", "last_output": "", "confidence": 0},
        },
        "data_flows": [],
    }

# 啟動時清除兩邊的舊快取，等交易系統執行後才重新填入
for _f in [STATE_FILE, _TS_STATE]:
    try:
        _f.write_text(json.dumps(_default_state(), ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


@app.post("/api/chat")
async def generate_chat():
    """讓角色用 Claude API 即時生成對話"""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "ANTHROPIC_API_KEY not set"}, status_code=503)

    a_id, b_id, context = random.choice(_CONV_PAIRS)
    ca, cb = _CHARS[a_id], _CHARS[b_id]

    # 把真實系統狀態帶入對話背景
    state = _load_state()
    real_data_lines = []
    for mid, mod in state.get("modules", {}).items():
        out = mod.get("last_output", "")
        if out and out not in ("", "等待市場資料...", "等待新聞分析...", "等待決策合成...",
                               "等待回測...", "等待定投...", "等待ML預測...", "等待Agent決策..."):
            real_data_lines.append(f"  {_CHARS.get(mid, {}).get('name', mid)}：{out}")
    real_context = "\n當前系統資料：\n" + "\n".join(real_data_lines) if real_data_lines else ""

    prompt = f"""你是 AI 交易指揮中心的對話生成器。請生成一段自然的工作對話。

角色 A：{ca['name']}（{ca['personality']}）
角色 B：{cb['name']}（{cb['personality']}）
對話主題：{context}{real_context}

規則：
- 3 到 4 句來回，每句不超過 16 個字，絕對不可以超過 16 個字
- 繁體中文，口語化，像同事在辦公室討論
- 如果有當前系統資料，請融入對話讓內容更真實
- 角色個性要明顯
- 只輸出 JSON 陣列，不要其他任何文字

格式：
[
  {{"speaker": "{a_id}", "text": "..."}},
  {{"speaker": "{b_id}", "text": "..."}},
  {{"speaker": "{a_id}", "text": "..."}}
]"""

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        msg = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # 去掉 markdown code block（如果有的話）
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        dialogue = json.loads(raw.strip())
        return {"dialogue": dialogue, "speaker_a": a_id, "speaker_b": b_id}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/state")
def get_state():
    return JSONResponse(_load_state())


@app.post("/api/state")
async def update_state(request):
    """接收 trading-system 推送的狀態更新"""
    data = await request.json()
    STATE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True}


# 靜態檔案（index.html + Phaser 場景 + 自訂圖片）
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
    print("  Trading Command Center")
    print("  http://localhost:8765")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="warning")
