# Phase 3 Step 2.4 實作報告：Dialogue Bubble Fine Tune

## 目標

泡泡位置微調、縮短高度、長台詞自動分段播放（不截斷內容）。

---

## 修改檔案

`src/scenes/OfficeScene.js`（唯一修改）

---

## Fix 1 — 阿明泡泡更靠近頭部

```diff
- Math.max(40 + bW / 2, charX - 290)
+ Math.max(40 + bW / 2, charX - 240)
```

X offset `-290` → `-240`，泡泡更靠近阿明頭部旁，不像獨立看板。

---

## Fix 2 — 小美泡泡安全區

```diff
- Math.min(1880 - bW / 2, charX + 290)
+ Math.min(1660 - bW / 2, charX + 250)
```

- X offset `+290` → `+250`
- 右側邊界從 `1880 - bW/2` 縮到 `1660 - bW/2`，bubble right ≤ 1660，避免撞右上 status panel 和 TOP5

---

## Fix 3 — 泡泡高度

| 版本 | bH | 說明 |
|---|---|---|
| Step 2.3 | 165 | 4 行 |
| Step 2.4 初版 | 140 | 3 行 |
| 用戶微調 | **115** | 更緊湊，OBS 可讀 |

---

## Fix 4 — 長台詞自動分段播放（Auto Chunking）

### 新增 `_chunkText(text, maxLen=32)`

```js
_chunkText(text, maxLen = 32) {
  const PUNCTS = new Set(['，', '。', '！', '？', '、', '；', '：']);
  const chunks = [];
  let s = text;
  while (s.length > 0) {
    if (s.length <= maxLen) { chunks.push(s); break; }
    let cut = -1;
    for (let i = Math.min(maxLen, s.length) - 1; i >= 8; i--) {
      if (PUNCTS.has(s[i])) { cut = i + 1; break; }
    }
    if (cut <= 0) cut = maxLen;
    chunks.push(s.slice(0, cut));
    s = s.slice(cut);
  }
  return chunks;
}
```

切分規則：
- 優先從 `，。！？、；：` 標點後切分
- 無標點時才按 maxLen 字數切
- 最後一段不加 `...`

### `_playLineSequence` 改為逐段播放

```js
const chunks = this._chunkText(line.text);
const chunkMs = (chunk) => Math.max(2800, 2500 + Math.floor(chunk.length / 10) * 350);

const showChunks = (idx) => {
  if (idx >= chunks.length) {
    this._hideBubble(line.speaker);
    ...
    this.time.delayedCall(500, () => this._playLineSequence(rest, walkerId, onComplete));
    return;
  }
  ch.bubbleText.setText(chunks[idx]);
  if (idx === 0) {
    ch.sprite.play(`${line.speaker}_typing`);
    this._showBubble(line.speaker);
    if (line.speaker === walkerId) this._syncBubble(walkerId);
  }
  this.time.delayedCall(chunkMs(chunks[idx]), () => showChunks(idx + 1));
};
showChunks(0);
```

### 顯示時間（chunkMs）

| chunk 字數 | 停留時間 |
|---|---|
| 最短 | **2800ms** |
| 20 字 | ~3200ms |
| 32 字 | ~3600ms |

初版 1800ms 太快，調整後改為 2800ms 起，閱讀體驗更自然。

### 效果

原台詞：`你有看到便利商店最近推出什麼新鮮貨嗎？好像每個月都要出新東西，真的很會搞話題。`

→ 分兩段播放：
1. `你有看到便利商店最近推出什麼新鮮貨嗎？`（3200ms）
2. `好像每個月都要出新東西，真的很會搞話題。`（3200ms）

台詞內容完整保留，不截斷。

---

## Fix 5 — 泡泡垂直位置

```diff
- headTopY + 110
+ headTopY + 70
```

泡泡中心從 `headTopY + 110` 拉到 `headTopY + 70`，略高於角色頭部中心，更貼近說話感。

---

## 最終泡泡規格

| 屬性 | 值 |
|---|---|
| 寬度 bW | 400px |
| 高度 bH | **115px** |
| 字型 | Microsoft JhengHei / PingFang TC / Arial |
| fontSize | 20px |
| lineSpacing | 6 |
| wordWrap | bW - 44 = 356px |
| 阿明 X offset | charX - 240（左側） |
| 小美 X offset | min(1460, charX + 250)（右側，right ≤ 1660） |
| 泡泡 Y | headTopY + 70（頭部略上方） |
| 阿明邊框色 | Orange `#FF8C00` |
| 小美邊框色 | Cyan `#00E5FF` |

---

## 未修改

- LED overlay、背景、角色位置 / scale
- TOP5、API routes、state schema、mode system
- dialogue pipeline API shape、Phaser config
