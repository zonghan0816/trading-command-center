"""Phase 4 Step 5.29: YT Shorts 上傳（**privacyStatus=private** 由你 YT Studio 手動公開）。

第一次跑會打開瀏覽器要 OAuth 授權、之後 refresh token 自動續期。
Testing 模式下 refresh token 7 天會失效、要重跑授權。

使用：
    python scripts/upload_yt.py <clip_uid>
    （uid 從 round_uid() 算、自動找 .mp4 + .json + .jpg）

或從 pipeline 呼叫：
    upload_clip(uid)
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
from shorts_lib import (
    CREDENTIALS_FILE, TOKEN_FILE,
    clip_path, metadata_path, thumbnail_path,
)

YT_SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]
YT_CATEGORY_NEWS_POLITICS = "25"   # YT category ID for 新聞與政治


def get_yt_service():
    """OAuth 流程：第一次跑 browser flow、之後讀 cached token 自動 refresh。"""
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError:
        raise RuntimeError(
            "缺套件：pip install google-auth-oauthlib google-api-python-client"
        )

    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), YT_SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"[yt] refresh token 失效（{e}）、重跑 OAuth")
                creds = None
        if not creds:
            if not CREDENTIALS_FILE.exists():
                raise RuntimeError(
                    f"找不到 {CREDENTIALS_FILE.name}、請到 Google Cloud 下載 OAuth JSON 放專案根目錄"
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), YT_SCOPES
            )
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
        print(f"[yt] token 存到 {TOKEN_FILE.name}")
    return build("youtube", "v3", credentials=creds)


def upload_clip(uid: str) -> dict | None:
    """上傳 clip + thumbnail、回 dict {video_id, url}、失敗回 None。"""
    clip = clip_path(uid)
    meta_file = metadata_path(clip)
    thumb = thumbnail_path(clip)

    if not clip.exists():
        print(f"[yt] clip 不存在：{clip}")
        return None
    if not meta_file.exists():
        print(f"[yt] metadata 不存在：{meta_file}")
        return None
    meta = json.loads(meta_file.read_text(encoding="utf-8"))

    try:
        from googleapiclient.http import MediaFileUpload
    except ImportError:
        raise RuntimeError(
            "缺套件：pip install google-api-python-client"
        )

    yt = get_yt_service()

    # 1. 影片上傳（privacyStatus=private）
    body = {
        "snippet": {
            "title": meta.get("title", "")[:100],
            "description": meta.get("description", ""),
            "tags": meta.get("tags", []),
            "categoryId": YT_CATEGORY_NEWS_POLITICS,
            "defaultLanguage": "zh-Hant",
            "defaultAudioLanguage": "zh-Hant",
        },
        "status": {
            "privacyStatus": "private",
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(str(clip), chunksize=-1, resumable=True,
                            mimetype="video/mp4")
    print(f"[yt] 上傳中…（{clip.stat().st_size // 1024} KB）")
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        try:
            status, resp = req.next_chunk()
            if status:
                print(f"  進度 {int(status.progress() * 100)}%")
        except Exception as e:
            print(f"[yt] 上傳失敗：{e}")
            return None

    video_id = resp.get("id")
    print(f"[yt] ✓ 上傳完成：video_id={video_id}（私人）")

    # 2. 縮圖上傳（force-ssl scope）
    if thumb.exists():
        try:
            yt.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(thumb), mimetype="image/jpeg"),
            ).execute()
            print(f"[yt] ✓ 縮圖設好")
        except Exception as e:
            print(f"[yt] 縮圖失敗（影片仍可用）：{e}")

    url = f"https://youtube.com/shorts/{video_id}"
    return {
        "video_id": video_id,
        "url": url,
        "title": meta.get("title", ""),
        "privacy": "private",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("uid", help="round uid（從 round_uid() 算出）")
    args = ap.parse_args()
    result = upload_clip(args.uid)
    if result:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
