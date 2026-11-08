#!/usr/bin/env python3
"""
SOMA·38 (सोम·३८) — Master Media Inbox Video & Podcast Processor (All 13 Discussions)
====================================================================================
Processes all 13 audio and video files in media_inbox/ into:
  1. Native 9:16 Vertical Shorts (1080x1920) with SOMA·38 Sovereign Gold Branding
  2. 16:9 Explainer Video -> 9:16 Vertical Shorts with Ambient Blur & Gold Typography
  3. M4A Debate Podcasts -> 9:16 Vertical Chiaroscuro Oil-Art Podcast Audiogram Shorts
"""

import os
import sys
import json
import subprocess
from pathlib import Path
import imageio_ffmpeg

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
BASE_DIR = Path(r"c:\Users\bpupp\Downloads\RESET\antigravity reset folder\RESET India\soma_india_engine")
INBOX_DIR = BASE_DIR / "media_inbox"
OUT_SHORTS_DIR = BASE_DIR / "public" / "shorts"
PINS_DIR = BASE_DIR / "public" / "pins"
OUT_SHORTS_DIR.mkdir(parents=True, exist_ok=True)

EPISODES = [
    # --- BATCH 1: Original 6 16:9 Explainers ---
    {
        "ep_num": 1,
        "filename": "Decolonizing_the_Shadow.mp4",
        "mode": "16x9_video",
        "out_name": "soma38_short_ep1_decolonizing_the_shadow",
        "title": "Decolonizing the Shadow: Why Western Psychology Fails Indian Psyches",
        "vedic_theme": "Navagrahas & The Shadow — Transmuting Rahu/Ketu & Mars via Pushpa Upaya",
        "short_clip": {"start": "00:00:01", "duration": "00:00:32"},
        "hook_text": "Why Western Psychology Fails The Indian Psyche",
        "remedies": "Star of Bethlehem + Holly"
    },
    {
        "ep_num": 2,
        "filename": "Healing_Perfectionism.mp4",
        "mode": "16x9_video",
        "out_name": "soma38_short_ep2_healing_perfectionism",
        "title": "The Golden Child Trap: Healing Perfectionism & The Overachievement Epidemic",
        "vedic_theme": "Surya Neecha & Lagna Shani — Dismantling The Unbreakable Mask",
        "short_clip": {"start": "00:00:00", "duration": "00:00:34"},
        "hook_text": "The Golden Child Trap: Chronic Burnout In Indian Youth",
        "remedies": "Pine + Centaury"
    },
    {
        "ep_num": 3,
        "filename": "Symptom_to_Source.mp4",
        "mode": "16x9_video",
        "out_name": "soma38_short_ep3_symptom_to_source",
        "title": "Symptom to Source: When A Minor Mistake Triggers A Panic Attack",
        "vedic_theme": "Chandra-Shani Vish Yoga — Whose Voice Is Yelling In Your Head?",
        "short_clip": {"start": "00:00:00", "duration": "00:00:31"},
        "hook_text": "Whose Voice Is Yelling In Your Head When You Make A Mistake?",
        "remedies": "Cherry Plum + White Chestnut"
    },
    {
        "ep_num": 4,
        "filename": "The_Invisible_Weight.mp4",
        "mode": "16x9_video",
        "out_name": "soma38_short_ep4_the_invisible_weight",
        "title": "The Invisible Weight: Why Family Duty Turns Into Physical Acidity",
        "vedic_theme": "4th House Sukha Bhava Affliction — When 'Good Child' Duty Becomes Physical Pain",
        "short_clip": {"start": "00:00:00", "duration": "00:00:32"},
        "hook_text": "Family Duty Is Literally Giving You Acid Reflux",
        "remedies": "Oak + Vervain"
    },
    {
        "ep_num": 5,
        "filename": "The_Weight_of_Honor.mp4",
        "mode": "16x9_video",
        "out_name": "soma38_short_ep5_the_weight_of_honor",
        "title": "The Weight of Honor: Why Loss of Face Hurts More Than Physical Injury",
        "vedic_theme": "Kutumba & Kalatra Bhava Boundaries — The Price of Preserving Parivaar Izzat",
        "short_clip": {"start": "00:00:00", "duration": "00:00:32"},
        "hook_text": "Why Loss Of Family Honor Hurts More Than Broken Bones",
        "remedies": "Larch + Agrimony"
    },
    {
        "ep_num": 6,
        "filename": "Trauma___Shame_Legacy.mp4",
        "mode": "16x9_video",
        "out_name": "soma38_short_ep6_trauma___shame_legacy",
        "title": "Trauma & Shame Legacy: Breaking The Multi-Generational Silence",
        "vedic_theme": "Pitru Dosha & 8th/12th Bhava Ancestral Armoring — Somatic Integration",
        "short_clip": {"start": "00:00:00", "duration": "00:00:33"},
        "hook_text": "You Are Carrying Ancestral Shame That Doesn't Belong To You",
        "remedies": "Sweet Chestnut + Star of Bethlehem"
    },

    # --- BATCH 2: 7 New Video & Audio Discussions ---
    {
        "ep_num": 7,
        "filename": "How_Flower_Essences_Actually_Work.mp4",
        "mode": "9x16_native",
        "out_name": "soma38_short_ep7_how_flower_essences_work",
        "title": "Zero Molecules, Pure Prana: How Flower Essences Clear Manovaha Srotas",
        "vedic_theme": "Manovaha Srotas & Prana — How Pushpa Upaya Clears The Heart-Mind Channel",
        "short_clip": {"start": "00:00:00", "duration": "00:01:24"},
        "hook_text": "How Flower Essences Heal The Heart-Mind (Manovaha Srotas)",
        "remedies": "Star of Bethlehem + Walnut"
    },
    {
        "ep_num": 8,
        "filename": "How_Neti-Neti_Strips_Away_Suffering.mp4",
        "mode": "9x16_native",
        "out_name": "soma38_short_ep8_neti_neti_suffering",
        "title": "Neti-Neti: Why Losing A Job Title Shouldn't Destroy Your Peace",
        "vedic_theme": "Ketu & Neti-Neti Inquiry — Stripping False Identities To Reach The Unconditioned Core",
        "short_clip": {"start": "00:00:00", "duration": "00:01:19"},
        "hook_text": "Neti-Neti: You Had A Job, But You Are Not The Job",
        "remedies": "Wild Oat + Walnut"
    },
    {
        "ep_num": 9,
        "filename": "How_the_False_Ego_Manufactures_Suffering.mp4",
        "mode": "9x16_native",
        "out_name": "soma38_short_ep9_false_ego_ahamkara",
        "title": "Ahamkara: How The False Ego Manufactures Your Suffering",
        "vedic_theme": "Rahu & Ahamkara — Breaking Metaphysical Tethers To External Status",
        "short_clip": {"start": "00:00:00", "duration": "00:01:23"},
        "hook_text": "Ahamkara: How Your False Ego Manufactures Suffering",
        "remedies": "Agrimony + Water Violet"
    },
    {
        "ep_num": 10,
        "filename": "Journey_to_the_Core_Self.mp4",
        "mode": "16x9_video",
        "out_name": "soma38_short_ep10_journey_to_core_self",
        "title": "Journey To The Core Self: When You Strip Away Every Role, Who Is Left?",
        "vedic_theme": "Atman & Lagna — Peeling The 5 Layers Of Social Conditioning",
        "short_clip": {"start": "00:00:21", "duration": "00:00:38"},
        "hook_text": "When You Strip Away Your Job And Roles, What Is Left?",
        "remedies": "Cerato + Wild Oat"
    },
    {
        "ep_num": 11,
        "filename": "The_Vibrational_Mind.mp4",
        "mode": "16x9_video",
        "out_name": "soma38_short_ep11_the_vibrational_mind",
        "title": "Upadhi & Sukshma Sharira: Why External Validation Never Fills The Void",
        "vedic_theme": "Sukshma Sharira & Upadhi — Healing The Subtle Body With Pushpa Upaya",
        "short_clip": {"start": "00:02:00", "duration": "00:00:50"},
        "hook_text": "Upadhi: Why Chasing Validation Locks You In Exhaustion",
        "remedies": "Heather + Centaury"
    },
    {
        "ep_num": 12,
        "filename": "Does_Spiritual_Liberation_Require_Dissolving_the_Self.m4a",
        "mode": "audio_podcast",
        "bg_art": "soma38_art_sovereign_spine_shani_oak.jpg",
        "out_name": "soma38_short_ep12_spiritual_liberation_debate",
        "title": "Why Building A 'Fortress Identity' Is The Exact Cause Of Your Anxiety",
        "vedic_theme": "Advaita vs. Vishishtadvaita — Sovereign Participation vs. The Exhausting Ego Fortress",
        "short_clip": {"start": "00:00:00", "duration": "00:00:54"},
        "hook_text": "Is Defending Your 'Personal Brand' Causing Your Anxiety?",
        "remedies": "Water Violet + Oak"
    },
    {
        "ep_num": 13,
        "filename": "The_Ayurvedic_Science_of_Flower_Essences.m4a",
        "mode": "audio_podcast",
        "bg_art": "soma38_art_janma_chandra_altar.jpg",
        "out_name": "soma38_short_ep13_ayurvedic_flower_essences_debate",
        "title": "Pushpa Upaya Debate: Do Flower Essences Soothe Or Force Shadow Work?",
        "vedic_theme": "Soma & Active Shadow Integration — The Ayurvedic Mechanics of Pushpa Upaya",
        "short_clip": {"start": "00:02:00", "duration": "00:00:52"},
        "hook_text": "Do Flower Essences Just Soothe You, Or Dismantle The False Ego?",
        "remedies": "Holly + Star of Bethlehem"
    }
]


def escape_ffmpeg_text(text: str) -> str:
    """Escapes special characters for ffmpeg drawtext filter."""
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "").replace("%", "\\%")


def render_episode_short(ep: dict) -> Path:
    src_path = INBOX_DIR / ep["filename"]
    clip_cfg = ep["short_clip"]
    out_mp4 = OUT_SHORTS_DIR / f"{ep['out_name']}.mp4"
    mode = ep.get("mode", "16x9_video")

    print(f"\n[Generating Vertical 9:16 Short #{ep['ep_num']:02d} ({mode})] {ep['title']}")
    print(f"  Source: {src_path.name} ({clip_cfg['start']} for {clip_cfg['duration']})")

    hook_escaped = escape_ffmpeg_text(ep["hook_text"])
    remedies_escaped = escape_ffmpeg_text(ep["remedies"])

    if mode == "16x9_video":
        filter_complex = (
            "[0:v]split=2[vbg][vfg];"
            "[vbg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=35,eq=brightness=-0.25:contrast=1.15[bg];"
            "[vfg]scale=1040:-1[fg];"
            "[bg][fg]overlay=x=(W-w)/2:y=550[comp];"
            "[comp]drawbox=x=40:y=140:w=1000:h=90:color=black@0.75:t=fill,"
            "drawbox=x=40:y=140:w=1000:h=90:color=#c5a059@0.9:t=3,"
            "drawtext=text='SOMA - 38   EXPLAINER PODCAST':fontcolor=#c5a059:fontsize=36:x=(w-text_w)/2:y=168:shadowcolor=black:shadowx=2:shadowy=2[comp2];"
            "[comp2]drawbox=x=40:y=1180:w=1000:h=150:color=black@0.85:t=fill,"
            "drawbox=x=40:y=1180:w=1000:h=150:color=#c5a059@0.9:t=3,"
            f"drawtext=text='{hook_escaped}':fontcolor=#ffffff:fontsize=33:x=(w-text_w)/2:y=1215:shadowcolor=black:shadowx=2:shadowy=2,"
            f"drawtext=text='Pushpa Upaya\\: {remedies_escaped}':fontcolor=#e2b868:fontsize=28:x=(w-text_w)/2:y=1275[comp3];"
            "[comp3]drawbox=x=60:y=1720:w=960:h=90:color=#111827@0.9:t=fill,"
            "drawbox=x=60:y=1720:w=960:h=90:color=#c5a059@0.9:t=2,"
            "drawtext=text='Free Sovereign Kundli Letter - Link In Bio':fontcolor=#c5a059:fontsize=32:x=(w-text_w)/2:y=1750[vout]"
        )
        cmd = [
            FFMPEG, "-y",
            "-ss", clip_cfg["start"],
            "-t", clip_cfg["duration"],
            "-i", str(src_path),
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "0:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-c:a", "aac", "-b:a", "192k",
            str(out_mp4)
        ]

    elif mode == "9x16_native":
        # Native 720x1280 vertical video -> upscale to 1080x1920 and add SOMA 38 top/bottom gold banners
        filter_complex = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[comp];"
            "[comp]drawbox=x=40:y=80:w=1000:h=84:color=black@0.82:t=fill,"
            "drawbox=x=40:y=80:w=1000:h=84:color=#c5a059@0.95:t=3,"
            "drawtext=text='SOMA - 38   VEDIC & PUSHPA UPAYA':fontcolor=#c5a059:fontsize=34:x=(w-text_w)/2:y=106:shadowcolor=black:shadowx=2:shadowy=2[comp2];"
            "[comp2]drawbox=x=40:y=1670:w=1000:h=160:color=black@0.86:t=fill,"
            "drawbox=x=40:y=1670:w=1000:h=160:color=#c5a059@0.95:t=3,"
            f"drawtext=text='{hook_escaped}':fontcolor=#ffffff:fontsize=30:x=(w-text_w)/2:y=1698:shadowcolor=black:shadowx=2:shadowy=2,"
            f"drawtext=text='Pushpa Upaya\\: {remedies_escaped}  |  Link In Bio':fontcolor=#e2b868:fontsize=26:x=(w-text_w)/2:y=1760[vout]"
        )
        cmd = [
            FFMPEG, "-y",
            "-ss", clip_cfg["start"],
            "-t", clip_cfg["duration"],
            "-i", str(src_path),
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "0:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-c:a", "aac", "-b:a", "192k",
            str(out_mp4)
        ]

    elif mode == "audio_podcast":
        bg_img = PINS_DIR / ep.get("bg_art", "soma38_art_sovereign_spine_shani_oak.jpg")
        filter_complex = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.12:contrast=1.08[bg];"
            "[bg]drawbox=x=40:y=120:w=1000:h=96:color=black@0.82:t=fill,"
            "drawbox=x=40:y=120:w=1000:h=96:color=#c5a059@0.95:t=3,"
            "drawtext=text='SOMA - 38   PHILOSOPHICAL DEBATE PODCAST':fontcolor=#c5a059:fontsize=34:x=(w-text_w)/2:y=152:shadowcolor=black:shadowx=2:shadowy=2[bg2];"
            "[bg2]drawbox=x=40:y=1280:w=1000:h=320:color=black@0.82:t=fill,"
            "drawbox=x=40:y=1280:w=1000:h=320:color=#c5a059@0.95:t=3,"
            f"drawtext=text='{hook_escaped}':fontcolor=#ffffff:fontsize=31:x=(w-text_w)/2:y=1325:shadowcolor=black:shadowx=2:shadowy=2,"
            f"drawtext=text='Pushpa Upaya\\: {remedies_escaped}':fontcolor=#e2b868:fontsize=28:x=(w-text_w)/2:y=1385[bg3];"
            "[1:a]showwaves=s=920x130:mode=cline:rate=25:colors=#c5a059|#e2b868[waves];"
            "[bg3][waves]overlay=x=80:y=1445[comp3];"
            "[comp3]drawbox=x=60:y=1700:w=960:h=90:color=#111827@0.92:t=fill,"
            "drawbox=x=60:y=1700:w=960:h=90:color=#c5a059@0.9:t=2,"
            "drawtext=text='Free Sovereign Kundli Letter - Link In Bio':fontcolor=#c5a059:fontsize=32:x=(w-text_w)/2:y=1730[vout]"
        )
        cmd = [
            FFMPEG, "-y",
            "-loop", "1", "-i", str(bg_img),
            "-ss", clip_cfg["start"],
            "-t", clip_cfg["duration"],
            "-i", str(src_path),
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(out_mp4)
        ]

    subprocess.run(cmd, check=True, stderr=subprocess.PIPE)
    size_mb = out_mp4.stat().st_size / (1024 * 1024)
    print(f"  ✅ Rendered 9:16 Short: {out_mp4.name} ({size_mb:.2f} MB)")
    return out_mp4


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--episode", type=int, default=None, help="Episode number (1-13)")
    parser.add_argument("--new-only", action="store_true", help="Process only new episodes 7-13")
    parser.add_argument("--all", action="store_true", help="Process all 13 episodes")
    args = parser.parse_args()

    if args.all:
        for ep in EPISODES:
            render_episode_short(ep)
    elif args.new_only:
        for ep in EPISODES:
            if ep["ep_num"] >= 7:
                render_episode_short(ep)
    elif args.episode is not None:
        matches = [e for e in EPISODES if e["ep_num"] == args.episode]
        if matches:
            render_episode_short(matches[0])
        else:
            print(f"No episode found with ep_num={args.episode}")
    else:
        for ep in EPISODES:
            if ep["ep_num"] >= 7:
                render_episode_short(ep)
