import os
import json
import csv
import re
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\bpupp\.gemini\antigravity\brain\de274ffa-3ffc-49ad-9ba6-8134f7300dd0"
BASE_DIR = r"C:\Users\bpupp\.gemini\antigravity\scratch\soma_india_engine"
POSTS_PATH = os.path.join(BASE_DIR, "data", "reset_blog_100_posts.json")
ART_JSON_PATH = os.path.join(BASE_DIR, "data", "pinterest_100_artistic_pins.json")
PINS_DIR = os.path.join(BASE_DIR, "public", "pins")
ART_CSV_PATH = os.path.join(PINS_DIR, "soma38_pinterest_100_artistic_pins.csv")
LOGO_PATH = os.path.join(BASE_DIR, "public", "soma38_logo_horizontal.png")

os.makedirs(PINS_DIR, exist_ok=True)

BOARD_MAPPING = {
    'Parivar Pressure, In-Laws & "Log Kya Kahenge"': "shadow-work-indian-family-boundaries",
    "Nazar, Energy Drain & Emotional Boundaries": "shadow-work-indian-family-boundaries",
    "Corporate Burnout, IT Stress & Eldest-Child Burden": "shadow-work-indian-family-boundaries",
    "Vedic Transits, Sade Sati & Graha Karma": "vedic-kundli-sade-sati-chandra-rashi",
    "Spiritual Confusion, Puja Guilt & Inner Peace": "vedic-kundli-sade-sati-chandra-rashi",
    "Swadharma, Career Hesitation & Self-Doubt": "vedic-kundli-sade-sati-chandra-rashi",
    "Body Stress, 3 AM Insomnia & Gut-Mind Blocks": "bach-flower-remedies-pushpa-upaya",
    "Ghabrahat, Sudden Panic & Unspoken Trauma": "bach-flower-remedies-pushpa-upaya",
    "Gen-Z India, Exam Pressure & Career Anxiety": "bach-flower-remedies-pushpa-upaya",
    "Rishta Confusion, Heartbreak & Marriage Synastry": "marriage-rishta-relationship-synastry"
}

STYLE_THEMES = {
    "vedic-kundli-sade-sati-chandra-rashi": {
        "board_name": "Vedic Kundli, Sade Sati & Chandra Rashi",
        "board_label": "VEDIC KUNDLI  •  SADE SATI  •  CHANDRA RASHI",
        "bg_file": os.path.join(ARTIFACT_DIR, "soma38_art_style1_kundli_1793463545441.jpg"),
        "theme": "dark",
        "title_color": "#FFF8E7",
        "accent_color": "#E5C158",
        "sub_color": "#F3E5C8",
        "pill_bg": "#151F38",
        "pill_border": "#D4A853",
        "cta_bg": "#D4A853",
        "cta_text": "#0B1021",
        "cta_label": "READ FULL KUNDLI & PUSHPA UPAYA GUIDE  •  SOMA·38"
    },
    "bach-flower-remedies-pushpa-upaya": {
        "board_name": "Bach Flower Remedies (Pushpa Upaya)",
        "board_label": "BACH FLOWER REMEDIES (PUSHPA UPAYA)",
        "bg_file": os.path.join(ARTIFACT_DIR, "soma38_art_style2_botanical_1793463561588.jpg"),
        "theme": "light",
        "title_color": "#23171B",
        "accent_color": "#8B162B",
        "sub_color": "#4E3A2A",
        "pill_bg": "#F9EFE0",
        "pill_border": "#B8860B",
        "cta_bg": "#8B162B",
        "cta_text": "#FFFDF7",
        "cta_label": "DISCOVER YOUR 38 FLOWER REMEDY MATCH  •  SOMA·38"
    },
    "marriage-rishta-relationship-synastry": {
        "board_name": "Marriage, Rishta & Relationship Synastry",
        "board_label": "MARRIAGE, RISHTA & RELATIONSHIP SYNASTRY",
        "bg_file": os.path.join(ARTIFACT_DIR, "soma38_art_style3_synastry_1793463578851.jpg"),
        "theme": "dark_warm",
        "title_color": "#FFF9F2",
        "accent_color": "#FAD691",
        "sub_color": "#2E151B",
        "pill_bg": "#4A121E",
        "pill_border": "#E5B869",
        "cta_bg": "#4A121E",
        "cta_text": "#FFF9F2",
        "cta_label": "CHECK YOUR RELATIONSHIP SYNASTRY  •  SOMA·38"
    },
    "shadow-work-indian-family-boundaries": {
        "board_name": "Shadow Work & Indian Family Boundaries",
        "board_label": "SHADOW WORK & INDIAN FAMILY BOUNDARIES",
        "bg_file": os.path.join(ARTIFACT_DIR, "soma38_art_style4_shadow_1793463597339.jpg"),
        "theme": "travertine",
        "title_color": "#1E1815",
        "accent_color": "#7A4918",
        "sub_color": "#2B211B",
        "pill_bg": "#F4EBDC",
        "pill_border": "#B68D40",
        "cta_bg": "#231B16",
        "cta_text": "#F9F3E8",
        "cta_label": "READ THE EMOTIONAL BOUNDARY GUIDE  •  SOMA·38"
    }
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

FONT_SERIF_BOLD_48 = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 46)
FONT_SERIF_BOLD_40 = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 39)
FONT_SERIF_ITALIC_25 = load_font(["georgiai.ttf", "palai.ttf", "timesi.ttf"], 25)
FONT_SANS_BOLD_19 = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], 19)
FONT_SANS_BOLD_21 = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], 21)

def sanitize_no_bottles(text):
    if not text:
        return ""
    return re.sub(r"\b(glass\s+bottle|pipette\s+dropper|dropper\s+bottle|glass\s+vial|amber\s+bottle|pipette|dropper)s?\b", "botanical flower essence", text, flags=re.IGNORECASE)

def clean_pin_title(title):
    t = sanitize_no_bottles(title).strip()
    if len(t) <= 95:
        return t
    # Shorten cleanly at punctuation or word boundary under 95 chars so Pinterest CSV never truncates mid-word
    cut = t[:92].rsplit(" ", 1)[0].rstrip(",;:-—")
    if "?" in t and not cut.endswith("?"):
        cut += "?"
    return cut

def wrap_centered(draw, text, font, max_width, max_lines=3):
    words = text.split()
    lines = []
    curr = ""
    for w in words:
        test = (curr + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            curr = test
        else:
            if curr:
                lines.append(curr)
            curr = w
            if len(lines) >= max_lines:
                break
    if curr and len(lines) < max_lines:
        lines.append(curr)
    elif curr and len(lines) == max_lines:
        if not lines[-1].endswith(("?", ".", "…")):
            lines[-1] = lines[-1].rstrip(",;:-") + "…"
    return lines

def extract_flower_names(bach_text):
    # Extract flower remedy names (capitalized words before parentheses)
    matches = re.findall(r"([A-Z][a-zA-Z\s]{2,22}?)\s*\(", bach_text)
    cleaned = []
    for m in matches:
        c = re.sub(r"^(and|or)\s+", "", m.strip(), flags=re.IGNORECASE).strip(" ,;:-")
        if c:
            cleaned.append(c)
    if cleaned:
        return "  •  ".join(cleaned[:3]) + " Botanical Essences"
    return bach_text[:72].rsplit(" ", 1)[0]

def main():
    with open(POSTS_PATH, "r", encoding="utf-8") as f:
        posts = json.load(f)

    # Pre-load and resize the 4 master artworks + copy to public/pins/art-bg-*.jpg
    bg_cache = {}
    for slug, cfg in STYLE_THEMES.items():
        base_img = Image.open(cfg["bg_file"]).convert("RGBA").resize((1000, 1500), Image.Resampling.LANCZOS)
        overlay = Image.new("RGBA", (1000, 1500), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        if cfg["theme"] == "travertine":
            odraw.rectangle([0, 0, 1000, 355], fill=(244, 235, 220, 222))
            odraw.rectangle([0, 1190, 1000, 1500], fill=(244, 235, 220, 230))
        elif cfg["theme"] == "light":
            odraw.rectangle([0, 0, 1000, 345], fill=(252, 246, 234, 218))
            odraw.rectangle([0, 1180, 1000, 1500], fill=(252, 246, 234, 225))
        elif cfg["theme"] == "dark_warm":
            odraw.rectangle([0, 0, 1000, 355], fill=(58, 12, 23, 145))
            odraw.rectangle([0, 1185, 1000, 1500], fill=(253, 244, 232, 232))
        elif cfg["theme"] == "dark":
            odraw.rectangle([0, 0, 1000, 350], fill=(9, 14, 29, 165))
            odraw.rectangle([0, 1185, 1000, 1500], fill=(9, 14, 29, 195))

        composited_bg = Image.alpha_composite(base_img, overlay).convert("RGB")
        bg_cache[slug] = composited_bg

    artistic_metadata = []
    csv_rows = []

    print(f"Generating 100 Artistic Scroll-Stopper Pins (1000x1500) in {PINS_DIR}...")
    for idx, post in enumerate(posts, start=1):
        board_slug = BOARD_MAPPING.get(post["category"], "vedic-kundli-sade-sati-chandra-rashi")
        cfg = STYLE_THEMES[board_slug]

        img = bg_cache[board_slug].copy()
        draw = ImageDraw.Draw(img)

        # Delicate outer gold frame
        draw.rectangle([24, 24, 976, 1476], outline=cfg["pill_border"], width=2)

        # Top Board Pill
        label = cfg["board_label"]
        lb_bbox = draw.textbbox((0, 0), label, font=FONT_SANS_BOLD_19)
        lb_w = lb_bbox[2] - lb_bbox[0] + 44
        lb_x1 = (1000 - lb_w) // 2
        draw.rounded_rectangle([lb_x1, 48, lb_x1 + lb_w, 92], radius=22, fill=cfg["pill_bg"], outline=cfg["pill_border"], width=2)
        draw.text((lb_x1 + 22, 58), label, font=FONT_SANS_BOLD_19, fill=cfg["accent_color"])

        # Top Editorial Headline
        raw_title = sanitize_no_bottles(post["title"])
        font_h = FONT_SERIF_BOLD_48 if len(raw_title) < 68 else FONT_SERIF_BOLD_40
        line_h = 56 if len(raw_title) < 68 else 48
        h_lines = wrap_centered(draw, raw_title, font_h, 860, max_lines=4)

        shadow_col = "#000000" if cfg["theme"] in ("dark", "dark_warm") else None
        y_curr = 114 if len(h_lines) >= 4 else 128
        for line in h_lines:
            bbox = draw.textbbox((0, 0), line, font=font_h)
            w = bbox[2] - bbox[0]
            x = (1000 - w) // 2
            if shadow_col:
                draw.text((x + 2, y_curr + 2), line, font=font_h, fill=shadow_col)
            draw.text((x, y_curr), line, font=font_h, fill=cfg["title_color"])
            y_curr += line_h

        # Bottom Subtext: Line 1 = Kundli Signature, Line 2 = Natural Flower Essences
        astro_short = sanitize_no_bottles(post.get("astrological_archetype_mapping", "")).rstrip(".")
        if len(astro_short) > 64:
            astro_short = astro_short[:62].rsplit(" ", 1)[0] + "…"
        flower_short = extract_flower_names(sanitize_no_bottles(post.get("bach_flower_protocol", "")))

        sub_lines = [astro_short, f"Natural Pushpa Upaya: {flower_short}"]
        sub_shadow = "#000000" if cfg["theme"] == "dark" else None
        sy = 1230
        for sline in sub_lines:
            bbox = draw.textbbox((0, 0), sline, font=FONT_SERIF_ITALIC_25)
            w = bbox[2] - bbox[0]
            x = (1000 - w) // 2
            if sub_shadow:
                draw.text((x + 2, sy + 2), sline, font=FONT_SERIF_ITALIC_25, fill=sub_shadow)
            draw.text((x, sy), sline, font=FONT_SERIF_ITALIC_25, fill=cfg["sub_color"])
            sy += 42

        # Bottom CTA Button
        draw.rounded_rectangle([76, 1364, 924, 1434], radius=35, fill=cfg["cta_bg"], outline=cfg["pill_border"], width=2)
        cta_bbox = draw.textbbox((0, 0), cfg["cta_label"], font=FONT_SANS_BOLD_21)
        cta_w = cta_bbox[2] - cta_bbox[0]
        draw.text(((1000 - cta_w) // 2, 1386), cfg["cta_label"], font=FONT_SANS_BOLD_21, fill=cfg["cta_text"])

        pin_filename = f"pin-art-{idx:03d}.jpg"
        pin_filepath = os.path.join(PINS_DIR, pin_filename)
        img.save(pin_filepath, "JPEG", quality=93, optimize=True)

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

        alt_text = (
            f"SOMA 38 Artistic Pinterest Guide for {safe_title}. "
            f"Features Vedic Kundli geometry and natural Bach flower remedies for {cfg['board_name']}."
        )[:495]

        image_path = f"/pins/{pin_filename}"
        dest_path = f"/blog?post={post['slug']}&v=art"

        item = {
            "pin_number": idx,
            "pin_id": f"pin-art-{idx:03d}",
            "post_id": post["id"],
            "slug": post["slug"],
            "category": post["category"],
            "board_name": cfg["board_name"],
            "board_slug": board_slug,
            "pin_title": safe_title,
            "pin_description": raw_desc,
            "alt_text": alt_text,
            "remedy_headline": flower_short,
            "image_path": image_path,
            "destination_path": dest_path,
            "tags": post.get("tags", [])
        }
        artistic_metadata.append(item)

        csv_rows.append({
            "Title": safe_title,
            "Media URL": f"https://inn-closest-coupons-flood.trycloudflare.com{image_path}",
            "Pinterest board": cfg["board_name"],
            "Description": raw_desc,
            "Link": f"https://inn-closest-coupons-flood.trycloudflare.com{dest_path}",
            "Publish date": "",
            "Keywords": ", ".join(item["tags"])
        })

    with open(ART_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(artistic_metadata, f, indent=2, ensure_ascii=False)

    with open(ART_CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        fieldnames = ["Title", "Media URL", "Pinterest board", "Description", "Link", "Publish date", "Keywords"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"Successfully generated 100 Artistic Scroll-Stopper Pins, {ART_JSON_PATH}, and {ART_CSV_PATH}!")

if __name__ == "__main__":
    main()
