# 自訂圖片說明

把你的 PNG 圖片放到這個資料夾，再到 `src/config.js` 把對應項目設為 `true`，即可取代程序生成的素材。

## 使用步驟

1. 把圖片放進這個 `assets/` 資料夾
2. 打開 `src/config.js`，找到 `customAssets` 區塊
3. 把對應的 `false` 改成 `true`
4. 重新整理瀏覽器（不需要重啟 server）

## 圖片規格

### 角色（spritesheet 格式）
每個角色是**橫向 4 格**的 spritesheet，4 幀動畫（靜止、打字1、打字2、思考）

| 檔名 | 寬 × 高 | 說明 |
|------|---------|------|
| char_market.png | 128 × 48 | 📊 市場分析師（4幀×32px） |
| char_news.png   | 128 × 48 | 📰 新聞記者 |
| char_swing.png  | 128 × 48 | 📈 波段交易員 |
| char_dca.png    | 128 × 48 | 💰 定投經理 |
| char_ml.png     | 128 × 48 | 🤖 ML 工程師 |
| char_agent.png  | 128 × 48 | 🤖 AI 交易員 |
| char_boss.png   | 128 × 48 | 🎯 策略長 |

若只想換外觀不做動畫，可以只畫第1幀（32×48），但檔案仍需為 128×48（後3幀空白也可以）。

### 家具
| 檔名 | 寬 × 高 | 說明 |
|------|---------|------|
| desk.png         | 96 × 44  | 一般桌子 |
| desk_boss.png    | 132 × 48 | 策略長大桌 |
| monitor.png      | 44 × 40  | 單螢幕 |
| monitor_dual.png | 96 × 38  | 雙螢幕（市場分析師用） |
| chair_back.png   | 48 × 40  | 椅背 |

### 裝飾
| 檔名 | 寬 × 高 | 說明 |
|------|---------|------|
| plant_sm.png      | 36 × 52  | 小植物 |
| plant_lg.png      | 44 × 64  | 大植物 |
| ceiling_light.png | 30 × 42  | 吊燈 |
| whiteboard.png    | 124 × 108 | 白板（含支架） |
| server_rack.png   | 72 × 138 | 伺服器機架 |

### UI
| 檔名 | 寬 × 高 | 說明 |
|------|---------|------|
| bubble_bg.png | 180 × 52 | 對話泡泡背景 |

## 推薦免費像素藝術工具
- **Aseprite**（付費，最強）
- **Libresprite**（免費 Aseprite fork）
- **Piskel**（免費線上，https://www.piskelapp.com/）
- **PixilArt**（免費線上，https://www.pixilart.com/）
