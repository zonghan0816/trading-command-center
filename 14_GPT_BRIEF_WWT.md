# Phase 2C Step 2 完成報告

## 修改檔案

| 檔案 | 動作 |
|---|---|
| `src/config.js` | `customAssets.char_aming` `false → true`、`customAssets.char_xiaomei` `false → true`、註解更新為「Phase 2C Step 1 完成、PNG 已生成於 assets/」 |

其他檔案未動：
- `BootScene.js` ✅ 未動
- `OfficeScene.js` ✅ 未動
- `index.html` ✅ 未動
- `server.py` ✅ 未動

---

## diff 預覽

```diff
   customAssets: {
-    // 角色（MVP 先用程序生成色塊）
-    char_aming:   false,
-    char_xiaomei: false,
+    // 角色（Phase 2C Step 1 完成、PNG 已生成於 assets/）
+    char_aming:   true,
+    char_xiaomei: true,
```

---

## 已存在資產確認

| 檔案 | 狀態 | 規格（13_BRIEF Step 1 確認）|
|---|---|---|
| `assets/char_aming.png` | ✅ 存在（git tracked、commit `d51d70f` 之前已生成） | 192×64 RGBA、4 幀 spritesheet |
| `assets/char_xiaomei.png` | ✅ 存在（同上） | 192×64 RGBA、4 幀 spritesheet |

---

## 回報事項

### 1. 圖片是否成功載入

**需要使用者啟動 Streamlit + 瀏覽器才能即時驗證。**

目前可確認的：
- `assets/char_aming.png` / `assets/char_xiaomei.png` 兩個 PNG 檔案已存在於 git
- `config.js` 已將 `customAssets.char_aming` / `customAssets.char_xiaomei` 設為 `true`
- **BootScene.js 既有邏輯**（依 `customAssets` 旗標決定 load PNG 或 fallback 程序生成）將自動載入這兩張 PNG

預期行為（依 BootScene 既有 fallback 邏輯）：
- `customAssets.char_aming = true` → Phaser `this.load.spritesheet('char_aming', 'assets/char_aming.png', ...)` 被觸發
- PNG 載入成功 → 後續 OfficeScene 用 `char_aming` key 取得 sprite

### 2. 是否出現 404

**待瀏覽器驗證**。

依據檔案實際存在（`assets/char_aming.png` 跟 `assets/char_xiaomei.png` 都已 git tracked），FastAPI 靜態檔路由 `/assets/` 應該能正常 serve、**不應該出現 404**。

驗證方式：
- 開瀏覽器 DevTools → Network 標籤
- 重整頁面、過濾 `char_`、看 status code 是否 200

### 3. Console 是否有錯誤

**待瀏覽器驗證**。

潛在風險點（如果有）：
- **frameWidth/frameHeight 不對**：目前 BootScene.js 仍是 `frameWidth: 16, frameHeight: 32`（舊規格），但新 PNG 是 `48×64`/格。如果 BootScene 不在 Step 2 範圍內、Step 3 才會改、那這次 PNG 載入可能會被 Phaser 切成「12 個 16×32 frame」、顯示扭曲。
- **animation index 不對**：舊動畫用 `[0,1,1,0]` 等 index、新 sprite 應是 `idle=[0], talk=[0,1,1,0], think=[2,3]`、可能視覺不對勁。

但本次任務範圍是「**只改 config.js**」、上述風險點屬 Step 3 BootScene 修改範圍、**故意保留**。

### 4. 下一步建議

依 `13_GPT_BRIEF_WWT.md` 既有規劃：

#### Step 3 — `BootScene.js`（建議下一步）
```js
// Spritesheet 載入規格升級
this.load.spritesheet('char_aming',   'assets/char_aming.png',   { frameWidth: 48, frameHeight: 64 });
this.load.spritesheet('char_xiaomei', 'assets/char_xiaomei.png', { frameWidth: 48, frameHeight: 64 });

// 動畫 frame index 更新
//   idle:     [0]
//   talking:  [0, 1, 1, 0]
//   thinking: [2, 3]
//   reacting: [2]
```

#### Step 4 — `index.html`
LED mode 切換 + 淡入淡出（依 `11_PHASE2C_CHARACTER_AND_CONTENT.md` 任務四）

#### Step 5 — `OfficeScene.js`
熱門關鍵字動態化（從 `/api/state.keywords` 讀取）+ 場景裝飾物件

---

## 預期視覺差異（Step 2 階段）

| 場景 | Step 2 完成後 |
|---|---|
| 阿明哥位置 | 從程序生成色塊 → 載入 `char_aming.png`（但 frame 尺寸可能不對、視覺暫時扭曲、Step 3 修復）|
| 小美姐位置 | 從程序生成色塊 → 載入 `char_xiaomei.png`（同上）|
| 其他元素 | 完全不變（背景、LED、主持桌、麥克風、白板皆 Phase 2A/2B 既有版本）|

⚠️ **若使用者測試後發現角色變形 / 尺寸不對 / 動畫錯誤**，這是**已預期的**、Step 3 BootScene 升級即會修正。

---

## Git Commit 建議

```
chore(config): Phase 2C Step 2 — 啟用 char_aming / char_xiaomei custom PNG

只改 config.js
不動 BootScene.js / OfficeScene.js / index.html / server.py
等 Step 3 改 BootScene frameWidth/frameHeight 才會視覺正確
```
