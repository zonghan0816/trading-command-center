"""批次去除綠幕背景（#00B140 系列），輸出透明 PNG，原檔覆蓋。"""
from PIL import Image
import numpy as np
from pathlib import Path

SRC_DIR = r"C:\Users\Administrator\trading-command-center\assets\char_3q"

def remove_green_bg(path: Path, tolerance: int = 60):
    img = Image.open(path).convert("RGBA")
    data = np.array(img, dtype=np.int32)
    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
    # 綠幕判斷：G 明顯大於 R 和 B
    green_mask = (g - r > tolerance) & (g - b > tolerance)
    data[green_mask, 3] = 0
    result = Image.fromarray(data.astype(np.uint8))
    result.save(path)
    print(f"OK  {path.name}")

src = Path(SRC_DIR)
files = sorted(src.glob("*.png"))
if not files:
    print("找不到 PNG 檔案，請確認路徑")
else:
    print(f"找到 {len(files)} 張，開始去背...")
    for f in files:
        remove_green_bg(f)
    print("完成！")
