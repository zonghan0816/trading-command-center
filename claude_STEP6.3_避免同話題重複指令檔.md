# Claude 指令檔：Step 6.3 避免同話題對話重複

請接續 `C:\Users\miner3\trading-command-center` 專案。

你已讀過 `WWT_HANDOVER.md`，也已完成：

- `51_PHASE3_STEP6_IMPL_BRIEF.md`
- `52_PHASE3_STEP6.1_IMPL_BRIEF.md`
- `53_PHASE3_STEP6.2_IMPL_BRIEF.md`

不要重複交接摘要，直接做本任務。

## 任務定位

本次做 **Phase 3 Step 6.3：Topic Dialogue Variety / Anti-Repetition**。

使用者觀察：

```txt
動作圖有增加了，但是同一個話題對話內容有點重複。
```

Step 6.1 已經完成：

- Google News RSS 抓取
- `wwt_news_cache.json` 持久化
- 新 RSS 成功抓到時 replace 舊 cache
- 同 topic 至少 5 輪才 rotate
- 8 種 tone

所以本次不要重做 RSS cache。請聚焦在：

```txt
同一個 topic 的多輪對話，不要一直講同一種角度、同一句型、同一個 punchline。
```

## 修改範圍

優先只改：

```txt
server.py
.gitignore
```

不要修改：

```txt
src/*
assets/*
wwt_state.json
.env
```

## 問題原因

目前 `/api/chat` 是：

```python
turn_type = random.choice(_DIALOGUE_TONES)
```

這會有幾個問題：

1. 同 topic 5 輪內可能連續抽到同 tone。
2. 即使 tone 不同，prompt 沒告訴 Claude「前幾輪已經講過什麼」，所以內容仍可能重複。
3. `critical / mocking / humorous / sarcastic` 的 prompt 太短，容易產出相似台詞。
4. 沒有 per-topic memory，所以同 topic 不知道哪些 angle / lines 已用過。

## 目標

### 1. Tone 不要純 random

請把 `random.choice(_DIALOGUE_TONES)` 改成「每個 topic 一包 tone shuffled queue」。

建議 module vars：

```python
_current_topic_key: str = ""
_tone_queue: list[str] = []
```

新增 helper：

```python
def _topic_key(topic: str) -> str:
    return (topic or "").strip()

def _next_tone_for_topic(topic: str) -> str:
    global _current_topic_key, _tone_queue
    key = _topic_key(topic)
    if key != _current_topic_key:
        _current_topic_key = key
        _tone_queue = []
    if not _tone_queue:
        _tone_queue = _DIALOGUE_TONES[:]
        random.shuffle(_tone_queue)
    return _tone_queue.pop(0)
```

`/api/chat` 改用：

```python
turn_type = _next_tone_for_topic(state.get("topic", ""))
```

效果：同 topic 8 輪內 tone 不重複，變化比純 random 穩。

### 2. 同 topic 記住最近講過的內容

新增獨立記憶檔，不改 `wwt_state.json` schema：

```txt
wwt_dialogue_memory.json
```

請加進 `.gitignore`。

建議資料結構：

```json
{
  "topic": "...",
  "rounds": [
    {
      "at": "2026-05-30 02:55:00",
      "tone": "critical",
      "angle": "money_pressure",
      "lines": ["...", "..."]
    }
  ]
}
```

只保留目前 topic 最近 8 輪即可。topic 變了就清掉舊 rounds。

新增 helpers：

```python
def _load_dialogue_memory() -> dict: ...
def _save_dialogue_memory(memory: dict) -> None: ...
def _get_recent_dialogue_memory(topic: str) -> dict: ...
def _append_dialogue_memory(topic: str, tone: str, angle: str, dialogue: list[dict]) -> None: ...
```

### 3. 加 angle queue，避免同 topic 一直講同面向

新增 angle pool：

```python
_DIALOGUE_ANGLES = [
    "money_pressure",       # 錢、薪水、價格、成本
    "policy_responsibility",# 政策、政府、管理責任
    "public_reaction",      # 網友/民眾反應
    "who_benefits",         # 誰得利、誰受害
    "daily_life",           # 一般人生活感受
    "data_gap",             # 數字落差、比例、趨勢
    "history_compare",      # 以前 vs 現在
    "absurd_metaphor",      # 荒謬比喻、笑點
]
```

同 tone 一樣，建議做 per-topic shuffled queue：

```python
_angle_queue: list[str] = []

def _next_angle_for_topic(topic: str) -> str:
    ...
```

`/api/chat` 每輪選：

```python
topic = state.get("topic", "")
turn_type = _next_tone_for_topic(topic)
angle = _next_angle_for_topic(topic)
recent_memory = _get_recent_dialogue_memory(topic)
prompt = _build_prompt(state, turn_type, angle, recent_memory)
```

### 4. Prompt 加「避免重複」區塊

把 `_build_prompt(state, turn_type)` 改成：

```python
def _build_prompt(state: dict, turn_type: str, angle: str = "", recent_memory: dict | None = None) -> str:
```

在 prompt 加入：

```txt
## 本輪角度
- angle = {angle}
- 請只從這個角度切入，不要重複前幾輪角度。

## 最近已講過，請避開
- 最近 tone: ...
- 最近 angle: ...
- 最近台詞摘要 / 原句：...

禁止：
- 不要重複最近 8 輪已出現過的句子。
- 不要用同樣開場，例如每次都「所以呢」「問題就在這」。
- 不要一直用同一個 punchline。
- 同 topic 每輪要推進新觀點，而不是換句話說同一件事。
```

recent lines 不要塞太多，避免 prompt 太肥。建議最多取最近 8-12 句，每句截 36 字。

### 5. Angle 對應說明

在 prompt 中把 angle 說清楚，例如：

```python
angle_notes = {
    "money_pressure": "從錢與壓力切入：薪水、物價、房價、成本、誰負擔。",
    "policy_responsibility": "從政策與責任切入：誰該管、制度哪裡失靈。",
    "public_reaction": "從民眾與網友反應切入：留言區、社群風向、日常抱怨。",
    "who_benefits": "從利益分配切入：誰得利、誰買單、誰被犧牲。",
    "daily_life": "從生活感受切入：上班族、學生、家庭、通勤、消費。",
    "data_gap": "從數字落差切入：比例、趨勢、前後對比，不要硬編精確數字。",
    "history_compare": "從以前與現在比較切入：以前怎樣、現在怎麼變。",
    "absurd_metaphor": "用荒謬比喻或笑點切入，但仍要跟 topic 有關。",
}
```

### 6. 回傳 debug 欄位

`/api/chat` response 可加，不影響前端：

```python
return {
    "dialogue": dialogue,
    "speaker_a": speaker_a,
    "speaker_b": speaker_b,
    "tone": turn_type,
    "angle": angle,
    "topic_round": _current_topic_rounds,
}
```

### 7. 寫入 memory

Claude 回傳 dialogue 成功 parse 後、更新 state 後，呼叫：

```python
_append_dialogue_memory(topic, turn_type, angle, dialogue)
```

如果 Claude API error，不要寫 memory。

### 8. 新 RSS 進來時的 cache 行為維持現狀

使用者原始需求：

```txt
可以把抓取到的 RSS 存起來，就算沒新的話題進來也可以繼續用；當然有新的話題進來，就要移除舊話題。
```

這點 Step 6.1 已做，請不要改壞：

- RSS 抓成功：整批 replace `wwt_news_cache.json`
- RSS 抓失敗：保留舊 cache，直播仍可繼續
- 不要 append 到無限長歷史

本次若有動到 news cache，請保持 replace 策略。

## 驗收

### A. Sanity

```bash
python -c "import server; print('IMPORT OK')"
```

### B. Tone / angle 不重複

連續呼叫 `/api/chat` 5-8 次，檢查 response：

```txt
tone 不應短時間一直重複
angle 不應短時間一直重複
```

### C. 內容不重複

同一個 topic 連續 5 輪，應該看到：

```txt
第 1 輪：可能從錢或民生切入
第 2 輪：換成政策責任
第 3 輪：換成網友反應
第 4 輪：換成誰得利誰受害
第 5 輪：換成荒謬比喻或歷史比較
```

不應一直出現同樣句型：

```txt
所以呢...
問題就在...
誰買得起...
不意外...
```

這些可以偶爾出現，但不能每輪都一樣。

## 完成後輸出

請新增 implementation brief：

```txt
54_PHASE3_STEP6.3_IMPL_BRIEF.md
```

brief 需包含：

- tone queue 如何避免重複
- angle queue 如何避免重複
- dialogue memory 檔案結構
- prompt 如何避開最近內容
- RSS cache replace 策略是否保留
- 驗收方式
