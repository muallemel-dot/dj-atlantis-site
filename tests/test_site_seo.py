"""Run with python tests/test_site_seo.py; validates the complete published tree."""

from collections import Counter
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import json
import re
import xml.etree.ElementTree as ET


SITE = Path(__file__).resolve().parents[1] / 'netlify-deploy'
DOMAIN = 'https://djatlantis.co.il'


class Tags(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def check_site():
    # The deployment tree is the source; old root copies intentionally differ.
    pages = {}
    for path in SITE.rglob('*.html'):
        source = path.read_text(encoding='utf-8-sig')
        tags = Tags(source).tags
        pages[path] = (source, tags, {a['id'] for _, a in tags if a.get('id')})
    errors, titles, canonical_urls = [], [], []

    def check(condition, path, detail):
        if not condition:
            errors.append(f'{path.relative_to(SITE)}: {detail}')

    # The requested spelling is חבד / ביתר, including metadata and shared assets.
    quoted_names = re.compile(r'''חב["'״׳“”‘’]+ד|בית["'״׳“”‘’]+ר''')
    for path in SITE.rglob('*'):
        if path.suffix.lower() not in {'.html', '.js', '.json', '.xml', '.txt', '.svg', '.css', '.webmanifest'}:
            continue
        source = pages[path][0] if path in pages else path.read_text(encoding='utf-8-sig')
        decoded = re.sub(r'\\u([0-9a-fA-F]{4})', lambda match: chr(int(match[1], 16)), source)
        decoded = unescape(decoded).replace('\\"', '"').replace("\\'", "'")
        check(not quoted_names.search(decoded), path, 'use חבד and ביתר without quotation marks')

    for path, (source, tags, _) in pages.items():
        route = '/' + path.relative_to(SITE).as_posix().removesuffix('index.html')
        base = DOMAIN + route
        metas = [a for t, a in tags if t == 'meta']
        noindex = any(a.get('name') == 'robots' and 'noindex' in a.get('content', '') for a in metas)
        if not noindex:
            title = re.findall(r'<title>(.*?)</title>', source, re.S)
            check(len(title) == 1 and bool(title[0].strip()), path, 'exactly one nonempty title required')
            titles.extend(unescape(value) for value in title)
            check(sum(t == 'h1' for t, _ in tags) == 1, path, 'exactly one H1 required')
            check(any(t == 'html' and a.get('lang') == 'he' and a.get('dir') == 'rtl' for t, a in tags), path, 'Hebrew RTL document required')
            descriptions = [a for a in metas if a.get('name') == 'description']
            check(len(descriptions) == 1 and len(descriptions[0].get('content', '')) >= 50, path, 'description missing or truncated')
            canonical = [a.get('href') for t, a in tags if t == 'link' and a.get('rel') == 'canonical']
            check(canonical == [base], path, f'canonical must equal {base}')
            canonical_urls.extend(canonical)
            for attrs in metas:
                check(not (set(attrs) - {'name', 'property', 'content', 'charset', 'http-equiv'}), path, 'malformed meta attributes: ' + repr(attrs))
            if any(route.startswith(prefix) for prefix in ('/חתונות/', '/חינות/', '/שירותים/חתונה/', '/שירותים/חינות-אירוסין/')):
                h1 = re.search(r'<h1\b[^>]*>(.*?)</h1>', source, re.S)
                heading = unescape(re.sub(r'<[^>]+>', '', h1[1])).strip()
                check(title and unescape(title[0]) == heading + ' | DJ ATLANTIS', path, 'specialty title must match event and city in H1')

        for tag, attrs in tags:
            if tag != 'a' or not attrs.get('href'):
                continue
            parsed = urlsplit(urljoin(base, attrs['href']))
            if parsed.hostname not in ('djatlantis.co.il', 'www.djatlantis.co.il'):
                continue
            destination = SITE / unquote(parsed.path).lstrip('/')
            if destination.is_dir():
                destination /= 'index.html'
            check(destination.is_file(), path, 'broken internal link: ' + attrs['href'])
            if parsed.fragment and destination in pages:
                check(unquote(parsed.fragment) in pages[destination][2], path, 'missing anchor: ' + attrs['href'])

        for raw in re.findall(r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', source, re.S):
            try:
                data = json.loads(raw)
            except ValueError as error:
                check(False, path, 'invalid JSON-LD: ' + str(error))
                continue
            graph = data.get('@graph', [data]) if isinstance(data, dict) else data
            for node in graph:
                if node.get('@type') == 'BreadcrumbList':
                    final = max(node.get('itemListElement', []), key=lambda item: item.get('position', 0), default={})
                    check(final.get('item') == base, path, 'breadcrumb points to a different page')

    sitemap = ET.parse(SITE / 'sitemap.xml')
    urls = [entry.text for entry in sitemap.findall('.//{*}loc')]
    check(set(urls) == set(canonical_urls), SITE / 'sitemap.xml', 'sitemap must include every indexable canonical once, excluding noindex pages')
    check(len(urls) == len(set(urls)), SITE / 'sitemap.xml', 'duplicate sitemap URL')
    check(len(canonical_urls) == len(set(canonical_urls)), SITE, 'duplicate canonical')
    duplicates = [title for title, count in Counter(titles).items() if count > 1]
    check(not duplicates, SITE, 'duplicate titles: ' + repr(duplicates))
    assert not errors, '\n'.join(errors[:40]) + f'\n{len(errors)} total failures'
    print(f'PASS: {len(pages)} HTML pages, {len(urls)} sitemap URLs; metadata, links, anchors, JSON-LD, breadcrumbs and unquoted city names.')


if __name__ == '__main__':
    check_site()
