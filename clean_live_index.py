import re

file_path = 'public/index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

emojis = [
    '👤', '✨', '💞', '🌿', '🌙', '📦', '🎉', '📍', '❓', '🌸', '⚡', '🔍', '📋', '✉️', '✉',
    '💬', '📅', '🌱', '💨', '🌋', '🌊', '💡', '🌧️', '🌧', '⭐', '🗑️', '🗑', '🚚', '🔒', '✅', '🏛️', '🏛', '🪐'
]

for em in emojis:
    content = content.replace(em + ' ', '')
    content = content.replace(' ' + em, '')
    content = content.replace(em, '')

if 'href="/blog"' not in content:
    content = content.replace(
        '<div id="navGuest" style="display: flex; align-items: center; gap: 8px;">',
        '<div id="navGuest" style="display: flex; align-items: center; gap: 8px;">\n        <a href="/blog" class="btn-nav" style="text-decoration:none;">Blog</a>'
    )
    content = content.replace(
        '<div id="navUser" style="display: none; align-items: center; gap: 8px; flex-wrap: wrap;">',
        '<div id="navUser" style="display: none; align-items: center; gap: 8px; flex-wrap: wrap;">\n        <a href="/blog" class="btn-nav" style="text-decoration:none;">Blog</a>'
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Cleaned emojis and added Blog link in public/index.html')
