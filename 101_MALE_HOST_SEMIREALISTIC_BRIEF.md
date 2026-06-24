# 101 — 男主持「陳柏偉」改半寫實全身 AI 人像 — 素材製作 Brief（給 GPT / Codex 生圖）

> **用途**：把男主持陳柏偉（id `aming`、素材在 `assets/char_3q/`）從動漫風換成**半寫實全身人像**，
> 跟女主持王于安（100 號 brief）**同一風格**、兩人才搭。Claude 不生圖、這份給 GPT 照規格生。
> **建立**：2026-06-23。原始動漫版設定保留在 `assets/char_3q/PROMPT_BRIEF.md`。

---

## 0. 目標一句話

陳柏偉換成**半寫實全身人像**、**跟王于安同風格**（semi-realistic / 介於照片與插畫之間），沿用他既有人設與服裝。

---

## 1. 技術硬規格（對齊現有 pipeline）

| 項目 | 規格 |
|---|---|
| 尺寸 | **1254×1254 正方形**（跟現有檔一致、直接覆蓋同名檔） |
| 背景 | 生成時純綠 `#00B140` → 去背成**透明 RGBA** |
| 張數 | **17 張表情**（見下表）|
| 構圖 | **全身 head-to-toe 站姿**、置中、頭頂留白、腳近底部、左右留透明 |
| 朝向 | **正面、眼睛直視鏡頭**（跟女主持一致；他站左側 xRatio 0.37） |
| 路徑 | `assets/char_3q/emo_*.png` |

---

## 2. 角色人設（沿用既有、給模型抓特徵）

- **定位**：3Q 陳柏惟風 — 草根行動派 / 熱血政治人物兼 YouTuber
- **人格**：高表達、攻擊型、戰鬥力強、真誠不裝、為民發聲
- **外觀**：~40 歲台灣男性、短黑髮俐落、結實身形
- **服裝**：深藍色長袖襯衫 + 深灰長褲 + 黑色皮鞋（**避開純綠/純洋紅**、去背才乾淨；顏色選定後每張固定）
- ⚠️ **不可神似任何真實名人**（含真實的陳柏惟本人）— 避恐怖谷 + 避肖像/deepfake 疑慮、符合節目「大方承認是 AI」定位

---

## 3. ★ 一致性策略（同女主持）

1. **先只生 1 張 master（idle）** 把臉/髮/服裝/風格/構圖定死。
2. 滿意後**用它當 reference**（img2img / 同 seed /「沿用這個角色、只改表情」）生其餘 16 張，**只改表情 + 手勢**。
3. 全部生在純綠背景 → 用 `去背工具.bat` / `char_keyer.py` 去背對齊。

---

## 4. Master Prompt（idle 基準，英文）

```
A semi-realistic stylized FULL-BODY portrait of a Taiwanese male political-talk-show host / grassroots YouTuber, around 40, standing.
STYLE: semi-realistic, polished 3D-character render / stylized realism — between photo and illustration.
NOT flat anime, NOT full photorealistic. Soft, even, neutral white studio lighting, no harsh shadows.
He must NOT resemble any real public figure.

APPEARANCE (keep identical in every image):
- grassroots, energetic, sincere "man of the people" vibe; passionate and combative but warm
- short black hair, neat; fit athletic build
- dark navy-blue long-sleeve shirt, dark grey trousers, black leather shoes
  (avoid pure green / pure magenta so chroma key works)

FRAMING (keep identical in every image):
- FULL BODY, head to toe, whole figure visible, standing
- 1:1 SQUARE canvas 1254x1254; figure is tall, centered, small headroom above head, small gap below feet,
  empty background on the LEFT and RIGHT sides
- relaxed standing posture, facing forward (front view)
- head straight, EYES LOOKING DIRECTLY AT THE CAMERA / at the viewer — NOT looking to the side, not looking away
- background: flat solid chroma green (#00B140), evenly lit, no gradient   (or transparent)

EXPRESSION/POSE: calm composed neutral face, arms relaxed at sides (this is the "idle" base).
```

**只換最後一行 `EXPRESSION/POSE:`、其餘全部不動：**

| 檔名 | EXPRESSION/POSE |
|---|---|
| `emo_idle` | calm composed neutral face, arms relaxed at sides |
| `emo_passionate` | leaning forward, both arms open, mouth speaking, fighting-spirit eyes |
| `emo_combat` | arms crossed over chest, chin slightly tucked, sharp determined eyes |
| `emo_excited` | both fists raised, big open laugh, eyes wide |
| `emo_humor` | head tilted right, one shoulder shrugged, sly grin, one eyebrow raised |
| `emo_sincere` | both hands over heart, head slightly lowered, gentle sincere look |
| `emo_resilient` | one fist clenched at side, chest out, standing tall, confident smile |
| `emo_angry` | one hand pointing forward, deep frown, mouth open shouting |
| `emo_speech` | one arm pointing outward to the crowd, commanding strong presence |
| `emo_thinking` | one hand on chin, slight frown, focused thoughtful eyes, body slightly turned |
| `emo_mocking` | one-sided smirk, one eyebrow raised, one hand on hip, sarcastic look |
| `emo_sympathy` | hands clasped in front, head slightly lowered, concerned brows, solemn (NOT mocking) |
| `emo_surprised` | mouth open wide, eyes wide, one hand raised slightly forward, startled |
| `emo_explain` | both palms open facing up, leaning slightly forward, gesturing while explaining |
| `emo_mocking_laugh` | head back laughing with open mouth, one hand pointing forward, mocking burst of laughter |
| `emo_greeting` | one hand waving, toothy friendly smile, greeting pose |
| `emo_disgusted` | mouth corner down, frown, one hand pushing away, clear disdain |

---

## 5. 接圖流程（跟女主持差在 `--ref`）

去背工具**預設對齊女主持**，陳柏偉要對齊他自己 → 用命令列指定 `--ref`：

```
python tools/char_keyer.py 陳柏偉圖的資料夾 --ref assets/char_3q/emo_idle.png
```

1. 各圖命名成上表檔名（`emo_idle.png`…`emo_disgusted.png`）
2. 跑上面指令 → 去綠幕 + 對齊到他現有站位 + 輸出 `keyed/`
3. 把 `keyed/` 覆蓋進 `assets/char_3q/`
4. 重新整理就換好（尺寸/檔名一致、程式不用改）
5. 試水溫：先換 `emo_idle` + `emo_passionate` 兩張看效果

⚠️ **舉手姿勢**（excited 舉拳 / speech / angry / mocking_laugh 指向前）會讓人物外框變高 → 自動對高度可能把人縮小。那幾張若變小：單獨加 `--scale`（跟 idle 一樣的倍率）重跑，或生圖時手別舉超過頭頂。

---

## 6. 相關

- 女主持版：[`100_FEMALE_HOST_SEMIREALISTIC_BRIEF.md`](100_FEMALE_HOST_SEMIREALISTIC_BRIEF.md)
- 去背工具說明：[`tools/去背工具_說明.md`](tools/去背工具_說明.md)
- 原始動漫版設定（保留）：`assets/char_3q/PROMPT_BRIEF.md`
