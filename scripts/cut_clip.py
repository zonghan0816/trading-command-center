"""Phase 4 Step 5.29: 從 OBS 錄影切出一段 60-75 秒 Shorts 候選片段。

- 找對應時間的 OBS mp4
- ffmpeg 切 9:16 vertical Shorts 格式（1080x1920）
- 16:9 內容置中、上下用模糊背景填滿（不裁主持人）
- 同時產 .srt 字幕檔（從 archive 對白文字）

使用：
    python scripts/cut_clip.py <archive_index>
    （archive_index 是 archive 第幾筆）
"""
import argparse
import io
import subprocess
import sys
from datetime import timedelta
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from shorts_lib import (
    find_ffmpeg, parse_archive_ts, find_recording_for,
    round_uid, clip_path, subtitle_path, OUTPUT_DIR,
)

# Shorts 規格
CLIP_DURATION_SEC = 70   # 60-75 秒抓中段、留前後 buffer
OFFSET_BEFORE_SEC = -5   # archive ts 前 5 秒開始（frontend prefetch 可能稍早）
SHORTS_W = 1080
SHORTS_H = 1920


def build_ffmpeg_cmd(src: Path, start_sec: float, out: Path) -> list[str]:
    """16:9 source → 9:16 蓋背景模糊版 + 中間置中保留原比例。

    filter_complex 解釋：
    - [0:v]scale=1080:608: 把 1920x1080 縮到符合寬 1080、高=1080*9/16=608
    - 上層中間 = [scaled]
    - 下層背景 = 同源放大裁切到 9:16 + blur + dim
    """
    ff = find_ffmpeg()
    # filter:
    # 1) bg: 用同來源縮放 + 中央裁切到 9:16 + 高斯模糊 + 暗化
    # 2) fg: 16:9 內容 scale 到 1080 寬、置中疊上去
    filter_complex = (
        # 背景：cover 模式放大到「蓋滿」9:16（兩邊都 >= 目標）、中央裁切、模糊、暗化
        f"[0:v]scale={SHORTS_W}:{SHORTS_H}:force_original_aspect_ratio=increase,"
        f"crop={SHORTS_W}:{SHORTS_H},"
        f"boxblur=20:1,"
        f"eq=brightness=-0.3[bg];"
        # 前景：保留 16:9 縮成 1080 寬（高 = 608）
        f"[0:v]scale={SHORTS_W}:-2[fg];"
        # 疊合
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
    )
    return [
        ff,
        "-y",
        "-ss", f"{start_sec}",
        "-i", str(src),
        "-t", str(CLIP_DURATION_SEC),
        "-filter_complex", filter_complex,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "160k",
        "-movflags", "+faststart",
        str(out),
    ]


def write_srt(round_data: dict, out: Path) -> None:
    """從 archive 對話 lines 生 .srt 字幕、平均分布 5-70 秒區間。

    為避免暴露時序對齊問題、字幕全部塞在第 5-65 秒（給 ffmpeg burn 用）
    每句平均 ~15 秒。
    """
    lines = round_data.get("lines", [])
    if not lines:
        return
    n = len(lines)
    start = 5.0
    end = 65.0
    per_line = (end - start) / n

    def fmt(sec: float) -> str:
        td = timedelta(seconds=sec)
        h, rem = divmod(td.total_seconds(), 3600)
        m, s = divmod(rem, 60)
        ms = int((s - int(s)) * 1000)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{ms:03d}"

    out_lines: list[str] = []
    for i, line in enumerate(lines):
        spk = line.get("speaker", "")
        spk_name = {"aming": "陳柏偉", "xiaomei": "王于安"}.get(spk, spk)
        text = line.get("text", "").strip()
        if not text:
            continue
        s = start + i * per_line
        e = s + per_line - 0.3  # 留 0.3 秒間隔
        out_lines.append(str(i + 1))
        out_lines.append(f"{fmt(s)} --> {fmt(e)}")
        out_lines.append(f"{spk_name}：{text}")
        out_lines.append("")

    out.write_text("\n".join(out_lines), encoding="utf-8")


def cut_clip_for(round_data: dict) -> Path | None:
    """主流程：找錄影 → ffmpeg → 出 mp4 + srt、回傳 clip 路徑。"""
    dialogue_ts = parse_archive_ts(round_data["ts"])
    rec = find_recording_for(dialogue_ts)
    if not rec:
        print(f"[cut] {dialogue_ts}: 沒找到對應錄影檔")
        return None
    src, offset = rec
    start_sec = max(0, offset + OFFSET_BEFORE_SEC)
    print(f"[cut] {round_data['topic'][:25]} | src={src.name} | offset={start_sec:.1f}s")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    uid = round_uid(round_data)
    out = clip_path(uid)
    srt = subtitle_path(out)

    cmd = build_ffmpeg_cmd(src, start_sec, out)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"[cut] ffmpeg 失敗：{r.stderr[-400:]}")
        return None

    write_srt(round_data, srt)
    print(f"[cut] ✓ {out.name}（{out.stat().st_size // 1024} KB）+ srt")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ts", required=True, help="archive ts、格式 'YYYY-MM-DD HH:MM:SS'")
    ap.add_argument("--topic", default="", help="archive topic、為 log 顯示用")
    ap.add_argument("--round-num", type=int, default=1)
    args = ap.parse_args()

    fake = {
        "ts": args.ts,
        "topic": args.topic,
        "round_num": args.round_num,
        "lines": [],
    }
    cut_clip_for(fake)


if __name__ == "__main__":
    main()
