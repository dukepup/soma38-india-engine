"""
SOMA·38 Automated YouTube Shorts Generator & Publisher (Twice-Daily Engine)
- Voice: Sovereign Confrontational Indian Neural TTS (edge-tts)
- Visuals: 4-Act Royal Vedic Oil Paintings (art_bg_001..100) with Patrika Gold Framing
- Subtitles: Word-chunked .ASS Kinetic Typography with Imperial Gold trigger highlights
- Audio Bed: Synthesized 136.1Hz (Om / Sadja) warm harmonic drone mixed at -25dB
- Publisher: Direct YouTube Data API v3 OAuth2 Upload to @SOMA38.VedicKundli
"""

import os
import re
import glob
import json
import math
import wave
import struct
import asyncio
import datetime
import subprocess
import requests
import edge_tts
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

BASE_DIR = r"c:\Users\bpupp\Downloads\RESET\antigravity reset folder\RESET India\soma_india_engine"
SCRATCH_DIR = r"C:\Users\bpupp\.gemini\antigravity\scratch\soma_india_engine"
ARTIFACT_DIR = r"C:\Users\bpupp\.gemini\antigravity\brain\de274ffa-3ffc-49ad-9ba6-8134f7300dd0"
TOKENS_PATH = os.path.join(BASE_DIR, "data", "soma38_social_tokens.json")
LEDGER_PATH = os.path.join(BASE_DIR, "data", "soma38_youtube_shorts_ledger.json")
SHORTS_OUT_DIR = os.path.join(BASE_DIR, "public", "shorts")
FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()

os.makedirs(SHORTS_OUT_DIR, exist_ok=True)

HIGHLIGHT_WORDS = {
    "breached", "cowardice", "surrender", "spine", "prison", "blame",
    "vervain", "centaury", "chestnut", "pine", "cerato", "walnut",
    "3:14", "humiliation", "martyr", "selfish", "dignity", "run",
    "kundli", "saturn", "mars", "rahu", "ketu", "jupiter", "ashlesha", "ardra"
}


def load_font(names, size):
    windir = os.environ.get("WINDIR", r"C:\Windows")
    fonts_dir = os.path.join(windir, "Fonts")
    for name in names:
        fp = os.path.join(fonts_dir, name)
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                pass
    return ImageFont.load_default()


def find_art_bg(index_str: str) -> str:
    # Direct path match
    if os.path.exists(index_str):
        return index_str
    
    # Check named master botanical / natal artworks
    named_matches = (
        glob.glob(os.path.join(ARTIFACT_DIR, f"*{index_str}*.jpg")) +
        glob.glob(os.path.join(BASE_DIR, "public", "pins", f"*{index_str}*.jpg"))
    )
    if named_matches:
        return named_matches[0]

    pattern = os.path.join(ARTIFACT_DIR, f"art_bg_{index_str}*.jpg")
    matches = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
    if matches:
        return matches[0]
    fallback = os.path.join(BASE_DIR, "public", "pins", f"pin-{index_str}.jpg")
    if os.path.exists(fallback):
        return fallback
    fallback_story = os.path.join(BASE_DIR, "public", "pins", f"pin-story-{index_str}.jpg")
    if os.path.exists(fallback_story):
        return fallback_story
    any_matches = sorted(glob.glob(os.path.join(ARTIFACT_DIR, "art_bg_*.jpg")))
    try:
        idx = int(index_str)
    except ValueError:
        idx = 0
    return any_matches[idx % len(any_matches)] if any_matches else ""


def prepare_clean_art_and_overlay(raw_img_path: str, hook_banner: str, art_out_path: str, overlay_png_path: str):
    """
    1. Saves the clean 1080x1920 oil painting (which will undergo Ken Burns zoompan).
    2. Saves a transparent 1080x1920 Royal Patrika RGBA PNG overlay (border, vignette, header, footer)
       that stays locked in place while the artwork moves underneath.
    """
    W, H = 1080, 1920
    img = Image.open(raw_img_path).convert("RGB")
    iw, ih = img.size
    target_ratio = W / H
    src_ratio = iw / ih

    if src_ratio > target_ratio:
        new_w = int(ih * target_ratio)
        left = (iw - new_w) // 2
        img = img.crop((left, 0, left + new_w, ih))
    else:
        new_h = int(iw / target_ratio)
        top = (ih - new_h) // 2
        img = img.crop((0, top, iw, top + new_h))

    img = img.resize((W, H), Image.Resampling.LANCZOS)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    img.save(art_out_path, quality=95)

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Top Royal Vignette (0..280)
    for y in range(280):
        alpha = int(235 * (1 - (y / 280) ** 1.25))
        draw.line([(0, y), (W, y)], fill=(12, 9, 7, alpha))

    # Bottom Subtitle Vignette (1100..1920)
    for y in range(1100, H):
        prog = (y - 1100) / (H - 1100)
        alpha = int(240 * (prog ** 1.15))
        draw.line([(0, y), (W, y)], fill=(10, 8, 6, alpha))

    # Royal Double Gold Patrika Border (locked inside safe zone)
    gold_outer = (212, 175, 55, 225)
    gold_inner = (212, 175, 55, 120)
    draw.rectangle([32, 32, W - 32, H - 32], outline=gold_outer, width=3)
    draw.rectangle([44, 44, W - 44, H - 44], outline=gold_inner, width=1)

    # Top Masthead Text
    font_brand = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 25)
    font_hook = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 31)
    font_footer = load_font(["georgiai.ttf", "palai.ttf", "timesi.ttf"], 23)

    brand_text = "SOMA · 38   |   ROYAL VEDIC KUNDLI & PUSHPA UPAYA"
    bbox = draw.textbbox((0, 0), brand_text, font=font_brand)
    bw = bbox[2] - bbox[0]
    draw.text(((W - bw) // 2, 74), brand_text, font=font_brand, fill=(212, 175, 55, 250))

    # Gold separator line
    draw.line([(140, 118), (W - 140, 118)], fill=(212, 175, 55, 150), width=2)

    # Scene Hook Banner
    clean_hook = re.sub(r"[^\x00-\x7F×·]+", "", hook_banner).strip()
    hbbox = draw.textbbox((0, 0), clean_hook, font=font_hook)
    hw = hbbox[2] - hbbox[0]
    draw.text(((W - hw) // 2, 136), clean_hook, font=font_hook, fill=(248, 241, 229, 245))

    # Bottom Watermark (above bottom border)
    footer_text = "soma38-india.onrender.com  ·  Lahiri Sidereal & Bach Remedies"
    fbbox = draw.textbbox((0, 0), footer_text, font=font_footer)
    fw = fbbox[2] - fbbox[0]
    draw.text(((W - fw) // 2, H - 94), footer_text, font=font_footer, fill=(212, 175, 55, 210))

    overlay.save(overlay_png_path)


def generate_tanpura_drone_wav(duration_sec: float, wav_path: str):
    """Generates a warm 136.1Hz (Sadja / Om) + 204.15Hz (Panchama) harmonic ambient bed."""
    sample_rate = 22050
    n_samples = int(duration_sec * sample_rate)
    f_root = 136.10      # C#3 Om frequency
    f_fifth = 204.15     # G#3 Fifth
    f_sub = 68.05        # C#2 Sub-bass warmth

    with wave.open(wav_path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = bytearray()
        for i in range(n_samples):
            t = i / sample_rate
            # Slow breathing LFO
            lfo = 0.85 + 0.15 * math.sin(2 * math.pi * 0.18 * t)
            val = (
                0.50 * math.sin(2 * math.pi * f_sub * t)
                + 0.35 * math.sin(2 * math.pi * f_root * t)
                + 0.15 * math.sin(2 * math.pi * f_fifth * t)
            ) * lfo
            # Fade in/out
            if t < 1.0:
                val *= t
            elif t > duration_sec - 1.5:
                val *= max(0.0, (duration_sec - t) / 1.5)
            sample = int(max(-1.0, min(1.0, val)) * 2800)  # Subtle -21dB level
            frames.extend(struct.pack("<h", sample))
        wf.writeframes(frames)


def format_ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def style_chunk_words(words):
    styled = []
    for w in words:
        clean = re.sub(r"[^a-zA-Z0-9:]", "", w).lower()
        if clean in HIGHLIGHT_WORDS:
            # Bright Imperial Gold in ASS BGR: #D4AF37 -> &H0037AFD4&
            styled.append(r"{\c&H0037AFD4&}" + w + r"{\c&H00E8F4FA&}")
        else:
            styled.append(w)
    return " ".join(styled)


def build_ass_subtitles(cues, ass_path: str):
    """Builds kinetic 4-word chunked .ASS subtitles with Imperial Gold trigger highlights."""
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Georgia,60,&H00E8F4FA&,&H0037AFD4&,&H00080605&,&H96080605&,-1,0,0,0,100,100,1,0,1,5,3,2,70,70,410,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for cue in cues:
        start_s = cue["start"]
        end_s = cue["end"]
        text = cue["text"].strip()
        words = text.split()
        if not words:
            continue

        # Group into chunks of max 4 words for rapid high-retention pacing
        chunk_size = 4
        chunks = [words[i:i + chunk_size] for i in range(0, len(words), chunk_size)]
        total_chars = max(1, sum(len(" ".join(c)) for c in chunks))
        dur = max(0.4, end_s - start_s)

        cursor = start_s
        for c in chunks:
            c_len = len(" ".join(c))
            c_dur = dur * (c_len / total_chars)
            c_end = cursor + c_dur
            styled_text = style_chunk_words(c)
            events.append(
                f"Dialogue: 0,{format_ass_time(cursor)},{format_ass_time(c_end)},Default,,0,0,0,,{styled_text}"
            )
            cursor = c_end

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(events) + "\n")


async def synthesize_short_audio_and_cues(full_text: str, voice: str, mp3_path: str):
    communicate = edge_tts.Communicate(full_text, voice, rate="+14%")
    cues = []
    with open(mp3_path, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "SentenceBoundary":
                start_s = chunk["offset"] / 10_000_000.0
                dur_s = chunk["duration"] / 10_000_000.0
                cues.append({
                    "start": start_s,
                    "end": start_s + dur_s,
                    "text": chunk["text"]
                })
    return cues


def get_audio_duration(mp3_path: str) -> float:
    r = subprocess.run([FFMPEG_BIN, "-i", mp3_path], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", r.stderr)
    if m:
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    return 38.0


def render_short_mp4(short_item: dict, out_mp4_path: str) -> dict:
    short_id = short_item["id"]
    voice = short_item.get("voice", "en-IN-PrabhatNeural")
    art_indices = short_item.get("art_bg_indices", ["001", "014", "033", "072"])
    hooks = short_item.get("on_screen_text_hooks", [
        "SOMA·38 Sovereign Diagnosis",
        "Lahiri Sidereal Mirror",
        "Pushpa Upaya Protocol"
    ])

    script_obj = short_item["script"]
    ordered_parts = [
        v["spoken"].strip()
        for k, v in script_obj.items()
        if isinstance(v, dict) and "spoken" in v
    ]
    full_spoken_text = " ".join(ordered_parts)

    work_dir = os.path.join(SHORTS_OUT_DIR, f"build_{short_id}")
    os.makedirs(work_dir, exist_ok=True)

    mp3_path = os.path.join(work_dir, "voice.mp3")
    drone_path = os.path.join(work_dir, "drone.wav")
    ass_path = os.path.join(work_dir, "captions.ass")

    print(f"[{short_id}] Synthesizing neural voiceover ({voice})...")
    cues = asyncio.run(synthesize_short_audio_and_cues(full_spoken_text, voice, mp3_path))
    total_dur = get_audio_duration(mp3_path) + 0.6
    print(f"[{short_id}] Audio duration: {total_dur:.2f}s ({len(cues)} sentences)")

    build_ass_subtitles(cues, ass_path)
    generate_tanpura_drone_wav(total_dur, drone_path)

    # Prepare 4 Patrika Scene Images & Render 4 Scene Clips with smooth Ken Burns under locked Patrika frame
    scene_durs = [
        round(total_dur * 0.18, 2),
        round(total_dur * 0.37, 2),
        round(total_dur * 0.25, 2),
    ]
    scene_durs.append(round(max(2.0, total_dur - sum(scene_durs)), 2))

    scene_clips = []
    for idx in range(4):
        art_idx = art_indices[idx % len(art_indices)]
        raw_art = find_art_bg(art_idx)
        hook_txt = hooks[min(idx, len(hooks) - 1)]
        art_jpg = os.path.join(work_dir, f"art_{idx}.jpg")
        overlay_png = os.path.join(work_dir, f"overlay_{idx}.png")
        prepare_clean_art_and_overlay(raw_art, hook_txt, art_jpg, overlay_png)

        clip_mp4 = os.path.join(work_dir, f"clip_{idx}.mp4")
        dur = scene_durs[idx]
        frames = int(dur * 30)
        # Alternate zoom-in and zoom-out on the artwork while the Patrika frame stays locked
        if idx % 2 == 0:
            z_expr = f"min(zoom+0.0006,1.12)"
        else:
            z_expr = f"if(eq(on,1),1.12,max(1.00,zoom-0.0006))"

        cmd_clip = [
            FFMPEG_BIN, "-y",
            "-loop", "1", "-i", art_jpg,
            "-loop", "1", "-i", overlay_png,
            "-filter_complex", (
                f"[0:v]scale=1200:2134,zoompan=z='{z_expr}':d={frames}:fps=30:"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[bg];"
                f"[bg][1:v]overlay=0:0,format=yuv420p[v]"
            ),
            "-map", "[v]",
            "-t", str(dur),
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20",
            clip_mp4
        ]
        subprocess.run(cmd_clip, check=True, capture_output=True)
        scene_clips.append(clip_mp4)

    concat_list_path = os.path.join(work_dir, "concat.txt")
    with open(concat_list_path, "w", encoding="utf-8") as f:
        for clip in scene_clips:
            f.write(f"file '{clip.replace(os.sep, '/')}'\n")

    # Final Composite: Concat 4 scenes + Burn .ASS Kinetic Captions + Mix Voice & Tanpura Drone
    escaped_ass = ass_path.replace("\\", "/").replace(":", "\\:")
    cmd_final = [
        FFMPEG_BIN, "-y",
        "-f", "concat", "-safe", "0", "-i", concat_list_path,
        "-i", mp3_path,
        "-i", drone_path,
        "-filter_complex",
        f"[0:v]ass='{escaped_ass}'[v];"
        f"[1:a]volume=1.15[va];"
        f"[2:a]volume=0.35[da];"
        f"[va][da]amix=inputs=2:duration=first:dropout_transition=2[a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "21", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-t", str(round(total_dur, 2)),
        out_mp4_path
    ]
    print(f"[{short_id}] Compositing final 1080x1920 MP4 with kinetic captions & drone...")
    subprocess.run(cmd_final, check=True, capture_output=True)
    print(f"[{short_id}] Rendered -> {out_mp4_path} ({os.path.getsize(out_mp4_path) // 1024} KB)")
    return {
        "short_id": short_id,
        "mp4_path": out_mp4_path,
        "duration_sec": round(total_dur, 2),
        "voice": voice,
        "spoken_text": full_spoken_text
    }


def get_youtube_access_token() -> str:
    """
    Obtains a valid access token for YouTube Data API v3 using sovereign credential tiers:
    1. Dedicated Google Cloud Service Account (GOOGLE_APPLICATION_CREDENTIALS or data/service_account.json)
    2. Environment-bound direct OAuth Access Token (YOUTUBE_ACCESS_TOKEN)
    3. Local desktop interactive refresh token (TOKENS_PATH / soma38_social_tokens.json)
       - BLOCKED if executing in headless cloud/CI environments to protect against
         centralized account security sentinels (Azure, GitHub Actions, Render).
    """
    # 1. Dedicated Google Cloud Service Account
    sa_env = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    sa_default = os.path.join(BASE_DIR, "data", "service_account.json")
    sa_path = sa_env if (sa_env and os.path.exists(sa_env)) else (sa_default if os.path.exists(sa_default) else None)
    if sa_path:
        try:
            from google.oauth2 import service_account
            import google.auth.transport.requests
            scopes = ["https://www.googleapis.com/auth/youtube.upload"]
            creds = service_account.Credentials.from_service_account_file(sa_path, scopes=scopes)
            req = google.auth.transport.requests.Request()
            creds.refresh(req)
            return creds.token
        except Exception as e:
            print(f"[AUTH] Service Account authentication error: {e}")

    # 2. Environment-bound direct access token
    env_token = os.environ.get("YOUTUBE_ACCESS_TOKEN", "").strip()
    if env_token:
        return env_token

    # 3. Sentinel Guardrail against user-session token leakage in cloud/CI environments
    is_cloud_env = any(os.environ.get(k) for k in [
        "GITHUB_ACTIONS", "CI", "RENDER", "HEROKU", "AWS_EXECUTION_ENV", "KUBERNETES_SERVICE_HOST"
    ])
    if is_cloud_env:
        raise RuntimeError(
            "SECURITY SENTINEL GUARD: Execution in headless cloud/CI environment detected. "
            "To prevent triggering automated user-session security alerts on personal Google accounts, "
            "cloud workloads must authenticate via a dedicated Service Account (GOOGLE_APPLICATION_CREDENTIALS) "
            "or an environment-bound YOUTUBE_ACCESS_TOKEN, rather than personal user OAuth refresh tokens."
        )

    # 4. Safe local desktop execution via user refresh token
    if not os.path.exists(TOKENS_PATH):
        raise FileNotFoundError(f"Tokens file not found at {TOKENS_PATH}")

    with open(TOKENS_PATH, "r", encoding="utf-8") as f:
        yt_creds = json.load(f)["youtube"]

    if not yt_creds.get("refresh_token"):
        raise ValueError("Missing YouTube refresh_token in tokens file.")

    token_resp = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": yt_creds["client_id"],
        "client_secret": yt_creds["client_secret"],
        "refresh_token": yt_creds["refresh_token"],
        "grant_type": "refresh_token"
    }, timeout=30)
    token_resp.raise_for_status()
    return token_resp.json()["access_token"]


def upload_short_to_youtube(short_item: dict, mp4_path: str) -> dict:
    """Uploads rendered Short MP4 to @SOMA38.VedicKundli via YouTube Data API v3."""
    access_token = get_youtube_access_token()

    remedy_names = ", ".join(r["name"] for r in short_item.get("remedies_pushpa_upaya", []))
    description = (
        f"{short_item['title']}\n\n"
        f"🪐 Lahiri Sidereal Diagnostic: {short_item.get('lahiri_graha_mechanic', '')}\n"
        f"🌸 Pushpa Upaya (Bach Flower Protocol): {remedy_names}\n\n"
        f"Stop hiding behind passive astrology or blaming your nervous system. "
        f"Read your personal Sovereign Kundli & Pushpa Upaya Letter:\n"
        f"👉 https://soma38-india.onrender.com\n\n"
        f"Join the SOMA·38 Daily WhatsApp Sanctuary:\n"
        f"👉 https://whatsapp.com/channel/0029VbEEIKvLNSa79h16aZ3I\n\n"
        f"#Shorts #SOMA38 #VedicAstrology #Kundli #PushpaUpaya #BachFlowerRemedies #ShadowWorkIndia #LahiriSidereal"
    )

    metadata = {
        "snippet": {
            "title": short_item["title"][:100],
            "description": description,
            "tags": [
                "SOMA 38", "Vedic Astrology India", "Kundli", "Pushpa Upaya",
                "Bach Flower Remedies India", "Shadow Work", "Lahiri Sidereal",
                "Sade Sati", "Arranged Marriage India", "Shorts"
            ],
            "categoryId": "22",
            "defaultLanguage": "en-IN",
            "defaultAudioLanguage": "en-IN"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }

    init_resp = requests.post(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": str(os.path.getsize(mp4_path))
        },
        data=json.dumps(metadata),
        timeout=30
    )
    init_resp.raise_for_status()
    upload_url = init_resp.headers["Location"]

    with open(mp4_path, "rb") as vf:
        up_resp = requests.put(
            upload_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "video/mp4"
            },
            data=vf,
            timeout=300
        )
    up_resp.raise_for_status()
    video_data = up_resp.json()
    video_id = video_data["id"]

    # Record in ledger
    ledger = []
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as lf:
                ledger = json.load(lf)
        except Exception:
            ledger = []

    entry = {
        "short_id": short_item["id"],
        "youtube_video_id": video_id,
        "youtube_url": f"https://youtube.com/shorts/{video_id}",
        "title": short_item["title"],
        "slot": short_item.get("slot", "DAILY"),
        "published_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "mp4_path": mp4_path
    }
    ledger.append(entry)
    with open(LEDGER_PATH, "w", encoding="utf-8") as lf:
        json.dump(ledger, lf, indent=2, ensure_ascii=False)

    return entry


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--brief", default="", help="Optional specific brief JSON path; defaults to scanning all brief_*.json files")
    parser.add_argument("--index", type=int, default=-1, help="Which short in the brief to process (0, 1, 2) or -1 for next unpublished across all briefs")
    parser.add_argument("--publish", action="store_true", help="Upload directly to YouTube Shorts")
    args = parser.parse_args()

    published_ids = set()
    if os.path.exists(LEDGER_PATH):
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as lf:
                published_ids = {item["short_id"] for item in json.load(lf)}
        except Exception:
            pass

    if args.brief:
        brief_files = [args.brief]
    else:
        brief_files = sorted(glob.glob(os.path.join(BASE_DIR, "data", "daily_growth_briefs", "brief_*.json")))

    all_shorts = []
    for bf in brief_files:
        try:
            with open(bf, "r", encoding="utf-8") as f:
                bdata = json.load(f)
            all_shorts.extend(bdata.get("content_assets", {}).get("youtube_shorts", []))
        except Exception as e:
            print(f"Warning reading {bf}: {e}")

    if args.index == -1:
        target_short = next((s for s in all_shorts if s["id"] not in published_ids), all_shorts[-1])
    else:
        target_short = all_shorts[args.index]

    out_mp4 = os.path.join(SHORTS_OUT_DIR, f"{target_short['id']}_sovereign.mp4")
    render_info = render_short_mp4(target_short, out_mp4)
    print("RENDER SUCCESS:", json.dumps(render_info, indent=2))

    if args.publish:
        pub_info = upload_short_to_youtube(target_short, out_mp4)
        print("YOUTUBE UPLOAD SUCCESS:", json.dumps(pub_info, indent=2))
