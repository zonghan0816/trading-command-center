"""Phase 4 Step 5.29: Shorts 主編排器、串起評分 → 剪片 → metadata → thumbnail → 上傳。

行為：
1. 讀 archive（預設今天、可指定日期）
2. 用 Claude 批次評分
3. 取 top N（score >= threshold）
4. 過濾已處理過的（依 .processed.jsonl）
5. 每個 round：cut_clip → gen_metadata → gen_thumbnail → upload_yt
6. 上傳成功 → 寫進 .processed.jsonl

使用：
    python scripts/run_shorts_pipeline.py            # 今天、上限 5 支
    python scripts/run_shorts_pipeline.py --top 3    # 上限 3 支
    python scripts/run_shorts_pipeline.py --min-score 7 --top 5
    python scripts/run_shorts_pipeline.py --dry-run  # 只看會做啥、不真的執行
    python scripts/run_shorts_pipeline.py --skip-upload  # 剪 + metadata + thumb 但不上傳
"""
import argparse
import io
import json
import sys
from datetime import datetime
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from shorts_lib import (
    load_archive, load_api_key, round_uid, load_processed, mark_processed,
    load_score_cache, save_score_cache,
    OUTPUT_DIR, clip_path,
)

# 預設值（從 GPT 82 校準）
DEFAULT_TOP             = 5
DEFAULT_MIN_SCORE       = 6
SCORE_BATCH_SIZE        = 8
SCORE_MODEL             = "claude-haiku-4-5-20251001"

SCORING_PROMPT = """你是 YouTube Shorts 挑片編輯、從台灣政論嘴砲節目找爆點。

評分 1-10：
- 10 = zinger 句子能獨立爆紅
- 8-9 = 有 hook 有衝突有收尾
- 6-7 = 有亮點但需脈絡
- 4-5 = 普通
- 1-3 = 純分析

扣分：
- 涉及真實傷害（死傷/家屬）→ 強制 ≤ 3
- 政治指控個人 → ≤ 4

加分：
- 台語 / 網路梗自然
- 反差黑色幽默
- 鋪墊 + 爆 結構

輸出 JSON 陣列、不加 markdown：
[{"idx": 0, "score": 8, "reason": "..."}, ...]"""


def batch_score(rounds: list[dict], client) -> list[dict]:
    parts: list[str] = []
    for i, r in enumerate(rounds):
        lines_str = "\n".join(
            f"  {l.get('speaker','?')}: {l.get('text','')}"
            for l in r.get("lines", [])
        )
        parts.append(
            f"[idx={i}] topic={r.get('topic','')[:25]} | "
            f"tone={r.get('tone','')} angle={r.get('angle','')}\n{lines_str}"
        )
    full = SCORING_PROMPT + "\n\n以下 " + str(len(rounds)) + " 輪：\n\n" + "\n\n".join(parts)
    msg = client.messages.create(
        model=SCORE_MODEL, max_tokens=2000,
        messages=[{"role": "user", "content": full}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  ⚠ JSON 解析失敗：{e}")
        return []


def score_archive(rounds: list[dict]) -> list[dict]:
    """評 archive、回傳 [{score, reason, round_data}]。評過的（依 uid）讀快取、不重評省 API。"""
    cache = load_score_cache()
    scored: list[dict] = []
    to_score: list[dict] = []

    # 先把快取裡有的撈出來、其餘排進待評
    for r in rounds:
        uid = round_uid(r)
        if uid in cache:
            scored.append({
                "score": int(cache[uid].get("score", 0)),
                "reason": cache[uid].get("reason", ""),
                "round_data": r,
            })
        else:
            to_score.append(r)

    if scored:
        print(f"  快取命中 {len(scored)} 輪、不重評")
    if not to_score:
        return scored

    from anthropic import Anthropic
    client = Anthropic(api_key=load_api_key())
    for start in range(0, len(to_score), SCORE_BATCH_SIZE):
        batch = to_score[start: start + SCORE_BATCH_SIZE]
        print(f"  批次 {start // SCORE_BATCH_SIZE + 1}：{len(batch)} 輪", end=" ", flush=True)
        results = batch_score(batch, client)
        for r in results:
            idx = r.get("idx", -1)
            if 0 <= idx < len(batch):
                score = int(r.get("score", 0))
                reason = r.get("reason", "")
                scored.append({
                    "score": score,
                    "reason": reason,
                    "round_data": batch[idx],
                })
                cache[round_uid(batch[idx])] = {"score": score, "reason": reason}
        print(f"OK ({len(results)})")

    save_score_cache(cache)
    return scored


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=None,
                    help="日期 YYYYMMDD、預設今天")
    ap.add_argument("--top", type=int, default=DEFAULT_TOP,
                    help=f"上限支數（預設 {DEFAULT_TOP}、YT API quota 每天 ~6 支）")
    ap.add_argument("--min-score", type=int, default=DEFAULT_MIN_SCORE,
                    help=f"最低分（預設 {DEFAULT_MIN_SCORE}/10）")
    ap.add_argument("--dry-run", action="store_true",
                    help="只看會做啥、不真執行")
    ap.add_argument("--skip-upload", action="store_true",
                    help="剪片 + metadata + thumb 但不上傳 YT")
    args = ap.parse_args()

    date_filter = args.date or datetime.now().strftime("%Y%m%d")
    print(f"[pipeline] 開始 {date_filter}、上限 {args.top} 支、最低 {args.min_score} 分")

    rounds = load_archive(date_filter)
    if not rounds:
        print(f"[pipeline] {date_filter} archive 空、確認 server.py 有跑 + 對話有生")
        return
    print(f"[pipeline] archive 找到 {len(rounds)} 輪")

    processed = load_processed()
    fresh = [r for r in rounds if round_uid(r) not in processed]
    print(f"[pipeline] 已處理 {len(processed)} 個 uid、待選 {len(fresh)} 輪")
    if not fresh:
        print("[pipeline] 沒有新輪可處理、收工")
        return

    print("[pipeline] 評分中…")
    scored = score_archive(fresh)
    scored.sort(key=lambda x: x["score"], reverse=True)
    qualified = [s for s in scored if s["score"] >= args.min_score][: args.top]
    print(f"[pipeline] 符合分數 {len(qualified)} 輪、分數："
          f"{[s['score'] for s in qualified]}")
    if not qualified:
        print("[pipeline] 沒輪達標、收工")
        return

    if args.dry_run:
        print("\n[dry-run] 不執行、僅列出：")
        for i, s in enumerate(qualified, 1):
            print(f"  #{i} [{s['score']}/10] {s['round_data']['topic'][:40]}")
            print(f"      理由：{s['reason']}")
        return

    # 動態 import 避免空轉時也要載 ffmpeg/pillow
    from cut_clip import cut_clip_for
    from gen_metadata import gen_metadata_for
    from gen_thumbnail import gen_thumbnail_for

    success: list[dict] = []
    for i, s in enumerate(qualified, 1):
        round_data = s["round_data"]
        uid = round_uid(round_data)
        print(f"\n[pipeline] === #{i}/{len(qualified)} [{s['score']}/10] "
              f"{round_data['topic'][:30]} ===")

        clip = cut_clip_for(round_data)
        if not clip:
            print(f"  cut 失敗、跳")
            continue

        meta_file = gen_metadata_for(round_data)
        if not meta_file:
            print(f"  metadata 失敗、跳")
            continue

        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        thumb = gen_thumbnail_for(round_data, title_text=meta.get("title", "")[:12])
        # thumb 失敗不擋、可上傳無自訂縮圖

        if args.skip_upload:
            print(f"  --skip-upload、不上傳")
            success.append({"uid": uid, "title": meta.get("title", ""), "skipped_upload": True})
            mark_processed(uid, score=s["score"], reason=s["reason"], skipped_upload=True)
            continue

        from upload_yt import upload_clip
        result = upload_clip(uid)
        if not result:
            print(f"  上傳失敗")
            continue

        mark_processed(uid, score=s["score"], reason=s["reason"], **result)
        success.append({"uid": uid, **result})

    print(f"\n[pipeline] === 完成 ===")
    print(f"成功 {len(success)} / {len(qualified)} 支")
    for s in success:
        title = s.get("title", "")[:40]
        url   = s.get("url", "(skipped upload)")
        print(f"  ✓ {title} → {url}")


if __name__ == "__main__":
    main()
