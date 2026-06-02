"""陳柏偉新增 emotion 圖色彩正規化 (histogram matching)。

Phase 4 Step 5.24: 新 8 張比舊 9 張暗 ~R-8/G-9/B-4、套 histogram matching 對齊。

策略：
1. 把 emo_idle.png 的 RGB 直方圖作為目標
2. 只處理新 8 張、舊 9 張不動
3. 每通道獨立 CDF 反映射
4. 透明像素不動

執行：
    python scripts/normalize_3q.py
"""
import io
import sys
from pathlib import Path
import numpy as np
from PIL import Image

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

HERE = Path(__file__).resolve().parent.parent
SRC_DIR = HERE / "assets" / "char_3q"
REF_NAME = "emo_idle.png"

NEW_EMOTIONS = [
    "emo_thinking.png",
    "emo_mocking.png",
    "emo_sympathy.png",
    "emo_surprised.png",
    "emo_explain.png",
    "emo_mocking_laugh.png",
    "emo_greeting.png",
    "emo_disgusted.png",
]


def char_pixels(img_arr: np.ndarray):
    rgb = img_arr[..., :3]
    alpha = img_arr[..., 3]
    mask = alpha > 200
    return rgb[mask], mask


def hist_match_channel(source: np.ndarray, template: np.ndarray) -> np.ndarray:
    src_values, src_counts = np.unique(source, return_counts=True)
    tmpl_values, tmpl_counts = np.unique(template, return_counts=True)
    src_cdf = np.cumsum(src_counts).astype(np.float64) / source.size
    tmpl_cdf = np.cumsum(tmpl_counts).astype(np.float64) / template.size
    interp_values = np.interp(src_cdf, tmpl_cdf, tmpl_values)
    lookup = np.zeros(256, dtype=np.uint8)
    for sv, iv in zip(src_values, interp_values):
        lookup[int(sv)] = np.clip(iv, 0, 255)
    return lookup[source]


def histogram_match(img: Image.Image, ref_pixels: np.ndarray) -> Image.Image:
    arr = np.array(img.convert("RGBA"))
    source_pixels, mask = char_pixels(arr)
    if len(source_pixels) < 100:
        return img

    new_pixels = np.zeros_like(source_pixels)
    for ch in range(3):
        new_pixels[:, ch] = hist_match_channel(
            source_pixels[:, ch], ref_pixels[:, ch]
        )

    arr[..., :3][mask] = new_pixels
    return Image.fromarray(arr, mode="RGBA")


def main():
    ref_path = SRC_DIR / REF_NAME
    if not ref_path.exists():
        print(f"[normalize_3q] {ref_path} 不存在、abort")
        return

    ref_arr = np.array(Image.open(ref_path).convert("RGBA"))
    ref_pixels, _ = char_pixels(ref_arr)
    ref_mean = ref_pixels.mean(axis=0)
    print(f"[normalize_3q] 參考 {REF_NAME}: 平均 RGB = "
          f"({ref_mean[0]:.0f},{ref_mean[1]:.0f},{ref_mean[2]:.0f})、"
          f"像素數 = {len(ref_pixels):,}")
    print()

    for name in NEW_EMOTIONS:
        f = SRC_DIR / name
        if not f.exists():
            print(f"  ✗ {name:25s} 不存在、跳過")
            continue

        img = Image.open(f)
        before_arr = np.array(img.convert("RGBA"))
        before_px, _ = char_pixels(before_arr)
        before_mean = before_px.mean(axis=0)

        matched = histogram_match(img, ref_pixels)
        after_arr = np.array(matched)
        after_px, _ = char_pixels(after_arr)
        after_mean = after_px.mean(axis=0)

        matched.save(f, format="PNG", optimize=True)
        print(f"  ✓ {name:25s} ({before_mean[0]:3.0f},{before_mean[1]:3.0f},{before_mean[2]:3.0f}) → ({after_mean[0]:3.0f},{after_mean[1]:3.0f},{after_mean[2]:3.0f})")

    print(f"\n[normalize_3q] 完成、{len(NEW_EMOTIONS)} 張對齊 {REF_NAME} 的直方圖分布")


if __name__ == "__main__":
    main()
