# Phase 3 Step 6.6 — `/api/chat` 500 修復

**狀態：** 完成、實測 8/8 PASS
**檔案動作：** 單檔 `server.py`、2 處改動
**承接：** `58_API_CHAT_500_DIAGNOSIS.md` 診斷報告的「方案 C」推薦
**註：** 指令檔原寫 `58_PHASE3_STEP6.6_IMPL_BRIEF.md`、但 58 已被診斷報告佔用、改用 **59** 避免衝突

---

## 一、任務目標

修 `/api/chat` 在 Step 6.5 上線後出現的 **75% 機率回 500** 問題。

診斷報告（58）已確認：
- ❌ 不是 rate limit
- ❌ 不是 Anthropic 故障
- ✅ **是 `json.loads(raw.strip())` 解析 Claude 回應失敗**
- ✅ 根因強烈懷疑為 `max_tokens=400` 不夠用、被截斷在字串中間

採用診斷報告推薦的 **方案 C = A + B**：
- **A**：`max_tokens` 400 → 800（解根因）
- **B**：JSON 解析加 try/except + 印 raw + 擷取 `[...]` fallback（保險 + 留 log）

---

## 二、修改檔案

### 1. `max_tokens` 400 → 800

```diff
     msg = await client.messages.create(
         model="claude-haiku-4-5-20251001",
-        max_tokens=400,
+        # Phase 3 Step 6.6: 400 → 800、避免被截斷在字串中間導致 JSON 不完整
+        max_tokens=800,
         messages=[{"role": "user", "content": prompt}],
     )
```

### 2. JSON 解析加 fallback

```diff
         raw = msg.content[0].text.strip()
         if "```" in raw:
             raw = raw.split("```")[1]
             if raw.startswith("json"):
                 raw = raw[4:]
-        dialogue = json.loads(raw.strip())
+        # Phase 3 Step 6.6: JSON 解析容錯
+        # - 主解析失敗時印 raw 到 server console（除錯用）
+        # - 嘗試擷取第一個 `[` 到最後一個 `]` 區段再 parse 一次
+        # - 仍失敗才回 500、其他 Anthropic / network exception 走外層 except
+        try:
+            dialogue = json.loads(raw.strip())
+        except json.JSONDecodeError as e:
+            print(f"[chat] JSON parse failed: {e}")
+            print(f"[chat] raw text preview: {raw[:800]}")
+            start = raw.find("[")
+            end   = raw.rfind("]")
+            if start >= 0 and end > start:
+                try:
+                    dialogue = json.loads(raw[start:end + 1])
+                except json.JSONDecodeError:
+                    return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)
+            else:
+                return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)
```

關鍵：fallback **只接 `json.JSONDecodeError`**，其他 exception（Anthropic API error、network error）仍走外層 `except Exception as e` 維持原本 500 行為、方便日後除錯。

---

## 三、實測驗收

### Step 6.6 修復前（昨日同樣測試）

| # | HTTP | error |
|---|---|---|
| 1 | **500** | Unterminated string at char 486 |
| 2 | **500** | Unterminated string at char 492 |
| 3 | **500** | Unterminated string at char 482 |
| 4 | ✅ 200 | — |
| 5 | ✅ 200 | — |
| 6 | **500** | Unterminated string at char 435 |
| 7 | **500** | Unterminated string at char 433 |
| 8 | **500** | Unterminated string at char 450 |

**失敗率：6/8 = 75%**

### Step 6.6 修復後（剛剛實測）

| # | HTTP | 時間 |
|---|---|---|
| 1 | ✅ 200 | 5.15s |
| 2 | ✅ 200 | 5.47s |
| 3 | ✅ 200 | 7.11s |
| 4 | ✅ 200 | 3.08s |
| 5 | ✅ 200 | 4.77s |
| 6 | ✅ 200 | 9.10s |
| 7 | ✅ 200 | 4.50s |
| 8 | ✅ 200 | 6.61s |

**失敗率：0/8 = 0%**

### Server console log

```bash
$ grep "JSON parse failed" /tmp/server_test.log
(no matches)
```

→ fallback 解析**完全沒觸發**。`max_tokens=800` 單獨就解了根因、容錯機制純粹是保險。

---

## 四、根因確認

**真因：`max_tokens=400` 太少。**

Step 6.3 加了反重複 block 後 Claude 想說的內容變得更精準、字數略增、3-4 段對白 + JSON 結構（"speaker": "aming", "text": "..."）約佔 400-500 tokens、踩線。

調到 800 後仍有 ~3x 餘裕、不會被截斷。

Token 用量翻倍：每對話從 ~NT$1-3 變 ~NT$2-5、仍便宜可接受。

---

## 五、未動的部分（嚴守限制）

| 項目 | 狀態 |
|---|---|
| API schema | ✅ 未動 |
| `OfficeScene.js` | ✅ 未動 |
| Step 6.5 prefetch 流程 | ✅ 未動 |
| Prompt 結構 | ✅ 未動 |
| State / memory / topic rotate 邏輯 | ✅ 未動 |
| `.env` / state files | ✅ 未 commit |
| 阿明邏輯 / PNG | ✅ 未動 |

---

## 六、Sanity Check

```bash
$ python -c "import server; print('IMPORT OK')"
IMPORT OK
```

---

## 七、預期效果

| 觀察點 | 修復前 | 修復後 |
|---|---|---|
| `/api/chat` 失敗率 | 75% | 0% |
| 瀏覽器 console `500` 錯誤 | 成串 6 個 | 不該再出現 |
| Step 6.5 prefetch 成功率 | 25% | 接近 100% |
| 對話 gap（prefetch 失敗時 fallback）| 5~10s | 0.5~1s（prefetch 多數命中）|

---

## 八、如果未來仍有 JSON parse 失敗（罕見）

容錯機制會：

1. **server console** 印出：
   ```
   [chat] JSON parse failed: <錯誤訊息>
   [chat] raw text preview: <Claude 實際回的前 800 字>
   ```
   → 直接看到 Claude 出什麼狀況
2. **嘗試擷取 `[...]` 區段** 再 parse 一次（救部分情況）
3. 仍失敗才回 500

→ 之後除錯有完整資料。

---

## 九、🚨 小美 PNG 視覺問題（沿用提醒）

仍存在、不在本次範圍。詳見 51~57 BRIEF 的素材層說明。
**等 Codex 重生 `char_xiaomei_actions.png`**。

---

## 十、Deprecation 警告（非阻塞）

啟動 server 看到：

```
DeprecationWarning: on_event is deprecated, use lifespan event handlers instead.
```

來自 Step 6 加的 `@app.on_event("startup")`。FastAPI 推薦改用 `lifespan` context manager。

不阻塞、不影響功能。**留給之後決定要不要遷移**（小範圍 refactor）。

---

## 十一、下一步建議

1. **使用者實跑驗收**：`python server.py` → 瀏覽器看 console、確認 `/api/chat 500` 不再連續出現
2. **若仍偶爾 500**：看 server console 印的 `[chat] raw text preview`、判斷是 hallucination 還是其他格式問題
3. **若一切 OK**：commit + push
4. **PNG 視覺問題**：交給 Codex
5. **on_event 遷移**：未來 refactor 議題、低優先
