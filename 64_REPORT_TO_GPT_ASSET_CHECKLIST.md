# 給 GPT 的短報告 #2 — 素材製作清單

**類型**：素材製作清單（短）
**長度目標**：1 頁內
**承接**：`62_24H_MVP_DISCUSSION_NOTES.md` 第 8 節（4 時段 × 2 組角色 × 同棚換道具 × 窗外天氣）
**請 GPT 做的是**：排程生成以下 PNG 素材

---

## 規格通則

| 項 | 規格 |
|---|---|
| 格式 | PNG with transparency（透明背景）|
| 角色 frame 尺寸 | **1024 × 1536**（跟現有 `char_xiaomei_actions.png` 對齊）|
| 場景 / overlay 尺寸 | **1920 × 1080**（跟 Phaser canvas 對齊）|
| 道具 / UI 元素 | 各自尺寸、保 transparency |
| 風格 | 沿用現有 TDT 風格（半寫實鄉民人物 + 棚景）|
| ⚠️ 必須避免 | 白邊光暈 / 衣服半透明 alpha 殘留（小美 PNG 既有問題、新角色不要重蹈）|

---

## 1. 角色 spritesheet（4 角色 × 站姿 + 坐姿 actions）

### A 組（暫定白天時段：6AM-12PM + 12PM-6PM）

| 檔名 | 內容 | Frame 數 |
|---|---|---|
| `char_A_man_standing_actions.png` | 站姿：idle / talking / thinking / reacting | 4 frames（橫向排）|
| `char_A_man_sitting_actions.png` | 坐姿：idle / talking / thinking / reacting | 4 frames |
| `char_A_woman_standing_actions.png` | 同上 | 4 frames |
| `char_A_woman_sitting_actions.png` | 同上 | 4 frames |

### B 組（暫定晚上時段：6PM-12AM + 12AM-6AM、含現有阿明小美）

| 檔名 | 內容 | Frame 數 |
|---|---|---|
| `char_aming_standing_actions.png` | 阿明站姿 4 frames | 4 frames |
| `char_aming_sitting_actions.png` | 阿明坐姿 4 frames | 4 frames |
| `char_xiaomei_standing_actions.png` | 小美站姿（重生、修白光暈問題）| 4 frames |
| `char_xiaomei_sitting_actions.png` | 小美坐姿 4 frames | 4 frames |

**4 角色 × 8 frame = 32 base frames**

> 註：之後若做 4 季衣服變化、可在 base 上做 colour shift / 衣物 overlay、不需重畫全身。

---

## 2. 棚景背景（1 個基本棚 + 窗框分離）

| 檔名 | 內容 | 尺寸 |
|---|---|---|
| `studio_base_window_separate.png` | **棚景但窗外鏤空**、保留窗框 | 1920×1080 |

⚠️ 重要：**窗戶區域要設計成透明 / 鏤空**、讓我們可以從後面疊上不同的天氣 overlay。

> 如果這樣難畫、可以做 2 張：「窗外晴天版」「窗外鏤空版」、之後我接線就行。

---

## 3. 道具 overlay（4 套、依時段疊加）

| 時段 | 檔名 | 內容 |
|---|---|---|
| 早上 | `prop_morning_set.png` | 麥克風架 + 咖啡杯 |
| 下午 | `prop_afternoon_set.png` | 桌子 + 茶杯 + 蛋糕盤 |
| 晚上 | `prop_evening_set.png` | 主播台 |
| 深夜 | `prop_late_night_set.png` | 2 張床 + 枕頭 + 床頭燈 |

每張獨立 PNG with transparency、定位用 OfficeScene 處理。

---

## 4. 窗外天氣 overlay（4-6 張）

| 檔名 | 內容 |
|---|---|
| `weather_sunny.png` | 晴天（藍天、可加雲）|
| `weather_cloudy.png` | 陰天（灰雲）|
| `weather_rainy.png` | 雨天（雨滴 + 雲）|
| `weather_thunder.png` | 雷雨（雲 + 偶爾閃光）|
| `weather_snowy.png` | 雪天（雪花飄落）|
| `weather_typhoon.png` | 颱風（狂風、樹枝晃）|

每張 1920×1080、只畫窗外可見區域（其他透明）。

---

## 5. UI 元素（24H AI LIVE 品牌 + 跑馬燈）

| 檔名 | 內容 | 尺寸 |
|---|---|---|
| `ui_brand_24h_ai_live.png` | 「24H AI LIVE」品牌字 + 圖標 | 自訂 |
| `ui_marquee_bg.png` | 跑馬燈背景條（半透明、橫長條）| 1920×60 左右 |

> 跑馬燈文字本身用 HTML/CSS、不需做圖。背景條 PNG 即可。

---

## 6. 季節變化（先不急、Phase 5 再排）

| 元素 | 後期再做 |
|---|---|
| 春夏秋冬衣服 colour shift | colour adjust 即可、不需重畫 |
| 冬季暖爐 prop | 1 張 PNG |
| 冬季厚棉被 prop | 1 張 PNG |
| 夏季冷氣 prop | 1 張 PNG（可選）|

---

## 統計

| 階段 | 數量 |
|---|---|
| **MVP 階段（必做）** | 角色 8 sheet + 棚景 1 + 道具 4 + 天氣 4-6 + UI 2 = **~19-21 張 PNG** |
| **Phase 5 擴充** | + 季節衣服 colour shift + 暖爐/棉被/冷氣 prop = + 3-4 張 |
| **預估工期** | 3-5 天（Codex 排程）|

---

## 給 GPT 的具體請求

請排程生成上述清單、優先序：

1. **最優先**：A 組 2 角色（A 男 + A 女）站姿 + 坐姿 = 4 sheet
2. **同優先**：阿明 / 小美**重生**站姿 + 坐姿 = 4 sheet（小美必修白光暈問題）
3. **次優先**：棚景窗框分離版
4. **平行做**：道具 4 套
5. **平行做**：天氣 overlay 4 張（晴/陰/雨/雷）
6. **平行做**：UI 元素 2 張
7. **最後做**：天氣 overlay 2 張（雪 / 颱風、Phase 5）

完成後請放到：`C:\Users\miner3\trading-command-center\assets`

Claude 會偵測新檔、自動在 BootScene 接線。
