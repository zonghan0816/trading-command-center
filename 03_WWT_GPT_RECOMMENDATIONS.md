# WWT（晚晚嘴台灣）補充建議與實作原則

本文件是 GPT 對 GPT_BRIEF_WWT.md 的補充建議。

目的：

避免過度設計。

避免重構失控。

避免再次卡在圖像、動畫與直播整合。

---

# 核心原則

WWT 第一版目標不是：

打造最強 AI 電視台。

而是：

讓兩位 AI 主持人能在畫面中自然聊天。

只要做到：

阿明哥

小美姐

根據話題聊天

Bubble 顯示正常

OBS 能播放

即視為成功。

---

# 第一優先

優先完成：

阿明哥出現在畫面

小美姐出現在畫面

輸入 topic

產生對話

Bubble 顯示

OBS可截取

其餘皆可延後。

---

# 不要做的事情

Phase 1 禁止：

Live2D

VTuber

3D模型

即時嘴型同步

骨架動畫

複雜特效

角色換裝

多角色系統

額外前端框架

重構 FastAPI

重構 Phaser

重構整體架構

---

# 狀態系統建議

除了：

idle

talking

之外

請保留：

thinking

researching

reacting

coffee_break

meeting

walking

---

原因：

觀眾喜歡看到 AI 在工作。

而不是一直講話。

---

# Activity 系統（新增）

建議 state 增加：

activity

例如：

{
  "activity":"search_news"
}

可用值：

search_news

review_comments

prepare_show

coffee_break

meeting

idle

---

用途：

畫面可顯示：

阿明哥正在搜尋熱門新聞

小美姐正在查看留言

正在準備下一個話題

---

# Scene 系統建議

目前規劃：

studio

newsdesk

coffee

meeting

保留。

但 MVP 只需：

studio

即可。

其餘先保留介面。

不需實作。

---

# 對話模式建議

不要固定：

阿明

小美

阿明

小美

循環。

請支援：

debate

react

casual

monologue

等模式。

---

debate

阿明 → 小美 → 阿明

---

react

小美提問

阿明回答

小美吐槽

---

casual

任意順序

---

monologue

阿明長回覆

小美一句收尾

---

# 閒聊資料庫

建立：

prompts/casual_topics.json

內容例如：

[
  "珍珠奶茶",
  "便利商店",
  "夜市",
  "AI",
  "股票",
  "颱風",
  "房價",
  "外送",
  "網購",
  "早餐店"
]

---

用途：

沒有新聞時使用。

降低 API 成本。

提升內容穩定度。

---

# 模式切換系統

建議增加：

mode

例如：

discussion

working

coffee

idle

---

用途：

discussion

正式節目

---

working

工作模式

---

coffee

茶水間

---

idle

待機

---

未來可做：

20分鐘節目

5分鐘工作模式

3分鐘茶水間

循環播放

---

# Pixel 圖像策略

第一版：

不要花時間製作正式美術。

不要等待繪師。

不要等待 Live2D。

---

使用：

程序生成角色

或

簡單色塊角色

即可。

---

驗證：

角色

對話

Bubble

State

OBS

全部正常後

再製作正式像素素材。

---

# 美術延後項目

以下全部 Phase 2 以後：

正式角色立繪

Pixel 動畫

表情包

直播間背景

News Desk 背景

Coffee Room 背景

Meeting Room 背景

Logo動畫

特效

---

# 新聞系統規劃

Phase 1

手動輸入 topic

例如：

{
 "topic":"房價創新高"
}

即可。

---

Phase 2

Google News RSS

---

Phase 3

PTT

Dcard

Threads

---

# Claude 工作規則

每次只修改一個檔案。

完成後說明修改內容。

不要一次修改整個專案。

不要大規模重構。

不要新增大型依賴。

優先保留既有架構。

---

# MVP 完成定義

完成以下即視為 Phase 1 成功：

阿明哥出現

小美姐出現

Studio 場景

手動輸入 topic

Claude 生成對話

Bubble 顯示

狀態切換

OBS 可截取

---

達成以上條件後

才進入：

Google News

留言牆

多場景

正式美術

直播自動化

等後續階段。