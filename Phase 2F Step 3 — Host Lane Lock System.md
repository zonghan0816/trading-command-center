# Phase 2F Step 3 — Host Lane Lock System

## 目標

修正目前主持人偶爾左右互換站位的問題。

目前：
- 阿明哥大多在左側，但某些 mode transition / collision correction 時會跑到右側
- 小美姐同理可能跑到左側
- 造成新聞台鏡位不穩、角色 identity 混亂

本 Step 要實作：

# 固定主持人 Lane（左右半場）

---

# 規格

## Host 固定區域

阿明哥：
- 永遠只能在畫面左半邊

小美姐：
- 永遠只能在畫面右半邊

禁止：
- crossing
- swap lane
- collision 推到對方區域

---

# Lane 定義

OfficeScene.js：

新增：

```js
const HOST_LANES = {
  aming: 0.35,
  xiaomei: 0.65
}