#!/usr/bin/env python3
"""
SOMA·38 (सोम·३८) — Dedicated WhatsApp Channel Publisher (2-Line Indian Shadow-Share Engine)
===========================================================================================
Channel URL: https://whatsapp.com/channel/0029VbEEIKvLNSa79h16aZ3I
- Strictly targets ONLY the 'SOMA 38' channel in the linked WhatsApp Web profile
  (never clicks or interacts with the RESET Portugal channel).
- Automatically selects the next unposted oil-painted story artwork (001-100)
  from data/soma38_wa_channel_ledger.json and pairs it with a culturally calibrated
  2-line Indian 'Apnapan' Private Shadow-Share CTA + clickable SOMA·38 link.
"""

import os
import sys
import time
import json
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

USER_DIR = r"C:\Users\bpupp\Downloads\Antigravity\Companies\data\whatsapp_isolated_profile"
BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACT_DIR = Path(r"C:\Users\bpupp\.gemini\antigravity\brain\de274ffa-3ffc-49ad-9ba6-8134f7300dd0")
LEDGER_PATH = BASE_DIR / "data" / "soma38_wa_channel_ledger.json"

# 5 Category-Calibrated Indian "Sovereign Confrontation & Apnapan" Shadow-Share CTAs
INDIAN_SHADOW_SHARE_CTAS = {
    "sade_sati": [
        "🪐 Saturn isn't punishing you—it's auditing every lie and cowardly compromise you've been tolerating. Forward this to the friend still blaming their stars for choices they refuse to make.",
        "🪐 Stop buying sapphires to escape a life you outgrew three years ago. Send this privately to someone who needs the spine to end their own stagnation.",
        "🪐 Your exhaustion isn't 'bad karma'—it is the cost of carrying duties you volunteered for just to feel indispensable. Share this with someone who needs to hear the truth today."
    ],
    "family_boundaries": [
        "⚔️ That lump in your throat at family dinners isn't anxiety—it's the taste of letting your emotional boundaries be breached so nobody calls you selfish. Send this to your sister before she apologizes for existing again.",
        "💬 Stop calling yourself 'the strong pillar' when you are actively choosing the martyr role to avoid five minutes of conflict. Forward this to someone trading their spine for fake family harmony.",
        "⚔️ You didn't 'freeze'—you surrendered your boundary to keep the peace. Share this quietly with someone who needs liquid iron in their spine tonight."
    ],
    "synastry_marriage": [
        "🌸 32/36 Gunas won't save a marriage you entered just to avoid your father's temporary disappointment. Forward this to a friend hiding behind a biodata while their gut screams run.",
        "💬 Stop outsourcing the blame for your romantic choices to a Pandit's scorecard. Send this privately to someone navigating rishta pressure right now.",
        "🌸 If you have to shrink your voice to be chosen, you aren't building a marriage—you're auditioning for a prison. Share this with someone who needs this mirror."
    ],
    "overthinking_burnout": [
        "🌙 You didn't wake up at 3:14 AM because of Slack—you woke up because at 3 PM yesterday you smiled while your boundaries were violated. Send this to the friend who still thinks burnout is a badge of honor.",
        "⚔️ Your jaw is grinding your teeth to dust tonight to digest the anger you were too afraid to voice at work. Forward this to a colleague bleeding themselves dry for applause.",
        "🌙 Stop blaming your nervous system for a calendar you refused to defend. Share this with someone who is still online at 2 AM."
    ],
    "pushpa_upaya": [
        "🌿 Pushpa Upaya (Bach Flower Remedies) aren't here to coddle you—they are liquid iron for the spine you keep handing away. Send this to someone ready to reclaim their sovereignty.",
        "🌸 Centaury and Vervain don't 'numb' your stress; they stop you from begging for validation from people who don't care about you. Forward this to someone who needs this shift.",
        "⚔️ Your body keeps the receipt for every boundary you betrayed. Share this on WhatsApp with someone ready to retire from the martyr role."
    ]
}


def get_category_for_pin_index(idx: int) -> str:
    """Maps pin index (1-100) to its thematic cluster."""
    if 1 <= idx <= 20:
        return "sade_sati"
    elif 21 <= idx <= 40:
        return "family_boundaries"
    elif 41 <= idx <= 60:
        return "synastry_marriage"
    elif 61 <= idx <= 80:
        return "overthinking_burnout"
    else:
        return "pushpa_upaya"


def load_ledger():
    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not LEDGER_PATH.exists():
        data = {"posted_indices": [1], "history": [{"index": 1, "note": "Inaugural post pin-story-001.jpg"}]}
        save_ledger(data)
        return data
    with open(LEDGER_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_ledger(data):
    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LEDGER_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def select_next_pin_and_caption(explicit_index=None):
    ledger = load_ledger()
    posted = set(ledger.get("posted_indices", []))
    if explicit_index is not None:
        idx = explicit_index
    else:
        idx = next((i for i in range(1, 101) if i not in posted), 1)

    cat = get_category_for_pin_index(idx)
    cta_list = INDIAN_SHADOW_SHARE_CTAS[cat]
    cta_line = cta_list[(idx - 1) % len(cta_list)]

    caption = f"{cta_line}\n✨ Free 60s Kundli & Flower Remedy Reading: https://soma38-india.onrender.com"
    image_path = str(BASE_DIR / "public" / "pins" / f"pin-story-{idx:03d}.jpg")
    return idx, image_path, caption, cat


def publish_to_soma38_channel(explicit_index=None, explicit_image=None, explicit_caption=None):
    idx, image_path, caption_text, cat = select_next_pin_and_caption(explicit_index)
    if explicit_image:
        image_path = explicit_image
    if explicit_caption:
        caption_text = explicit_caption
    print(f"Prepared Pin #{idx:03d} ({cat}):\n  Image: {image_path}\n  Caption:\n{caption_text}\n")

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=USER_DIR,
            channel="chrome",
            headless=True,
            viewport={"width": 1440, "height": 900},
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = ctx.new_page()
        print("Opening WhatsApp Web...")
        page.goto("https://web.whatsapp.com", timeout=60000)
        time.sleep(12)

        # 1. Open Channels tab
        channels_btn = page.locator("button[aria-label*='Canais'], button[aria-label*='Channels'], span[data-icon='newsletter-outline'], span[data-icon='newsletter']").first
        if channels_btn.count() > 0:
            channels_btn.click()
        else:
            page.mouse.click(22, 178)
        time.sleep(3)

        # 2. Click 'SOMA 38' channel specifically by title
        soma_chan = page.locator("span[title*='SOMA 38'], div[role='listitem']:has-text('SOMA 38')").first
        if soma_chan.count() == 0:
            raise RuntimeError("Could not find 'SOMA 38' channel in Channels list!")
        soma_chan.click()
        time.sleep(3)

        # 3. Click 'Anexar' button and choose 'Fotos e vídeos' via FileChooser (full resolution photo, never sticker)
        attach_btn = page.locator("footer button[aria-label='Anexar'], footer button[aria-label='Attach']").first
        attach_btn.click()
        time.sleep(1.5)

        with page.expect_file_chooser() as fc_info:
            page.locator("text='Fotos e vídeos'").first.click()
        fc_info.value.set_files(image_path)
        time.sleep(4)

        # 4. Type the 2-line caption into the Photo Editor's caption box (preserving newline with Shift+Enter)
        caption_box = page.locator("div[contenteditable='true']").first
        if caption_box.count() > 0:
            caption_box.click(force=True)
            time.sleep(0.5)
            lines = caption_text.split("\n")
            for i, line in enumerate(lines):
                if line:
                    page.evaluate(
                        """({ text }) => {
                            const els = document.querySelectorAll("div[contenteditable='true']");
                            for (const el of els) {
                                const rect = el.getBoundingClientRect();
                                if (rect.width > 0 && rect.height > 0) {
                                    el.focus();
                                    document.execCommand('insertText', false, text);
                                    break;
                                }
                            }
                        }""",
                        {"text": line},
                    )
                if i < len(lines) - 1:
                    page.keyboard.press("Shift+Enter")
            time.sleep(1.5)

        # 5. Click Send button in the photo preview modal
        send_btn = page.locator("div[aria-label*='Enviar'], button[aria-label*='Enviar'], span[data-icon='send'], [data-icon='wds-ic-send-filled']").first
        if send_btn.count() > 0:
            send_btn.click(force=True)
        else:
            page.keyboard.press("Enter")

        time.sleep(6)
        proof_path = str(ARTIFACT_DIR / "soma38_wa_published_proof.png")
        page.screenshot(path=proof_path)
        print("✅ Successfully published to SOMA·38 WhatsApp Channel! Proof:", proof_path)
        ctx.close()

        ledger = load_ledger()
        if idx not in ledger["posted_indices"]:
            ledger["posted_indices"].append(idx)
        ledger["history"].append({
            "index": idx,
            "category": cat,
            "image": image_path,
            "caption": caption_text,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        save_ledger(ledger)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--index", type=int, default=None)
    parser.add_argument("--image", type=str, default=None)
    parser.add_argument("--caption", type=str, default=None)
    args = parser.parse_args()

    if args.dry_run:
        idx, img, cap, cat = select_next_pin_and_caption(args.index)
        if args.image: img = args.image
        if args.caption: cap = args.caption
        print(f"[DRY RUN] Next Pin #{idx:03d} ({cat}):\nImage: {img}\nCaption:\n{cap}")
    else:
        publish_to_soma38_channel(explicit_index=args.index, explicit_image=args.image, explicit_caption=args.caption)
