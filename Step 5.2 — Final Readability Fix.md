# Phase 2F Step 5.2 — TOP5 + Bubble Final Readability Fix

## Goal
只修正目前畫面可讀性問題。  
不要新增功能，不要重構。

## Files
- src/scenes/OfficeScene.js

## Fix 1 — TOP5 Board
目前 TOP5 還是太小，而且仍有彩色 debug 感。

請修改：
- TOP5 board 再放大約 1.5 倍
- 位置仍保持右下角
- 移除每列彩色框線
- 移除彩虹排名色
- 全部改成橘白單色系

樣式：
- 深色半透明底
- 橘色外框
- title 橘色
- 排名數字橘色
- topic 文字白色
- 第一名可有微弱 orange glow
- 每列行距加大

禁止：
- 紅/青/黃/紫彩色列框
- cyberpunk debug 感
- RGB monitor 感

## Fix 2 — Bubble
目前 bubble 字太小、太擠、位置太低。

請修改：
- bubble fontSize: 20px
- lineSpacing: 8
- wordWrap width: 240
- bubble background opacity 提高
- padding 增加
- bubble 位置往上移 20~35px
- bubble 不要貼著角色身體

## Fix 3 — Host Name Label
阿明哥胸前 name label 可以保留，但不要比 bubble 更搶眼。

請降低：
- name label glow
- name label saturation

## Do Not Change
禁止修改：
- API
- mode system
- host movement
- camera
- LED logic
- state schema
- index.html

## Expected Result
完成後：
- TOP5 像正式節目資訊板
- Bubble 在 OBS 中可讀
- 畫面不再像 debug prototype
- 視線順序維持 LED → 主持人/Bubble → TOP5