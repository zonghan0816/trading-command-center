# Claude 指令檔 — Phase 3 Step 6.6 `/api/chat` 500 修復

你已讀過 `WWT_HANDOVER.md`，不用重讀整份交接檔。請直接依本指令處理 `58_API_CHAT_500_DIAGNOSIS.md` 指出的 `/api/chat` 500 問題。

## 目標

修正 `server.py` 中 Claude 回覆 JSON 被截斷或格式略壞時造成 `/api/chat` 500 的問題。

## 背景

`58_API_CHAT_500_DIAGNOSIS.md` 已確認：

- 不是 rate limit。
- 不是 Anthropic 故障。
- 主因是 `json.loads(raw.strip())` 解析 Claude 回覆時失敗。
- 高機率是 `max_tokens=400` 不夠，導致 JSON 字串被截斷。
- Step 6.5 prefetch 只是讓 `/api/chat` 呼叫頻率提高，因此更容易看到錯誤。

## 請修改

檔案：`server.py`

### 1. 提高 max_tokens

在 `/api/chat` 的 `client.messages.create(...)`：

```diff
- max_tokens=400,
+ max_tokens=800,
```

### 2. 加 JSON 解析容錯

將目前：

```python
dialogue = json.loads(raw.strip())
```

改成：

```python
try:
    dialogue = json.loads(raw.strip())
except json.JSONDecodeError as e:
    print(f"[chat] JSON parse failed: {e}")
    print(f"[chat] raw text preview: {raw[:800]}")
    start = raw.find("[")
    end = raw.rfind("]")
    if start >= 0 and end > start:
        try:
            dialogue = json.loads(raw[start:end + 1])
        except json.JSONDecodeError:
            return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)
    else:
        return JSONResponse({"error": f"JSON parse failed: {e}"}, status_code=500)
```

注意：這段容錯只處理 `json.JSONDecodeError`。不要把 Anthropic API error、network error、其他 Python exception 全部吞進這段 fallback；其他錯誤維持原本外層 `except Exception as e` 回 500，方便後續除錯。

## 不要修改

- 不改 API schema。
- 不改 `OfficeScene.js`。
- 不改 Step 6.5 prefetch 流程。
- 不改 prompt 結構。
- 不改 state / memory / topic rotate 邏輯。
- 不 commit `.env`、`wwt_state.json`、`wwt_news_cache.json`、`wwt_dialogue_memory.json`。

## 驗收

1. 重啟 server。
2. 執行多次：

```bash
curl -X POST http://localhost:8765/api/chat
```

3. 預期：

- 500 明顯下降。
- 若仍有 JSON parse error，server console 會印 `[chat] JSON parse failed...` 與 raw preview。
- 前端 Step 6.5 prefetch log 仍正常：

```txt
[TDT] prefetch started
[TDT] prefetch ready
[TDT] using prefetched dialogue
```

## 完成後

請新增 implementation brief：

```txt
58_PHASE3_STEP6.6_IMPL_BRIEF.md
```

內容簡述：

- 改了哪些檔案。
- `max_tokens` 調整。
- JSON parse fallback 行為。
- 測試結果。
