"""一次性 YouTube OAuth 授權工具。

用途：在「還沒剪任何 clip」時、先把 YT 上傳授權跑完、產生 youtube_token.json。
之後 run_shorts_pipeline / upload_yt 就能直接用、不會卡在授權。

第一次跑會打開瀏覽器、登入你要上傳的 YT 頻道、按「允許」即可。
（Google Cloud OAuth 若還在 Testing 模式、refresh token 7 天會失效、屆時重跑本工具。）

使用：
    python scripts/authorize_yt.py
"""
import io
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from shorts_lib import CREDENTIALS_FILE, TOKEN_FILE
from upload_yt import get_yt_service


def main():
    if not CREDENTIALS_FILE.exists():
        print(f"❌ 找不到 {CREDENTIALS_FILE.name}、請先放到專案根目錄")
        sys.exit(1)

    if TOKEN_FILE.exists():
        print(f"⚠️  已經有 {TOKEN_FILE.name}、看起來授權過了。")
        ans = input("要重新授權嗎？(y/N) ").strip().lower()
        if ans != "y":
            print("取消、沿用現有 token。")
            return
        TOKEN_FILE.unlink()
        print("已刪舊 token、重跑授權…")

    print("開瀏覽器授權中… 請登入你要上傳的 YouTube 頻道、按「允許」。")
    yt = get_yt_service()

    # 抓一下頻道名稱、確認授權到正確帳號
    try:
        resp = yt.channels().list(part="snippet", mine=True).execute()
        items = resp.get("items", [])
        if items:
            name = items[0]["snippet"]["title"]
            print(f"✓ 授權成功、頻道：{name}")
        else:
            print("✓ 授權成功（但抓不到頻道資訊、可能此帳號沒有 YT 頻道）")
    except Exception as e:
        print(f"✓ token 已存、但查頻道失敗（不影響上傳）：{e}")

    print(f"✓ token 已存到 {TOKEN_FILE.name}、之後 pipeline 會自動沿用。")


if __name__ == "__main__":
    main()
