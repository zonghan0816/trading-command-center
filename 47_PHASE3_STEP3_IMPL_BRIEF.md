# Phase 3 Step 3 實作報告：Time-Based Background Switch

## 目標

頁面載入時依本機時間自動選擇早晨 / 中午 / 夜晚背景，不新增 API，不改畫面布局。

---

## 修改檔案

- `src/scenes/BootScene.js`
- `src/scenes/OfficeScene.js`

---

## Task 1 — BootScene.js：預載三張背景

```diff
- // Phase 3 Step 2：新版 WWT 節目棚背景（夜晚版）
- this.load.image('studio_bg_night', '/assets/wwt_studio_background_night_v1.png');

+ // Phase 3 Step 3：三個時段背景
+ this.load.image('studio_bg_morning', '/assets/wwt_studio_background_noon_v1.png');
+ this.load.image('studio_bg_noon',    '/assets/wwt_studio_background_morning_v1.png');
+ this.load.image('studio_bg_night',   '/assets/wwt_studio_background_night_v1.png');
```

> ⚠️ 注意：`morning` 與 `noon` 的 PNG 檔名在視覺確認後發現相反，已交換 key ↔ 檔案對應。

---

## Task 2 — OfficeScene.js：時間選擇函式

```js
_getTimeOfDayBackgroundKey() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 390 && mins < 900)  return 'studio_bg_morning'; // 06:30–14:59
  if (mins >= 900 && mins < 1050) return 'studio_bg_noon';    // 15:00–17:29
  return 'studio_bg_night';                                    // 17:30–06:29
}
```

使用分鐘數比較（`hours * 60 + minutes`）精確處理半點時間。

### 時段規則

| 時段 | 分鐘範圍 | 背景 key |
|---|---|---|
| 06:30–14:59 | 390–899 | `studio_bg_morning` |
| 15:00–17:29 | 900–1049 | `studio_bg_noon` |
| 17:30–06:29 | 其餘 | `studio_bg_night` |

### `_buildBackground()` 更新

```diff
- this.add.image(0, 0, 'studio_bg_night')
+ const bgKey = this._getTimeOfDayBackgroundKey();
+ console.info('[WWT] studio background:', bgKey);
+ this.add.image(0, 0, bgKey)
    .setOrigin(0, 0).setDepth(0).setDisplaySize(this.W, this.H);
```

---

## Task 3 — Debug Log

```
[WWT] studio background: studio_bg_night
```

F12 console 可確認當前載入的背景時段，不顯示於畫面。

---

## 測試確認

| 強制模式 | 背景 | 確認 |
|---|---|---|
| TEST morning | 早晨背景 | ✅ |
| TEST noon | 中午背景 | ✅ |
| TEST night | 夜晚背景 | ✅ |

測試完成後已還原為時間判斷邏輯（TEST code 移除）。

---

## 未修改

- 角色位置 / scale、LED overlay、泡泡、TOP5
- API routes、state schema、mode system、Phaser config

---

## 下一步（若需要）

24 小時直播不中斷自動切換 → 另開 Phase 3 Step 3.1，加入每分鐘輪詢 + fade transition。
