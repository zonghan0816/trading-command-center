# Claude 指令檔：Step 6.4 新聞初始灌入修正

請接續 `C:\Users\miner3\trading-command-center` 專案。

你已讀過 `WWT_HANDOVER.md`，也已完成：

- `51_PHASE3_STEP6_IMPL_BRIEF.md`
- `52_PHASE3_STEP6.1_IMPL_BRIEF.md`
- `53_PHASE3_STEP6.2_IMPL_BRIEF.md`
- `54_PHASE3_STEP6.3_IMPL_BRIEF.md`

不要重複交接摘要，直接做本任務。

## 任務定位

本次做 **Phase 3 Step 6.4：Initial News Topic Seeding Fix**。

使用者觀察：

```txt
怎麼那麼久沒抓新聞進來？
```

實際診斷：新聞 RSS 有抓到，也有存 cache：

```txt
[news] loaded 15 headlines from disk
[news] initial fetch: 15 headlines（已存檔）
[news] cache refreshed: 15 headlines（已存檔）
```

但 `/api/state` 仍是：

```json
{
  "mode": "idle",
  "topic": "",
  "keywords": []
}
```

所以問題不是「沒抓新聞」，而是：

```txt
抓到了新聞，但沒有在啟動後立即灌成目前 topic。
```

## 根因

目前 `_topic_rotate_loop()` 只有在：

```python
_news_topics_cache and _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC
```

才會換 topic。

啟動時 `_current_topic_rounds = 0`，如果 state.topic 是空的，仍然要等到 5 輪 `/api/chat` 之後才 rotate。

這造成空 topic / idle 狀態下，新聞 cache 明明有資料，畫面卻一直沒有今日話題。

## 修改範圍

優先只改：

```txt
server.py
```

不要修改：

```txt
src/*
assets/*
.env
wwt_state.json
```

## 修正目標

1. 啟動後如果 news cache 有資料，且目前 state 沒有 topic，應立即選一條新聞灌入 state。
2. 若 `topic_locked=True` 且已有 topic，不要覆蓋使用者手動指定的 topic。
3. 如果 topic 是空字串，即使 `_current_topic_rounds < _MIN_ROUNDS_PER_TOPIC`，也應該 seed 一條新聞。
4. 保留 Step 6.1 的規則：同 topic 至少 5 輪才 rotate。
5. 保留 Step 6.3 的 tone queue / angle queue / dialogue memory。

## 建議實作

### 1. 新增 helper

請新增 helper，例如：

```python
def _apply_news_topic(chosen: str, *, unlock: bool = False) -> dict:
    """把新聞標題寫入 state，並同步 keywords / mode / activity。

    unlock=True 時，將 topic_locked 設為 False。
    """
    global _current_topic_rounds
    st = _load_state()
    st["topic"] = chosen
    st["topic_summary"] = ""
    st["mode"] = "discussion"
    st["mood"] = "heated"
    st["activity"] = "prepare_show"
    st["updated_at"] = datetime.now().strftime("%H:%M:%S")
    if unlock:
        st["topic_locked"] = False
    if not st.get("keywords_locked"):
        st["keywords"] = derive_keywords(chosen)
    _save_state(st)
    _current_topic_rounds = 0
    return st
```

然後讓 `_topic_rotate_loop()` 和 `/api/news/rotate_topic` 共用它，避免邏輯重複。

### 2. 啟動時 seed first topic

在 `_startup_news_tasks()` 完成 disk cache / fresh fetch 後，如果 `_news_topics_cache` 有資料，檢查 state：

```python
st = _load_state()
has_topic = bool(str(st.get("topic", "")).strip())
locked = bool(st.get("topic_locked"))

if _news_topics_cache and not has_topic:
    chosen = random.choice(_news_topics_cache)
    _apply_news_topic(chosen, unlock=False)
    print(f"[news] seeded initial topic → {chosen}")
```

注意：

- 只要 topic 空，就應該 seed。
- topic 空時，即使 `topic_locked=True` 也可以考慮 seed，因為沒有手動 topic 可保護。
- 如果 topic 不空且 locked，就不要覆蓋。

### 3. rotate loop 加空 topic 例外

把 `_topic_rotate_loop()` 條件改成：

```python
st = _load_state()
has_topic = bool(str(st.get("topic", "")).strip())
should_seed = not has_topic
should_rotate = _current_topic_rounds >= _MIN_ROUNDS_PER_TOPIC

if _news_topics_cache and (should_seed or should_rotate):
    if should_seed or not st.get("topic_locked"):
        chosen = random.choice(_news_topics_cache)
        _apply_news_topic(chosen, unlock=False)
        if should_seed:
            print(f"[news] seeded missing topic → {chosen}")
        else:
            print(f"[news] rotated topic → {chosen}（前 topic 跑了 {_MIN_ROUNDS_PER_TOPIC}+ 輪）")
```

這樣：

- 空 topic：立即補新聞。
- 有 topic：仍照 5 輪規則 rotate。
- 手動 locked 且有 topic：不 rotate。

### 4. 手動 endpoint 保留

`/api/news/rotate_topic` 應仍可立即換 topic，且 unlock：

```python
st = _apply_news_topic(chosen, unlock=True)
return {"ok": True, "topic": chosen, "keywords": st["keywords"], "topic_locked": False, "topic_round": 0}
```

## 驗收

### A. 重啟 server

啟動後 console 應看到其中一種：

```txt
[news] seeded initial topic → ...
```

或如果 state 已有 topic：

```txt
不 seed、不覆蓋目前 topic
```

### B. 檢查 state

```powershell
Invoke-RestMethod http://localhost:8765/api/state | ConvertTo-Json -Depth 8
```

預期：

```json
{
  "mode": "discussion",
  "topic": "某條 Google News 標題",
  "activity": "prepare_show",
  "keywords": ["..."]
}
```

### C. 瀏覽器畫面

刷新 `http://localhost:8765`。

預期：

- LED / 右上 panel 有今日話題。
- TOP5 keywords 不再是空。
- 不需要等 5 輪才出新聞 topic。

### D. 保護手動 topic

手動 POST `/api/topic` 設定 topic 後，重啟 server：

- 如果 topic 不空且 `topic_locked=True`，不要被 startup seed 覆蓋。

## 完成後輸出

請新增 implementation brief：

```txt
55_PHASE3_STEP6.4_IMPL_BRIEF.md
```

brief 需包含：

- 為什麼新聞有抓到但沒進 topic
- 啟動 seed 條件
- rotate loop 空 topic 例外
- 是否共用 `_apply_news_topic`
- 驗收方式
