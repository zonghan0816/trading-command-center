# 92 — 窗外天氣背景圖：給 GPT 的生圖 Brief（素材清單）

**用途**：產生「窗外天氣」用的整張棚景背景變體（Step 5.39 引擎已就緒、就差這些圖）。
**接線方式**：放進 `assets/`、檔名照下方、然後 `src/config.js` 設 `weatherBg.enabled=true`、重開即生效（前端 `_resolveBgKey` 自動選、缺圖 fallback 晴天、60 秒 crossfade）。

---

## 0. ★ 最關鍵原則（不照做會 crossfade 對不齊）

> **單一母版 + 局部重繪（inpaint）。** 不要每張各自 img2img（會微漂移、切換看得出來）。

**正確流程**：
1. **選一張當「唯一母版」**（最乾淨的晴天棚景）。
2. **所有變體（其他時段 / 其他天氣）都從這張母版 inpaint** —— **遮罩鎖住整個棚景、只重畫「窗戶內景色 + 地板採光」兩塊**。
3. 鎖住的部分逐像素相同 → 窗框/LED/書架/地磚**完全不位移** → crossfade 完美。
4. **連舊的三張晴天背景也建議作廢、改用從母版 inpaint 出來的版本**（時段也是只改採光、不重畫棚），這樣全套都從同一母版長出來、彼此一定對齊。

**❌ 整張 img2img**：連該鎖的地方都被重畫 → 微漂移（= 目前遇到的問題）。
**✅ inpaint（遮罩窗+地板）**：只改窗+地板、其餘原封不動 → 零漂移。

**若工具不能 inpaint**（只能 img2img）：從**同一張母版** + **低重繪強度（low denoise / 高 structure 保真）**，漂移會小很多；且前端 60 秒 crossfade 本來就能吃掉「微小」漂移（只有明顯位移才鬼影）→ 可先丟一張實測再決定要不要苛求。

### 實測結論（2026-06-06）
整張 img2img 版實測：引擎可用、晴↔雨會切，**但「換得很明顯」= 整個棚景在漂移晃動**。確認要改用下面的母版 inpaint。

### inpaint 操作步驟（在母版身上挖、不要分開生）
1. 開**晴天母版**本身。
2. 遮罩**只塗兩塊**：① 左窗玻璃 ② 地板（光斑那片）。其餘不選。
3. 對遮罩區下指令：`make it rainy — rain outside the window, overcast dark sky, Taipei 101 in rain; floor darker and wet, no sunlight patches. Keep pixel-art style.`
4. 匯出 `studio_bg_{時段}_{天氣}.png`。其他天氣/時段都從母版挖同樣兩塊重畫。
> 關鍵：在母版上 inpaint＝棚景就是母版原始像素、沒有第二張要對齊 → 零漂移。比「分開生一張再合」乾淨。

### Claude 可代勞（窗戶區程式合成、保底）
窗戶在框內、漂移被框蓋住 → 可程式合成：使用者把「晴天母版 + GPT 雨天版」放 assets/、給檔名，Claude 寫 PIL 腳本把雨天版的窗戶區羽化貼到母版上。地板因地磚漂移會在接縫露出來 → 地板仍建議 inpaint。

**為什麼地板採光要一起改**：晴天=地上有明亮光斑、陰雨=地上沒有光斑且偏暗、夜晚=室內燈主導。窗外天氣和地板的光是綁在一起的，只改窗戶會「晴天的窗配陰天的地板」很怪。所以每張都是**完整 render**。

---

## 1. 檔案清單（放 `assets/`）

基準（晴天，已存在、當參考圖）：
- `wwt_studio_background_morning_v1.png` / `_noon_v1.png` / `_night_v1.png`

要生的變體（命名 = `studio_bg_{時段}_{天氣}.png`）：

| 時段 | 陰天 cloudy | 下雨 rain |
|---|---|---|
| morning（早）| `studio_bg_morning_cloudy.png` | `studio_bg_morning_rain.png` |
| noon（中）| `studio_bg_noon_cloudy.png` | `studio_bg_noon_rain.png` |
| night（夜）| `studio_bg_night_cloudy.png` | `studio_bg_night_rain.png` |

**優先順序建議**：先做 **rain 三張**（視覺最有感、最值得）→ 再 cloudy。缺的會自動 fallback 回晴天、不會壞，可以分批交。
（之後想加 `thunder` 雷雨 / `typhoon` 颱風也是同命名，config 的 `variants` 加上去即可。）

---

## 2. 規格（共同）

- 解析度 **1920×1080**、與現有棚景**完全相同的構圖/透視/比例**。
- **像素藝術風格**，與現有棚景一致（深藍灰牆面、橘色霓虹邊框、青色點綴燈、天花板聚光燈、左窗 101+城市、中央 LED 大螢幕、右側書架+植栽）。
- **只准變**：① 窗外景色 ② 整體光線溫度/亮度/氛圍 ③ 地板的窗光光斑/反射。
- **不准變**：窗框/百葉窗/窗台盆栽位置、LED 螢幕位置與外框、書架、燈具、地磚格線、舞台台階、所有室內物件的位置與形狀。

---

## 3. 各天氣描述（給 GPT 的英文 prompt 片段）

> 共同前綴（每張都加）：
> `Pixel-art TV talk-show studio interior, 1920x1080, KEEP the exact same composition, perspective, and position of ALL indoor objects as the reference image (window frame, blinds, windowsill plants, central LED screen + orange neon frame, right bookshelf, ceiling spotlights, floor tiles). ONLY change the view outside the left window, the overall lighting mood, and the light cast on the floor from the window. Same art style and palette.`

| 天氣 | 追加描述（英文） |
|---|---|
| **rain（日）** | `Outside the window: heavy rain, wet overcast grey sky, rain streaks on the glass, Taipei 101 dim in the haze. Room noticeably darker and cooler, NO bright sun patches on the floor, floor slightly wet/reflective with cool dim light, interior orange/cyan lights more visible.` |
| **rain（夜 night_rain）** | `Night, outside the window: rain at night, dark sky, rain streaks on glass, Taipei 101 lit up with neon city reflections blurred by rain. Room lit mainly by interior orange/cyan lights and spotlights, wet reflective floor catching neon, no sunlight.` |
| **cloudy（日）** | `Outside the window: overcast cloudy grey sky, flat diffuse soft light, Taipei 101 under grey clouds. Room evenly lit but muted/cooler, soft weak light on the floor (no sharp sun patches), slightly desaturated mood.` |
| **cloudy（夜）** | `Night, overcast: dark cloudy sky outside, Taipei 101 lit, no stars. Room lit by interior lights, dim soft floor reflections.` |

> 時段（morning/noon/night）再疊上色溫：morning＝偏暖晨光、noon＝最亮日光、night＝室內燈主導+窗外夜景。

---

## 4. 驗收

- 跟對應的晴天版**疊在一起切換**：窗框、LED、書架、地磚、盆栽**完全不位移**（會晃就是構圖跑掉、要重做）。
- 地板採光跟窗外天氣**一致**（雨天不該有大晴天的光斑）。
- 風格、霓虹色、像素感跟現有棚景一路。

---

## 5. 本機測試（Claude 給使用者）

不等 GPT 也能驗引擎：複製任一現有背景改名 `studio_bg_noon_rain.png` 放 `assets/` → `config.js` `weatherBg.enabled=true` → 重開 → 開 `/weather` 點「下雨」→ 看 60 秒 crossfade。
