# Phase 2F Step 5.1 — UI Hierarchy Polish Pass

## 目標

本次不是新功能。

只做：

# UI hierarchy / readability polish

讓 OBS 畫面更像正式新聞節目。

---

# 本次要修正的問題

目前：

* TOP5 熱門榜仍太小
* Bubble 可讀性不足
* 右上 Status Panel 太像 debug
* 所有 UI 亮度太接近
* 視覺焦點不明顯

---

# 修改原則

只做：

* spacing
* typography
* hierarchy
* panel sizing
* opacity
* glow weight

禁止：

* 新功能
* API 修改
* mode system 修改
* host movement 修改
* architecture refactor

---

# 修改檔案

## 必改

* `src/scenes/OfficeScene.js`
* `index.html`

---

# Part 1 — TOP5 Board 真正放大

## 問題

目前：

* TOP5 只是文字變化
* board 本體仍太小
* OBS 下像 widget

---

## 修改

### 放大 board panel

熱門榜：

* width 約增加 2 倍
* height 約增加 1.8 倍

讓它真正像：

# 新聞節目熱門議題榜

---

## 文字規格

### Title

```text
HOT TOPICS
```

或：

```text
TOP 5
```

字體：

* 16~18px
* 橘色
* 微 glow

---

## Topic list

每列：

```text
① 台積電再創新高
② AI供應鏈
③ 升息預期
④ 外資買超
⑤ 台幣走強
```

---

## 排版

每列：

* line spacing 增加
* padding 增加
* 不擠在一起

---

## 視覺規則

禁止：

* 彩虹 debug 感
* RGB monitor 感
* cyberpunk toy 感

保留：

* 深色半透明底
* 橘框
* 白字
* 少量 glow

---

# Part 2 — Bubble Readability Pass

## 問題

目前：

* 字太密
* line-height 不夠
* padding 太小
* OBS 壓縮後難閱讀

---

## 修改

### bubbleText

調整：

```js
fontSize: 18px
lineSpacing: 7
```

---

## Bubble background

提高：

* 背景不透明度
* 可讀性

降低：

* glow 強度
* 過度 neon 感

---

## wrap width

從：

```js
170
```

增加到：

```js
200~220
```

---

# Part 3 — Status Panel Hierarchy

## 問題

右上 panel：

* 太像 debug log
* 資訊權重一致
* 不像節目 sidebar

---

## 修改

### Topic

提高層級：

```css
font-size: 15~16px;
font-weight: bold;
```

---

## 主持人名稱

做色彩區分：

### 阿明哥

```css
color: orange;
```

### 小美姐

```css
color: cyan;
```

---

## mode

降低權重：

```css
opacity: 0.65;
font-size: 11~12px;
```

---

## spacing

增加：

```css
line-height
padding-bottom
margin-bottom
```

讓資訊可呼吸。

---

# Part 4 — Header Hierarchy

## 修改

### 主標題

提高：

```css
font-size: 20~22px;
letter-spacing 增加
```

---

## Subtitle

降低亮度：

```css
opacity: 0.7;
```

避免與 LED 搶焦點。

---

# Part 5 — 視覺權重規則（重要）

所有 UI 必須遵守：

---

## 第一焦點

# LED 中央螢幕

最大、最亮。

---

## 第二焦點

# 主持人 + Bubble

---

## 第三焦點

# TOP5 熱門榜

---

## 第四焦點

# Header / Status Panel

---

# 禁止

禁止：

* 所有 UI 同亮度
* 所有 glow 同強度
* 所有字同大小

---

# 不可修改

禁止動：

* API
* topic pipeline
* mode system
* Claude prompt
* host movement
* camera
* Phaser config
* state schema

---

# 實作原則

* 不重構 architecture
* 不新增 framework
* 不新增 animation system
* 不新增 library
* 一次只做 hierarchy polish

---

# 預期結果

完成後：

* OBS 更像正式節目
* 可讀性提升
* 不再像 prototype/debug tool
* 視線自然聚焦：

```text
LED → 主持人 → TOP5 → Header
```
