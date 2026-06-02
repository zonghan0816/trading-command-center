# GPT 決策回覆 — BGM 路徑拍板

## 結論

走 **B'：Phaser 端內建一首 BGM，不做情緒同步切歌**。

理由：

```text
A 太晚才有效，必須等 OBS 接起來才有聲音。
B 太早，情緒切歌會增加複雜度與反覆調整成本。
B' 剛好：現在就能解決完全靜音，改動小，之後可升級 B。
```

---

## Q1. 哪條路？

選：

```text
B' — Phaser 端內建、只放一首、不做情緒切歌
```

### 執行範圍

這一階段只做：

```text
1. 加 assets/audio/
2. 放一首可循環 BGM
3. BootScene preload
4. OfficeScene 播放 loop
5. 預設音量 0.25 ~ 0.3
6. 加 mute / unmute 按鈕
7. 找不到音檔時無聲帶過，不報錯中斷
```

不做：

```text
情緒切歌
時段切歌
整點 sting
dialogue ducking
多首曲庫
```

---

## Q2. 曲風方向？

選：

```text
lofi
```

### 曲風規格

```text
類型：lofi / soft podcast background / chill beat
節奏：中慢速
情緒：中性、穩定、不搶對話
用途：24H 背景墊音
避免：新聞 jingle、復古電視台旋律、太強主旋律、太熱血
```

### 音檔來源

優先：

```text
YouTube Audio Library
Pixabay Music
其他明確標示可商用 / 可直播 / 無 ContentID 風險來源
```

避免：

```text
Spotify
YouTube Music
一般流行歌
不明授權 BGM
AI 產生但授權不清楚的音樂
```

---

## Q3. 接 OBS / YT 直播後，要不要跟新聞時段同步？

選：

```text
兩個都先不分時段
```

原因：

```text
目前主線仍是角色、對話品質、棚景與假 24H 直播基本穩定性。
時段制 host rotation + BGM sync 是下一階段功能，不要現在綁進來。
```

之後可升級：

```text
Phase 6.x：
- host rotation
- BGM by time slot
- 整點 sting
- 開場 / 轉場音效
```

---

## Q4. 預算影響？

判定：

```text
預算無壓力
```

原因：

```text
BGM 不走 Anthropic API。
音檔本機儲存即可。
主要成本是找音樂與測音量，不是金錢成本。
```

---

## 附帶決策

### 1. 音量預設

選：

```text
0.25 ~ 0.3
```

建議：

```ts
const BGM_VOLUME = 0.28
```

---

### 2. 靜音切換按鈕

選：

```text
要加
```

最低需求：

```text
右上角小按鈕：BGM ON / OFF
狀態存在 localStorage
預設 ON，但如果瀏覽器 autoplay 限制，就等第一次點擊後播放
```

---

### 3. 載入策略

選：

```text
BootScene 預載
```

理由：

```text
只有一首 BGM，記憶體成本低。
預載可避免進 OfficeScene 才 lag。
```

---

### 4. fallback

選：

```text
找不到音檔時無聲帶過
```

不彈錯、不擋畫面、不影響直播。

console warning 即可：

```ts
console.warn("[audio] BGM not found, continue without music")
```

---

## 建議實作規格

### 檔案路徑

```text
assets/audio/bgm_main.mp3
```

可接受替代：

```text
assets/audio/bgm_main.ogg
```

---

## BootScene

新增 preload：

```ts
this.load.audio("bgm_main", [
  "assets/audio/bgm_main.mp3",
  "assets/audio/bgm_main.ogg"
])
```

---

## OfficeScene

新增播放邏輯：

```ts
private bgm?: Phaser.Sound.BaseSound

create() {
  this.startBgm()
}

private startBgm() {
  if (!this.cache.audio.exists("bgm_main")) {
    console.warn("[audio] BGM not found, continue without music")
    return
  }

  this.bgm = this.sound.add("bgm_main", {
    loop: true,
    volume: 0.28
  })

  const muted = localStorage.getItem("bgm_muted") === "1"

  if (!muted) {
    this.bgm.play()
  }

  this.createBgmToggle()
}
```

---

## Mute UI

```ts
private createBgmToggle() {
  const muted = localStorage.getItem("bgm_muted") === "1"

  const button = this.add.text(20, 20, muted ? "BGM OFF" : "BGM ON", {
    fontSize: "14px",
    color: "#ffffff",
    backgroundColor: "#00000088",
    padding: { x: 8, y: 4 }
  })

  button.setInteractive({ useHandCursor: true })

  button.on("pointerdown", () => {
    if (!this.bgm) return

    const isMuted = localStorage.getItem("bgm_muted") === "1"
    const nextMuted = !isMuted

    localStorage.setItem("bgm_muted", nextMuted ? "1" : "0")

    if (nextMuted) {
      this.bgm.stop()
      button.setText("BGM OFF")
    } else {
      this.bgm.play()
      button.setText("BGM ON")
    }
  })
}
```

---

## 驗收標準

```text
1. /preview 不受影響
2. OfficeScene 開啟後有背景音樂
3. BGM loop 不明顯斷點
4. BGM 音量不蓋過對話
5. mute / unmute 可用
6. reload 後保留 mute 狀態
7. 缺音檔時不 crash
8. OBS 擷取 browser source 時可收到聲音
```

---

## 不進本階段 scope

```text
情緒切歌
時段切歌
host rotation 聯動
整點 sting
開場音效
自動 ducking
音樂管理後台
多曲隨機播放
```

---

## 給 Claude 的一句話指令

```text
請執行 B'：Phaser 端內建單首 lofi BGM。只做一首 loop、預設音量 0.28、加 BGM ON/OFF 按鈕、localStorage 記住靜音狀態、BootScene 預載、OfficeScene 播放、缺音檔時無聲帶過。不要做情緒切歌、不要做時段切歌、不要做 ducking。
```

---

## 後續升級路線

```text
B' 單首 BGM
→ BGM 音量調整穩定
→ OBS 測試直播音訊
→ host rotation
→ 時段 BGM
→ 整點 sting
→ 情緒切歌
```

---

## 最終拍板

```text
現在做 B'
曲風選 lofi
不分時段
預算無壓力
音量 0.28
要 mute UI
BootScene 預載
fallback 無聲帶過
```
