import os

files_to_update = [
    r'C:\Users\bpupp\.gemini\antigravity\scratch\bach_astro_engine\public\blog.html',
    r'c:\Users\bpupp\Downloads\Antigravity\app\static\blog.html',
    r'c:\Users\bpupp\Downloads\Antigravity\Companies\data\blog.html',
    r'c:\Users\bpupp\Downloads\Antigravity\Companies\tools\blog_100_generator.py'
]

old_pattern = """            <p class="hero-subtitle">
                Tradução rigorosa de trânsitos planetários, crises existenciais, esgotamento executivo e hipersensibilidade 
                em diagnósticos Gestalt e protocolos de remediação botânica de precisão.
            </p>"""

new_pattern = """            <p class="hero-subtitle">
                Respostas práticas para mentes exaustas e sistemas nervosos em sobrecarga. A interseção entre astrologia psicológica e calibração natural com florais de Bach.
            </p>"""

for fpath in files_to_update:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as fh:
        c = fh.read()
    
    if old_pattern in c:
        c = c.replace(old_pattern, new_pattern)
        with open(fpath, 'w', encoding='utf-8') as fh:
            fh.write(c)
        print(f"Updated subtitle in {fpath}")
    else:
        # Try normalized whitespace replacement
        import re
        norm_regex = r'<p class="hero-subtitle">\s*Tradução rigorosa de trânsitos planetários, crises existenciais, esgotamento executivo e hipersensibilidade\s*em diagnósticos Gestalt e protocolos de remediação botânica de precisão\.\s*</p>'
        if re.search(norm_regex, c):
            c = re.sub(norm_regex, new_pattern.strip(), c)
            with open(fpath, 'w', encoding='utf-8') as fh:
                fh.write(c)
            print(f"Regex updated subtitle in {fpath}")
        else:
            print(f"Pattern not found in {fpath}")

print("Update script completed.")
