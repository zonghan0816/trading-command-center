# Phase 3 Step 3 — Time-Based Background Switch

## Goal

目前夜晚版背景、角色、LED、TOP5、泡泡都已可用。

本階段只加入「依本機時間自動選背景」：

- morning
- noon
- night

不要新增 API，不要修改畫面布局。

---

## Assets

以下檔案已存在於 `assets/`：

- `assets/wwt_studio_background_morning_v1.png`
- `assets/wwt_studio_background_noon_v1.png`
- `assets/wwt_studio_background_night_v1.png`

---

## Files

- `src/scenes/BootScene.js`
- `src/scenes/OfficeScene.js`
- `src/config.js` only if needed

---

## Time Rules

使用瀏覽器本機時間 `new Date().getHours()`。

請先用簡單規則：

```txt
05:00 - 10:59  morning
11:00 - 16:59  noon
17:00 - 04:59  night
```

也就是：

- hour >= 5 && hour < 11 → morning
- hour >= 11 && hour < 17 → noon
- otherwise → night

---

## Task 1 — Preload All Backgrounds

在 `BootScene.js` 載入三張背景：

```js
this.load.image('studio_bg_morning', '/assets/wwt_studio_background_morning_v1.png');
this.load.image('studio_bg_noon', '/assets/wwt_studio_background_noon_v1.png');
this.load.image('studio_bg_night', '/assets/wwt_studio_background_night_v1.png');
```

---

## Task 2 — Select Background In OfficeScene

在 `OfficeScene.js` 選擇背景 key：

```js
_getTimeOfDayBackgroundKey() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'studio_bg_morning';
  if (h >= 11 && h < 17) return 'studio_bg_noon';
  return 'studio_bg_night';
}
```

然後 `_buildBackground()` 使用此 key。

---

## Task 3 — Optional Debug Log

可加一行 console log，方便確認：

```js
console.info('[WWT] studio background:', bgKey);
```

不要在畫面上新增 debug UI。

---

## Task 4 — No Live Switching Yet

本階段只在頁面載入時依時間選背景。

不要做：

- 每分鐘自動切換
- fade transition
- background animation
- API 控制
- state 欄位

之後若需要 24 小時直播不中斷切換，再另開 step。

---

## Do Not Change

禁止修改：

- host sprites
- host position
- host scale
- dialogue bubble placement
- dialogue chunking
- LED overlay
- TOP5 layout
- right status panel
- API routes
- state schema
- mode system
- dialogue pipeline
- Phaser config

---

## Expected Result

重新整理頁面後：

- 早上顯示 morning background
- 中午/下午顯示 noon background
- 晚上/凌晨顯示 night background
- 其他所有畫面元素位置與功能維持不變
