"""王于安角色圖色彩正規化 v2 (histogram matching)。

Phase 4 Step 5.21: v1 只對齊平均 RGB、結果 7 張仍偏暗（對比度太深）
v2 改用 histogram matching、對齊整個 RGB 分布到 emo_idle、
可同時校正平均亮度 + 對比度 + 飽和度差異。

策略：
1. 把 emo_idle 的 RGB 直方圖作為目標
2. 對每張圖、用 CDF 反映射把它的像素分布拉到 target CDF
3. 每個通道 (R/G/B) 獨立做、保色相比例
4. 透明像素不動

執行：
    python scripts/normalize_xiaomei.py
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
SRC_DIR = HERE / "assets" / "char_xiaomei"
REF_NAME = "emo_idle.png"


def char_pixels(img_arr: np.ndarray) -> np.ndarray:
    """回傳角色（非透明）像素的 RGB 陣列、shape (N, 3)。"""
    rgb = img_arr[..., :3]
    alpha = img_arr[..., 3]
    mask = alpha > 200
    return rgb[mask], mask


def hist_match_channel(source: np.ndarray, template: np.ndarray) -> np.ndarray:
    """單通道 histogram matching、回傳對齊後的 uint8 像素值。

    Args:
        source: 1D uint8 array、要被調整的像素
        template: 1D uint8 array、參考分布
    """
    src_values, src_counts = np.unique(source, return_counts=True)
    tmpl_values, tmpl_counts = np.unique(template, return_counts=True)

    src_cdf = np.cumsum(src_counts).astype(np.float64) / source.size
    tmpl_cdf = np.cumsum(tmpl_counts).astype(np.float64) / template.size

    # 把每個 src value 映射到對應的 tmpl value（用 tmpl CDF 反查）
    interp_values = np.interp(src_cdf, tmpl_cdf, tmpl_values)

    # 建查表：src value → 新 value
    lookup = np.zeros(256, dtype=np.uint8)
    for sv, iv in zip(src_values, interp_values):
        lookup[int(sv)] = np.clip(iv, 0, 255)
    return lookup[source]


def histogram_match(img: Image.Image, ref_pixels: np.ndarray) -> Image.Image:
    """對 img 的角色像素做 histogram matching 到 ref_pixels。

    Args:
        img: 要被調整的 PNG
        ref_pixels: 參考圖的角色像素 shape (N, 3)
    """
    arr = np.array(img.convert("RGBA"))
    source_pixels, mask = char_pixels(arr)
    if len(source_pixels) < 100:
        return img

    # 每通道獨立 matching
    new_pixels = np.zeros_like(source_pixels)
    for ch in range(3):
        new_pixels[:, ch] = hist_match_channel(
            source_pixels[:, ch], ref_pixels[:, ch]
        )

    # 寫回去
    arr[..., :3][mask] = new_pixels
    return Image.fromarray(arr, mode="RGBA")


def main():
    ref_path = SRC_DIR / REF_NAME
    if not ref_path.exists():
        print(f"[normalize-v2] {ref_path} 不存在、abort")
        return

    ref_arr = np.array(Image.open(ref_path).convert("RGBA"))
    ref_pixels, _ = char_pixels(ref_arr)
    ref_mean = ref_pixels.mean(axis=0)
    print(f"[normalize-v2] 參考 {REF_NAME}: 平均 RGB = "
          f"({ref_mean[0]:.0f},{ref_mean[1]:.0f},{ref_mean[2]:.0f}), "
          f"像素數 = {len(ref_pixels):,}")
    print()

    files = sorted(
        f for f in SRC_DIR.glob("*.png")
        if f.is_file() and f.parent == SRC_DIR
    )

    SKIP = {"design_reference.png", REF_NAME}
    for f in files:
        if f.name in SKIP:
            print(f"  -- {f.name:25s} skip")
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
        print(f"  ✓ {f.name:25s} ({before_mean[0]:3.0f},{before_mean[1]:3.0f},{before_mean[2]:3.0f}) → ({after_mean[0]:3.0f},{after_mean[1]:3.0f},{after_mean[2]:3.0f})")

    print(f"\n[normalize-v2] 完成、{len(files) - 2} 張對齊 {REF_NAME} 的直方圖分布")


if __name__ == "__main__":
    main()
