# Phase 3 Step 3.1 實作報告：Brand Rename + Smooth Background Crossfade + Freeze Movement

## 目標

1. 品牌改名為 24 小時版本（TDT / 天天嘴台灣）
2. 背景從硬切換改為依時間 crossfade
3. 凍結主持人走動邏輯

---

## 修改檔案

- `src/scenes/OfficeScene.js`
- `src/config.js`
- `index.html`

---

## Part 1 — Brand Rename

### 替換對照表

| 舊 | 新 |
|---|---|
| 晚晚嘴台灣 | 天天嘴台灣 |
| WWT | TDT |
| Taiwan Tonight | Taiwan Daily Talk |
| Taiwan Tonight LIVE | Taiwan Daily Talk LIVE |

### 修改位置

**index.html:**
```diff
- <title>晚晚嘴台灣 WWT</title>
+ <title>天天嘴台灣 TDT</title>

- <div class="title">◆ 晚晚嘴台灣 WWT</div>
- <div class="subtitle">AI 鄉民聊天室 • Taiwan Tonight LIVE</div>
+ <div class="title">◆ 天天嘴台灣 TDT</div>
+ <div class="subtitle">AI 鄉民聊天室 • Taiwan Daily Talk LIVE</div>

- idle: { label: '◆ WWT  Taiwan Tonight', text: '晚晚嘴台灣', ... }
+ idle: { label: '◆ TDT  Taiwan Daily Talk', text: '天天嘴台灣', ... }
```

**src/config.js:**
```diff
- line1: '晚晚嘴台灣 WWT',
- line2: 'AI 鄉民談話台 · Taiwan Tonight',
+ line1: '天天嘴台灣 TDT',
+ line2: 'AI 鄉民談話台 · Taiwan Daily Talk',
```

---

## Part 2 — Smooth Background Crossfade

### 時段規則（分鐘計算）

| 時段 | 分鐘範圍 | 狀態 |
|---|---|---|
| 05:30–06:30 | 330–389 | 過渡：night → morning |
| 06:30–14:29 | 390–869 | 穩定：morning |
| 14:30–15:30 | 870–929 | 過渡：morning → noon |
| 15:30–16:59 | 930–1019 | 穩定：noon |
| 17:00–18:00 | 1020–1079 | 過渡：noon → night |
| 18:00–05:29 | 1080+ / <330 | 穩定：night |

### `_getTimeOfDayBackgroundMix()`

```js
_getTimeOfDayBackgroundMix() {
  const now  = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const clamp = (v) => Math.min(1, Math.max(0, v));

  if (mins >= 330 && mins < 390)
    return { base: 'studio_bg_night',   next: 'studio_bg_morning', alpha: clamp((mins-330)/60) };
  if (mins >= 390 && mins < 870)
    return { base: 'studio_bg_morning', next: null, alpha: 0 };
  if (mins >= 870 && mins < 930)
    return { base: 'studio_bg_morning', next: 'studio_bg_noon',    alpha: clamp((mins-870)/60) };
  if (mins >= 930 && mins < 1020)
    return { base: 'studio_bg_noon',    next: null, alpha: 0 };
  if (mins >= 1020 && mins < 1080)
    return { base: 'studio_bg_noon',    next: 'studio_bg_night',   alpha: clamp((mins-1020)/60) };
  return { base: 'studio_bg_night', next: null, alpha: 0 };
}
```

### Rendering（雙層背景）

```js
_buildBackground() {
  const mix = this._getTimeOfDayBackgroundMix();
  this.bgBase = this.add.image(0, 0, mix.base)
    .setOrigin(0,0).setDepth(0).setDisplaySize(W, H);
  this.bgNext = mix.next
    ? this.add.image(0, 0, mix.next).setOrigin(0,0).setDepth(0.1)
        .setDisplaySize(W, H).setAlpha(mix.alpha)
    : null;
}
```

### Live Refresh（每 60 秒）

```js
// create() 內：
this.time.addEvent({ delay: 60000, callback: this._updateBackgroundMix, callbackScope: this, loop: true });
```

`_updateBackgroundMix()` 更新 texture 與 alpha，不 tween、不重建 scene。

**效果：** 過渡期（60 分鐘）內每 60 秒 alpha 增加 ~1/60 ≈ 1.7%，1 小時完成完整 crossfade。

---

## Part 3 — Freeze Host Movement

### 機制

```js
// create() 加入：
this._freezeMovement = true;
```

### 凍結的三個觸發點

| 位置 | 說明 |
|---|---|
| `_applyState()` | API polling 觸發的 `_walkTo` → 加 `if (!this._freezeMovement)` |
| `_playDialogue()` | 對話開始前走路 → 凍結時直接 300ms 後進入對話 |
| `_runDemoStep()` | Demo 備援走路 → 同上 |

```js
_walkHome(id, onComplete) {
  if (this._freezeMovement) { if (onComplete) onComplete(); return; }
  ...
}
```

### 保留的動作

- `sprite.play(idle/typing/thinking)` ← 仍正常運作
- bubble show / hide ← 仍正常
- speaker status 切換 ← 仍正常

---

## 測試確認

| 測試項目 | 結果 |
|---|---|
| TEST A：morning → noon α=0.5 | ✅ |
| TEST B：noon → night α=0.5 | ✅ |
| TEST C：night → morning α=0.5 | ✅ |
| 主持人不再走動 | ✅ |
| 對話泡泡仍正常顯示 | ✅ |
| 品牌文字全部更新 | ✅ |

---

## 未修改

- API routes、state schema、mode system
- host sprites、dialogue bubbles、TOP5
- Phaser config、background image files
