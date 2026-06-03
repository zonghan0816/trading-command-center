"""Phase 4 Step 5.29: 生 Shorts 縮圖（截圖 + 文字 overlay）。

從 clip mp4 抽第 8 秒 frame、上下加品牌條 + 中央疊大字 topic 短句。
"""
import argparse
import io
import subprocess
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from shorts_lib import find_ffmpeg, thumbnail_path, clip_path, round_uid


def gen_thumbnail_for(round_data: dict, title_text: str | None = None) -> Path | None:
    """從 clip 抽 frame、加 Topic 大字、輸出 jpg。

    Args:
        round_data: archive 那輪 dict、需要 topic
        title_text: 縮圖大字、預設用 topic 前 12 字
    """
    uid = round_uid(round_data)
    clip = clip_path(uid)
    if not clip.exists():
        print(f"[thumb] clip 不存在：{clip}")
        return None
    out = thumbnail_path(clip)
    text = title_text or round_data.get("topic", "")[:12]

    # 用 Pillow 才能寫中文（ffmpeg drawtext 在 Windows 上中文字型很煩）
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("[thumb] 需要 Pillow：pip install Pillow")
        return None

    # 1. ffmpeg 抽 frame 到 tmp jpg
    tmp = out.with_suffix(".raw.jpg")
    cmd = [
        find_ffmpeg(),
        "-y", "-ss", "8", "-i", str(clip),
        "-vframes", "1", "-q:v", "2",
        str(tmp),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"[thumb] ffmpeg 抽 frame 失敗：{r.stderr[-300:]}")
        return None

    # 2. Pillow 疊字
    img = Image.open(tmp).convert("RGB")
    draw = ImageDraw.Draw(img, "RGBA")
    W, H = img.size

    # 黑色半透明底條（上下）
    bar_h = 130
    draw.rectangle([0, 0, W, bar_h], fill=(0, 0, 0, 180))
    draw.rectangle([0, H - bar_h, W, H], fill=(0, 0, 0, 180))

    # 標題字（中央上條）
    font_path = "C:/Windows/Fonts/msjh.ttc"  # 微軟正黑體
    title_font = None
    sub_font = None
    if Path(font_path).exists():
        try:
            title_font = ImageFont.truetype(font_path, 64)
            sub_font = ImageFont.truetype(font_path, 38)
        except Exception:
            pass
    if title_font is None:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()

    # 中央放 topic 大字（橙色描邊）
    title_y = H // 2 - 80
    text_lines = wrap_text(text, max_per_line=10)
    for i, line in enumerate(text_lines):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        tw = bbox[2] - bbox[0]
        x = (W - tw) // 2
        y = title_y + i * 80
        # 黑色描邊
        for dx in (-3, 0, 3):
            for dy in (-3, 0, 3):
                if dx == 0 and dy == 0:
                    continue
                draw.text((x + dx, y + dy), line, font=title_font, fill=(0, 0, 0))
        # 橙色主字
        draw.text((x, y), line, font=title_font, fill=(255, 107, 53))

    # 上條：品牌字
    brand = "24H AI 主持人"
    bbox = draw.textbbox((0, 0), brand, font=sub_font)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 40), brand, font=sub_font, fill=(255, 255, 255))

    # 下條：CTA
    cta = "▶ 看 24H 直播"
    bbox = draw.textbbox((0, 0), cta, font=sub_font)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, H - 90), cta, font=sub_font, fill=(255, 255, 255))

    img.save(out, "JPEG", quality=88)
    tmp.unlink(missing_ok=True)
    print(f"[thumb] ✓ {out.name}")
    return out


def wrap_text(text: str, max_per_line: int) -> list[str]:
    """按字數硬切、中文 + 全形不算 token、就 N 個字一行。"""
    lines: list[str] = []
    s = text
    while len(s) > max_per_line:
        lines.append(s[:max_per_line])
        s = s[max_per_line:]
    if s:
        lines.append(s)
    return lines[:3]  # 最多 3 行


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--archive-line", type=int, required=True)
    args = ap.parse_args()

    from shorts_lib import load_archive
    rounds = load_archive()
    if args.archive_line >= len(rounds):
        print(f"archive 只有 {len(rounds)} 行")
        return
    gen_thumbnail_for(rounds[args.archive_line])


if __name__ == "__main__":
    main()
