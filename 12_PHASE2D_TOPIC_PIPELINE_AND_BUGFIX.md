# WWT Phase 2D

Topic Pipeline + Bug Fix

---

目前狀態

Phase 2A
完成

Phase 2B
完成

Phase 2C
完成

---

目前 MVP 已具備：

- Studio 場景
- 主持人
- Bubble
- LED
- 熱門關鍵字
- Topic API
- State API

---

本階段目標

打通內容流：

topic
→ LED
→ Hosts
→ Keywords

並修復已知 bug。

---

# 任務 1

修復 /api/topic 500 Error

---

目前已知：

server.py

/api/topic

可能出現：

KeyError

原因：

hosts.aming

hosts.xiaomei

不存在時直接寫入。

例如：

st["hosts"]["aming"]["status"]

st["hosts"]["xiaomei"]["status"]

---

請改為安全寫法。

例如：

setdefault()

或

schema 初始化。

---

要求：

任何缺失欄位都能自動補齊。

---

目標：

POST /api/topic

永遠不會因 hosts 結構缺失而崩潰。

---

# 任務 2

建立 State Normalizer

---

新增 helper：

normalize_state()

---

保證存在：

{
  "mode": "idle",

  "topic": "",

  "keywords": [],

  "hosts": {
    "aming": {},
    "xiaomei": {}
  }
}

---

所有：

load

save

update

都先 normalize。

---

# 任務 3

LED 真正顯示 Topic

---

目前：

discussion mode

理論已完成。

---

請驗證：

POST

{
  "mode":"discussion",
  "topic":"房價創新高"
}

---

LED 必須顯示：

今日話題

房價創新高

ON AIR

---

提供驗證截圖。

---

# 任務 4

Topic 自動同步 Keywords

---

新增 helper：

derive_keywords(topic)

---

例如：

topic

房價創新高

---

產出：

[
 "房價",
 "房貸",
 "買房",
 "租屋",
 "利率"
]

---

若 topic 改變：

keywords 自動更新。

---

若已有手動 keywords：

優先保留手動值。

---

# 任務 5

主持人自動引用 Topic

---

當：

mode = discussion

---

prompt 必須引用：

topic

---

例如：

topic

便利商店飲料又漲價

---

阿明：

以前養樂多才10塊啦...

---

小美：

現在便當跟飲料一起買都破百了。

---

避免：

topic 是房價

主持人卻聊早餐店。

---

# 任務 6

新增 Debug Overlay

---

開發模式：

F2

顯示：

mode

topic

keywords

last update

---

方便除錯。

---

正式直播可關閉。

---

# 不做

不要：

Google News

PTT

Dcard

Threads

ElevenLabs

OBS

Live2D

VTube

---

# 修改檔案限制

優先：

server.py

---

必要時：

OfficeScene.js

index.html

---

不要碰：

BootScene.js

config.js

角色素材

---

# 完成後回報

1.

修復哪些 bug

2.

normalize_state 設計

3.

topic → keywords 流程

4.

discussion mode 驗證結果

5.

修改檔案列表

6.

Git Commit 建議

---

# 開發規則

一次只修改一個檔案。

完成後停止。

說明結果。

再進下一步。

不可一次修改整個專案。

保持 MVP 可運行。