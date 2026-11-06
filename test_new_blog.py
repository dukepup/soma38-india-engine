import os, json

path = r'C:\Users\bpupp\.gemini\antigravity\scratch\bach_astro_engine\public\blog.html'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

print('HTML byte length:', len(text))
print('Card count in SSR DOM:', text.count('class="post-card"'))
print('Direct answers count:', text.count('geo-direct-answer-preview'))
print('FAQ schema question count:', text.count('"@type": "Question"'))
print('Contains GEO / SGE:', 'GEO / SGE' in text)
print('Contains user emoji:', '\U0001F464' in text)
