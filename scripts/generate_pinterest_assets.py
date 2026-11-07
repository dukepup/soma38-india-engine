import os
import json
import csv
import math
import re
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"C:\Users\bpupp\.gemini\antigravity\scratch\soma_india_engine"
POSTS_PATH = os.path.join(BASE_DIR, "data", "reset_blog_100_posts.json")
PINS_JSON_PATH = os.path.join(BASE_DIR, "data", "pinterest_100_pins.json")
PINS_DIR = os.path.join(BASE_DIR, "public", "pins")
CSV_PATH = os.path.join(PINS_DIR, "soma38_pinterest_100_pins.csv")
LOGO_PATH = os.path.join(BASE_DIR, "public", "soma38_logo_horizontal.png")

os.makedirs(PINS_DIR, exist_ok=True)

# 4 Pinterest Boards Mapping
BOARD_MAPPING = {
    'Parivar Pressure, In-Laws & "Log Kya Kahenge"': {
        "board_name": "Shadow Work & Indian Family Boundaries",
        "board_slug": "shadow-work-indian-family-boundaries",
        "accent": "#9E1B32",
        "badge_bg": "#FDECEC",
        "badge_text": "#8B162B",
        "motif": "lotus"
    },
    "Nazar, Energy Drain & Emotional Boundaries": {
        "board_name": "Shadow Work & Indian Family Boundaries",
        "board_slug": "shadow-work-indian-family-boundaries",
        "accent": "#9E1B32",
        "badge_bg": "#FDECEC",
        "badge_text": "#8B162B",
        "motif": "lotus"
    },
    "Corporate Burnout, IT Stress & Eldest-Child Burden": {
        "board_name": "Shadow Work & Indian Family Boundaries",
        "board_slug": "shadow-work-indian-family-boundaries",
        "accent": "#9E1B32",
        "badge_bg": "#FDECEC",
        "badge_text": "#8B162B",
        "motif": "lotus"
    },
    "Vedic Transits, Sade Sati & Graha Karma": {
        "board_name": "Vedic Kundli, Sade Sati & Chandra Rashi",
        "board_slug": "vedic-kundli-sade-sati-chandra-rashi",
        "accent": "#B45309",
        "badge_bg": "#FEF3C7",
        "badge_text": "#92400E",
        "motif": "chandra"
    },
    "Spiritual Confusion, Puja Guilt & Inner Peace": {
        "board_name": "Vedic Kundli, Sade Sati & Chandra Rashi",
        "board_slug": "vedic-kundli-sade-sati-chandra-rashi",
        "accent": "#B45309",
        "badge_bg": "#FEF3C7",
        "badge_text": "#92400E",
        "motif": "chandra"
    },
    "Swadharma, Career Hesitation & Self-Doubt": {
        "board_name": "Vedic Kundli, Sade Sati & Chandra Rashi",
        "board_slug": "vedic-kundli-sade-sati-chandra-rashi",
        "accent": "#B45309",
        "badge_bg": "#FEF3C7",
        "badge_text": "#92400E",
        "motif": "chandra"
    },
    "Body Stress, 3 AM Insomnia & Gut-Mind Blocks": {
        "board_name": "Bach Flower Remedies (Pushpa Upaya)",
        "board_slug": "bach-flower-remedies-pushpa-upaya",
        "accent": "#854D0E",
        "badge_bg": "#FEF9C3",
        "badge_text": "#713F12",
        "motif": "botanical"
    },
    "Ghabrahat, Sudden Panic & Unspoken Trauma": {
        "board_name": "Bach Flower Remedies (Pushpa Upaya)",
        "board_slug": "bach-flower-remedies-pushpa-upaya",
        "accent": "#854D0E",
        "badge_bg": "#FEF9C3",
        "badge_text": "#713F12",
        "motif": "botanical"
    },
    "Gen-Z India, Exam Pressure & Career Anxiety": {
        "board_name": "Bach Flower Remedies (Pushpa Upaya)",
        "board_slug": "bach-flower-remedies-pushpa-upaya",
        "accent": "#854D0E",
        "badge_bg": "#FEF9C3",
        "badge_text": "#713F12",
        "motif": "botanical"
    },
    "Rishta Confusion, Heartbreak & Marriage Synastry": {
        "board_name": "Marriage, Rishta & Relationship Synastry",
        "board_slug": "marriage-rishta-relationship-synastry",
        "accent": "#9D174D",
        "badge_bg": "#FCE7F3",
        "badge_text": "#831843",
        "motif": "synastry"
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

FONT_SERIF_BOLD_46 = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 44)
FONT_SERIF_BOLD_38 = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 37)
FONT_SERIF_ITALIC_24 = load_font(["georgiai.ttf", "palai.ttf", "timesi.ttf"], 24)
FONT_SANS_BOLD_20 = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], 20)
FONT_SANS_BOLD_22 = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], 22)
FONT_SANS_BOLD_24 = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], 24)
FONT_SANS_REG_23 = load_font(["segoeui.ttf", "arial.ttf", "calibri.ttf"], 23)
FONT_SANS_REG_21 = load_font(["segoeui.ttf", "arial.ttf", "calibri.ttf"], 21)
FONT_SANS_ITALIC_21 = load_font(["segoeuii.ttf", "ariali.ttf", "calibrii.ttf"], 21)
FONT_DEVANAGARI_20 = load_font(["NirmalaB.ttf", "Nirmala.ttf", "aparaj.ttf"], 20)

def sanitize_no_bottles(text):
    if not text:
        return ""
    # Strictly ensure zero mentions of glass/pipette dropper bottles per user rule
    cleaned = re.sub(r"\b(glass\s+bottle|pipette\s+dropper|dropper\s+bottle|glass\s+vial|amber\s+bottle|pipette|dropper)s?\b", "botanical flower essence", text, flags=re.IGNORECASE)
    return cleaned

def wrap_text_lines(draw, text, font, max_width, max_lines=None):
    words = text.split()
    lines = []
    current = ""
    for w in words:
        test = (current + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        w_px = bbox[2] - bbox[0]
        if w_px <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = w
            if max_lines and len(lines) >= max_lines:
                break
    if current and (not max_lines or len(lines) < max_lines):
        lines.append(current)
    elif current and max_lines and len(lines) == max_lines:
        if not lines[-1].endswith("…"):
            lines[-1] = lines[-1].rstrip(".,;:") + "…"
    return lines

def draw_sacred_botanical_divider(draw, cx, cy, motif="lotus", color="#C89D54", accent="#9E1B32"):
    # Horizontal fine brass lines
    draw.line([(90, cy), (cx - 110, cy)], fill=color, width=2)
    draw.line([(cx + 110, cy), (910, cy)], fill=color, width=2)
    # Small diamond terminals
    for dx in [cx - 110, cx + 110]:
        draw.polygon([(dx, cy - 5), (dx + 5, cy), (dx, cy + 5), (dx - 5, cy)], fill=accent)

    # Central sacred botanical flower geometry (100% botanical & Vedic geometry, zero bottles)
    # Outer ring
    r_outer = 28
    draw.ellipse([cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer], outline=color, width=2)
    # 8-petal lotus / Pushpa blossom around center
    for i in range(8):
        ang = i * (math.pi / 4.0)
        px = cx + math.cos(ang) * 18
        py = cy + math.sin(ang) * 18
        tx = cx + math.cos(ang) * 36
        ty = cy + math.sin(ang) * 36
        lx = cx + math.cos(ang - 0.28) * 22
        ly = cy + math.sin(ang - 0.28) * 22
        rx = cx + math.cos(ang + 0.28) * 22
        ry = cy + math.sin(ang + 0.28) * 22
        draw.polygon([(cx + math.cos(ang)*8, cy + math.sin(ang)*8), (lx, ly), (tx, ty), (rx, ry)], outline=color, fill="#FFF9EE")
    # Center Bindu
    draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=accent)

def draw_corner_ornaments(draw, w, h, color="#D4A853"):
    # Subtle Vedic temple corner brackets
    m = 32
    L = 42
    # Top-Left
    draw.line([(m, m), (m + L, m)], fill=color, width=3)
    draw.line([(m, m), (m, m + L)], fill=color, width=3)
    draw.ellipse([m + 6, m + 6, m + 14, m + 14], outline=color, width=2)
    # Top-Right
    draw.line([(w - m - L, m), (w - m, m)], fill=color, width=3)
    draw.line([(w - m, m), (w - m, m + L)], fill=color, width=3)
    draw.ellipse([w - m - 14, m + 6, w - m - 6, m + 14], outline=color, width=2)
    # Bottom-Left
    draw.line([(m, h - m), (m + L, h - m)], fill=color, width=3)
    draw.line([(m, h - m - L), (m, h - m)], fill=color, width=3)
    draw.ellipse([m + 6, h - m - 14, m + 14, h - m - 6], outline=color, width=2)
    # Bottom-Right
    draw.line([(w - m - L, h - m), (w - m, h - m)], fill=color, width=3)
    draw.line([(w - m, h - m - L), (w - m, h - m)], fill=color, width=3)
    draw.ellipse([w - m - 14, h - m - 14, w - m - 6, h - m - 6], outline=color, width=2)

def extract_remedy_headline(bach_text):
    # Extract the primary flower remedy name(s) cleanly
    m = re.match(r"^([A-Za-z\s]+?)\s*\(([^)]+)\)", bach_text.strip())
    if m:
        return f"{m.group(1).strip()} ({m.group(2).strip()})"
    return bach_text.split(":")[0].strip()[:60]

def generate_pin_image(post, index, logo_img):
    W, H = 1000, 1500
    # Warm Mysore Sandalwood & Ivory Paper background
    img = Image.new("RGB", (W, H), "#FFFDF7")
    draw = ImageDraw.Draw(img)

    board_cfg = BOARD_MAPPING.get(post["category"], {
        "board_name": "Vedic Kundli, Sade Sati & Chandra Rashi",
        "board_slug": "vedic-kundli-sade-sati-chandra-rashi",
        "accent": "#9E1B32",
        "badge_bg": "#FDECEC",
        "badge_text": "#8B162B",
        "motif": "lotus"
    })
    accent = board_cfg["accent"]

    # Outer double sacred frame
    draw.rectangle([22, 22, W - 22, H - 22], outline="#E6D5B8", width=2)
    draw.rectangle([32, 32, W - 32, H - 32], outline="#D4A853", width=2)
    draw_corner_ornaments(draw, W, H, "#C89D54")

    # 1. Top Brand Logo + Guide Number Pill
    if logo_img:
        logo_target_h = 88
        aspect = logo_img.width / logo_img.height
        logo_target_w = int(logo_target_h * aspect)
        resized_logo = logo_img.resize((logo_target_w, logo_target_h), Image.Resampling.LANCZOS)
        img.paste(resized_logo, (68, 56), resized_logo)

    # Right top guide badge
    guide_badge_text = f"GUIDE #{index:03d}  •  {post.get('reading_time_min', 4)} MIN READ"
    gb_bbox = draw.textbbox((0, 0), guide_badge_text, font=FONT_SANS_BOLD_20)
    gb_w = gb_bbox[2] - gb_bbox[0] + 36
    gb_x1 = W - 68 - gb_w
    draw.rounded_rectangle([gb_x1, 74, W - 68, 120], radius=23, fill="#FAF1E2", outline="#D4A853", width=1)
    draw.text((gb_x1 + 18, 84), guide_badge_text, fill="#6B4F28", font=FONT_SANS_BOLD_20)

    # Category Pill Badge
    cat_text = post["category"].upper()
    cat_bbox = draw.textbbox((0, 0), cat_text, font=FONT_SANS_BOLD_20)
    cat_w = min(W - 136, cat_bbox[2] - cat_bbox[0] + 44)
    draw.rounded_rectangle([68, 164, 68 + cat_w, 212], radius=24, fill=board_cfg["badge_bg"], outline=accent, width=1)
    draw.text((90, 175), cat_text, fill=board_cfg["badge_text"], font=FONT_SANS_BOLD_20)

    # 2. Main Editorial Headline (High-Contrast Quiet Luxury Serif)
    title_clean = sanitize_no_bottles(post["title"])
    font_title = FONT_SERIF_BOLD_46 if len(title_clean) < 72 else FONT_SERIF_BOLD_38
    line_h_title = 56 if len(title_clean) < 72 else 48
    title_lines = wrap_text_lines(draw, title_clean, font_title, W - 136, max_lines=4)

    curr_y = 236
    for line in title_lines:
        draw.text((68, curr_y), line, fill="#1F161A", font=font_title)
        curr_y += line_h_title

    # 3. Sacred Botanical & Chandra Geometry Divider (Zero bottles)
    divider_y = max(curr_y + 28, 438)
    draw_sacred_botanical_divider(draw, W // 2, divider_y, motif=board_cfg["motif"], color="#C89D54", accent=accent)

    # 4. Direct Somatic & Vedic Insight Box
    box1_y1 = divider_y + 42
    direct_ans = sanitize_no_bottles(post.get("direct_answer", ""))
    ans_lines = wrap_text_lines(draw, direct_ans, FONT_SANS_REG_23, W - 200, max_lines=5)
    box1_h = 68 + len(ans_lines) * 34 + 24
    box1_y2 = box1_y1 + box1_h

    draw.rounded_rectangle([68, box1_y1, W - 68, box1_y2], radius=18, fill="#FFF9F0", outline="#E7D4B5", width=2)
    # Left accent bar
    draw.rounded_rectangle([68, box1_y1, 80, box1_y2], radius=6, fill="#E85D04")
    draw.text((102, box1_y1 + 20), "PRATYAKSHA INSIGHT  •  DIRECT EMOTIONAL TRUTH", fill="#B45309", font=FONT_SANS_BOLD_20)

    ty = box1_y1 + 56
    for line in ans_lines:
        draw.text((102, ty), line, fill="#2B2125", font=FONT_SANS_REG_23)
        ty += 34

    # 5. Dual Pillar Cards: [Vedic Kundli Signature] + [Pushpa Upaya (38 Flower Remedies)]
    cards_y1 = box1_y2 + 24
    astro_text = sanitize_no_bottles(post.get("astrological_archetype_mapping", ""))
    bach_text = sanitize_no_bottles(post.get("bach_flower_protocol", ""))

    astro_lines = wrap_text_lines(draw, astro_text, FONT_SANS_REG_21, W - 200, max_lines=4)
    bach_lines = wrap_text_lines(draw, bach_text, FONT_SANS_REG_21, W - 200, max_lines=4)

    # Card A: Vedic Kundli Signature
    cardA_h = 58 + len(astro_lines) * 31 + 20
    cardA_y2 = cards_y1 + cardA_h
    draw.rounded_rectangle([68, cards_y1, W - 68, cardA_y2], radius=16, fill="#FBF5E9", outline="#D4A853", width=2)
    draw.polygon([(98, cards_y1 + 24), (104, cards_y1 + 30), (98, cards_y1 + 36), (92, cards_y1 + 30)], fill="#854D0E")
    draw.text((114, cards_y1 + 18), "VEDIC KUNDLI & GRAHA ARCHETYPE", fill="#854D0E", font=FONT_SANS_BOLD_20)
    ay = cards_y1 + 52
    for line in astro_lines:
        draw.text((96, ay), line, fill="#33261E", font=FONT_SANS_REG_21)
        ay += 31

    # Card B: Natural Pushpa Upaya (38 Flower Remedies - Botanical Focus)
    cardB_y1 = cardA_y2 + 22
    cardB_h = 58 + len(bach_lines) * 31 + 20
    cardB_y2 = cardB_y1 + cardB_h
    draw.rounded_rectangle([68, cardB_y1, W - 68, cardB_y2], radius=16, fill="#FDF2F4", outline=accent, width=2)
    draw.polygon([(98, cardB_y1 + 24), (104, cardB_y1 + 30), (98, cardB_y1 + 36), (92, cardB_y1 + 30)], fill=accent)
    draw.text((114, cardB_y1 + 18), "NATURAL PUSHPA UPAYA (BACH FLOWER BOTANICALS)", fill=accent, font=FONT_SANS_BOLD_20)
    by = cardB_y1 + 52
    for line in bach_lines:
        draw.text((96, by), line, fill="#2F1920", font=FONT_SANS_REG_21)
        by += 31

    # 6. Daily Sankalpa Action Strip
    sankalpa_y1 = cardB_y2 + 22
    sankalpa_text = sanitize_no_bottles(post.get("sovereign_action_directive", ""))
    sankalpa_lines = wrap_text_lines(draw, sankalpa_text, FONT_SANS_ITALIC_21, W - 200, max_lines=3)
    sankalpa_h = 54 + len(sankalpa_lines) * 30 + 18
    sankalpa_y2 = min(sankalpa_y1 + sankalpa_h, 1345)

    draw.rounded_rectangle([68, sankalpa_y1, W - 68, sankalpa_y2], radius=16, fill="#F5EFE4", outline="#C89D54", width=1)
    draw.polygon([(98, sankalpa_y1 + 22), (104, sankalpa_y1 + 28), (98, sankalpa_y1 + 34), (92, sankalpa_y1 + 28)], fill="#6B4F28")
    draw.text((114, sankalpa_y1 + 16), "DAILY SANKALPA PRACTICE (NO RITUAL FEAR)", fill="#6B4F28", font=FONT_SANS_BOLD_20)
    sy = sankalpa_y1 + 48
    for line in sankalpa_lines:
        if sy + 26 < sankalpa_y2:
            draw.text((96, sy), line, fill="#3D2E1E", font=FONT_SANS_ITALIC_21)
            sy += 30

    # 7. Bottom Call-To-Action Footer Pill
    footer_y1 = 1368
    footer_y2 = 1442
    draw.rounded_rectangle([68, footer_y1, W - 68, footer_y2], radius=37, fill=accent)
    cta_text = "READ FULL GUIDE & CHECK YOUR VEDIC KUNDLI  •  SOMA·38"
    cta_bbox = draw.textbbox((0, 0), cta_text, font=FONT_SANS_BOLD_22)
    cta_w = cta_bbox[2] - cta_bbox[0]
    draw.text(((W - cta_w) // 2, footer_y1 + 23), cta_text, fill="#FFFDF7", font=FONT_SANS_BOLD_22)

    pin_filename = f"pin-{index:03d}.jpg"
    pin_filepath = os.path.join(PINS_DIR, pin_filename)
    img.save(pin_filepath, "JPEG", quality=93, optimize=True)
    return pin_filename, board_cfg

def main():
    with open(POSTS_PATH, "r", encoding="utf-8") as f:
        posts = json.load(f)

    logo_img = None
    if os.path.exists(LOGO_PATH):
        logo_img = Image.open(LOGO_PATH).convert("RGBA")

    pins_metadata = []
    csv_rows = []

    print(f"Generating 100 Pinterest Pin graphics (1000x1500) in {PINS_DIR}...")
    for idx, post in enumerate(posts, start=1):
        pin_filename, board_cfg = generate_pin_image(post, idx, logo_img)
        remedy_headline = extract_remedy_headline(post.get("bach_flower_protocol", ""))
        title_clean = sanitize_no_bottles(post["title"])
        direct_clean = sanitize_no_bottles(post.get("direct_answer", ""))
        astro_clean = sanitize_no_bottles(post.get("astrological_archetype_mapping", ""))
        bach_clean = sanitize_no_bottles(post.get("bach_flower_protocol", ""))

        # Rich SEO Pinterest Description (max 500 chars for Pinterest API v5 & RSS)
        raw_desc = (
            f"{direct_clean} "
            f"✦ Vedic Kundli Insight: {astro_clean} "
            f"✿ Natural Pushpa Upaya (Bach Flower Remedy): {bach_clean} "
            f"#VedicAstrology #Kundli #BachFlowerRemedies #EmotionalWellnessIndia #SOMA38"
        )
        if len(raw_desc) > 495:
            raw_desc = raw_desc[:492].rsplit(" ", 1)[0] + "..."

        alt_text = (
            f"SOMA 38 Vedic Kundli and Natural Bach Flower Pushpa Upaya infographic guide for {title_clean}. "
            f"Features sacred lotus geometry and emotional wellness insights for {post['category']}."
        )[:495]

        dest_path = f"/blog?post={post['slug']}"
        image_path = f"/pins/{pin_filename}"

        pin_item = {
            "pin_number": idx,
            "pin_id": f"pin-{idx:03d}",
            "post_id": post["id"],
            "slug": post["slug"],
            "category": post["category"],
            "board_name": board_cfg["board_name"],
            "board_slug": board_cfg["board_slug"],
            "pin_title": title_clean[:100],
            "pin_description": raw_desc,
            "alt_text": alt_text,
            "remedy_headline": remedy_headline,
            "image_path": image_path,
            "destination_path": dest_path,
            "published_at_utc": post.get("published_at_utc", "2026-03-31T12:00:00Z"),
            "tags": post.get("tags", [])
        }
        pins_metadata.append(pin_item)

        csv_rows.append({
            "Title": pin_item["pin_title"],
            "Media URL": f"https://inn-closest-coupons-flood.trycloudflare.com{image_path}",
            "Pinterest board": pin_item["board_name"],
            "Description": pin_item["pin_description"],
            "Link": f"https://inn-closest-coupons-flood.trycloudflare.com{dest_path}",
            "Publish date": "",
            "Keywords": ", ".join(pin_item["tags"])
        })

    with open(PINS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(pins_metadata, f, indent=2, ensure_ascii=False)

    with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
        fieldnames = ["Title", "Media URL", "Pinterest board", "Description", "Link", "Publish date", "Keywords"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"Successfully generated {len(pins_metadata)} pins, {PINS_JSON_PATH}, and {CSV_PATH}!")

if __name__ == "__main__":
    main()
