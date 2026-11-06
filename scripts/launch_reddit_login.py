#!/usr/bin/env python3
"""
Launch a dedicated Chrome window for SOMA·38 Reddit login.
Saves session permanently in data/soma38_reddit_profile so Playwright
can automate posts, comments, and community management with zero API limits.
"""

import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

USER_DIR = r"C:\Users\bpupp\Downloads\Antigravity\Companies\data\soma38_reddit_profile"

print("==================================================================")
print("  LAUNCHING CHROME FOR SOMA·38 REDDIT LOGIN")
print("==================================================================")
print("1. Log in to Reddit in the window that just opened.")
print("2. Once logged in, you can close the browser window (or leave it).")
print("==================================================================")

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir=USER_DIR,
        channel="chrome",
        headless=False,
        viewport={"width": 1280, "height": 800},
        args=["--disable-blink-features=AutomationControlled"]
    )
    page = ctx.new_page()
    page.goto("https://www.reddit.com/login", timeout=60000)
    print("Browser opened to https://www.reddit.com/login.")
    print("Waiting for you to log in... (Checking every 5s)")

    while True:
        time.sleep(5)
        try:
            # Check if logged in by looking for user avatar, username element, or /user/ link
            is_logged_in = page.locator("a[href*='/user/'], button[id*='USER_DROPDOWN'], #user-drawer-button, faceplate-tracker[source='profile']").count() > 0
            current_url = page.url
            if is_logged_in or ("login" not in current_url and "register" not in current_url and "reddit.com" in current_url):
                print(f"✅ Successfully logged in! Current URL: {current_url}")
                page.screenshot(path=r"C:\Users\bpupp\.gemini\antigravity\brain\de274ffa-3ffc-49ad-9ba6-8134f7300dd0\soma38_reddit_logged_in.png")
                time.sleep(4)
                break
        except Exception:
            # Browser was manually closed by user
            break

    print("Session saved in soma38_reddit_profile!")
    ctx.close()
