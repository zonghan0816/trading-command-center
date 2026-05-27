# Phase 2D 任務 2 完成報告

## normalize_state() helper + 全鏈整合

---

## 修改檔案

| 檔案 | 動作 |
|---|---|
| `server.py` | **5 處修改**：(1) `_default_state` 加 keywords；(2) 新增 `_STR_FIELD_DEFAULTS` const + `normalize_state()` function；(3) `_load_state` 整合 normalize；(4) `_save_state` 整合 normalize；(5) `/api/topic` 移除任務 1 就地修補 |

其他檔案 0 動：
- `src/scenes/OfficeScene.js` ✅ 未動
- `src/scenes/BootScene.js` ✅ 未動
- `src/config.js` ✅ 未動
- `index.html` ✅ 未動

---

## a. normalize_state 程式碼

```python
# 字串欄位 default 對照（normalize_state 用、與 _default_state 對齊）
_STR_FIELD_DEFAULTS = {
    "mode":          "idle",
    "topic":         "",
    "topic_summary": "",
    "scene":         "studio",
    "mood":          "neutral",
    "activity":      "idle",
}


def normalize_state(state) -> dict:
    """補齊 wwt_state 結構、修正型別錯誤、保證 downstream 安全存取。

    所有流入點（API POST、檔案 load）都先過這個 helper、確保下游不會 KeyError / TypeError。

    強制 schema：
    - mode/topic/topic_summary/scene/mood/activity (str): 各自有 default
    - updated_at (str): 缺則補當前 HH:MM:SS
    - keywords (list[str]): default []、成員自動 str() 化
    - hosts (dict): default {}、保證含 aming/xiaomei 兩個 dict
    - 其他未列出欄位 → 不動（向下相容、不破壞自訂擴充）
    """
    if not isinstance(state, dict):
        state = {}

    # 字串欄位
    for k, default in _STR_FIELD_DEFAULTS.items():
        if not isinstance(state.get(k), str):
            state[k] = default

    # updated_at（特殊：缺則補當前時間、不是空字串）
    if not isinstance(state.get("updated_at"), str):
        state["updated_at"] = datetime.now().strftime("%H:%M:%S")

    # keywords: 必須是 list、成員強制轉字串
    kws = state.get("keywords")
    if not isinstance(kws, list):
        state["keywords"] = []
    else:
        state["keywords"] = [str(k) for k in kws]

    # hosts: 必須是 dict、含 aming/xiaomei 兩個 dict
    hosts = state.get("hosts")
    if not isinstance(hosts, dict):
        hosts = {}
    for host_id in ("aming", "xiaomei"):
        if not isinstance(hosts.get(host_id), dict):
            hosts[host_id] = {}
    state["hosts"] = hosts

    return state
```

### 設計原則

1. **保守修補**：只**檢查型別 + 補欄位**，不刪除既有資料（向下相容）
2. **mutation in place**：直接改 state dict、不創新 dict（效能）
3. **None / 非 dict 輸入**：開頭 `if not isinstance(state, dict): state = {}` 一次擋掉
4. **未列出欄位保留**：使用者擴充的自訂欄位（如 `hosts.aming.last_output`）原樣保留
5. **STR_FIELD_DEFAULTS 集中管理**：未來加新字串欄位只要改 dict、不用動 function 邏輯

---

## b. 測試案例

### 直接函式測試（11 cases、全 PASS）

```
[PASS] Case 1:  空 dict {}
[PASS] Case 2:  None
[PASS] Case 3:  字串 'abc'（整個 state 是字串）
[PASS] Case 4:  list（state 不是 dict）
[PASS] Case 5:  hosts='abc' 型別錯
[PASS] Case 6:  keywords='abc' 型別錯
[PASS] Case 7:  topic=123 型別錯
[PASS] Case 8:  mode=[] 型別錯
[PASS] Case 9:  hosts.aming=None / xiaomei=字串
[PASS] Case 10: keywords 含非字串 [1,None,'正常'] → 變 ['1','None','正常']
[PASS] Case 11: 完整正常 state（既有 aming.status / aming.custom 自訂欄位都保留）
```

### 端到端 /api/topic 測試（8 cases、全 200）

把 `wwt_state.json` 寫成各種破爛、再 POST /api/topic：

| Case | wwt_state.json 內容 | HTTP |
|---|---|---|
| 完整正常 | `{mode,topic,hosts:{aming,xiaomei}}` | ✅ 200 |
| 缺 hosts | `{mode:'idle'}` | ✅ 200 |
| hosts=字串 | `{hosts:'broken'}` | ✅ 200 |
| hosts.aming=None | `{hosts:{aming:None,xiaomei:None}}` | ✅ 200 |
| 非法 JSON | `not valid json {{{` | ✅ 200（_load_state fallback _default_state）|
| keywords=字串 | `{keywords:'broken'}` | ✅ 200 |
| mode=list | `{mode:[1,2]}` | ✅ 200 |
| topic=數字 | `{topic:123}` | ✅ 200 |

---

## c. 修改位置

### server.py 5 處改動

| # | 函式 / 區段 | 改動 |
|---|---|---|
| 1 | `_default_state()` | 加 `"keywords": [],` 對齊 normalize schema |
| 2 | 模組頂層（_load_state 上方） | 新增 `_STR_FIELD_DEFAULTS` 常數 + `normalize_state()` function |
| 3 | `_load_state()` | `return normalize_state(data)`（讀檔成功時）|
| 4 | `_save_state()` | `state = normalize_state(state)` 後再寫檔 |
| 5 | `/api/topic` handler | 移除任務 1 的 setdefault + isinstance 防護、簡化回原本直接寫入 |

### 流入點全覆蓋

任何 state 經過以下任一路徑都會被 normalize：

```
┌─ POST /api/state ──┐
│                     │
│ POST /api/topic ───┼──→ _load_state ─→ normalize_state ─→ handler 寫入 ─→ _save_state ─→ normalize_state ─→ 落盤
│                     │
└─ wwt_state.json ───┘
```

讀和寫都各 normalize 一次、雙重保險、即使中間有人手動編輯 JSON 也擋得住。

---

## d. 是否可移除任務 1 的局部防護

### ✅ **可移除、已移除**

原因：
1. `_load_state()` 內已 call `normalize_state()`
2. `/api/topic` handler 進來時 `st = _load_state()`、保證拿到的 state 是 normalized
3. `st["hosts"]["aming"]` / `st["hosts"]["xiaomei"]` 一定是 dict（normalize 保證）
4. 直接 `["status"] = "thinking"` 不會 KeyError

### 簡化前後對照

**簡化前（任務 1 留下的就地修補）**：
```python
st = _load_state()
st["topic"] = topic
# ... 其他寫入 ...

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

_save_state(st)
```

**簡化後**：
```python
st = _load_state()  # 已 normalize、hosts.aming/xiaomei 保證是 dict
st["topic"] = topic
# ... 其他寫入 ...
st["hosts"]["aming"]["status"]   = "thinking"
st["hosts"]["xiaomei"]["status"] = "thinking"
_save_state(st)
```

**少了 12 行就地防護程式碼**、邏輯回歸直觀。

### 為什麼還是雙重保險（load + save 都 normalize）

理論上只要 `_load_state` normalize 就夠。但保留 `_save_state` 也 normalize 的原因：

1. **defense in depth**：handler 寫入過程萬一誤刪 hosts 欄位、_save_state 會補回
2. **直接 call _save_state 的場景**：如果未來有 endpoint 直接 `_save_state(some_dict)`（不經過 _load_state），也能受惠
3. 成本極低（dict 操作）、值得

---

## 額外觀察

### 既有資料保留測試

Case 11 推送：
```python
{"hosts": {"aming": {"status":"thinking", "custom":"xyz"}, ...}}
```

normalize_state 處理後：
```python
hosts.aming.status = 'thinking'   ✅ 保留
hosts.aming.custom = 'xyz'        ✅ 保留（自訂欄位不被刪）
```

確認 normalize **不會誤刪** schema 外的自訂擴充欄位、向下相容。

---

## Git Commit 建議

```
feat(server): Phase 2D 任務 2 — normalize_state() + 全鏈整合

新增 normalize_state(state) helper：
- 強制 schema: mode/topic/topic_summary/scene/mood/activity (str default)
- keywords (list[str])、hosts (dict 含 aming/xiaomei dict)
- updated_at 缺則補當前 HH:MM:SS
- 未列出欄位保留（向下相容）

整合：
- _load_state() 讀檔成功時 normalize
- _save_state() 寫檔前 normalize
- _default_state() 加 keywords:[] 對齊 schema
- /api/topic 移除任務 1 局部防護（normalize 已涵蓋）

驗證：
- 函式 11 case PASS（None/字串/list/型別錯/正常/自訂欄位）
- 端到端 /api/topic 8 case 全 200（破爛 wwt_state.json 都不崩）

只動 server.py、其他檔未動
```

---

## 下一步候選

依 12_PHASE2D 規劃：

| 任務 | 內容 | 預計動的檔 |
|---|---|---|
| 任務 3 | 驗證 discussion mode LED 真正顯示 topic | 不改檔、純驗證 |
| 任務 4 | derive_keywords(topic) helper | server.py |
| 任務 5 | 主持人對話自動引用 topic | server.py（_build_prompt）|
| 任務 6 | F2 Debug Overlay | index.html |

**等 GPT 確認任務 2 後再進**。
