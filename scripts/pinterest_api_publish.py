"""
SOMA·38 (सोम·३८) Official Pinterest API v5 Publisher & Board Synchronizer
App ID: 1632513 (SOMA 38 Engine)

Note: Even when Pinterest Developer Trial API access is denied or pending,
SOMA·38 already auto-publishes via Native Pinterest Business RSS 2.0 Feeds:
  - https://inn-closest-coupons-flood.trycloudflare.com/feed/pinterest.xml
  - https://inn-closest-coupons-flood.trycloudflare.com/feed/pinterest/shadow-work-indian-family-boundaries.xml
  - https://inn-closest-coupons-flood.trycloudflare.com/feed/pinterest/vedic-kundli-sade-sati-chandra-rashi.xml
  - https://inn-closest-coupons-flood.trycloudflare.com/feed/pinterest/bach-flower-remedies-pushpa-upaya.xml
  - https://inn-closest-coupons-flood.trycloudflare.com/feed/pinterest/marriage-rishta-relationship-synastry.xml
"""

import os
import sys
import json
import base64
import argparse
import urllib.request
import urllib.error

PINTEREST_APP_ID = os.environ.get("PINTEREST_APP_ID", "1632513")
PINTEREST_ACCESS_TOKEN = os.environ.get("PINTEREST_ACCESS_TOKEN", "")
PINTEREST_API_BASE = os.environ.get("PINTEREST_API_BASE", "https://api.pinterest.com/v5")
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "https://inn-closest-coupons-flood.trycloudflare.com")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PINS_JSON_PATH = os.path.join(BASE_DIR, "data", "pinterest_100_pins.json")
LEDGER_PATH = os.path.join(BASE_DIR, "data", "pinterest_published_ledger.json")
PINS_DIR = os.path.join(BASE_DIR, "public", "pins")

BOARDS_SPEC = [
    {
        "name": "Shadow Work & Indian Family Boundaries",
        "slug": "shadow-work-indian-family-boundaries",
        "description": "Navigating parivar expectations, 'Log Kya Kahenge', energy drain (nazar), and corporate burnout in India with Gestalt shadow work and 38 natural Bach flower remedies."
    },
    {
        "name": "Vedic Kundli, Sade Sati & Chandra Rashi",
        "slug": "vedic-kundli-sade-sati-chandra-rashi",
        "description": "Psychological Vedic astrology, Shani Sade Sati resilience, Rahu-Ketu anxiety decoding, and Janma Chandra Rashi emotional balance without superstitious fear."
    },
    {
        "name": "Bach Flower Remedies (Pushpa Upaya)",
        "slug": "bach-flower-remedies-pushpa-upaya",
        "description": "38 gentle, natural botanical flower remedies (Pushpa Upaya) for ghabrahat, 3 AM insomnia, overthinking, exam stress, and nervous system grounding."
    },
    {
        "name": "Marriage, Rishta & Relationship Synastry",
        "slug": "marriage-rishta-relationship-synastry",
        "description": "Conscious relationship synastry, Kundli Milan beyond superficial points, healing heartbreak, and emotional clarity in arranged and modern Indian marriages."
    }
]

def api_request(method, endpoint, payload=None):
    if not PINTEREST_ACCESS_TOKEN:
        raise RuntimeError("PINTEREST_ACCESS_TOKEN environment variable is not set.")
    url = f"{PINTEREST_API_BASE.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {PINTEREST_ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} on {method} {url}: {err_body}")

def ensure_boards():
    existing = api_request("GET", "/boards")
    board_map = {b["name"]: b["id"] for b in existing.get("items", [])}
    for spec in BOARDS_SPEC:
        if spec["name"] not in board_map:
            created = api_request("POST", "/boards", {
                "name": spec["name"],
                "description": spec["description"],
                "privacy": "PUBLIC"
            })
            board_map[spec["name"]] = created["id"]
            print(f"[+] Created board: {spec['name']} (ID: {created['id']})")
        else:
            print(f"[=] Found board: {spec['name']} (ID: {board_map[spec['name']]})")
    return board_map

def publish_pins(limit=5, board_slug=None):
    with open(PINS_JSON_PATH, "r", encoding="utf-8") as f:
        pins = json.load(f)
    ledger = {}
    if os.path.exists(LEDGER_PATH):
        with open(LEDGER_PATH, "r", encoding="utf-8") as f:
            ledger = json.load(f)

    board_map = ensure_boards()
    count = 0
    for pin in pins:
        if board_slug and pin["board_slug"] != board_slug:
            continue
        if pin["pin_id"] in ledger:
            continue
        board_id = board_map.get(pin["board_name"])
        img_file = os.path.join(PINS_DIR, f"{pin['pin_id']}.jpg")
        with open(img_file, "rb") as imgf:
            b64_img = base64.b64encode(imgf.read()).decode("ascii")

        payload = {
            "board_id": board_id,
            "title": pin["pin_title"],
            "description": pin["pin_description"],
            "alt_text": pin["alt_text"],
            "link": f"{PUBLIC_BASE_URL.rstrip('/')}{pin['destination_path']}",
            "media_source": {
                "source_type": "image_base64",
                "content_type": "image/jpeg",
                "data": b64_img
            }
        }
        res = api_request("POST", "/pins", payload)
        ledger[pin["pin_id"]] = {"pinterest_id": res.get("id"), "slug": pin["slug"]}
        with open(LEDGER_PATH, "w", encoding="utf-8") as lf:
            json.dump(ledger, lf, indent=2)
        count += 1
        print(f"[+] Published {pin['pin_id']} -> Pinterest Pin ID {res.get('id')}")
        if count >= limit:
            break

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SOMA·38 Pinterest Publisher")
    parser.add_argument("--check-auth", action="store_true")
    parser.add_argument("--setup-boards", action="store_true")
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--board", type=str, default=None)
    args = parser.parse_args()

    if args.check_auth:
        print(json.dumps(api_request("GET", "/user_account"), indent=2))
    elif args.setup_boards:
        ensure_boards()
    elif args.publish:
        publish_pins(limit=args.limit, board_slug=args.board)
    else:
        parser.print_help()
