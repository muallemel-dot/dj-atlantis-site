from __future__ import annotations

import json
import re
import unittest
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CITY_ROOT = ROOT / "netlify-deploy" / "ערים"
CITY_DATA = json.loads((ROOT / "data" / "city-template-data.json").read_text(encoding="utf-8"))
VIDEO_DATA = json.loads((ROOT / "data" / "city-event-videos.json").read_text(encoding="utf-8"))["cities"]


def event_section(page: str) -> str:
    match = re.search(r'<section[^>]+id="event-video"[\s\S]*?</section>', page, re.I)
    if not match:
        raise AssertionError("event-video section is missing")
    return match.group(0)


class CityVideoSectionsTest(unittest.TestCase):
    def test_all_city_pages_use_the_shared_heading_and_verified_gallery_rule(self) -> None:
        self.assertEqual(len(CITY_DATA), 128)
        for city in CITY_DATA:
            page = (CITY_ROOT / city["slug"] / "index.html").read_text(encoding="utf-8")
            section = unescape(event_section(page))
            self.assertIn(f'<h2 id="event-video-title">מוזיקה ואווירה לאירועים ב־{city["name"]}</h2>', section)
            self.assertIn(f"מתכננים אירוע באזור {city['name']}?", section)
            self.assertIn("הסרטונים הבאים מציגים אירועים מהאולמות וגני אירועים הטובים בארץ.", section)
            self.assertIn('<div class="home-video-strip"', section)
            local_videos = VIDEO_DATA.get(city["name"], [])[:2]
            if local_videos:
                self.assertEqual(section.count('class="ashdod-video-frame"'), len(local_videos))
                for video in local_videos:
                    self.assertIn(f'/embed/{video["id"]}?', section)
                    self.assertIn(f'data-youtube-title="{video["title"]}"', section)
            else:
                self.assertEqual(section.count('class="ashdod-video-frame"'), 1)
                self.assertIn('class="ashdod-video-list"', section)
                self.assertIn('/embed/lY5yt_Ja710?', section)
                self.assertIn('data-youtube-title="DJ ATLANTIS בחתונה חרדית מודרנית באולמי אדמה אשדוד"', section)

    def test_canonical_and_structured_city_data_remain_aligned(self) -> None:
        for city in CITY_DATA:
            page = (CITY_ROOT / city["slug"] / "index.html").read_text(encoding="utf-8")
            canonical = f'https://djatlantis.co.il/ערים/{city["slug"]}/'
            self.assertIn('<html lang="he" dir="rtl">', page)
            self.assertIn('<meta name="viewport" content="width=device-width, initial-scale=1">', page)
            self.assertIn('@media (max-width:760px)', page)
            self.assertIn(f'<link rel="canonical" href="{canonical}">', page)
            raw_schema = re.search(r'<script type="application/ld\+json">([\s\S]*?)</script>', page).group(1)
            graph = json.loads(unescape(raw_schema))["@graph"]
            served = [item["areaServed"] for item in graph if "areaServed" in item]
            self.assertTrue(served)
            self.assertEqual(set(served), {city["name"]})


if __name__ == "__main__":
    unittest.main()
