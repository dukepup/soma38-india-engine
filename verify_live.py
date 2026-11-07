import urllib.request

req = urllib.request.Request('https://antigravity-lgwq.onrender.com/?r=live_check', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')
    print('Live home has Blog link:', 'href="/blog"' in html)
    print('Has user emoji (U+1F464):', '\U0001F464' in html)
    print('Has sparkle emoji (U+2728):', '\u2728' in html)
    print('Has hearts emoji (U+1F49E):', '\U0001F49E' in html)

req_blog = urllib.request.Request('https://antigravity-lgwq.onrender.com/blog', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req_blog) as resp:
    blog_html = resp.read().decode('utf-8')
    print('Live blog status 200, length:', len(blog_html))
    print('Live blog title present:', '100 Respostas Estruturais para a Psique em Portugal' in blog_html)

