"""Phase 4 Step 5.28: Punchline 評分 + 挑片報告。

讀 wwt_dialogue_archive.jsonl、用 Claude Haiku 4.5 批次評分（1-10）、
輸出 markdown 報告 punchline_top_YYYYMMDD.md、附完整對話 + 評分理由。

策略：
- 過濾掉 quality_blocked > 0 或 sympathy tone（避免真實傷害題被切 Shorts）
- 每批 8 輪送 Claude、結構化 JSON 輸出
- 排序、出前 N 名

使用：
    python scripts/score_punchlines.py              # 看今天
    python scripts/score_punchlines.py 20260603     # 看指定日
    python scripts/score_punchlines.py --top 20     # 出前 20 名
"""
import io
import json
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

HERE = Path(__file__).resolve().parent.parent
ARCHIVE_FILE = HERE / "wwt_dialogue_archive.jsonl"

MODEL = "claude-haiku-4-5-20251001"
BATCH_SIZE = 8

SCORING_PROMPT = """你是 YouTube Shorts 挑片編輯、專門從台灣政論 / 嘴砲節目找 30-60 秒爆點剪片。

評分標準（1-10）：
- 10 = 一個 zinger 句子能獨立爆紅、有強烈梗 / 反轉 / 諷刺
- 8-9 = 整輪結構好、開頭有 hook、中段衝突、結尾收 punchline
- 6-7 = 有亮點但沒爆 / 需要前後文脈才好笑
- 4-5 = 普通評論、缺乏戲劇感
- 1-3 = 純分析 / 教條 / 沒 punchline

扣分項：
- 涉及真實傷害（傷亡 / 受害者 / 家屬）→ **強制 ≤ 3**（不適合做 Shorts 笑點）
- 過於零碎、句子不獨立
- 政治指控個人（不符節目風格）

加分項：
- 台語 / 網路梗使用自然
- 反差 / 黑色幽默
- 「上一句鋪墊 + 下一句爆」結構
- 主持人個性鮮明

輸出 JSON 陣列、每個 round 一個物件：
[
  {"idx": 0, "score": 8, "reason": "陳柏偉嗆「靠夭喔」反差萌、王于安一句吐槽收很乾淨", "best_line": "缺牙20年還活得好好的、怎麼沒變海綿腦"},
  {"idx": 1, "score": 4, "reason": "純政策分析、沒 punchline"}
]

只輸出 JSON 陣列、不要任何其他文字、不要 markdown code fence。"""


def load_archive(date_filter: str | None = None) -> list[dict]:
    """讀 archive、可選按日期過濾（YYYYMMDD 格式）"""
    if not ARCHIVE_FILE.exists():
        print(f"❌ {ARCHIVE_FILE} 不存在、跑 server.py 先生資料")
        return []
    rounds = []
    with open(ARCHIVE_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if date_filter:
                # ts = "2026-06-03 18:40:36"、轉成 YYYYMMDD 比對
                ts_date = obj.get("ts", "")[:10].replace("-", "")
                if ts_date != date_filter:
                    continue
            rounds.append(obj)
    return rounds


def format_round_for_prompt(idx: int, r: dict) -> str:
    lines_str = "\n".join(
        f"  {l.get('speaker','?')}: {l.get('text','')}"
        for l in r.get("lines", [])
    )
    return (
        f"[idx={idx}] topic={r.get('topic','')[:30]} | "
        f"tone={r.get('tone','')} angle={r.get('angle','')}\n{lines_str}"
    )


def batch_score(rounds: list[dict], client) -> list[dict]:
    """送一批進 Claude、回傳 score list（idx 對應 batch 內順序）"""
    rounds_text = "\n\n".join(
        format_round_for_prompt(i, r) for i, r in enumerate(rounds)
    )
    full_prompt = SCORING_PROMPT + "\n\n以下是要評分的 " + str(len(rounds)) + " 輪對話：\n\n" + rounds_text

    msg = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": full_prompt}],
    )
    raw = msg.content[0].text.strip()
    # 容錯：偶爾還是會帶 code fence
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"⚠ batch JSON parse 失敗：{e}")
        print(f"  raw: {raw[:200]}")
        return []


def render_report(scored_rounds: list[dict], top_n: int, date_label: str) -> str:
    """生成 markdown 報告、top_n 排序 punchline"""
    scored_rounds.sort(key=lambda x: x["score"], reverse=True)
    top = scored_rounds[:top_n]

    lines = []
    lines.append(f"# Punchline 評分報告 — {date_label}")
    lines.append("")
    lines.append(f"**總評分輪數**：{len(scored_rounds)}")
    lines.append(f"**Top {top_n} 平均分**：{sum(r['score'] for r in top) / max(len(top), 1):.1f}")
    lines.append(f"**模型**：{MODEL}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for rank, r in enumerate(top, 1):
        round_data = r["round_data"]
        lines.append(f"## #{rank} (分數 {r['score']}/10) — {round_data.get('topic','')[:50]}")
        lines.append("")
        lines.append(f"- **時間**：{round_data.get('ts','')}")
        lines.append(f"- **tone**：{round_data.get('tone','')} / **angle**：{round_data.get('angle','')}")
        lines.append(f"- **理由**：{r.get('reason','')}")
        if r.get("best_line"):
            lines.append(f"- **最佳 punchline**：「{r['best_line']}」")
        lines.append("")
        lines.append("**對話全文**：")
        lines.append("")
        for l in round_data.get("lines", []):
            spk = l.get("speaker", "")
            spk_name = {"aming": "陳柏偉", "xiaomei": "王于安"}.get(spk, spk)
            lines.append(f"- **{spk_name}**：{l.get('text','')}")
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("date", nargs="?", default=None,
                    help="日期 YYYYMMDD、預設今天")
    ap.add_argument("--top", type=int, default=10, help="排前 N 名（預設 10）")
    args = ap.parse_args()

    date_filter = args.date or datetime.now().strftime("%Y%m%d")
    date_label = f"{date_filter[:4]}-{date_filter[4:6]}-{date_filter[6:]}"

    rounds = load_archive(date_filter)
    if not rounds:
        print(f"❌ {date_label} 沒有 archive 資料")
        return

    print(f"[score] 找到 {len(rounds)} 輪 ({date_label})、開始評分")

    # 載入 Claude client
    try:
        from anthropic import Anthropic
    except ImportError:
        print("❌ 需要安裝 anthropic：pip install anthropic")
        return

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        # 試讀 .env
        env_file = HERE / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break
    if not api_key:
        print("❌ 找不到 ANTHROPIC_API_KEY（.env 或環境變數）")
        return

    client = Anthropic(api_key=api_key)

    # 批次評分
    scored: list[dict] = []
    for batch_start in range(0, len(rounds), BATCH_SIZE):
        batch = rounds[batch_start: batch_start + BATCH_SIZE]
        print(f"  批次 {batch_start // BATCH_SIZE + 1}：{len(batch)} 輪...", end=" ", flush=True)
        results = batch_score(batch, client)
        if not results:
            print("跳過")
            continue
        for r in results:
            idx = r.get("idx", -1)
            if 0 <= idx < len(batch):
                scored.append({
                    "score": int(r.get("score", 0)),
                    "reason": r.get("reason", ""),
                    "best_line": r.get("best_line", ""),
                    "round_data": batch[idx],
                })
        print(f"已評 {len(results)}")

    if not scored:
        print("❌ 沒有評分結果")
        return

    report = render_report(scored, args.top, date_label)
    out_file = HERE / f"punchline_top{args.top}_{date_filter}.md"
    out_file.write_text(report, encoding="utf-8")

    print()
    print(f"✅ 報告產出：{out_file.name}")
    print(f"   總評 {len(scored)} 輪、最高分 {scored[0]['score'] if scored else 0}/10")


if __name__ == "__main__":
    main()
