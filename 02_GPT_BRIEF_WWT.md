config.js 修改完成。

結果摘要：

characters：移除 market / boss / ml / news / swing / dca / agent → 只留 aming（藍色上衣）和 xiaomei（粉紅上衣）
sign：'AI TRADING COMMAND CENTER' → '晚晚嘴台灣 WWT'，副標改為 'AI 鄉民談話台 · Taiwan Tonight'
主題色：#00E5FF（青藍）→ #FF6B35（橘紅）— 招牌立即生效，不需改 OfficeScene
新增 layout.hosts：aming 左 (xRatio: 0.28)、xiaomei 右 (xRatio: 0.72)
customAssets：清除舊角色，加 char_aming / char_xiaomei，場景背景預留 Phase 2
舊版 layout 數值（backXRatios 等）暫時保留，避免 OfficeScene.js 更新前出現 undefined 報錯
下一步是 BootScene.js（改 preload：移除 7 角色資源，改為只處理 char_aming / char_xiaomei）。要繼續嗎？