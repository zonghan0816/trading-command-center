# YouTube 聊天室 × AI 互動：實作前補強建議

> 給 Claude / 工程師參考。  
> 範圍：只針對 `95_YT_CHAT_AI_INTERACTION_REVIEW_REQUEST.md` 的 YT 聊天室互動功能提出實作前建議。  
> 要求：不放程式碼，只給流程、規格、閾值、取捨與上線分界。  
> 專案語境：台灣、繁體中文、AI 角色新聞直播、YouTube 公開 24H、聊天室互動、Claude 生成、TTS、OBS。

---

# 0. 總評

現有設計已經比一般「聊天室丟給 AI 回答」安全很多。你們已經抓到三個核心：

1. 主 AI 不看 raw comment。
2. 真正要審的是最後播出去的文字。
3. 互動內容不能自動進循環 pool。

但實作前我會再補 10 個重點，否則 prototype 可以跑，公開長跑仍有事故風險。

---

# 1. 我會新增的三個橫向模組

目前 P0–P6 架構基本完整。建議再加三個橫向模組，不要新增太多複雜度。

## 1.1 Interaction Mode Controller

用途：根據風險狀態切換互動模式。

| 模式 | 說明 | 何時使用 |
|---|---|---|
| OPEN | 正常互動 | 私測、低流量、低風險 |
| GUARDED | 只回 safe / soft_redirect | 預設公開模式 |
| LOCKDOWN | 只播 canned response，不進主 AI | unsafe spike、政治敏感時段、爆量洗版 |
| OFF | 關閉互動，只跑循環節目 | API 異常、成本爆、攻擊中 |

重點：

> 互動不是只有開 / 關。要能降級，不然一遇攻擊就只能整個功能停掉。

## 1.2 Shadow Moderation Queue

用途：先不公開互動，只跑完整 P0–P6，收集資料。

公開前建議跑：

- 私人直播或不公開直播 8 小時。
- 假留言壓測 2 小時。
- 真聊天室 shadow mode 24 小時。
- AI 生成結果只進 log，不播出。
- 人工抽查 safe / grey / hard_block / output gate 命中是否合理。

通過條件：

| 指標 | 公開前建議門檻 |
|---|---|
| hard_block 漏網 | 0 |
| 具名真人誹謗漏網 | 0 |
| unsafe spike 自動降級成功率 | 100% |
| output gate 擋下高風險輸出 | 必須可觀察 |
| P0–P6 平均處理延遲 | 不影響直播節奏 |
| 成本上限觸發 | 觸發後能安全降級 |

## 1.3 Human Kill Switch

必做。

至少要有：

- 立即關聊天室互動。
- 立即清空互動插隊佇列。
- 立即切換 canned fallback。
- 立即停用 Super Chat 互動加權。
- 立即標記目前 replay 需要人工檢查。
- 前端畫面改成「互動暫停，節目照常播出」。

這不需要複雜 UI。一個本機管理頁或一個檔案開關都可以。

---

# 2. 讀聊天室：pytchat vs YouTube Data API

## 2.1 建議結論

Prototype：

> 可先用 pytchat，但必須包一層 Chat Source Adapter，不能讓 pytchat 直接綁死業務邏輯。

公開長跑：

> 建議準備 YouTube Data API 備援，至少要把介面抽象好，未來能切換。

## 2.2 pytchat 優缺點

優點：

- 不用 OAuth。
- 不吃官方 quota。
- 開發快。
- 適合 prototype。

缺點：

- 非官方。
- YouTube 改版可能壞。
- 斷線、漏訊、重複訊息要自己處理。
- 長時間穩定性較不可控。
- 出問題時不容易判斷是你程式壞，還是 YouTube 前端改了。

建議：

- pytchat 只當「來源之一」。
- 讀到的每則留言先轉成內部標準格式。
- source 欄位標記為 pytchat。
- 記錄 last_seen message id / timestamp。
- 偵測 2 分鐘無訊息但直播仍在線時，重連。
- 重連後去重，不要重複處理舊訊息。
- pytchat 掛掉時，不要讓直播掛掉，只降級為「互動暫停」。

## 2.3 YouTube Data API 優缺點

優點：

- 官方。
- 有明確回傳格式。
- 可拿到 live chat id、authorDetails、snippet。
- 回傳有 nextPageToken / pollingIntervalMillis，可依官方建議節奏輪詢。
- 比較適合長跑與可維護性。

缺點：

- OAuth 設定較麻煩。
- quota 要管理。
- 需要處理權限、403、liveChatDisabled、liveChatEnded 等狀態。
- 需要 API key / OAuth 憑證保護。

建議：

- 不一定第一版就上官方 API。
- 但第一版就要設計 Chat Source Adapter。
- 公開長跑前，至少完成官方 API 讀取測試。
- 最好保留 pytchat / API 雙來源切換。

## 2.4 Chat Source Adapter 規格

內部標準格式建議：

| 欄位 | 說明 |
|---|---|
| source | pytchat / youtube_api / fake_injector / replay |
| message_id | 原始留言 ID |
| user_id_hash | 雜湊後的使用者 ID |
| display_name_raw | 原始暱稱，只進 log，不直接播 |
| display_name_safe | 清洗後稱呼，預設觀眾 A |
| message_raw | 原始留言，只進 P0，不進主 AI |
| message_normalized | normalization 後文字 |
| is_super_chat | 是否 Super Chat |
| super_chat_amount_bucket | 金額級距，不必保存精確金額 |
| timestamp | 收到時間 |
| source_health | 來源狀態 |

---

# 3. 無 live 怎麼測

## 3.1 必做 Fake Comment Injector

開發機沒有 live 時，必須能端到端測 P0–P6。

它要能模擬：

- 一般留言。
- Super Chat。
- 暱稱攻擊。
- 貼圖文字。
- 重複洗版。
- 多帳號協同攻擊。
- 高速 burst。
- 斷線後重送。
- 直播 replay 讀取。

## 3.2 測試資料集分類

建立 `chat_redteam_cases`，至少分 12 類：

| 類別 | 測試目的 |
|---|---|
| prompt injection | 忽略設定、洩漏 prompt、改角色 |
| encoding | base64、URL encoding、摩斯、藏頭 |
| unicode | 零寬字、全形半形、同形字 |
| zhuyin / 台羅 / 諧音 | 台灣語境繞過 |
| multi-message | 多則拼接攻擊 |
| display name | 暱稱人肉 / 暱稱髒話 / 暱稱廣告 |
| defamation bait | 誘導 AI 指控真人 |
| election | 投票錯誤資訊、民調、罷免 |
| self-harm / medical | 自傷方法、急症亂問 |
| child safety | 兒少性、grooming 暗示 |
| scam / link | 投資群、釣魚網址、假公益 |
| cost abuse | 長文、洗版、Super Chat 爆預算 |

## 3.3 建議測試階段

| 階段 | 目的 | 是否可省 |
|---|---|---|
| Unit test | 測 P0 normalization / 黑名單 | prototype 必做 |
| Pipeline test | 假留言跑完整 P0–P6 | prototype 必做 |
| Replay test | 用錄製聊天室重播 | 公開前必做 |
| Shadow live | 真直播只記錄不播互動 | 公開前必做 |
| Attack drill | 人工紅隊亂打 | 公開前必做 |

---

# 4. Normalization 要做到什麼程度

不要追求一次做到完美。建議分三層。

## 4.1 第一層：公開前必做

成本低，效果高。

必做：

- 去零寬字。
- 全形轉半形。
- Unicode 正規化。
- 英文字母小寫化。
- 重複字壓縮。
- URL 偵測與移除。
- email / 電話 / 地址樣式偵測。
- 常見分隔符移除後再掃一次。
- emoji 不直接刪，先轉成類別或保留標記。
- 簡繁常見詞對應。
- 注音常見攻擊詞對應。
- 台灣常見諧音黑話表。

## 4.2 第二層：公開後逐步加

可後補：

- Base64 偵測。
- URL encoding 偵測。
- 摩斯碼偵測。
- 藏頭偵測。
- homograph 字元對應。
- 台羅 / 台語諧音詞表。
- 同音字攻擊詞表。

## 4.3 第三層：高風險時才啟用

只在 unsafe spike 或選舉期啟用：

- 多則留言拼接偵測。
- 使用者群體協同攻擊偵測。
- 相似語意集群。
- 長時間 persona drift 偵測。

---

# 5. raw 隔離 vs 喜劇校準

## 5.1 建議結論

預設：

> intent-only。

只有在「公開前已經穩定」後，才開 safe quote。

## 5.2 safe quote 的風險

即使是 safe 留言，也可能：

- 被分類器誤判。
- 用定界符注入。
- 原句含諧音梗，TTS 念出來變紅線。
- 原句含個資片段。
- 原句含 URL 或品牌導流。
- 主持人為了吐槽而複述不該複述的詞。
- 觀眾故意設計「看似 safe、念出來才出事」的句子。

所以「定界符 + normalization」不夠。它只是降低風險，不是安全保證。

## 5.3 safe quote 開啟條件

建議同時滿足：

- P0 通過。
- P1 risk = safe。
- 無 URL / email / 電話 / 地址。
- 無具名真人。
- 無政黨 / 候選人 / 企業名。
- 無醫療 / 法律 / 投資 / 自傷 / 兒少 / 仇恨。
- 無 prompt injection 語氣。
- 長度小於 30 個中文字。
- output gate 對引用後成品再審一次。
- TTS sanitizer 通過。

## 5.4 safe quote 顯示方式

不要讓主 AI「自由引用」。

建議：

- 主 AI 只知道「有一句消毒後觀眾短句可作笑點」。
- 不要求逐字引用。
- 允許改寫成主持人自己的話。
- 最後生成文字一定過 P5。

| 風險 | 主 AI 可拿到 |
|---|---|
| safe + 非敏感 + 短句 | viewer_intent + sanitized_short_quote |
| safe 但涉及人物 / 政治 / 金融 | viewer_intent only |
| grey | canned neutral intent only |
| unsafe | 不進主 AI |

---

# 6. 選球 P2 建議

## 6.1 不建議「掃到好留言立刻回」

原因：

- 成本容易失控。
- 容易被觸發型攻擊操控。
- 直播節奏會被聊天室牽著走。
- Super Chat 會製造付費壓力。

建議：

> 固定互動窗口 + 高分破門，但破門要有冷卻。

## 6.2 建議節奏

Prototype：

- 每 10 分鐘最多回 1 則。
- 每小時最多 4 則。
- 每次只處理最近 3–5 分鐘留言。
- 開窗時間 2–3 分鐘。

公開初期：

- 每 15 分鐘最多回 1 則。
- 每小時最多 3 則。
- 每人每小時最多被回 1 次。
- 每人每日最多被回 2 次。
- Super Chat 每 30 分鐘最多觸發 1 次。
- unsafe spike 時切 LOCKDOWN。

穩定後：

- 每 10 分鐘最多 1 則。
- 高分破門每 20 分鐘最多 1 次。
- Super Chat 仍不保證回。

## 6.3 評分公式建議

不要讓 Super Chat 權重過高。

| 指標 | 權重 |
|---|---|
| 與當前新聞 / 節目話題相關 | 高 |
| 問句清楚 | 中 |
| 非敏感、非具名攻擊 | 必要條件 |
| 使用者近期未被回 | 中 |
| Super Chat | 中低 |
| 新觀眾 | 低 |
| 文字短、可安全摘要 | 高 |
| 重複 / 洗版 / 長文 | 扣分 |
| 有 URL / 導流 / 政治狗哨 | 直接排除或降級 |

Super Chat 建議只加一點分，不要超過總分 15–20%。

## 6.4 選球原則

必須遵守：

- unsafe 不入選。
- grey 不進主 AI，只用 canned 太極。
- Super Chat 只加權，不免審，不必回。
- 同一主題只留一則代表留言。
- 同一使用者有冷卻。
- 同一群人洗同一立場，不視為輿情。
- 不選「請 AI 評論某真人是否怎樣」。
- 不選「要求 AI 站隊」。
- 不選「要求 AI 唸原文」。

---

# 7. unsafe spike 偵測

## 7.1 建議指標

不要只看比例，要看比例 + 數量 + 速度。

建議同時記：

- 最近 60 秒總留言數。
- 最近 60 秒 unsafe 數。
- 最近 60 秒 unsafe 比例。
- 最近 5 分鐘 unsafe 比例。
- 最近 5 分鐘 unique users。
- 同類攻擊重複次數。
- 單一 user 發言速度。
- Super Chat unsafe 數。
- P5 output gate drop 次數。
- LLM judge 被迫 drop 次數。

## 7.2 建議閾值

Prototype：

| 條件 | 動作 |
|---|---|
| 60 秒內 unsafe >= 5 | 切 GUARDED |
| 60 秒內 unsafe ratio >= 30% 且留言數 >= 10 | 切 GUARDED |
| 5 分鐘內 unsafe ratio >= 25% | 切 LOCKDOWN |
| P5 連續 drop 2 次 | 切 LOCKDOWN |
| 單人 30 秒內 5 則以上 | 該 user 冷卻 |
| Super Chat unsafe 連續 2 筆 | Super Chat 權重暫停 30 分鐘 |

公開初期：

| 條件 | 動作 |
|---|---|
| 60 秒內 unsafe >= 3 | 切 GUARDED |
| 60 秒內 unsafe ratio >= 20% 且留言數 >= 8 | 切 GUARDED |
| 5 分鐘內 unsafe ratio >= 15% | 切 LOCKDOWN |
| P5 任一 hard drop | 暫停互動 10 分鐘 |
| 出現兒少 / 自傷方法 / 人肉 | 立即 LOCKDOWN |

## 7.3 自動恢復

不要立刻恢復。

建議：

- GUARDED 至少維持 10 分鐘。
- LOCKDOWN 至少維持 30 分鐘。
- 恢復前需要連續 10 分鐘 unsafe ratio < 5%。
- 恢復時先回 GUARDED，不直接 OPEN。
- 若 1 小時內重複 LOCKDOWN 2 次，當天關互動。

---

# 8. Audit Log / 事故處理

## 8.1 要記什麼

分兩種 log。

### 安全 log

保存較短，含敏感資料最小化。

建議記：

- message_id。
- user_id_hash。
- timestamp。
- source。
- risk。
- categories。
- selected / not selected。
- action：drop / redirect / summarize / answer。
- p0_hits。
- p1_result。
- p5_result。
- final_spoken_text_hash。
- incident_id。

不要長期保存完整 raw comment。若要保存 raw comment，只留在短期 encrypted debug log。

### 產品 log

可保存較久。

建議記：

- 每小時留言量。
- 每小時互動回覆數。
- 平均處理延遲。
- LLM 成本。
- drop reason 統計。
- unsafe spike 次數。
- mode 切換紀錄。
- P5 drop 次數。
- TTS sanitizer 擋下次數。

## 8.2 保存期建議

| 資料 | 建議保存 |
|---|---|
| raw comment | 7 天，除非事故 |
| normalized comment | 14 天 |
| risk label / categories | 30–90 天 |
| 成本與統計 | 180 天 |
| 事故樣本 | 依案件人工保留 |
| user_id_hash | 30–90 天 |

原則：

> 能不存 raw 就不存。要 debug 才短期保存。事故資料要可追，但不要無限保存觀眾個資。

## 8.3 Replay 事故處理流程

發生事故時：

1. 立即切 LOCKDOWN 或 OFF。
2. 清空互動插隊佇列。
3. 記錄 incident_id。
4. 標記發生時間點。
5. 停用 live chat replay 或下架 / 剪除片段。
6. 匯出相關 log。
7. 更新測試資料集。
8. 更新 P0 / P1 / P5 規則。
9. 事故解除前不恢復 OPEN。

---

# 9. 台灣法律地雷

非法律意見，但公開前要納入法務 checklist。

## 9.1 誹謗 / 公然侮辱

最高風險是「即時回應觀眾指名真人」。

高風險句型：

- 某某就是貪污。
- 某某一定收錢。
- 某某是騙子。
- 某某不要臉。
- 某某外遇 / 吸毒 / 犯罪。
- 某公司詐騙。
- 大家都知道某某背後有人。

規則：

> 具名真人 + 人格羞辱 = 不播。  
> 具名真人 + 犯罪指控 = 除非有可靠公開來源與清楚歸因，否則不播。  
> 具名真人 + 私德 = 不播。  
> 只評論公開政策 / 公開言行 / 制度現象。

## 9.2 選舉 / 罷免

選舉期建議直接開 Election Mode。

要擋：

- 投票日期、地點、資格、方式錯誤資訊。
- 候選人不實資格說法。
- 號召干擾投票。
- 未證實候選人爆料。
- 民調、街訪、網路投票包裝成民意。
- 投票日前 10 日內發布、報導、散布、評論或引述民調資料。

規則：

> 選舉期聊天室互動只談制度與官方資訊。  
> 不接候選人私德爆料。  
> 不回「幫我評論某候選人是不是怎樣」。  
> 民調與投票資訊只允許官方或清楚合規來源。

## 9.3 個資 / 人肉

觀眾可能把個資塞在：

- 留言。
- 暱稱。
- Super Chat。
- 頻道名。
- URL。
- 貼圖文字。

規則：

- 不唸暱稱原文。
- 不顯示原始留言全文。
- 不唸地址、電話、email、車牌。
- 不協助查人。
- 不讓 AI 猜身份。
- 不長期保存 raw comment。

## 9.4 醫療 / 法律 / 投資

這些不一定 hard block，但只能 safe redirect。

規則：

- 醫療：不診斷、不開藥、不判斷可不可以不就醫。
- 法律：不判斷個案勝敗、不教規避責任。
- 投資：不喊單、不明牌、不保證獲利。
- 心理 / 自傷：不娛樂化，直接安全支持。

---

# 10. 成本控制

## 10.1 成本最高的地方

互動成本主要來自：

- P1 LLM 分類。
- P3 摘要。
- P4 主生成。
- P5 output gate LLM judge。
- 重試 / 改寫。
- Super Chat 高頻觸發。

## 10.2 成本壓法

建議：

1. P0 免費規則先大量排除。
2. 明顯 hard_block 不進 LLM。
3. 明顯 spam / URL / 超長文直接丟。
4. 同一 user 冷卻。
5. 相似留言合併。
6. 每一輪只挑前 N 則候選進 LLM。
7. grey 不進主生成，只 canned 太極。
8. P4 主生成只處理最終 1 則。
9. P5 只審實際播出文字，不審所有候選。
10. 當日成本達 70% 時降為 GUARDED。
11. 當日成本達 90% 時關互動。
12. Super Chat 不得突破成本天花板。

## 10.3 建議預算狀態

| 預算狀態 | 條件 | 動作 |
|---|---|---|
| NORMAL | 日成本 < 70% | 正常 |
| CAUTION | 日成本 70–90% | 降低互動頻率，只回 safe |
| LIMIT | 日成本 > 90% | 關閉即時互動，保留 canned |
| STOP | 日成本超額 | 停止所有 LLM 互動 |

---

# 11. Prototype 可省 vs 公開前必做

## 11.1 Prototype 可省

這些可以晚點做：

- 官方 YouTube API。
- 完整 NER。
- 高級語意去重。
- 長期 persona drift 分析。
- 多模型交叉審核。
- 精細後台 UI。
- 自動剪 replay。
- 大規模資料儀表板。

## 11.2 Prototype 也不能省

這些不能省：

- P0 normalization。
- raw comment 不進主 AI。
- 暱稱不直唸。
- unsafe 不入選。
- Super Chat 不免審。
- output gate。
- TTS sanitizer。
- 每小時 / 每日成本上限。
- fake comment injector。
- 基本 audit log。
- 手動 kill switch。

## 11.3 公開前必做

公開長跑前必做：

- Shadow mode。
- Unsafe spike 自動降級。
- Replay 事故處理流程。
- Election Mode。
- 台灣法務 checklist。
- Chat source adapter。
- P5 output gate 實際播出文字審核。
- display name / overlay / subtitle / TTS 全部 sanitizer。
- 互動內容不進 pool。
- Mode Controller。
- 成本降級機制。
- 至少 1 天私測長跑。

---

# 12. 我會調整的幾個設計決定

## 12.1 「safe 留言給消毒後引用片段」

建議先不要開。第一版公開互動先 intent-only。

原因：

- 喜劇效果會變好，但風險也明顯上升。
- 觀眾會主動設計「讓 AI 唸出來才出事」的句子。
- TTS 諧音、台語諧音、斷句都可能出事。

建議上線順序：

1. 私測：intent-only。
2. shadow：safe quote 只記錄不播。
3. 小流量公開：intent-only。
4. 穩定後：只開短句 safe quote。
5. 選舉期 / unsafe spike：自動關閉 safe quote。

## 12.2 「敏感實體黑名單」

建議改名叫「敏感實體保護表」，不要只做黑名單。

分類：

| 類型 | 處理 |
|---|---|
| 候選人 / 政治人物 | 嚴格中立 |
| 司法案件當事人 | 不做有罪推定 |
| 兒少 / 受害者 | 不評論、不娛樂化 |
| 一般私人 | 不點名、不評論 |
| 企業 / 品牌 | 不做未證實詐騙指控 |
| 網紅 / 公眾人物 | 只談公開內容，不談私德 |

## 12.3 「grey 用太極罐頭」

同意。  
但要注意太極罐頭不能太像拒絕，否則節目無聊。

建議做 20–30 句 in-character canned response，分類如下：

- 政治太極。
- 私德太極。
- 醫療太極。
- 法律太極。
- 投資太極。
- AI bug 梗。
- 不唸暱稱梗。
- Super Chat 不保證梗。
- 聊天室太熱降溫梗。

---

# 13. 建議實作順序調整

原順序大致正確。  
我建議改成：

## Phase 0：測試骨架

- Fake comment injector。
- Chat source adapter。
- 基本 audit log。
- Mode Controller。
- Kill switch。

理由：  
這些是測安全功能的底座，越早做越好。

## Phase 1：讀取與正規化

- pytchat 讀取。
- normalization。
- display name sanitizer。
- URL / 長度 / 重複 / 個資初篩。
- 去重。

## Phase 2：分類與選球

- P1 risk classifier。
- P2 scoring。
- Super Chat 加權但不免審。
- user cooldown。
- unsafe ratio。
- mode auto downgrade。

## Phase 3：安全摘要與主生成

- P3 intent-only summary。
- P4 無記憶生成。
- JSON output。
- 不引用 raw。
- grey canned response。

## Phase 4：輸出審核與 TTS

- P5 output gate。
- TTS sanitizer。
- overlay / subtitle sanitizer。
- final spoken text hash。

## Phase 5：長跑與事故

- shadow mode。
- replay handling。
- metrics。
- daily report。
- law checklist。
- election mode。

---

# 14. 最重要的盲點

## 14.1 YouTube 自動 AI 摘要

YouTube 可能對 live chat 產生 AI summary。  
如果聊天室被攻擊，平台側 summary 可能也會放大錯誤脈絡。

建議：

- 觀察是否可停用。
- 攻擊時切 subscribers-only / slow mode。
- unsafe spike 時不只停 AI 互動，也要考慮聊天室本身降速。

## 14.2 Chat replay

Live chat replay 預設可能保留。  
事故不只在直播當下，還會在重播裡被看到。

建議：

- 公開互動初期關閉 live chat replay。
- 或至少準備出事後關閉 replay 的流程。
- 事故時間點要記錄到秒。

## 14.3 Overlay 比 AI 更危險

即使 AI 不唸 raw，前端如果顯示原留言，也一樣爆。

規則：

> 前端不顯示 raw comment。  
> 前端不顯示 raw display name。  
> overlay 只顯示 safe label，例如「這位朋友問」。

## 14.4 Super Chat 心理壓力

最大風險不是技術，是營運壓力。

觀眾付錢後，你會想回。  
但規則要寫死：

> Super Chat 是感謝，不是通行證。紅線 Super Chat 不回、不唸、不補償安全邏輯。

## 14.5 政治狗哨

台灣政治語境很多不是明講。  
例如：

- 1450
- 中共同路人
- 塔綠班
- 小草
- 哥布林
- 死忠
- 那個光頭
- 綠共
- 藍白拖
- 境外勢力

建議：

- 這些不一定 hard block。
- 但應該進 grey。
- grey 一律不讓主 AI 做實質站隊。

---

# 15. 最終上線準則

公開前我會要求：

1. 連續 24 小時 shadow mode 無重大漏網。
2. P5 output gate 有實際擋下案例。
3. unsafe spike 能自動降級。
4. kill switch 測試成功。
5. replay 事故流程測試成功。
6. Super Chat 紅線測試通過。
7. display name 攻擊測試通過。
8. 選舉 / 誹謗 / 個資 / 兒少測試通過。
9. 成本達 70% / 90% 降級測試通過。
10. 前端不顯示 raw comment / raw display name。

---

# 16. 給 Claude 的最短實作指令

請優先做以下功能，不要先追求複雜 AI：

1. 建立 Chat Source Adapter，先接 fake injector，再接 pytchat。
2. 建立 Mode Controller：OPEN / GUARDED / LOCKDOWN / OFF。
3. 建立 P0 normalization + display name sanitizer。
4. 建立 P1 risk classifier：safe / soft_redirect / grey / hard_block。
5. 建立 P2 selection：unsafe 不入選、Super Chat 只加權、user cooldown、semantic dedupe 可先簡化。
6. 建立 P3 intent-only summary，第一版不要 safe quote。
7. P4 主生成只看 fixed persona + today news + viewer_intent，不看 raw。
8. P5 複用現有 output gate，審 final spoken text。
9. 建立 TTS / subtitle / overlay sanitizer。
10. 建立 P6：unsafe spike 自動降級、canned fallback、audit log、kill switch。
11. 公開前跑 shadow mode，不通過不要開 safe quote。

---

# 17. 最後結論

你們的設計方向是對的。  
現在不要再加產品功能，先補「降級、測試、事故、成本」四件事。

最小公開版應該是：

- intent-only。
- 不唸暱稱。
- 不顯示 raw comment。
- Super Chat 不保證回。
- 每 15 分鐘最多 1 則。
- unsafe spike 自動 LOCKDOWN。
- 互動內容不進 pool。
- final output gate + TTS sanitizer。

最後一句：

> 這個功能的成敗不在 AI 多會聊天，而在它被打的時候能不能安靜降級。
