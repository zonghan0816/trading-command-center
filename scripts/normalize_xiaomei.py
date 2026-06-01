"""王于安角色圖色彩正規化。

Phase 4 Step 5.21: 把 15 張 PNG 的角色亮度 / 色溫對齊 emo_idle、
避免不同 emotion 切換時看起來深淺不一。

策略：
1. 計算 emo_idle 的角色像素平均 RGB（目標色）
2. 計算每張 PNG 的角色像素平均 RGB（當前色）
3. 對每張 PNG 的角色像素套 RGB 通道乘法、推到目標 RGB
4. 透明像素不動

執行：
    python scripts/normalize_xiaomei.py

副作用：覆寫主資料夾、原圖在 raw/ 不動。
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


def char_mean_rgb(img_arr: np.ndarray) -> tuple[float, float, float]:
    """計算角色像素（非透明）的 RGB 平均值。"""
    rgb = img_arr[..., :3]
    alpha = img_arr[..., 3]
    mask = alpha > 200
    if mask.sum() < 100:
        return (128.0, 128.0, 128.0)
    chars = rgb[mask]
    return tuple(float(c) for c in chars.mean(axis=0))


def normalize_to_reference(img: Image.Image,
                            target_rgb: tuple[float, float, float]) -> Image.Image:
    """把 img 的角色像素 RGB 對齊 target_rgb。
    保持原圖色彩變化（不是純色覆蓋）、只整體位移。
    """
    arr = np.array(img.convert("RGBA"))
    cur_rgb = char_mean_rgb(arr)

    # 計算對齊比例（乘法、保色彩相對關係）
    ratios = tuple((t / c) if c > 0.5 else 1.0
                   for t, c in zip(target_rgb, cur_rgb))

    # 應用比例、只對非透明像素
    alpha = arr[..., 3]
    mask = alpha > 0
    rgb = arr[..., :3].astype(np.float32)
    for i, ratio in enumerate(ratios):
        channel = rgb[..., i]
        channel[mask] = (channel[mask] * ratio).clip(0, 255)
        rgb[..., i] = channel
    arr[..., :3] = rgb.astype(np.uint8)
    return Image.fromarray(arr, mode="RGBA")


def main():
    ref_path = SRC_DIR / REF_NAME
    if not ref_path.exists():
        print(f"[normalize] {ref_path} 不存在、abort")
        return

    ref_arr = np.array(Image.open(ref_path).convert("RGBA"))
    target = char_mean_rgb(ref_arr)
    print(f"[normalize] 參考: {REF_NAME} 目標角色色 = ({target[0]:.0f},{target[1]:.0f},{target[2]:.0f})")
    print()

    files = sorted(
        f for f in SRC_DIR.glob("*.png")
        if f.is_file() and f.parent == SRC_DIR
    )

    SKIP = {"design_reference.png", REF_NAME}
    for f in files:
        if f.name in SKIP:
            print(f"  -- {f.name:25s} skip (reference / 不動)")
            continue
        img = Image.open(f)
        before = char_mean_rgb(np.array(img.convert("RGBA")))
        normalized = normalize_to_reference(img, target)
        after = char_mean_rgb(np.array(normalized))
        normalized.save(f, format="PNG", optimize=True)
        print(f"  ✓ {f.name:25s} ({before[0]:.0f},{before[1]:.0f},{before[2]:.0f}) → ({after[0]:.0f},{after[1]:.0f},{after[2]:.0f})")

    print(f"\n[normalize] 完成、{len(files) - len(SKIP & {f.name for f in files})} 張對齊 {REF_NAME}")


if __name__ == "__main__":
    main()
