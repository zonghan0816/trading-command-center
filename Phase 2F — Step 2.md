請開始實作 Phase 2F Step 2。

目標：
移除 OfficeScene.js 中會污染 world-space 的 resize handler。

背景：
Phase 2F Step 1 已完成：

* main.js 固定 1920x1080 logical canvas
* Phaser.Scale.FIT 已啟用
* OBS 與 1080p 顯示已穩定

現在需要移除舊版 RESIZE 時代遺留的 resize handler。

請嚴格遵守：

* 一次只修改一個檔案
* 完成後停止
* 不可重構其他邏輯
* 不可修改 main.js
* 不可修改 CSS
* 只改 src/scenes/OfficeScene.js

請處理：

刪除：

```js
this.scale.on('resize', (size) => {
  this.W = size.width;
  this.H = size.height;
  this.wallH = size.height * WALL_H_RATIO;
});
```

並改成：

```js
this.W = 1920;
this.H = 1080;
this.wallH = this.H * WALL_H_RATIO;
```

要求：

* world-space 永遠固定 1920x1080
* 不再依賴 browser resize
* 不可破壞 LED / desk / host positioning
* discussion mode positioning 保持正常

完成後：

1. 顯示完整 diff
2. 解釋為何 resize handler 現在是有害的
3. 說明是否還有其他 world-space 污染源
4. 不要繼續下一步
