const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Template contract: every facade uses the same playback handler, including city/event pages.
let pageCount = 0;
let facadeCount = 0;
for (const file of fs.readdirSync('netlify-deploy', { recursive: true }).filter((file) => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join('netlify-deploy', file), 'utf8');
  const facades = html.match(/<button\b[^>]*\bclass="youtube-facade"[^>]*>/g) || [];
  if (!facades.length) continue;
  assert.match(html, /<script\b[^>]*src="[^"]*assets\/youtube-facade\.js[^>]*\bdefer/, file);
  assert.match(html, /<script\b[^>]*src="[^"]*assets\/pause-active-youtube\.js[^>]*\bdefer/, file);
  for (const facade of facades) {
    const src = facade.match(/data-youtube-src="([^"]+)"/)?.[1].replaceAll('&amp;', '&');
    const url = new URL(src);
    assert.match(url.hostname, /^www\.youtube(?:-nocookie)?\.com$/, file);
    assert.match(url.pathname, /^\/embed\/[A-Za-z0-9_-]{11}$/, file);
    assert.notEqual(url.searchParams.get('autoplay'), '1', file);
    assert.match(facade, /data-youtube-title="[^"]+"/, file);
    assert.match(facade, /aria-label="[^"]+"/, file);
  }
  pageCount += 1;
  facadeCount += facades.length;
}
assert.ok(pageCount > 500, 'the shared facade contract covers the whole published site');

const source = fs.readFileSync('netlify-deploy/assets/youtube-facade.js', 'utf8');
function setup(userAgent) {
  const listeners = new Map();
  const frames = [];
  const registered = [];
  const facades = ['lY5yt_Ja710', '136tPMHRPek'].map((id) => ({
    dataset: { youtubeSrc: `https://www.youtube-nocookie.com/embed/${id}?rel=0&origin=https%3A%2F%2Fdjatlantis.co.il`, youtubeTitle: id },
    replaceWith(frame) { this.frame = frame; },
  }));
  const document = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    querySelectorAll: () => facades.filter((facade) => !facade.frame),
    createElement(tag) {
      assert.equal(tag, 'iframe');
      const frame = { style: {}, events: {}, focusCount: 0,
        addEventListener(name, callback) { this.events[name] = callback; },
        focus() { this.focusCount += 1; },
      };
      frames.push(frame);
      return frame;
    },
  };
  const window = { location: { origin: 'http://127.0.0.1:4173' }, registerActiveYouTube: (frame) => registered.push(frame) };
  vm.runInNewContext(source, { document, window, navigator: { userAgent }, URL });
  return { listeners, frames, registered, facades };
}

const safariAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile Safari/604.1',
];
for (const agent of safariAgents) {
  const test = setup(agent);
  assert.equal(test.frames.length, 0, 'wait until gallery ?watch selection has run');
  test.facades[0].dataset.youtubeSrc = 'https://www.youtube.com/embed/PRfKQ0N83lg?rel=0';
  test.facades[0].dataset.youtubeTitle = 'Selected event';
  test.listeners.get('DOMContentLoaded')();
  assert.equal(test.frames.length, 2);
  assert.equal(test.registered.length, 0, 'lazy native frames must not initialize YT.Player before loading');
  for (const frame of test.frames) {
    const url = new URL(frame.src);
    assert.equal(url.searchParams.get('autoplay'), '0', 'WebKit play comes from the native control, not autoplay');
    assert.equal(url.searchParams.get('playsinline'), '1');
    assert.equal(url.searchParams.get('enablejsapi'), '1');
    assert.equal(url.searchParams.get('origin'), 'http://127.0.0.1:4173');
    assert.equal(frame.referrerPolicy, 'strict-origin-when-cross-origin');
    assert.equal(frame.loading, 'lazy');
    assert.equal(frame.focusCount, 0, 'initial rendering must not steal focus or scroll');
  }
  assert.equal(new URL(test.frames[0].src).hostname, 'www.youtube.com', 'preserve selected embed host');
  assert.equal(new URL(test.frames[0].src).pathname, '/embed/PRfKQ0N83lg', 'preserve selected video');
  assert.equal(test.frames[0].title, 'Selected event');
  test.frames[0].events.load();
  assert.deepEqual(test.registered, [test.frames[0]], 'register only the frame that actually loaded');
}

for (const agent of ['Mozilla/5.0 Chrome/130.0 Safari/537.36', 'Mozilla/5.0 (Linux; Android 15) Chrome/130.0 Safari/537.36', 'Mozilla/5.0 Firefox/132.0']) {
  const test = setup(agent);
  assert.equal(test.listeners.has('DOMContentLoaded'), false);
  assert.equal(test.frames.length, 0, 'other browsers retain click-to-load');
  test.listeners.get('click')({ target: { closest: () => test.facades[0] } });
  assert.equal(test.frames.length, 1);
  assert.equal(new URL(test.frames[0].src).searchParams.get('autoplay'), '1');
  assert.equal(test.frames[0].loading, 'eager');
  assert.equal(test.frames[0].focusCount, 1);
  assert.deepEqual(test.registered, [test.frames[0]]);
}

console.log(`youtube playback contracts: ok (${pageCount} pages, ${facadeCount} facades; Safari native-play and other-browser click paths)`);
