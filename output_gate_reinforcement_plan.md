# Output Gate 補強方案

> 用途：給 Claude / 工程師參考。  
> 範圍：只針對「AI 直播 Output Gate / 輸出閘」補強，不包含聊天室互動安全總 review。  
> 專案語境：台灣、繁體中文、AI 角色生成新聞對白、TTS、OBS、YouTube 公開直播。  
> 核心目標：降低誹謗、公然侮辱、未證實犯罪指控、傷亡娛樂化、兒少 / 自殘 / 仇恨 / 個資等公開播送風險。

---

# 0. 總評

目前 output gate 是：

```text
純 regex、命中即整段丟棄。
```

方向對，但現在最大問題是：

> 它只能擋字面，不會判斷「具名真人 + 負面謂語 + 無歸因」這種真正法律風險核心。

建議不要廢掉現有 `_output_gate_segment`。  
它是很好的 L0，但不該當最後決策者。

建議改成：

```text
Regex = 警報器
LLM Judge = 語意裁判
Rewrite = 修復器
Safety Cache = 播放保證
TTS Sanitizer = 最後保險
```

核心規則：

> 不要問「有沒有出現貪污兩個字」。  
> 要問「AI 是不是把貪污指控掛到具名真人身上，而且缺乏歸因或判決」。

---

# 1. 建議架構：三段式 Output Gate

不要直接從 regex 跳到 LLM 全審。建議改成：

```text
Segment Text
  ↓
L0 Regex / Rule Gate
  ↓
L1 Lightweight Risk Extractor
  ↓
L2 LLM Semantic Judge，只審高風險段
  ↓
Decision: PASS / WARN / REWRITE / DROP
```

---

## 1.1 L0：現有 regex 保留

用途：

- 擋明顯侮辱字。
- 擋明顯犯罪指控。
- 擋明顯陰謀論。
- 成本最低。
- 可在生成時與播放時都跑。

但不要直接整段丟。  
改成輸出 risk flags。

```json
{
  "level": "flag",
  "hits": [
    {
      "label": "侮辱字眼",
      "span": "白痴",
      "line_index": 3,
      "severity": "high"
    }
  ]
}
```

---

## 1.2 L1：Lightweight Risk Extractor

L1 不用 LLM，做便宜的結構化偵測。

偵測項目：

- 是否出現具名真人 / 政黨 / 公司 / 組織。
- 是否出現負面人格詞。
- 是否出現犯罪詞。
- 是否出現歸因詞。
- 是否出現有罪推定句型。
- 是否出現傷亡 / 災難關鍵詞。
- 是否出現兒少、自殘、仇恨、個資硬紅線。

輸出：

```json
{
  "candidate_names": ["某某人"],
  "negative_hits": [],
  "crime_hits": [],
  "attribution_hits": [],
  "guilty_assumption_hits": [],
  "hard_block_hits": []
}
```

---

## 1.3 L2：LLM Semantic Judge

只在可疑段落呼叫。

觸發條件：

```text
regex 命中
或 人名 + 負評命中
或 人名 + 犯罪詞命中
或 犯罪詞但缺歸因
或 傷亡 / 災難題材
或 選舉題材
或 兒少 / 自殘 / 仇恨 / 個資題材
```

不建議每段播放前都跑 LLM，會增加延遲與成本。

---

# 2. LLM 語意分類器設計

## 2.1 建議執行位置

```text
生成時一定跑。
播放時只跑 regex + safety cache check。
```

原因：

- 生成時不急，可以跑 LLM judge。
- 播放時不能卡 TTS。
- 每段存進 pool 前就要有 `safety_status`。
- 播放時只重驗 gate version 與 regex。

---

## 2.2 Safety Metadata

每段 dialogue 存：

```json
{
  "dialogue_id": "uuid",
  "safety": {
    "gate_version": "2026-06-07-v1",
    "status": "pass | warn | rewrite_required | drop",
    "reasons": [],
    "checked_at": "ISO_TIME"
  }
}
```

播放時：

```python
if segment["safety"]["gate_version"] != CURRENT_GATE_VERSION:
    rerun_output_gate(segment)

if segment["safety"]["status"] in ["drop", "rewrite_required"]:
    skip_segment()
```

---

## 2.3 LLM Judge Prompt 範本

```text
你是台灣繁體中文 AI 直播節目的輸出安全審核器。

任務：
判斷以下「即將公開播送」的 AI 主持人對白，是否有法律或平台風險。

你只輸出 JSON，不得輸出其他文字。

判斷重點：
1. 是否對具名真人、具名公司、具名政黨、具名組織做負面人格評價或侮辱。
2. 是否對具名真人或組織提出未經證實的犯罪、收錢、貪污、通敵、洗錢、詐騙等指控。
3. 是否把新聞中的嫌疑、調查、起訴，講成已經定罪。
4. 是否用「聽說、據傳、大家都知道」包裝未證實指控。
5. 是否對死亡、傷亡、災難案件娛樂化。
6. 是否有仇恨、自殘、兒少性、暴力煽動、違法教學、個資外洩。
7. 是否只是討論制度、政策、現象，而沒有把負面評價掛到具名個人身上。

輸入包含：
- topic_title: 新聞標題
- source_summary: 新聞摘要
- dialogue_lines: AI 對白
- regex_hits: regex 命中資訊
- named_risks: 人名 + 負評 / 犯罪詞命中資訊

輸出 JSON schema：
{
  "status": "pass | warn | rewrite_required | drop",
  "risk_categories": [],
  "risky_lines": [
    {
      "line_index": 0,
      "risk": "defamation | insult | unverified_crime | guilty_assumption | tragedy_mocking | hate | self_harm | child_safety | violence | illegal | privacy | other",
      "reason": "簡短原因",
      "suggested_action": "keep | rewrite | drop"
    }
  ],
  "safe_summary": "一句話總結判斷"
}

判斷規則：
- 若只是中性提到新聞已報導的案件，且有清楚歸因，例如「新聞報導指出」「檢方起訴」「法院判決」，通常可 pass 或 warn。
- 若角色自己下結論說某人犯罪、收錢、貪污、通敵、洗錢，且沒有來源或判決，應 rewrite_required 或 drop。
- 若出現直接辱罵具名真人，應 rewrite_required 或 drop。
- 若內容涉及兒少性、自殺方法、暴力煽動、個資，應 drop。
- 若只是批評制度、政策、流程、現象，不針對具名真人人格，通常可 pass。
```

---

# 3. 降低誤殺：犯罪詞不等於違規

現在 regex 命中「貪污」就丟，會誤殺正常新聞討論。

改成：

> 犯罪詞不等於違規。  
> 違規是「誰說的 + 指向誰 + 有沒有歸因」。

判斷邏輯：

```text
有犯罪詞
  ↓
是否有具名對象？
  ↓
是否有新聞 / 司法歸因？
  ↓
是否被講成已定罪？
```

---

## 3.1 歸因詞表

```python
ATTRIBUTION_PATTERNS = [
    r"新聞報導",
    r"媒體報導",
    r"根據.*報導",
    r"檢方指出",
    r"檢調指出",
    r"警方表示",
    r"法院認定",
    r"法院判決",
    r"起訴書指出",
    r"判決書指出",
    r"主管機關表示",
    r"官方表示",
]
```

---

## 3.2 有罪推定句型

```python
GUILTY_ASSUMPTION_PATTERNS = [
    r"就是.*貪污",
    r"根本.*收錢",
    r"一定.*洗錢",
    r"擺明.*圖利",
    r"早就.*通敵",
    r"根本就是.*詐騙",
    r"一定是.{0,8}(收|拿|A)了?錢",
    r"背後一定有",
]
```

---

## 3.3 判斷範例

### 可通過

```text
新聞報導指出，這起貪污案目前已由檢方起訴，真正該檢討的是制度漏洞。
```

判斷：

```json
{"status": "pass"}
```

### 要改寫

```text
某某就是貪污啦，還裝什麼清高。
```

判斷：

```json
{"status": "rewrite_required", "risk": "unverified_crime + insult"}
```

### 可警告但不丟

```text
這個貪污案看起來反映出監督制度有問題。
```

如果 topic/source 確實是貪污案，可 `warn` 或 `pass`。

---

# 4. 輕量抓「具名真人 + 負評」

不用完整 NER，也可以做 60 分版本。

---

## 4.1 從新聞來源抽候選名字

不用泛化全世界 NER。  
只需要抓本段新聞裡出現的名字。

來源：

- RSS title
- RSS summary
- generated topic
- dialogue text

簡單抓法：

```python
import re

def extract_candidate_names(title, summary):
    # 粗規則：2~4 個中文字，排除常見名詞
    candidates = re.findall(r'[\u4e00-\u9fff]{2,4}', title + " " + summary)

    stopwords = {
        "台灣", "中國", "美國", "日本", "政府", "法院", "檢方",
        "警方", "立院", "行政院", "民進黨", "國民黨", "民眾黨",
        "公司", "集團", "今日", "新聞", "表示", "指出", "報導",
        "目前", "相關", "事件", "政策", "制度", "問題"
    }

    return [c for c in candidates if c not in stopwords]
```

---

## 4.2 維護已知人物 / 組織表

更穩一點：維護 `known_public_entities.json`。

```json
{
  "politicians": ["賴清德", "蕭美琴", "卓榮泰", "韓國瑜", "柯文哲", "侯友宜"],
  "parties": ["民進黨", "國民黨", "民眾黨"],
  "media_people": [],
  "business_people": [],
  "companies": [],
  "organizations": []
}
```

實務上可先手動維護台灣新聞常見人物，不需要一開始做完整 NER。

---

## 4.3 負面謂語表

分級，不要一張表打死。

```python
NEGATIVE_LIGHT = [
    "荒謬", "離譜", "難看", "失職", "翻車", "打臉", "雙標"
]

NEGATIVE_PERSONAL = [
    "無能", "騙子", "垃圾", "白痴", "腦殘", "低能",
    "可悲", "不要臉", "噁心", "下流", "廢物"
]

CRIME_WORDS = [
    "貪污", "收賄", "洗錢", "圖利", "詐騙", "通敵", "賣國", "掏空"
]
```

---

## 4.4 偵測規則

```python
def detect_named_entity_negative(text, names):
    findings = []

    for name in names:
        for word in NEGATIVE_PERSONAL + CRIME_WORDS:
            pattern = rf"{re.escape(name)}.{{0,12}}{word}|{word}.{{0,12}}{re.escape(name)}"
            if re.search(pattern, text):
                findings.append({
                    "name": name,
                    "word": word,
                    "type": "named_entity_negative"
                })

    return findings
```

---

## 4.5 建議處理表

| 命中類型 | 處理 |
|---|---|
| 人名 + 輕度政策批評 | warn |
| 人名 + 人格羞辱 | rewrite |
| 人名 + 犯罪詞 | LLM judge |
| 人名 + 犯罪詞 + 無歸因 | drop / rewrite |
| 組織 + 犯罪詞 | LLM judge |
| 政策 / 制度 + 負評 | pass |

---

# 5. 分級策略：不要只有全丟

建議四級：

```text
PASS：直接入池
WARN：入池，但記錄原因
REWRITE：送改寫器，改完再審一次
DROP：整段丟棄
```

---

## 5.1 分級表

| 等級 | 條件 | 動作 |
|---|---|---|
| PASS | 無風險，或只批評制度現象 | 入池 |
| WARN | 有敏感詞，但有清楚歸因 | 入池 + log |
| REWRITE | 句子可救，例如罵到具名真人 | 改寫該句 |
| DROP | 兒少、自殺方法、仇恨、個資、暴力煽動、嚴重誹謗 | 丟棄 |

---

# 6. 改寫器設計

不要整段重寫。  
只改 risky lines。

---

## 6.1 Rewrite Prompt

```text
你是台灣繁體中文 AI 直播節目的安全改寫器。

任務：
只改寫標記為 risky 的句子，保留原本意思、節奏、角色語氣，但移除法律與平台風險。

改寫原則：
1. 不罵具名真人。
2. 不把犯罪或收錢指控掛到具名真人身上。
3. 批評主詞改成「這件事」「這個制度」「這種現象」「這個決策過程」。
4. 不新增新聞沒有的事實。
5. 不改安全句。
6. 保持繁體中文、台灣口語。
7. 不要變成官方聲明，要像主持人講話。

輸出 JSON：
{
  "rewritten_lines": [
    {
      "line_index": 2,
      "text": "改寫後句子"
    }
  ]
}
```

---

## 6.2 改寫範例

原句：

```text
賴清德根本是個無能的騙子。
```

改成：

```text
這件事如果溝通成這樣，真的會讓民眾覺得很失望。
```

原句：

```text
某某一定是收錢啦，不然怎麼會這樣搞。
```

改成：

```text
這種決策過程如果不透明，很容易讓外界產生疑慮。
```

---

## 6.3 改寫後再審一次

```text
原段落
  ↓
judge: rewrite_required
  ↓
rewrite risky lines
  ↓
second judge
  ↓
pass / warn 才可入池
```

不要改寫完直接播。

---

# 7. 詞表治理

不要只維護 `_GATE_PATTERNS`。  
拆成 5 張表：

```text
insult_terms.yaml
crime_terms.yaml
conspiracy_terms.yaml
attribution_terms.yaml
safe_subject_terms.yaml
```

---

## 7.1 建議格式

```yaml
version: 2026-06-07
terms:
  - term: "白痴"
    category: "insult"
    severity: "drop_if_named_person"
    notes: "公然侮辱風險"
  - term: "貪污"
    category: "crime"
    severity: "judge_if_attributed"
    notes: "新聞案件可討論，但不可無端指控"
```

---

## 7.2 治理規則

每次被 gate 擋掉，都寫 log：

```json
{
  "dialogue_id": "uuid",
  "matched_term": "貪污",
  "decision": "warn",
  "false_positive": null,
  "reviewed_by": null
}
```

每週人工看一次：

- 誤殺高的詞 → 降級為 LLM judge。
- 漏掉的詞 → 加入詞表。
- 高風險詞 → 保持 hard block。
- 常見新聞詞 → 加 attribution 判斷。

---

# 8. 成本與延遲取捨

---

## 8.1 最省錢版本

```text
L0 regex 全跑
只有命中 regex 或偵測到人名 + 負評時，才跑 LLM judge
```

適合現在。

優點：

- 成本低。
- 工程量小。
- 比現在誤殺少。

缺點：

- 漏網率中等。
- 仰賴詞表品質。

---

## 8.2 穩健版本

```text
每段生成後都跑 cheap LLM judge
播放時只跑 regex + safety cache
```

適合公開 24H。

優點：

- 風險低很多。
- 播放時延遲低。
- 好監控。

缺點：

- 生成成本增加。
- 需要 safety cache。

---

## 8.3 高安全版本

```text
每段生成後：
regex → LLM judge → risky line rewrite → second judge

播放前：
regex → cache version check
```

適合：

- 選舉期。
- 政治新聞多。
- 社會重大事件。
- 傷亡新聞多。

優點：

- 風險最低。
- 可保留可救內容，不用大量丟段。

缺點：

- 成本較高。
- pipeline 較複雜。

---

# 9. Output Gate 偽碼

```python
def output_gate_segment(segment, source_summary=None):
    text = join_lines(segment["lines"])

    l0 = regex_scan(text)
    names = extract_candidate_names(
        segment.get("topic", ""),
        source_summary or ""
    )

    named_risks = detect_named_entity_negative(text, names)

    # 明確不可救
    if has_hard_block(text):
        return GateResult(status="drop", reason="hard_block")

    # 低風險直接過
    if not l0.hits and not named_risks:
        return GateResult(status="pass")

    # 有歸因的新聞案件，交給 judge，不直接丟
    judge_input = {
        "topic_title": segment.get("topic"),
        "source_summary": source_summary,
        "dialogue_lines": segment["lines"],
        "regex_hits": l0.hits,
        "named_risks": named_risks
    }

    judge = llm_safety_judge(judge_input)

    if judge.status == "pass":
        return GateResult(status="pass")

    if judge.status == "warn":
        return GateResult(status="warn", reasons=judge.risky_lines)

    if judge.status == "rewrite_required":
        rewritten = rewrite_risky_lines(segment, judge.risky_lines)
        second_judge = llm_safety_judge(rewritten)

        if second_judge.status in ["pass", "warn"]:
            return GateResult(status="pass", segment=rewritten)

        return GateResult(status="drop", reason="rewrite_failed")

    return GateResult(status="drop", reason=judge.safe_summary)
```

---

# 10. 播放時保險

播放時不要重跑完整 LLM。

建議流程：

```python
def before_tts(segment):
    safety = segment.get("safety")

    if not safety:
        return Skip("missing_safety")

    if safety["gate_version"] != CURRENT_GATE_VERSION:
        return Skip("stale_safety_version")
        # 或背景重審，但不要播放時卡住

    if safety["status"] not in ["pass", "warn"]:
        return Skip("unsafe_status")

    text = join_lines(segment["lines"])

    tts_result = tts_sanitizer(text)

    if not tts_result.ok:
        return Skip(tts_result.reason)

    return Play(segment)
```

---

# 11. TTS Final Sanitizer

即使文字通過，也要擋：

- URL
- email
- 電話
- 地址
- SSML / XML
- markdown link
- 奇怪符號
- 過長停頓
- 控制字元
- 零寬字

範例：

```python
def tts_sanitizer(text):
    if re.search(r"https?://|www\.", text):
        return Fail("url")

    if re.search(r"\b[\w.-]+@[\w.-]+\.\w+\b", text):
        return Fail("email")

    if re.search(r"<[^>]+>", text):
        return Fail("xml_or_html")

    if re.search(r"[\u200b\u200c\u200d\ufeff]", text):
        text = remove_zero_width(text)

    return Ok(text)
```

---

# 12. Gate Metrics

至少要記：

```text
gate_pass_count
gate_warn_count
gate_rewrite_count
gate_drop_count
gate_drop_reason_top10
rewrite_success_rate
playback_skip_count
stale_safety_version_count
tts_sanitizer_block_count
```

用途：

- 看 gate 是有效還是亂殺。
- 找出誤殺詞。
- 找出漏網風險。
- 估算成本。
- 決定是否需要調整詞表。

---

# 13. Election Mode

選舉期切更嚴。

規則：

```text
具名候選人 + 負評 → rewrite
具名候選人 + 犯罪詞 → drop unless source says court verdict
投票資訊 → 只允許官方來源
民調 / 開票 / 投票方式 → 需要來源歸因
未證實爆料 → drop
深偽 / 變造影音 → drop
```

建議新增：

```python
ELECTION_MODE = True
```

並在 LLM judge prompt 加一句：

```text
目前為選舉 / 罷免敏感期間，對候選人、政黨、投票資訊採更嚴格標準。
```

---

# 14. 最小改造版

不過度設計的版本：

```text
保留現有 regex
新增 names.json / known_public_entities.json
新增 negative_terms.yaml
新增 attribution_terms.yaml
新增 LLM judge，只審可疑段
新增 rewrite_risky_lines
新增 safety cache
播放時只看 cache + regex version
新增 TTS sanitizer
```

工程順序：

```text
Step 1：regex 改成回傳 hits，不要直接 bool
Step 2：加 safety.status
Step 3：加人名 + 負評粗偵測
Step 4：可疑段丟 LLM judge
Step 5：rewrite_required 才送改寫
Step 6：改寫後再審一次
Step 7：播放時只播 pass / warn
Step 8：加 TTS sanitizer
Step 9：加 metrics
```

---

# 15. Claude 實作任務摘要

## 任務 1：重構 regex gate

目前：

```python
return False, label
```

改成：

```python
return GateScanResult(
    hits=[
        {
            "line_index": 2,
            "span": "...",
            "label": "...",
            "severity": "..."
        }
    ]
)
```

---

## 任務 2：新增 safety metadata

每段 dialogue 存：

```json
{
  "safety": {
    "status": "pass | warn | rewrite_required | drop",
    "gate_version": "v1.0",
    "checked_at": "ISO_TIME",
    "reasons": []
  }
}
```

---

## 任務 3：新增 source-aware LLM judge

只在以下情況呼叫：

- regex 命中。
- 人名 + 負評命中。
- 犯罪詞命中。
- 傷亡 / 選舉 / 兒少 / 自殘相關命中。
- 歸因不足但有犯罪詞。

---

## 任務 4：新增 risky line rewrite

只改 risky lines，不改整段。  
改完後再跑一次 judge。

---

## 任務 5：新增播放時保險

播放時：

```python
if safety.status not in ["pass", "warn"]:
    skip

if safety.gate_version != CURRENT_GATE_VERSION:
    skip_or_rerun_gate

run_tts_sanitizer()
```

---

## 任務 6：新增 metrics

至少記：

```text
gate_pass_count
gate_warn_count
gate_rewrite_count
gate_drop_count
gate_drop_reason
rewrite_success_rate
playback_skip_count
tts_sanitizer_block_count
```

---

# 16. 最後結論

你現在的 `_output_gate_segment` 不要廢掉，它是很好的 L0。  
但它不該當最後決策者。

最小可行補強：

```text
Regex hits
→ 人名 + 負評粗偵測
→ 可疑段 LLM Judge
→ risky line rewrite
→ second judge
→ safety cache
→ 播放時 cache check + TTS sanitizer
```

最後一句：

> AI 直播安全不是讓模型「乖一點」。  
> 是把所有會公開播出的文字，都當成要過審的節目稿。
