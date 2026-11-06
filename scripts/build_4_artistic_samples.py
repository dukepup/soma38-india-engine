import os
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\bpupp\.gemini\antigravity\brain\de274ffa-3ffc-49ad-9ba6-8134f7300dd0"
BASE_DIR = r"C:\Users\bpupp\.gemini\antigravity\scratch\soma_india_engine"
LOGO_PATH = os.path.join(BASE_DIR, "public", "soma38_logo_horizontal.png")

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

FONT_SERIF_BOLD_52 = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 50)
FONT_SERIF_ITALIC_28 = load_font(["georgiai.ttf", "palai.ttf", "timesi.ttf"], 27)
FONT_SANS_BOLD_20 = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], 20)
FONT_SANS_BOLD_22 = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], 22)

def draw_centered_lines(draw, lines, y_start, line_height, font, fill, width=1000, shadow=None):
    y = y_start
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        w = bbox[2] - bbox[0]
        x = (width - w) // 2
        if shadow:
            draw.text((x + 2, y + 2), line, font=font, fill=shadow)
        draw.text((x, y), line, font=font, fill=fill)
        y += line_height
    return y

def build_samples():
    samples = [
        {
            "in_file": "soma38_art_style1_kundli_1793463545441.jpg",
            "out_file": "sample_pin_style1_kundli.jpg",
            "board_label": "VEDIC KUNDLI  •  SADE SATI  •  CHANDRA RASHI",
            "headline": [
                "Shani Sade Sati Is Not a Curse—",
                "It Is Your Nervous System",
                "Outgrowing Old Illusions."
            ],
            "subtext": [
                "10th House Saturn & Natal Moon:",
                "Release Duty Fatigue with Oak & Elm Flower Essences"
            ],
            "cta": "READ FULL KUNDLI & PUSHPA UPAYA GUIDE  •  SOMA·38",
            "theme": "dark",
            "title_color": "#FFF8E7",
            "accent_color": "#E5C158",
            "sub_color": "#E2D4B7",
            "pill_bg": "#151F38",
            "pill_border": "#D4A853",
            "cta_bg": "#D4A853",
            "cta_text": "#0B1021"
        },
        {
            "in_file": "soma38_art_style2_botanical_1793463561588.jpg",
            "out_file": "sample_pin_style2_botanical.jpg",
            "board_label": "BACH FLOWER REMEDIES (PUSHPA UPAYA)",
            "headline": [
                "Waking Up at 3 AM With a Racing",
                "Mind & Tightness in Your Chest?"
            ],
            "subtext": [
                "Star of Bethlehem • White Chestnut • Wild Rose",
                "Gentle Botanical Remedies for Unspoken Emotional Shock"
            ],
            "cta": "DISCOVER YOUR 38 FLOWER REMEDY MATCH  •  SOMA·38",
            "theme": "light",
            "title_color": "#23171B",
            "accent_color": "#8B162B",
            "sub_color": "#4E3A2A",
            "pill_bg": "#F9EFE0",
            "pill_border": "#B8860B",
            "cta_bg": "#8B162B",
            "cta_text": "#FFFDF7"
        },
        {
            "in_file": "soma38_art_style3_synastry_1793463578851.jpg",
            "out_file": "sample_pin_style3_synastry.jpg",
            "board_label": "MARRIAGE, RISHTA & RELATIONSHIP SYNASTRY",
            "headline": [
                "30+ Guna Milan Points Match,",
                "So Why Does Your Heart Still",
                "Feel Anxious & Unseen?"
            ],
            "subtext": [
                "Beyond Superficial Kundli Matching:",
                "Chandra-Shukra Emotional Safety + Cerato & Walnut"
            ],
            "cta": "CHECK YOUR RELATIONSHIP SYNASTRY  •  SOMA·38",
            "theme": "dark_warm",
            "title_color": "#FFF9F2",
            "accent_color": "#FAD691",
            "sub_color": "#2E151B",
            "pill_bg": "#4A121E",
            "pill_border": "#E5B869",
            "cta_bg": "#4A121E",
            "cta_text": "#FFF9F2"
        },
        {
            "in_file": "soma38_art_style4_shadow_1793463597339.jpg",
            "out_file": "sample_pin_style4_shadow.jpg",
            "board_label": "SHADOW WORK & INDIAN FAMILY BOUNDARIES",
            "headline": [
                "How to Stop Absorbing Everyone's",
                "Expectations & 'Log Kya Kahenge'",
                "Into Your Own Body."
            ],
            "subtext": [
                "Rahu-Chandra Porous Boundaries:",
                "Build a Calm Emotional Kavach with Walnut & Centaury"
            ],
            "cta": "READ THE EMOTIONAL BOUNDARY GUIDE  •  SOMA·38",
            "theme": "travertine",
            "title_color": "#1E1815",
            "accent_color": "#7A4918",
            "sub_color": "#2B211B",
            "pill_bg": "#F4EBDC",
            "pill_border": "#B68D40",
            "cta_bg": "#231B16",
            "cta_text": "#F9F3E8"
        }
    ]

    for s in samples:
        in_path = os.path.join(ARTIFACT_DIR, s["in_file"])
        img = Image.open(in_path).convert("RGBA")
        img = img.resize((1000, 1500), Image.Resampling.LANCZOS)

        # Create overlay for subtle readability gradients where needed
        overlay = Image.new("RGBA", (1000, 1500), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        if s["theme"] == "travertine":
            # Soft warm parchment wash over top and bottom bands so text is super crisp
            odraw.rectangle([0, 0, 1000, 355], fill=(244, 235, 220, 215))
            odraw.rectangle([0, 1210, 1000, 1500], fill=(244, 235, 220, 225))
        elif s["theme"] == "light":
            odraw.rectangle([0, 0, 1000, 340], fill=(252, 246, 234, 210))
            odraw.rectangle([0, 1180, 1000, 1500], fill=(252, 246, 234, 220))
        elif s["theme"] == "dark_warm":
            odraw.rectangle([0, 1180, 1000, 1500], fill=(253, 244, 232, 225))

        img = Image.alpha_composite(img, overlay).convert("RGB")
        draw = ImageDraw.Draw(img)

        # Delicate outer gold frame
        draw.rectangle([24, 24, 976, 1476], outline=s["pill_border"], width=2)

        # Top Board Pill
        label = s["board_label"]
        lb_bbox = draw.textbbox((0, 0), label, font=FONT_SANS_BOLD_20)
        lb_w = lb_bbox[2] - lb_bbox[0] + 48
        lb_x1 = (1000 - lb_w) // 2
        draw.rounded_rectangle([lb_x1, 52, lb_x1 + lb_w, 98], radius=23, fill=s["pill_bg"], outline=s["pill_border"], width=2)
        draw.text((lb_x1 + 24, 62), label, font=FONT_SANS_BOLD_20, fill=s["accent_color"])

        # Top Editorial Headline
        shadow_col = "#000000" if s["theme"] in ("dark", "dark_warm") else None
        draw_centered_lines(draw, s["headline"], 124, 62, FONT_SERIF_BOLD_52, s["title_color"], shadow=shadow_col)

        # Bottom Subtext + CTA Pill
        sub_shadow = "#000000" if s["theme"] == "dark" else None
        draw_centered_lines(draw, s["subtext"], 1235, 40, FONT_SERIF_ITALIC_28, s["sub_color"], shadow=sub_shadow)

        # CTA Button
        draw.rounded_rectangle([80, 1366, 920, 1436], radius=35, fill=s["cta_bg"], outline=s["pill_border"], width=2)
        cta_bbox = draw.textbbox((0, 0), s["cta"], font=FONT_SANS_BOLD_22)
        cta_w = cta_bbox[2] - cta_bbox[0]
        draw.text(((1000 - cta_w) // 2, 1388), s["cta"], font=FONT_SANS_BOLD_22, fill=s["cta_text"])

        out_path = os.path.join(ARTIFACT_DIR, s["out_file"])
        img.save(out_path, "JPEG", quality=94)
        print("Saved:", out_path)

if __name__ == "__main__":
    build_samples()
