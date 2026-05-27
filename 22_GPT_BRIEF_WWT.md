# Phase 2E Task 5 完成報告

## Topic Driven Conversation Engine

---

## 修改檔案

只動 **`server.py`**、2 處。其他 0 動：
- `index.html` ✅
- `src/config.js` ✅
- `src/scenes/BootScene.js` ✅
- `src/scenes/OfficeScene.js` ✅
- `assets/*` ✅

---

## 1. 修改區塊

### 區塊 1：`_CHARS` 升級人設

從「45 歲工程師 + 30 歲內容編輯」改為任務 5 規格的「50 歲台灣大叔 + 30 歲都會女性」。

### 區塊 2：`_build_prompt()` 全面重寫

加入：
- `topic` + `topic_summary` + `keywords` 三欄資訊
- **discussion mode 強制引用規則**（每 3 句至少一次提 topic/keywords）
- 引用範例（用油價飆漲示範 ✅ 跟 ❌ 對照）
- 字數規則 20~40（取代舊的「不超過 15 字」）
- 禁論文風 / 禁官方新聞稿風 / 禁空泛模板整句
- 5 個禁止當整句的口頭禪明確列出
- discussion 沒 topic 時自動 fallback 到 casual（防呆）

---

## 2. diff

### 區塊 1（_CHARS）

```diff
 # ── 角色定義 ──────────────────────────────────────────────────────
+# Phase 2E Task 5：升級為「議論時事的台灣鄉民」人設、不是空泛口頭禪機器
 _CHARS = {
     'aming': {
         'name': '阿明哥',
-        'personality': '45歲工程師，理性、數據派、喜歡分析、偶爾碎念',
-        'catchphrases': ['等一下啦', '甘有可能', '真的假的', '靠北喔', '我跟你講喔', '以前不是這樣'],
+        'personality': '50歲台灣大叔，議論派、碎念、退休風、喜歡回憶以前、對時事有看法',
+        'catchphrases': ['我跟你講喔', '以前不是這樣', '說真的'],
     },
     'xiaomei': {
         'name': '小美姐',
-        'personality': '30歲內容編輯，理性鄉民、反應快、吐槽能力強',
-        'catchphrases': ['靠夭喔', '有夠扯', '笑死', '不意外', '留言區炸鍋了', '所以呢？'],
+        'personality': '30歲都會女性，吐槽派、反諷型、反應快、看穿事物本質',
+        'catchphrases': ['所以呢？', '不意外', '問題就在這'],
     },
 }
```

### 區塊 2（_build_prompt 核心改寫）

```diff
 def _build_prompt(state: dict, turn_type: str) -> str:
-    """依當前 state 和對話節奏，組出 Claude prompt"""
+    """依當前 state 和對話節奏，組出 Claude prompt（Phase 2E Task 5：Topic Driven）"""
     aming_catch   = "、".join(_CHARS['aming']['catchphrases'])
     xiaomei_catch = "、".join(_CHARS['xiaomei']['catchphrases'])

-    topic   = state.get("topic", "").strip()
-    summary = state.get("topic_summary", "").strip()
-    mode    = state.get("mode", "idle")
+    topic    = state.get("topic", "").strip()
+    summary  = state.get("topic_summary", "").strip()
+    keywords = state.get("keywords") or []        # ← 新：拉 keywords
+    mode     = state.get("mode", "idle")

-    # 決定話題背景
+    # ── 話題區塊（discussion 強制引用、其他模式寬鬆閒聊）─────────────
     if mode == "discussion" and topic:
-        topic_ctx = f"今日話題：{topic}"
-        if summary:
-            topic_ctx += f"\n背景補充：{summary}"
+        topic_block_parts = [f"## 🎯 今日話題（對話必須圍繞此話題）\n{topic}"]
+        if summary:
+            topic_block_parts.append(f"## 話題背景\n{summary}")
+        if keywords:
+            kws_str = "、".join(str(k) for k in keywords[:5])
+            topic_block_parts.append(f"## 相關關鍵字\n{kws_str}")
+        topic_block = "\n\n".join(topic_block_parts)
+
+        cite_rule = (
+            "## 🚨 引用規則（最重要、違反這條就是失敗的輸出）\n"
+            "- **每 3 句對白至少要有一次**明確提到 topic 或上方關鍵字、或具體引用 topic 背景\n"
+            "- 對白主體必須圍繞此話題、絕不能變成跟 topic 無關的閒聊\n"
+            "- 對白要有實質內容（具體看法、引述、吐槽 topic 細節），不是空泛感嘆\n\n"
+            "### 引用範例（topic='油價飆漲'）\n"
+            "  ✅ 阿明：說真的，中油這次壓力其實很大。\n"
+            "  ✅ 小美：所以呢？凍漲只是把問題往後推啊。\n"
+            "  ✅ 阿明：我跟你講喔，油價一漲，物價全跟著漲。\n"
+            "  ❌ 阿明：以前不是這樣。（沒提油價、沒實質內容）\n"
+            "  ❌ 小美：真的假的。（純空泛、沒看法）\n"
+        )
     else:
         casual = random.choice(_CASUAL_TOPICS)
-        topic_ctx = f"閒聊話題：{casual}"
+        topic_block = f"## 閒聊話題（沒設定正式 topic、輕鬆聊）\n{casual}"
+        cite_rule = "## 引用規則\n- 話題輕鬆即可、不強制深度引用，但對白仍要有具體內容、不是空泛口頭禪。"

     # 依 turn_type 決定結構說明 ...（不變）

-    return f"""你是「晚晚嘴台灣 WWT」AI 鄉民談話台的對話生成器。
-
-主持人：
-- 阿明哥（{_CHARS['aming']['personality']}）
-  常用語：{aming_catch}
-- 小美姐（{_CHARS['xiaomei']['personality']}）
-  常用語：{xiaomei_catch}
-
-{topic_ctx}
-
-對話模式：{turn_type}
-{structure}
-
-規則：
-- 每句不超過 15 個字，絕對不可超過 15 個字
-- 繁體中文，台灣口語，有鄉民嘴砲感
-- 偶爾夾入常用語，不要每句都用
-- 禁止：政治人身攻擊、宗教歧視、種族歧視、死亡案件、未成年、性侵、個資
-- 只輸出 JSON 陣列，不要任何其他文字
-
-格式：
-[
-  {{"speaker": "aming", "text": "..."}},
-  {{"speaker": "xiaomei", "text": "..."}}
-]"""
+    return f"""你是「晚晚嘴台灣 WWT」AI 鄉民談話台的對話生成器。
+
+## 主持人設定
+
+### 阿明哥
+- 個性：{_CHARS['aming']['personality']}
+- 常用語：{aming_catch}
+- 風格：碎念、回憶以前、議論時事；常用語只能**穿插**在對白中、不能整句就是口頭禪
+
+### 小美姐
+- 個性：{_CHARS['xiaomei']['personality']}
+- 常用語：{xiaomei_catch}
+- 風格：吐槽、反諷、看穿本質；常用語只能**穿插**在對白中、不能整句就是口頭禪
+
+{topic_block}
+
+## 對話節奏
+{turn_type}：{structure}
+
+{cite_rule}
+
+## 生成規則
+
+### 字數
+- 每句 **20~40 字**（嚴格範圍、過短沒實質內容、過長變論文）
+- 句尾自然口語結束
+
+### 風格
+- 繁體中文、台灣鄉民口語、有溫度有看法
+- ❌ 禁止論文風（「綜上所述」「就此議題而言」）
+- ❌ 禁止官方新聞稿風（「政府表示」「相關單位指出」）
+- ✅ 像真實朋友在電視棚口頭討論時事的感覺
+
+### 禁止當作整句對白（這些只能當對白前綴或穿插、不能就只說這一句）
+- 「以前不是這樣」
+- 「真的假的」
+- 「我跟你講喔」
+- 「甘有可能」
+- 「有夠扯」
+- 任何**完全不引用 topic / 沒有具體看法**的空泛短語
+
+### 內容限制
+- 政治人身攻擊、宗教歧視、種族歧視、死亡案件、未成年、性侵、個資、誹謗、未證實指控、犯罪定罪判斷一律禁止
+
+## 輸出格式
+
+只輸出 JSON 陣列、不要任何其他文字、不要 markdown code fence：
+[
+  {{"speaker": "aming",   "text": "..."}},
+  {{"speaker": "xiaomei", "text": "..."}}
+]"""
```

---

## 3. 測試方式

### A. Prompt 內容驗證（已執行、15/15 PASS）

直接 `import server._build_prompt`、傳 mock state、檢查 prompt 含所有關鍵元素：

```
[PASS] _CHARS 升級正確（50歲台灣大叔、30歲都會女性、新常用語）
[PASS] discussion mode prompt 含 topic 字眼
[PASS] 含 summary
[PASS] 含 keywords（5 個逗號分隔）
[PASS] 含引用規則「每 3 句對白至少要有一次」
[PASS] 含禁止模板列表（以前不是這樣、真的假的）
[PASS] 含字數規則 20-40
[PASS] 含禁論文風
[PASS] 含禁新聞稿風
[PASS] 含引用範例（油價）
[PASS] 50歲台灣大叔人設出現
[PASS] 30歲都會女性人設出現
[PASS] idle mode 走 casual 路徑、不強制引用
[PASS] idle mode 含寬鬆 casual 規則
[PASS] discussion 但 topic 空 → 自動 fallback 到 casual（防呆）
```

### B. 端到端 LLM 測試（需 ANTHROPIC_API_KEY、會耗 token）

```bash
# 1. 啟 server
python server.py

# 2. 設 topic
curl -X POST http://localhost:8765/api/topic \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"油價飆漲\",\"summary\":\"政府暫時凍漲、民眾跟市場討論\"}"

# 3. 觸發對話生成（瀏覽器自動每 1.5s 呼叫、或手動 POST）
curl -X POST http://localhost:8765/api/chat
```

預期回應（每句 20-40 字、引用 topic）：
```json
[
  {"speaker": "aming",   "text": "說真的，中油這次壓力其實很大，凍漲撐不了多久。"},
  {"speaker": "xiaomei", "text": "所以呢？凍漲只是把通貨問題往後推啊。"},
  {"speaker": "aming",   "text": "我跟你講喔，油價一漲物價全跟著漲，這次很麻煩。"}
]
```

### C. 視覺驗證

開瀏覽器、看主持人 bubble：
- ✅ 對白引用「油價」「中油」「通貨」等關鍵字
- ✅ 每句長度 20-40 字、不是「以前不是這樣」這種短模板
- ✅ 有具體看法、不是空泛感嘆

---

## 4. Git commit message

```
feat(server): Phase 2E Task 5 — Topic Driven Conversation Engine

問題：Topic 已正確顯示、但主持人對話仍亂跳模板（「以前不是這樣」「真的假的」），
跟 topic 無關、AI 沒有真正討論話題。

修法：強制 _build_prompt() 把對話拉回 topic 軌道。

_CHARS 升級人設：
- 阿明 45歲工程師 → 50歲台灣大叔（議論派、退休風、回憶以前）
- 小美 30歲內容編輯 → 30歲都會女性（吐槽派、反諷型、看穿本質）
- catchphrases 精簡為核心 3 句：
  阿明 ['我跟你講喔', '以前不是這樣', '說真的']
  小美 ['所以呢？', '不意外', '問題就在這']

_build_prompt 全面重寫：
- 拉 state.keywords 注入 prompt
- discussion mode 強制引用規則：「每 3 句至少一次提 topic/keywords」
- 加引用範例（油價飆漲 ✅/❌ 對照）讓 AI 知道什麼是「好對白」
- 字數規則 15 字 → 20~40 字（避免太短沒料）
- 禁論文風 / 禁官方新聞稿風 / 禁空泛模板整句
- 5 個禁止當整句的口頭禪明確列出
- discussion 沒 topic 時自動 fallback casual（防呆）

只動 server.py、其他檔未動
驗證：prompt 內容檢查 15/15 PASS（含 topic/summary/keywords/引用規則/禁止模板/字數/風格）
```
