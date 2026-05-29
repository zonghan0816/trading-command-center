# Phase 3 Step 2.4 — Dialogue Bubble Fine Tune

## Goal

Step 2.3 泡泡方向正確。

本階段只做泡泡位置、文字可讀性、長台詞分段播放微調。

不要截斷吃掉台詞。

---

## File

- `src/scenes/OfficeScene.js`

---

## Fix 1 — A-Ming Bubble Closer

目前阿明泡泡太靠左，像獨立看板。

請調整：

- 阿明 `bubbleXOff` 從約 `-290` 改成 `-230 ~ -250`
- 保持在阿明頭部左側
- 不蓋住阿明臉
- 不貼左邊窗戶
- 不遮 LED 主文字

---

## Fix 2 — Xiaomei Bubble Safe Area

小美泡泡方向正確，但需避免撞右側 UI。

請確認：

- 小美 `bubbleXOff` 約 `+240 ~ +270`
- bubble right 不要超過 `1660`
- 避免撞右上 status panel
- 避免撞右下 TOP5 視覺區
- 不蓋住小美臉

---

## Fix 3 — Bubble Text Density

目前泡泡支援 4 行，但 OBS 看起來偏密。

請調整：

- 每個 bubble 最多顯示 3 行
- `bH` 從 `165` 改為 `135 ~ 145`
- `fontSize` 保持 `20` 或 `21`
- `lineSpacing` 保持 `6 ~ 8`
- `wordWrap width` 配合 bubble width，文字不得超出泡泡

---

## Fix 4 — Long Dialogue Auto Chunking

不要直接截斷長台詞。

如果台詞超過單一 bubble 可讀範圍，請切成多個 bubble chunks 依序播放。

### Chunk Rules

- 每個 bubble 最多 3 行
- 每個 chunk 約 `28 ~ 36` 個中文字
- 優先用標點切分：
  - `，`
  - `。`
  - `！`
  - `？`
  - `、`
  - `；`
  - `：`
- 沒有標點時，再用字數切
- 同一 speaker 的 chunks 連續播放
- 每個 chunk 停留 `1.8 ~ 2.4s`
- 最後一個 chunk 不加 `...`
- 除非真的被硬截斷，否則不要加 `...`

### Expected Behavior

原本一整句長台詞：

```txt
你有看到便利商店最近推出什麼新鮮貨嗎？好像每個月都要出新東西，真的很會搞話題。
```

應該依序播放成多個泡泡，例如：

```txt
你有看到便利商店最近推出什麼新鮮貨嗎？
```

接著：

```txt
好像每個月都要出新東西，真的很會搞話題。
```

不可吃掉後半段。

---

## Fix 5 — Bubble Vertical Position

泡泡高度大致可用，但請微調：

- 泡泡中心略高於角色頭部中心
- 不貼 LED 標題
- 不貼地板
- 不蓋住臉
- 角色移動或同步時，泡泡仍維持頭部旁位置

---

## Do Not Change

禁止修改：

- LED overlay
- 背景
- 角色位置
- 角色 scale
- TOP5
- API routes
- state schema
- mode system
- dialogue pipeline API shape
- Phaser config
- host image assets

---

## Expected Result

完成後：

- 阿明泡泡更靠近阿明頭部旁
- 小美泡泡保持在小美頭部旁且不撞右側 UI
- 泡泡最多 3 行，OBS 可讀
- 長台詞會分成多個泡泡依序播放
- 不會用 `...` 吃掉台詞內容
- LED / 背景 / 角色站位 / TOP5 維持不變
