# WWT Phase 2C：角色與內容系統升級

目前已完成：

- server.py
- config.js
- BootScene.js
- OfficeScene.js
- index.html

已完成：

- Studio 場景
- 中央 LED
- 主持桌
- 左右麥克風
- 熱門關鍵字板
- Bubble 對話
- Topic API
- State 系統

請勿重構既有架構。

請勿修改：

- API 架構
- Bubble 系統
- State 系統
- Phaser 核心架構

---

# 本階段目標

讓觀眾：

一眼認出角色

一眼知道正在討論什麼

提升頻道辨識度

---

# 任務一

正式角色 Sprite

---

目前：

角色為測試用像素角色。

請建立正式角色 PNG。

風格：

Pixel Agents

16-bit

Pixel Art

---

## 阿明哥

定位：

45歲工程師

理性派

愛分析

略微發福

---

特徵：

眼鏡

短髮

藍色襯衫

深色長褲

咖啡杯

---

建立：

idle

talk

react

三種狀態

---

## 小美姐

定位：

30歲內容編輯

都會女性

吐槽系

反應快

---

特徵：

俐落短髮

白色上衣

深色裙褲

手機或平板

---

建立：

idle

talk

react

三種狀態

---

# 任務二

LED 話題顯示優化

---

目前：

中央顯示：

晚晚嘴台灣

---

請改為：

依 mode 顯示。

---

idle

顯示：

晚晚嘴台灣

Taiwan Tonight

---

discussion

顯示：

今日話題

{topic}

ON AIR

---

working

顯示：

準備下一話題

---

coffee

顯示：

茶水間閒聊

---

# 任務三

熱門關鍵字動態化

---

目前：

固定內容。

---

改為：

由 state 取得。

例如：

keywords

[
 "房價",
 "AI",
 "演唱會",
 "健保",
 "物價"
]

---

若不存在：

使用預設值。

---

# 任務四

LED 動畫

---

切換 topic 時：

淡入

淡出

即可。

---

不要：

粒子特效

大型動畫

額外套件

---

# 任務五

場景生活感

---

增加少量裝飾：

咖啡杯

筆電

平板

小盆栽

收音設備

---

數量控制：

4~8 個即可。

---

不要堆滿畫面。

---

# 禁止事項

不要：

Google News

PTT

Dcard

Threads

ElevenLabs

OBS

Live2D

VTube

3D模型

大型重構

---

# 完成後請回報

1.

新增哪些角色資源

2.

Sprite 尺寸

3.

LED 如何依 mode 切換

4.

熱門關鍵字如何讀取

5.

新增哪些場景物件

6.

修改哪些檔案

7.

Git Commit 建議

---

# 開發規則

一次只修改一個檔案。

完成後先說明。

不要一次改整個專案。

保持 MVP 可運行狀態。