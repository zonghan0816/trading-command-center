# Phase 3 Step 2.2 實作報告：Lock LED Overlay Position

## 目標

將 LED overlay block 固定在背景大螢幕上半部，下方保留角色站位空間，不再垂直居中。

---

## 修改檔案

`index.html`（唯一修改）

---

## 問題根因

`#led-overlay` 有 `transform: translate(-50%, -50%)`，因此 `top: X%` 代表 **中心點** 在容器高度的 X%。

| 設定 | 中心 Y | 效果 |
|---|---|---|
| `top: 50%`（修改前） | 容器 50% ≈ y=518px | LED 垂直居中，主持人會遮住下半文字 |
| `top: 27%`（修改後） | 容器 27% ≈ y=280px | LED 在螢幕上半部，下方保留角色空間 |

---

## Diff

```diff
  #led-overlay {
    position: absolute;
    left: 56.5%;
-   top: 50%;
+   top: 27%;
    transform: translate(-50%, -50%);
    width: 26vw;
    height: calc(26vw * 9 / 16);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
-   padding-top: 8%;
+   padding-top: 5%;
    gap: 8px;
```

---

## 配置說明

```
LED 螢幕框（背景圖）：約 y=230～710（canvas 1080px）
                          ↑
LED block 位置（修改後）：
  中心 y ≈ 280px container
  頂部 y ≈ 140px → 接近 LED 螢幕頂緣（+邊距）
  底部 y ≈ 420px → 在角色上方留出空間
                          ↓
主持人腳底：yOffsetFromWall=440 → deskY ≈ 915，腳底 ≈ y=915px
角色頂部（v2 430px 高）：915-430 = y≈485px
```

LED bottom（420px）與角色 top（485px）之間約有 65px 安全間距。

---

## 內容順序（不變）

```
#led-overlay (flex-start, 由上至下)
  ├── #led-topic-label    ← 副標 / 節目名
  ├── #led-topic-text     ← 主標題（最大字，LED 第一焦點）
  └── #led-mode-badge     ← STANDBY / ON AIR badge
```

---

## 未修改

- 角色位置（spec：先鎖 LED，角色後調）
- LED 邏輯、poll interval、badge CSS
- `left: 56.5%`（水平位置正確，不動）
- `server.py`、API、Phaser config
