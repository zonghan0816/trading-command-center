# TDT 天天嘴台灣 — Taiwan Daily Talk

AI 鄉民談話節目模擬器。兩位主持人「阿明哥」「小美姐」在 1920×1080 棚景中、圍繞 Google News 即時時事對話、設計用於 **OBS Browser Source 直播**。

> ⚠️ 目錄名仍叫 `trading-command-center`、state 檔仍叫 `wwt_*.json` — legacy（此專案原本是台股交易中心 dashboard、後來轉型成 TDT）。不影響運作。

---

## 啟動

雙擊 `啟動.bat`，自動開啟 <http://localhost:8765>。

或手動：

```bash
python server.py
```

OBS 直播設定：Browser Source → `http://localhost:8765` → 1920×1080。

---

## 主持人

| 主持人 | 站位 | 個性 |
|---|---|---|
| 🎙 阿明哥 | 左 (35%) | 50 歲台灣大叔、議論派、碎念、退休風、回憶以前 |
| 🎙 小美姐 | 右 (65%) | 30 歲都會女性、吐槽派、反諷型、看穿事物本質 |

固定站位、不走動。用泡泡 + 動作 frame 切換表現對話（小美 6 frame、阿明 1 frame）。

---

## 話題來源

**Google News Taiwan RSS**（每 10 分鐘自動抓 15 條即時頭條）+ 8 種對話 tone × 8 種討論 angle、同 topic 至少跑 5 輪不重複後才換新話題。

也可手動指定：

```bash
curl -X POST http://localhost:8765/api/topic \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"自選話題\"}"
```

---

## 依賴

```bash
pip install -r requirements.txt
```

或手動：`pip install fastapi uvicorn anthropic python-dotenv`

`啟動.bat` 已內建自動安裝。

---

## 環境變數

在專案根目錄建立 `.env`：

```text
ANTHROPIC_API_KEY=sk-ant-...
```

`/api/chat`（對話生成）需要這個 key、未設定該端點會回 503。視覺場景（Phaser 棚景）跟 `/api/state` 端點不需 key 即可運作。

---

## API 端點

| Method | 路徑 | 用途 |
|---|---|---|
| GET  | `/api/state` | 取得當前完整 state |
| POST | `/api/state` | 直接覆寫 state（debug 用）|
| POST | `/api/topic` | 設定 topic、暫停自動 rotate |
| POST | `/api/chat`  | 觸發 Claude 生成一輪對話 |
| GET  | `/api/news`  | 查看新聞快取 |
| POST | `/api/news/refresh` | 立即重新抓 RSS |
| POST | `/api/news/rotate_topic` | 立即換成快取中的隨機新聞 |

---

## 技術棧

- **前端**：Phaser 3.60 CDN（1920×1080 `Phaser.Scale.FIT`）
- **後端**：FastAPI + uvicorn on `localhost:8765`
- **AI**：Anthropic Claude Haiku 4.5（`claude-haiku-4-5-20251001`）
- **State 持久化**：`wwt_state.json` / `wwt_news_cache.json` / `wwt_dialogue_memory.json`（皆 gitignored）

詳細協作守則、進度、技術細節見 [CLAUDE.md](CLAUDE.md) 與 [WWT_HANDOVER.md](WWT_HANDOVER.md)。
