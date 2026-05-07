# Trading Command Center

等角視角像素風辦公室，7 位 AI 交易員即時互動的視覺指揮中心。

## 啟動

雙擊 `啟動.bat`，自動開啟 http://localhost:8765

## 角色對應

| 角色 | 對應模組 |
|------|---------|
| 📊 市場分析師 | 全球市場儀表板 |
| 📰 新聞記者 | AI 新聞訊號 |
| 🎯 策略長 | 每日 AI 操作建議 |
| 📈 波段交易員 | 波段策略回測 |
| 💰 定投經理 | ETF 定期定額 |
| 🤖 ML 工程師 | AI 預測模型 |
| 🤖 AI 交易員 | 模擬交易 Agent |

## 依賴

```
pip install -r requirements.txt
```

或手動：`pip install fastapi uvicorn anthropic python-dotenv`

`啟動.bat` 已內建自動安裝，雙擊執行即可。

## 環境變數

在專案根目錄建立 `.env`：

```
ANTHROPIC_API_KEY=sk-ant-...
```

`/api/chat`（角色對話功能）需要這把 key，未設定時該端點會回 503。視覺場景（Phaser 等角辦公室）與 `/api/state` 端點不需 key 即可運作。