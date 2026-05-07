"""
Trading Command Center - FastAPI 資料伺服器
啟動: python server.py
瀏覽: http://localhost:8765
"""
import json
import os
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="Trading Command Center")

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
            "market": {"status": "idle", "last_output": "等待市場資料...", "confidence": 0},
            "news":   {"status": "idle", "last_output": "等待新聞分析...", "confidence": 0},
            "boss":   {"status": "idle", "last_output": "等待決策合成...", "confidence": 0},
            "swing":  {"status": "idle", "last_output": "等待回測...",     "confidence": 0},
            "dca":    {"status": "idle", "last_output": "等待定投...",     "confidence": 0},
            "ml":     {"status": "idle", "last_output": "等待ML預測...",   "confidence": 0},
            "agent":  {"status": "idle", "last_output": "等待Agent決策...", "confidence": 0},
        },
        "data_flows": [],
    }


@app.get("/api/state")
def get_state():
    return JSONResponse(_load_state())


@app.post("/api/state")
async def update_state(request):
    """接收 trading-system 推送的狀態更新"""
    data = await request.json()
    STATE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True}


# 靜態檔案（index.html + Phaser 場景）
app.mount("/src", StaticFiles(directory=str(_HERE / "src")), name="src")


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
