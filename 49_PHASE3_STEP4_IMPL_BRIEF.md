# Phase 3 Step 4 — Host Action & Expression Assets（小美接線）

**狀態：** 完成
**範圍：** 只接小美，阿明完全未動
**檔案動作：** 3 檔（`src/config.js`、`src/scenes/BootScene.js`、`src/scenes/OfficeScene.js`）

---

## 一、任務目標

接入小美動作 spritesheet `assets/char_xiaomei_actions.png`，讓 `state.hosts.xiaomei.status` 切換時播對應 frame：

```
idle                  → frame 0  (xiaomei_idle)
talking / researching → frame 1  (xiaomei_talking)
thinking              → frame 2  (xiaomei_thinking)
reacting              → frame 3  (xiaomei_reacting)
```

> frame 4 = pointing、frame 5 = tired（保留給未來 emotion）

---

## 二、修改檔案

### 1. `src/config.js`

`customAssets` 區塊新增小美 actions 旗標、優先於 v2：

```diff
   customAssets: {
+    // Phase 3 Step 4: 小美動作 spritesheet（1024×1536 × 6 frames，優先於 v2）
+    // frame 0=idle, 1=talking, 2=thinking, 3=reacting, 4=pointing, 5=tired
+    char_xiaomei_actions: true,
+
     // 角色 v2 draft（Phase 3 Step 1.2 測試用，優先於 v1）
     char_aming_v2:   true,
     char_xiaomei_v2: true,
```

---

### 2. `src/scenes/BootScene.js`

#### 2a. `preload()` — 載入優先順序：actions > v2 > v1

```diff
+    // Phase 3 Step 4: 小美 actions spritesheet 優先（1024×1536 × 6 frames）
+    if (ca.char_xiaomei_actions) {
+      this.load.spritesheet('char_xiaomei', '/assets/char_xiaomei_actions.png', { frameWidth: 1024, frameHeight: 1536 });
+    } else if (ca.char_xiaomei_v2) {
       this.load.spritesheet('char_xiaomei', '/assets/char_xiaomei_v2_draft.png', { frameWidth: 1024, frameHeight: 1536 });
     } else if (ca.char_xiaomei) {
       this.load.spritesheet('char_xiaomei', '/assets/char_xiaomei.png', { frameWidth: 48, frameHeight: 64 });
     }
```

#### 2b. `_makeCharacters()` — 插入小美 actions 分支（在 v2 分支之前）+ v2 分支補 `talking` 同義動畫

```diff
+      } else if (role.id === 'xiaomei' && CONFIG.customAssets.char_xiaomei_actions) {
+        // Phase 3 Step 4: 小美 actions spritesheet（1024×1536 × 6 frames）
+        // frame 0=idle, 1=talking, 2=thinking, 3=reacting, 4=pointing, 5=tired
+        const FRAME_MAP = {
+          idle:     0,
+          talking:  1,
+          typing:   1,  // legacy alias（對話進行中時部分舊路徑仍呼叫 typing）
+          thinking: 2,
+          reacting: 3,
+        };
+        Object.entries(FRAME_MAP).forEach(([anim, frame]) => {
+          this.anims.create({
+            key: `${role.id}_${anim}`,
+            frames: [{ key: texKey, frame }],
+            frameRate: 1, repeat: -1,
+          });
+        });
       } else if ((role.id === 'aming'   && CONFIG.customAssets.char_aming_v2) ||
                  (role.id === 'xiaomei' && CONFIG.customAssets.char_xiaomei_v2)) {
         // v2 draft 單張 PNG（1024×1536，只有 frame 0）
-        ['idle', 'typing', 'thinking', 'reacting'].forEach(anim => {
+        // 加入 talking 同義動畫、讓阿明在新 status 切換邏輯下行為不變
+        ['idle', 'typing', 'talking', 'thinking', 'reacting'].forEach(anim => {
           this.anims.create({
```

> ⚠️ 重要：actions 分支放在 v2 分支「之前」，這樣小美命中 actions 不會落到 v2；阿明仍走 v2。

---

### 3. `src/scenes/OfficeScene.js`

#### 3a. `_applyState()` — 把 talking 改用 `_talking`、reacting 拆出獨立分支

```diff
       if (justBecameActive) {
         if (mod.last_output) {
           ch.bubbleText.setText(mod.last_output.slice(0, 80));
           this._showBubble(id);
         }
         if (['talking', 'researching'].includes(mod.status) && !ch.isWalking) {
-          ch.sprite.play(`${id}_typing`);
+          // Phase 3 Step 4: talking 用 _talking 動畫（小美 actions frame 1）
+          ch.sprite.play(`${id}_talking`);
           // Part 3: 移動凍結，不再走到其他角色
           if (!this._freezeMovement) { ... }
-        } else if (['thinking', 'reacting'].includes(mod.status)) {
+        } else if (mod.status === 'thinking') {
           ch.sprite.play(`${id}_thinking`);
           this._animateTyping(id);
+        } else if (mod.status === 'reacting') {
+          // Phase 3 Step 4: reacting 獨立分支、播 _reacting（小美 actions frame 3）、不再落到 thinking
+          ch.sprite.play(`${id}_reacting`);
+          this._animateTyping(id);
         }
```

#### 3b. `_playLineSequence()` — 對話 chunk 起手 typing → talking

```diff
       if (idx === 0) {
-        ch.sprite.play(`${line.speaker}_typing`);
+        // Phase 3 Step 4: 對話進行中播 _talking（小美 actions frame 1）
+        ch.sprite.play(`${line.speaker}_talking`);
```

#### 3c. `_playDialogue()` — walker 起手動畫（凍結時用 talking）

```diff
-    const walkerAnim = `${walkerId}_typing`;
+    // Phase 3 Step 4: movement frozen → walker 直接進入 talking 狀態
+    const walkerAnim = this._freezeMovement ? `${walkerId}_talking` : `${walkerId}_typing`;
     walker.sprite.play(walkerAnim);
```

#### 3d. `_runDemoStep()` — demo 對話也用 talking

```diff
-    ch.sprite.play(`${id}_typing`);
+    // Phase 3 Step 4: demo 對話也用 _talking 動畫
+    ch.sprite.play(`${id}_talking`);
```

---

## 三、未動的部分（嚴守限制）

| 項目 | 狀態 |
|---|---|
| `server.py` | ✅ 未動 |
| `wwt_state.json` | ✅ 未動 |
| `.env` | ✅ 未動 |
| API schema | ✅ 未改 |
| 阿明任何設定（站位、scale、actions 旗標）| ✅ 未動 |
| Walking / wander / random movement | ✅ 未恢復 |
| `_freezeMovement` 凍結邏輯 | ✅ 未動 |
| 主持人站位 | ✅ 未動 |
| Legacy `WWT` 名稱 | ✅ 保留 |

---

## 四、阿明影響分析

阿明仍走 v2 分支、行為「等價」於修改前：

| 動畫 key | 修改前 | 修改後 |
|---|---|---|
| `aming_idle` | frame 0 | frame 0 |
| `aming_typing` | frame 0 | frame 0 |
| `aming_talking` | **未定義** | frame 0（新增 alias）|
| `aming_thinking` | frame 0 | frame 0 |
| `aming_reacting` | frame 0 | frame 0 |

由於 v2 圖只有 frame 0，所有動畫畫面都一樣。新增 `aming_talking` 的目的是配合 OfficeScene 統一改用 `_talking` 而不會 crash。

---

## 五、Sanity Check

```bash
node -c src/config.js              # ✅ syntax OK
node -c src/scenes/BootScene.js    # ✅ syntax OK
node -c src/scenes/OfficeScene.js  # ✅ syntax OK
```

---

## 六、驗收方式

### A. 重整瀏覽器

`Ctrl+Shift+R` 強制重整 `http://localhost:8765`。

### B. 視覺驗證（小美）

| status | 預期姿勢 | 觸發方式 |
|---|---|---|
| `idle` | actions frame 0 | 啟動初始狀態 / `mode=idle` 時 |
| `talking` | actions frame 1 | `POST /api/chat` 觸發對話、輪到小美說話時 |
| `thinking` | actions frame 2 | server 推 `hosts.xiaomei.status=thinking` |
| `reacting` | actions frame 3 | server 推 `hosts.xiaomei.status=reacting` |

### C. 視覺驗證（阿明）

阿明維持 v2 單張圖、姿勢不變。確認：
- 站位仍在左半場
- 沒有跑動
- 對話時泡泡與動畫流程正常

### D. 手動觸發 reacting 狀態（驗證獨立分支）

```powershell
$body = [System.Text.Encoding]::UTF8.GetBytes('{"hosts":{"xiaomei":{"status":"reacting","last_output":"喔！是這樣喔！","emotion":"surprised"}}}')
Invoke-WebRequest -Method POST -Uri "http://localhost:8765/api/state" `
  -ContentType "application/json; charset=utf-8" -Body $body
```

預期：小美立即切到 frame 3（reacting 表情）、**不是** frame 2（thinking）。

---

## 七、Frame 對應總表

```
char_xiaomei_actions.png  (1024 × 1536) × 6 frames

frame 0  →  xiaomei_idle
frame 1  →  xiaomei_talking   ← talking / researching status
frame 1  →  xiaomei_typing    ← legacy alias
frame 2  →  xiaomei_thinking
frame 3  →  xiaomei_reacting  ← 不再 fallback 到 thinking
frame 4  →  (未使用，保留 pointing)
frame 5  →  (未使用，保留 tired)
```

---

## 八、下一步建議

依 `WWT_HANDOVER.md` Phase 3 Step 4 規劃、下一步可以：

1. **接阿明 actions spritesheet**（同樣方式、加 `char_aming_actions` 旗標 + BootScene + OfficeScene）
2. **擴展 emotion → frame 4/5 對應**：
   - `pointing` action 對應 `state.hosts.xiaomei.activity` 或新 action 欄位
   - `tired` 對應 `state.hosts.xiaomei.emotion=tired`
3. **若 Step 4 視覺驗收 OK**，再決定要不要 commit + push 到 GitHub

等 GPT 給下一個 Step 規格。
