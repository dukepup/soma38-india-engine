#!/usr/bin/env python3
"""
SOMA·38 (सोम·३८) — 60/25/15 Identity-Share Reflection & Carousel Flywheel Engine
================================================================================
Executes the high-shareability reflection page growth architecture for SOMA·38:
  • 60% Static High-Impact Chiaroscuro Image + 3-Paragraph Sovereign Shadow Reflection
        (Engineered for peer-to-peer Shares, Timeline reposts, and WhatsApp forwards)
  • 25% Short Kinetic Video / Reels (Cold algorithmic discovery via Shorts/Reels)
  • 15% Multi-Card Carousels (4-Slide step-by-step dwell-time maximizers)

Strictly adheres to:
  - Pure Vedic Jyotish (Parashari, Lahiri Nirayana, Navagrahas, 12 Bhavas, 27 Nakshatras)
  - SOMA·38 Sovereign Chiaroscuro Aesthetic (Raja Ravi Varma oil + Caravaggio lighting)
  - 38 Bach Flower Remedies (Pushpa Upaya) as liquid iron for the spine
"""

import os
import sys
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_ART_DIR = BASE_DIR.parent / "pinterest_raw_artworks"
PINS_DIR = BASE_DIR / "public" / "pins"
REFLECTIONS_DIR = BASE_DIR / "public" / "reflections"
CAROUSELS_DIR = BASE_DIR / "public" / "carousels"
DATA_DIR = BASE_DIR / "data"

REFLECTIONS_DIR.mkdir(parents=True, exist_ok=True)
CAROUSELS_DIR.mkdir(parents=True, exist_ok=True)


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


# Master Static Image + 3-Paragraph Sovereign Shadow Reflections (60% Core Share Engine)
SOVEREIGN_REFLECTIONS = [
    {
        "id": "refl_001_neelakantha_throat",
        "source_image": str(PINS_DIR / "soma38_art_neelakantha_altar.jpg"),
        "epigram_line1": "That Lump in Your Throat at Family Dinners",
        "epigram_line2": "Is Not Respect—It Is Swallowed Truth.",
        "whisper_footer": "SOMA·38   •   ANGARAK YOGA & PUSHPA UPAYA",
        "title": "The Neelakantha Complex: Why Swallowing Unspoken Resentment Erodes Your Self-Respect",
        "paragraph_1_cut_denial": (
            "That sudden tightness in your throat at the dinner table—the moment an elder makes a pointed remark "
            "about your career, your body, or your marriage timeline—is not 'sanskar.' It is the immediate cost of a boundary "
            "you just allowed to be crossed. You tell yourself you are staying quiet to preserve harmony in the house, but deep down "
            "you know the truth: you are trading your own dignity just to avoid four seconds of awkward silence."
        ),
        "paragraph_2_vedic_somatic": (
            "In Parashari Jyotish, when Mangal (Mars) and Shani (Saturn) lock across your 2nd Kutumba Bhava (family speech) or "
            "8th Randhra Bhava (unspoken taboo), you develop the Neelakantha pattern—holding bitter emotional poison in the "
            "throat, neither speaking it aloud nor letting it go. Over years, that unvoiced 'No' turns into clenched teeth at night "
            "and a heavy, permanent ache behind your breastbone."
        ),
        "paragraph_3_reframe_and_share": (
            "In Pushpa Upaya, Centaury and Agrimony do not make you harsh; they dissolve the exhausting need to pretend everything is fine "
            "and restore quiet strength so you can state your limits without trembling. What is one truth you have been holding back "
            "this year just to keep everyone else comfortable?\n\n"
            "⚔️ Send this privately to someone who has been swallowing their truth just to keep the room polite.\n"
            "✨ Read your Sovereign Vedic Kundli Letter: https://soma38-india.onrender.com"
        )
    },
    {
        "id": "refl_002_shani_oak_packhorse",
        "source_image": str(PINS_DIR / "soma38_art_sovereign_spine_shani_oak.jpg"),
        "epigram_line1": "You Were Born a Sovereign Soul,",
        "epigram_line2": "Not the Family Packhorse.",
        "whisper_footer": "SOMA·38   •   SHANI SADE SATI & OAK ESSENCE",
        "title": "Shani Sade Sati: Why Playing 'The Unbreakable Pillar' Robs You of Your Vitality",
        "paragraph_1_cut_denial": (
            "Everyone around you calls you the 'pillar'—the dependable one who never complains, absorbs every financial and "
            "emotional crisis, and still answers work messages late into the night. Stop wearing your depletion like a badge of honor. "
            "You are not carrying everyone's weight because you are endlessly strong; you are doing it because you are afraid of who you "
            "would be if nobody needed you to rescue them."
        ),
        "paragraph_2_vedic_somatic": (
            "When transiting Shani (Saturn) crosses your Janma Chandra (Natal Moon) during Sade Sati, or aspects your 1st Tanu Bhava, "
            "it does not punish you—it exposes every false obligation you took on out of guilt. The heavy stone weight across "
            "your shoulders is your own spirit protesting a silent role you agreed to play in childhood."
        ),
        "paragraph_3_reframe_and_share": (
            "Pushpa Upaya remedies Oak and Pine quiet the harsh inner judge that tells you rest is selfish. They allow you to finally "
            "set down burdens that were never yours to carry and wake up without a sense of dread. Who taught you that you only deserve "
            "affection when you are completely exhausted?\n\n"
            "🪐 Share this with the person in your life who carries everyone else's burdens and never asks for help.\n"
            "✨ Decode your Shani & Chandra placements: https://soma38-india.onrender.com"
        )
    },
    {
        "id": "refl_003_janma_chandra_3am",
        "source_image": str(PINS_DIR / "soma38_art_janma_chandra_altar.jpg"),
        "epigram_line1": "Your 3:14 AM Insomnia Is the Audit",
        "epigram_line2": "of Every Lie You Smiled Through at 3 PM.",
        "whisper_footer": "SOMA·38   •   KEMADRUMA CHANDRA & WHITE CHESTNUT",
        "title": "Janma Chandra Affliction: Why Your Mind Replays Unfinished Arguments in the Dark",
        "paragraph_1_cut_denial": (
            "You did not wake up at 3:14 AM with a restless heart because of late tea or office deadlines. You woke up because at 3:00 PM "
            "yesterday, someone overstepped your limits, and you smiled, nodded, and said 'It's completely fine.' By day you can "
            "convince yourself that keeping the peace was worth it, but in the quiet of the night, your deeper self refuses to surrender "
            "its peace of mind while your truth remains unspoken."
        ),
        "paragraph_2_vedic_somatic": (
            "In Vedic Jyotish, Chandra (the Moon) governs Manas—the inner sanctuary of feeling and memory. When natal Chandra is caught "
            "in Chandra-Rahu Grahan Yoga or aspected by Shani in the 12th Vyaya Bhava of sleep, unexpressed daytime hurt turns "
            "into a tireless midnight courtroom, rehearsing the exact words you wished you had the courage to say."
        ),
        "paragraph_3_reframe_and_share": (
            "White Chestnut and Red Chestnut in Pushpa Upaya bring stillness to repetitive nocturnal thoughts, while Cerato helps you "
            "honor your first intuition in the moment. Which unspoken sentence from this week is still keeping you awake?\n\n"
            "🌙 Forward this to a friend whose mind refuses to rest at night because they spent the day pleasing everyone else.\n"
            "✨ Claim your 60s Vedic Kundli & Flower Remedy Reading: https://soma38-india.onrender.com"
        )
    },
    {
        "id": "refl_004_synastry_kundli_milan",
        "source_image": str(PINS_DIR / "soma38_art_synastry_kundli_milan.jpg"),
        "epigram_line1": "32 Out of 36 Gunas Cannot Save a Bond",
        "epigram_line2": "Where You Shrink Your Spirit to Be Chosen.",
        "whisper_footer": "SOMA·38   •   KALATRA BHAVA & WALNUT SHIELD",
        "title": "Beyond Ashtakoota Guna Milan: Why High-Scoring Kundlis Can Still Feel Like Solitude",
        "paragraph_1_cut_denial": (
            "A family pandit told you the charts match 32 out of 36 Gunas, yet a cold heaviness settles in your chest every time "
            "marriage is mentioned. Stop handing over the authority of your own heart to a paper scorecard. If you have to dim your "
            "curiosity, soften your opinions, and abandon the feeling of being at home in your own skin just to look like an 'ideal match,' "
            "you are not building companionship—you are agreeing to a lifetime of polite loneliness."
        ),
        "paragraph_2_vedic_somatic": (
            "Surface-level Guna Milan only compares lunar Nakshatras while overlooking deep 7th Kalatra Bhava and 8th Mangalya Bhava "
            "synastry—where Shukra (Venus), Mangal (Mars), and Ketu reveal whether two souls will genuinely nurture each other's "
            "emotional warmth or slowly drain it. Your hesitation is reading the real planetary truth that formal family meetings ignore."
        ),
        "paragraph_3_reframe_and_share": (
            "In Pushpa Upaya, Walnut and Scleranthus protect your inner clarity from family pressure and anchor you in calm, "
            "unwavering self-trust. Have you ever doubted what you clearly felt inside just because everyone around you approved of the match?\n\n"
            "🌸 Share this quietly with someone navigating rishta pressure who needs permission to trust their own intuition.\n"
            "✨ Test your true Vedic Synastry & Kundli architecture: https://soma38-india.onrender.com"
        )
    },
    {
        "id": "refl_005_neti_neti_ahamkara",
        "source_image": str(PINS_DIR / "pin-024.jpg"),
        "epigram_line1": "You Had a Prestigious Title, Yet You",
        "epigram_line2": "Were Never the Mask You Wore to Belong.",
        "whisper_footer": "SOMA·38   •   KETU NETI-NETI & WILD OAT",
        "title": "Neti-Neti & Ahamkara: Why Tethering Your Worth to Titles Leaves You Empty",
        "paragraph_1_cut_denial": (
            "Notice how a single shift in your job title, a delayed promotion, or a lukewarm reaction from peers can instantly rob you "
            "of your inner stillness. That panic is not ambition—it is the fragile shell of Ahamkara (the false ego) realizing it built "
            "its entire house on borrowed ground. When you forget your own unconditioned center, you shoot desperate tethers outward onto "
            "salaries, designations, and family applause, mistaking temporary props for who you actually are."
        ),
        "paragraph_2_vedic_somatic": (
            "In Parashari Jyotish, Ketu is the cosmic practitioner of Neti-Neti ('not this, not that'). When Ketu transits or aspects "
            "your 10th Karma Bhava or 1st Tanu Bhava, it severs false external tethers not to ruin you, but to prove that your core self "
            "(Atman) remains untouched when the applause stops. If you can observe your fear of losing status, you are the silent witness "
            "behind the fear—never the fragile role itself."
        ),
        "paragraph_3_reframe_and_share": (
            "In Pushpa Upaya, Wild Oat and Walnut strip away the anxiety of external comparison and anchor you in quiet, unshakeable "
            "purpose. Which external label or role have you been clinging to so tightly that it is costing you your serenity?\n\n"
            "🗡️ Send this to someone who has been confusing their designation or resume with their actual soul.\n"
            "✨ Read your Sovereign Vedic Kundli Letter: https://soma38-india.onrender.com"
        )
    },
    {
        "id": "refl_006_manovaha_srotas_prana",
        "source_image": str(PINS_DIR / "pin-088.jpg"),
        "epigram_line1": "Unspoken Grief Does Not Live in the Brain—",
        "epigram_line2": "It Stagnates in the Channels of the Heart.",
        "whisper_footer": "SOMA·38   •   MANOVAHA SROTAS & STAR OF BETHLEHEM",
        "title": "Manovaha Srotas & Sukshma Sharira: How Subtle Botanical Prana Clears Old Grief",
        "paragraph_1_cut_denial": (
            "You have analyzed your childhood, read the psychology books, and explained your history to yourself a hundred times—yet a "
            "heavy, unyielding ache still sits at the center of your chest. That is because deep grief does not reside in your intellect. "
            "You cannot argue or logic your way back into emotional warmth when the subtle pathways of the heart remain clogged with years "
            "of unmourned loss."
        ),
        "paragraph_2_vedic_somatic": (
            "Classical Ayurvedic and Vedic wisdom maps the Sukshma Sharira (subtle energy body) and locates the seat of emotional life in "
            "the Manovaha Srotas—the luminous channels connecting the heart center (Hridaya) to Manas (the lunar mind). When Natal Chandra "
            "or the 4th Sukha Bhava carries old shock, stagnation blocks these subtle pathways long before it shows up in the physical body."
        ),
        "paragraph_3_reframe_and_share": (
            "Because Pushpa Upaya (flower essences) carry pure botanical Prana rather than heavy chemicals, they act like a clear tuning fork "
            "inside the Manovaha Srotas—gently dissolving frozen grief (Star of Bethlehem) and restoring steady equilibrium without forcing "
            "you to relive the wound. Where in your life have you been trying to 'think' your way out of a feeling that simply needs to be cleared?\n\n"
            "🌿 Pass this on to someone who understands everything in their head, yet still carries a heavy heart.\n"
            "✨ Discover your natal Chandra & Pushpa Upaya protocol: https://soma38-india.onrender.com"
        )
    },
    {
        "id": "refl_007_fortress_self_upadhi",
        "source_image": str(PINS_DIR / "pin-054.jpg"),
        "epigram_line1": "The Fortress You Built to Protect Your Pride",
        "epigram_line2": "Has Become the Prison Stealing Your Rest.",
        "whisper_footer": "SOMA·38   •   UPADHI & WATER VIOLET",
        "title": "Upadhi & The Fortress Ego: Why Defending Your 'Image' Creates Chronic Restlessness",
        "paragraph_1_cut_denial": (
            "Modern advice tells you to constantly fortify your personal brand, build thicker walls, and guard your image like a monument. "
            "Yet the harder you work to maintain that polished, self-sufficient exterior, the more isolated and restless you feel inside. "
            "What if the exhausting effort of defending that rigid persona is the exact source of your uneasiness?"
        ),
        "paragraph_2_vedic_somatic": (
            "Indian philosophical traditions diagnose this as Upadhi—a self-imposed limitation where expansive consciousness locks itself "
            "inside a cramped, defensive shell. In your Kundli, when Rahu or Shani armors the 1st House (Lagna), pride masquerades as strength, "
            "cutting you off from genuine human warmth and leaving you stranded inside your own high walls."
        ),
        "paragraph_3_reframe_and_share": (
            "In Pushpa Upaya, Water Violet and Beech melt proud isolation and rigid self-defense, allowing you to participate in life "
            "with open dignity rather than exhausting armor. What wall have you been maintaining out of pride that is actually keeping joy out?\n\n"
            "🏛️ Share this with the fiercely independent friend who never lets anyone see them struggle.\n"
            "✨ Unlock your Lagna & Sovereign Kundli Dossier: https://soma38-india.onrender.com"
        )
    }
]


# 15% Multi-Card Carousel Breakdown (4-Slide High Dwell-Time Engine)
CAROUSEL_SERIES_01 = {
    "carousel_id": "carousel_001_family_peace_tax",
    "title": "3 Things You Tolerate For 'Fake Harmony' That Are Stealing Your Inner Peace",
    "slides": [
        {
            "slide_num": 1,
            "bg_image": str(PINS_DIR / "soma38_art_neelakantha_altar.jpg"),
            "tag": "SOMA·38  •  VEDIC SHADOW & PUSHPA UPAYA",
            "headline": "3 Things You Tolerate\nFor 'Fake Harmony'\nThat Are Stealing\nYour Inner Peace",
            "subtext": "Swipe to see the hidden cost of always being the 'easygoing' one →"
        },
        {
            "slide_num": 2,
            "bg_image": str(PINS_DIR / "soma38_art_sovereign_spine_shani_oak.jpg"),
            "tag": "01  •  SURYA NEECHA & THE PLEASER MASK",
            "headline": "Swallowing Disrespect\nto Avoid 5 Minutes\nof Awkward Silence",
            "subtext": (
                "When Surya (Sun) is afflicted in your Kundli, you fear disapproval more than self-betrayal. "
                "Every time you smile through an unfair comment, that unspoken fire turns inward—robbing "
                "you of your warmth, your voice, and your self-respect."
            )
        },
        {
            "slide_num": 3,
            "bg_image": str(PINS_DIR / "soma38_art_janma_chandra_altar.jpg"),
            "tag": "02  •  CHANDRA-SHANI VISH YOGA",
            "headline": "Carrying Unspoken\nParental Guilt as\nYour Daily Currency",
            "subtext": (
                "When Shani aspects your Natal Chandra, affection felt tied to how useful you were. "
                "Sitting down to rest on a Sunday brings a wave of uneasiness because a part of you "
                "still believes you must earn the right to simply breathe."
            )
        },
        {
            "slide_num": 4,
            "bg_image": str(PINS_DIR / "soma38_art_synastry_kundli_milan.jpg"),
            "tag": "03  •  THE PUSHPA UPAYA RECALIBRATION",
            "headline": "Reclaiming Your\nQuiet Sovereignty:\nCentaury, Oak & Pine",
            "subtext": (
                "Bach Flower Remedies (Pushpa Upaya) dissolve borrowed guilt (Pine), "
                "release the compulsion to over-carry (Oak), and restore a calm, unshakeable "
                "sense of dignity (Centaury).\n\n"
                "✦ Free Sovereign Kundli Letter at soma38-india.onrender.com"
            )
        }
    ]
}

CAROUSEL_SERIES_02 = {
    "carousel_id": "carousel_002_ahamkara_manovaha_srotas",
    "title": "How False Ego (Ahamkara) & Blocked Heart Channels Steal Your Serenity",
    "slides": [
        {
            "slide_num": 1,
            "bg_image": str(PINS_DIR / "pin-024.jpg"),
            "tag": "SOMA·38  •  VEDIC PSYCHOLOGY & PUSHPA UPAYA",
            "headline": "Why Losing Status Or\nApproval Hurts Like\nA Physical Injury:\nAhamkara Explained",
            "subtext": "Swipe to see how Indian philosophical frameworks map emotional pain →"
        },
        {
            "slide_num": 2,
            "bg_image": str(PINS_DIR / "pin-054.jpg"),
            "tag": "01  •  AHAMKARA & METAPHYSICAL DISPLACEMENT",
            "headline": "Shooting Tethers Onto\nTitles, Salaries &\nFamily Applause",
            "subtext": (
                "When the mind forgets its unconditioned core (Atman), it builds a fragile outer shell called Ahamkara. "
                "To cure its inner emptiness, it shoots tethers onto external status—so any shift in your career feels like "
                "your very self is collapsing."
            )
        },
        {
            "slide_num": 3,
            "bg_image": str(PINS_DIR / "pin-088.jpg"),
            "tag": "02  •  SUKSHMA SHARIRA & MANOVAHA SROTAS",
            "headline": "Why Talk Alone Cannot\nClear Grief Stored In\nYour Heart Channels",
            "subtext": (
                "Unprocessed sorrow does not sit in the logical brain—it stagnates in the Manovaha Srotas, "
                "the subtle pathways linking your heart center to your mind. You cannot out-think a blockage "
                "that lives in your subtle energy body."
            )
        },
        {
            "slide_num": 4,
            "bg_image": str(PINS_DIR / "soma38_art_janma_chandra_altar.jpg"),
            "tag": "03  •  NETI-NETI & BOTANICAL PRANA",
            "headline": "Returning To Stillness:\nKetu's Inquiry & Pure\nPushpa Upaya Resonance",
            "subtext": (
                "Neti-Neti ('not this, not that') detaches your worth from temporary roles, while Pushpa Upaya "
                "(Star of Bethlehem, Walnut & Wild Oat) acts like a tuning fork in the heart's subtle channels.\n\n"
                "✦ Free Sovereign Kundli Letter at soma38-india.onrender.com"
            )
        }
    ]
}


def render_epigram_reflection_card(item: dict) -> Path:
    """
    Renders a 1080x1350 (4:5 Feed Portrait) Epigrammatic Reflection Card
    designed for maximum peer-to-peer shareability on Facebook, WhatsApp & Instagram.
    """
    W, H = 1080, 1350
    src_path = Path(item["source_image"])
    if not src_path.exists():
        src_path = PINS_DIR / "pin-001.jpg"

    raw = Image.open(src_path).convert("RGB")
    # Center-crop to 4:5 (1080x1350)
    rw, rh = raw.size
    target_ratio = W / H
    cur_ratio = rw / rh
    if cur_ratio > target_ratio:
        new_w = int(rh * target_ratio)
        left = (rw - new_w) // 2
        raw = raw.crop((left, 0, left + new_w, rh))
    else:
        new_h = int(rw / target_ratio)
        top = (rh - new_h) // 2
        raw = raw.crop((0, top, rw, top + new_h))

    img = raw.resize((W, H), Image.Resampling.LANCZOS).convert("RGBA")

    # Subtle bottom chiaroscuro vignette so the painting breathes at top/center
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)
    for y in range(860, H):
        progress = (y - 860) / (H - 860)
        alpha = int((progress ** 1.35) * 235)
        gdraw.line([(0, y), (W, y)], fill=(8, 10, 18, alpha))

    out = Image.alpha_composite(img, grad).convert("RGB")
    draw = ImageDraw.Draw(out)

    # Museum gold border
    draw.rectangle([32, 32, W - 32, H - 32], outline="#C5A059", width=2)
    draw.rectangle([40, 40, W - 40, H - 40], outline="#5A4622", width=1)

    lines = [item["epigram_line1"], item["epigram_line2"]]
    font_epigram = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 38)
    for sz in range(42, 26, -2):
        f_test = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], sz)
        max_lw = max(draw.textbbox((0, 0), l, font=f_test)[2] - draw.textbbox((0, 0), l, font=f_test)[0] for l in lines)
        if max_lw <= W - 150:
            font_epigram = f_test
            break

    font_whisper = load_font(["segoeuib.ttf", "arialbd.ttf"], 20)
    y_curr = 1035
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_epigram)
        lw = bbox[2] - bbox[0]
        x = (W - lw) // 2
        for dx, dy in [(-2, 2), (2, 2), (0, 3)]:
            draw.text((x + dx, y_curr + dy), line, font=font_epigram, fill="#05060A")
        draw.text((x, y_curr), line, font=font_epigram, fill="#FFFDF7")
        y_curr += 58

    # Gold diamond divider
    div_y = y_curr + 16
    draw.line([(W // 2 - 90, div_y), (W // 2 + 90, div_y)], fill="#D4A853", width=2)
    draw.polygon([(W // 2, div_y - 6), (W // 2 + 6, div_y), (W // 2, div_y + 6), (W // 2 - 6, div_y)], fill="#D4A853")

    # Whisper footer
    whisper = item["whisper_footer"]
    wbbox = draw.textbbox((0, 0), whisper, font=font_whisper)
    wx = (W - (wbbox[2] - wbbox[0])) // 2
    draw.text((wx, H - 82), whisper, font=font_whisper, fill="#E5C178")

    out_path = REFLECTIONS_DIR / f"{item['id']}.jpg"
    out.save(out_path, "JPEG", quality=94, optimize=True)
    return out_path


def wrap_text(draw, text, font, max_width):
    words = text.split(" ")
    lines = []
    cur = ""
    for w in words:
        test = (cur + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def render_carousel_series(carousel: dict) -> list:
    """
    Renders a 4-Slide 1080x1350 Carousel Breakdown for Dwell-Time Maximization.
    """
    W, H = 1080, 1350
    out_paths = []

    font_tag = load_font(["segoeuib.ttf", "arialbd.ttf"], 22)
    font_head = load_font(["georgiab.ttf", "palab.ttf", "timesbd.ttf"], 54)
    font_sub = load_font(["georgia.ttf", "pala.ttf", "times.ttf"], 32)

    for slide in carousel["slides"]:
        src_path = Path(slide["bg_image"])
        raw = Image.open(src_path).convert("RGB").resize((W, H), Image.Resampling.LANCZOS).convert("RGBA")

        # Deep museum dark overlay for crisp multi-line editorial reading
        overlay = Image.new("RGBA", (W, H), (8, 10, 18, 195))
        comp = Image.alpha_composite(raw, overlay).convert("RGB")
        draw = ImageDraw.Draw(comp)

        draw.rectangle([36, 36, W - 36, H - 36], outline="#C5A059", width=2)

        # Top tag
        tag = slide["tag"]
        draw.text((84, 96), tag, font=font_tag, fill="#D4A853")
        draw.line([(84, 136), (W - 84, 136)], fill="#5A4622", width=1)

        # Headline
        y_curr = 260
        for hline in slide["headline"].split("\n"):
            draw.text((84, y_curr), hline, font=font_head, fill="#FFFDF7")
            y_curr += 72

        draw.line([(84, y_curr + 25), (260, y_curr + 25)], fill="#C5A059", width=3)

        # Subtext wrapped
        y_sub = y_curr + 75
        for paragraph in slide["subtext"].split("\n\n"):
            wrapped = wrap_text(draw, paragraph, font_sub, W - 168)
            for wline in wrapped:
                draw.text((84, y_sub), wline, font=font_sub, fill="#E2DDD5")
                y_sub += 48
            y_sub += 24

        # Slide indicator at bottom right
        ind_text = f"0{slide['slide_num']} / 04"
        draw.text((W - 180, H - 96), ind_text, font=font_tag, fill="#C5A059")
        draw.text((84, H - 96), "SOMA·38  •  VEDIC KUNDLI & PUSHPA UPAYA", font=font_tag, fill="#8C7A5B")

        out_p = CAROUSELS_DIR / f"{carousel['carousel_id']}_slide_{slide['slide_num']}.jpg"
        comp.save(out_p, "JPEG", quality=93, optimize=True)
        out_paths.append(out_p)

    return out_paths


def build_all():
    print("=" * 72)
    print("  SOMA·38 — EXECUTING 60/25/15 REFLECTION & CAROUSEL FLYWHEEL")
    print("=" * 72)

    manifest = {
        "proportion_strategy": {
            "static_image_reflections": "60% (Primary Share & Follower Conversion Engine)",
            "short_kinetic_reels": "25% (Cold Algorithmic Top-of-Funnel Discovery)",
            "multi_card_carousels": "15% (Dwell-Time & Save Maximizer)"
        },
        "reflections": [],
        "carousels": []
    }

    for item in SOVEREIGN_REFLECTIONS:
        card_path = render_epigram_reflection_card(item)
        full_caption = (
            f"✦ {item['title']}\n\n"
            f"{item['paragraph_1_cut_denial']}\n\n"
            f"{item['paragraph_2_vedic_somatic']}\n\n"
            f"{item['paragraph_3_reframe_and_share']}"
        )
        entry = {
            **item,
            "rendered_card_path": str(card_path),
            "full_3_paragraph_caption": full_caption
        }
        manifest["reflections"].append(entry)
        print(f"  ✅ [60% Share Card] Rendered: {card_path.name}")

    for c_series in [CAROUSEL_SERIES_01, CAROUSEL_SERIES_02]:
        c_paths = render_carousel_series(c_series)
        manifest["carousels"].append({
            **c_series,
            "rendered_slides": [str(p) for p in c_paths]
        })
        print(f"  ✅ [15% Carousel]   Rendered 4 slides: {[p.name for p in c_paths]}")

    out_json = DATA_DIR / "soma38_reflection_flywheel_ledger.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\nSaved Flywheel Manifest -> {out_json}")
    print("=" * 72)


if __name__ == "__main__":
    build_all()
