#!/usr/bin/env python3
"""
SOMA·38 — 5th-House Subversive Reel Generator (NYC Ephemeris Driven)
===================================================================
1. Casts a fresh astrological chart for New York City, NY at runtime.
2. Embodying the 5th house creative & disruptive forces, selects the tightest,
   most attention-grabbing planetary aspect (oppositions, squares, combustions, Lilith/Mars).
3. Drafts an electrifying, subversive Reel script and saves a growth brief.
4. Renders the vertical 9:16 Short with neural voice, kinetic gold captions, and oil-art motion.
"""

import os
import sys
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(r"c:\Users\bpupp\Downloads\RESET\antigravity reset folder\RESET India\soma_india_engine")
DATA_DIR = BASE_DIR / "data"
BRIEFS_DIR = DATA_DIR / "daily_growth_briefs"
BRIEFS_DIR.mkdir(parents=True, exist_ok=True)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def cast_live_nyc_chart():
    """Runs scripts/cast_nyc_chart.js to obtain current NYC ephemeris data."""
    print("⚡ [5TH-HOUSE AGENT] Casting live astrological chart for New York City, NY...")
    cmd = ["node", str(BASE_DIR / "scripts" / "cast_nyc_chart.js")]
    proc = subprocess.run(cmd, cwd=str(BASE_DIR), capture_output=True, text=True, check=True)
    chart_data = json.loads(proc.stdout)
    return chart_data


def generate_subversive_brief(chart: dict):
    """
    Synthesizes a 5th-house subversive growth brief embedding the 5-Step Sales Conversion Architecture:
    1. Pattern-Interrupt & Frame Trigger (Lower guard, Common Problem)
    2. The "Ammo" & Pain-Point Trigger (Probing symptom, Provoking cost of inaction, Future-State sizzle)
    3. Value-Equation Trigger (Outcome * Certainty > Cost * Risk; Ephemeris proof + Pushpa Upaya)
    4. Conviction & Silence Trigger (Cash-collection energy, A/B Presumptive choice, 'Investment' phrasing)
    5. Objection-Reframing Triggers (Price vs. Cost of Inaction)
    """
    h5 = chart["fifth_house_personality"]
    top_aspect = chart["primary_disruptive_aspect"]
    timestamp_slug = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    brief_id = f"brief_nyc_5th_house_{top_aspect['planet1'].lower()}_{top_aspect['aspect'].lower()}_{top_aspect['planet2'].lower()}_{timestamp_slug}"

    p1 = top_aspect["planet1"]
    p2 = top_aspect["planet2"]
    asp = top_aspect["aspect"]
    orb = top_aspect["orb"]

    # Calibrate astrological theme and sales triggers dynamically based on the primary aspect
    if p1 in ("Moon", "Mars") or p2 in ("Moon", "Mars"):
        # STEP 1: Pattern Interrupt & Common Problem
        hook_spoken = "Your sudden rage at the family dinner table wasn't a loss of control. Everyone in high-functioning homes has been asking why they feel like screaming the second they walk through their childhood door."
        hook_screen = "When The 'Good Person' Snaps ⚡"

        # STEP 2: The Ammo & Discovery (Probing -> Provoking -> Future State)
        bridge_spoken = (
            f"Under this live NYC transit, Moon in Sagittarius locks in an explosive {orb}-degree opposition with Mars in Gemini. "
            f"Why are you clenching your jaw at 2 AM? Because you spent years performing obedience and smiling through subtle disrespect. "
            f"What is the cost of keeping this mask on for another year? Your dignity slowly dissolving into silent exhaustion. "
            f"Picture walking into that same room with quiet spine and zero need to apologize for your boundaries."
        )

        # STEP 3: The Value Equation (Outcome x Certainty > Cost x Risk)
        remedy_spoken = (
            "In Pushpa Upaya, Holly and Impatiens are not gentle sedatives. They are liquid iron for your boundaries—"
            "clinical botanical catalysts that transmute volatile resentment into unshakeable self-command so you never betray yourself to fit in."
        )
        remedies = [
            {"name": "Holly", "hindi_name": "होली पुष्प (Holly)", "action": "Transmutes underground rage into clear sovereign dignity."},
            {"name": "Impatiens", "hindi_name": "गुलमेहंदी (Impatiens)", "action": "Dissolves explosive visceral frustration and restores calm authority."}
        ]
        remedy_line = "Holly + Impatiens (Sovereign Fire)"
        title = f"Moon Opposite Mars ({orb}°): Why The 'Polite' Child Snaps #SOMA38 #VedicAstrology"

        # STEP 4 & 5: Conviction Close, Presumptive A/B, Price vs Cost of Inaction
        cta_spoken = (
            "You have two choices today: continue paying with your vitality for another six months of silent self-betrayal, "
            "or make the ₹499 investment for your Sovereign Kundli Letter at the link in bio. "
            "You are paying either way—which cost are you willing to bear?"
        )

    elif p1 in ("Saturn", "Rahu", "Ketu") or p2 in ("Saturn", "Rahu", "Ketu"):
        # STEP 1: Pattern Interrupt & Common Problem
        hook_spoken = "Notice how the fortress you built to protect yourself has quietly become the prison robbing you of your sleep? High achievers everywhere are burning out because they confuse martyrdom with strength."
        hook_screen = "The Fortress You Built To Survive 🏛️"

        # STEP 2: The Ammo & Discovery (Probing -> Provoking -> Future State)
        bridge_spoken = (
            f"Live NYC ephemeris reveals {p1} locking against {p2} with a tight {orb}-degree tension. "
            f"You took on every burden because asking for help felt dangerous. "
            f"The real cost of inaction isn't work stress—it is realizing you built an empire while your own soul is running on fumes. "
            f"Imagine setting down obligations that were never yours and experiencing deep, uninterrupted rest without a shred of guilt."
        )

        # STEP 3: The Value Equation (Outcome x Certainty > Cost x Risk)
        remedy_spoken = (
            "Pushpa Upaya remedies Oak and Rock Water dissolve rigid perfectionism and relentless self-flagellation. "
            "They deliver the exact biological frequency needed to reclaim effortless dignity."
        )
        remedies = [
            {"name": "Oak", "hindi_name": "बलूत पुष्प (Oak)", "action": "Breaks the compulsive addiction to being the unbreakable packhorse."},
            {"name": "Rock Water", "hindi_name": "रॉक वॉटर (Rock Water)", "action": "Softens relentless internal rigidity and self-criticism."}
        ]
        remedy_line = "Oak + Rock Water (Dissolve The Armor)"
        title = f"The 5th House Audit: Why Rest Feels Like A Sin To You #SOMA38 #VedicAstrology"

        # STEP 4 & 5: Conviction Close, Presumptive A/B, Price vs Cost of Inaction
        cta_spoken = (
            "Are you looking at a ₹499 investment, or the cost of carrying burdens that do not belong to you for another five years? "
            "Decode your natal geometry in your Sovereign Kundli Letter at the link in bio."
        )

    else:
        # Default Subversive 5th-House Frame with 5-Step Sales Psychology
        hook_spoken = f"Stop pretending you're confused. Under today's {p1}-{p2} transit, the truth you've been avoiding is staring right back at you."
        hook_screen = "The Truth You Pretend Not To Know 🗝️"

        bridge_spoken = (
            f"Live NYC sky calculation shows {p1} in {chart['active_planets'].get(p1, {}).get('sign', 'Aries')} {asp} {p2} within {orb} degrees. "
            f"Why do you keep asking five friends for advice when your gut already gave you the answer three weeks ago? "
            f"Every day you delay is another day you outsource your authority. What does living as the undisputed sovereign of your own life feel like?"
        )

        remedy_spoken = (
            "Pushpa Upaya essences Cerato and Larch are liquid iron for paralyzed intuition. "
            "They eliminate second-guessing and anchor your decisions in absolute internal certainty."
        )
        remedies = [
            {"name": "Cerato", "hindi_name": "सेराटो (Cerato)", "action": "Stops the compulsive habit of outsourcing your gut decisions."},
            {"name": "Larch", "hindi_name": "लार्च (Larch)", "action": "Replaces anticipation of failure with sovereign confidence."}
        ]
        remedy_line = "Cerato + Larch (Intuitive Sovereignty)"
        title = f"{p1} {asp} {p2} ({orb}°): Stop Outsourcing Your Power #SOMA38 #VedicAstrology"

        cta_spoken = (
            "You can keep hesitating, or claim your Sovereign Kundli Letter with an unbothered ₹499 investment at the link in bio. "
            "The choice is between instant diagnostic clarity or continued self-doubt."
        )

    brief_data = {
        "brief_id": brief_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "astrological_engine": {
            "city": "New York City, NY, USA",
            "fifth_house": h5,
            "primary_disruptive_aspect": top_aspect,
            "all_high_voltage_aspects": chart["top_attention_grabbing_aspects"]
        },
        "sales_conversion_architecture": {
            "step_1_pattern_interrupt": "Blunt guard-lowering honest hook + universal common problem leverage",
            "step_2_ammo_discovery": "Probing surface habit -> Provoking cost of inaction -> Future-state sizzle",
            "step_3_value_equation": "Ephemeris math certainty + clinical Pushpa Upaya prana > minimal friction",
            "step_4_conviction_close": "Cash-collection energy, ₹499 investment phrasing, presumptive choice, silence",
            "step_5_objection_reframe": "Price vs. Cost of Inaction (Paying with vitality vs. ₹499 clarity)"
        },
        "persona": "5th House Subversive Creator & Cosmic Alchemist",
        "content_assets": {
            "youtube_shorts": [
                {
                    "id": f"yt_short_{brief_id}",
                    "slot": "5TH_HOUSE_DISRUPTIVE_SERIES",
                    "voice": "en-IN-NeerjaExpressiveNeural",
                    "art_bg_indices": [
                        "soma38_art_neelakantha_altar",
                        "soma38_art_sovereign_spine_shani_oak",
                        "soma38_art_janma_chandra_altar",
                        "soma38_art_synastry"
                    ],
                    "title": title,
                    "target_duration_seconds": 45,
                    "primary_tension": f"5th House creative rebellion catalyzed by {p1} {asp} {p2} ({orb}° orb)",
                    "astrological_point": f"{p1} in {chart['active_planets'].get(p1, {}).get('sign', '')} {asp} {p2} in {chart['active_planets'].get(p2, {}).get('sign', '')}",
                    "somatic_symptom": "Nocturnal jaw clenching, trapped throat chakra, silent self-betrayal",
                    "remedies_pushpa_upaya": remedies,
                    "script": {
                        "hook_0_to_4s": {
                            "visual": "Royal chiaroscuro painting of an unmasked sovereign figure with piercing eyes and golden halo fire.",
                            "spoken": hook_spoken
                        },
                        "bridge_graha_4_to_22s": {
                            "visual": "Antique Vedic astrological wheel showing planetary friction lines locking in razor-sharp gold alignment.",
                            "spoken": bridge_spoken
                        },
                        "remedy_bridge_22_to_32s": {
                            "visual": "Apothecary still-life with glowing amber phials of Bach essences surrounded by deep botanical flora.",
                            "spoken": remedy_spoken
                        },
                        "cta_32_to_45s": {
                            "visual": "SOMA·38 Imperial Sovereign Seal and ₹499 Kundli link callout.",
                            "spoken": cta_spoken
                        }
                    },
                    "on_screen_text_hooks": [
                        hook_screen,
                        f"NYC Ephemeris: {p1} {asp} {p2} ({orb}°)",
                        f"Pushpa Upaya: {remedy_line}",
                        "₹499 Investment vs. Cost of Inaction 🗝️"
                    ]
                }
            ]
        }
    }

    out_file = BRIEFS_DIR / f"{brief_id}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(brief_data, f, indent=2, ensure_ascii=False)
    print(f"✅ Generated 5th-House Subversive Growth Brief: {out_file.name}")
    return out_file, brief_data


def main():
    chart = cast_live_nyc_chart()
    top_aspect = chart["primary_disruptive_aspect"]
    h5 = chart["fifth_house_personality"]

    print("\n" + "=" * 70)
    print(f"  SOMA·38 5TH-HOUSE PERSONA CALIBRATED")
    print(f"  Location Anchor : {chart['location']['city']}")
    print(f"  5th House Cusp  : {h5['sign']} {h5['cuspDegree']}° ({h5['nakshatra']} Pada {h5['pada']}, Ruled by {h5['ruler']})")
    print(f"  Primary Disruptor: {top_aspect['planet1']} {top_aspect['aspect']} {top_aspect['planet2']} (Orb: {top_aspect['orb']}°, Voltage: {top_aspect['voltageScore']})")
    print("=" * 70 + "\n")

    brief_path, brief_data = generate_subversive_brief(chart)
    
    # Render the vertical 9:16 Short immediately using generate_and_publish_soma38_shorts
    print("\n🎬 Rendering 9:16 Vertical Reel via SOMA·38 Production Engine...")
    cmd = [
        sys.executable,
        str(BASE_DIR / "scripts" / "generate_and_publish_soma38_shorts.py"),
        "--brief", str(brief_path),
        "--index", "0"
    ]
    subprocess.run(cmd, check=True)
    print("🎉 5th-House Subversive Reel Rendered Successfully!")


if __name__ == "__main__":
    main()
