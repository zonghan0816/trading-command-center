# Phase 2G.1 — Runtime Hardening Cleanup

## Goal
專案已可端對端運作。  
本階段只做小型穩定性清理，不做美術 polish。

## File
- src/scenes/OfficeScene.js
- server.py（只在必要時）

## Fix 1 — Remove or Guard Dead Error Path
靜態掃描發現 `_buildAgentStation()` 內可能使用不存在的 `STATIONS.agent`。

請處理其中一種：
- 若完全未使用，移除 `_buildAgentStation()`
- 或加 guard，避免未來被呼叫時 TypeError

不要影響現有畫面。

## Fix 2 — API Fail Fallback
如果 `/api/state` 失敗，前端不要整個壞掉。

請確認：
- console 可顯示 warning
- 畫面保留上一次 state
- LED 不變成空白
- 主持人 bubble 不噴錯

## Fix 3 — State Reset Safety
確認重新整理頁面後：
- topic 保留或合理 fallback
- keywords 至少有 5 筆 fallback
- hosts.last_output 沒資料時不顯示 undefined

## Do Not Change
禁止修改：
- 美術
- host sprites
- desk
- background
- LED style
- TOP5 layout
- mode system
- API schema
- Phaser config

## Expected Result
完成後：
- 目前功能維持不變
- 沒有潛在 dead code TypeError
- API 暫時失敗時畫面不崩
- 專案更適合長時間掛 OBS