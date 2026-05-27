# WWT 晚晚嘴台灣 — 系統分析報告

---

## 現有架構盤點

| 層級 | 檔案 | 現狀 | WWT 後保留？ |
|---|---|---|---|
| 後端 | server.py | FastAPI + Claude Haiku | ✅ 保留，改 prompt 和角色 |
| 前端入口 | index.html | cyan header + Phaser canvas | ✅ 改主題色 + 標題 |
| 場景初始化 | BootScene.js | preload 資源 + 生成 sprite | ✅ 簡化（只剩 2 角色） |
| 主場景 | OfficeScene.js | 7 角色、後排/前排/白板站 | ✅ 大幅簡化，改佈局 |
| 設定 | config.js | 7 角色顏色/座位/比例 | ✅ 只留 2 角色 |
| 狀態檔 | command_center_state.json | 7 模組 + data_flows | ✅ 換格式，改 2 角色 |

**現有可直接複用（不需改）：**

- polling 機制（setInterval → `_pollState`）
- bubble 對話顯示（`_showBubble` / `_hideBubble` / `_animateTyping`）
- 角色走路系統（`_walkTo`）
- Claude API 呼叫框架（`/api/chat`）
- `_chatInProgress` 防覆蓋機制（CLAUDE.md 特別叮囑）

---

## 改造計畫

### 需要改動的檔案（共 5 個）

#### 1. server.py
- 刪除 `_CHARS`（7 人）→ 換 2 人：阿明哥、小美姐
- 刪除 `_CONV_PAIRS`（12 對）→ 換成 WWT 話題對話組合
- 改 Claude prompt：從「財經分析」→「鄉民嘴砲」風格
- 改 `_default_state()`：從 7 modules → 2 hosts + topic
- 新增 `POST /api/topic`：接收手動輸入的話題（Phase 1 需求）
- 改 state 讀取路徑（不再讀 trading-system）

#### 2. config.js
- 刪除 7 個角色定義 → 只留 `aming`、`xiaomei`
- 改招牌文字 → 「晚晚嘴台灣 WWT」
- 改主題色：從 cyan `#00E5FF` → 橘紅 `#FF4500`（電視台感）
- 改 layout：從 7 座位 → 2 個主持人桌左右對稱

#### 3. OfficeScene.js
- 改 `STATIONS`：7 工作站 → 2 主持人座位（左/右）
- 改 `_buildBackground()`：載入不同背景（Studio / News Desk / Coffee Room 切換）
- 改 `_buildWorkstations()`：改為主持人桌 + 麥克風
- 改 `_buildSign()`：WWT 招牌
- 改 `_applyState()`：讀新 state 格式（host status）
- 新增 `_switchScene(sceneName)`：背景切換邏輯

#### 4. BootScene.js
- 改 preload：移除 7 個角色資源 → 載入 `char_aming` / `char_xiaomei`
- 改背景載入：`studio_bg` / `newsdesk_bg` / `coffee_bg`（3 張）

#### 5. index.html
- 改標題：WWT 晚晚嘴台灣
- 改 header 顏色主題（橘紅系）
- 改右上角狀態面板：顯示今日話題

---

## 資料夾調整方案

```
trading-command-center/
├── index.html              ← 改標題 + 主題色
├── server.py               ← 改角色/prompt/state
├── 啟動.bat                ← 不動
├── requirements.txt        ← 不動
├── wwt_state.json          ← 新 state 檔（取代 command_center_state.json）
├── src/
│   ├── main.js             ← 幾乎不動
│   ├── config.js           ← 改角色/招牌/顏色
│   └── scenes/
│       ├── BootScene.js    ← 改 preload 資源
│       └── OfficeScene.js  ← 改場景佈局/角色/狀態
└── assets/
    ├── studio_bg.png       ← 直播間背景（可暫用程序生成）
    ├── newsdesk_bg.png     ← 資料室背景
    ├── coffee_bg.png       ← 茶水間背景
    ├── char_aming.png      ← 阿明哥（MVP 先用色塊）
    └── char_xiaomei.png    ← 小美姐（MVP 先用色塊）
```

不建立新資料夾、不刪除現有結構。

---

## State 結構設計

```json
{
  "updated_at": "21:00:00",
  "scene": "studio",
  "mode": "A",
  "topic": "台北房價創新高",
  "topic_summary": "信義區今年均價突破 180 萬/坪，年增 12%。",
  "mood": "heated",
  "hosts": {
    "aming": {
      "status": "talking",
      "last_output": "甘有可能，180萬一坪？靠北喔",
      "emotion": "surprised"
    },
    "xiaomei": {
      "status": "reacting",
      "last_output": "不意外啊，早就說了",
      "emotion": "calm"
    }
  }
}
```

**status 完整列表：**
`idle` / `thinking` / `researching` / `talking` / `reacting` / `coffee_break` / `meeting` / `walking`

---

## 場景架構設計

| 場景 ID | 背景 | 觸發條件 | MVP？ |
|---|---|---|---|
| `studio` | 直播間（攝影棚感） | 有話題討論中 | ✅ |
| `newsdesk` | 工作桌/資料牆 | status = researching | Phase 2 |
| `coffee` | 茶水間 | status = coffee_break | Phase 2 |
| `meeting` | 小會議室 | status = meeting | Phase 3 |

MVP 只需 `studio` 一個場景，其他先用同一背景換色塊代替。

---

## 對話架構設計

### 節目模式對應 Claude Prompt

**模式 A（熱門話題）：**

```
今日話題：{topic}
{topic_summary}
阿明哥剛說：「{aming_last}」
你是小美姐（30歲內容編輯，理性鄉民，吐槽能力強）。
常用語：靠夭喔、有夠扯、笑死、不意外、留言區炸鍋了
回一句話（15字內，台灣口語）。
```

**模式 C（茶水間閒聊）：**

```
現在是茶水間閒聊時間，沒有正式話題。
阿明哥和小美姐在聊：{random_topic}（珍奶/天氣/AI/便利商店/網購）
回一句輕鬆閒聊（12字內）。
```

### 對話節奏設計

不用固定 A→B→A→B。用 `turn_type` 控制：

| turn_type | 說話順序 |
|---|---|
| `debate` | 阿明 → 小美 → 阿明（互嗆） |
| `react` | 小美提問 → 阿明長回 → 小美吐槽 |
| `monologue` | 阿明獨自分析（2-3句）→ 小美一句結尾 |
| `casual` | 隨機，誰先說都行 |

---

## MVP Roadmap

### Phase 1：最小可跑版（目標：讓 OBS 能顯示）

| 步驟 | 工作內容 | 改哪個檔案 | 預估時間 |
|---|---|---|---|
| 1 | 改 server.py：2 角色 + WWT prompt + /api/topic | server.py | 45 分鐘 |
| 2 | 改 config.js：2 角色 + WWT 招牌 + 顏色 | config.js | 15 分鐘 |
| 3 | 改 OfficeScene.js：2 主持人座位 + 讀新 state | OfficeScene.js | 60 分鐘 |
| 4 | 改 BootScene.js：preload 2 角色資源 | BootScene.js | 20 分鐘 |
| 5 | 改 index.html：標題 + 主題色 | index.html | 10 分鐘 |
| 6 | 測試：手動 POST /api/topic 觸發對話 | — | 20 分鐘 |

**MVP 完成條件：**

- [ ] 阿明哥出現在畫面
- [ ] 小美姐出現在畫面
- [ ] Studio 場景顯示
- [ ] 對話生成有鄉民風格
- [ ] Bubble 正常顯示
- [ ] 狀態可切換
- [ ] 手動輸入 topic 能觸發對話
- [ ] OBS 可截取畫面

### Phase 2（MVP 之後）
- Google News RSS 自動抓話題
- 背景依場景切換（newsdesk / coffee）
- 滾動留言牆

### Phase 3
- PTT / Dcard 資料串接
- 正式角色 sprite 美術製作
