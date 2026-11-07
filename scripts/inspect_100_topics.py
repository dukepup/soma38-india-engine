import json

with open(r"C:\Users\bpupp\.gemini\antigravity\scratch\soma_india_engine\data\reset_blog_100_posts.json", encoding="utf-8") as f:
    posts = json.load(f)

for i, p in enumerate(posts, 1):
    cat = p["category"]
    title = p["title"]
    bach = p["bach_flower_protocol"].split("(")[0].strip()
    astro = p["astrological_archetype_mapping"][:40]
    print(f"{i:03d} | {cat[:22]:22s} | {title[:68]:68s} | {bach[:25]}")
