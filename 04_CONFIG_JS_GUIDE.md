# WWT Config.js 修改指南

本文件為 GPT 建議。

請配合：

CLAUDE.md

GPT_BRIEF_WWT.md

03_WWT_GPT_RECOMMENDATIONS.md

一起閱讀。

---

# 本次目標

只修改：

config.js

不要修改：

OfficeScene.js

BootScene.js

server.py

index.html

---

# 保留項目

請保留：

Phaser 設定

Scale 設定

Canvas 大小

Camera

Layout 核心結構

所有非角色相關設定

---

# 角色調整

移除：

market

boss

ml

news

swing

dca

agent

---

保留：

aming

xiaomei

---

建議結構

HOSTS

aming

name:
阿明哥

seat:
left

color:
藍色

---

xiaomei

name:
小美姐

seat:
right

color:
粉紅色

---

# 招牌修改

原本：

Trading Command Center

改為：

晚晚嘴台灣

WWT

Taiwan Tonight

---

# 主題色

原本：

青藍色科技風

改為：

橘紅色直播節目風格

建議：

PRIMARY_COLOR

#FF6B35

---

# 場景規劃

目前只保留：

studio

---

未來預留：

newsdesk

coffee

meeting

---

但本階段不要實作。

只保留配置位置即可。

---

# 座位配置

畫面結構：

阿明哥

中央主持桌

小美姐

左右對坐。

---

# 本階段禁止事項

不要新增圖片

不要新增動畫

不要新增背景

不要新增資源檔

不要修改場景邏輯

不要修改 OfficeScene.js

不要修改 BootScene.js

---

# 完成後請回報

1.

config.js 修改內容

2.

移除哪些角色

3.

新增哪些設定

4.

下一步需要修改哪些檔案

預期：

OfficeScene.js

BootScene.js

index.html