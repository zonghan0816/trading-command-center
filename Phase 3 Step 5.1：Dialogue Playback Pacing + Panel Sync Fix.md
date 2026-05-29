請做 Phase 3 Step 5.1：Dialogue Playback Pacing + Panel Sync Fix。

問題：
小美台詞語氣動作已完成，但播放時看起來像右上 panel 先跳到下一句，舞台泡泡還在播上一句，造成像被阿明中斷的錯覺。另外每段泡泡顯示時間略慢。

請只改 src/scenes/OfficeScene.js，不改 server.py、不改 API schema、不動阿明素材。

修正目標：
1. _chatInProgress === true 時，不要讓 _pollState 更新右上主持人 last_output，避免 panel 先跑。
   - 可以保留 topic / time 更新，或簡單地在 chat 進行中 skip _updateHTMLPanel(data)。
   - 舞台播放期間，panel 應以目前播放中的 line 為準，或不要搶先顯示下一輪 state。

2. 加 dialogue playback token / sequence id，避免舊 delayedCall 在新一輪開始後還繼續執行。
   - 例如 this._dialogueSeq++
   - _playLineSequence / showChunks 裡檢查 seq 是否仍一致。
   - 若不一致就 return。

3. 微調泡泡節奏：
   目前：
   chunkMs = Math.max(2800, 2500 + Math.floor(chunk.length / 10) * 350)
   line gap = 500
   next dialogue gap = 1500

   建議改成：
   chunkMs = Math.min(4200, Math.max(1800, 1400 + chunk.length * 45))
   line gap = 250~350
   next dialogue gap = 1000~1200

4. 保留台詞語氣動作：
   小美仍用 _chooseLineAction()
   阿明仍 fallback talking
   不恢復 walking / wander / random movement。

驗收：
- 舞台泡泡播放時，右上 panel 不要搶先顯示下一輪台詞。
- 小美一句話不會還沒播完就被阿明泡泡蓋過。
- 對話節奏比現在快一點，但不要像快轉。