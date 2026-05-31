# 給 GPT 的短報告 #6 — 小美 emotion sheet 接上後視覺問題

**類型**：視覺驗收 + 找方向
**承接**：73_CLAUDE_XIAOMEI_EMOTION_SHEET_USAGE.md（Codex spec）+ 73_XIAOMEI_EMOTION_SHEET_IMPL_BRIEF.md（Claude impl）
**請 GPT 做的事**：判斷下一步該回退 / 部分採用 / 等 Codex 重畫

---

## 一、做了什麼（Phase 4 Step 5.12）

- 載入 `char_xiaomei_v2_emotion_sheet_256.png`（256×256 × 4 col × 7 row）
- 創 14 個 animation key（7 既有 + 7 新 emo_*）
- scale = 1.7、配 flag `char_xiaomei_v2_emotion_sheet`
- `_chooseLineAction` 接受 `line.emotion`、emotion 缺則 fallback keyword
- impl brief 已寫（73_XIAOMEI_EMOTION_SHEET_IMPL_BRIEF.md）
- 預設 OFF、使用者翻 ON 視覺驗收

---

## 二、使用者實測回報（圖 2 張）

### 問題 1：嘴巴動的位置在胸口附近

> 「talking 那 4 frames 之間、臉跟嘴幾乎沒變化、反而是身體 / 領口 / 胸口的細節在閃」

**對應 row**：Row 2 talk（frames 4-7）
**性質**：繪師沒把 lip-sync 做在臉上、視覺重心被胸口的細節變化偷走

### 問題 2：wave / pointing 像長出一隻怪手

> 「舉手姿勢很奇怪、是直接從身體側邊貼一隻手、肩膀沒動、看起來就像浮空的怪手」

**對應 row**：Row 7 wave（frames 24-27）
**性質**：手臂沒有連著肩膀延伸、是「standing 主體 + 一隻浮空手」的 layer 疊圖

### 問題 3：站立畫面跟 v2 draft 差不多、感覺沒升級

> 「還是站立畫面」

→ idle row 跟 v2 draft 差異感不夠強

---

## 三、根因判斷

不是程式問題、是 **sprite sheet 本身繪圖問題**：

| Row | 設計問題 |
|---|---|
| Row 2 talk | 嘴沒做大幅張合、變動在胸口 |
| Row 5 surprised | 待驗、可能類似 |
| Row 6 skeptical | 待驗、頭眼沒動的話也會怪 |
| Row 7 wave | 手臂沒從肩延伸、像貼一隻外掛的手 |

256×256 解析度本身沒問題、是各 frame 的關鍵動作沒做出來。

---

## 四、3 個選項

### A. 立即 flag → false、回 v2 draft、等 Codex 重畫

- ✅ 零風險、立即穩定
- ✅ 給 Codex 完整 feedback、要求重畫關鍵 row
- ❌ Codex 73 號素材完全閒置

### B. 部分採用、把問題 row 替換成 talking

- ✅ 不浪費已接好的程式
- ✅ idle / smile / thinking / surprised 4 row 還能用
- ❌ wave、skeptical 改 alias 到 talking、emotion 效果打折
- ❌ 還是不算「升級」、視覺上感覺差不多

### C. 使用者自己改 sprite sheet、再回來判斷

- 使用者 0 程式背景但會描述問題
- 不太可行、跳過

---

## 五、Claude 的建議

**選 A**。理由：

1. 接好的程式（14 anim key、scale 分支、emotion 解析）是「未來資產」、不會消失、Codex 重畫後直接生效
2. 部分採用（B）會讓接下來的 24H 觀察期混進視覺問題、干擾使用者判斷 dialogue 品質
3. 重畫關鍵 row 對 Codex 不算大改、有具體 feedback（「手要從肩膀延伸、不要貼一隻手」）

---

## 六、要回 Codex 的具體 feedback（如果 GPT 同意 A）

```
char_xiaomei_v2_emotion_sheet_256.png 視覺問題：

Row 2 (talk):
  - lip-sync 沒做在臉上、4 frame 之間嘴的張合幅度不夠大
  - 反而胸口 / 領口的細節在變、視覺重心跑到胸口
  - 請放大嘴部 keyframe 差異、其他部位定住

Row 7 (wave):
  - 手不像「舉手」、像在身體側邊貼一隻浮空手
  - 肩膀沒抬、手臂沒延伸
  - 請整個手臂連動（肩膀抬 → 手肘彎 → 手揮）

Row 5 (surprised) / Row 6 (skeptical):
  - 待驗證、但同樣需要「臉部表情」是視覺主角、不是其他部位

整體：每個 row 的「動」要在角色該動的部位、不是其他無關細節在閃。
```

---

## 七、想問 GPT 的 3 件事

1. 同意 A 嗎？還是 B 比較實用？
2. 給 Codex 的 feedback 文字夠具體嗎？有沒有漏點？
3. 接下來 24H 觀察期是否照常進行（emotion sheet 是視覺平行支線、不影響後端統計）？

---

## 八、不需要 GPT 答的部分

- 14 anim key mapping 細節（已寫進 73 impl brief）
- scale 1.7 怎麼算的
- emotion 解析 fallback 邏輯

直接 chat 回答即可。
