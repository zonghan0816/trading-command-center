# 88 — TTS 正選聲音自動切備選 + 通知（語音容錯）

**日期**：2026-06-05
**檔案**：`server.py`（TTS helpers 區塊）
**觸發**：使用者在公司端 console 看到男主持（陳柏偉）一直 `[tts] gen failed (aming): No audio was received`、女主持正常。

---

## 1. 問題診斷（為什麼男聲沒聲音）

公司端 console 一直洗：

```
[tts] gen failed (aming): No audio was received. Please verify that your parameters are correct.
```

而女主持（xiaomei）正常出聲。所以**不是**整體網路 / SSL 問題。

本機實測（edge-tts 7.2.8）逐一比對聲音 × 語速：

| 聲音 | 結果 |
|---|---|
| `zh-TW-HsiaoChenNeural`（舊台灣女聲）| ✅ OK |
| `zh-TW-YunJheNeural`（台灣男聲＝陳柏偉用的）+0% | ❌ No audio |
| `zh-TW-YunJheNeural` -5% | ❌ No audio |
| `zh-CN-XiaoxiaoNeural`（曉曉、女聲現用）| ✅ OK |
| `zh-CN-YunxiNeural / YunyangNeural / YunjianNeural`（大陸男聲）| ✅ OK |

**結論**：

- 跟語速 `-5%` **完全無關**（YunJhe 連 `+0%` 也掛）。
- 不是「台灣聲音全壞」——台灣女聲還活著。
- **是 `zh-TW-YunJheNeural` 這個特定聲音被微軟伺服器搞壞**（回空音訊）、不可控、可能哪天自己修回來。
- 痛點：**`YunJhe` 是 edge-tts 唯一的台灣男聲**（台灣 neural 只有 HsiaoChen 女 / HsiaoYu 女 / YunJhe 男）。男聲掛了就沒有第二個台灣男聲可換。

---

## 2. 決策路徑

使用者選擇：**保留 `zh-TW-YunJhe` 當正選**（台灣味、微軟修好會回來），**`zh-CN-Yunjian`（雲健）當自動備選**，並要求「偵測到聲音壞掉就自動從正選換備選、或通知我」。

候選備選聲音聽過樣本後選雲健（激情大聲、最貼 3Q 陳柏惟嗆辣草根風；另兩個 Yunxi 活潑、Yunyang 偏正式主播）。

→ 做成 **circuit breaker（熔斷器）** 模式、而不是「每句都先試正選再 fallback」。理由：

| 方案 | 缺點 |
|---|---|
| 每句都先試正選、失敗再 fallback | 正選掛掉期間**每一句都浪費一次失敗的網路呼叫 + 增加延遲**、24H 直播累積很可觀 |
| **熔斷器（採用）** | 正選失敗 → 設冷卻、冷卻內直接用備選；冷卻過了才探一次正選 → 浪費降到「每 10 分鐘 1 次探測」 |

---

## 3. 實作（server.py）

### 設定

```python
_TTS_VOICES = { "aming": "zh-TW-YunJheNeural", ... }      # 正選
_TTS_FALLBACK_VOICES = { "aming": ["zh-CN-YunjianNeural"], "xiaomei": [] }  # 備選（依序）
_TTS_VOICE_COOLDOWN_SEC = 600                              # 正選掛掉冷卻 10 分鐘
_tts_voice_state: dict = {}                               # speaker -> {"down_until", "active"}
```

### 機制

- `_candidate_voices(speaker)`：正常回 `[正選, 備選]`；正選冷卻中只回 `[備選]`（不每句重試正選）。
- `_gen_tts_line`：依序試候選聲音，
  - 正選成功 → `_mark_voice_recovered`（若原本掛掉、印恢復通知 + 清狀態）。
  - 正選失敗 → 記 `primary_failed_now`，接著試備選；備選成功 → `_mark_voice_down`（設冷卻、**只在剛掉下去時印一次通知**、不洗版）。
- **快取 key 改用「實際聲音 + 語速 + 文字」**（原本含 speaker）：備選音訊存在自己 key 下、不會蓋到正選；正選修好就播回正選音訊。
  - 副作用：舊快取檔（含 speaker 的舊 key）會變孤兒、一次性重生、無害。

### 自動切回

正選冷卻過 → 下一輪 `_candidate_voices` 又把正選排第一 → 探測一次：
- 微軟已修好 → 正選成功 → 印「✓ 正選聲音恢復」+ 清狀態 → 之後都用正選。
- 還沒修好 → 正選又失敗 → 重設冷卻、繼續用備選。

### 通知通道

console banner（使用者本來就是看 cmd console 發現問題的）：

```
================================================================
[tts] ⚠ 正選聲音失效：aming 的 zh-TW-YunJheNeural 回空音訊
[tts]    → 已自動切換備選：zh-CN-YunjianNeural
[tts]    → 10 分鐘後自動再試正選（微軟修好會切回）
================================================================
```

恢復時印對應的 `✓ 正選聲音恢復`。

---

## 4. 測試（本機 edge-tts 7.2.8、真打微軟）

| 情境 | 結果 |
|---|---|
| 正選真的壞（YunJhe）→ 切備選雲健 + 印通知一次 | ✅ |
| 冷卻中第二句 → 直接用備選、不洗版；候選清單只剩備選 | ✅ |
| 女聲（曉曉）正常 → 不進冷卻、state 為 None | ✅ |
| 模擬正選復活（暫指能用聲音）→ 切回正選 + 印恢復 + 清狀態 | ✅ |

---

## 5. 部署提醒

公司端那台（直播機）要 `git pull` + 重啟 `啟動.bat` 才會生效。生效後男主持（陳柏偉）會立刻改用雲健出聲、不再靜音；console 會出現一次切換通知。等微軟修好 YunJhe、10 分鐘內自動切回台灣男聲。

---

## 6. 與之前方案的差異

- Step 5.31/5.32 的 TTS 是「單一聲音、失敗就 None（前端 fallback 到 Web Speech）」。本次加「**伺服器端正選/備選自動切換**」這層、在 Web Speech fallback 之前先確保 server 端有 mp3 可播（音質遠優於瀏覽器 speechSynthesis）。
- 兩層 fallback 疊加：server 正選 → server 備選 → （都失敗才）前端 Web Speech。

---

## 7. 兩位主持人聲音設定（對稱：台灣正選 / 大陸備胎）

使用者要求「台灣聲音當正選、大陸聲音當備胎」、兩位對稱：

| 主持人 | 正選（台灣）| 備胎（大陸）| 語速 |
|---|---|---|---|
| 陳柏偉 aming | `zh-TW-YunJheNeural`（雲哲）| `zh-CN-YunjianNeural`（雲健）| -5% |
| 王于安 xiaomei | `zh-TW-HsiaoChenNeural`（曉臻）| `zh-CN-XiaoxiaoNeural`（曉曉）| +0% |

> 註：王于安原本（commit 00f2abb）被改成大陸曉曉當正選。本次改回台灣曉臻當正選（實測 zh-TW 女聲仍正常）、大陸曉曉退為備胎。男聲 YunJhe 目前壞著、所以實際會先用雲健、微軟修好自動切回。

---

## 8. 線上切聲音 API + `/voice` 手機控制頁（免重開）

問題：改聲音要重開伺服器、但使用者人不在直播機旁。解法：runtime API、不用重開。

| 端點 | 用途 |
|---|---|
| `GET /api/tts/status` | 回每位主持人的正選/語速/備胎/正選健康狀態（含冷卻剩餘秒數）|
| `POST /api/tts/voice` | 即時切換 `{"speaker","voice","rate"}`、白名單防呆、手動切會清掉熔斷狀態 |
| `GET /voice` | 手機友善控制頁、按鈕即時換聲音 + 調語速、每 5 秒刷新狀態 |

- 聲音白名單 `_TTS_ALLOWED_VOICES`（6 個實測能用的 zh 聲音）、亂打回 400。
- 切聲音不用清快取：快取 key 已含實際聲音、換聲音自然走新 key 重生。
- 用法：手機瀏覽器開 `http://<直播機IP>:8765/voice`。

**部署後就再也不用為了換聲音重開**：以後 YunJhe 壞了會自動切備胎、你也能手機手動切，都免重開。

> 測試：本機起 server（port 8799）實打 —— status 正確、POST 即時生效、換回、亂打聲音/角色被擋 400、只改語速 OK、/voice 頁面回 200 且中文 UTF-8 正確。
