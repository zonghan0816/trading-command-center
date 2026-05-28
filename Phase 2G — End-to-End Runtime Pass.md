# Phase 2G — End-to-End Runtime Pass

## Goal
先讓整個專案可以完整運作。  
暫停美術 polish，人物與場景圖之後會整批替換。

## Priority
本階段只處理：
- 程式能不能穩定跑
- API / topic / dialogue pipeline 是否正常
- mode 是否能正常切換
- LED 是否正確更新
- 主持人台詞是否正常顯示
- OBS 1920x1080 是否穩定
- 錯誤時是否不會整個畫面壞掉

## Visual Rule
目前美術只做最低限度：

- 不裁切人物
- bubble 不超出畫面
- TOP5 不貼邊
- 文字可讀
- 不再細修人物外觀
- 不再細修 pixel art

## Do Not Spend Time On
暫停：
- 主持人造型美化
- 桌子美化
- 背景美化
- sprite 重畫
- 細節 glow polish
- 視覺風格大改

## Required Checks
請確認：

1. `npm run dev` 可以啟動
2. localhost 畫面能正常載入
3. topic 能進入 LED
4. 右上 panel 顯示目前 topic / mode / 主持人狀態
5. 主持人 bubble 能輪流顯示
6. TOP5 能顯示 state.keywords
7. mode 切換不會造成畫面錯誤
8. console 沒有 blocking error
9. 重新整理頁面後仍可正常運作
10. 1920x1080 OBS 畫面不會跑版

## Asset Replacement Later
請保留目前 asset 結構，不要大改。

之後會另外開一個 phase：
- Replace Host Sprites
- Replace Desk
- Replace Background
- Improve Pixel Art Style

本階段不要處理。