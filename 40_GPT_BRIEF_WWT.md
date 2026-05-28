# Phase 3 Step 2 — Replace Studio Background v1

## Goal

使用 GPT 產出的新版 WWT 節目棚背景，取代舊交易中心 / 舊辦公室背景。

本階段只接一張固定背景，不做早中晚自動切換。

---

## Use This Asset First

固定先使用夜晚版：

- `assets/wwt_studio_background_night_v1.png`

其他時段背景已先放在 assets，但本階段不要接：

- `assets/wwt_studio_background_morning_v1.png`
- `assets/wwt_studio_background_noon_v1.png`

---

## Files To Modify

- `src/config.js`
- `src/scenes/BootScene.js`
- `src/scenes/OfficeScene.js`

只改背景載入、舊背景關閉、動態元素粗略對齊。

---

## Task 1 — Load New Background

載入：

```txt
assets/wwt_studio_background_night_v1.png
```

顯示方式：

- 1920 x 1080 full screen
- origin: `(0, 0)`
- display size: `1920 x 1080`
- depth: 最底層

---

## Task 2 — Disable Old Background / Old Set Elements

新版背景已經包含：

- studio wall
- central LED frame
- stage floor
- right lower panel frame
- studio lights
- window / city view

請關閉或移除舊的：

- 舊交易中心背景
- 舊 grid wall
- 舊柱子
- 舊燈條
- 舊 back wall decorations
- 舊 whiteboard texture
- 舊 server rack / trading-center remnants
- 舊 desk / mic 若與新版角色或背景衝突，先隱藏

不要刪除 asset 檔案，只停用舊場景繪製即可。

---

## Task 3 — Keep Dynamic Overlays

請保留程式動態元素：

- LED topic text
- LED status label
- TOP5 keyword text
- host sprites v2
- speech bubbles
- right status panel
- header

不要把這些烘焙進背景。

---

## Task 4 — Rough Alignment Only

先做粗略對齊，不做細修。

請確認：

- LED topic text 位於新背景中央 LED 螢幕內
- TOP5 keyword text 對齊新背景右下框
- 阿明哥、小美姐站在舞台前方
- 主持人不要遮住 LED 主文字
- bubble 不超出畫面
- 右上 status panel 仍可讀

---

## Do Not Change

禁止修改：

- `server.py`
- API routes
- state schema
- mode system
- dialogue pipeline
- topic pipeline
- Phaser config
- `WWT_HANDOVER.md`

禁止新增：

- 早中晚自動切換
- 新 API
- 新 state 欄位
- 新 animation system
- 新 framework

---

## Expected Result

完成後：

- `localhost:8765` 顯示新版夜晚 WWT 節目棚背景
- 舊交易中心感消失
- 新版主持人仍可顯示
- LED / TOP5 / status panel / bubble 功能維持正常
- 畫面可進入下一輪 screenshot review

---

## Notes

早晨與中午背景先只當素材庫。

等夜晚版背景、角色站位、LED、TOP5 都穩定後，再開下一步：

`Phase 3 Step 3 — Time-Based Background Switch`
