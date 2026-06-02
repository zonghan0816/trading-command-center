"""陳柏偉角色圖批次去綠幕（新增 emotion 補圖用）。

Phase 4 Step 5.24: assets/char_3q/emo_{thinking,mocking,...}.png 從綠幕 chromakey 出透明 PNG
- 只處理綠色像素 > 50% 的檔案（避免重跑已透明的舊 9 張）
- 原圖搬到 assets/char_3q/raw/
- 去綠後存回 assets/char_3q/
- 角色設定集.png 永遠不動

執行：
    python scripts/chromakey_3q.py
"""
import io
import sys
from pathlib import Path
import shutil
import numpy as np
from PIL import Image

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

HERE = Path(__file__).resolve().parent.parent
SRC_DIR = HERE / "assets" / "char_3q"
RAW_DIR = SRC_DIR / "raw"
SKIP = {"角色設定集.png"}
GREEN_RATIO_THRESHOLD = 0.30  # 綠色像素超過 30% 才視為待去背


def is_green_screen(path: Path) -> bool:
    """偵測圖片是否還是綠幕原圖（避免重跑已透明的）"""
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    green_mask = (g.astype(np.int16) > r.astype(np.int16) + 30) & \
                 (g.astype(np.int16) > b.astype(np.int16) + 30) & \
                 (g > 100) & (a > 128)
    return green_mask.sum() / arr[..., 0].size > GREEN_RATIO_THRESHOLD


def chromakey(img: Image.Image,
              green_dominance: int = 30,
              green_min: int = 100,
              spill_threshold: int = 20) -> Image.Image:
    img = img.convert("RGBA")
    arr = np.array(img, dtype=np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    full_green = (g >= green_min) & (g > r + green_dominance) & (g > b + green_dominance)
    partial_green = (g > r + spill_threshold) & (g > b + spill_threshold) & (~full_green)

    arr[..., 3] = np.where(full_green, 0, arr[..., 3])
    new_g = np.where(partial_green, np.maximum(r, b), g).astype(np.int16)
    arr[..., 1] = new_g

    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), mode="RGBA")


def main():
    if not SRC_DIR.exists():
        print(f"[chromakey_3q] {SRC_DIR} 不存在、abort")
        return

    RAW_DIR.mkdir(exist_ok=True)

    all_files = sorted(
        f for f in SRC_DIR.glob("*.png")
        if f.is_file() and f.name not in SKIP and f.parent == SRC_DIR
    )

    targets = [f for f in all_files if is_green_screen(f)]
    skipped = [f for f in all_files if f not in targets]

    if not targets:
        print("[chromakey_3q] 沒有綠幕原圖、全部已處理")
        return

    print(f"[chromakey_3q] 偵測到 {len(targets)} 張綠幕原圖、{len(skipped)} 張已處理跳過")
    for f in skipped:
        print(f"  ⏭  {f.name}（已透明）")

    for f in targets:
        raw_target = RAW_DIR / f.name
        if not raw_target.exists():
            shutil.move(str(f), str(raw_target))

        img = Image.open(raw_target)
        cleaned = chromakey(img)
        cleaned.save(f, format="PNG", optimize=True)

        alpha = np.array(cleaned)[..., 3]
        transparent_ratio = (alpha == 0).sum() / alpha.size
        print(f"  ✓ {f.name:25s}  透明比例 {transparent_ratio:.1%}")

    print(f"[chromakey_3q] 完成、{len(targets)} 張存到 {SRC_DIR}")
    print(f"             原圖備份在 {RAW_DIR}")


if __name__ == "__main__":
    main()
