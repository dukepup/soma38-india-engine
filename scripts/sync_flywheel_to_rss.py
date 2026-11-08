#!/usr/bin/env python3
"""
Syncs the rendered 60% Epigrammatic Reflection Cards & 15% Carousels
into the Pinterest RSS ledger and scratch deployment folder.
"""

import shutil
import json
from pathlib import Path

BASE_DIR = Path(r"c:\Users\bpupp\Downloads\RESET\antigravity reset folder\RESET India\soma_india_engine")
SCRATCH_DIR = Path(r"C:\Users\bpupp\.gemini\antigravity\scratch\soma_india_engine")

# 1. Copy reflections and carousels to public/pins/ and scratch/public/pins/
for folder_name in ["reflections", "carousels"]:
    src_folder = BASE_DIR / "public" / folder_name
    dst_scratch = SCRATCH_DIR / "public" / folder_name
    dst_scratch.mkdir(parents=True, exist_ok=True)
    for jpg in src_folder.glob("*.jpg"):
        shutil.copy2(jpg, dst_scratch / jpg.name)
        shutil.copy2(jpg, BASE_DIR / "public" / "pins" / jpg.name)
        if (SCRATCH_DIR / "public" / "pins").exists():
            shutil.copy2(jpg, SCRATCH_DIR / "public" / "pins" / jpg.name)

# 2. Enrich pinterest_100_artistic_pins.json with the 4 Sovereign Reflection Cards at the top of the RSS feed
fw_path = BASE_DIR / "data" / "soma38_reflection_flywheel_ledger.json"
pins_path = BASE_DIR / "data" / "pinterest_100_artistic_pins.json"

with open(fw_path, "r", encoding="utf-8") as f:
    fw = json.load(f)

with open(pins_path, "r", encoding="utf-8") as f:
    pins = json.load(f)

existing_map = {p.get("pin_id"): p for p in pins}

BOARD_CYCLE = [
    ("Shadow Work & Indian Family Boundaries", "shadow-work-indian-family-boundaries", "Parivar Pressure, In-Laws & \"Log Kya Kahenge\""),
    ("Vedic Kundli, Sade Sati & Chandra Rashi", "vedic-kundli-sade-sati-chandra-rashi", "Vedic Transits, Sade Sati & Graha Karma"),
    ("Bach Flower Remedies (Pushpa Upaya)", "bach-flower-remedies-pushpa-upaya", "Body Stress, 3 AM Insomnia & Gut-Mind Blocks"),
    ("Marriage, Rishta & Relationship Synastry", "marriage-rishta-relationship-synastry", "Rishta Confusion, Heartbreak & Marriage Synastry")
]

updated = 0
for idx, refl in enumerate(fw.get("reflections", [])):
    pid = refl["id"]
    b_name, b_slug, cat = BOARD_CYCLE[idx % len(BOARD_CYCLE)]
    if pid in existing_map:
        p_obj = existing_map[pid]
        p_obj["pin_title"] = refl["title"]
        p_obj["hook_text"] = f"{refl['epigram_line1']} {refl['epigram_line2']}"
        p_obj["pin_description"] = refl["full_3_paragraph_caption"]
        p_obj["alt_text"] = f"SOMA 38 Sovereign Reflection: {refl['epigram_line1']} {refl['epigram_line2']}"
        updated += 1
    else:
        new_pin = {
            "pin_number": 101 + idx,
            "pin_id": pid,
            "post_id": f"post-refl-{idx+1:03d}",
            "slug": pid.replace("_", "-"),
            "category": cat,
            "board_name": b_name,
            "board_slug": b_slug,
            "pin_title": refl["title"],
            "hook_text": f"{refl['epigram_line1']} {refl['epigram_line2']}",
            "pin_description": refl["full_3_paragraph_caption"],
            "alt_text": f"SOMA 38 Sovereign Reflection: {refl['epigram_line1']} {refl['epigram_line2']}",
            "image_path": f"/pins/{pid}.jpg",
            "destination_path": f"/?ref={pid}",
            "tags": [
                "Vedic Kundli Jyotish",
                "Pushpa Upaya",
                "Bach Flower Remedies India",
                "Shadow Work India",
                "SOMA 38"
            ]
        }
        pins.insert(0, new_pin)
        updated += 1

with open(pins_path, "w", encoding="utf-8") as f:
    json.dump(pins, f, indent=2, ensure_ascii=False)

scratch_pins_path = SCRATCH_DIR / "data" / "pinterest_100_artistic_pins.json"
if scratch_pins_path.parent.exists():
    with open(scratch_pins_path, "w", encoding="utf-8") as f:
        json.dump(pins, f, indent=2, ensure_ascii=False)

print(f"Synced/updated {updated} Sovereign Reflection Cards in RSS feed ledger (Total pins: {len(pins)}).")
