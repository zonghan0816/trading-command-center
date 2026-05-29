# Phase 3 Step 2.3 — Dialogue Bubble Placement Fix

## Goal

LED 位置已鎖定，背景與角色站位先不動。

本階段只修正主持人對話泡泡視窗：

- 泡泡放在角色頭部旁邊
- 泡泡變大
- 台詞不要超出泡泡
- 不要貼地板
- 不要蓋住臉

---

## Files To Modify

- `src/scenes/OfficeScene.js`
- `src/config.js` only if bubble offset / size 已集中在 config

不要修改 `index.html`。

---

## Current Problems

目前對話泡泡：

- 有時出現在角色腳邊或身體下方
- 台詞超出泡泡範圍
- 泡泡太小，不適合 OBS 觀看
- 位置不像角色正在說話

---

## Bubble Placement Rule

請依角色分開處理。

### A-Ming Bubble

阿明哥的對話泡泡放在：

- 阿明哥頭部左側或左上側
- 靠近頭部，但不要蓋住臉
- 不要超出 LED 左側安全區
- 不要蓋住 LED 主標題

建議位置邏輯：

```js
bubbleX = charX - 260 ~ 320
bubbleY = charY - characterHeight + 80 ~ 130
```

若無法精準取得 characterHeight，可先用固定 offset。

### Xiaomei Bubble

小美姐的對話泡泡放在：

- 小美姐頭部右側或右上側
- 靠近頭部，但不要蓋住臉
- 不要超出右側 safe area
- 不要撞到右上 status panel
- 不要撞到右下 TOP5

建議位置邏輯：

```js
bubbleX = charX + 260 ~ 320
bubbleY = charY - characterHeight + 80 ~ 130
```

---

## Bubble Size

目前泡泡太小，請放大。

建議：

- width: 360 ~ 430px
- height: 105 ~ 140px
- padding: 18 ~ 24px
- fontSize: 20px 或 21px
- lineSpacing: 8 ~ 10
- wordWrap width: bubbleWidth - 40

文字必須完整包在泡泡內。

如果台詞太長：

- 允許最多 3 行
- 超過時可截斷並加 `...`
- 不要讓文字超出泡泡邊界

---

## Bubble Style

保留目前橘 / 青節目風格，但可提高可讀性。

建議：

- 深色半透明背景
- cyan 或 orange 細框
- 文字白色
- 少量 glow
- 不要過度 neon

阿明與小美可用不同框線色：

- 阿明：orange accent
- 小美：cyan accent

---

## Safe Area Rules

泡泡必須符合：

- left >= 40
- right <= 1880
- top >= 190
- bottom <= 900
- 不蓋住角色臉
- 不貼地板
- 不與 TOP5 大面積重疊
- 不與右上 status panel 大面積重疊

必要時請使用 clamp。

---

## Do Not Change

禁止修改：

- LED overlay
- background image
- host image assets
- host scale
- host x/y position
- TOP5 logic
- right status panel logic
- server.py
- API routes
- state schema
- mode system
- dialogue pipeline
- Phaser config

---

## Expected Result

完成後：

- 阿明哥講話時，泡泡在阿明頭部旁
- 小美姐講話時，泡泡在小美頭部旁
- 泡泡更大，文字不溢出
- 泡泡看起來像角色對話，而不是字幕掉在地板上
- LED / 背景 / 主持人站位維持不變
