# Phase 4 Step 2.1 — Visual Tuning (GPT 68 號指示)

**狀態：** 完成、單批微調 commit
**檔案動作：** 2 個檔（`index.html`、`src/scenes/OfficeScene.js`）
**承接：** `68_CLAUDE_STEP2_1_VISUAL_TUNING_REPORT.md` GPT 指令

---

## 一、GPT 視覺微調要求摘要

1. ✅ **24H AI LIVE badge 太大** → 縮小 + 稍微內挪
2. ✅ **道具 overlay 太搶眼** → 降透明度 / 支援場景而非主導
3. ✅ **保留 channel/chat identity**、不要做成新聞輪播風
4. ✅ **角色 + 對話泡泡可讀性不被擠壓**

---

## 二、修改檔案

### 1. `index.html` — 24H badge 縮小 + 內挪 + 加微透明

```diff
     /* Phase 4 Step 2: 24H AI LIVE 品牌字 badge (左上) */
     #brand-badge {
       position: absolute;
-      top: 18px;
-      left: 18px;
-      width: 320px;
-      height: 74px;
+      top: 24px;
+      left: 24px;
+      width: 220px;
+      height: 51px;
       background: url('/assets/ui_brand_24h_ai_live.png') no-repeat;
       background-size: contain;
       z-index: 11;
       pointer-events: none;
-      filter: drop-shadow(0 0 8px rgba(255,107,53,0.4));
+      filter: drop-shadow(0 0 6px rgba(255,107,53,0.35));
+      opacity: 0.92;
     }
```

| 項 | 之前 | 之後 |
|---|---|---|
| 寬 | 320px | **220px**（-31%）|
| 高 | 74px | **51px**（-31%）|
| 位置 | top 18 / left 18 | **top 24 / left 24**（往內挪 6px）|
| 發光半徑 | 8px | 6px（降強度）|
| 透明度 | 1.0 | **0.92**（微透明、不喧賓奪主）|

### 2. `src/scenes/OfficeScene.js` — 道具 overlay 降透明度

```diff
   _buildPropOverlay() {
     const slot = this._getCurrentTimeSlot();
     const propKey = `prop_${slot}`;
     if (this.textures.exists(propKey)) {
       this.propLayer = this.add.image(0, 0, propKey)
-        .setOrigin(0, 0).setDepth(1).setDisplaySize(this.W, this.H);
+        .setOrigin(0, 0).setDepth(1).setDisplaySize(this.W, this.H)
+        .setAlpha(0.78);
-      console.info(`[TDT] prop: ${propKey}`);
+      console.info(`[TDT] prop: ${propKey} (alpha 0.78)`);
     }
   }
```

| 項 | 之前 | 之後 |
|---|---|---|
| Prop alpha | 1.0（完全不透明）| **0.78**（融入棚景）|
| Depth | 1 | 1（不變）|
| 尺寸 | 1920×1080 fill canvas | 不變 |

→ 0.78 是嘗試「**支援場景**」效果的甜蜜點：道具仍清晰可辨、但讓中央 LED 跟主持人成為視覺主角。

---

## 三、未動的部分（嚴守 GPT 指示）

| 項目 | 狀態 | 原因 |
|---|---|---|
| 跑馬燈 | ✅ 未動 | GPT 說 "acceptable, keep style" |
| 主持人 sprite 大小 / 位置 | ✅ 未動 | GPT 說 "Current standing style can be kept" |
| 對話泡泡 480×135 / 26px | ✅ 未動 | 仍清晰、不擠 |
| 中央 LED 樣式 | ✅ 未動 | 仍為主視覺優先 |
| 觀眾互動面板 | ✅ 未動 | 仍 4 條 CTA |
| 道具圖層深度 | ✅ 仍 depth 1 | 在角色（depth 30）之下 |
| 4 時段切換邏輯 | ✅ 未碰 | 仍 Step 3 範圍 |
| 氣象 API | ✅ 未碰 | 仍 Step 2.3 範圍 |

---

## 四、圖層深度確認（不變）

```
0     weather overlay
0.5   studio_base
1     prop overlay (alpha 0.78)  ← 微調
30    characters
32+   bubble
HTML z-index 10: LED overlay
HTML z-index 11: 24H badge (微縮)  ← 微調
HTML z-index 12: marquee
```

---

## 五、Sanity Check

```bash
$ node -c src/scenes/OfficeScene.js
OK
```

---

## 六、視覺驗收

### A. 1920×1080 視覺檢查（瀏覽器 + OBS 同尺寸）

| 觀察點 | 結果 |
|---|---|
| 24H AI LIVE badge 大小是否合理 | ✅ 退到輔助層級、不喧賓奪主 |
| 道具 overlay 是否仍可辨識 | ✅ alpha 0.78 仍清楚、但更融入 |
| 中央 LED 主視覺保留 | ✅ 不被擋 |
| 主持人 + 泡泡可讀性 | ✅ 不受影響 |
| 跑馬燈 channel identity | ✅ 保留「24H AI 聊天直播」訴求 |
| 沒變成新聞輪播風 | ✅ 沒有 breaking news / news ticker 出現 |

### B. F12 console 預期

```
[TDT] bg: studio_base + weather=weather_*
[TDT] prop: prop_<slot> (alpha 0.78)
```

---

## 七、下一步剩什麼

### Step 2.2 / 2.3（未做）

- 接氣象 API（中央氣象署 OpenData）→ 窗外天氣跟真實同步
- 道具細部位置 / 縮放微調（若 GPT / 使用者覺得 0.78 還不夠融入）

### Step 3（未做）

- 4 時段切換邏輯（早 / 午 / 晚 / 深夜）含道具、角色組、姿勢
- A 組角色（白天時段、char_a_man / char_a_woman）
- 站姿 / 坐姿 swap

### Phase 4 Step 4+（後期）

- 事實基底 + 活潑風格 prompt 規則（避免政治偏向）
- Cost Guard / 預算護欄 / Batch + Pool 架構
- Quality Circuit Breaker

---

## 八、給 GPT / 使用者的確認題

1. ⚪ **Badge 220×51 是否再小一點 / 再縮位置**？（目前 top 24 / left 24、距邊有 24px 留白）
2. ⚪ **Prop alpha 0.78 夠融入嗎**？（可繼續降到 0.65、或反向加到 0.85）
3. ⚪ **保留現狀進 Step 3**？還是先處理 prompt 規則（避免政治偏向）？

回覆後決定下一階段。

---

## 結語

Step 2.1 只動 CSS + 1 行 alpha、低風險視覺微調。
中央 LED 仍為主視覺優先、跑馬燈保留聊天直播 identity、沒走偏成新聞輪播。

GPT 的方向被嚴格保留：
- ✅ "Keep the livestream identity"
- ✅ "Main topic text should remain the visual priority"
- ✅ "Reduce display size"（badge & prop 透明度都降）
