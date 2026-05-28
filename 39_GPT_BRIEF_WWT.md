# Phase 3 Step 1.2 實作報告：Test Host v2 Sprites

## 目標

將 GPT 產出的新版主持人角色圖（draft PNG）接入 WWT 場景，確認比例與接線方式可行。

---

## 修改檔案

- `src/config.js`
- `src/scenes/BootScene.js`
- `src/scenes/OfficeScene.js`

---

## 資產確認

| 檔案 | 尺寸 | 用途 |
|---|---|---|
| `assets/char_aming_v2_draft.png` | 1024×1536 | 新版阿明哥（單張全身 PNG） |
| `assets/char_xiaomei_v2_draft.png` | 1024×1536 | 新版小美姐（單張全身 PNG） |
| `assets/char_aming.png` | 192×64 | 原版（4 幀 spritesheet，**保留不動**） |
| `assets/char_xiaomei.png` | 192×64 | 原版（4 幀 spritesheet，**保留不動**） |

---

## 實作策略

v2 圖是單張 PNG，不是 spritesheet。現有程式碼使用 `add.sprite()` + `.play('aming_idle')`。

**解法：將 v2 PNG 以單幀 spritesheet 形式載入**（frameWidth=1024, frameHeight=1536），然後建立 `idle/typing/thinking/reacting` 四個動畫全指向 frame 0。OfficeScene.js 的 sprite 建立與 `.play()` 邏輯完全不變，只換 scale。

---

## config.js 修改

```diff
  scale: {
    character:    4.0,
+   characterV2:  0.28,   // Phase 3: 1024×1536 單張 PNG 用
    characterBoss: 0.33,

  customAssets: {
+   // 角色 v2 draft（Phase 3 Step 1.2 測試用，優先於 v1）
+   char_aming_v2:   true,
+   char_xiaomei_v2: true,
+
+   // 角色 v1（保留，v2 啟用時不載入）
    char_aming:   true,
    char_xiaomei: true,
```

---

## BootScene.js 修改

### preload()：v2 優先讀取

```diff
- if (ca.char_aming) {
-   this.load.spritesheet('char_aming', '/assets/char_aming.png', { frameWidth: 48, frameHeight: 64 });
- }
+ if (ca.char_aming_v2) {
+   this.load.spritesheet('char_aming', '/assets/char_aming_v2_draft.png', { frameWidth: 1024, frameHeight: 1536 });
+ } else if (ca.char_aming) {
+   this.load.spritesheet('char_aming', '/assets/char_aming.png', { frameWidth: 48, frameHeight: 64 });
+ }
  // xiaomei 同理
```

### _makeCharacters()：新增 v2 單幀 animation branch

```diff
+ } else if ((role.id === 'aming'   && CONFIG.customAssets.char_aming_v2) ||
+            (role.id === 'xiaomei' && CONFIG.customAssets.char_xiaomei_v2)) {
+   // v2 draft 單張 PNG（1024×1536，只有 frame 0）
+   ['idle', 'typing', 'thinking', 'reacting'].forEach(anim => {
+     this.anims.create({
+       key: `${role.id}_${anim}`,
+       frames: [{ key: texKey, frame: 0 }],
+       frameRate: 1, repeat: -1,
+     });
+   });
  } else if ((role.id === 'aming' && CONFIG.customAssets.char_aming) || ...
```

v2 branch 放在 v1 branch 前，確保優先套用。

---

## OfficeScene.js 修改

```diff
+ // 角色 sprite（v2 draft 用 characterV2 scale）
+ const isV2 = CONFIG.customAssets[`char_${id}_v2`];
+ const charScale = isV2 ? (S.characterV2 ?? 0.28) : S.character;
  const sprite = this.add.sprite(charX, charY, `char_${id}`, 0)
-   .setOrigin(0.5, 1).setDepth(depth).setScale(S.character).setInteractive();
+   .setOrigin(0.5, 1).setDepth(depth).setScale(charScale).setInteractive();
```

---

## Scale 計算

| 版本 | 圖片尺寸 | scale | 畫面顯示大小 |
|---|---|---|---|
| v1 spritesheet | 48×64 per frame | 4.0 | 192×256 px |
| v2 draft | 1024×1536 single | 0.28 | 287×430 px |

v2 角色顯示高度 ~430px，在 1080px 場景中約佔 40%，全身可見。

---

## 調整參數（如視覺不符需微調）

| 參數 | 位置 | 說明 |
|---|---|---|
| `scale.characterV2` | `config.js` | 角色大小（0.28 = 430px 高；調大/小） |
| `charOffsets.aming.y` | `config.js` | 角色上下位移（正 = 往下） |
| `charOffsets.xiaomei.y` | `config.js` | 同上 |

---

## 未修改

- `server.py`、API routes、state schema、mode system
- dialogue pipeline、LED logic、TOP5 logic
- Phaser config（仍為 1920×1080 FIT）
- `char_aming.png`、`char_xiaomei.png`（原版保留）

---

## 回退方式

若 v2 測試不理想，只需在 `config.js` 改回：

```js
char_aming_v2:   false,
char_xiaomei_v2: false,
```

即恢復使用原版 v1 spritesheet，其餘程式碼不需動。
