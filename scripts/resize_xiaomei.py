"""把 char_xiaomei 裡尺寸不一致的圖統一縮成 1254x1254，
角色置底置中，上方補透明，原檔覆蓋。"""
from PIL import Image
from pathlib import Path

SRC_DIR = r"C:\Users\Administrator\trading-command-center\assets\char_xiaomei"
TARGET_W = 1254
TARGET_H = 1254

def normalize_size(path: Path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    if (w, h) == (TARGET_W, TARGET_H):
        print(f"skip {path.name} (already {w}x{h})")
        return

    ratio = min(TARGET_W / w, TARGET_H / h)
    new_w = int(w * ratio)
    new_h = int(h * ratio)
    resized = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
    x = (TARGET_W - new_w) // 2
    y = TARGET_H - new_h   # 置底對齊
    canvas.paste(resized, (x, y), resized)
    canvas.save(path)
    print(f"OK  {path.name}: {w}x{h} → canvas {TARGET_W}x{TARGET_H} (char {new_w}x{new_h})")

src = Path(SRC_DIR)
files = sorted(src.glob("emo_*.png"))
print(f"找到 {len(files)} 張，開始處理...")
for f in files:
    normalize_size(f)
print("完成！")
