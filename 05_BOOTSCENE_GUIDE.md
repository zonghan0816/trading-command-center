# WWT BootScene 修改指南

目前：

server.py 已完成

config.js 已完成

下一步：

BootScene.js

---

# 本次目標

只處理：

preload

角色資源

不要碰：

OfficeScene.js

不要碰場景邏輯

不要碰角色移動

不要碰聊天系統

---

# 角色資源

舊：

market

boss

ml

news

swing

dca

agent

---

新：

aming

xiaomei

---

# MVP策略

目前沒有正式角色圖片。

因此：

如果 char_aming.png

char_xiaomei.png

不存在：

請自動建立 fallback。

例如：

藍色方塊角色

粉色方塊角色

避免 preload 失敗。

---

# customAssets

若圖片存在：

使用圖片。

若圖片不存在：

使用程序生成角色。

不可因缺圖而導致專案無法啟動。

---

# 背景

不要加入：

studio_bg

newsdesk_bg

coffee_bg

正式圖片。

---

若背景不存在：

沿用現有程序生成背景。

避免 Phase1 卡在美術。

---

# 本階段禁止事項

不要修改 OfficeScene.js

不要修改 server.py

不要修改 index.html

不要新增動畫

不要新增場景

不要新增資源檔

---

# 完成後請回報

1.

移除哪些 preload 資源

2.

新增哪些 preload 資源

3.

fallback 如何處理

4.

是否可在沒有任何圖片資源下正常啟動

5.

下一步建議修改檔案