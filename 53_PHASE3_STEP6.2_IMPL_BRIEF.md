# Phase 3 Step 6.2 — Dialogue Action Continuity + Clause-Level Action

**狀態：** 完成
**檔案動作：** 單檔 `src/scenes/OfficeScene.js`、3 處改動
**承接：** Phase 3 Step 6 / 6.1（Google News + 8 tone）

---

## 一、任務目標兩層

| Layer | 內容 | 修了什麼 bug |
|---|---|---|
| **A. Idle Restore** | 對話結束後、speaker 回 idle | 小美講完保持上一個動作（pointing / reacting / tired）卡住 |
| **B. Clause-Level Action** | 一句話內、每個 chunk 自選 action | 整句話只在 idx=0 選一次動作、後續 chunks 沒切 |

不改 API schema、不改後端、純前端 OfficeScene.js 修。

---

## 二、修改檔案

### 1. 新增 helper `_returnHostToIdle(id)`（插在 `_chooseLineAction` 後）

```js
_returnHostToIdle(id) {
  const ch = this.characters[id];
  if (!ch || ch.isWalking) return;
  ch.state = 'idle';
  ch.sprite.play(`${id}_idle`);
}
```

- isWalking 中或角色不存在：no-op（不打斷 walking 流程）
- 不動 bubble、不改 isWalking flag
- 純粹切 sprite 回 idle 動畫

### 2. `_chooseLineAction` 擴充 PHRASE_OVERRIDE 多字片語層

新增多字 phrase 優先層、放在 PATTERN_ORDER 之前：

```js
// Phase 3 Step 6.2: 多字 phrase 優先 override
// 順序對齊整體優先序：reacting > tired > pointing（同 chunk 多 phrase 命中時、reacting 先勝）
const PHRASE_OVERRIDE = [
  // reacting - 強烈反應（優先序最高）
  ['完全荒謬',     'reacting'],
  ['太誇張',       'reacting'],
  ['怎麼會這樣',   'reacting'],
  ['不是吧',       'reacting'],
  ['不可能吧',     'reacting'],
  ['我看了會瘋',   'reacting'],
  // tired - 經濟壓力 / 無奈
  ['誰買得起',     'tired'],
  ['買不起',       'tired'],
  ['薪水漲不動',   'tired'],
  ['漲不動',       'tired'],
  ['沒辦法',       'tired'],
  ['受不了',       'tired'],
  ['沒救了',       'tired'],
  // pointing - 帶問句指出
  ['所以呢',       'pointing'],
  ['重點是',       'pointing'],
  ['問題在',       'pointing'],
  ['問題就在',     'pointing'],
  ['關鍵是',       'pointing'],
  ['現在就是',     'pointing'],
];
for (const [phrase, action] of PHRASE_OVERRIDE) {
  if (s.includes(phrase)) return `${id}_${action}`;
}
```

PATTERN_ORDER 單字層也補了幾個常用詞：

```diff
 const PATTERN_ORDER = [
   ['reacting', ['靠', '真的假的', '怎麼可能', '蛤', '哇', '誒', '啊？', '喔？']],
-  ['tired',    ['唉', '累', '頭痛', '麻煩', '嘆氣', '煩', '失望']],
-  ['pointing', ['重點', '問題', '建議', '其實', '應該', '你看', '關鍵', '我說']],
-  ['thinking', ['可能', '如果', '不過', '但是', '可是', '風險', '想法', '覺得']],
+  ['tired',    ['唉', '累', '頭痛', '麻煩', '嘆氣', '煩', '失望', '無奈', '房價']],
+  ['pointing', ['重點', '問題', '建議', '其實', '應該', '你看', '關鍵', '我說', '所以']],
+  ['thinking', ['可能', '如果', '不過', '但是', '可是', '風險', '想法', '覺得', '假設']],
 ];
```

### 3. `_playLineSequence` showChunks 改 chunk-level action + 完句一律回 idle

```diff
     const showChunks = (idx) => {
       if (seq !== this._dialogueSeq) return;
       if (idx >= chunks.length) {
         this._hideBubble(line.speaker);
-        if (line.speaker !== walkerId) {
-          ch.sprite.play(`${line.speaker}_idle`);
-        }
+        // Phase 3 Step 6.2: 完句一律回 idle（不再限定 walkerId、修小美卡在最後動作 bug）
+        this._returnHostToIdle(line.speaker);
         this.time.delayedCall(300, () => this._playLineSequence(rest, walkerId, onComplete, seq));
         return;
       }
-      ch.bubbleText.setText(chunks[idx]);
-      if (idx === 0) {
-        const actionAnim = this._chooseLineAction(line.speaker, line.text, 'talking');
-        ch.sprite.play(actionAnim);
+      const chunk = chunks[idx];
+      ch.bubbleText.setText(chunk);
+      // Phase 3 Step 6.2: 每個 chunk 都自選 action（不再只 idx===0 選一次）→ 句內也能切多種動作
+      ch.sprite.play(this._chooseLineAction(line.speaker, chunk, 'talking'));
+      if (idx === 0) {
         this._showBubble(line.speaker);
         if (line.speaker === walkerId) this._syncBubble(walkerId);
       }
-      this.time.delayedCall(chunkMs(chunks[idx]), () => showChunks(idx + 1));
+      this.time.delayedCall(chunkMs(chunk), () => showChunks(idx + 1));
     };
```

### 4. `_playDialogue` 整輪結束時、確保兩主持人都回 idle

```diff
         this._playLineSequence(lines, walkerId, () => {
           if (seq !== this._dialogueSeq) return;
+          // Phase 3 Step 6.2: 整輪結束、確保兩主持人都回 idle + 收所有泡泡（防殘留）
+          this._returnHostToIdle('aming');
+          this._returnHostToIdle('xiaomei');
+          this._hideBubble('aming');
+          this._hideBubble('xiaomei');
           this._walkHome(walkerId, () => {
             if (seq !== this._dialogueSeq) return;
             this._chatInProgress = false;
             this.time.delayedCall(1100, this._fetchAndPlayDialogue, [], this);
           });
         }, seq);
```

---

## 三、驗收走查（已邏輯驗證）

### Case 1：「所以呢？現在完全荒謬啊！年輕人薪水漲不動，房價卻一直往上漲，誰買得起？怎麼會這樣！」

`_chunkText` 切 2 個 chunk：

| Chunk | 內容 | PHRASE_OVERRIDE 命中 | 動作 |
|---|---|---|---|
| 0 | 「所以呢？現在完全荒謬啊！年輕人薪水漲不動，」 | `完全荒謬` (reacting) | **reacting** |
| 1 | 「房價卻一直往上漲，誰買得起？怎麼會這樣！」 | `怎麼會這樣` (reacting) | **reacting** |

✅ chunk 0 符合「pointing 或 reacting」、chunk 1 符合「reacting」（reacting 優先序高於 tired）

### Case 2：「根本不可能吧。」

| Chunk | PHRASE_OVERRIDE 命中 | 動作 |
|---|---|---|
| 0 | `不可能吧` (reacting) | **reacting** ✅ |

### Case 3：「問題就在這，房價跟薪水完全不成比例。」

| Chunk | PHRASE_OVERRIDE 命中 | 動作 |
|---|---|---|
| 0 | `問題就在` (pointing) | **pointing** ✅ |

> 註：此句因長度 < 32 字、`_chunkText` 不切分、整句為 1 chunk。要做到「第一段 pointing、第二段 tired」需大改 `_chunkText`、不在本次範圍。

### Layer A 驗收（idle restore）

| 場景 | 改前 | 改後 |
|---|---|---|
| 小美講完最後 chunk | 卡在最後動作（pointing/reacting/tired）| 回 idle ✅ |
| 阿明講完最後 chunk（不是 walker）| 已 idle（既有邏輯）| 仍 idle ✅ |
| 整輪 dialogue 結束 | walker 之外的角色可能殘留動作 | 兩人都強制 idle ✅ |
| seq 不一致中斷 | — | guard return、不重設（避免幹掉新輪）✅ |

---

## 四、未動的部分（嚴守限制）

| 項目 | 狀態 |
|---|---|
| `server.py` | ✅ 未動 |
| `wwt_state.json` | ✅ 未動 |
| `.env` | ✅ 未動 |
| `assets/*` | ✅ 未動 |
| API schema | ✅ 未改 |
| `_chunkText()` | ✅ 未動（保留現有切分規則）|
| 阿明任何邏輯 | ✅ 不變（`_chooseLineAction` 對阿明仍 fallback `_talking`）|
| Walking / wander / random movement | ✅ 未恢復 |
| `_freezeMovement` 凍結邏輯 | ✅ 未動 |
| `_dialogueSeq` token / seq guard | ✅ 完整保留 |
| Step 6 / 6.1 Google News + 8 tone 機制 | ✅ 完整保留 |
| 主持人站位與尺寸 | ✅ 未動 |
| Legacy `WWT` 名稱 | ✅ 保留 |

---

## 五、🚨 小美 PNG 視覺問題（已知、不在本次修補範圍）

> ⚠️ **本任務不修素材**、純動作邏輯修正。PNG 視覺問題沿用 51 / 52 BRIEF 已知記錄、待 Codex 重生素材處理。

### 已知現象

`assets/char_xiaomei_actions.png` 在實際遊戲渲染下出現：

1. **白色西裝外套在深色舞台背景下變成深藍黑色**
   - 證據：截圖可見舞台燈條的橘藍色透出外套區域
   - 原因：AI 生圖去白底時、白色外套區也被一起變透明
2. **角色周圍白色細邊光暈**
   - 頭髮、肩膀、衣服邊緣可見灰白 alpha matte 殘留

### 不在程式端修的原因

- 不是 `OfficeScene.js` 的動作切換 bug
- 不是 `BootScene.js` 的 spritesheet frame 對應 bug
- 程式端**不用** tint / blendMode / alpha / scale / crop / mask 等方式硬修（會破壞其他正確的部分）
- 這是純素材層的問題、應交由 Codex 重生 PNG 處理

### 建議解法（給 GPT / Codex）

提示語建議加：
```
solid opaque white blazer, no transparency on body,
no white halo on edges, pure transparent background only outside character silhouette
```

需要替換的檔案：
- `assets/char_xiaomei_actions.png`（6 frame spritesheet、1024×1536 per frame）

---

## 六、Sanity Check

```bash
$ node -c src/scenes/OfficeScene.js
SYNTAX OK
```

---

## 七、實時驗收方式

### A. 重整瀏覽器

`Ctrl+Shift+R` 強制重整 `http://localhost:8765`。

### B. 觀察小美對話流程

1. **講完最後一段、是否回 idle**？
   - 之前：卡在最後動作（如 pointing 手指指著）
   - 預期：講完後 300ms 內回正常站姿（idle frame 0）

2. **同一句話內、動作是否會切換**？
   - 找一段含多種語氣的長台詞（>32 字、被切成 2+ chunks）
   - 預期：每段 chunk 動作可能不同（如 chunk 0 reacting、chunk 1 pointing）

3. **整輪對話結束、是否兩人都 idle**？
   - 預期：阿明跟小美都回 idle、所有泡泡消失、然後 1.1 秒後下一輪開始

### C. 觸發特定語氣（驗證 PHRASE_OVERRIDE）

設定 topic 並等對話自動生成、或注入特定台詞：

| Topic 範例 | 預期觸發 chunk 動作 |
|---|---|
| 房價飆漲 | tired（誰買得起 / 買不起 / 薪水漲不動）|
| 黃牛搶票 | reacting（太誇張 / 完全荒謬）|
| 政策亂象 | pointing（問題就在 / 重點是）|

---

## 八、下一步建議

1. **若視覺驗收 OK**、commit + push（含 Step 6 + 6.1 + 6.2 + Step 5.2 的所有改動）
2. **若關鍵字命中不夠準**：
   - 在 PHRASE_OVERRIDE 加更多片語
   - 或調整 PATTERN_ORDER 內單字
   - 純前端調整、不需重啟 server
3. **若 chunk 切分太粗**：未來改 `_chunkText`、把 `？` `！` 也當切點（不只 `，` `。`）
4. **PNG 視覺問題**：GPT / Codex 重生 `char_xiaomei_actions.png`
