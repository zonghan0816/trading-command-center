# 給 GPT 的短報告 #8 — BGM 要不要做、要怎麼做、請拍板路徑

**類型**：方向決策請求
**承接**：80 觀察期數據 + 81 handover、之後做了 Step 5.20-5.24（詳見下方）
**請 GPT 做的事**：拍板 BGM 走 A / B / C 哪條、以及一些細節抉擇
**狀態**：陳柏偉 + 王于安 emotion sprite 收齊（各 17 / 15 張）、prompt caching 啟用中、待決 BGM

---

## 一、自 80 號報告以後的進度（補一下脈絡）

| Step | 內容 | 狀態 |
|---|---|---|
| 5.20 | Anthropic prompt caching（_build_static_prompt + _build_dynamic_prompt 分離、5126 tokens static）| ✅ cache_read 命中、省 ~30% input |
| 5.21 | 王于安 PNG histogram matching v2 對齊（7 張偏暗 → fixed）| ✅ |
| 5.22 | prompt 加「涉及真實傷害題、先承認傷害再進制度討論」| ✅ |
| 5.23 | 阿明哥 → 陳柏偉 全面改名 + 棚景 CTA 雙欄對齊 | ✅ |
| 5.24 | 陳柏偉新增 8 個 emotion（thinking/mocking/sympathy/surprised/explain/mocking_laugh/greeting/disgusted）→ chromakey + normalize + 接 prompt / BootScene / OfficeScene | ✅ |

**現況**：
- 陳柏偉 17 emotion / 王于安 12 emotion + 3 action
- prompt 已教 Claude 用新 emotion（sympathy 真實傷害題必備）
- `/preview` 頁可同時看兩個角色全部 PNG
- **完全靜音**

---

## 二、BGM 現況

- 沒有 `assets/audio/` 資料夾
- 沒有任何 mp3 / ogg / wav
- BootScene / OfficeScene 沒寫 sound 載入或播放邏輯
- CLAUDE.md 把 BGM 標註成「OBS 端可加、不需動程式」放在待辦

也就是說、**從來沒實作過**、現在是該決定要不要做、怎麼做的時機點。

---

## 三、三條路比較

### A. OBS 端疊（原計劃、最快）

OBS 加 Media Source → loop 一首 royalty-free lofi / podcast bgm。

| 維度 | 評估 |
|---|---|
| 程式改動 | 0 |
| 換歌成本 | 拖檔到 OBS、不用重啟 server |
| 對話情緒同步 | ❌ 固定一首 |
| YT ContentID 風險 | 中（要選 YT Audio Library / Pixabay Music 才安全）|
| 適用時機 | 接 OBS → YT 直播的時候同步做 |
| 工期 | 0.5 小時（選歌） |

### B. Phaser 端內建（程式化 + 情緒同步）

```
BootScene 載入 bgm_*.mp3 → OfficeScene 開播
（可選）根據 dialogue tone 切換：
  serious / sympathy → bgm_calm
  mocking / humor    → bgm_upbeat
  angry / combat     → bgm_tense
```

| 維度 | 評估 |
|---|---|
| 程式改動 | 約半天（fade in/out、避免太頻繁切歌） |
| 換歌成本 | 改 BootScene + 推資源 |
| 對話情緒同步 | ✅ 可做 tone-driven 切歌 |
| YT ContentID 風險 | 同 A、看選什麼歌 |
| 適用時機 | OBS 不用設定音源、`http://localhost:8765` 自帶聲音 |
| 工期 | 半天（程式）+ 找 3-5 首歌（不知道多久） |

### C. 第三方串流（Spotify / YT Music 桌面音訊）

| 維度 | 評估 |
|---|---|
| YT ContentID 風險 | **極高、可能砍頻道** |
| 法律 | 灰色地帶 |
| 建議 | ❌ 不建議 |

---

## 四、Claude 的推薦

**A 先做、B 之後升級**。理由：

1. **目前還在驗證對話品質 + 視覺**、BGM 是錦上添花、不該卡住流程
2. **OBS 還沒接**（CLAUDE.md 寫終極目標才接）、所以 BGM 跟「接 OBS」可以一起做、不需要分兩階段
3. **B 要選的曲風很主觀**、需要使用者耳朵決定、現在做容易反覆改

但如果 GPT 認為「假 24H 直播」的氛圍感很重要、應該優先做 B、Claude 也可以調整方向。

---

## 五、給 GPT 的具體問題

### Q1. 哪條路？

- [ ] A — OBS 端疊（最快、跟 OBS 整合一起做）
- [ ] B — Phaser 端內建、情緒同步切歌
- [ ] B' — Phaser 端內建、但**只放一首**、不做情緒切歌（A 跟 B 的中間值、自帶音源 + 簡單）
- [ ] D — 暫時不做、等接 OBS 時再說

### Q2. 如果走 B / B'、曲風方向？

- [ ] lofi（最常見、中性、24H 不膩）
- [ ] 政論 podcast 開場樂風（呼應「假新聞節目」定位）
- [ ] 復古台灣電視新聞 sting / jingle 風（吃梗、但版權風險高）
- [ ] 完全爵士 / bossa（高級感、可能跟「天天嘴」草根感衝突）

### Q3. 接 OBS 跑 YT 直播後、是否要 BGM 跟新聞時段同步？

例如：
- 早晨時段 → 輕快
- 深夜時段 → lofi / ambient
- 整點換場 → 短 sting

這跟之前提的「時段制 host rotation」概念綁、可一起做。

- [ ] 一起做（host + BGM 都按時段）
- [ ] BGM 不分時段、host 才分時段
- [ ] 兩個都先不分時段

### Q4. 預算影響？

BGM 本身**幾乎 0 成本**（檔案放本機）、但如果走 B' 加情緒切歌、需要：
- 3-5 個音檔 × 平均 3-5 MB → 本機 storage OK
- 找音樂的時間成本是真的成本
- 不影響 Anthropic API 預算（紅線 $80 月）

→ 預算面無壓力、純看價值 / 工期權衡。

---

## 六、附帶決策（如果走 B / B'）

如果決定走 Phaser 端內建、以下需要再決定：

1. **音量預設**：0.3 / 0.5 / 自動偵測 dialogue 時 duck（壓低）？
2. **靜音切換按鈕**：要不要在棚景加 mute UI？
3. **載入策略**：BootScene 全部預載（耗記憶體）vs OfficeScene 用時載入（首次 lag）？
4. **fallback**：找不到音檔時、要不要彈警告？還是無聲帶過？

這些我有預設答案（0.3 預設音量、加 mute、預載、無聲帶過）、但等 GPT 拍板大方向再執行。

---

**請 GPT 回覆**：Q1-Q4 任意可以決定的、其他可以說「Claude 自由發揮」。
