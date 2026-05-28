# Phase 3 Step 1.2 — Test Host v2 Sprites

## Goal

測試 GPT 產出的新版主持人角色圖能否正確接進目前 WWT 場景。

本階段只做 sprite 接線與比例調整，不做美術重繪，不改功能。

---

## New Assets

新版圖片已準備為：

- `char_aming_v2_draft.png`
- `char_xiaomei_v2_draft.png`

預期放置位置：

- `assets/char_aming_v2_draft.png`
- `assets/char_xiaomei_v2_draft.png`

若檔案尚未在 `assets/` 目錄，來源路徑如下：

- `C:\Users\Administrator\Documents\Codex\2026-05-28\https-chatgpt-com-share-6a17d81a-03ac\generated_assets\char_aming_v2_draft.png`
- `C:\Users\Administrator\Documents\Codex\2026-05-28\https-chatgpt-com-share-6a17d81a-03ac\generated_assets\char_xiaomei_v2_draft.png`

不要覆蓋原本舊檔，保留原本：

- `char_aming.png`
- `char_xiaomei.png`

---

## Files To Modify

優先檢查並修改：

- `src/config.js`
- `src/scenes/BootScene.js`
- `src/scenes/OfficeScene.js`

只改接圖、scale、anchor、position 相關內容。

---

## Task 1 — Load New Host Images

將新版主持人圖接到小美姐與阿明哥顯示邏輯。

需求：

- 阿明哥使用 `assets/char_aming_v2_draft.png`
- 小美姐使用 `assets/char_xiaomei_v2_draft.png`
- 先以單張 PNG image 使用即可
- 不需要做 spritesheet animation
- 不需要新增動作

如果現有程式期待 spritesheet，請用最小修改方式支援單張 PNG。

---

## Task 2 — Scale / Anchor / Position

新版角色比例與舊 placeholder 不同，請調整：

- scale
- origin / anchor
- y position
- x position only if needed

畫面要求：

- 兩位主持人全身可見
- 不裁切頭、腳、手
- 不擋住 LED 主要文字
- 不擋住 TOP5
- 不讓 bubble 蓋住臉
- 仍維持阿明左、小美右

---

## Task 3 — 1920x1080 Safe Area

請在 `localhost:8765`、1920x1080 畫面確認：

- 阿明哥在左側安全區
- 小美姐在右側安全區
- 角色不貼邊
- bubble 不超出畫面
- TOP5 不被角色遮擋
- LED 仍是第一視覺焦點

---

## Do Not Change

禁止修改：

- `server.py`
- API routes
- state schema
- mode system
- dialogue pipeline
- LED logic
- TOP5 logic
- Phaser config
- 右上 status panel 邏輯
- `WWT_HANDOVER.md`

禁止新增：

- 新 framework
- 新 animation system
- 新 API
- 新 state 欄位

---

## Expected Result

完成後：

- localhost:8765 可正常載入
- 阿明哥顯示新版角色圖
- 小美姐顯示新版角色圖
- topic / LED / TOP5 / status panel / bubble 全部維持正常
- 畫面構圖可用於下一輪 screenshot review

---

## Notes

這兩張圖目前是 draft，不是最終美術。

本階段目標是確認：

- 新角色比例是否適合場景
- Phaser 接圖方式是否可行
- 是否需要重新產更適合的 sprite 尺寸

不要在本階段做大型視覺 polish。
