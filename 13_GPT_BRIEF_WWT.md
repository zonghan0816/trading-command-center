# Phase 2C Step 1 完成報告

## 修改檔案

| 檔案 | 動作 |
|---|---|
| `gen_assets.py` | 新增 `make_char_png()` 函式 + AMING / XIAOMEI 規格 + 呼叫 |

其他檔案：未動。

---

## 輸出結果

| 檔案 | 尺寸 | 模式 | 背景 |
|---|---|---|---|
| `assets/char_aming.png` | 192×64 px | RGBA | 透明 |
| `assets/char_xiaomei.png` | 192×64 px | RGBA | 透明 |

---

## Spritesheet 格式

```
每格：48 × 64 px
幀數：4 幀（水平排列）
總尺寸：192 × 64 px

Frame 0 — idle   : 站立。阿明哥持咖啡杯，小美姐持手機
Frame 1 — talk   : 嘴巴張開，微前傾（bob offset -1px）
Frame 2 — react  : 嘴張 + 眉毛上揚 2px（驚訝 / 吐槽）
Frame 3 — think  : 左手碰下巴（左臂上移 5px）
```

---

## 角色視覺規格

### 阿明哥

| 屬性 | 色值 |
|---|---|
| 髮色 | (45, 30, 12) 深褐 |
| 膚色 | (212, 149, 106) |
| 上衣 | (34, 85, 170) 藍色 V 領 |
| 褲子 | (42, 42, 58) 深灰 |
| 鞋子 | (20, 12, 6) |
| 配件 | 銀框眼鏡、Frame 0 右手咖啡杯 |
| 體型 | body_w=13（稍寬） |

### 小美姐

| 屬性 | 色值 |
|---|---|
| 髮色 | (22, 18, 14) 黑，hair_ext=+2px（bob cut 較低） |
| 膚色 | (232, 176, 138) |
| 上衣 | (220, 236, 255) 白 / 冷白色，圓領 |
| 裙褲 | (30, 30, 46) 深色 |
| 鞋子 | (18, 12, 8) |
| 配件 | Frame 0 / 2 右手手機 |
| 體型 | body_w=11（標準） |

---

## 像素驗證

```
char_aming.png
  (0,0) 角落：(0,0,0,0) 透明 ✓
  (24,38) frame0 中央：(212,149,106,255) V 領露膚色 ✓
  (72,38) frame1 中央：(212,149,106,255) ✓

char_xiaomei.png
  (0,0) 角落：(0,0,0,0) 透明 ✓
  (24,38) frame0 中央：(220,236,255,255) 白色上衣 ✓
  (72,38) frame1 中央：(220,236,255,255) ✓
```

---

## 未完成（等待確認後執行）

### Step 2 — config.js
```js
customAssets.char_aming   = true
customAssets.char_xiaomei = true
```

### Step 3 — BootScene.js
- `frameWidth: 16` → `48`
- `frameHeight: 32` → `64`
- 動畫 frame index：`idle=[0]`、`typing=[0,1,1,0]`、`thinking=[2,3]`

### Step 4 — index.html
LED mode 切換 + 淡入淡出

### Step 5 — OfficeScene.js
關鍵字動態化 + 場景裝飾物件
