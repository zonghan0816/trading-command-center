# 100 — 女主持「王于安」改半寫實 AI 人像 — 素材製作 Brief（給 GPT / Codex 生圖）

> **用途**：把現有女主持（王于安、程式內部 id 仍為 legacy `xiaomei`）從目前風格換成**半寫實 AI 人像**。
> **這份是「素材清單」**，給 GPT/Codex 照規格生圖；Claude 不生圖。
> **建立**：2026-06-23。

---

## 0. 目標一句話

女主持換成**半寫實（semi-realistic）AI 人像** —— 介於照片與插畫之間、像高級 3D character render / stylized realism。**不是 flat anime、也不是 full photorealistic**。

---

## 1. 技術硬規格（不照做就接不進現有場景）

| 項目 | 規格 | 為什麼 |
|---|---|---|
| 尺寸 | **1254×1254 正方形** | 跟現有檔一模一樣 → 直接覆蓋同名檔、程式零修改 |
| 背景 | **透明 RGBA**（最終檔） | 現有 live 檔是去背後的透明圖；生成時可先用純色背景再去背 |
| 張數 | **12 表情 + 3 動作 = 15 張** | 對齊現有檔名（見下） |
| 構圖 | **全身 head-to-toe 站姿**、擺在 1254×1254 正方形裡置中、頭頂留一點白、腳靠近底部、**左右留大片透明** | 現有角色就是「全身人物塞進方框、左右透明」、開放式棚無桌、兩位都全身站姿 |
| 朝向 | 身體與視線**略朝畫面左方** | 她站右側（xRatio 0.68）、要面向中間/搭檔陳柏偉 |
| 站位 | 右側、場景內縮放 0.49 | config.js 已設定、不用改 |

**檔名清單（放 `assets/char_xiaomei/`、覆蓋同名）**：
```
emo_idle  emo_talk  emo_smile  emo_thinking  emo_surprised  emo_skeptical
emo_wave  emo_angry  emo_cheering  emo_laughing  emo_relieved  emo_sad
act_pointing  act_tired  act_walking
```
`emo_idle.png` 同時當 base texture（最重要、先做這張）。

---

## 2. ★ 一致性策略（半寫實最難、務必照做）

**不要 15 張各自獨立生 → 會變成 15 個長得不一樣的人。**

1. **先只生 1 張「主圖 master」**：臉/髮/妝/服裝/風格/構圖/打光一次定死。
2. 主圖滿意後，**用它當 reference（img2img / 同 seed /「沿用這個角色、只改表情」）** 生其餘 14 張；**身體位置、服裝、打光全不動，只改臉部表情 + 那一個手勢**。
3. 全部生在**純色好去背背景**（純綠 `#00B140` 或純洋紅、均勻無漸層）→ 再去背成透明 1254×1254 RGBA。（工具若能直接輸出透明 PNG 更省事。）

> 撇步：先打開現有 `assets/char_xiaomei/emo_idle.png` **照它的取景框**生新主圖 → 替換後位置不會跑。

---

## 3. 角色設定（王于安、給模型抓特徵 — 可調，但定下來後每張都重複貼）

- ~30 歲台灣女性、女主播底子轉政論 talk show 主持
- 知性、專業、但網感重、親和、反差萌、Podcast 控場氣場
- 髮：及肩深棕、微捲、俐落
- 妝：自然清透、紅唇點綴
- 服裝：合身西裝外套 + 簡單內搭（**避開純綠/純洋紅**，否則去背會吃掉）
- 配件（可選）：細框眼鏡 / 小耳環
- ⚠️ **不可神似任何真實名人**（避恐怖谷 + 避肖像/deepfake 疑慮；也符合節目「大方承認是 AI」定位）

---

## 4. Master Prompt 範本（英文，生圖模型較準）

```
A semi-realistic stylized portrait of a Taiwanese female news/political-talk-show host, around 30 years old.
STYLE: semi-realistic, polished 3D-character render / stylized realism — between photo and illustration.
NOT flat anime, NOT full photorealistic. Soft, even, neutral white studio lighting, no harsh shadows,
no strong directional light (she will be composited onto changing day/night/weather backgrounds).
She must NOT resemble any real public figure.

APPEARANCE (keep identical in every image):
- intelligent, approachable yet professional; warm "internet-savvy podcast host" vibe
- shoulder-length dark-brown soft wavy hair, neat
- light natural makeup, subtle red lip
- fitted blazer over a simple top (avoid pure green / pure magenta so chroma key works)
- [optional: thin-frame glasses / small earrings]

FRAMING (keep identical in every image):
- FULL BODY, head to toe, whole figure visible, standing
- 1:1 SQUARE canvas 1254x1254; figure is tall, centered, small headroom above head, small gap below feet,
  empty background on the LEFT and RIGHT sides
- relaxed professional standing posture, facing forward (front view)
- head straight, EYES LOOKING DIRECTLY AT THE CAMERA / at the viewer — NOT looking to the side, not looking away
- background: flat solid chroma green (#00B140), evenly lit, no gradient   ← or transparent if supported

EXPRESSION/POSE: calm pleasant neutral face, arms relaxed (this is the "idle" base).
```

**只換最後一行 `EXPRESSION:`、其餘全部不動**（一致性關鍵）：

| 檔名 | EXPRESSION / gesture |
|---|---|
| `emo_idle` | calm, pleasant neutral resting face |
| `emo_talk` | mid-sentence, mouth open speaking, engaged, expressive eyebrows |
| `emo_smile` | warm genuine closed-mouth smile, friendly |
| `emo_thinking` | thoughtful, hand lightly near chin, eyes looking up-aside |
| `emo_surprised` | eyebrows raised, eyes wide, slight open mouth |
| `emo_skeptical` | one eyebrow raised, slight smirk, doubtful / unconvinced |
| `emo_wave` | friendly waving one hand, welcoming bright smile |
| `emo_angry` | frowning, stern, sharp critical look (on-air call-out), not aggressive |
| `emo_cheering` | excited, big smile, light fist-up / clapping energy |
| `emo_laughing` | laughing, eyes crinkled, head slightly back, natural joy |
| `emo_relieved` | relaxed soft exhale smile, eased shoulders |
| `emo_sad` | empathetic, gentle downturned brows, sincere / sympathetic (tragedy topics) |
| `act_pointing` | pointing one hand toward the screen, presenting |
| `act_tired` | weary, slightly slumped, soft eyes |
| `act_walking` | mid-stride walking pose (legacy, rarely used) |

---

## 5. 接圖流程（生完之後）

1. 去背 → 透明 → 存成 **1254×1254 RGBA PNG**。
2. **用原本檔名**丟回 `assets/char_xiaomei/` 覆蓋。
3. 瀏覽器重新整理就換好（尺寸/檔名/張數一致、**程式完全不用動**）。
4. 試水溫：先只換 `emo_idle` + `emo_talk` 兩張看效果，OK 再補齊其餘 13 張。

---

## 6. 提醒

- 用**支援角色一致性**的方式：同 seed / 提供 master 當 reference image / img2img 只改臉。純 text2img 每張重抽臉會跑掉。
- 男主持「陳柏偉」（id `aming`、9~19 emotion、在 `assets/char_3q/`）**這次不動**；若之後也要改半寫實，比照本 brief、注意他在左側、視線朝右。
- 男女兩位若一個換半寫實、一個還是舊風格會違和 → 視效果決定要不要陳柏偉也一起換。
