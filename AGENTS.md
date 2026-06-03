# Trading Command Center — Codex 助理導讀

> **這個檔案是給 Codex 自動讀取的專案導覽**。每次 Codex 在這個資料夾開啟，會自動把這份檔案載入 context。
> 使用者**有記憶障礙**，沒有這份紀錄前一次做到哪會完全失憶。請主動參考「📍 目前進度」段落，並在每次工作結束時更新它。

---

## 🔑 兩句口訣（使用者請記這兩句就好）

| 時機 | 跟 Codex 說 | Codex 會做 |
|---|---|---|
| **開工** | 「**接續**」或「**看 AGENTS.md 我們做到哪**」 | 讀本檔「📍 目前進度」+ `git log` 最近 commit，告訴你上次做完什麼、下一步候選 |
| **收工** | 「**存進度**」 | 1. 更新本檔「📍 目前進度」<br>2. `git add . && git commit && git push` |

> Codex 給自己的指示：使用者使用上面任一關鍵字時，務必執行對應動作，不要問「你確定嗎」之類的反問。「存進度」是該主動 commit + push 的指令，不是徵詢。

---

## 一句話介紹

**純前端視覺化儀表板**：Phaser.js 等角像素辦公室，7 位 AI 交易員角色根據 sibling repo `trading-system` 的真實 pipeline 狀態即時動畫，並用 Codex API 產生角色閒聊對話。**本身不參與交易邏輯**。

---

## 🌐 這類專案在世界上叫什麼（業界術語對照）

**老實說沒有單一公認名稱** — 這是混合類別。下次跟別人介紹時可以挑一個：

### 業界 / 學術用語（最精準）
| 術語 | 中文 | 適用場合 |
|---|---|---|
| Multi-Agent System Dashboard | 多代理人系統儀表板 | 學術、技術論文 |
| AI Agent Orchestration Visualizer | AI Agent 協作視覺化 | 跟工程師講 |
| Real-time Operations Dashboard | 即時運維儀表板 | 一般 IT 場合 |
| Pipeline Status Visualization | 流程狀態視覺化 | 描述功能用 |

### 描述外觀的詞
| 術語 | 中文 | 重點 |
|---|---|---|
| Anthropomorphic UI | 擬人化介面 | 強調「用人物代表系統模組」 |
| Pixel art dashboard | 像素風儀表板 | 強調美術風格 |
| Game-style monitoring | 遊戲風監控 | 強調玩感 |
| Tycoon-style visualization | 模擬經營風視覺化 | 像「主題公園」「電廠模擬器」 |

### 同類靈感關鍵字（搜尋用）
```
"agent orchestration" pixel art dashboard
"multi-agent visualization" anthropomorphic
"AI agent" "office sim" monitoring
"LLM" pipeline visualization phaser
NOC display wall / Mission Control UI / Datacenter Tycoon
```

### 如果只能挑一個
- **正式版**：LLM agent orchestration dashboard with anthropomorphic pixel-art office UI
- **中文正式**：擬人化像素辦公室 LLM Agent 協作視覺化儀表板
- **日常版**：**像素辦公室風格的 AI Agent 儀表板**
- **最短**：**Multi-agent 視覺化**

---

## 🆚 跟 Pixel Agents 對照（最像的同類專案）

[Pixel Agents](https://marketplace.visualstudio.com/items?itemName=pablodelucca.pixel-agents) 是 2026 年初在 Reddit 爆紅的 VS Code 擴充套件，把 Codex 的 coding agents 變成像素角色在虛擬辦公室工作。**精神跟本專案一樣**，但實作跟用途不同：

| 項目 | Pixel Agents | 本專案（trading-command-center） |
|---|---|---|
| **形式** | VS Code 擴充套件 | 獨立網頁應用 (FastAPI + Phaser :8765) |
| **角色代表什麼** | Codex 跑的 coding agents（動態，幾個就幾個） | 7 個**固定**模組（市場/新聞/策略/波段/DCA/ML/Agent） |
| **資料來源** | Codex 的 JSONL transcript | 自寫的 `command_center_state.json` |
| **領域** | 通用：寫程式、找檔案、等輸入 | **專屬**：台股交易 pipeline |
| **角色會說話嗎** | 不會（只動畫 + 偶爾泡泡） | **會**（Codex Haiku 4.5 生成角色對話） |
| **觀眾** | Codex 開發者 | 自己看 sibling repo `trading-system` 跑什麼 |
| **授權** | MIT 開源（pablodelucca） | 私人專案 |

### 跟人介紹時的速講
> 「類似最近紅的 Pixel Agents，但我的是**專門給台股交易 pipeline 的版本**，角色會用 LLM 互相聊天。」

### 參考連結
- [Pixel Agents — VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=pablodelucca.pixel-agents)
- [HowWorks 介紹文](https://howworks.ai/projects/i-built-a-vs-code-extension-that-turns-your-Codex-agents-into-pixel-art-ch)
- [Fast Company 報導](https://www.fastcompany.com/91497413/this-charming-pixel-art-game-solves-one-of-ai-codings-most-annoying-ux-problems)
- [Reddit 原文](https://www.reddit.com/r/Codex/comments/1rbs0gx/i_built_a_vs_code_extension_that_turns_your/)

---

## 📍 目前進度（每次工作結束前更新）

**最後更新**：2026-05-08（Codex session 整理 — 兩 repo 各補完整 AGENTS.md）

**Sibling repo**：[`../trading-system`](../trading-system) — 主要交易系統，本 repo 只負責「視覺化它的狀態」

### 已完成（依 git log 由舊到新）

1. **`b25ff80` 2026-05-07 init** — Phaser.js isometric office 框架
   - 建立 index.html / server.py / src/main.js / BootScene.js / OfficeScene.js / 啟動.bat / requirements.txt
   - 7 個角色座位、idle 動畫、`/api/state` 端點、`command_center_state.json` 預設模板

2. **`90a920f` 2026-05-07 fix: 修復黑畫面三個根本原因 + 放大場景 1.5x**
   - 影響檔：`main.js / BootScene.js / OfficeScene.js`

3. **`82ff0bd` 2026-05-07 改版為前視角辦公室風格（KCC 風）**
   - 從 isometric 改成前視角；後排 / 前排兩排桌、AI 交易員獨立站立位置
   - 影響檔：`BootScene.js / OfficeScene.js`

4. **`fde71d8` 2026-05-07 視覺升級 + AI 對話系統完善**
   - `_fetchAndPlayDialogue` auto-loop：每 1.5s 自動 POST `/api/chat`
   - 用 Codex Haiku 4.5 產生角色對話，融入 `command_center_state.json` 真實 last_output 為 prompt context
   - 角色走路 → 對話 → 走回的完整序列
   - 影響檔：`server.py / config.js / BootScene.js / OfficeScene.js`

5. **`9eb8e6d` 2026-05-07 Fix missing deps**
   - `啟動.bat` 自動 `pip install` 加 `anthropic` + `python-dotenv`
   - 新增 `requirements.txt`
   - README 補環境變數段（`ANTHROPIC_API_KEY`）

6. **`08fb93c` 2026-05-07 Fix bubble text reasserting on every poll**
   - **症狀**：trading-system 跑 pipeline 時，AI 角色泡泡每 5 秒重複顯示同樣 status 文字（「已取得 30 筆」「2303.TW +138.6%」），且 chat 對話進行中被插話覆蓋
   - **根因**：`_applyState` 每輪輪詢都 `bubbleText.setText(last_output)`；`thinking` 狀態還會每輪重新觸發 `_animateTyping` 從頭打字
   - **修法**（在 `OfficeScene.js _applyState`）：
     - chat 進行中（`_chatInProgress`）跳過 status 同步
     - 只在「狀態剛變 active」（`justBecameActive`）時才 `setText` + `_showBubble`
     - 「狀態變 inactive」（`justBecameInactive`）時主動 `_hideBubble`

7. **`281dd0b` 2026-05-08 gitignore command_center_state.json**
   - server 啟動時會 reset state file，不適合 git tracking
   - 同時排除 `.tmp` 檔（trading-system 用 atomic write）

8. **`560a77d` 2026-05-08 現代辦公室場景升級**
   - 加入背景圖 `office-complete.png`（取代程序生成的磚牆）
   - 中央牆壁掛股市螢幕 `1.png`
   - 策略長改用合體 PNG `char_boss.png` + `desk_boss.png`（自訂 customAssets.char_boss = true）
   - 影響檔：`config.js / BootScene.js / OfficeScene.js / assets/*`

### 已知狀態 / 約定

| 模組 ID | 角色 | sibling tab | 座位 |
|---|---|---|---|
| `market` | 📊 市場分析師 | 全球市場儀表板 | 後排 0 |
| `boss` | 🎯 策略長 | 每日 AI 操作建議 | 後排 1（PNG 合體圖）|
| `ml` | 🤖 ML 工程師 | AI 預測模型 | 後排 2 |
| `news` | 📰 新聞記者 | AI 新聞訊號 | 前排 0 |
| `swing` | 📈 波段交易員 | 波段策略回測 | 前排 1 |
| `dca` | 💰 定投經理 | ETF 定期定額 | 前排 2 |
| `agent` | 🤖 AI 交易員 | 模擬交易 Agent | 白板旁站立 |

**狀態類型**（`command_center_state.json` 的 `modules.{id}.status`）：

| status | 顏色 / 動畫 | 含義 |
|---|---|---|
| `idle` | 灰 | 待機 |
| `running` | 黃閃 | 執行中（`{id}_typing` 動畫，可能觸發走路 + 粒子流）|
| `done` | 綠 | 完成 |
| `live` | 藍閃 | 即時監控 |
| `thinking` | 紫閃 | 思考中（`{id}_thinking` 動畫 + 逐字打字） |

### 下一步候選

- [ ] **`data_flows` 視覺化粒子流**：API 已備好（`set_flow` / `clear_flows` in `command_center_writer.py`），trading-system 那邊**還沒 wire 任何呼叫**。實作後可看到 `market → boss`、`news → boss` 等粒子穿梭
- [ ] 角色閒聊對話可以加更多 `_CONV_PAIRS` 場景組合（目前 12 種）
- [ ] 場景擴充：加會議室 / 茶水間 / 老闆辦公室分區，角色走得更遠

---

## 🗂️ 重要檔案地圖

```
trading-command-center/
├── index.html              # cyan terminal header + 右上角狀態面板 + Phaser canvas
├── server.py               # FastAPI on :8765（/api/state、/api/chat、靜態檔）
├── 啟動.bat                # 雙擊啟動：自動 pip install + 開瀏覽器 + python server.py
├── requirements.txt        # fastapi / uvicorn / anthropic / python-dotenv
├── README.md               # 簡短使用說明（角色對應 + 啟動）
├── command_center_state.json  # runtime state（gitignored，server 啟動會 reset）
├── .env                    # ANTHROPIC_API_KEY（gitignored；沒設則 /api/chat 回 503）
├── src/
│   ├── main.js              # Phaser 啟動、scale 設定
│   ├── config.js            # ⭐ 角色顏色、佈局比例、自訂圖片開關（修改外觀只動這個）
│   └── scenes/
│       ├── BootScene.js      # preload + 程序生成桌椅/螢幕/植物/角色 sprite
│       └── OfficeScene.js    # 主場景：背景、工作站、polling、走路、對話、粒子流
├── assets/                 # 自訂圖片
│   ├── 1.png                  # 牆上股市螢幕
│   ├── office-complete.png    # 整體背景
│   ├── char_boss.png          # 策略長合體圖（customAssets.char_boss = true）
│   ├── desk_boss.png          # 策略長大桌
│   └── README.md              # 圖片規格說明
└── .gitignore              # __pycache__、.env、command_center_state.json{,.tmp}
```

---

## ⚙️ 環境與規約

- **Python**：3.11+
- **後端框架**：FastAPI on `localhost:8765`
- **Codex API**：`/api/chat` 用 **Codex-haiku-4-5-20251001**（每小時 ~NT$5-10，只在瀏覽器 tab 開著時計費）
- **作業系統**：Windows 10/11
- **`啟動.bat`**：給人雙擊用，保留 `pause`
- **狀態檔讀取優先序**（`server.py _load_state`）：
  1. `../trading-system/command_center_state.json`（sibling repo，主要來源）
  2. `./command_center_state.json`（本地 fallback）
- **不要 commit**：`.env`、`command_center_state.json`、`*.tmp`

---

## 🚀 常用指令

```bash
# 啟動視覺化（雙擊 啟動.bat 也可）
python server.py

# 開瀏覽器
http://localhost:8765
```

**沒有 `ANTHROPIC_API_KEY` 也能跑** — 視覺場景照常運作，只是角色不會閒聊（每 3 秒靜默重試）。

---

## 🔄 雙電腦同步流程（家 ↔ 公司）

| 場景 | 指令 |
|---|---|
| 開工前 | `git pull` |
| 收工前 | `git add . && git commit -m "說明" && git push` |

`.env` **不會跟著 git**，公司端要手動建（`ANTHROPIC_API_KEY=sk-ant-...`）。

---

## 🤝 跟 sibling repo `trading-system` 的關係

```
                trading-system/  (主要交易系統)
                       │
                       │ 寫入 status
                       ▼
        command_center_state.json   ← 共享狀態檔
                       ▲
                       │ poll 每 5 秒
                       │
                trading-command-center/  (這個 repo)
                       │
                       ▼
            http://localhost:8765 (Phaser 視覺化)
```

**trading-system 那邊的 wire 點**（這邊只是看狀態，不需動）：

- `daily_signal.py` 主流程：market / news / boss
- `agent_runner.py run_agent_cycle`：market / news / ml / agent
- `app.py render_swing / render_dca / render_ai`：對應模組（按鈕觸發）
- `app.py render_daily_signal`：market / news / boss
- `app.py render_agent`：market / news / ml / agent

**寫入工具**：`trading-system/src/command_center_writer.py`（atomic write，temp + os.replace）。提供 `mark_running / mark_thinking / mark_done / mark_idle / set_flow / clear_flows`。

---

## 📝 給 Codex 的工作守則

- **使用者有記憶障礙** — 每次完成段落工作後，**主動更新「📍 目前進度」並提醒使用者 commit + push**
- 改 `OfficeScene.js` 的 polling / state apply 邏輯時，務必確認 `_chatInProgress` 不會被狀態同步覆蓋（item 6 的歷史教訓）
- 不要把 `ANTHROPIC_API_KEY` 寫進任何 commit 的檔案
- 修改 `config.js` 的角色顏色 / 比例不需要動 BootScene 程式
- bat 檔記得 `chcp 65001`（UTF-8）
