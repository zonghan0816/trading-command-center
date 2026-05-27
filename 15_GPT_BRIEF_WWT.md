# Phase 2C Step 3 完成報告

## 修改檔案

| 檔案 | 動作 |
|---|---|
| `src/scenes/BootScene.js` | 2 處修改（preload frame 尺寸 + 新增 aming/xiaomei 專屬動畫分支） |

其他檔案未動：
- `src/config.js` ✅ 未動
- `src/scenes/OfficeScene.js` ✅ 未動
- `index.html` ✅ 未動
- `server.py` ✅ 未動

---

## 修改 1：preload spritesheet frame 尺寸

**位置**：BootScene.js line 28-33

```diff
   if (ca.char_aming) {
-    this.load.spritesheet('char_aming', '/assets/char_aming.png', { frameWidth: 16, frameHeight: 32 });
+    this.load.spritesheet('char_aming', '/assets/char_aming.png', { frameWidth: 48, frameHeight: 64 });
   }
   if (ca.char_xiaomei) {
-    this.load.spritesheet('char_xiaomei', '/assets/char_xiaomei.png', { frameWidth: 16, frameHeight: 32 });
+    this.load.spritesheet('char_xiaomei', '/assets/char_xiaomei.png', { frameWidth: 48, frameHeight: 64 });
   }
```

192×64 PNG / 48×64 frame → 4 個 frame，符合 13_BRIEF Step 1 spritesheet 規格。

---

## 修改 2：新增 aming/xiaomei 專屬動畫分支

**位置**：BootScene.js `_makeCharacters()` 內、第二分支（boss）之前。

### 為什麼要新分支

原本 `_makeCharacters()` 有 3 個分支：

| 條件 | 行為 |
|---|---|
| `!isCustom && role.id !== 'boss'` | 程序生成 48×64（fallback） |
| `role.id === 'boss' && customAssets.char_boss` | Boss 8 cols × 3 rows spritesheet 動畫 |
| `else` | Pixel Agents 16×32 通用動畫（frame [0,1,2,1] / [5,6]） |

Step 2 把 `customAssets.char_aming/xiaomei` 開為 true 後，阿明小美**落到第三分支**，frame index 套到 [5, 6] 等不存在的 frame、視覺錯亂。

### 新分支內容

```js
} else if ((role.id === 'aming'   && CONFIG.customAssets.char_aming) ||
           (role.id === 'xiaomei' && CONFIG.customAssets.char_xiaomei)) {
  // 阿明哥 / 小美姐 spritesheet（192×64，4 幀 × 48×64）
  // Frame 0 = idle / Frame 1 = talk / Frame 2 = react / Frame 3 = think
  this.anims.create({ key: `${role.id}_idle`,     frames: [{ key: texKey, frame: 0 }],
                       frameRate: 1, repeat: -1 });
  this.anims.create({ key: `${role.id}_typing`,   frames: [0,1,1,0].map(f => ({ key: texKey, frame: f })),
                       frameRate: 5, repeat: -1 });
  this.anims.create({ key: `${role.id}_thinking`, frames: [2,3].map(f => ({ key: texKey, frame: f })),
                       frameRate: 3, repeat: -1 });
  this.anims.create({ key: `${role.id}_reacting`, frames: [{ key: texKey, frame: 2 }],
                       frameRate: 1, repeat: -1 });
}
```

### Frame Index 對照表（依 GPT 指令）

| 動畫 key | Frame Index | GPT 指令 | 對應 spritesheet 圖層 |
|---|---|---|---|
| `aming_idle` / `xiaomei_idle` | `[0]` | idle = [0] ✓ | Frame 0 idle 站立 |
| `aming_typing` / `xiaomei_typing` | `[0, 1, 1, 0]` | talking = [0,1,1,0] ✓ | 站 → 開口 → 開口 → 站（嘴巴開合循環）|
| `aming_thinking` / `xiaomei_thinking` | `[2, 3]` | thinking = [2,3] ✓ | react → think 來回 |
| `aming_reacting` / `xiaomei_reacting` | `[2]` | reacting = [2] ✓ | Frame 2 驚訝/吐槽 |

⚠️ 命名 note：GPT 指令用「talking」、但 OfficeScene `_applyState` 用的動畫 key 是 `_typing`（沿用既有約定，避免動 OfficeScene）。

---

## 動畫設計理由

- **idle [0]**：純站立（阿明拿咖啡杯、小美拿手機，符合 Step 1 spritesheet 規格）
- **typing [0,1,1,0]**：阿明說話 = 站 → 微前傾開口 ×2 → 站，模擬嘴巴開合
- **thinking [2,3]**：眉毛上揚 ↔ 左手碰下巴，符合「思考」表情切換
- **reacting [2]**：純驚訝/吐槽 frame，配合 talking 切換用

frameRate 跟既有程序生成版本一致（idle=1 / typing=5 / thinking=3）。

---

## 回報事項

### 1. 是否正常顯示角色

**待瀏覽器驗證**，但理論上：
- PNG frame 切割已對齊（48×64）→ 不再看到「12 個 16×32 變形小塊」
- 動畫 frame index `[0]` / `[0,1,1,0]` / `[2,3]` / `[2]` 都在 0-3 範圍內 → 不會越界

### 2. 是否仍有切割錯誤

**理論上已修正**：
- 192×64 PNG ÷ 48×64 frame = 4 個 frame（完美整除）
- Phaser texture cache 會把 spritesheet 切成 frame 0/1/2/3

### 3. 動畫是否正常

**待瀏覽器驗證**，但動畫對應狀態：

| State（OfficeScene `_applyState`）| 動畫 key | 預期視覺 |
|---|---|---|
| `idle` | `aming_idle` / `xiaomei_idle` | 站立不動、阿明持咖啡杯 / 小美持手機 |
| `running` / `live` | `aming_typing` / `xiaomei_typing` | 嘴巴開合循環（5 FPS） |
| `thinking` | `aming_thinking` / `xiaomei_thinking` | 驚訝表情 ↔ 摸下巴沉思（3 FPS） |
| `reacting`（如果 OfficeScene 有用）| `aming_reacting` / `xiaomei_reacting` | 純驚訝靜止 |
| `done` | （視 OfficeScene 邏輯，可能是 idle）| 站立 |

### 4. Console 是否有錯誤

**潛在風險點**：

| 風險 | 機率 | 影響 |
|---|---|---|
| Phaser warning「frame X out of bounds」 | 極低 | 我用 frame 0-3、PNG 有 0-3、不會越界 |
| Animation key 衝突 | 無 | `${role.id}_idle/typing/thinking` 跟程序生成版同名、但分支互斥不會同時 create |
| OfficeScene play 不存在的 anim | 無 | OfficeScene 若 play `aming_reacting`、現在有 create 了；若 play 別的 key、不會因本次改動而新增錯誤 |

---

## 預期視覺差異

| 場景 | Step 3 完成後 |
|---|---|
| 阿明哥 idle | 從「變形小塊」→「完整 48×64 站立角色，藍襯衫、眼鏡、咖啡杯」 |
| 阿明哥 typing（說話時）| 嘴巴開合循環、微前傾 |
| 阿明哥 thinking | 驚訝表情 ↔ 摸下巴 |
| 小美姐 idle | 「完整 48×64 站立角色，白上衣、bob 短髮、持手機」 |
| 小美姐 typing | 嘴巴開合循環 |
| 小美姐 thinking | 驚訝 ↔ 沉思 |
| 其他元素（背景 / LED / 主持桌 / 麥克風 / 白板） | 完全不變 |

---

## Git Commit 建議

```
feat(BootScene): Phase 2C Step 3 — 阿明小美 spritesheet 48×64 + 動畫分支

- preload frameWidth 16→48 / frameHeight 32→64（對應 Step 1 PNG 規格）
- _makeCharacters() 在 boss 分支前加 aming/xiaomei 專屬動畫分支
- frame index 依 GPT 指令：idle=[0] / typing=[0,1,1,0] / thinking=[2,3] / reacting=[2]
- 不動 config.js / OfficeScene.js / index.html / server.py
```
