# Claude 接圖指令報告 — 24H AI 聊天直播 MVP 素材

**狀態：** 接圖指令報告  
**目的：** 請 Claude 將 Codex 產出的 24H MVP PNG 素材接入 Phaser / BootScene / OfficeScene。  
**重要定位：** TDT 是 **24H AI 聊天直播**，新聞只是聊天話題來源。請不要把畫面導成新聞台、主播台、氣象台或報新聞節目。

---

## 一、接線總原則

1. 只接正式 PNG，不接 `_source_chromakey.png`、`*_raw.png`，除非明確需要回溯。
2. 所有角色 sheet 都是：

```txt
4096 × 1536
RGBA
4 frames 橫向排列
每 frame = 1024 × 1536
frame order = idle / talking / thinking / reacting
```

3. 天氣 / 道具 / 棚景 / UI 都是 PNG with alpha。
4. 保留現有 TDT 聊天直播風格，不恢復 walking / wander。
5. 主持人仍以固定站位 / 坐位 + frame 切換表現。
6. 若需要縮放與定位，請集中在 `config.js` 或 OfficeScene 的 asset placement 設定，不要硬改素材本身。

---

## 二、角色素材

### A 組角色（白天時段：早 / 午）

| key 建議 | 檔案 | 用途 |
|---|---|---|
| `char_A_man_standing_actions` | `assets/char_A_man_standing_actions.png` | A 男站姿 actions |
| `char_A_man_sitting_actions` | `assets/char_A_man_sitting_actions.png` | A 男坐姿 actions |
| `char_A_woman_standing_actions` | `assets/char_A_woman_standing_actions.png` | A 女站姿 actions |
| `char_A_woman_sitting_actions` | `assets/char_A_woman_sitting_actions.png` | A 女坐姿 actions |

### B 組角色（晚 / 深夜，含阿明小美重生）

| key 建議 | 檔案 | 用途 |
|---|---|---|
| `char_aming_standing_actions` | `assets/char_aming_standing_actions.png` | 阿明站姿 actions |
| `char_aming_sitting_actions` | `assets/char_aming_sitting_actions.png` | 阿明坐姿 actions |
| `char_xiaomei_standing_actions` | `assets/char_xiaomei_standing_actions.png` | 小美站姿 actions，已避開白外套 / 白光暈問題 |
| `char_xiaomei_sitting_actions` | `assets/char_xiaomei_sitting_actions.png` | 小美坐姿 actions |

### frame order

所有 4-frame sheet 統一：

```txt
0 idle
1 talking
2 thinking
3 reacting
```

若現有程式有 `pointing` / `tired` 等狀態，可先 fallback：

```txt
pointing -> talking
tired    -> thinking 或 idle
unknown  -> idle
```

---

## 三、時段 / 角色組建議

MVP 先用 4 時段：

```txt
06:00-12:00 morning     A 組 standing 或 sitting
12:00-18:00 afternoon   A 組 standing 或 sitting
18:00-24:00 evening     阿明 + 小美 standing 或 sitting
00:00-06:00 late_night  阿明 + 小美 sitting
```

建議：

- 早 / 午：A 組，較清爽。
- 晚：阿明 / 小美，保留目前 TDT 主角感。
- 深夜：坐姿為主，聊天節奏放慢。

這是初始建議，後續可由 config 調整，不要寫死太深。

---

## 四、棚景與天氣

### 棚景窗框分離版

| key 建議 | 檔案 | 用途 |
|---|---|---|
| `studio_base_window_separate` | `assets/studio_base_window_separate.png` | 1920×1080，左側窗外透明鏤空，保留棚景 |

此素材用途：

```txt
weather overlay 放底層
studio_base_window_separate 疊上層
角色 / 道具 / UI 再依原本層級疊
```

### 天氣 overlay

| key 建議 | 檔案 | 用途 |
|---|---|---|
| `weather_sunny` | `assets/weather_sunny.png` | 晴天窗外 |
| `weather_cloudy` | `assets/weather_cloudy.png` | 陰天窗外 |
| `weather_rainy` | `assets/weather_rainy.png` | 雨天窗外 |
| `weather_thunder` | `assets/weather_thunder.png` | 雷雨窗外 |
| `weather_typhoon` | `assets/weather_typhoon.png` | 颱風窗外 |

注意：

- 這些是窗外景，不是氣象圖卡。
- 不要加氣象台 UI、天氣 icon 或播報文字。
- `weather_snowy.png` 暫時不做。

---

## 五、道具 overlay

| key 建議 | 檔案 | 用途 |
|---|---|---|
| `prop_morning_set` | `assets/prop_morning_set.png` | 早上：麥克風架、咖啡杯等聊天道具 |
| `prop_afternoon_set` | `assets/prop_afternoon_set.png` | 下午：桌子、茶杯、點心 |
| `prop_evening_set` | `assets/prop_evening_set.png` | 晚上：聊天台 / 低棚台 |
| `prop_late_night_set` | `assets/prop_late_night_set.png` | 深夜：床、枕頭、床頭燈 |

注意：

- 這些是聊天直播時段感道具，不是新聞主播台。
- `prop_evening_set.png` 視覺偏大，接線時建議用 scale / position 調整。
- 道具可先作為背景前景 overlay，不一定第一版就與角色坐姿精準互動。

---

## 六、UI 元素

| key 建議 | 檔案 | 用途 |
|---|---|---|
| `ui_brand_24h_ai_live` | `assets/ui_brand_24h_ai_live.png` | 24H AI LIVE badge，512×118 |
| `ui_marquee_bg` | `assets/ui_marquee_bg.png` | 跑馬燈背景條，1920×60 |

注意：

- 跑馬燈文字仍用 HTML/CSS 或 Phaser text，不要把文字烤進 PNG。
- 這是聊天直播 UI，不是 breaking news lower-third。
- `ui_brand_24h_ai_live_raw.png` 和 `ui_marquee_bg_raw.png` 是備份，不必接。

---

## 七、不要接的來源 / 備份檔

以下類型只留作回溯，不要在 BootScene 直接 load：

```txt
*_source_chromakey.png
*_raw.png
```

正式接線只用不帶 source/raw 後綴的檔案。

---

## 八、建議實作順序

1. BootScene 先 load 新 assets。
2. 建立 4-frame spritesheet animation mapping：

```txt
idle     -> frame 0
talking  -> frame 1
thinking -> frame 2
reacting -> frame 3
```

3. OfficeScene 新增角色組 / 姿勢選擇：

```txt
time_of_day -> character group
mode / segment -> standing or sitting
status -> frame
```

4. 接 `studio_base_window_separate` + weather overlay：

```txt
weather below studio
studio_base_window_separate above weather
```

5. 接 prop overlay：

```txt
morning     -> prop_morning_set
afternoon   -> prop_afternoon_set
evening     -> prop_evening_set
late_night  -> prop_late_night_set
```

6. 接 UI badge / marquee bg。
7. 完成後產出新的 implementation brief。

---

## 九、驗收重點

1. 角色沒有白邊 / 半透明衣服問題。
2. 小美新版沒有原本白外套被吃掉的問題。
3. 4-frame frame order 正確。
4. 站姿 / 坐姿切換不跑版。
5. 天氣只出現在窗外，不蓋住棚景。
6. 道具不遮住主持人臉和泡泡。
7. UI 不像新聞台 lower-third。
8. 仍然是 **24H AI 聊天直播**，不是新聞台。

---

## 十、完成後請輸出

請新增 implementation brief，例如：

```txt
67_PHASE4_ASSET_WIRING_IMPL_BRIEF.md
```

內容包含：

- 接了哪些 assets。
- 新增哪些 BootScene keys / animations。
- OfficeScene 如何切角色組、姿勢、天氣、道具。
- 是否有縮放 / 定位參數。
- 測試與截圖觀察。
