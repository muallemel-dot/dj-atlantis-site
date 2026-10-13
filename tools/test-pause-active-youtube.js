const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('netlify-deploy/assets/pause-active-youtube.js', 'utf8');
function setup(withObserver) {
  const directFrame = { tagName: 'IFRAME', src: 'https://www.youtube.com/embed/test?enablejsapi=1&origin=https%3A%2F%2Fdjatlantis.co.il', rect: { left: 0, top: 0, right: 640, bottom: 360, width: 640, height: 360 }, getBoundingClientRect() { return this.rect; } };
  const listeners = {};
  const timers = new Map();
  const playerByFrame = new Map();
  let timerId = 0;
  let now = 0;
  let intersectionCallback;
  let appendedScript;
  const setTimeout = (callback, delay) => { timers.set(++timerId, { callback, at: now + delay }); return timerId; };
  const clearTimeout = (id) => timers.delete(id);
  const advance = (milliseconds) => {
    const end = now + milliseconds;
    for (;;) {
      const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].callback();
    }
    now = end;
  };
  const flush = () => advance(750);
  const document = {
    hidden: false,
    querySelectorAll: () => [directFrame],
    querySelector: () => appendedScript || null,
    createElement: () => ({}),
    head: { append(script) { assert.equal(appendedScript, undefined, 'load the API only once'); appendedScript = script; } },
    addEventListener: (name, callback) => { listeners[name] = callback; },
  };
  const window = { innerWidth: 1280, innerHeight: 720, location: { origin: 'https://deploy-preview.example' }, addEventListener: (name, callback) => { listeners[name] = callback; } };
  if (withObserver) window.IntersectionObserver = class {
    constructor(callback) { intersectionCallback = callback; }
    observe() {}
  };
  vm.runInNewContext(source, { document, window, setTimeout, clearTimeout, URL });
  assert.equal(new URL(directFrame.src).searchParams.get('origin'), window.location.origin);
  window.registerActiveYouTube(directFrame);
  class Player {
    constructor(frame, options) {
      this.state = 2;
      this.pauseCount = 0;
      this.events = options.events;
      playerByFrame.set(frame, this);
    }
    getPlayerState() { return this.state; }
    pauseVideo() { this.state = 2; this.pauseCount += 1; }
    start(state = 1) { this.state = state; this.events.onStateChange({ data: state, target: this }); }
  }
  window.YT = { Player, PlayerState: { PLAYING: 1, BUFFERING: 3 } };
  window.onYouTubeIframeAPIReady();
  const first = playerByFrame.get(directFrame);
  first.events.onReady();
  const visibility = (ratio) => {
    if (withObserver) intersectionCallback([{ target: directFrame, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    else {
      directFrame.rect = { left: 0, top: 720 - ratio * 360, right: 640, bottom: 1080 - ratio * 360, width: 640, height: 360 };
      listeners.scroll();
      advance(16);
    }
  };
  return { document, window, directFrame, playerByFrame, first, listeners, timers, flush, visibility };
}

for (const withObserver of [true, false]) {
  const t = setup(withObserver);
  t.visibility(0.2);
  t.first.start();
  t.flush();
  assert.equal(t.first.pauseCount, 0, 'partially visible videos can play in short/landscape viewports');
  t.visibility(0);
  assert.equal(t.first.pauseCount, 0, 'allow a brief viewport transition');
  t.visibility(0.2);
  t.flush();
  assert.equal(t.first.pauseCount, 0, 'returning cancels the pending pause');
  t.visibility(0);
  t.flush();
  assert.equal(t.first.pauseCount, 1, 'fully offscreen playback pauses');
  t.visibility(1);
  assert.equal(t.first.state, 2, 'returning never resumes automatically');

  const otherFrame = { ...t.directFrame, src: 'https://www.youtube.com/embed/other?enablejsapi=1' };
  t.window.registerActiveYouTube(otherFrame);
  const second = t.playerByFrame.get(otherFrame);
  t.first.start(3);
  second.start(3);
  assert.equal(t.first.state, 2, 'new playback pauses even a buffering previous video');
  second.start();
  t.first.start();
  assert.equal(second.state, 2, 'only one player can keep playing');

  t.document.hidden = true;
  t.listeners.visibilitychange();
  assert.equal(t.first.state, 2, 'backgrounding the page pauses immediately');
  second.start(3);
  assert.equal(second.state, 2, 'buffering cannot restart playback in a hidden tab');
}

console.log('pause-active-youtube: ok');
