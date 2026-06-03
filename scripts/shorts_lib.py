"""Shorts pipeline 共用工具：找錄影檔、時間對齊、ffmpeg 路徑解析、檔名規範。

Phase 4 Step 5.29
"""
import io
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

HERE             = Path(__file__).resolve().parent.parent
RECORDINGS_DIR   = Path("D:/TDT_recordings")
OUTPUT_DIR       = HERE / "output" / "shorts"
PROCESSED_LOG    = OUTPUT_DIR / ".processed.jsonl"
SCORE_CACHE      = OUTPUT_DIR / ".score_cache.json"
ARCHIVE_FILE     = HERE / "wwt_dialogue_archive.jsonl"
CREDENTIALS_FILE = HERE / "youtube_credentials.json"
TOKEN_FILE       = HERE / "youtube_token.json"


def find_ffmpeg() -> str:
    """回傳可執行的 ffmpeg 路徑、PATH 找不到時 fallback 到 winget 預設位置。"""
    try:
        r = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=3)
        if r.returncode == 0:
            return "ffmpeg"
    except Exception:
        pass
    candidates = [
        Path(os.environ.get("USERPROFILE", "")) /
            "AppData/Local/Microsoft/WinGet/Packages/"
            "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/"
            "ffmpeg-8.1.1-full_build/bin/ffmpeg.exe",
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    raise RuntimeError("ffmpeg 找不到、裝了沒？跑 `winget install ffmpeg`")


def find_ffprobe() -> str:
    ff = find_ffmpeg()
    if ff == "ffmpeg":
        return "ffprobe"
    return ff.replace("ffmpeg.exe", "ffprobe.exe")


def parse_obs_filename_ts(name: str) -> datetime | None:
    """OBS 預設檔名 `2026-06-03 18-40-36.mp4` → datetime。"""
    m = re.match(r"(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})-(\d{2})", name)
    if not m:
        return None
    y, mo, d, h, mi, s = map(int, m.groups())
    try:
        return datetime(y, mo, d, h, mi, s)
    except ValueError:
        return None


def list_recordings() -> list[tuple[Path, datetime]]:
    """掃 D:/TDT_recordings/、回傳 [(path, file_start_ts)] 按 ts 升冪。"""
    if not RECORDINGS_DIR.exists():
        return []
    items: list[tuple[Path, datetime]] = []
    for f in RECORDINGS_DIR.glob("*.mp4"):
        ts = parse_obs_filename_ts(f.name)
        if ts:
            items.append((f, ts))
    items.sort(key=lambda x: x[1])
    return items


def find_recording_for(dialogue_ts: datetime, padding_sec: int = 90) -> tuple[Path, float] | None:
    """找出哪個 OBS 錄影檔覆蓋此時刻、回傳 (path, offset_seconds)。

    offset = dialogue_ts - file_start_ts (秒)、給 ffmpeg -ss 用。
    錄影檔不存在 / dialogue_ts 早於所有錄影 → None。
    """
    recs = list_recordings()
    if not recs:
        return None
    chosen = None
    for path, file_ts in recs:
        if file_ts <= dialogue_ts:
            chosen = (path, file_ts)
        else:
            break
    if not chosen:
        return None
    path, file_ts = chosen
    offset = (dialogue_ts - file_ts).total_seconds()
    if offset < 0:
        return None
    return path, offset


def parse_archive_ts(ts: str) -> datetime:
    """archive ts 格式 `2026-06-03 18:40:36` → datetime。"""
    return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")


def round_uid(round_data: dict) -> str:
    """每輪唯一 ID = ts + round_num + topic 前 10 字、給去重用。"""
    return f"{round_data.get('ts','')}_{round_data.get('round_num',0)}_{round_data.get('topic','')[:10]}"


def load_processed() -> set[str]:
    """讀已處理過的 uid set。"""
    if not PROCESSED_LOG.exists():
        return set()
    uids = set()
    with open(PROCESSED_LOG, encoding="utf-8") as f:
        for line in f:
            try:
                uids.add(json.loads(line).get("uid", ""))
            except Exception:
                continue
    return uids


def mark_processed(uid: str, **extra) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    entry = {
        "uid": uid,
        "processed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        **extra,
    }
    with open(PROCESSED_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def load_score_cache() -> dict:
    """讀評分快取 {uid: {"score": int, "reason": str}}、評過的不重評省 API。"""
    if not SCORE_CACHE.exists():
        return {}
    try:
        return json.loads(SCORE_CACHE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_score_cache(cache: dict) -> None:
    """寫回評分快取。"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    SCORE_CACHE.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_archive(date_filter: str | None = None) -> list[dict]:
    """讀 archive、可選日期過濾 YYYYMMDD。"""
    if not ARCHIVE_FILE.exists():
        return []
    rounds: list[dict] = []
    with open(ARCHIVE_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if date_filter:
                ts_date = obj.get("ts", "")[:10].replace("-", "")
                if ts_date != date_filter:
                    continue
            rounds.append(obj)
    return rounds


def load_api_key() -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        return api_key
    env_file = HERE / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("找不到 ANTHROPIC_API_KEY")


def clip_path(uid: str) -> Path:
    """clip 輸出檔名（uid 做 hash 避免特殊字元）"""
    import hashlib
    h = hashlib.md5(uid.encode("utf-8")).hexdigest()[:10]
    return OUTPUT_DIR / f"clip_{h}.mp4"


def metadata_path(clip: Path) -> Path:
    return clip.with_suffix(".json")


def thumbnail_path(clip: Path) -> Path:
    return clip.with_suffix(".jpg")


def subtitle_path(clip: Path) -> Path:
    return clip.with_suffix(".srt")
