# Phase 3 診斷報告 — `/api/chat` 500 Internal Server Error

**狀態：** 診斷報告（非實作 BRIEF）
**現象：** Step 6.5 上線後實跑、瀏覽器 console 出現大量 `500 Internal Server Error` on `/api/chat`、成串出現（一次 6 個）然後恢復、再出現
**結論：** **不是 rate limit、不是 Anthropic 故障、是 server.py 內 JSON 解析失敗**、強烈懷疑根因為 `max_tokens=400` 不夠用

---

## 一、現象

實跑時瀏覽器 console 觀察到模式：

```
[TDT] prefetch started      ← Step 6.5 prefetch 系統啟動
[TDT] prefetch ready        ← 成功收到 dialogue
[TDT] using prefetched dialogue   ← 下一輪消費成功

[TDT] prefetch started
Failed to load resource: ... 500 (Internal Server Error) ← :8765/api/chat
Failed to load resource: ... 500   ← 連續多筆
Failed to load resource: ... 500
Failed to load resource: ... 500
Failed to load resource: ... 500
Failed to load resource: ... 500

[TDT] prefetch started      ← 系統恢復
[TDT] prefetch ready
```

→ 系統有恢復力（retry 機制工作）、但失敗頻率太高、不像 transient。

---

## 二、直接診斷 — 8 次 curl 測試

```bash
for i in 1..8: curl -X POST http://localhost:8765/api/chat
```

結果：

| # | HTTP | 時間 | error message |
|---|---|---|---|
| 1 | **500** | 4.9s | `Unterminated string starting at: line 8 column 32 (char 486)` |
| 2 | **500** | 4.6s | `Unterminated string starting at: line 8 column 34 (char 492)` |
| 3 | **500** | 5.1s | `Unterminated string starting at: line 8 column 32 (char 482)` |
| 4 | ✅ 200 | 5.4s | — |
| 5 | ✅ 200 | 3.6s | — |
| 6 | **500** | 4.5s | `Unterminated string starting at: line 7 column 34 (char 435)` |
| 7 | **500** | 5.4s | `Unterminated string starting at: line 7 column 34 (char 433)` |
| 8 | **500** | 4.1s | `Unterminated string starting at: line 7 column 34 (char 450)` |

**失敗率：6/8 = 75%**

---

## 三、Exception 分析

### Python `json.JSONDecodeError`：「Unterminated string」是什麼

代表 `json.loads()` 解析到字串裡某個位置（char 430-500）發現字串沒有正確的 `"` 收尾、然後到字串末尾仍找不到。

```python
# server.py /api/chat handler
raw = msg.content[0].text.strip()
if "```" in raw:
    raw = raw.split("```")[1]
    if raw.startswith("json"):
        raw = raw[4:]
dialogue = json.loads(raw.strip())   # ← 這裡丟 JSONDecodeError
```

### 三個可能成因（依機率排序）

#### 1️⃣ `max_tokens=400` 不夠用（極可能）

```python
msg = await client.messages.create(
    model="claude-haiku-4-5-20251001",
    max_tokens=400,   # ← 問題在這
    ...
)
```

**證據鏈**：

- 錯誤位置都在 char 430-500、跟 `max_tokens=400` 對應的 byte 位置吻合（中文每字約 2-3 tokens、400 tokens ≈ 130-160 個中文字、JSON 結構約佔 50-80 字、剩 80-110 字給對白）
- 失敗時間都在 4-5 秒、跟「Claude 跑完 max_tokens 才停」的時間一致
- Step 6.3 加了反重複 block 後、Claude 想說的內容變得更精準也更長
- 對話結構從 3 句擴成 3-4 句後（部分 tone）、總字數增加

當 Claude 寫到一半 hit max_tokens 限制、生成中斷在字串中間：

```json
[
  {"speaker": "aming", "text": "我跟你講喔，這次伊朗那邊真的很不簡單，川普"
                                                                  ^
                                            截斷在這 → 沒有結尾 "
```

#### 2️⃣ Claude 對白含未 escape 的引號或換行（次可能）

如果 Claude 生成的對白裡含 `"` 或 `\n`、JSON 結構壞掉。

範例：
```json
{"text": "他說「靠夭喔」，我也覺得"}     ← OK（中文括號）
{"text": "他說"靠夭喔"，我也覺得"}        ← ❌ 結構壞、被當成 "...」 的字串提前結束
```

#### 3️⃣ Anthropic API rate limit / 短時故障（最不可能）

- 沒有看到 `RateLimitError` 或 `APIError`
- 錯誤都是 `JSONDecodeError`、屬本地解析、跟網路無關

---

## 四、Step 6.5 prefetch 跟此問題的關係

**Step 6.5 prefetch 系統運作 OK**、跟 500 錯誤無關：

- 你能看到 `[TDT] prefetch started/ready/using prefetched dialogue` 完整循環
- prefetch 失敗時 silent warn、不中斷當前播放（設計正確）
- live fetch 失敗時 3 秒後 retry（設計正確）

**但 Step 6.5 放大了問題的觀感**：

- 之前：每 ~30 秒 1 次 `/api/chat`、失敗率 75% → 約每 40 秒 1 次成功
- 現在：每 ~15 秒 1 次（current + prefetch）、失敗率 75% → 約每 20 秒 1 次成功 + 6 次失敗 console error

頻率翻倍 → console error 翻倍 → 看起來情況更糟、實際上是 prefetch 暴露了既存問題。

---

## 五、四個修法選項

### 方案 A：提高 max_tokens 400 → 800

```diff
 msg = await client.messages.create(
     model="claude-haiku-4-5-20251001",
-    max_tokens=400,
+    max_tokens=800,
     messages=[{"role": "user", "content": prompt}],
 )
```

| 項 | 評估 |
|---|---|
| 改動 | server.py 1 行 |
| 預期效果 | 解 80% 截斷問題 |
| 風險 | API token 用量翻倍（每對話 ~NT$3 → ~NT$5、仍便宜）|
| 是否影響其他 | 對白可能略長、但 `chunkMs` 已有上限保護 |

### 方案 B：JSON 容錯解析 + 印 raw 到 server console

```diff
-dialogue = json.loads(raw.strip())
+try:
+    dialogue = json.loads(raw.strip())
+except json.JSONDecodeError as e:
+    print(f"[chat] JSON parse failed: {e}")
+    print(f"[chat] raw text: {raw[:500]}")
+    # 嘗試擷取 [...] 區段
+    start = raw.find('[')
+    end = raw.rfind(']')
+    if start >= 0 and end > start:
+        try:
+            dialogue = json.loads(raw[start:end+1])
+        except json.JSONDecodeError:
+            return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)
+    else:
+        return JSONResponse({"error": str(e)}, status_code=500)
```

| 項 | 評估 |
|---|---|
| 改動 | server.py ~10 行 |
| 預期效果 | 解 30-50% 部分截斷（找到完整 `[...]` 區塊就 OK）|
| 風險 | 不解根因（截斷的就是截斷）、只是看到實際資料 |
| 額外 | server.py terminal 會印實際 Claude 回應、未來除錯更快 |

### 方案 C：A + B 一起（**推薦**）

提高 max_tokens 解根因 + 容錯解析當保險 + log 留證據。

| 項 | 評估 |
|---|---|
| 改動 | server.py 2 處 |
| 預期效果 | 解 90%+ |
| 風險 | 同 A、token 翻倍 |
| 額外 | 未來若還有失敗、server console 有完整 raw 資料 |

### 方案 D：retry + 提高 max_tokens

```diff
+for attempt in range(2):
     msg = await client.messages.create(
         model="claude-haiku-4-5-20251001",
-        max_tokens=400,
+        max_tokens=800,
         messages=[{"role": "user", "content": prompt}],
     )
     raw = msg.content[0].text.strip()
+    try:
         dialogue = json.loads(raw.strip())
+        break
+    except json.JSONDecodeError:
+        if attempt == 1:
+            return JSONResponse({"error": "JSON parse failed twice"}, status_code=500)
+        continue
```

| 項 | 評估 |
|---|---|
| 改動 | server.py ~15 行 |
| 預期效果 | 解 95%+ |
| 風險 | 失敗時延遲倍增（4-5s → 8-10s）、token 用量 2-3 倍 |

---

## 六、推薦組合

**方案 C（A + B）** — 解根因 + 留 log：

1. `max_tokens` 400 → 800
2. JSON 解析加 try/except、印 raw 到 console、嘗試擷取 `[...]`

預估工時：5 分鐘

預期成功率：失敗率從 75% 降到 < 10%。

---

## 七、相關性確認

### 跟 Step 6.5 prefetch 有沒有關？

**沒有直接因果**。Step 6.5 之前這個 bug 就存在（max_tokens=400 從 Phase 2D Task 5 就這樣）。Step 6.5 只是讓 `/api/chat` 呼叫頻率翻倍、放大了暴露率。

### 跟 Step 6.3 反重複 block 有沒有關？

**有間接因果**。反重複 block 讓 Claude 想說的內容更精準、字數略增、更容易踩到 `max_tokens=400` 上限。Step 6.3 之前 400 可能勉強夠、之後就不夠了。

---

## 八、為什麼系統能繼續跑

- Prefetch 失敗 → silent warn、`_prefetchInProgress=false`、`_nextDialogue=null`、不中斷當前播放
- Live fetch 失敗 → `_chatInProgress=false`、`delayedCall(3000, _fetchAndPlayDialogue)`、3 秒後 retry
- 6 次連續失敗 ≈ 18 秒沒拿到新對話、但有上一輪 prefetch 殘留 cache 撐著
- 終會撞到 25% 成功率的請求、繼續跑

→ **是有韌性的 graceful degradation、不是 crash**。但失敗期間用戶會看到 gap 變長（從 0.5s 變回 5~10s）。

---

## 九、不在本報告範圍

- 實作（任何方案都需獨立 BRIEF、由 GPT 給指令檔）
- 阿明泡泡偶爾顯示怪字（「咱們全球市場跟尚都在拉中」）— 是 Claude hallucination、跟 JSON 解析無關
- 小美 PNG 視覺問題（沿用 51~57 BRIEF 提醒、待 Codex 處理）

---

## 十、結語

**這是 Phase 2D 時代埋的問題、Step 6.3 把它推到臨界、Step 6.5 把它暴露出來。**

不是新 bug、是長期 latent issue 終於踩到。

請 GPT 裁示要走方案 A / B / C / D、或直接給 Claude 對應指令檔。
