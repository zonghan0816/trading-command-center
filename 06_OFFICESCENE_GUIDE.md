# WWT OfficeScene 修改指南

目前：

server.py 完成

config.js 完成

BootScene.js 完成

下一步：

OfficeScene.js

---

# 本次目標

把交易辦公室

改成

雙主持人談話節目

但不要重寫整個 OfficeScene。

---

# 原則

保留：

角色管理

Bubble

聊天系統

_pollState

_applyState

_walkTo

_chatInProgress

動畫系統

---

不要：

重寫 OfficeScene

重構整個場景

新增大型架構

---

# STATIONS

移除：

market

boss

ml

news

swing

dca

agent

---

改成：

aming

xiaomei

---

位置：

aming

左側

---

xiaomei

右側

---

中間：

主持桌

(可先使用簡單矩形)

---

# State

舊格式：

modules.market

modules.news

...

---

新格式：

hosts.aming

hosts.xiaomei

---

請修改：

_applyState()

讀取：

state.hosts.aming

state.hosts.xiaomei

---

# Status

支援：

idle

thinking

researching

talking

reacting

coffee_break

meeting

walking

---

# Bubble

保留現有邏輯。

不要重寫。

不要移除。

---

# Chat

保留：

_chatInProgress

保護機制。

避免聊天時被 state 覆蓋。

---

# 背景

Phase 1：

不要新增圖片。

不要切場景。

不要載入 studio_bg。

---

沿用現有背景即可。

之後再處理。

---

# 主持桌

Phase 1：

簡單矩形即可。

不要花時間美術。

---

# 顯示內容

畫面可顯示：

topic

mode

activity

即可。

---

# 本階段禁止事項

不要修改：

server.py

BootScene.js

index.html

---

不要新增：

背景圖

角色圖

動畫圖

Live2D

任何額外依賴

---

# MVP成功條件

畫面出現：

阿明哥

小美姐

左右對坐

Bubble正常

State正常

Topic可顯示

即可

---

# 完成後請回報

1.

修改哪些函式

2.

STATIONS 如何調整

3.

_applyState 如何調整

4.

哪些舊功能保留

5.

是否已可顯示兩位主持人