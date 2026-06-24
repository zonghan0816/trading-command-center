# -*- coding: utf-8 -*-
"""
char_keyer.py — 角色去綠幕 + 置中對齊到正方形畫布（TDT 主持人素材專用）

把 GPT 生的「綠幕全身/半身人像」一鍵處理成可直接丟進 assets/char_xiaomei/
的透明 PNG：
  去綠幕 → 清雜點(+ 對位標記) → 等比置中對齊到 1254x1254（對齊現有角色的腳/高度）

用法（命令列）：
  python char_keyer.py 圖.png                  # 處理單張
  python char_keyer.py 圖1.png 圖2.png ...       # 處理多張
  python char_keyer.py 某資料夾                  # 處理整個資料夾裡的圖

更省事：直接把「圖檔」或「資料夾」拖到專案根目錄的『去背工具.bat』上放開即可。

選項：
  --ref  路徑   對齊參考圖（預設 assets/char_xiaomei/emo_idle.png）
                → 新圖會對齊這張的人物高度/腳底位置 = 全套表情位置一致
  --out  資料夾  輸出資料夾（預設：來源旁邊新建的 keyed/ ）
  --size N      畫布邊長（預設 1254）
  --scale F     手動指定縮放倍率（不用自動對高度；給「舉手過頭」等特殊姿勢用）
  --no-clean    不清雜點

輸出檔名 = 來源檔名（一律存成 .png）。例如 emo_talk.png 進 → keyed/emo_talk.png 出，
確認 OK 後覆蓋 assets/char_xiaomei/ 同名檔即可（程式/尺寸都不用改）。
"""
import sys
import os
import argparse

try:
    sys.stdout.reconfigure(encoding="utf-8")   # 避免 Windows cp950 終端機印中文亂碼/報錯
except Exception:
    pass

import numpy as np
from PIL import Image

try:
    from scipy import ndimage
    HAS_SCIPY = True
except Exception:
    HAS_SCIPY = False

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_REF = os.path.normpath(os.path.join(HERE, "..", "assets", "char_xiaomei", "emo_idle.png"))
IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".bmp")


def detect_key(a):
    """取四邊邊框像素的中位數當綠幕色（比只取四角穩）。"""
    ring = np.concatenate([a[0, :, :3], a[-1, :, :3], a[:, 0, :3], a[:, -1, :3]], axis=0)
    return np.median(ring, axis=0)


def keep_largest(alpha):
    """只留最大連通塊 → 清掉 + 對位標記、孤立雜點。需 scipy；沒有就原樣回傳。"""
    if not HAS_SCIPY:
        return alpha
    lbl, n = ndimage.label(alpha > 0)
    if n <= 1:
        return alpha
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    big = int(np.argmax(sizes)) + 1
    return np.where(lbl == big, 255, 0).astype(np.uint8)


def key_out(src, green_thr=40, dist_thr=55, clean=True):
    a = np.array(src.convert("RGBA")).astype(np.int16)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    key = detect_key(a)
    greenness = G - np.maximum(R, B)   # 綠色主導程度：綠幕≈+90、深藍/深灰/暗色為負
    dist = np.sqrt((R - key[0]) ** 2 + (G - key[1]) ** 2 + (B - key[2]) ** 2)
    # 綠幕判定「主要看 greenness（綠是否明顯主導）」。
    # ⚠️ 不能靠「離 key 色近(dist 小)」當主判據：深藍/深灰等暗色離綠的歐氏距離也可能 <120、
    #    會被誤刪 → 衣服破洞、頭從脖子斷開被 keep_largest 丟掉。dist 只留很小門檻當輔助（抓近乎純綠）。
    alpha = np.where((greenness > green_thr) | (dist < dist_thr), 0, 255).astype(np.uint8)
    if clean:
        alpha = keep_largest(alpha)
    # despill：保留區綠色過強 → 壓回（去綠邊）
    g = G.copy()
    keep = alpha > 0
    spill = keep & (G > (R + B) // 2 + 12)
    g[spill] = (R[spill] + B[spill]) // 2 + 12
    out = np.dstack([R, g, B, alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA"), key


def ref_box(ref_path, size):
    """回 (對齊用的 target 高度, 腳底Y, 中心X)。有參考圖就讀它的人物 bbox。"""
    if ref_path and os.path.exists(ref_path):
        ref = Image.open(ref_path).convert("RGBA")
        bb = ref.getbbox()
        if bb:
            return bb[3] - bb[1], bb[3], (bb[0] + bb[2]) // 2, True
    # 沒參考圖 → 預設：人物高 91%、腳離底 5%、水平置中
    return int(size * 0.91), int(size * 0.95), size // 2, False


def place(fig, size, target_h, target_bottom, target_cx, scale=None):
    bb = fig.getbbox()
    if not bb:
        raise ValueError("去背後整張全透明（綠幕偵測可能失敗）")
    fig = fig.crop(bb)
    if scale is None:
        scale = target_h / fig.size[1]
    nw, nh = max(1, round(fig.size[0] * scale)), max(1, round(fig.size[1] * scale))
    figr = fig.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px, py = target_cx - nw // 2, target_bottom - nh
    canvas.alpha_composite(figr, (px, py))
    return canvas, (px, py, nw, nh)


def collect_inputs(inputs):
    files = []
    for inp in inputs:
        if os.path.isdir(inp):
            for f in sorted(os.listdir(inp)):
                if f.lower().endswith(IMG_EXT) and not f.startswith("_"):
                    files.append(os.path.join(inp, f))
        elif os.path.isfile(inp):
            files.append(inp)
        else:
            print("[略過] 找不到：", inp)
    return files


def main():
    ap = argparse.ArgumentParser(description="角色去綠幕 + 置中對齊到正方形畫布")
    ap.add_argument("inputs", nargs="*", help="圖檔或資料夾（可多個）")
    ap.add_argument("--ref", default=DEFAULT_REF, help="對齊參考圖（預設 emo_idle.png）")
    ap.add_argument("--out", default=None, help="輸出資料夾（預設來源旁的 keyed/）")
    ap.add_argument("--size", type=int, default=1254, help="畫布邊長（預設 1254）")
    ap.add_argument("--scale", type=float, default=None, help="手動縮放倍率（特殊姿勢用）")
    ap.add_argument("--no-clean", action="store_true", help="不清雜點")
    a = ap.parse_args()

    if not a.inputs:
        print(__doc__)
        print(">> 用法：把『圖檔或資料夾』拖到專案根目錄的「去背工具.bat」上放開，")
        print("         或：python tools/char_keyer.py 圖.png")
        return

    if not HAS_SCIPY and not a.no_clean:
        print("[提示] 沒裝 scipy → 不會自動清掉 + 對位標記等雜點。要清請先：pip install scipy\n")

    files = collect_inputs(a.inputs)
    if not files:
        print("沒有可處理的圖。把圖檔或資料夾當參數丟進來。")
        return

    th, tb, tcx, used_ref = ref_box(a.ref, a.size)
    ref_label = os.path.join(os.path.basename(os.path.dirname(a.ref)), os.path.basename(a.ref))  # 例：char_3q/emo_idle.png
    print(f"畫布 {a.size}x{a.size}｜對齊：人物高={th} 腳底Y={tb} 中心X={tcx}"
          f"（{'參考 ' + ref_label if used_ref else '無參考圖、用預設比例'}）\n")

    ok = 0
    for f in files:
        try:
            keyed, key = key_out(Image.open(f), clean=not a.no_clean)
            canvas, (px, py, nw, nh) = place(keyed, a.size, th, tb, tcx, a.scale)
            outdir = a.out or os.path.join(os.path.dirname(f) or ".", "keyed")
            os.makedirs(outdir, exist_ok=True)
            outp = os.path.join(outdir, os.path.splitext(os.path.basename(f))[0] + ".png")
            canvas.save(outp)
            print(f"[OK] {os.path.basename(f)} -> {outp}  (綠幕色={[int(v) for v in key]}, 放置 {nw}x{nh})")
            ok += 1
        except Exception as e:
            print(f"[失敗] {f}：{e}")

    print(f"\n完成 {ok}/{len(files)} 張。輸出在 keyed/ 資料夾，確認 OK 後覆蓋對應角色的 assets 資料夾同名檔。")


if __name__ == "__main__":
    main()
