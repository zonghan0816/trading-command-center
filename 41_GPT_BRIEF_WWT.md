# Phase 3 Step 2 實作報告：Replace Studio Background v1

## 目標

以新版 WWT 節目棚背景（夜晚版）取代舊版交易中心辦公室背景，移除舊 set 元素，保留所有程式動態覆蓋層。

---

## 修改檔案

- `src/scenes/BootScene.js`
- `src/scenes/OfficeScene.js`

（`config.js` 本次未修改）

---

## 資產確認

| 檔案 | 狀態 |
|---|---|
| `assets/wwt_studio_background_night_v1.png` | ✅ 已在 assets/ |
| `assets/wwt_studio_background_morning_v1.png` | 存在，本階段不接 |
| `assets/wwt_studio_background_noon_v1.png` | 存在，本階段不接 |

---

## Task 1 — 載入新背景（BootScene.js）

```diff
  // 背景圖片
  this.load.image('office_bg', '/assets/office-complete.png');
  this.load.image('wall_screen', '/assets/1.png');
+ // Phase 3 Step 2：新版 WWT 節目棚背景（夜晚版）
+ this.load.image('studio_bg_night', '/assets/wwt_studio_background_night_v1.png');
```

舊 key（`office_bg`、`wall_screen`）保留載入，供回退使用，不從程式碼刪除。

---

## Task 2 — 停用舊背景 / 舊 Set 元素（OfficeScene.js）

### _buildBackground()：換用新背景

```diff
- this.add.image(0, 0, 'office_bg')
-   .setOrigin(0, 0).setDepth(0).setDisplaySize(this.W, this.H);
+ // Phase 3 Step 2：WWT 節目棚背景（夜晚版），舊 office_bg 已停用
+ this.add.image(0, 0, 'studio_bg_night')
+   .setOrigin(0, 0).setDepth(0).setDisplaySize(this.W, this.H);
```

### _buildDecorations()：移除 wall_screen

新背景已內建 LED 螢幕框，舊的 `wall_screen` overlay 會形成雙重疊加。

```diff
- this.add.image(W * 0.565 + wsOff.x, H * 0.50 + wsOff.y, 'wall_screen')
-   .setOrigin(0.5, 0.5).setDisplaySize(W * 0.18, W * 0.18 * (9/16)).setDepth(3);
+ // wall_screen 已停用（新背景 studio_bg_night 已內建 LED 螢幕框）
```

### _buildWorkstations()：移除中央主持桌 + 麥克風架

新背景已內建舞台設備（桌台、燈光），舊程序繪製的中央主持桌與麥克風架會與背景衝突。

```diff
- // 中央主持桌（4 個 rectangle）
- // 左右麥克風架（2 組 rectangle + ellipse）
+ // 中央主持桌 + 麥克風架已停用（新背景 studio_bg_night 已內建舞台設備）
```

---

## Task 3 — 保留的動態元素

以下全部保留，不受影響：

| 元素 | 狀態 |
|---|---|
| LED topic text / label / mode badge | ✅ index.html HTML overlay |
| TOP5 keyword board（graphics 面板） | ✅ 保留，位置 W-214 右側 |
| Host sprites v2（阿明哥、小美姐） | ✅ 保留 |
| Speech bubbles | ✅ 保留 |
| 右上 status panel | ✅ 保留 |
| Header bar | ✅ 保留 |
| _buildSign()（霓虹招牌） | ✅ 保留（可視需要後調） |
| 個人工作站桌子（desk.png） | ✅ 保留 |
| 椅背（chair_back） | ✅ 保留 |

---

## Task 4 — 粗略對齊說明

本次只換背景，動態元素座標維持現有值，待視覺截圖後再精修。

| 元素 | 目前座標 | 待確認 |
|---|---|---|
| 主持人站位 Y | `wallH + 360 ≈ 835` | 是否在新背景舞台前方 |
| TOP5 板 X | `W - 214 = 1706`（右緣留 10px） | 是否對應新背景右下框 |
| TOP5 板 Y | `wallH + 20` | 是否與新背景框線對齊 |
| LED text | HTML overlay，居中 | 是否在新背景 LED 螢幕框內 |

如需微調，調整 `config.js` 的：
- `layout.hosts.aming.yOffsetFromWall` / `layout.hosts.xiaomei.yOffsetFromWall`（站位高低）
- `layout.whiteboardOffsetY`（TOP5 面板垂直位置）

---

## 未修改

- `server.py`、API routes、state schema、mode system
- dialogue pipeline、topic pipeline
- Phaser config（仍為 1920×1080 FIT）
- `config.js`（本次未動）
- `WWT_HANDOVER.md`

---

## 回退方式

只需將 OfficeScene.js `_buildBackground()` 改回：

```js
this.add.image(0, 0, 'office_bg')
  .setOrigin(0, 0).setDepth(0).setDisplaySize(this.W, this.H);
```

並恢復 `wall_screen` 和中央主持桌繪製，即可回到舊版。

---

## 下一步

夜晚版背景、角色站位、LED、TOP5 都穩定後：

`Phase 3 Step 3 — Time-Based Background Switch`（早中晚自動切換）
