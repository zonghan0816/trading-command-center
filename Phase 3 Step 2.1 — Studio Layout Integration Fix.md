# Phase 3 Step 2.1 — Studio Layout Integration Fix

## Goal
新背景已接上。  
本階段只修新背景下的角色站位、LED overlay、TOP5 疊框、舊物件殘留。

## Files
- src/config.js
- src/scenes/OfficeScene.js
- index.html only if LED overlay position must be adjusted

## Fix 1 — Host Placement
目前主持人站太前、太高，會遮住 LED 文字。

請調整：
- 阿明、小美都往下移 40~80px
- 小美往右移少量，但不要貼 TOP5
- 阿明維持 LED 左下
- 小美維持 LED 右下
- 兩人不要遮住 LED 主標題文字
- 兩人腳底落在新背景舞台地板上

## Fix 2 — LED Overlay Position
目前 LED 文字容易被角色遮住。

請調整 LED overlay：
- topic 主文字往 LED 螢幕上半部移
- status badge 可保留中下
- 不要被主持人擋住
- 不要超出背景 LED 螢幕框

如果 LED overlay 是 HTML，僅微調 CSS position，不改邏輯。

## Fix 3 — TOP5 Double Frame
新背景右下已有內建框，程式 TOP5 graphics 再畫外框會形成雙框。

請調整：
- 保留 TOP5 title 與 keyword text
- 移除或大幅降低程式 TOP5 board 背景/外框 opacity
- 讓文字看起來是在背景內建右下框中
- 不要改 keywords logic

## Fix 4 — Hide Old Desk / Chair Props
目前舊桌子、椅背與新背景不搭。

請先隱藏：
- 個人工作站桌子 desk.png
- chair_back
- 舊 mic / desk remnants

不要刪 asset，只停用繪製。

## Fix 5 — Old Sign Weight
新背景已有完整節目棚，舊 `_buildSign()` 造成重複。

請處理其中一種：
- 暫時停用 `_buildSign()`
- 或降低 opacity / depth，避免搶 LED 焦點

## Do Not Change
禁止修改：
- server.py
- API routes
- state schema
- mode system
- dialogue pipeline
- topic pipeline
- Phaser config
- background assets
- host image assets

## Expected Result
完成後：
- 新背景成為主要場景
- 主持人站在舞台前方但不遮 LED 主文字
- TOP5 沒有雙框感
- 舊交易中心/舊桌椅殘留消失
- 畫面可進入下一輪 screenshot review