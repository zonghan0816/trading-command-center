# 陳柏偉 情緒動作 PROMPT BRIEF

**角色定位**：3Q 陳柏惟風 — 草根行動派 / 熱血政治人物兼 YouTuber
**核心人格**：高敏感 + 高表達 + 攻擊型、戰鬥力強、真誠不裝
**用途**：TDT 天天嘴台灣 來賓側主持人 emotion sprite

---

## 完整 Prompt（複製貼到 AI 繪圖工具）

```
請參考上傳的角色設定集，使用完全相同的角色
（短黑髮、深藍色長袖襯衫、深灰長褲、黑色皮鞋），
畫出單張全身情緒動作圖。

畫布：單張 512x512
背景：純綠色（#00B140），不要漸層不要陰影

角色全身入鏡，不要裁切。

動作（每次生成指定一個）：
[1]  idle           — 自然站立，雙手放身側，眼神平靜
[2]  passionate     — 上身前傾，雙臂張開，嘴巴說話，眼神充滿鬥志
[3]  combat         — 雙手交叉胸前，下巴微收，眼神銳利
[4]  excited        — 雙拳高舉，大笑露牙，眼睛睜大
[5]  humor          — 頭歪右邊，單肩聳起，壞笑，單眉上挑
[6]  sincere        — 雙手貼胸，頭微低，表情溫和真誠
[7]  resilient      — 單拳握緊放身側，挺胸站直，自信微笑
[8]  angry          — 單手指向前方，眉頭深皺，嘴巴張開大聲
[9]  speech         — 單手向外指向群眾，全身氣場強勢
[10] thinking       — 單手托下巴，眉頭微皺，眼神專注沉思，身體微側
[11] mocking        — 嘴角單邊上揚冷笑，單眉挑高，單手叉腰，諷刺神態
[12] sympathy       — 雙手交握身前，頭略低，眉頭微皺，表情凝重不嘲弄
[13] surprised      — 嘴巴張大，雙眼睜大，單手往前微抬，意外震驚
[14] explain        — 雙手手掌向上攤開，身體微前傾，邊說邊比手勢解釋
[15] mocking_laugh  — 仰頭大笑張嘴，單手指向前方，嘲諷式爆笑
[16] greeting       — 單手揮手或抱拳，露牙親切微笑，打招呼姿勢
[17] disgusted      — 嘴角下撇，眉頭皺起，單手揮開或推遠，明顯不屑

角色比例、髮型、服裝必須與設定集完全一致。
本次生成：[在這裡填入編號和名稱，例如 [1] idle]

將長寬比設為 1:1
```

---

## 各情緒對應 TDT 對話場景

| # | 名稱 | 對應 tone / angle | 已生成 |
|---|---|---|---|
| 1  | idle          | 預設待機 | ✅ |
| 2  | passionate    | 熱血議題 / 為民發聲 | ✅ |
| 3  | combat        | 政策辯論 / 戰鬥模式 | ✅ |
| 4  | excited       | 反差新聞 / 興奮反應 | ✅ |
| 5  | humor         | 諷刺現象 + 幽默 punchline | ✅ |
| 6  | sincere       | 真誠表態 / 對選民說話 | ✅ |
| 7  | resilient     | 不服輸 / 反擊指控 | ✅ |
| 8  | angry         | 對荒謬政策 / 真實不公發怒 | ✅ |
| 9  | speech        | monologue 結尾 / 振臂高呼 | ✅ |
| 10 | thinking      | discussion_mode / 分析制度成因 | ✅ |
| 11 | mocking       | mocking + history_compare（最常用）| ✅ |
| 12 | sympathy      | **Step 5.22 真實傷害題、必備** | ✅ |
| 13 | surprised     | 反應頭條 / 意外消息 | ✅ |
| 14 | explain       | monologue / 解釋政策邏輯 | ✅ |
| 15 | mocking_laugh | 嘲諷式 punchline 收尾 | ✅ |
| 16 | greeting      | 開場 / 每小時整點換場 | ✅ |
| 17 | disgusted     | 對荒謬政策 / 行為的不屑反應 | ✅ |

---

## 補圖優先序

1. **[12] sympathy** — 補上 Step 5.22「同情當事人」缺口、最緊
2. **[11] mocking** — 政論主持人核心、現有 9 個沒這個
3. **[10] thinking** — discussion_mode 撐場用
4. **[14] explain** — monologue 用
5. **[13] surprised** — 反應頭條
6. **[15] mocking_laugh** — 收尾爆點
7. **[16] greeting** — 整點換場
8. **[17] disgusted** — 負面反應差異化

完成這 17 動作後、陳柏偉跟王于安（12 emotion + 3 action）情緒數量接近、不會看起來「王于安活、陳柏偉死」。

---

## 檔名規則

存到 `assets/char_3q/` 並命名為：

```
emo_thinking.png
emo_mocking.png
emo_sympathy.png
emo_surprised.png
emo_explain.png
emo_mocking_laugh.png
emo_greeting.png
emo_disgusted.png
```

新增完後需要：
1. 跑 `scripts/chromakey_3q.py`（如果有、否則參考 chromakey_xiaomei.py）去綠 + despill
2. 跑 histogram matching normalize 對齊色彩（參考 normalize_xiaomei.py）
3. 更新 server.py `_CHARS['aming']` 或 prompt 內的 emotion 清單（若有限制）
4. 在 OfficeScene.js / dialogue render 把新 emotion 加入可用 pool
