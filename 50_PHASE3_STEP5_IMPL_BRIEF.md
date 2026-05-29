# Phase 3 Step 5 — 小美對台詞語氣動作

**狀態：** 完成
**範圍：** 從 status 對應動作升級到「台詞語氣 → 動作」，只對小美生效、阿明維持 talking
**檔案動作：** 2 檔（`src/scenes/BootScene.js`、`src/scenes/OfficeScene.js`），`config.js` 未動

---

## 一、任務目標

讓小美在 `_playLineSequence()` 中、每段對白依台詞內容選擇對應動作 frame：

| 動作 | frame | 何時觸發（小美專用）|
|---|---|---|
| `xiaomei_reacting` | 3 | 驚訝 / 反應 |
| `xiaomei_tired`    | 5 | 無奈 / 疲累 / 嘆氣 |
| `xiaomei_pointing` | 4 | 吐槽 / 提問 / 建議 |
| `xiaomei_thinking` | 2 | 思考 / 保留 / 轉折 |
| `xiaomei_talking`  | 1 | 一般發言（fallback）|

優先順序：`reacting > tired > pointing > thinking > talking`

阿明 / 其他角色：永遠 fallback `${id}_talking`（行為等同 Step 4）。

---

## 二、修改檔案

### 1. `src/scenes/BootScene.js`

`_makeCharacters()` 小美 actions 分支的 `FRAME_MAP` 新增 frame 4 / 5：

```diff
       } else if (role.id === 'xiaomei' && CONFIG.customAssets.char_xiaomei_actions) {
         // Phase 3 Step 4: 小美 actions spritesheet（1024×1536 × 6 frames）
         // frame 0=idle, 1=talking, 2=thinking, 3=reacting, 4=pointing, 5=tired
+        // Phase 3 Step 5: 新增 pointing / tired 動作、供 _chooseLineAction 依台詞語氣切換
         const FRAME_MAP = {
           idle:     0,
           talking:  1,
           typing:   1,  // legacy alias（對話進行中時部分舊路徑仍呼叫 typing）
           thinking: 2,
           reacting: 3,
+          pointing: 4,  // Phase 3 Step 5
+          tired:    5,  // Phase 3 Step 5
         };
```

---

### 2. `src/scenes/OfficeScene.js`

#### 2a. 新增 helper `_chooseLineAction(id, text, fallbackStatus = 'talking')`

```js
/**
 * Phase 3 Step 5: 依台詞語氣選動作（只對小美生效）
 * 阿明 / 其他角色：永遠回傳 `${id}_${fallbackStatus}`（預設 talking、行為與 Step 4 等價）
 * 小美：依關鍵字命中、優先順序 reacting > tired > pointing > thinking > talking
 *
 * 不改 API schema、純前端判斷；emotion 欄位若有未來也可在這裡擴展。
 */
_chooseLineAction(id, text, fallbackStatus = 'talking') {
  const fallback = `${id}_${fallbackStatus}`;
  if (id !== 'xiaomei') return fallback;

  const s = String(text || '');
  if (!s) return fallback;

  // [action, keywords] — 順序即優先序
  const PATTERN_ORDER = [
    ['reacting', ['靠', '真的假的', '怎麼可能', '蛤', '哇', '誒', '啊？', '喔？']],
    ['tired',    ['唉', '累', '頭痛', '麻煩', '嘆氣', '煩', '失望']],
    ['pointing', ['重點', '問題', '建議', '其實', '應該', '你看', '關鍵', '我說']],
    ['thinking', ['可能', '如果', '不過', '但是', '可是', '風險', '想法', '覺得']],
  ];

  for (const [action, keywords] of PATTERN_ORDER) {
    if (keywords.some(kw => s.includes(kw))) {
      return `${id}_${action}`;
    }
  }
  return fallback;
}
```

位置：插在 `_chunkText()` 之前。

#### 2b. `_playLineSequence()` 接線

```diff
       ch.bubbleText.setText(chunks[idx]);
       if (idx === 0) {
-        // Phase 3 Step 4: 對話進行中播 _talking（小美 actions frame 1）
-        ch.sprite.play(`${line.speaker}_talking`);
+        // Phase 3 Step 5: 依台詞語氣選動作（小美生效；阿明維持 talking）
+        const actionAnim = this._chooseLineAction(line.speaker, line.text, 'talking');
+        ch.sprite.play(actionAnim);
         this._showBubble(line.speaker);
         if (line.speaker === walkerId) this._syncBubble(walkerId);
       }
```

> ⚠️ 只動 `_playLineSequence()` 的 chunk 起手 play、其他位置（`_applyState` status 切換、`_runDemoStep` demo 對話、`_playDialogue` walker 起手）維持 Step 4 的 `_talking`、不過度入侵。

---

## 三、未動的部分（嚴守限制）

| 項目 | 狀態 |
|---|---|
| `server.py` | ✅ 未動 |
| `wwt_state.json` | ✅ 未動 |
| `.env` | ✅ 未動 |
| `src/config.js` | ✅ 未動（FRAME_MAP 已在 BootScene 內定義）|
| API schema / 後端欄位 | ✅ 未改 |
| 阿明任何邏輯 | ✅ 未動 |
| `_applyState` status → 動作邏輯 | ✅ 保留作為 fallback |
| Walking / wander / random movement | ✅ 未恢復 |
| `_freezeMovement` 凍結邏輯 | ✅ 未動 |
| 主持人站位 | ✅ 未動 |
| Legacy `WWT` 名稱 | ✅ 保留 |

---

## 四、邏輯走查（命中表）

| 台詞範例 | 命中規則 | 預期動作 |
|---|---|---|
| 「靠夭喔，太扯了」 | 「靠」（reacting，最高優先）| `xiaomei_reacting` |
| 「真的假的，怎麼可能」 | 「真的假的」（reacting）| `xiaomei_reacting` |
| 「唉，這真的很麻煩」 | 「唉」（tired 優先於 pointing 的「麻煩」）| `xiaomei_tired` |
| 「累死了」 | 「累」（tired）| `xiaomei_tired` |
| 「我覺得問題是 X」 | 「問題」（pointing 優先於 thinking 的「覺得」）| `xiaomei_pointing` |
| 「重點是，這個方向不對」 | 「重點」（pointing）| `xiaomei_pointing` |
| 「可能是這樣吧」 | 「可能」（thinking）| `xiaomei_thinking` |
| 「不過要小心風險」 | 「不過」（thinking，「風險」也命中 thinking）| `xiaomei_thinking` |
| 「今天天氣不錯」 | 無命中 → fallback | `xiaomei_talking` |
| `line.text` = `''` | 空字串 → fallback | `xiaomei_talking` |
| `line.text` = `undefined` | 防呆 → fallback | `xiaomei_talking` |
| 阿明任何台詞 | 阿明直接 fallback | `aming_talking` |

### 優先序測試（多重命中）

| 台詞 | 命中關鍵字 | 結果（依優先序）|
|---|---|---|
| 「靠，我覺得有問題」 | reacting「靠」 + pointing「問題」 + thinking「覺得」 | `xiaomei_reacting` |
| 「唉，這建議真的不錯」 | tired「唉」 + pointing「建議」 | `xiaomei_tired` |
| 「重點是可能會這樣」 | pointing「重點」 + thinking「可能」 | `xiaomei_pointing` |

---

## 五、Sanity Check

```bash
node -c src/scenes/BootScene.js    # ✅ syntax OK
node -c src/scenes/OfficeScene.js  # ✅ syntax OK
```

---

## 六、驗收方式

### A. 重整瀏覽器

`Ctrl+Shift+R` 強制重整 `http://localhost:8765`。

### B. 視覺驗證（自然對話流）

等 `/api/chat` 自動生成對話、觀察小美依台詞語氣切表情：

| 觀察點 | 預期 |
|---|---|
| 一般發言 | talking 姿勢 |
| 含「靠」「真的假的」「哇」 | reacting 姿勢 |
| 含「唉」「累」「麻煩」 | tired 姿勢 |
| 含「重點」「問題」「建議」 | pointing 姿勢 |
| 含「可能」「不過」「但是」「風險」 | thinking 姿勢 |
| 阿明任何台詞 | talking 姿勢（不變）|
| 主持人站位 | 固定、不走動 |

### C. 手動觸發特定動作（驗證命中邏輯）

注入特定 last_output、然後 `/api/chat`：

```powershell
# 觸發 reacting
$body = [System.Text.Encoding]::UTF8.GetBytes('{"hosts":{"xiaomei":{"status":"talking","last_output":"靠夭喔，這太扯了吧","emotion":"neutral"}}}')
Invoke-WebRequest -Method POST -Uri "http://localhost:8765/api/state" `
  -ContentType "application/json; charset=utf-8" -Body $body
```

但注意：此 helper 只在 `_playLineSequence()` 內生效（也就是 `/api/chat` 回傳的 dialogue 陣列被播放時），單純改 state 不會觸發。要驗證的話請等下一次自動 `/api/chat` 或手動呼叫。

---

## 七、Frame / 關鍵字總表（小美）

```
char_xiaomei_actions.png  (1024 × 1536) × 6 frames

frame 0  →  xiaomei_idle      ← idle status
frame 1  →  xiaomei_talking   ← talking / researching status / fallback
frame 1  →  xiaomei_typing    ← legacy alias
frame 2  →  xiaomei_thinking  ← thinking status / 含「可能、如果、不過、但是、可是、風險、想法、覺得」
frame 3  →  xiaomei_reacting  ← reacting status / 含「靠、真的假的、怎麼可能、蛤、哇、誒、啊？、喔？」
frame 4  →  xiaomei_pointing  ← 含「重點、問題、建議、其實、應該、你看、關鍵、我說」 ★ Step 5 新增
frame 5  →  xiaomei_tired     ← 含「唉、累、頭痛、麻煩、嘆氣、煩、失望」 ★ Step 5 新增
```

---

## 八、下一步建議

依 Phase 3 規劃、下一步可以：

1. **同樣方式接阿明**：阿明 actions spritesheet 出爐後、加 `char_aming_actions` 旗標 + BootScene 分支 + `_chooseLineAction` 移除 `id !== 'xiaomei'` 短路
2. **關鍵字表持續調整**：若實測時發現某些台詞被誤判，可微調 PATTERN_ORDER 內字串
3. **加入 emotion 欄位**：若後端 `state.hosts.xiaomei.emotion` 已有值（如 `surprised`、`tired`），可在 `_chooseLineAction` 內優先用 emotion、再用關鍵字 fallback。**不需改 schema**、純前端讀現有欄位即可
4. **若視覺驗收 OK**、再 commit + push 到 GitHub

等 GPT 給下一個 Step 規格。
