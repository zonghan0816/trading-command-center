"""Phase 4 Step 5.29: Claude 生 YT Shorts 標題 / 描述 / hashtags。

從 archive 對話 lines + topic、Claude 生：
- title（≤ 60 字、有 hook、夾「AI 主持人」吸睛字眼）
- description（含節目介紹 + CTA）
- tags（5-8 個、繁中 + 英文混用）
"""
import argparse
import io
import json
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from shorts_lib import load_api_key, metadata_path, clip_path, round_uid

MODEL = "claude-haiku-4-5-20251001"

PROMPT_TEMPLATE = """你是 YouTube Shorts 標題編輯、專門替「天天嘴台灣 TDT」AI 政論直播剪片寫吸睛 metadata。

頻道定位：兩個 AI 主持人「陳柏偉」（3Q 陳柏惟風）+「王于安」（王乃伃風）24/7 嘴台灣即時新聞、純 AI 生成。

輸入：1 輪對話 + topic。

輸出**純 JSON**、不要 code fence、結構：
{{
  "title": "≤ 50 字繁中、有 hook、必須含「AI 主持人」或「AI」字眼、結尾不加 hashtag",
  "description": "150-250 字繁中、開頭 1 句描述梗、中段 1 行頻道介紹、結尾 CTA「訂閱 + 看 24H 直播」、含 6-8 個 hashtag",
  "tags": ["5-8 個 tag、混繁中英文、不加 # 符號"]
}}

標題規則：
- ❌ 不要：「驚！」「太扯！」這類農場開頭
- ❌ 不要：寫超過 50 字
- ✅ 要：用反差 / 引述 punchline / 反問
- ✅ 範例：「AI 主持人嘴吳乃仁拘提案：『辦案人員上午到、人不在家、媽呀這也太巧』」
- ✅ 範例：「缺牙 14 顆會失智？AI 主持人冷嗆：『我爸 20 年沒變海綿腦』」

描述結尾 hashtag 固定包含：
#天天嘴台灣 #TDT #AI主持人 #24H直播 #台灣新聞

---

topic: {topic}
tone: {tone}
angle: {angle}

對話：
{dialogue_text}

請出 JSON。"""


def generate(round_data: dict) -> dict:
    """call Claude 出 title/description/tags、回 dict。"""
    try:
        from anthropic import Anthropic
    except ImportError:
        raise RuntimeError("pip install anthropic")

    client = Anthropic(api_key=load_api_key())
    lines_text = "\n".join(
        f"  {('陳柏偉' if l.get('speaker')=='aming' else '王于安' if l.get('speaker')=='xiaomei' else l.get('speaker',''))}：{l.get('text','')}"
        for l in round_data.get("lines", [])
    )
    prompt = PROMPT_TEMPLATE.format(
        topic=round_data.get("topic", ""),
        tone=round_data.get("tone", ""),
        angle=round_data.get("angle", ""),
        dialogue_text=lines_text,
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return json.loads(raw)


def gen_metadata_for(round_data: dict) -> Path | None:
    """主入口：產 metadata、寫到 .json、回傳路徑。"""
    uid = round_uid(round_data)
    clip = clip_path(uid)
    out = metadata_path(clip)
    try:
        meta = generate(round_data)
    except Exception as e:
        print(f"[meta] Claude 生成失敗：{e}")
        return None
    out.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[meta] ✓ {out.name}")
    print(f"       title: {meta.get('title','')[:60]}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--archive-line", type=int, required=True,
                    help="archive 第幾行（0-based）")
    args = ap.parse_args()

    from shorts_lib import load_archive
    rounds = load_archive()
    if args.archive_line >= len(rounds):
        print(f"archive 只有 {len(rounds)} 行")
        return
    gen_metadata_for(rounds[args.archive_line])


if __name__ == "__main__":
    main()
