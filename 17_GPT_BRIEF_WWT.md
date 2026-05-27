# Phase 2C Step 4 驗證 + Step 5 完成報告

---

## 🔸 Step 4 驗證結果

### 後端 mode 切換驗證（curl + server.py 實測）

| 測試 | endpoint | 結果 |
|---|---|---|
| 切 `mode=working` | POST `/api/state` | ✅ `{"ok":true}` |
| 切 `mode=coffee` | POST `/api/state` | ✅ `{"ok":true}` |
| 切 `mode=未知字串` | POST `/api/state` | ✅ 寫入成功（前端會 fallback idle）|
| 重置 `mode=idle` | POST `/api/state` | ✅ |
| `mode=discussion` + `topic` | POST `/api/state` | ⚠️ Windows curl 編碼問題、Python POST 成功 |

### 前端 LED MODE_VIEWS 對應確認

| mode | label | text | badge | badgeClass |
|---|---|---|---|---|
| `idle` | ◆ WWT Taiwan Tonight | 晚晚嘴台灣 | STANDBY | （灰）|
| `discussion` | 📌 今日話題 | {topic} | ON AIR | discussing（橘）|
| `working` | ⚙ 後台準備中 | 準備下一話題 | WORKING | working（琥珀）|
| `coffee` | ☕ 休息片刻 | 茶水間閒聊 | COFFEE BREAK | coffee（棕褐）|

✅ 後端寫入 + 前端讀取鏈路通

### ⚠️ 順帶發現的既有 bug（非 Step 4 範圍、留給 GPT 評估）

**`POST /api/topic` 回 500 Internal Server Error**

server.py line 227-228：
```python
st["hosts"]["aming"]["status"]   = "thinking"
st["hosts"]["xiaomei"]["status"] = "thinking"
```

如果 `wwt_state.json` 的 `hosts.aming` / `hosts.xiaomei` 結構不存在 / 不完整、會 KeyError。

**workaround**：直接用 `POST /api/state` 設定 `mode=discussion` + `topic` 即可（已驗證可工作）。

**這不是 Step 4 範圍、未修**。

---

## 🔸 Step 5 完成 — OfficeScene 熱門關鍵字動態化

### 修改檔案

| 檔案 | 動作 |
|---|---|
| `src/scenes/OfficeScene.js` | 4 處修改（module const + create 改用 helper + 新增 _renderKeywords + _applyState 接 keywords）|

其他檔案 0 動：
- `src/config.js` ✅ 未動
- `src/scenes/BootScene.js` ✅ 未動
- `index.html` ✅ 未動
- `server.py` ✅ 未動

---

### 修改 1：Module-level 預設值

```js
// 熱門關鍵字（state.keywords 不存在時的預設值、最多顯示 5 個）
const DEFAULT_KEYWORDS = ['台北房價', 'AI工作', '演唱會', '健保費', '物價指數'];
const KEYWORD_COLORS   = ['#FF6B35', '#00E5FF', '#00E676', '#FFB300', '#BB86FC'];
const KEYWORD_MAX      = 5;
```

放在檔案頂部 import 後、class 定義前。

---

### 修改 2：`create()` 改用 helper

**之前**（line 90-96、寫死 5 個）：
```js
const kws = ['台北房價', 'AI工作', '演唱會', '健保費', '物價指數'];
const kwCols = ['#FF6B35', '#00E5FF', '#00E676', '#FFB300', '#BB86FC'];
kws.forEach((kw, i) => {
  this.add.text(wbCX, wbTopY + 28 + i * 13, kw, {
    fontSize: '9px', color: kwCols[i], fontFamily: 'Consolas, monospace',
  }).setOrigin(0.5, 0).setDepth(28.5);
});
```

**之後**：
```js
// 儲存座標、給 _renderKeywords / state poll 用
this._kwBaseX        = wbCX;
this._kwBaseY        = wbTopY;
this._kwTexts        = [];     // 當前渲染的 text 物件陣列、用來 destroy 重畫
this._currentKeywordsSig = null;  // 防抖簽章
this._renderKeywords(DEFAULT_KEYWORDS);
```

「# 熱門」標題（line 87-89）保留原樣、是常駐元素、不參與動態切換。

---

### 修改 3：新增 `_renderKeywords(keywords)` method

```js
_renderKeywords(keywords) {
  // 預設值 fallback
  let kws = (Array.isArray(keywords) && keywords.length > 0)
    ? keywords.slice(0, KEYWORD_MAX)
    : DEFAULT_KEYWORDS;
  kws = kws.map(k => String(k));  // 全部轉字串、防 server 推非字串

  // 防抖：相同內容 skip 重畫
  const sig = JSON.stringify(kws);
  if (sig === this._currentKeywordsSig) return;
  this._currentKeywordsSig = sig;

  // 清除舊 text 物件
  this._kwTexts.forEach(t => t.destroy());
  this._kwTexts = [];

  // 渲染新 text、顏色陣列循環配色
  kws.forEach((kw, i) => {
    const t = this.add.text(
      this._kwBaseX,
      this._kwBaseY + 28 + i * 13,
      kw,
      {
        fontSize: '9px',
        color: KEYWORD_COLORS[i % KEYWORD_COLORS.length],
        fontFamily: 'Consolas, monospace',
      }
    ).setOrigin(0.5, 0).setDepth(28.5);
    this._kwTexts.push(t);
  });
}
```

### 設計考量

| 邊界情況 | 行為 |
|---|---|
| `keywords` undefined | 用 DEFAULT_KEYWORDS |
| `keywords` null | 用 DEFAULT_KEYWORDS |
| `keywords` 空陣列 `[]` | 用 DEFAULT_KEYWORDS |
| `keywords` 非陣列（如字串） | 用 DEFAULT_KEYWORDS（`Array.isArray` 擋掉）|
| `keywords` 包含非字串值 | `String()` 強制轉換 |
| `keywords` 6 個以上 | 只取前 5（slice 截斷）|
| 連續推送相同內容 | sig 比對、skip 重畫（防抖、避免每 5 秒 destroy + recreate）|

---

### 修改 4：`_applyState(data)` 接 keywords

```js
_applyState(data) {
  this.state = data;
  const ACTIVE = ['talking', 'thinking', 'researching', 'reacting'];

  // 熱門關鍵字：state.keywords 變化時動態重繪（_renderKeywords 內含防抖）
  if (data.keywords !== undefined) {
    this._renderKeywords(data.keywords);
  }

  // ... 既有 hosts 處理邏輯不變 ...
}
```

**只在 `data.keywords !== undefined` 時觸發**——server 沒推這個欄位就完全不動白板、保留 create() 階段渲染的預設值。

---

## 驗證測試結果

啟 server.py → POST 自訂 keywords → GET 確認寫入：

### Test A — 5 個中文關鍵字（Python POST、繞開 Windows curl 編碼）

```python
import urllib.request, json
payload = {"mode":"idle","keywords":["健保補繳","台積電","颱風假","房貸利率","早餐店漲價"]}
req = urllib.request.Request(
    'http://localhost:8765/api/state',
    data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
    headers={'Content-Type':'application/json; charset=utf-8'},
    method='POST',
)
```

結果：`{"ok":true}` ✅
GET 確認：`['健保補繳','台積電','颱風假','房貸利率','早餐店漲價']` ✅

### Test B — 空陣列

```bash
curl -X POST http://localhost:8765/api/state -d '{"keywords":[]}'
```

結果：`{"ok":true}` ✅
**前端應 fallback 預設值**（OfficeScene._renderKeywords 邏輯）

### Test C — 7 個關鍵字（超過上限）

```bash
curl -X POST http://localhost:8765/api/state -d '{"keywords":["a","b","c","d","e","f","g"]}'
```

結果：state 存了 7 個 ✅
**前端應只渲染前 5**（OfficeScene._renderKeywords 內 slice）

### Test D — Windows curl 中文編碼 bug

```bash
curl -X POST -d '{"keywords":["中文","關鍵字"]}'
```

結果：Internal Server Error
**根因**：Windows curl 預設 cp950 解析 JSON body 中的中文、server 收到亂碼字串才 500。
**workaround**：用 Python `urllib` / `requests` 強制 UTF-8 即可（Test A 已證明）。
**這不是本次修改引入的 bug**、是 Windows + curl + 非 ASCII payload 的通用問題。

---

## 視覺驗證指引（給使用者）

1. 啟 server.py
2. 開瀏覽器 `http://localhost:8765`（Ctrl+F5 清快取）
3. 看右上白板「# 熱門」下方應顯示 5 個預設關鍵字
4. 用 Python 推送自訂 keywords：
   ```python
   import urllib.request, json
   r = urllib.request.Request(
       'http://localhost:8765/api/state',
       data=json.dumps({"keywords":["颱風","房價","健保"]}, ensure_ascii=False).encode('utf-8'),
       headers={'Content-Type':'application/json; charset=utf-8'},
       method='POST',
   )
   urllib.request.urlopen(r)
   ```
5. 等 5 秒內白板應動態切換成新關鍵字（連續推送相同內容不會閃爍）
6. 推送 `{"keywords":[]}` → 白板應退回預設值

---

## Git Commit 建議

```
feat(OfficeScene): Phase 2C Step 5 — 熱門關鍵字 state.keywords 動態化

只動 OfficeScene.js、4 處修改：
1. module const DEFAULT_KEYWORDS / KEYWORD_COLORS / KEYWORD_MAX
2. create() 改用 _renderKeywords(DEFAULT_KEYWORDS)、儲存 _kwBaseX/Y/Texts
3. 新增 _renderKeywords(keywords) helper（fallback / truncate 5 / 防抖簽章）
4. _applyState 偵測 data.keywords 變化、call _renderKeywords

支援 state.keywords:
- undefined / null / [] → DEFAULT_KEYWORDS
- 超過 5 個 → 只取前 5
- 連續推送相同內容 → 防抖、不重畫
- 非字串值 → String() 強制轉換

未動：BootScene / config / index.html / server.py
```

---

## 順帶提醒（非本次範圍）

如果要做下一輪、有 2 個既有 bug 可考慮：

1. **POST /api/topic 500** — server.py 對 `hosts.aming/xiaomei` 結構不完整時 KeyError
2. **POST /api/state 含 nested hosts** 有時 500 — 同上問題

修法建議（之後）：server.py 用 `dict.setdefault()` 或 schema 預檢補齊 hosts 結構。

不過實務上用 `POST /api/state` 直接給 mode + topic 已能涵蓋大部分使用、bug 影響面有限。
