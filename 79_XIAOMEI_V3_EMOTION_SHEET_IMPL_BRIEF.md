# 79 Xiaomei V3 Emotion Sheet Impl Brief

**承接**：79_CLAUDE_XIAOMEI_V3_EMOTION_SHEET_USAGE.md（Codex）
**Step**：Phase 4 Step 5.14
**狀態**：✅ 接好、flag 預設 OFF、等使用者翻 flag 視覺驗收

---

## 一、Files changed

| File | 變動 |
|---|---|
| `src/config.js` | 加 flag `customAssets.char_xiaomei_v3_emotion_sheet = false`（line 170-172）|
| `src/scenes/BootScene.js` | V3 加在 xiaomei load 優先序頂端 + 新 V3 anim 創建 branch |
| `src/scenes/OfficeScene.js` | sprite scale 與 `_chooseLineAction` 對 V2 / V3 兩個 emotion flag 一視同仁 |

---

## 二、Feature flag

```js
CONFIG.customAssets.char_xiaomei_v3_emotion_sheet = false  // 預設 OFF
```

按 Codex 79 號要求「Please do not directly replace the stable Xiaomei render」、不做全域取代。
使用者要開啟 → 改 `true`、瀏覽器 Ctrl+Shift+R。

Flag 互斥優先序（高 → 低）：

```
v3_emotion_sheet > v2_emotion_sheet > v3_actions > xiaomei_actions > v2_draft > v1
```

V3 排在最高、會覆蓋 V2。兩個都翻 ON 時也只會用 V3。

---

## 三、Scale 與站位

### Scale
- 沿用 `S.characterEmotion = 1.7`（Step 5.12 已加在 `config.js`）
- 來源：256×256 frame、目標 ≈ 430 px 高、跟阿明（1024×1536 × 0.28）對齊
- 計算：430 / 256 ≈ **1.68** → 取 1.7

### 站位
- 不動、沿用既有 `HOST_LANES.xiaomei = 0.65`、`setOrigin(0.5, 1)`
- 跟 V2 emotion sheet 站位邏輯一致

---

## 四、V3 vs Amin 視覺對比

| 項目 | 阿明（v2 draft）| 小美 V3 |
|---|---|---|
| 解析度 | 1024×1536 single frame | 256×256 × 28 frames |
| Scale | 0.28 → ~430 px 高 | 1.7 → ~430 px 高 |
| 風格 | hand-drawn anime | Codex 說「更 polished anime-pixel、比舊 16-bit 略乾淨」|
| 動作 | 靜止 1 frame | 7 表情 × 4 frame 循環 |

**風格匹配風險**（Codex 79 提到的）：

> V3 is cleaner and more usable... but it is slightly more polished anime-pixel than strict old-school 16-bit pixel art.

→ V3 風格可能跟阿明差距大、使用者需目視判斷是否需要請 Codex 也升級阿明。

---

## 五、Animation key mapping

| 既有 key | V3 row / frames | 目的 |
|---|---|---|
| `xiaomei_idle` | row 1 / 0-3 | 既有 OfficeScene 路徑相容 |
| `xiaomei_talking` | row 2 / 4-7 | 既有 |
| `xiaomei_typing` | row 2 / 4-7 | legacy alias |
| `xiaomei_thinking` | row 4 / 12-15 | 既有 |
| `xiaomei_reacting` | row 5 / 16-19 (surprised) | 既有 |
| `xiaomei_pointing` | row 7 / 24-27 (wave) | 既有 |
| `xiaomei_tired` | row 6 / 20-23 (skeptical) | 既有 |

| Codex 79 spec key | V3 row / frames |
|---|---|
| `xiaomei_v3_idle` | 0-3 |
| `xiaomei_v3_talk` | 4-7 |
| `xiaomei_v3_smile` | 8-11 |
| `xiaomei_v3_thinking` | 12-15 |
| `xiaomei_v3_surprised` | 16-19 |
| `xiaomei_v3_skeptical` | 20-23 |
| `xiaomei_v3_wave` | 24-27 |

| emo_* alias（跟 V2 共用、`_chooseLineAction` 透過 emotion 欄位走進來）|
|---|
| `xiaomei_emo_idle` / `_talk` / `_smile` / `_thinking` / `_surprised` / `_skeptical` / `_wave` |

---

## 六、Emotion 解析 fallback（與 V2 一致）

```
1. id !== 'xiaomei'        → 走既有 fallback（aming 動畫）
2. emotion sheet flag 全關  → 落到 keyword-driven 既有邏輯
3. flag on + emotion 缺     → keyword-driven
4. flag on + emotion 認識   → xiaomei_emo_${emotion}
5. flag on + emotion 不認識 → xiaomei_emo_talk
```

Backend 目前還沒在 prompt 加 emotion 欄位指引、所以實跑時 emotion 都會缺、走 keyword fallback。
等 V3 視覺驗收 OK 後、再考慮加 backend emotion instruction。

---

## 七、Visual check items（待使用者驗收）

| 項目 | 期待 | Codex 79 要求 |
|---|---|---|
| 腳底著地 | 不漂浮、不卡進地面 | ✓ |
| 跟阿明 scale 對齊 | 高度 ~430 px | ✓ |
| 頭、腳、手不被裁切 | full body 看完整 | ✓ |
| talk 嘴位 | 嘴在臉上明顯張合 | ✓（V2 修正項）|
| wave 手 | 從肩 → 肘 → 手連動、不浮 | ✓（V2 修正項）|
| emotion 切換 | 不分散直播注意力 | ✓ |
| 風格 vs 阿明 | 不違和 | ⚠️ 主觀判斷 |

---

## 八、Rollback

如果 V3 看起來有問題：
1. `config.js` 把 `char_xiaomei_v3_emotion_sheet` 改回 `false`
2. Ctrl+Shift+R
3. 回到 v2 draft 單張、零影響

可以同時把 `char_xiaomei_v2_emotion_sheet` 也保持 `false`、繼續用穩定 v2 draft。

---

## 九、不會做的事（除非使用者要求）

- ❌ 不全域取代穩定版（按 Codex 要求）
- ❌ 不改 backend prompt 加 emotion 指引（等視覺驗收）
- ❌ 不調 scale / 站位（等使用者報告再微調）
- ❌ 不刪 V2 emotion sheet flag（保留比較用）
