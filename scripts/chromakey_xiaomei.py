"""王于安角色圖批次去綠幕。

Phase 4 Step 5.16: assets/char_xiaomei/*.png 從綠幕 chromakey 出透明 PNG
- 原圖搬到 assets/char_xiaomei/raw/
- 去綠後存回 assets/char_xiaomei/
- design_reference.png 永遠不動

執行：
    python scripts/chromakey_xiaomei.py
"""
import io
import sys
from pathlib import Path
import shutil
import numpy as np
from PIL import Image

# Windows cp950 console 強制 UTF-8 stdout
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

HERE = Path(__file__).resolve().parent.parent
SRC_DIR = HERE / "assets" / "char_xiaomei"
RAW_DIR = SRC_DIR / "raw"
SKIP = {"design_reference.png"}


def chromakey(img: Image.Image,
              green_dominance: int = 30,
              green_min: int = 100,
              spill_threshold: int = 20) -> Image.Image:
    """從綠幕背景去出透明 PNG。

    步驟：
    1. 偵測「綠色明顯主導」的像素 → alpha = 0
    2. 邊緣綠色噴濺（spill）→ 把 G 通道往 max(R, B) 拉、消除綠色邊緣 fringe
    3. 半透明邊緣根據綠色強度漸層

    參數可微調：
    - green_dominance: G 比 R/B 大多少才算綠（越小越積極）
    - green_min: G 通道最小值（避免暗色被誤判）
    - spill_threshold: 邊緣綠色噴濺處理閾值
    """
    img = img.convert("RGBA")
    arr = np.array(img, dtype=np.int16)  # int16 避免運算溢位
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    # 完全是綠 → 透明
    full_green = (g >= green_min) & (g > r + green_dominance) & (g > b + green_dominance)

    # 邊緣帶綠（spill）→ 半透明 + 拉低 G 通道避免綠邊
    partial_green = (g > r + spill_threshold) & (g > b + spill_threshold) & (~full_green)

    # 設 alpha
    arr[..., 3] = np.where(full_green, 0, arr[..., 3])

    # 邊緣綠色噴濺處理：把 G 替換成 max(R, B)、消除綠 fringe
    new_g = np.where(partial_green,
                     np.maximum(r, b),
                     g).astype(np.int16)
    arr[..., 1] = new_g

    # 半透明邊緣：partial green 區域 alpha 微降（讓邊緣柔和）
    alpha = arr[..., 3]
    edge_factor = (g - np.maximum(r, b)).clip(0, 60)  # 綠超出 R/B 的程度
    partial_alpha_reduction = (edge_factor * 2).astype(np.int16)  # 最多 -120
    arr[..., 3] = np.where(
        partial_green,
        (alpha - partial_alpha_reduction).clip(0, 255),
        alpha,
    )

    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), mode="RGBA")


def main():
    if not SRC_DIR.exists():
        print(f"[chromakey] {SRC_DIR} 不存在、abort")
        return

    RAW_DIR.mkdir(exist_ok=True)

    files = sorted(
        f for f in SRC_DIR.glob("*.png")
        if f.is_file() and f.name not in SKIP and f.parent == SRC_DIR
    )
    if not files:
        print("[chromakey] 沒有圖檔可處理")
        return

    print(f"[chromakey] 處理 {len(files)} 個檔案、原圖搬到 raw/")
    for f in files:
        raw_target = RAW_DIR / f.name
        # 搬原圖到 raw（如果 raw 已有同名、跳過原圖搬運、用 raw 重跑）
        if not raw_target.exists():
            shutil.move(str(f), str(raw_target))

        # 去綠 + 存回主資料夾
        img = Image.open(raw_target)
        cleaned = chromakey(img)
        cleaned.save(f, format="PNG", optimize=True)

        # 統計透明度
        alpha = np.array(cleaned)[..., 3]
        transparent_ratio = (alpha == 0).sum() / alpha.size
        print(f"  ✓ {f.name:30s}  透明比例 {transparent_ratio:.1%}")

    print(f"[chromakey] 完成、{len(files)} 張存到 {SRC_DIR}")
    print(f"           原圖備份在 {RAW_DIR}")


if __name__ == "__main__":
    main()
