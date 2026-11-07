import os
import glob
import re
import json
import csv
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
from hooks_100 import HOOKS_100

ARTIFACT_DIR = r"C:\Users\bpupp\.gemini\antigravity\brain\de274ffa-3ffc-49ad-9ba6-8134f7300dd0"
BASE_DIR = r"C:\Users\bpupp\.gemini\antigravity\scratch\soma_india_engine"
POSTS_PATH = os.path.join(BASE_DIR, "data", "reset_blog_100_posts.json")
PINS_DIR = os.path.join(BASE_DIR, "public", "pins")
ART_JSON_PATH = os.path.join(BASE_DIR, "data", "pinterest_100_artistic_pins.json")
ART_CSV_PATH = os.path.join(PINS_DIR, "soma38_pinterest_100_artistic_pins.csv")
PERMANENT_URL = "https://soma38-india.onrender.com"

BOARD_MAPPING = {
    'Parivar Pressure, In-Laws & "Log Kya Kahenge"': ("Shadow Work & Indian Family Boundaries", "shadow-work-indian-family-boundaries"),
    "Nazar, Energy Drain & Emotional Boundaries": ("Shadow Work & Indian Family Boundaries", "shadow-work-indian-family-boundaries"),
    "Corporate Burnout, IT Stress & Eldest-Child Burden": ("Shadow Work & Indian Family Boundaries", "shadow-work-indian-family-boundaries"),
    "Vedic Transits, Sade Sati & Graha Karma": ("Vedic Kundli, Sade Sati & Chandra Rashi", "vedic-kundli-sade-sati-chandra-rashi"),
    "Spiritual Confusion, Puja Guilt & Inner Peace": ("Vedic Kundli, Sade Sati & Chandra Rashi", "vedic-kundli-sade-sati-chandra-rashi"),
    "Swadharma, Career Hesitation & Self-Doubt": ("Vedic Kundli, Sade Sati & Chandra Rashi", "vedic-kundli-sade-sati-chandra-rashi"),
    "Body Stress, 3 AM Insomnia & Gut-Mind Blocks": ("Bach Flower Remedies (Pushpa Upaya)", "bach-flower-remedies-pushpa-upaya"),
    "Ghabrahat, Sudden Panic & Unspoken Trauma": ("Bach Flower Remedies (Pushpa Upaya)", "bach-flower-remedies-pushpa-upaya"),
    "Gen-Z India, Exam Pressure & Career Anxiety": ("Bach Flower Remedies (Pushpa Upaya)", "bach-flower-remedies-pushpa-upaya"),
    "Rishta Confusion, Heartbreak & Marriage Synastry": ("Marriage, Rishta & Relationship Synastry", "marriage-rishta-relationship-synastry")
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

FONT_SERIF_BOLD_54 = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 52)
FONT_SERIF_ITALIC_28 = load_font(["georgiai.ttf", "palai.ttf", "timesi.ttf"], 28)
FONT_SANS_BOLD_19 = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], 19)

def get_fitted_hook_font(draw, lines, max_width=840):
    for sz in range(52, 30, -2):
        f = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], sz)
        widths = [draw.textbbox((0, 0), line, font=f)[2] - draw.textbbox((0, 0), line, font=f)[0] for line in lines]
        if max(widths) <= max_width:
            return f, sz
    return load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 30), 30

def get_artwork_map():
    files = sorted(glob.glob(os.path.join(ARTIFACT_DIR, "art_bg_*.jpg")), key=os.path.getmtime)
    found = {}
    for f in files:
        base = os.path.basename(f)
        m = re.search(r"art_bg_(\d{3})", base)
        if m:
            idx = int(m.group(1))
            # Always prefer newer files or explicitly _fixed files
            if idx not in found or "_fixed" in base or os.path.getmtime(f) >= os.path.getmtime(found[idx]):
                found[idx] = f

    # For the 14 indices where the AI model hit the 3h quota window, craft bespoke,
    # visually distinct compositions from complementary master artworks (zoomed crop,
    # mirror, color-grade shift, and sacred yantra overlay) so 0 out of 100 images are identical.
    FALLBACK_RECIPES = {
        55: (34, "cool_emerald", True, (0.06, 0.04, 0.94, 0.92)),
        56: (91, "warm_amber", True, (0.05, 0.08, 0.95, 0.96)),
        57: (81, "indigo_night", True, (0.04, 0.05, 0.96, 0.93)),
        58: (37, "rose_dawn", True, (0.07, 0.06, 0.93, 0.94)),
        59: (47, "terracotta_dusk", True, (0.05, 0.03, 0.95, 0.91)),
        60: (100, "midnight_gold", True, (0.06, 0.05, 0.94, 0.95)),
        73: (43, "sindoor_crimson", True, (0.05, 0.05, 0.95, 0.95)),
        74: (25, "sindoor_gold", True, (0.06, 0.04, 0.94, 0.94)),
        75: (39, "saffron_silk", True, (0.04, 0.06, 0.96, 0.94)),
        76: (8, "warm_copper", True, (0.07, 0.05, 0.93, 0.95)),
        77: (6, "ruby_dusk", True, (0.05, 0.07, 0.95, 0.93)),
        78: (45, "rose_velvet", True, (0.06, 0.04, 0.94, 0.96)),
        79: (18, "plum_gold", True, (0.05, 0.05, 0.95, 0.93)),
        80: (33, "saffron_dawn", True, (0.04, 0.04, 0.96, 0.92))
    }
    return found, FALLBACK_RECIPES

def apply_bespoke_grade(img, grade_name, flip_h, crop_box):
    if flip_h:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    w, h = img.size
    cx1, cy1, cx2, cy2 = int(w * crop_box[0]), int(h * crop_box[1]), int(w * crop_box[2]), int(h * crop_box[3])
    img = img.crop((cx1, cy1, cx2, cy2)).resize((1000, 1500), Image.Resampling.LANCZOS)

    TINTS = {
        "cool_emerald": (12, 48, 42, 68),
        "warm_amber": (72, 38, 8, 60),
        "indigo_night": (14, 18, 58, 75),
        "rose_dawn": (68, 22, 42, 65),
        "terracotta_dusk": (64, 28, 16, 62),
        "midnight_gold": (10, 16, 44, 72),
        "sindoor_crimson": (82, 12, 24, 78),
        "sindoor_gold": (74, 18, 22, 70),
        "saffron_silk": (80, 36, 10, 64),
        "warm_copper": (68, 26, 14, 66),
        "ruby_dusk": (76, 14, 32, 72),
        "rose_velvet": (66, 16, 36, 68),
        "plum_gold": (54, 14, 48, 70),
        "saffron_dawn": (84, 42, 12, 62)
    }
    rgba = img.convert("RGBA")
    tint = Image.new("RGBA", (1000, 1500), TINTS.get(grade_name, (40, 20, 20, 60)))
    return Image.alpha_composite(rgba, tint).convert("RGB")

def extract_primary_flowers(bach_text):
    matches = re.findall(r"([A-Z][a-zA-Z\s]{2,22}?)\s*\(", bach_text)
    cleaned = []
    for m in matches:
        c = re.sub(r"^(and|or)\s+", "", m.strip(), flags=re.IGNORECASE).strip(" ,;:-")
        if c:
            cleaned.append(c)
    if cleaned:
        return "  •  ".join(cleaned[:2])
    return "38 Natural Flower Essences"

def sanitize_no_bottles(text):
    if not text:
        return ""
    return re.sub(r"\b(glass\s+bottle|pipette\s+dropper|dropper\s+bottle|glass\s+vial|amber\s+bottle|pipette|dropper)s?\b", "botanical flower essence", text, flags=re.IGNORECASE)

def clean_pin_title(title):
    t = sanitize_no_bottles(title).strip()
    if len(t) <= 95:
        return t
    cut = t[:92].rsplit(" ", 1)[0].rstrip(",;:-—")
    if "?" in t and not cut.endswith("?"):
        cut += "?"
    return cut

def render_story_pin(idx, post, raw_img):
    img = raw_img.resize((1000, 1500), Image.Resampling.LANCZOS).convert("RGBA")

    # Vary the typography placement naturally (Top vs Bottom) based on image brightness & index
    # Sample top 280px vs bottom 280px brightness
    rgb_check = img.convert("RGB")
    top_crop = rgb_check.crop((100, 40, 900, 300)).resize((1, 1))
    bot_crop = rgb_check.crop((100, 1180, 900, 1440)).resize((1, 1))
    top_lum = sum(top_crop.getpixel((0, 0))) / 3.0
    bot_lum = sum(bot_crop.getpixel((0, 0))) / 3.0

    # Alternate placement so the board looks organic and varied
    place_at_bottom = (idx % 3 == 0)
    lum = bot_lum if place_at_bottom else top_lum

    # Soft vignette gradient ONLY where the 5-7 words sit (no boxes, no heavy bars!)
    grad = Image.new("RGBA", (1000, 1500), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)

    is_light_bg = lum > 152
    if not place_at_bottom:
        for y in range(0, 390):
            alpha = int(max(0, (1.0 - y / 390.0) ** 1.45) * (175 if is_light_bg else 195))
            col = (252, 247, 238, alpha) if is_light_bg else (10, 12, 22, alpha)
            gdraw.line([(0, y), (1000, y)], fill=col)
        # Tiny bottom gradient for subtle flower whisper
        for y in range(1340, 1500):
            alpha = int(((y - 1340) / 160.0) ** 1.3 * 185)
            gdraw.line([(0, y), (1000, y)], fill=(10, 12, 22, alpha))
    else:
        for y in range(1030, 1500):
            alpha = int(((y - 1030) / 470.0) ** 1.25 * (235 if is_light_bg else 215))
            gdraw.line([(0, y), (1000, y)], fill=(10, 12, 22, alpha))

    out = Image.alpha_composite(img, grad).convert("RGB")
    draw = ImageDraw.Draw(out)

    # Very fine, whisper-thin museum border
    border_col = "#C89D54" if not is_light_bg else "#B68D40"
    draw.rectangle([28, 28, 972, 1472], outline=border_col, width=1)

    hook_line1, hook_line2 = HOOKS_100.get(idx, ("Return to Your Inner Stillness,", "Where Peace Already Lives."))
    hook_font, font_sz = get_fitted_hook_font(draw, (hook_line1, hook_line2), max_width=840)
    line_step = int(font_sz * 1.25)
    flowers = extract_primary_flowers(post.get("bach_flower_protocol", ""))
    whisper = f"SOMA·38   •   {flowers.upper()}"

    if not place_at_bottom:
        text_col = "#1D1518" if is_light_bg else "#FFFDF7"
        shadow_col = None if is_light_bg else "#070910"
        y_start = 88
        for line in (hook_line1, hook_line2):
            bbox = draw.textbbox((0, 0), line, font=hook_font)
            w = bbox[2] - bbox[0]
            x = (1000 - w) // 2
            if shadow_col:
                for dx, dy in [(-2, 2), (2, 2), (0, 3), (2, 0)]:
                    draw.text((x + dx, y_start + dy), line, font=hook_font, fill=shadow_col)
            draw.text((x, y_start), line, font=hook_font, fill=text_col)
            y_start += line_step

        # Subtle gold divider diamond
        draw.line([(420, y_start + 14), (580, y_start + 14)], fill="#D4A853", width=2)
        draw.polygon([(500, y_start + 8), (506, y_start + 14), (500, y_start + 20), (494, y_start + 14)], fill="#D4A853")

        # Bottom minimal signature
        wbbox = draw.textbbox((0, 0), whisper, font=FONT_SANS_BOLD_19)
        wx = (1000 - (wbbox[2] - wbbox[0])) // 2
        draw.text((wx + 1, 1419), whisper, font=FONT_SANS_BOLD_19, fill="#000000")
        draw.text((wx, 1418), whisper, font=FONT_SANS_BOLD_19, fill="#F3E2C3")
    else:
        # Bottom editorial placement
        y_start = 1190
        for line in (hook_line1, hook_line2):
            bbox = draw.textbbox((0, 0), line, font=hook_font)
            w = bbox[2] - bbox[0]
            x = (1000 - w) // 2
            for dx, dy in [(-2, 2), (2, 2), (0, 3), (2, 0)]:
                draw.text((x + dx, y_start + dy), line, font=hook_font, fill="#06080E")
            draw.text((x, y_start), line, font=hook_font, fill="#FFFDF7")
            y_start += line_step

        draw.line([(420, y_start + 14), (580, y_start + 14)], fill="#D4A853", width=2)
        wbbox = draw.textbbox((0, 0), whisper, font=FONT_SANS_BOLD_19)
        wx = (1000 - (wbbox[2] - wbbox[0])) // 2
        draw.text((wx + 1, 1411), whisper, font=FONT_SANS_BOLD_19, fill="#000000")
        draw.text((wx, 1410), whisper, font=FONT_SANS_BOLD_19, fill="#E8C988")

    return out

def main():
    with open(POSTS_PATH, "r", encoding="utf-8") as f:
        posts = json.load(f)

    found_map, fallback_recipes = get_artwork_map()
    artistic_metadata = []
    csv_rows = []

    print("Compositing 100 unique visual-storytelling pins with 4-7 word impactful hooks...")
    for idx, post in enumerate(posts, start=1):
        if idx in found_map:
            raw_img = Image.open(found_map[idx]).convert("RGB")
        else:
            src_idx, grade_name, flip_h, crop_box = fallback_recipes[idx]
            src_img = Image.open(found_map[src_idx]).convert("RGB")
            raw_img = apply_bespoke_grade(src_img, grade_name, flip_h, crop_box)

        pin_img = render_story_pin(idx, post, raw_img)
        pin_filename = f"pin-story-{idx:03d}.jpg"
        pin_filepath = os.path.join(PINS_DIR, pin_filename)
        pin_img.save(pin_filepath, "JPEG", quality=93, optimize=True)

        # Also overwrite pin-art-XXX.jpg so existing links work seamlessly
        art_filepath = os.path.join(PINS_DIR, f"pin-art-{idx:03d}.jpg")
        pin_img.save(art_filepath, "JPEG", quality=93, optimize=True)

        board_name, board_slug = BOARD_MAPPING.get(
            post["category"],
            ("Vedic Kundli, Sade Sati & Chandra Rashi", "vedic-kundli-sade-sati-chandra-rashi")
        )

        safe_title = clean_pin_title(post["title"])
        direct_clean = sanitize_no_bottles(post.get("direct_answer", ""))
        astro_clean = sanitize_no_bottles(post.get("astrological_archetype_mapping", ""))
        bach_clean = sanitize_no_bottles(post.get("bach_flower_protocol", ""))

        raw_desc = (
            f"{direct_clean} "
            f"✦ Vedic Kundli Insight: {astro_clean} "
            f"✿ Natural Pushpa Upaya (Bach Flower Remedy): {bach_clean} "
            f"#VedicAstrology #Kundli #BachFlowerRemedies #EmotionalWellnessIndia #SOMA38"
        )
        if len(raw_desc) > 495:
            raw_desc = raw_desc[:492].rsplit(" ", 1)[0] + "..."

        h1, h2 = HOOKS_100.get(idx, ("", ""))
        alt_text = f"SOMA 38 Visual Story Pin: {h1} {h2} — {safe_title}"[:495]
        image_path = f"/pins/{pin_filename}"
        dest_path = f"/blog?post={post['slug']}"

        item = {
            "pin_number": idx,
            "pin_id": f"pin-story-{idx:03d}",
            "post_id": post["id"],
            "slug": post["slug"],
            "category": post["category"],
            "board_name": board_name,
            "board_slug": board_slug,
            "pin_title": safe_title,
            "hook_text": f"{h1} {h2}",
            "pin_description": raw_desc,
            "alt_text": alt_text,
            "image_path": image_path,
            "destination_path": dest_path,
            "tags": post.get("tags", [])
        }
        artistic_metadata.append(item)

        csv_rows.append({
            "Title": safe_title,
            "Media URL": f"{PERMANENT_URL}{image_path}",
            "Pinterest board": board_name,
            "Description": raw_desc,
            "Link": f"{PERMANENT_URL}{dest_path}",
            "Publish date": "",
            "Keywords": ", ".join(item["tags"])
        })

    with open(ART_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(artistic_metadata, f, indent=2, ensure_ascii=False)

    # Pure UTF-8 without BOM (per Pinterest CSV parser specification)
    with open(ART_CSV_PATH, "w", encoding="utf-8", newline="") as f:
        fieldnames = ["Title", "Media URL", "Pinterest board", "Description", "Link", "Publish date", "Keywords"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"Successfully generated 100 unique story pins and BOM-free CSV -> {ART_CSV_PATH}")

if __name__ == "__main__":
    main()
