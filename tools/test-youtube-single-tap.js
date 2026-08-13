const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pages = new Map([
  ['index.html', 1],
  ['video/index.html', 34],
  ['שירותים/דיגיי-דתי/index.html', 2],
]);

let total = 0;
for (const [file, expected] of pages) {
  const html = fs.readFileSync(path.join('netlify-deploy', file), 'utf8');
  const frames = html.match(/<iframe\b[^>]*\bsrc="https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/[^>]+>/g) || [];

  assert.equal(frames.length, expected, `${file}: expected ${expected} direct YouTube players`);
  assert.doesNotMatch(html, /class="(?:video-poster|wide-video-preview)"|data-src=|autoplay=1/);
  assert.doesNotMatch(html, /querySelectorAll\('\.video-player'\)|dataset\.youtube/);
  for (const frame of frames) {
    assert.match(frame, /\btitle="[^"]+"/);
    assert.match(frame, /\bloading="lazy"/);
    assert.match(frame, /enablejsapi=1/);
    assert.match(frame, /playsinline=1/);
    assert.match(frame, /origin=https%3A%2F%2Fdjatlantis\.co\.il/);
  }
  total += frames.length;
}

assert.equal(total, 37);
console.log('youtube-single-tap: ok');
