請開始實作 Phase 2D Task 6：F2 Debug Overlay。

目標：
加入開發者專用 Debug Overlay，可按 F2 顯示 / 隱藏目前 WWT state。

請嚴格遵守：

* 一次只修改一個檔案
* 完成後停止
* 不可重構
* 不可修改 server.py
* 不可修改 OfficeScene.js
* 不可修改 Phaser scene
* 只改 index.html

需求：

新增右上角 debug overlay panel：

顯示：

* mode
* topic
* keywords
* last_update
* canvas resolution
* Phaser scale mode

overlay 規格：

* 預設 hidden
* F2 toggle 顯示/隱藏
* 半透明黑底
* 綠色 terminal 風格文字
* monospace font
* z-index 高於 Phaser canvas
* 不可影響 OBS capture

資料來源：

每 3 秒 fetch：

```text id="6gizru"
/api/state
```

顯示：

```text id="8c1ghu"
mode: discussion
topic: 油價暴漲
keywords: 油價, 通膨, FED
last_update: 2026-05-28 01:20
resolution: 1920x1080
scale: FIT
```

要求：

* keywords 若不存在，顯示 "-"
* topic 若為空，顯示 "(none)"
* fetch 失敗不可 crash
* F2 時避免瀏覽器預設行為
* 不可污染既有 LED overlay

完成後：

1. 顯示完整 diff
2. 解釋 overlay 為何不影響 OBS
3. 解釋為何放 index.html 而不是 Phaser scene
4. 不要繼續下一步
