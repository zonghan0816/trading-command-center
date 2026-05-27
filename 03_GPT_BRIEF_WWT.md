BootScene.js 修改完成。

變更摘要：

項目	原本	現在
preload 角色載入	forEach 7 個舊角色 + char_boss 特殊處理	只條件載入 char_aming / char_xiaomei
_makeCharacters()	不動	不動（已泛型，讀 CONFIG.characters）
create() 所有 _make*	不動	不動（OfficeScene 更新前仍需這些 texture）
無 PNG 情況下的行為：

customAssets.char_aming = false → preload 完全不嘗試載入檔案
create() → _makeCharacters() 讀 CONFIG.characters.aming 的顏色設定（藍色上衣）→ 程序生成色塊 sprite
動畫 aming_idle / aming_typing / aming_thinking 自動建立
xiaomei 同理（粉紅色上衣）
下一步是 OfficeScene.js（最大幅改動：STATIONS 換成 2 主持人座位 + _applyState 讀新 state 格式）。要繼續嗎？