# Phase 2D 任務 1 完成報告

## 修復 `/api/topic` 500 Error

---

## 修改檔案

| 檔案 | 動作 |
|---|---|
| `server.py` | **1 處修改**（`/api/topic` handler 內、寫入 hosts.status 前加 setdefault + isinstance 防呆）|

其他檔案 0 動（遵守一次只改一個檔規則）：
- `src/scenes/OfficeScene.js` ✅ 未動
- `src/scenes/BootScene.js` ✅ 未動
- `src/config.js` ✅ 未動
- `index.html` ✅ 未動

---

## 1. 修復哪些 bug

### 主 bug：`POST /api/topic` 對缺失/異常 `hosts` 結構崩潰

**根因**（修復前 line 227-228）：
```python
st["hosts"]["aming"]["status"]   = "thinking"
st["hosts"]["xiaomei"]["status"] = "thinking"
```

如果 `wwt_state.json` 在以下情境會 KeyError → 500：

| 異常情境 | 觸發鏈 | 修復前 | 修復後 |
|---|---|---|---|
| state 完全沒 `hosts` 欄位 | `st["hosts"]` 直接 KeyError | 💥 500 | ✅ 200 |
| `hosts` 存在但缺 `aming` | `st["hosts"]["aming"]` KeyError | 💥 500 | ✅ 200 |
| `hosts` 是字串/None（型別錯）| `"str"["aming"]` TypeError | 💥 500 | ✅ 200 |
| `hosts.aming` 是字串/None | `"str"["status"]` TypeError | 💥 500 | ✅ 200 |
| 正常 state | 直接寫入 | ✅ 200 | ✅ 200（不變）|

---

## 2. 修復後的程式碼

```python
# 安全寫入 hosts.aming/xiaomei.status（防 wwt_state.json 結構不完整時 KeyError → 500）
# 任務 2 normalize_state() 會把這個邏輯抽出來統一處理，此處先就地修復
hosts = st.setdefault("hosts", {})
if not isinstance(hosts, dict):
    hosts = {}
    st["hosts"] = hosts
for host_id in ("aming", "xiaomei"):
    entry = hosts.setdefault(host_id, {})
    if not isinstance(entry, dict):
        entry = {}
        hosts[host_id] = entry
    entry["status"] = "thinking"
```

### 設計考量

1. **`setdefault` + `isinstance` 雙重防護**：
   - `setdefault` 處理「鍵不存在」case
   - `isinstance` 處理「鍵存在但型別錯」case（如字串、None、list）
2. **就地修復、不抽 helper**：任務 2 才做 `normalize_state()` 統一抽出來、此 turn 範圍嚴守「只動 /api/topic」
3. **註解明確標示**：未來重構時知道這段會被 `normalize_state()` 取代

---

## 3. 驗證測試（4 個 boundary case 實測）

跑 server.py background → Python POST 各種破損 state → 觀察 HTTP code：

```
=== Case A: 正常 state (hosts 完整) ===
  POST /api/topic: HTTP 200 ✅
  state.hosts: {aming: {status: thinking, ...}, xiaomei: {...}}

=== Case B: state 沒 hosts 欄位 (修復前的 KeyError 場景) ===
  POST /api/topic: HTTP 200 ✅
  state.hosts: {aming: {status: thinking, ...}, xiaomei: {...}}

=== Case C: state.hosts 是字串（極端怪資料）===
  POST /api/topic: HTTP 200 ✅
  state.hosts: {aming: {status: thinking, ...}, xiaomei: {...}}

=== Case D: state.hosts.aming 是字串 ===
  POST /api/topic: HTTP 200 ✅
  state.hosts: {aming: {status: thinking, ...}, xiaomei: {...}}
```

**全部 200、所有 case 都正確補齊 hosts 結構 + 設好 thinking status**。

---

## 4. 修復前後對照

### 修復前流程
```
client → POST /api/topic
  → server _load_state()
  → 直接 st["hosts"]["aming"]["status"] = "thinking"
  → 如果 hosts 不存在 → KeyError → 500 Internal Server Error
  → client 沒收到 ok / 沒看到 mode 切換
```

### 修復後流程
```
client → POST /api/topic
  → server _load_state()
  → hosts = st.setdefault("hosts", {}) ← 保證 dict
  → 檢查 isinstance(hosts, dict) ← 防型別錯
  → for aming/xiaomei: setdefault + isinstance ← 同樣防護
  → entry["status"] = "thinking" ← 安全寫入
  → _save_state(st) → 200 ok
```

---

## 5. 接下來

### 等 GPT 確認此 turn 後、進入任務 2

**任務 2**：建立 `normalize_state()` helper，把這次的「補齊 hosts 結構」邏輯抽出來，套到 `_load_state` / `_save_state` / `_default_state` 全鏈、確保任何路徑寫入的 state 都已 normalized。

預期效果：
- 任務 1 的就地修補可以**簡化成單一 call**：`st = normalize_state(_load_state())`
- 其他 endpoint（`/api/state` POST 等）也會自動受益、不會再有奇怪結構流入

### 修改檔案範圍預告

任務 2 預期動：**只動 `server.py`**（一樣一次一檔規則）。

---

## Git Commit 建議

```
fix(server): 修復 /api/topic 500 — 缺/錯 hosts 結構時 KeyError

修改 /api/topic handler：
- 用 setdefault + isinstance 雙重防護寫入 hosts.aming/xiaomei.status
- 任何 wwt_state.json 結構缺失/型別錯都不會 500
- 4 個 boundary case 實測通過

範圍：只動 server.py 一個檔
任務 2 normalize_state() 會把這段邏輯抽出統一處理
```
