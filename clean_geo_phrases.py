import os

files_to_update = [
    r'c:\Users\bpupp\Downloads\Antigravity\app\static\blog.html',
    r'c:\Users\bpupp\Downloads\Antigravity\Companies\data\blog.html',
    r'C:\Users\bpupp\.gemini\antigravity\scratch\bach_astro_engine\public\blog.html',
    r'c:\Users\bpupp\Downloads\Antigravity\app\static\matriz_soberania_operacional.html',
    r'c:\Users\bpupp\Downloads\Antigravity\Companies\data\matriz_soberania_operacional.html',
    r'c:\Users\bpupp\Downloads\Antigravity\Companies\tools\blog_100_generator.py',
    r'c:\Users\bpupp\Downloads\Antigravity\Companies\tools\seo_geo_scanner.py'
]

replacements = [
    ("<span>Indexação GEO / SGE &bull; Português Europeu</span>", "<span>Arquivo Clínico &bull; Português Europeu</span>"),
    ("Indexação GEO / SGE &bull; Português Europeu", "Arquivo Clínico &bull; Português Europeu"),
    ("Indexação GEO / SGE • Português Europeu", "Arquivo Clínico • Português Europeu"),
    ("Indexação GEO Semanal Ativa &bull;", "Atualização Semanal Ativa &bull;"),
    ("Indexação GEO Semanal Ativa", "Atualização Semanal Ativa"),
    ("Indexação GEO &bull;", "Arquivo Clínico &bull;"),
    ("<!-- Schema.org GEO Structured Data -->", "<!-- Schema.org Structured Data -->"),
    ("<!-- Schema.org Structured Data for Generative Engine Optimization (GEO) -->", "<!-- Schema.org Structured Data -->"),
    ("100 SEO-GEO Mental Health", "100 Artigos de Saúde Mental"),
    ("SEO-GEO", "Clínico-Arquetípico"),
    ("SEO e GEO", "Clínico e Arquetípico"),
    ("SEO & GEO", "Clínico & Arquetípico")
]

for file_path in files_to_update:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = False
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned phrases in: {file_path}")

print("All targets processed successfully.")
