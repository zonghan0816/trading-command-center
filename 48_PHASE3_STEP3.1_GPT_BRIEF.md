# Phase 3 Step 3.1 — Brand Rename + Smooth Background Crossfade

## Goal

目前早晨 / 中午 / 夜晚背景已可依本機時間載入。

本階段做兩件事：

1. 品牌從晚間節目改成 24 小時節目
2. 背景從硬切換改成依時間 crossfade
3. 凍結主持人走動邏輯，之後改用動作圖 / 表情圖切換

不要新增 API，不要重生圖片。

---

## Part 1 — Brand Rename

將節目品牌改為 24 小時版本。

### Text Changes

請全專案搜尋並替換可見文字：

```txt
晚晚嘴台灣 → 天天嘴台灣
WWT → TDT
Taiwan Tonight LIVE → Taiwan Daily Talk LIVE
Taiwan Tonight → Taiwan Daily Talk
```

### Expected Visible Text

Header:

```txt
天天嘴台灣  TDT
AI 鄉民聊天室 • Taiwan Daily Talk LIVE
```

LED label:

```txt
TDT Taiwan Daily Talk
```

或若空間不足：

```txt
TDT Daily Talk
```

請以畫面不爆版為優先。

---

## Part 2 — Smooth Background Crossfade

目前背景依時間硬切換。

請改成同時顯示兩張背景，用 alpha 做平滑過渡。

### Assets

已存在：

- `studio_bg_morning`
- `studio_bg_noon`
- `studio_bg_night`

不新增圖片。

---

## Time Rules

背景狀態以本機時間計算。

### Stable Periods

```txt
06:30 - 14:29  morning
15:30 - 16:59  noon
18:00 - 05:29  night
```

### Crossfade Periods

```txt
05:30 - 06:30  night → morning
14:30 - 15:30  morning → noon
17:00 - 18:00  noon → night
```

---

## Crossfade Logic

新增 helper，例如：

```js
_getTimeOfDayBackgroundMix() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();

  // Return:
  // { base: 'studio_bg_night', next: 'studio_bg_morning', alpha: 0.35 }
  // or stable:
  // { base: 'studio_bg_morning', next: null, alpha: 0 }
}
```

規則：

- `base` 是主要背景
- `next` 是淡入背景
- `alpha` 是 next 背景透明度，範圍 `0 ~ 1`
- 非過渡期 `next = null`

### Alpha Formula

在 transition 區間：

```js
alpha = (mins - start) / (end - start)
```

請 clamp 到 `0 ~ 1`。

---

## Rendering

在 `_buildBackground()`：

- 先畫 base background，alpha = 1
- 若 `next` 存在，再畫 next background，alpha = mix.alpha
- 兩張都：
  - origin `(0, 0)`
  - display size `1920 x 1080`
  - depth `0`

建議 next depth = `0.1` 或同層後畫即可。

---

## Optional Live Refresh

可以每 60 秒更新背景 alpha，讓長時間直播不中斷時也會慢慢變。

如果實作，請保持簡單：

- 建立 `this.bgBase`
- 建立 `this.bgNext`
- 每 60 秒呼叫一次 `_updateBackgroundMix()`
- 不做 tween
- 不做 fade animation system
- 不重建整個 scene

如果風險高，先只做 page load 計算即可。

---

## Part 3 — Freeze Host Movement

之後會接新版動作圖與表情圖。

因此本階段開始，主持人不要再走動。

### Requirement

請確認或調整：

- 阿明哥固定站在目前左側站位
- 小美姐固定站在目前右側站位
- 不要再依 mode / activity 走到其他位置
- 不要 wander
- 不要 lane walking
- 不要 random movement
- 不要 tween 移動角色位置
- 不要讓 bubble 因走動而重新漂移

角色之後只透過：

- idle image / animation
- talking image / animation
- thinking image / animation
- reaction image / animation
- emotion expression image / animation

來表現狀態。

### Implementation Guidance

若目前仍有 movement update / walker / lane / target position 邏輯：

- 可先停用呼叫
- 或讓 target 永遠等於 home position
- 或保留函式但不觸發移動

請不要大重構。

### Keep

可以保留：

- sprite animation `.play(...)`
- bubble show / hide
- speaker status 切換
- host emotion/status data

但不要再移動角色座標。

---

## Do Not Change

禁止修改：

- API routes
- state schema
- mode system
- dialogue pipeline
- host sprites
- host positions except disabling movement drift
- dialogue bubbles
- TOP5 layout
- right status panel layout
- Phaser config
- background image files

---

## Expected Result

完成後：

- 畫面品牌顯示為「天天嘴台灣 TDT」
- 英文顯示為「Taiwan Daily Talk LIVE」
- 早中晚背景不再硬切
- 過渡時段會以 crossfade 淡入下一張背景
- 非過渡時段維持單張背景
- 角色、LED、TOP5、泡泡功能維持正常
