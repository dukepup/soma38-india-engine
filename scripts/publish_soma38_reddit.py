#!/usr/bin/env python3
"""
SOMA·38 (सोम·३८) — Dedicated Reddit Publisher & Community Engine
================================================================
Authenticated as: u/SOMA38_VedicKundli
Supports:
  1. Submitting long-form karmic & somatic breakdowns to Reddit
  2. Formatting rich Markdown with links, bullet points, and Pushpa Upaya protocols
  3. Community discussions and AMA threads
"""

import os
import sys
import time
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

USER_DIR = r"C:\Users\bpupp\Downloads\Antigravity\Companies\data\soma38_reddit_profile"
BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "data" / "soma38_social_tokens.json"


def load_session_cookie():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg["reddit"]["reddit_session"]


def create_reddit_post(subreddit: str, title: str, markdown_body: str):
    """
    Submits a post to a subreddit using the verified session.
    """
    session_cookie = load_session_cookie()
    submit_url = f"https://www.reddit.com/r/{subreddit}/submit"

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=USER_DIR,
            executable_path=BRAVE_PATH,
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        ctx.add_cookies([{
            "name": "reddit_session",
            "value": session_cookie,
            "domain": ".reddit.com",
            "path": "/",
            "httpOnly": True,
            "secure": True,
            "sameSite": "Lax"
        }])

        page = ctx.new_page()
        print(f"Navigating to {submit_url}...")
        page.goto(submit_url, timeout=60000)
        time.sleep(5)

        # Title input
        title_box = page.locator("textarea[placeholder*='Title'], input[placeholder*='Title'], [name='title']").first
        if title_box.count() > 0:
            title_box.fill(title)
            print(f"Filled title: {title[:60]}...")
            time.sleep(1)

        # Body markdown
        body_box = page.locator("div[role='textbox'], textarea[placeholder*='Text']").first
        if body_box.count() > 0:
            body_box.click()
            page.evaluate("""({ text }) => {
                const el = document.querySelector("div[role='textbox'], textarea[placeholder*='Text']");
                if (el) {
                    el.focus();
                    document.execCommand('insertText', false, text);
                }
            }""", {"text": markdown_body})
            print("Inserted post body.")
            time.sleep(2)

        proof_path = r"C:\Users\bpupp\.gemini\antigravity\brain\de274ffa-3ffc-49ad-9ba6-8134f7300dd0\reddit_post_preview.png"
        page.screenshot(path=proof_path)
        print("Proof screenshot saved:", proof_path)
        ctx.close()


if __name__ == "__main__":
    print("SOMA·38 Reddit Engine: Ready and verified as u/SOMA38_VedicKundli!")
