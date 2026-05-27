# Phase 2B 視覺重製完成報告

## 完成項目

### 修改的檔案

| 檔案 | 類型 | 變更內容 |
|---|---|---|
| gen_assets.py | 修改 | LED frame 中心 H*0.43 → H*0.50；1.png 改為透明 |
| assets/office-complete.png | 重新生成 | LED frame 位置修正至垂直中央（50%） |
| assets/1.png | 重新生成 | 1×1 透明 PNG（wall_screen 不顯示） |
| index.html | 修改 | LED overlay 18vw → 26vw；topic 字體放大加光暈；v=9 |
| src/scenes/BootScene.js | 修改 | `_makeWhiteboard()` 流程圖 → 關鍵字板 |
| src/scenes/OfficeScene.js | 修改 | 白板加文字標籤；中央主持桌加寬；新增左右麥克風架 |

---

## 未修改的檔案（遵照禁止事項）

- server.py ✅ 未動
- config.js ✅ 未動
- API / State / Bubble / 聊天系統 ✅ 未動

---

## 視覺設計說明

### 1. 移除 LED 中的小 LED

`assets/1.png` → 1×1 透明 RGBA PNG。

Phaser `wall_screen` sprite 仍在場景中（depth 3），但顯示透明，
不再於 LED 框內顯示舊的 WWT frame 圖片。

### 2. 中央大 LED 直接顯示 topic

HTML `#led-overlay` 尺寸：

```
舊：width: 18vw;  height: calc(18vw * 9 / 16)
新：width: 26vw;  height: calc(26vw * 9 / 16)
```

定位不變：`left: 56.5%; top: 50%; transform: translate(-50%, -50%)`

背景圖 LED frame 也從 `cy = H*0.43` 修正至 `cy = H*0.50`，
三者（背景圖框、Phaser sprite、HTML overlay）完全對齊。

Topic 文字樣式：
- `font-size: 1.7vw`（舊 1.3vw）
- `font-weight: 700`（舊 600）
- 雙層 text-shadow（白色近光 + 藍色遠光）

### 3. 新增主持桌

位置：`centerX = W * 0.5`，`centerDeskY = wallH + 380`

| 元素 | 尺寸 | 色彩 |
|---|---|---|
| 陰影（depth 28） | W*0.46 × 26px | #050a14，alpha 0.5 |
| 桌面（depth 29） | W*0.46 × 22px | #16233e |
| 頂部高光 | W*0.46 × 3px | #2e4a72 |
| 前緣暗邊 | W*0.46 × 4px | #0e1628 |

舊：`width: 160px`。新：`width: W * 0.46`（約 880px @ 1920 寬）。

### 4. 新增左右麥克風

位置：`W * 0.36`（阿明哥側）和 `W * 0.64`（小美姐側）

每支構成：
1. 底座平板（20 × 4px，#8899aa）
2. 立桿（3 × 44px，#778899，從桌面往上）
3. 麥克風頭外殼（ellipse 16×12，#99aabb）
4. 麥克風頭內部（ellipse 10×8，#1a2a3a）
5. 網格橫線（10 × 1px，#6688aa）

### 5. 白板改熱門關鍵字

#### BootScene.js `_makeWhiteboard()`（124×90）

| 區域 | 設計 |
|---|---|
| 外框 | 深藍 #2a3050 |
| 板面 | 深黑 #060d1e |
| 頂部標題區 | #0e1830 + 橘色左側 accent 條 |
| 5 行 tag 形狀 | 橘/青/綠/琥珀/紫，左側色條 + 淡色背景 |
| 支架 | #404060，H-2 起 18px |

#### OfficeScene.js 疊加文字（depth 28.5）

```
# 熱門        ← 橘色，wbTopY + 8
台北房價      ← #FF6B35，wbTopY + 28
AI工作        ← #00E5FF，wbTopY + 41
演唱會        ← #00E676，wbTopY + 54
健保費        ← #FFB300，wbTopY + 67
物價指數      ← #BB86FC，wbTopY + 80
```

---

## LED Overlay 最終定位

```
背景圖 LED frame：cx = W*0.565，cy = H*0.50，led_w = W*0.26
Phaser wall_screen：W*0.565, H*0.50，displaySize W*0.18（透明，不顯示）
HTML overlay：left: 56.5%，top: 50%，width: 26vw，height: 26vw*9/16
```

---

## 測試確認清單

- [ ] 瀏覽器重整後 LED 框內不再顯示舊 WWT frame 圖片
- [ ] 中央 LED overlay 文字佔滿橘色框內區域
- [ ] 無話題時顯示「晚晚嘴台灣」
- [ ] POST /api/topic 後 LED 顯示話題文字（大字）
- [ ] mode=discussion 時 badge 橘色「ON AIR」
- [ ] 主持桌寬度橫跨兩位主持人之間
- [ ] 左右各有麥克風架
- [ ] 白板顯示「# 熱門」+ 5 個彩色關鍵字

---

## 下一步建議

### 待處理
- 角色美術：阿明哥 / 小美姐正式 sprite（Phase 2A 第 4 優先）
- 關鍵字板從 `/api/state` 動態讀取（目前靜態範例）
- LED overlay 捲動動畫（話題文字淡入效果）
