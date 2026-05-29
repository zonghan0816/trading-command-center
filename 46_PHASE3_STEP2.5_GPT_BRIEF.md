# Phase 3 Step 2.5 — TOP5 / Right Panel Alignment

## Goal

新背景、LED、角色、對話泡泡目前先視為可用。

本階段只調整右側資訊區：

- 右下 TOP5 對齊背景內建框
- 右上 Status Panel 與新背景視覺更一致

不要修改角色、泡泡、LED、背景圖。

---

## Files

- `src/scenes/OfficeScene.js`
- `index.html`

---

## Fix 1 — TOP5 Text Alignment

目前 TOP5 文字看起來沒有完整坐進背景右下框：

- title 太靠上
- 列表有點貼底
- 內容垂直分布不夠穩

請調整 `_renderKeywords` / TOP5 text positions：

- TOP5 title 往下 `8 ~ 14px`
- keyword list 起始 Y 往下或重新計算，讓整體置於框內
- row spacing 稍微縮小，避免最後一行貼到底框
- keyword text 不要超出背景內建框
- 保留橘白單色
- 不恢復 graphics 外框

建議：

- title fontSize 可維持 18
- keyword fontSize 可維持 17 或降到 16
- row spacing 約 `34 ~ 38px`

---

## Fix 2 — TOP5 Horizontal Padding

目前 TOP5 內容可再往右一點，與背景框內距對齊。

請調整：

- ranking number 與 topic text 整體往右 `10 ~ 18px`
- title 保持置中或略微置中
- topic text 與 ranking number 間距維持清楚

---

## Fix 3 — Right Status Panel Visual Match

右上 status panel 還是舊 UI 感略重。

請只做輕微樣式調整：

- 背景更接近新棚景深藍黑
- border 使用橘色但降低亮度
- panel opacity 可略提高或降低，以可讀為主
- padding 保持舒適
- 不改內容邏輯
- 不改 API 資料

目標是讓它像新背景的一部分，不像浮在外面的 debug box。

---

## Fix 4 — Right Safe Area

請確認：

- TOP5 不撞右側瀏覽器/OBS 安全邊界
- TOP5 不與小美泡泡大面積重疊
- 右上 status panel 與 TOP5 之間有明確間距
- 兩者都在 1920x1080 safe area 內

---

## Do Not Change

禁止修改：

- host sprites
- host position
- host scale
- dialogue bubble position
- dialogue bubble chunking
- LED overlay
- background image assets
- API routes
- state schema
- mode system
- dialogue pipeline
- Phaser config

---

## Expected Result

完成後：

- TOP5 文字自然坐在右下背景框內
- TOP5 沒有貼邊、貼底、雙框感
- 右上 status panel 比較融入新節目棚
- 角色、泡泡、LED 完全維持現狀
