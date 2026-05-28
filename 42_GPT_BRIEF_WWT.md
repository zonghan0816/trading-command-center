# Phase 3 Step 2.1 實作報告：Studio Layout Integration Fix

## 目標

新背景已接上後，修正角色站位、LED overlay 位置、TOP5 雙框、舊物件殘留、舊招牌重疊。

---

## 修改檔案

- `src/config.js`
- `src/scenes/OfficeScene.js`
- `index.html`

---

## 截圖觀察（實作前）

| 問題 | 說明 |
|---|---|
| 角色站太高 | 上半身在 LED 框內，遮住主標題文字 |
| TOP5 雙框 | 程式畫的橘色外框 + 新背景內建右下框疊加 |
| 舊桌子/椅背 | desk.png、chair_back 與新背景舞台不搭 |
| 舊招牌 | `_buildSign()` 橘色霓虹招牌與新背景重疊 |
| LED 文字位置 | 居中顯示，角色容易遮住下半部文字 |

---

## Fix 1 — Host Placement（config.js）

```diff
- aming:   { xRatio: 0.35, yOffsetFromWall: 360, seat: 'left'  },
- xiaomei: { xRatio: 0.65, yOffsetFromWall: 360, seat: 'right' },
+ aming:   { xRatio: 0.35, yOffsetFromWall: 440, seat: 'left'  },
+ xiaomei: { xRatio: 0.68, yOffsetFromWall: 440, seat: 'right' },
```

| 調整 | 數值 | 效果 |
|---|---|---|
| yOffsetFromWall 360→440 | +80px 往下 | 腳底落在舞台地板，上身不遮 LED |
| xiaomei xRatio 0.65→0.68 | +約 58px 往右 | 遠離 LED 中心，維持右側安全區 |

---

## Fix 2 — LED Overlay Position（index.html）

```diff
  #led-overlay {
    display: flex;
    flex-direction: column;
-   justify-content: center;
+   justify-content: flex-start;
+   padding-top: 8%;
    align-items: center;
    gap: 8px;
  }
```

topic 主文字移至 LED 螢幕上半部，status badge 保留在其下，不被主持人遮擋。

---

## Fix 3 — TOP5 Double Frame（OfficeScene.js）

```diff
- const brd = this.add.graphics().setDepth(28);
- brd.fillStyle(0x060d1e, 0.97);
- brd.fillRect(wbCX - 204, wbTopY, 408, 321);
- brd.lineStyle(2, 0xFF6B35, 0.75);
- brd.strokeRect(wbCX - 204, wbTopY, 408, 321);
- brd.lineStyle(1, 0xFF6B35, 0.35);
- brd.lineBetween(wbCX - 200, wbTopY + 44, wbCX + 200, wbTopY + 44);
+ // TOP5 背景/外框已停用（新背景內建右下框，避免雙框）
```

TOP5 title `▸ TOP 5` 與 keyword text 完整保留，只移除 graphics 面板層。

---

## Fix 4 — Hide Old Desk / Chair Props（OfficeScene.js）

```diff
- // 椅背
- this.add.image(baseX, deskY - 8, 'chair_back')...
+ // 椅背已停用（新背景 studio 內建舞台設備）
+ // this.add.image(...)

- // 桌子
- this.add.image(baseX, deskY, st.desk || 'desk')...
+ // 桌子已停用（新背景 studio 內建舞台設備）
+ // this.add.image(...)
```

asset 檔案保留，只停用 render。

---

## Fix 5 — Disable _buildSign()（OfficeScene.js）

```diff
- this._buildSign();
+ // this._buildSign(); // Phase 3: 新背景已有完整節目棚，暫停舊招牌
```

---

## 預期效果

| 項目 | 狀態 |
|---|---|
| 新背景成為主要場景 | ✅ |
| 主持人站在舞台前方但不遮 LED 主文字 | ✅ yOffset +80px |
| TOP5 沒有雙框感 | ✅ graphics 面板移除 |
| 舊桌椅殘留消失 | ✅ 停用 render |
| 舊招牌消失 | ✅ _buildSign() 停用 |
| LED 文字在上半部 | ✅ padding-top 8% |

---

## 未修改

- `server.py`、API routes、state schema、mode system
- dialogue pipeline、topic pipeline、Phaser config
- background assets、host image assets
- TOP5 keywords logic（`_renderKeywords` 不動）

---

## 微調說明

若仍需調整，改 `config.js` 即可：

| 需求 | 參數 | 位置 |
|---|---|---|
| 角色再往下 | `yOffsetFromWall` 增大 | `layout.hosts.aming/xiaomei` |
| 小美再往右 | `xRatio` 增大（上限 ~0.75） | `layout.hosts.xiaomei` |
| TOP5 文字位置 | `whiteboardOffsetY` | `layout.whiteboardOffsetY` |
| LED 文字上移更多 | `padding-top: 8%` 增大 | `index.html #led-overlay` |
