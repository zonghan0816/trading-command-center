# 99 — 布簾過場（換裝/換幕）骨架

> 2026-06-10。為「主播每天換不同衣服」做的過場機制骨架。前端（`OfficeScene.js`）。

---

## 為什麼用布簾、不用 crossfade

使用者要「主播每天穿不同衣服」。第一直覺是像天氣/背景那樣 crossfade，但**角色不能這樣換** —— 衣服 alpha 淡入淡出會「疊影/溶解」，像衣服在身上融化，很詭異。

使用者提出正解：**像舞台表演，布簾拉上遮住 → 幕後換好 → 拉開亮相**。這完全符合本專案「24H AI 角色**表演**」的定位，觀眾一看就懂「換幕了」，而且換裝是在「完全遮住」時瞬間做的 → 沒有漸變、也沒有突兀硬切。

## 換裝的自然時機
不在節目中途換，而是在「換日」交界（清晨 6 點、觀眾最少）換，讓觀眾讀成「新的一天開始、主播換裝了」，像真人主播隔天穿不同衣服。

---

## 這次做的（骨架）

`OfficeScene.js` 新增：

- `_buildCurtain()`：建兩片布簾（**暫用紅色塊 `0x7a1320` 佔位**、depth 50 蓋在主播 30/泡泡 33 之上）+ 過場字卡（暫用文字「天天嘴台灣」、之後換 logo 圖）。預設停在「開」（畫面外、隱藏）。
- `_runCurtainChange(onCovered, opts)`：跑一次過場 —— **① 拉上（700ms）→ ②完全遮住時呼叫 `onCovered`（幕後瞬間換裝）+ 字卡淡入 → ③ 停 1.2s → ④ 拉開（700ms）**。`_curtainBusy` 防重入；速度可調（closeMs/holdMs/openMs）。兩片從左右滑進、中央多 4px 重疊不露縫、關上時 1920 全覆蓋。
- `_applyOutfit(outfit)`：幕後換裝 hook。**目前是 STUB** —— 只記 `_currentOutfit` + 重播 idle（同套衣服、無視覺變化）。TODO：素材到位後改成切到 outfit 對應的 texture/anim。
- `_pickTodaysOutfit()`：依日期（`getDay()`）挑當天衣服。目前只 `['outfit_1']`，之後擴成一週 7 套 / 季節套。
- `_maybeDailyOutfitChange()`：每天清晨自動換一次。**預設關**（`_outfitAutoEnabled=false`、避免只有 1 套時亂跑），每 60s 檢查。
- create() 接線：建布簾 + 排程 + **console 測試入口 `window.tdtCurtainChange()`**。

## 怎麼測
純前端、**刷新即可**（`/src` no-cache）。F12 console 打 `window.tdtCurtainChange()` → 看布簾關→字卡→開、驗證「遮得乾淨 + 時機對」。

## 已知限制
- 布簾是 Phaser 層、蓋得住背景+主播，**蓋不住 HTML 疊層**（時鐘/CTA/徽章）。換衣服夠用；要全遮再另處理。
- 換裝目前無實際視覺變化（只有 outfit_1、STUB）。

## 要變完整功能還缺
1. **GPT 畫**：布簾 PNG ×1 + 每套衣服 16 張（陳柏偉 9 emotion + 王于安 7 emotion）。素材結構建議 `assets/char_3q/outfit_N/{emotion}.png`。
2. **Claude 接**：BootScene 載入各 outfit 貼圖/動畫 → 填 `_applyOutfit` 真的切貼圖 → 把 `_outfitAutoEnabled` 打開、選定換裝時辰。

## 跟之前的差異
- 新的「過場」原生機制，之後可重複用在：換時段道具（麥克風架→主播台→床）、季節換裝、節目段落過場。
- 不動現有對話/sprite 系統，純加法。
