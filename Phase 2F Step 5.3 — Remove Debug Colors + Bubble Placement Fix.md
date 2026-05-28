# Phase 2F Step 5.3 — Remove Debug Colors + Bubble Placement Fix

## Goal
只修 Step 5.2 沒完成的地方。  
不要新增功能，不要重構。

## File
- src/scenes/OfficeScene.js

## Fix 1 — TOP5 Remove Debug Colors
目前 TOP5 board 尺寸可以保留，但每列仍有彩色框線/色塊。

請在 `_renderKeywords` 中檢查所有：
- KEYWORD_COLORS
- per-row colored rectangle
- per-row colored stroke
- rainbow color usage

並移除 TOP5 列表中的彩色列框。

TOP5 最終樣式：
- board 背景：深色半透明
- board 外框：橘色
- title：橘色
- ranking number：橘色
- topic text：白色
- 第一名可有微弱 orange glow
- 其他名次不要 glow
- 不要紅/青/綠/黃/紫列框

禁止：
- rainbow colors
- RGB debug look
- cyberpunk monitor rows

## Fix 2 — Bubble Placement
目前 bubble 字變大了，但仍太貼人物。

請調整主持人 bubble：
- bubble 整體再往上 25~40px
- bubble width 增加到 270~300
- wordWrap width 增加到 260~280
- background opacity 保持高
- bubble 不要貼著角色頭、身體、桌子

目標：
- 像節目字幕框
- OBS 壓縮後仍可讀
- 不要像角色頭上的 debug tooltip

## Do Not Change
禁止修改：
- API
- mode system
- host movement
- camera
- LED logic
- state schema
- index.html
- Phaser config

## Expected Result
完成後：
- TOP5 不再有彩色 debug 感
- TOP5 看起來像正式節目資訊板
- Bubble 更像直播字幕
- 視線順序維持 LED → 主持人/Bubble → TOP5