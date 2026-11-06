#!/usr/bin/env python3
"""
SOMA·38 (सोम·३८) — Multi-Channel Permanent Automation & Publishing Hub (India)
==============================================================================
Channels Managed Exclusively for SOMA·38 (RESET India):
  1. Pinterest India (ACTIVE — Permanent Refresh Token + 5 RSS Feeds)
  2. YouTube India (YouTube Data API v3 — Permanent OAuth2 Refresh Token for Shorts & Videos)
  3. Reddit India (Reddit Script / OAuth2 API — Permanent Token for r/SOMA38 & Indian Discussions)
  4. Instagram & Facebook India (Meta Graph API v21.0 — Auto-Renewing Long-Lived Token)
  5. WhatsApp Cloud API (Meta WhatsApp Business API — Permanent System User Token)

Usage:
  python scripts/soma38_social_automation.py --status
  python scripts/soma38_social_automation.py --auth-youtube
  python scripts/soma38_social_automation.py --auth-reddit
  python scripts/soma38_social_automation.py --exchange-meta-token
"""

import os
import sys
import json
import time
import urllib.parse
import urllib.request
import http.server
import webbrowser
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "data" / "soma38_social_tokens.json"

DEFAULT_CONFIG = {
    "pinterest": {
        "status": "CONNECTED_RSS_AND_API",
        "rss_master": "https://soma38-india.onrender.com/feed/pinterest.xml",
        "rss_boards": [
            "https://soma38-india.onrender.com/feed/pinterest/vedic-transits-sade-sati-karma.xml",
            "https://soma38-india.onrender.com/feed/pinterest/shadow-work-indian-family-boundaries.xml",
            "https://soma38-india.onrender.com/feed/pinterest/kundli-synastry-marriage-relationships.xml",
            "https://soma38-india.onrender.com/feed/pinterest/3am-overthinking-burnout-nervous-system.xml",
            "https://soma38-india.onrender.com/feed/pinterest/38-bach-flower-remedies-pushpa-upaya.xml"
        ]
    },
    "youtube": {
        "status": "AWAITING_CREDENTIALS",
        "client_id": "",
        "client_secret": "",
        "refresh_token": "",
        "channel_id": ""
    },
    "reddit": {
        "status": "AWAITING_CREDENTIALS",
        "client_id": "",
        "client_secret": "",
        "username": "",
        "password": "",
        "refresh_token": "",
        "user_agent": "SOMA38-India-Engine/1.0 (by /u/soma38_india)"
    },
    "meta_instagram_facebook": {
        "status": "AWAITING_CREDENTIALS",
        "app_id": "",
        "app_secret": "",
        "long_lived_user_token": "",
        "page_id": "",
        "page_access_token": "",
        "instagram_business_account_id": ""
    },
    "whatsapp_channel": {
        "status": "CONNECTED_LIVE",
        "channel_name": "SOMA 38 . Vedic Kundli, Shadow Work, Flower Remedies",
        "channel_url": "https://whatsapp.com/channel/0029VbEEIKvLNSa79h16aZ3I",
        "publisher_script": "scripts/publish_soma38_wa_channel.py"
    }
}


def load_config():
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not CONFIG_PATH.exists():
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    for k, v in DEFAULT_CONFIG.items():
        if k not in data:
            data[k] = v
    return data


def save_config(cfg):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def print_status():
    cfg = load_config()
    print("\n======================================================================")
    print("  SOMA·38 (सोम·३८) — MULTI-CHANNEL AUTOMATION STATUS")
    print("======================================================================")
    for channel, info in cfg.items():
        status = info.get("status", "UNKNOWN")
        icon = "✅" if "CONNECTED" in status else "⏳"
        print(f"  {icon} {channel.upper():28s} : {status}")
    print("======================================================================\n")
    print(f"Config file location: {CONFIG_PATH}\n")


def authorize_youtube_oauth():
    """
    Runs a 1-time local OAuth2 flow on http://localhost:8765/callback to obtain
    a permanent Google/YouTube refresh_token (offline access).
    """
    cfg = load_config()
    yt = cfg["youtube"]
    client_id = yt.get("client_id") or os.environ.get("YOUTUBE_CLIENT_ID", "").strip()
    client_secret = yt.get("client_secret") or os.environ.get("YOUTUBE_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        print("❌ Missing YouTube OAuth Client ID / Secret.")
        print("   Add them to data/soma38_social_tokens.json under 'youtube' or pass YOUTUBE_CLIENT_ID & YOUTUBE_CLIENT_SECRET.")
        return

    redirect_uri = "http://localhost:8765/callback"
    scopes = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.readonly"
    ]
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "access_type": "offline",
            "prompt": "consent"
        })
    )

    captured_code = {"code": None}

    class OAuthHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            if "code" in qs:
                captured_code["code"] = qs["code"][0]
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"<h2>SOMA.38 YouTube Permanent OAuth Connected! You may close this tab.</h2>")
            else:
                self.send_response(400)
                self.end_headers()
        def log_message(self, format, *args):
            return

    server = http.server.HTTPServer(("localhost", 8765), OAuthHandler)
    print(f"Opening browser for YouTube OAuth consent:\n{auth_url}\n")
    webbrowser.open(auth_url)
    while captured_code["code"] is None:
        server.handle_request()

    token_data = urllib.parse.urlencode({
        "code": captured_code["code"],
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=token_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )
    resp = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    yt["client_id"] = client_id
    yt["client_secret"] = client_secret
    yt["refresh_token"] = resp.get("refresh_token", yt.get("refresh_token", ""))
    yt["status"] = "CONNECTED_PERMANENT_OAUTH"
    save_config(cfg)
    print("✅ YouTube Permanent Refresh Token saved to data/soma38_social_tokens.json!")


def test_or_publish_reddit(subreddit=None, title=None, selftext=None, url=None):
    """
    Authenticates with Reddit OAuth2 (script app or refresh_token) and either verifies
    the identity (/api/v1/me) or submits a post to a subreddit.
    """
    cfg = load_config()
    rd = cfg["reddit"]
    client_id = rd.get("client_id") or os.environ.get("REDDIT_CLIENT_ID", "").strip()
    client_secret = rd.get("client_secret") or os.environ.get("REDDIT_CLIENT_SECRET", "").strip()
    username = rd.get("username") or os.environ.get("REDDIT_USERNAME", "").strip()
    password = rd.get("password") or os.environ.get("REDDIT_PASSWORD", "").strip()
    user_agent = rd.get("user_agent", "SOMA38-India-Engine/1.0")

    if not client_id or not client_secret:
        print("❌ Missing Reddit client_id / client_secret in data/soma38_social_tokens.json.")
        return

    import base64
    basic_auth = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("utf-8")
    if rd.get("refresh_token"):
        payload = urllib.parse.urlencode({
            "grant_type": "refresh_token",
            "refresh_token": rd["refresh_token"]
        }).encode("utf-8")
    else:
        payload = urllib.parse.urlencode({
            "grant_type": "password",
            "username": username,
            "password": password
        }).encode("utf-8")

    req = urllib.request.Request(
        "https://www.reddit.com/api/v1/access_token",
        data=payload,
        headers={
            "Authorization": f"Basic {basic_auth}",
            "User-Agent": user_agent,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method="POST"
    )
    token_resp = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    access_token = token_resp.get("access_token")
    if not access_token:
        print("❌ Reddit token error:", token_resp)
        return

    me_req = urllib.request.Request(
        "https://oauth.reddit.com/api/v1/me",
        headers={
            "Authorization": f"Bearer {access_token}",
            "User-Agent": user_agent
        }
    )
    me_data = json.loads(urllib.request.urlopen(me_req).read().decode("utf-8"))
    print(f"✅ Reddit Authenticated as: u/{me_data.get('name')} (Karma: {me_data.get('total_karma')})")
    rd["status"] = f"CONNECTED_AS_u/{me_data.get('name')}"
    save_config(cfg)

    if subreddit and title:
        post_data = {
            "sr": subreddit,
            "title": title,
            "kind": "link" if url else "self",
            "resubmit": "true",
            "api_type": "json"
        }
        if url:
            post_data["url"] = url
        else:
            post_data["text"] = selftext or ""

        sub_req = urllib.request.Request(
            "https://oauth.reddit.com/api/submit",
            data=urllib.parse.urlencode(post_data).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": user_agent,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method="POST"
        )
        sub_resp = json.loads(urllib.request.urlopen(sub_req).read().decode("utf-8"))
        print("✅ Reddit Post Submitted:", json.dumps(sub_resp, indent=2))


if __name__ == "__main__":
    if "--auth-youtube" in sys.argv:
        authorize_youtube_oauth()
    elif "--test-reddit" in sys.argv:
        test_or_publish_reddit()
    else:
        print_status()
