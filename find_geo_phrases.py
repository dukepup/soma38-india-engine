import os

search_terms = ['Indexação GEO', 'GEO / SGE', 'Indexação GEO Semanal Ativa', 'SEO', 'GEO']
roots = [
    r'c:\Users\bpupp\Downloads\Antigravity',
    r'C:\Users\bpupp\.gemini\antigravity\scratch\bach_astro_engine'
]

for r in roots:
    for root, dirs, files in os.walk(r):
        if any(x in root for x in ['.git', 'node_modules', '__pycache__', 'AppData']):
            continue
        for f in files:
            if f.endswith(('.html', '.py', '.js')):
                p = os.path.join(root, f)
                try:
                    with open(p, 'r', encoding='utf-8', errors='ignore') as fh:
                        content = fh.read()
                        if 'Indexação GEO / SGE' in content or 'Indexação GEO Semanal Ativa' in content:
                            print(f'MATCH: {p}')
                except:
                    pass
