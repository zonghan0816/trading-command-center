# 73 Xiaomei Emotion Sheet Impl Brief

**承接**：73_CLAUDE_XIAOMEI_EMOTION_SHEET_USAGE.md（Codex）
**Step**：Phase 4 Step 5.12
**狀態**：✅ 接好、預設 OFF、等使用者翻 flag 視覺驗收

---

## 一、Files changed

| File | 變動 |
|---|---|
| `src/config.js` | 加 flag `customAssets.char_xiaomei_v2_emotion_sheet = false`、加 `scale.characterEmotion = 1.7` |
| `src/scenes/BootScene.js` | 載入 emotion sheet（256×256）+ 創 14 個 animation key |
| `src/scenes/OfficeScene.js` | sprite scale 分支、`_chooseLineAction` 接 `emotion` 參數、playback 傳 `line.emotion` |

---

## 二、Feature flag

```js
CONFIG.customAssets.char_xiaomei_v2_emotion_sheet = false  // 預設 OFF
```

按 Codex 73 號要求「behind a feature flag first」、預設不啟用。
使用者要開啟 → 改成 `true`、瀏覽器 Ctrl+Shift+R。

---

## 三、Scale 與站位

### Scale
- `S.characterEmotion = 1.7`（在 `config.js`）
- 來源：emotion sheet 256×256、目標跟現有 v2 (1024×1536 × 0.28 ≈ 430 px 高) 對齊
- 計算：430 / 256 ≈ **1.68** → 取 1.7
- 使用者可在 `config.js` 微調此值

### 站位
- **不動**、沿用既有 `HOST_LANES.xiaomei = 0.65`、`charScale.setOrigin(0.5, 1)`
- 椅子 yOffset 不改、setOrigin 0.5/1 = 腳底對齊地面
- 若視覺上感覺漂浮或下沉、調 `STATIONS.xiaomei.yOffsetFromWall`（src/scenes/config.js）

---

## 四、Emotion 解析 / fallback

### 解析流程

```
dialogue line:
  { "speaker": "xiaomei", "text": "...", "emotion": "thinking" }

_chooseLineAction(id, text, fallback, emotion):
  1. id !== 'xiaomei'                   → 走既有 fallback
  2. flag off OR emotion 缺              → 落到既有 keyword-driven 邏輯
  3. flag on + emotion 在 allowed list    → xiaomei_emo_${emotion}
  4. flag on + emotion 不在 allowed list  → xiaomei_emo_talk
```

### Allowed emotion values

```
idle / talk / smile / thinking / surprised / skeptical / wave
```

### Fallback 規則（與 Codex 73 一致）

- emotion 缺 → keyword-driven 既有邏輯（reacting/tired/pointing/thinking/talking）
- emotion 不認識 → `xiaomei_emo_talk`
- 不在說話 → `xiaomei_idle`（既有 `_returnHostToIdle` 自動切）

### Backend 是否生成 emotion 欄位？

**目前不強制**。Claude prompt 沒有加 emotion instruction、所以絕大多數 line 不會帶 emotion → 自動 fallback 到 keyword-driven 既有邏輯。
等視覺驗收 OK 後、再考慮在 `_build_prompt` 加 emotion 提示。

---

## 五、Animation key mapping

### 既有 key（OfficeScene 內部用、向下相容）

| Key | Row | Frames | FrameRate |
|---|---|---|---|
| `xiaomei_idle` | 1 idle | 0-3 | 4 |
| `xiaomei_talking` | 2 talk | 4-7 | 5 |
| `xiaomei_typing` | 2 talk | 4-7 | 5 |
| `xiaomei_thinking` | 4 thinking | 12-15 | 4 |
| `xiaomei_reacting` | 5 surprised | 16-19 | 5 |
| `xiaomei_pointing` | 7 wave | 24-27 | 5 |
| `xiaomei_tired` | 6 skeptical | 20-23 | 4 |

### 新 emotion-specific key（line.emotion 直接呼叫）

| Key | Row | Frames | FrameRate |
|---|---|---|---|
| `xiaomei_emo_idle` | 1 idle | 0-3 | 4 |
| `xiaomei_emo_talk` | 2 talk | 4-7 | 5 |
| `xiaomei_emo_smile` | 3 smile | 8-11 | 4 |
| `xiaomei_emo_thinking` | 4 thinking | 12-15 | 4 |
| `xiaomei_emo_surprised` | 5 surprised | 16-19 | 5 |
| `xiaomei_emo_skeptical` | 6 skeptical | 20-23 | 4 |
| `xiaomei_emo_wave` | 7 wave | 24-27 | 5 |

---

## 六、Visual test notes（待使用者驗收）

| 檢查項 | 期待 | 方法 |
|---|---|---|
| Scale 對齊阿明 | 高度 ~430 px、跟阿明差不多 | 開 flag、重整、目視 |
| 腳底著地 | 不漂浮、不卡進地面 | yOffsetFromWall 對齊舊版 |
| Bubble 不擋臉 | 對話泡泡在頭上、不蓋臉 | bubble 既有 480×135 位置 |
| 不 SD/chibi 感 | 1920×1080 看起來比例正常 | 視覺判斷 |
| 7 種表情切換 | idle/talk/smile/thinking/surprised/skeptical/wave 流暢 | flag on + 開發者把 line.emotion 寫死測各種 |

---

## 七、未驗證 / 後續

- ❌ Backend prompt 還沒加「請輸出 emotion 欄位」指引、實跑時 emotion 都會缺 → 走既有 keyword fallback
- ❌ Scale 1.7 是計算值、實際可能要調 1.5-2.0
- ❌ 沒測過 emotion sheet 角色的腳底 Y 偏移（256×256 內角色可能在中央、不在底部）
- ❌ 阿明還沒有對應 emotion sheet（這份只接小美）

要等使用者翻 flag、目視結果、回報是否要：
- 調 scale
- 調 station offset
- 加 backend prompt instruction
- 接阿明 emotion sheet（如果有的話）

---

## 八、Rollback

如果開了 flag 看起來壞掉：
1. `config.js` 把 `char_xiaomei_v2_emotion_sheet` 改回 `false`
2. Ctrl+Shift+R
3. 回到 v2 draft（單張 PNG）的舊版視覺、零影響

不會破其他模組、不會影響 backend。
