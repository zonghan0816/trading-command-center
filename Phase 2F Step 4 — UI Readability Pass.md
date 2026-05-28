# Phase 2F Step 4 — UI Readability Pass

## 背景

Phase 2F 前半已完成：

- 固定 1920×1080 舞台
- FIT scaling
- Host Lane Lock
- OBS-ready framing

但切換到真正 1080p 螢幕後發現：

# 多數 UI 字體過小

尤其：

- Bubble
- 右上資訊 panel
- 熱門關鍵字板
- 上方 subtitle
- 右側彩色 monitor

在 OBS / 直播 / 一般觀看距離下：

可讀性不足。

---

# 本 Step 目標

提升：

# UI readability + broadcast clarity

讓 WWT 更像真正：

- 新聞台
- 深夜政論節目
- AI 直播 Studio

而不是 prototype。

---

# 修改原則

## 重要

不要：

- 重構 UI 系統
- 改 API
- 改 mode system
- 改 Topic pipeline
- 改角色動畫
- 改 Phaser camera

本次：

# 只做 UI readability polish

---

# 修改範圍

允許修改：

```text
index.html
src/scenes/OfficeScene.js
src/config.js

# UI Readability Pass 補充修正

## 右側彩色條 Monitor 移除

目前畫面右側的彩色條 monitor：

- 無明確語意
- 像 placeholder decoration
- 分散 LED 與主持人視覺焦點
- 不像真正新聞台 UI

因此：

# 直接移除

---

# 修改要求

刪除：

- OfficeScene.js 中建立該 monitor 的程式
- 對應 container / graphics / text
- 對應 update logic（如果有）
- 對應 asset reference（如果有）

---

# 注意

不要影響：

- 右上 topic panel
- 熱門關鍵字板
- LED
- 主持人
- bubble

---

# 預期效果

移除後：

✅ 畫面更乾淨
✅ LED 成為真正視覺中心
✅ 更像真正新聞台
✅ 減少 prototype 感
✅ OBS framing 更集中

---

# 備註

這是：

UI simplification / visual focus improvement

不是 bugfix。