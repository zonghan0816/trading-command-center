"""
Phase 2A Visual Redesign — Asset Generator (v2, RGB-safe)
Generates:
  assets/office-complete.png  — Pixel TV Studio background
  assets/1.png                — WWT LED screen frame
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

# ── palette ──────────────────────────────────────────────────
BG_TOP       = (8,  15, 30)
BG_MID       = (12, 22, 42)
BG_FLOOR     = (18, 28, 50)
FLOOR_LINE   = (30, 48, 75)
WALL_DARK    = (10, 18, 35)
PILLAR       = (14, 22, 42)
PILLAR_EDGE  = (22, 35, 58)
ORANGE       = (255, 107, 53)
ORANGE_DIM   = (160, 68, 30)
ORANGE_GLOW  = (255, 140, 80)
CYAN         = (0, 229, 255)
CYAN_DIM     = (0, 80, 110)
TEXT_WHITE   = (220, 230, 245)
TEXT_DIM     = (100, 130, 160)
STAGE_FLOOR  = (18, 28, 48)
STAGE_EDGE   = (35, 55, 85)
LED_DARK     = (5, 10, 20)


def try_font(size, fallback_size=None):
    for path in [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/msyhbd.ttc",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def blend_pixel(base, over_rgb, over_a):
    """Alpha composite over_rgb (alpha over_a/255) onto base RGB tuple."""
    a = over_a / 255.0
    return tuple(int(b * (1 - a) + o * a) for b, o in zip(base, over_rgb))


def draw_overlay(base_img, overlay):
    """Alpha composite an RGBA overlay Image onto a base RGB Image in-place."""
    base_img.paste(overlay, (0, 0), overlay)


# ═══════════════════════════════════════════════════════════════
# 1. office-complete.png  (1920 × 1080 — more manageable)
# ═══════════════════════════════════════════════════════════════
W, H = 1920, 1080

img = Image.new('RGB', (W, H), BG_TOP)
d = ImageDraw.Draw(img)

wall_h = int(H * 0.65)
floor_y = wall_h

# ── vertical gradient background ────────────────────────────
for y in range(H):
    t = y / H
    rv = int(BG_TOP[0] + (BG_FLOOR[0] - BG_TOP[0]) * t)
    gv = int(BG_TOP[1] + (BG_FLOOR[1] - BG_TOP[1]) * t)
    bv = int(BG_TOP[2] + (BG_FLOOR[2] - BG_TOP[2]) * t)
    d.line([(0, y), (W, y)], fill=(rv, gv, bv))

# ── back wall (upper 65%) ────────────────────────────────────
for y in range(wall_h):
    t = y / wall_h
    rv = int(WALL_DARK[0] + 5 * t)
    gv = int(WALL_DARK[1] + 8 * t)
    bv = int(WALL_DARK[2] + 12 * t)
    d.line([(0, y), (W, y)], fill=(rv, gv, bv))

# ── stage floor ───────────────────────────────────────────────
for y in range(floor_y, H):
    t = (y - floor_y) / (H - floor_y)
    rv = int(STAGE_FLOOR[0] + 10 * t)
    gv = int(STAGE_FLOOR[1] + 12 * t)
    bv = int(STAGE_FLOOR[2] + 18 * t)
    d.line([(0, y), (W, y)], fill=(rv, gv, bv))

# floor perspective lines
vanish_x = W // 2
for i in range(0, W + 1, 100):
    d.line([(vanish_x, floor_y), (i, H)], fill=FLOOR_LINE)
for j in range(0, 8):
    yf = floor_y + int((H - floor_y) * (j / 7) ** 0.6)
    d.line([(0, yf), (W, yf)], fill=FLOOR_LINE)

# stage edge highlight
d.rectangle([0, floor_y - 2, W, floor_y + 2], fill=STAGE_EDGE)

# ── side pillars ─────────────────────────────────────────────
pillar_w = int(W * 0.11)
for x in range(pillar_w):
    t = x / pillar_w
    rv = int(PILLAR[0] + (PILLAR_EDGE[0] - PILLAR[0]) * t)
    gv = int(PILLAR[1] + (PILLAR_EDGE[1] - PILLAR[1]) * t)
    bv = int(PILLAR[2] + (PILLAR_EDGE[2] - PILLAR[2]) * t)
    d.line([(x, 0), (x, wall_h)], fill=(rv, gv, bv))
for x in range(W - pillar_w, W):
    t = (W - x) / pillar_w
    rv = int(PILLAR[0] + (PILLAR_EDGE[0] - PILLAR[0]) * t)
    gv = int(PILLAR[1] + (PILLAR_EDGE[1] - PILLAR[1]) * t)
    bv = int(PILLAR[2] + (PILLAR_EDGE[2] - PILLAR[2]) * t)
    d.line([(x, 0), (x, wall_h)], fill=(rv, gv, bv))

d.line([(pillar_w, 0), (pillar_w, wall_h)], fill=PILLAR_EDGE)
d.line([(W - pillar_w, 0), (W - pillar_w, wall_h)], fill=PILLAR_EDGE)

# ── top bar (lighting rig) ────────────────────────────────────
bar_h = 26
d.rectangle([0, 0, W, bar_h], fill=(6, 10, 20))
for i in range(0, W, 160):
    d.rectangle([i + 30, 4, i + 130, bar_h - 4], fill=(18, 28, 46))
    d.rectangle([i + 44, 6, i + 116, bar_h - 6], fill=(28, 42, 68))
d.line([(0, bar_h), (W, bar_h)], fill=PILLAR_EDGE)

# ── top orange accent line ────────────────────────────────────
d.rectangle([0, bar_h, W, bar_h + 3], fill=ORANGE)

# ── pillar orange accents ─────────────────────────────────────
for ay in range(60, wall_h, 100):
    d.rectangle([pillar_w - 7, ay, pillar_w - 1, ay + 36], fill=ORANGE_DIM)
    d.rectangle([W - pillar_w + 1, ay, W - pillar_w + 7, ay + 36], fill=ORANGE_DIM)

# ── center LED frame on wall ──────────────────────────────────
cx   = int(W * 0.565)
cy   = int(H * 0.50)
led_w = int(W * 0.26)
led_h = int(led_w * 9 / 16)
lx0 = cx - led_w // 2 - 20
ly0 = cy - led_h // 2 - 20
lx1 = cx + led_w // 2 + 20
ly1 = cy + led_h // 2 + 20

# shadow
d.rectangle([lx0 + 6, ly0 + 6, lx1 + 6, ly1 + 6], fill=(4, 6, 12))
# outer glow (3 rings)
for i in range(5, 0, -1):
    c = int(40 * i / 5)
    d.rectangle([lx0 - i*2, ly0 - i*2, lx1 + i*2, ly1 + i*2],
                fill=(c, c//3, 0))
# frame
d.rectangle([lx0 - 6, ly0 - 6, lx1 + 6, ly1 + 6], fill=ORANGE_DIM)
d.rectangle([lx0, ly0, lx1, ly1], fill=(14, 18, 32))
# screen inner
d.rectangle([lx0 + 10, ly0 + 10, lx1 - 10, ly1 - 10], fill=LED_DARK)
# top/bottom LED glow lines
d.rectangle([lx0 + 10, ly0 + 10, lx1 - 10, ly0 + 13], fill=(80, 40, 10))
d.rectangle([lx0 + 10, ly1 - 13, lx1 - 10, ly1 - 10], fill=(80, 40, 10))

# ── WWT logo above LED screen ────────────────────────────────
logo_y  = ly0 - 68
logo_x0 = cx - 160
logo_x1 = cx + 160
d.rectangle([logo_x0, logo_y, logo_x1, logo_y + 46], fill=ORANGE_DIM)
d.rectangle([logo_x0 + 2, logo_y + 2, logo_x1 - 2, logo_y + 44], fill=(18, 8, 3))

f_logo = try_font(26)
f_sub  = try_font(14)
f_live = try_font(13)
f_btn  = try_font(12)

d.text((logo_x0 + 10, logo_y + 8), '晚晚嘴台灣  WWT', fill=ORANGE, font=f_logo)

# ── LIVE badge (top right) ────────────────────────────────────
live_x = W - pillar_w + 16
live_y = bar_h + 18
d.rectangle([live_x, live_y, live_x + 110, live_y + 32], fill=(0, 50, 20))
d.rectangle([live_x, live_y, live_x + 110, live_y + 32],
            outline=(0, 180, 70))
d.text((live_x + 10, live_y + 7), '● LIVE', fill=(0, 220, 90), font=f_live)

# ── Channel logo (top left) ───────────────────────────────────
chan_x = pillar_w // 4
chan_y = bar_h + 16
d.rectangle([chan_x, chan_y, chan_x + 160, chan_y + 34], fill=ORANGE_DIM)
d.rectangle([chan_x + 1, chan_y + 1, chan_x + 159, chan_y + 33], fill=(18, 8, 3))
d.text((chan_x + 8, chan_y + 7), '◆ WWT', fill=ORANGE, font=f_sub)

# ── host desk platform ────────────────────────────────────────
desk_y  = int(H * 0.67)
desk_x0 = int(W * 0.29)
desk_x1 = int(W * 0.71)

d.rectangle([desk_x0 + 10, desk_y + 10, desk_x1 + 10, H + 10], fill=(8, 12, 22))
d.rectangle([desk_x0, desk_y, desk_x1, H], fill=(22, 35, 58))
d.rectangle([desk_x0, desk_y, desk_x1, desk_y + 26], fill=(32, 50, 80))
d.rectangle([desk_x0, desk_y, desk_x1, desk_y + 4], fill=STAGE_EDGE)

# wood grain
for xg in range(desk_x0 + 30, desk_x1, 55):
    d.line([(xg, desk_y + 6), (xg + 16, desk_y + 24)], fill=(42, 65, 98))

# mic stands
for mx in [int(W * 0.355), int(W * 0.635)]:
    d.rectangle([mx - 3, desk_y - 70, mx + 3, desk_y + 26], fill=(48, 68, 95))
    d.ellipse([mx - 12, desk_y - 92, mx + 12, desk_y - 66], fill=(55, 78, 110))
    d.ellipse([mx - 8, desk_y - 88, mx + 8, desk_y - 70], fill=(35, 55, 85))

# ── bottom accent ─────────────────────────────────────────────
d.rectangle([0, H - 5, W, H], fill=ORANGE_DIM)

# ── transparent overlay: light cones ─────────────────────────
light_ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ld = ImageDraw.Draw(light_ov)
for lx_pos in [W * 0.25, W * 0.5, W * 0.75]:
    lx_pos = int(lx_pos)
    for rad in range(180, 0, -6):
        alpha = int(12 * (1 - rad / 180))
        ld.ellipse([lx_pos - rad * 3, -10, lx_pos + rad * 3, rad * 3 + bar_h],
                   fill=(255, 220, 140, alpha))
draw_overlay(img, light_ov)

# ── transparent overlay: pixel grid ──────────────────────────
grid_ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(grid_ov)
for gx in range(0, W, 16):
    gd.line([(gx, bar_h + 4), (gx, wall_h)], fill=(255, 255, 255, 5))
for gy in range(bar_h + 4, wall_h, 16):
    gd.line([(0, gy), (W, gy)], fill=(255, 255, 255, 5))
draw_overlay(img, grid_ov)

# ── transparent overlay: scanlines ───────────────────────────
scan_ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
scan_d = ImageDraw.Draw(scan_ov)
for sl in range(0, H, 4):
    scan_d.line([(0, sl), (W, sl)], fill=(0, 0, 0, 22))
draw_overlay(img, scan_ov)

img_rgba = img.convert('RGBA')
img_rgba.save(r'C:\Users\Administrator\trading-command-center\assets\office-complete.png')
print(f'office-complete.png saved: {W}x{H}')

# Verify
v = img_rgba.getpixel((W // 2, H // 2))
print(f'  center pixel: {v}  (should be ~stage floor color)')

# ═══════════════════════════════════════════════════════════════
# 2. 1.png — transparent 1×1 (wall_screen removed; LED overlay handles display)
# ═══════════════════════════════════════════════════════════════
simg_rgba = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
simg_rgba.save(r'C:\Users\Administrator\trading-command-center\assets\1.png')
print('1.png saved: 1x1 transparent (wall_screen hidden)')

# ═══════════════════════════════════════════════════════════════
# 3. Character spritesheets  192×64 px (4 frames × 48×64)
# Frame 0=idle  Frame 1=talk  Frame 2=react  Frame 3=think
# ═══════════════════════════════════════════════════════════════

def _dk(c, a=22):
    return tuple(max(0, v - a) for v in c)

def make_char_png(spec, filename):
    FW, FH = 48, 64
    img = Image.new('RGBA', (FW * 4, FH), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)

    hair  = spec['hair']
    skin  = spec['skin']
    shirt = spec['shirt']
    pants = spec['pants']
    shoes = spec.get('shoes', (18, 10, 6))
    DARK  = (8, 8, 8)
    bob   = [0, -1, 0, 1]
    hair_ext = spec.get('hair_ext', 0)   # extra hair rows for bob cut

    for f in range(4):
        ox = f * FW
        cx = ox + 24
        bv = bob[f]

        # hair
        d.rectangle([cx-12, 4+bv,  cx+11, 13+hair_ext+bv], fill=hair)
        d.rectangle([cx-14, 6+bv,  cx-12, 13+hair_ext+bv], fill=hair)
        d.rectangle([cx+12, 6+bv,  cx+14, 13+hair_ext+bv], fill=hair)

        # face
        d.rectangle([cx-11, 10+bv, cx+10, 27+bv], fill=skin)
        d.rectangle([cx-14, 14+bv, cx-11, 21+bv], fill=skin)
        d.rectangle([cx+11, 14+bv, cx+14, 21+bv], fill=skin)

        # eyebrows (raised in react frame)
        by = 14 + bv - (2 if f == 2 else 0)
        d.rectangle([cx-9, by, cx-3, by+2], fill=hair)
        d.rectangle([cx+3, by, cx+9, by+2], fill=hair)

        # eyes
        ey = 17 + bv
        d.rectangle([cx-9, ey,   cx-3, ey+5], fill=(240,240,240))
        d.rectangle([cx+3, ey,   cx+9, ey+5], fill=(240,240,240))
        d.rectangle([cx-8, ey+1, cx-4, ey+4], fill=(68,110,200))
        d.rectangle([cx+4, ey+1, cx+8, ey+4], fill=(68,110,200))
        d.rectangle([cx-7, ey+1, cx-5, ey+4], fill=DARK)
        d.rectangle([cx+5, ey+1, cx+7, ey+4], fill=DARK)
        d.point((cx-7, ey+1), fill=(255,255,255))
        d.point((cx+5, ey+1), fill=(255,255,255))

        # mouth
        my = 24 + bv
        if f in (1, 2):
            d.rectangle([cx-5, my, cx+4, my+4], fill=DARK)
            d.rectangle([cx-4, my+1, cx+3, my+3], fill=(155,45,35))
        else:
            d.rectangle([cx-4, my, cx+3, my+2], fill=(155,65,55))

        # neck
        d.rectangle([cx-4, 27+bv, cx+3, 33], fill=skin)

        # shirt body
        bw = spec.get('body_w', 12)
        d.rectangle([cx-bw, 33, cx+bw-1, 50], fill=shirt)
        # neckline
        if spec.get('v_neck', False):
            d.rectangle([cx-5, 33, cx+4, 41], fill=skin)
            d.rectangle([cx-3, 33, cx+2, 43], fill=skin)
        else:
            d.rectangle([cx-4, 33, cx+3, 37], fill=skin)
        d.rectangle([cx-bw, 47, cx+bw-1, 50], fill=_dk(shirt, 28))

        # arms  (left arm rises in think frame)
        la = 34 - (5 if f == 3 else 0)
        d.rectangle([cx-20, la,    cx-12, la+13], fill=shirt)
        d.rectangle([cx-19, la+13, cx-13, la+17], fill=skin)
        d.rectangle([cx+12, 34,    cx+19, 47],    fill=shirt)
        d.rectangle([cx+13, 47,    cx+19, 51],    fill=skin)

        # glasses
        if spec.get('glasses'):
            gy = 17 + bv
            d.rectangle([cx-10, gy-1, cx-2, gy+5],  outline=(185,185,185))
            d.rectangle([cx+2,  gy-1, cx+10, gy+5], outline=(185,185,185))
            d.line([(cx-2, gy+2), (cx+2,  gy+2)], fill=(185,185,185))
            d.line([(cx-14,gy+2), (cx-10, gy+2)], fill=(185,185,185))
            d.line([(cx+10,gy+2), (cx+14, gy+2)], fill=(185,185,185))

        # coffee cup (aming idle)
        if spec.get('coffee') and f == 0:
            cx2, cy2 = cx+12, 47
            d.rectangle([cx2, cy2, cx2+7, cy2+6], fill=(105,70,40))
            d.rectangle([cx2+1,cy2+1,cx2+6,cy2+3], fill=(35,15,5))
            d.rectangle([cx2+7,cy2+2,cx2+9,cy2+4], fill=(105,70,40))

        # phone (xiaomei idle / react)
        if spec.get('phone') and f in (0, 2):
            px2, py2 = cx+12, 44
            d.rectangle([px2, py2, px2+6, py2+9],   fill=(18,18,28))
            d.rectangle([px2+1,py2+1,px2+5,py2+8], fill=(22,55,88))

        # think: left hand to chin
        if f == 3:
            d.rectangle([cx-10, 24+bv, cx-4, 28+bv], fill=skin)

        # pants
        d.rectangle([cx-bw, 50, cx-1, 59], fill=pants)
        d.rectangle([cx+1,  50, cx+bw, 59], fill=pants)
        d.line([(cx, 50),(cx, 59)], fill=_dk(pants, 15))

        # shoes
        d.rectangle([cx-bw-1, 59, cx-1, 64], fill=shoes)
        d.rectangle([cx+1, 59, cx+bw+1, 64],  fill=shoes)

    out = fr'C:\Users\Administrator\trading-command-center\assets\{filename}'
    img.save(out)
    print(f'{filename} saved: {FW*4}x{FH}')
    v = img.getpixel((24, 30))
    print(f'  sample pixel (frame0 torso): {v}')


AMING = {
    'hair':   (45,  30,  12),
    'skin':   (212, 149, 106),
    'shirt':  (34,  85,  170),
    'pants':  (42,  42,  58),
    'shoes':  (20,  12,  6),
    'body_w': 13,
    'v_neck': True,
    'glasses': True,
    'coffee':  True,
}

XIAOMEI = {
    'hair':     (22,  18,  14),
    'skin':     (232, 176, 138),
    'shirt':    (220, 236, 255),
    'pants':    (30,  30,  46),
    'shoes':    (18,  12,  8),
    'body_w':   11,
    'v_neck':   False,
    'hair_ext': 2,
    'phone':    True,
}

make_char_png(AMING,   'char_aming.png')
make_char_png(XIAOMEI, 'char_xiaomei.png')

print('Done.')
