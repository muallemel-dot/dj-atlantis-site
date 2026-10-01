from __future__ import annotations

import json
import re
from html import escape, unescape
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
PUBLISH_ROOT = ROOT / "netlify-deploy"
ASHDOD = PUBLISH_ROOT / "ערים" / "דיגיי-תקליטן-חרדי-דתי-לאומי-אשדוד" / "index.html"
HOME = PUBLISH_ROOT / "index.html"
DATA = ROOT / "data" / "city-template-data.json"
VIDEO_DATA = ROOT / "data" / "city-event-videos.json"
DEFAULT_FAQS = [
    ("האם חייבים להכין רשימת שירים מלאה?", "לא. מספיק לשתף כמה שירים חשובים, סגנונות רצויים ודברים שלא מתאימים לכם. מכאן אני בונה כיוון מקצועי ומשאיר גמישות למה שקורה באירוע."),
    ("איך מתכוננים יחד לחתונה?", "מתחילים בפנייה עם תאריך, מקום וסוג האירוע. בחתונות אני נפגש איתכם פנים אל פנים כדי להכיר ולדבר על הטעם המוזיקלי ועל הדברים שחשוב לכם לשמור עליהם."),
    ("יש ציוד גיבוי?", "כן. יש לי ציוד כפול לצורך גיבוי, כשכבת היערכות נוספת אם ציוד מסוים דורש החלפה."),
    ("האם השירות כולל גם חינות ובר מצוות?", "כן. לצד חתונות אני נותן שירות גם לחינות ולבר מצוות. באירועים האלה ההיכרות והתיאום מתחילים בשיחה טלפונית."),
    ("מה שולחים כדי לבדוק תאריך?", "שלחו לי בוואטסאפ תאריך, מקום וסוג האירוע, ומשם נוכל להתחיל לבדוק התאמה וזמינות."),
]
APPROVED_WORKFLOW = {
    "step_1_title": "שולחים את הפרטים",
    "step_1_body": "תאריך, מקום וסוג אירוע מספיקים כדי להתחיל לבדוק זמינות והתאמה.",
    "step_2_title": "נפגשים ומכירים",
    "step_2_body": "בחתונות אני נפגש איתכם פנים אל פנים. אנחנו מדברים על הטעם שלכם ועל הדברים שחשוב לכם לשמור עליהם.",
    "step_3_title": "בונים כיוון מוזיקלי",
    "step_3_body": "ההיערכות מבוססת על הזוג, הקהל ומסגרת האירוע, בלי להניח מראש שכל חתונה דתית צריכה להישמע אותו הדבר.",
    "backup_title": "ציוד כפול לצורך גיבוי",
    "backup_body": "יש לי ציוד כפול לגיבוי, כדי להוסיף שכבת היערכות אם ציוד מסוים דורש החלפה. זו הכנה מקצועית, בלי הבטחה שאף תקלה לא יכולה לקרות.",
}
CITY_NAME_OVERRIDES = {
    "דיגיי-תקליטן-חרדי-דתי-לאומי-ביתר-עילית": 'בית"ר עילית',
    "דיגיי-תקליטן-חרדי-דתי-לאומי-כפר-חבד": 'כפר חב"ד',
}


def replace_one(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, lambda _: replacement, text, count=1, flags=re.I | re.S)
    if count != 1:
        raise RuntimeError(f"לא נמצא מקטע יחיד להחלפה: {label} ({count})")
    return updated


def home_fragment(home: str, start_marker: str) -> str:
    start = home.index(start_marker)
    end = home.index("</section>", start)
    return home[start:end]


def page_section(page: str, section_id: str, replacement: str) -> str:
    return replace_one(
        page,
        rf'<section class="section ashdod-section(?: [^"]*)?" id="{re.escape(section_id)}"[^>]*>.*?</section>',
        replacement,
        section_id,
    )


def plain(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def short(value: str, limit: int = 430) -> str:
    if len(value) <= limit:
        return value
    clipped = value[:limit]
    stop = max(clipped.rfind("."), clipped.rfind("!"), clipped.rfind("?"))
    return clipped[: stop + 1] if stop > 180 else clipped.rstrip() + "…"


def section_html(page: str, section_id: str) -> str:
    match = re.search(rf'<section[^>]*id="{re.escape(section_id)}"[^>]*>(.*?)</section>', page, re.I | re.S)
    return match.group(1) if match else ""


def snapshot_city_data() -> list[dict]:
    defaults = [
        "לכל משפחה יש שפה מוזיקלית אחרת. אני מתכנן את הערב סביב האנשים, סוג השמחה והגבולות שחשוב לכם לשמור.",
        "לפני האירוע אנחנו מסמנים את הרגעים החשובים ואת סוג האנרגיה הרצוי בכל חלק של הערב.",
        "אני מסתכל על הערב כעל סיפור מוזיקלי אחד. מעברים מדויקים שומרים על תחושת סדר ומאפשרים לרחבה להיפתח בזמן הנכון.",
        "רשימת העדפות טובה כוללת כמה עוגנים משמעותיים ומשאירה מקום לקריאה מקצועית של הקהל.",
        "בזמן האירוע אני בוחן מי רוקד, אילו שירים יוצרים תגובה ואיפה נכון להחליף כיוון לפני שהאנרגיה יורדת.",
    ]
    records = []
    for directory in sorted((PUBLISH_ROOT / "ערים").iterdir(), key=lambda item: item.name):
        path = directory / "index.html"
        if not path.is_file():
            continue
        page = path.read_text(encoding="utf-8")
        schema_match = re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.I | re.S)
        description_match = re.search(r'<meta name="description" content="([^"]*)">', page, re.I)
        if not schema_match or not description_match:
            raise RuntimeError(f"חסרים נתוני עיר ב-{path}")
        schema = json.loads(schema_match.group(1))
        local_business = next(item for item in schema["@graph"] if item.get("@type") == "LocalBusiness")
        city = CITY_NAME_OVERRIDES.get(directory.name, local_business["areaServed"])
        content = section_html(page, "content") or (section_html(page, "fit") + section_html(page, "how-it-works"))
        paragraphs = [short(plain(item)) for item in re.findall(r"<p(?:\s[^>]*)?>(.*?)</p>", content, re.I | re.S)]
        paragraphs = [item for item in paragraphs if len(item) >= 70 and not item.startswith(("מדריך", "התאמה", "איך עובדים"))]
        paragraphs = (paragraphs + defaults)[:5]
        faqs = [(plain(q), plain(a)) for q, a in re.findall(r"<details[^>]*>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>", page, re.I | re.S)]
        related = []
        for slug, label in re.findall(r'href="\.\./([^"/]+)/"[^>]*>(.*?)</a>', page, re.I | re.S):
            if slug != directory.name and slug not in {item[0] for item in related}:
                related.append((slug, plain(label)))
        region = re.search(r'href="(/אזורים/[^"]+/)"[^>]*>(.*?)</a>', page, re.I | re.S)
        records.append({
            "name": city,
            "in_name": "ב" + city,
            "slug": directory.name,
            "title": f"דיג׳יי דתי ב{city} לחתונות ואירועים | DJ ATLANTIS",
            "description": unescape(description_match.group(1)),
            "h1": f"דיג׳יי תקליטן דתי ב{city} לחתונות ואירועים חרדי | דתי מודרני | דתי לאומי",
            "intro": paragraphs[0],
            "listen": paragraphs[1],
            "flow": paragraphs[2],
            "requests": paragraphs[3],
            "reading": paragraphs[4],
            "faqs": faqs[:6] or DEFAULT_FAQS,
            "related": related[:4],
            "region": [region.group(1), plain(region.group(2))] if region else None,
        })
    if len(records) != 128:
        raise RuntimeError(f"ציפיתי ל-128 דפי ערים ומצאתי {len(records)}")
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return records


def load_city_data() -> list[dict]:
    return json.loads(DATA.read_text(encoding="utf-8")) if DATA.is_file() else snapshot_city_data()


def homepage_videos(home: str, cities: list[dict]) -> tuple[str, dict[str, list[dict]]]:
    items = []
    featured_match = re.search(r'<div class="wide-video-box">.*?</div>', home, re.I | re.S)
    if not featured_match:
        raise RuntimeError("סרטון הכותרת של דף הבית לא נמצא")
    featured = featured_match.group(0)
    button = re.search(r'data-youtube-src="[^"]*?/embed/([^?&"]+)[^"]*"[^>]*data-youtube-title="([^"]+)"', featured, re.I | re.S)
    if not button:
        raise RuntimeError("פרטי סרטון הכותרת של דף הבית לא נמצאו")
    items.append({"id": button.group(1), "title": unescape(button.group(2))})
    for card in re.findall(r'<a class="home-video-card".*?</a>', home, re.I | re.S):
        video_id = re.search(r'[?&]watch=([^&#"]+)', card)
        title = re.search(r'<img[^>]+alt="([^"]+)"', card, re.I)
        if video_id and title:
            items.append({"id": video_id.group(1), "title": unescape(title.group(1))})

    mapping = {city["name"]: [] for city in cities}
    available = {(item["id"], item["title"]) for item in items}
    configured = json.loads(VIDEO_DATA.read_text(encoding="utf-8"))["cities"]
    for city, videos in configured.items():
        if city not in mapping:
            raise RuntimeError(f"עיר לא מוכרת בנתוני הסרטונים: {city}")
        for video in videos:
            item = {"id": video["id"], "title": video["title"]}
            if (item["id"], item["title"]) not in available:
                raise RuntimeError(f"הסרטון אינו תואם לגלריה הראשית: {city} / {item['id']}")
            mapping[city].append(item)
    return featured, mapping


def video_frame(item: dict) -> str:
    video_id = escape(item["id"])
    title = escape(item["title"])
    return f'''<div class="ashdod-video-frame">
          <button class="youtube-facade" type="button" data-youtube-src="https://www.youtube-nocookie.com/embed/{video_id}?rel=0&amp;playsinline=1" data-youtube-title="{title}" aria-label="הפעלת הסרטון: {title}">
            <img src="https://i.ytimg.com/vi/{video_id}/hqdefault.jpg" width="480" height="360" alt="{title}" loading="lazy" decoding="async"><span class="youtube-facade-play" aria-hidden="true"></span><span class="youtube-facade-caption" aria-hidden="true">לחצו להפעלה</span>
          </button>
        </div>'''


def shared_city_copy(city: dict, source: dict) -> dict:
    """Use the approved Ofra copy everywhere; only the city name may change."""
    rendered = dict(city)
    source_name = source["name"]
    for key in ("title", "description", "h1", "intro", "listen", "flow", "requests", "reading"):
        rendered[key] = source[key].replace(source_name, city["name"])
    rendered["faqs"] = [
        [question.replace(source_name, city["name"]), answer.replace(source_name, city["name"])]
        for question, answer in source["faqs"]
    ]
    rendered.update(APPROVED_WORKFLOW)
    rendered["in_name"] = "ב" + city["name"]
    return rendered


def build(CITY: dict, template: str, home: str, featured_video: str, video_mapping: dict[str, list[dict]]) -> str:
    page = re.sub(r'\s*<!-- (?:shared-city-template|city-template-pilot):.*?-->', '', template, flags=re.I)
    SLUG = CITY["slug"]
    city = CITY["name"]
    canonical = f"https://djatlantis.co.il/ערים/{SLUG}/"
    image = "https://djatlantis.co.il/assets/gallery-atlantis/event-53.jpg"
    whatsapp = "https://wa.me/972507324480?text=" + quote(
        f"שלום אלי, אשמח לבדוק תאריך לאירוע {CITY['in_name']}"
    )

    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "LocalBusiness",
                "name": "DJ ATLANTIS - אלי מועלם",
                "url": "https://djatlantis.co.il",
                "telephone": "050-732-4480",
                "areaServed": city,
            },
            {
                "@type": "Service",
                "name": f"דיג׳יי לחתונות דתיות {CITY['in_name']}",
                "provider": {"@type": "LocalBusiness", "name": "DJ ATLANTIS - אלי מועלם"},
                "areaServed": city,
                "serviceType": "דיג׳יי לחתונות ואירועים דתיים",
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": question,
                        "acceptedAnswer": {"@type": "Answer", "text": answer},
                    }
                    for question, answer in CITY["faqs"]
                ],
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "דף הבית", "item": "https://djatlantis.co.il/"},
                    {"@type": "ListItem", "position": 2, "name": "ערים", "item": "https://djatlantis.co.il/#seo-cities"},
                    {"@type": "ListItem", "position": 3, "name": f"דיג׳יי לחתונות דתיות {CITY['in_name']}", "item": canonical},
                ],
            },
        ],
    }

    metadata = {
        r"<title>.*?</title>": f"<title>{escape(CITY['title'])}</title>",
        r'<meta name="description" content=".*?">': f'<meta name="description" content="{escape(CITY["description"])}">',
        r'<link rel="canonical" href=".*?">': f'<link rel="canonical" href="{canonical}">',
        r'<meta property="og:title" content=".*?">': f'<meta property="og:title" content="{escape(CITY["title"])}">',
        r'<meta property="og:description" content=".*?">': f'<meta property="og:description" content="{escape(CITY["description"])}">',
        r'<meta property="og:url" content=".*?">': f'<meta property="og:url" content="{canonical}">',
        r'<meta property="og:image" content=".*?">': f'<meta property="og:image" content="{image}">',
        r'<meta name="twitter:title" content=".*?">': f'<meta name="twitter:title" content="{escape(CITY["title"])}">',
        r'<meta name="twitter:description" content=".*?">': f'<meta name="twitter:description" content="{escape(CITY["description"])}">',
        r'<meta name="twitter:image" content=".*?">': f'<meta name="twitter:image" content="{image}">',
    }
    for pattern, replacement in metadata.items():
        page = replace_one(page, pattern, replacement, pattern)
    page = replace_one(
        page,
        r'<script type="application/ld\+json">.*?</script>',
        '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + "</script>",
        "structured data",
    )
    page = page.replace("<!doctype html>", "<!doctype html>\n<!-- shared-city-template: source=ashdod -->", 1)
    page = replace_one(
        page,
        r'<nav class="seo-breadcrumbs".*?</nav>',
        f'<nav class="seo-breadcrumbs" aria-label="פירורי לחם"><a href="/">דף הבית</a><span aria-hidden="true">‹</span><a href="/#seo-cities">עמודי מידע לפי ערים</a><span aria-hidden="true">‹</span><span aria-current="page">דיג׳יי לחתונות דתיות {CITY["in_name"]}</span></nav>',
        "breadcrumbs",
    )

    hero = f'''<section class="hero ashdod-hero" aria-labelledby="page-title">
      <div class="hero-in hero-grid">
        <div class="ashdod-hero-copy">
          <p class="kicker">אלי מועלם | DJ ATLANTIS</p>
          <h1 id="page-title">{escape(CITY["h1"])}</h1>
          <p class="lead">{escape(CITY["description"])}</p>
          <p class="ashdod-hero-note">בעמוד הזה תוכלו להכיר אותי, לצפות ברגעים אמיתיים מחתונות, חינות, בר מצוות ואירועים ולהבין איך אני מתאים את המוזיקה לזוג, למשפחה ולקהל.</p>
          <div class="btns">
            <a class="btn gold" href="{whatsapp}" target="_blank" rel="noopener">בדיקת תאריך בוואטסאפ</a>
          </div>
        </div>
        <figure class="ashdod-hero-photo">
          <img src="../../assets/gallery-atlantis/event-53.jpg" width="853" height="1280" alt="אלי מועלם DJ ATLANTIS עובד בעמדת הדיג׳יי באירוע">
          <figcaption>DJ ATLANTIS</figcaption>
        </figure>
      </div>
    </section>'''
    page = replace_one(page, r'<section class="hero ashdod-hero".*?</section>', hero, "hero")

    video_strip = home_fragment(home, '<div class="home-video-strip"')
    video_strip = re.sub(r"[ \t]+(?=\n)", "", video_strip).rstrip()
    video_strip = video_strip.replace('href="video/', 'href="../../video/')
    local_videos = video_mapping.get(city, [])[:2]
    video_title = f"מוזיקה ואווירה לאירועים ב־{city}"
    video_intro = f"מתכננים אירוע באזור {city}? קבלו טעימה מהמוזיקה ומהאווירה שאני מביא לרחבה. הסרטונים הבאים מציגים אירועים במקומות שונים."
    if local_videos:
        frames = "".join(video_frame(item) for item in local_videos)
        video_kicker = "תיעוד מקומי"
    else:
        frames = f'<div class="ashdod-video-frame" style="grid-column:1/-1">{featured_video}</div>'
        video_kicker = "גלריית אירועים"
    gallery = f'      <div class="ashdod-video-list">{frames}</div>'
    gallery += f'\n      {video_strip}'
    videos = f'''<section class="section ashdod-section" id="event-video" aria-labelledby="event-video-title">
      <div class="ashdod-section-head">
        <p class="kicker">{video_kicker}</p>
        <h2 id="event-video-title">{escape(video_title)}</h2>
        <p>{escape(video_intro)}</p>
      </div>
{gallery}
    </section>'''
    page = page_section(page, "event-video", videos)

    fit = f'''<section class="section ashdod-section" id="fit" aria-labelledby="fit-title">
      <div class="ashdod-section-head"><p class="kicker">התאמה לפני הכול</p><h2 id="fit-title">המוזיקה צריכה להרגיש שלכם</h2></div>
      <div class="ashdod-two-col">
        <div><p>{escape(CITY["intro"])}</p><p>{escape(CITY["listen"])}</p></div>
        <aside class="ashdod-fact-card"><strong>מה אפשר לבדוק כבר בעמוד</strong><p>סגנון העבודה שלי, סרטונים ותמונות מהעמדה ומהרחבה והמלצות של זוגות שכבר עבדו איתי.</p></aside>
      </div>
    </section>'''
    page = page_section(page, "fit", fit)

    how = f'''<section class="section ashdod-section" id="how-it-works" aria-labelledby="how-it-works-title">
      <div class="ashdod-section-head"><p class="kicker">איך עובדים יחד</p><h2 id="how-it-works-title">מהפנייה הראשונה עד ההיערכות לאירוע</h2></div>
      <div class="ashdod-steps">
        <article class="ashdod-step"><span class="ashdod-step-number" aria-hidden="true">1</span><h3>{escape(CITY["step_1_title"])}</h3><p>{escape(CITY["step_1_body"])}</p></article>
        <article class="ashdod-step"><span class="ashdod-step-number" aria-hidden="true">2</span><h3>{escape(CITY["step_2_title"])}</h3><p>{escape(CITY["step_2_body"])}</p></article>
        <article class="ashdod-step"><span class="ashdod-step-number" aria-hidden="true">3</span><h3>{escape(CITY["step_3_title"])}</h3><p>{escape(CITY["step_3_body"])}</p></article>
      </div>
      <aside class="ashdod-fact-card ashdod-backup"><strong>{escape(CITY["backup_title"])}</strong><p>{escape(CITY["backup_body"])}</p></aside>
    </section>'''
    page = page_section(page, "how-it-works", how)

    gallery = home_fragment(home, '<section class="section gallery gallery-wall-demo" id="gallery">') + "</section>"
    gallery = gallery.replace('class="section gallery', 'class="section ashdod-section gallery', 1)
    gallery = gallery.replace('srcset="assets/', 'srcset="../../assets/').replace('src="assets/', 'src="../../assets/').replace('data-full-src="assets/', 'data-full-src="../../assets/')
    gallery = replace_one(
        gallery,
        r'<div class="section-heading reveal">.*?</div>',
        '<div class="section-heading reveal"><p class="kicker">גלריית תמונות</p><h2>רגעים מהרחבה</h2><p>מבחר רגעים מהחתונות והאירועים שלי — לחצו לצפייה ותרגישו את האווירה.</p></div>',
        "gallery heading",
    )
    page = page_section(page, "gallery", gallery)

    more = f'''<section class="section ashdod-section" id="more-events" aria-labelledby="more-events-title">
      <div class="ashdod-section-head"><p class="kicker">אירועים נוספים</p><h2 id="more-events-title">חינות ובר מצוות {CITY["in_name"]}</h2><p>לצד חתונות אני נותן שירות גם לחינות ולבר מצוות. ההיכרות והתיאום מתחילים בשיחה ובהבנת המסגרת המשפחתית והקהל.</p></div>
      <div class="ashdod-services"><article class="ashdod-service-card"><h3>חינה</h3><p>התאמה למסגרת המשפחתית ולסגנון המוזיקלי של החינה, על בסיס שיחה מקדימה.</p><a href="/שירותים/דיגיי-לחינה-דתית/">מידע על דיג׳יי לחינה דתית</a></article><article class="ashdod-service-card"><h3>בר מצווה</h3><p>מוזיקה לאירוע משפחתי עם קהל צעיר ומבוגר, בהתאם למה שמסכמים בשיחה.</p><a href="/שירותים/דיגיי-לבר-מצווה-דתית/">מידע על דיג׳יי לבר מצווה דתית</a></article></div>
    </section>'''
    page = page_section(page, "more-events", more)

    region_link = ""
    if CITY.get("region"):
        region_link = f'<a href="{escape(CITY["region"][0])}">{escape(CITY["region"][1])}</a>'
    related_links = "".join(
        f'<a href="../{escape(slug)}/">{escape(label)}</a>' for slug, label in CITY.get("related", [])
    )
    nearby = f'''<section class="section ashdod-section" aria-labelledby="nearby-title">
      <p class="kicker">מידע באזור</p><h2 id="nearby-title">שירותים ומיקומים סמוכים</h2>
      <div class="ashdod-links"><a href="/שירותים/דיגיי-לחתונה-דתית/">דיג׳יי לחתונה דתית</a><a href="/שירותים/דיגיי-לאירוע-חרדי/">דיג׳יי לאירוע חרדי</a>{region_link}{related_links}</div>
    </section>'''
    page = replace_one(page, r'<section class="section ashdod-section" aria-labelledby="nearby-title">.*?</section>', nearby, "nearby")

    faq_items = "".join(f"<details><summary>{escape(q)}</summary><p>{escape(a)}</p></details>" for q, a in CITY["faqs"])
    faq = f'''<section class="section ashdod-section" id="faq" aria-labelledby="faq-title">
      <p class="kicker">שאלות שעוזרות לבחור</p><h2 id="faq-title">מידע שכדאי לדעת לפני שפונים</h2>{faq_items}
    </section>'''
    page = page_section(page, "faq", faq)

    contact = f'''<section class="section ashdod-section ashdod-cta" id="contact" aria-labelledby="contact-title">
      <p class="kicker">פנייה פשוטה</p><h2 id="contact-title">רוצים לבדוק התאמה ותאריך?</h2><p>שלחו לי בוואטסאפ את התאריך, המקום וסוג האירוע. הכפתור יפתח שיחה איתי, וההודעה תישלח רק אחרי שתאשרו אותה בוואטסאפ.</p>
      <div class="btns"><a class="btn gold" href="{whatsapp}" target="_blank" rel="noopener">פתיחת שיחה בוואטסאפ</a><a class="btn dark" href="tel:+972507324480">חיוג ישיר: 050-732-4480</a></div>
    </section>'''
    page = page_section(page, "contact", contact)

    region_sentence = f' וגם על <a href="{escape(CITY["region"][0])}">{escape(CITY["region"][1])}</a>' if CITY.get("region") else ""
    internal = f'''<section class="internal-related" aria-labelledby="internal-related-title"><p class="kicker">להמשך הבדיקה</p><h2 id="internal-related-title">עוד מידע על DJ ATLANTIS</h2><p>אפשר לקרוא על <a href="/שירותים/דיגיי-דתי/">הגישה שלי כדיג׳יי לקהל הדתי</a>, על <a href="/שירותים/דיגיי-לחתונה-דתית/">הכנת המוזיקה לחתונה דתית</a>{region_sentence}.</p></section>'''
    page = replace_one(page, r'<section class="internal-related".*?</section>', internal, "internal links")
    return page


if __name__ == "__main__":
    cities = load_city_data()
    template = ASHDOD.read_text(encoding="utf-8")
    home = HOME.read_text(encoding="utf-8")
    featured, mapping = homepage_videos(home, cities)
    shared_copy = next(city for city in cities if city["name"] == "עפרה")
    local_city_count = 0
    for city in cities:
        rendered = build(shared_city_copy(city, shared_copy), template, home, featured, mapping)
        local_city_count += bool(mapping.get(city["name"]))
        output = PUBLISH_ROOT / "ערים" / city["slug"] / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding="utf-8")
    print(f"נבנו {len(cities)} דפי ערים בתבנית המשותפת; ל-{local_city_count} ערים נמצאו סרטונים מקומיים.")
