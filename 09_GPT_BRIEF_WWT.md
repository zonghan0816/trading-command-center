# Phase 2A 視覺重製完成報告

## 完成項目

### 修改的檔案

| 檔案 | 類型 | 變更內容 |
|---|---|---|
| assets/office-complete.png | 新增（覆蓋） | Pixel TV Studio 背景 2672×1366 |
| assets/1.png | 新增（覆蓋） | WWT LED 螢幕框架 640×360 |
| index.html | 修改 | 加入 LED overlay CSS + HTML + JS |
| gen_assets.py | 新增 | Pillow 資產生成腳本（可重複執行） |

---

## 未修改的檔案（遵照禁止事項）

- server.py ✅ 未動
- config.js ✅ 未動
- BootScene.js ✅ 未動
- OfficeScene.js ✅ 未動

---

## 視覺設計說明

### office-complete.png（2672×1366）

Pixel TV Studio 風格，色系：深藍 / 灰 / 橘紅

| 區域 | 設計 |
|---|---|
| 背景 | 深藍漸層 (#0a0f1e → #121c32) |
| 牆壁 | 像素磚牆紋理，低透明度 |
| 地板 | 深藍舞台地板 + 透視格線 |
| 左右柱 | 深色舞台側柱 + 橘色垂直裝飾條 |
| 頂部 | 燈光條 + 3 組舞台燈光錐形光暈 |
| 中央 | LED 螢幕外框（橘色邊框），Phaser wall_screen 覆蓋於此 |
| Logo | WWT 橙色橫幅，位於 LED 螢幕上方 |
| LIVE | 右上角綠色 LIVE 徽章 |
| 主持桌 | 深色長桌（28%~72% 寬），左右各有麥克風架 |
| 效果 | 全圖掃描線 + 像素網格 overlay |

### 1.png（640×360）

WWT LED 螢幕裝飾框架（Phaser 顯示在 W*0.18 大小）

| 區域 | 設計 |
|---|---|
| 外框 | 橘色邊框 + 角落 L 形裝飾 |
| 頂部欄 | 「晚晚嘴台灣 / WWT Taiwan Tonight」+ LIVE |
| 內容區 | LED 點陣背景 + 今日話題標籤框 |
| 底部 | AI Talk Show • Taiwan Tonight |

---

## LED Overlay（index.html）

### 定位原理

Phaser 中 wall_screen 放在：
```
W * 0.565, H * 0.50 （origin 0.5, 0.5）
displaySize: W*0.18 x W*0.18*(9/16)
```

HTML overlay 對應：
```css
left: 56.5%;
top: 50%;
transform: translate(-50%, -50%);
width: 18vw;
height: calc(18vw * 9 / 16);
```

完全對齊，無偏差。

### 動態內容

每 3 秒 poll `/api/state`：

| 狀態 | 顯示 |
|---|---|
| mode=idle，無話題 | ◆ WWT Taiwan Tonight |
| mode=idle，有話題 | 📌 今日話題 + 話題文字 |
| mode=discussion | 📌 今日話題 + 話題文字 + ON AIR（橘色） |
| 連線失敗 | 保持上一次顯示 |

---

## 視覺效果確認清單

- [ ] 瀏覽器重整後背景變為深藍 TV Studio
- [ ] 股票圖、NASDAQ、金融數據消失
- [ ] 中央 LED 螢幕框架可見（橘色邊框）
- [ ] LED overlay 文字位於螢幕中央
- [ ] 無話題時顯示「晚晚嘴台灣」
- [ ] POST /api/topic 後 LED 顯示話題內容
- [ ] mode=discussion 時 badge 變橘色「ON AIR」

---

## 測試指令

```python
# 設定話題（UTF-8 安全）
import urllib.request, json
data = json.dumps({"topic": "台北房價創新高", "summary": "信義區突破180萬"}).encode('utf-8')
req = urllib.request.Request(
    'http://localhost:8765/api/topic',
    data=data,
    headers={'Content-Type': 'application/json; charset=utf-8'},
    method='POST'
)
with urllib.request.urlopen(req) as r:
    print(r.read().decode())
```

---

## 下一步

### 已完成
- ✅ 背景視覺（Phase 2A 第 1 優先）
- ✅ LED 螢幕框架（Phase 2A 第 2 優先）

### 待處理
- 主持桌（直接在背景圖中，已加入）
- 角色美術：阿明哥 / 小美姐正式 sprite（Phase 2A 第 4 優先）
- 細節裝飾（Phase 2A 第 5 優先）

### 角色美術下一步建議
目前角色為程序生成色塊。
下一步：生成 16×32 spritesheet（4 格 idle 動畫）：
- char_aming.png：藍色襯衫、眼鏡、短髮
- char_xiaomei.png：白色上衣、俐落短髮

啟用方式：config.js 中 `customAssets.char_aming: true`
