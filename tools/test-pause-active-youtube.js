const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('netlify-deploy/assets/pause-active-youtube.js', 'utf8');
const directFrame = { tagName: 'IFRAME', src: 'https://www.youtube.com/embed/test?enablejsapi=1&origin=https%3A%2F%2Fdjatlantis.co.il', getBoundingClientRect: () => ({ left: 0, top: 0, right: 640, bottom: 360, width: 640, height: 360 }) };
let intersectionCallback;

class IntersectionObserver {
  constructor(callback) { intersectionCallback = callback; }
  observe() {}
}

const document = {
  hidden: false,
  querySelectorAll: () => [directFrame],
  querySelector: () => null,
  createElement: () => ({}),
  head: { append() {} },
  addEventListener() {},
};
const window = { IntersectionObserver, innerWidth: 1280, innerHeight: 720, location: { origin: 'https://deploy-preview.example' } };
vm.runInNewContext(source, { document, window, console, setTimeout, URL });

assert.equal(new URL(directFrame.src).searchParams.get('origin'), window.location.origin);

const playerByFrame = new Map();
class Player {
  constructor(frame, options) {
    this.state = 1;
    this.pauseCount = 0;
    this.onStateChange = options.events.onStateChange;
    playerByFrame.set(frame, this);
  }
  getPlayerState() { return this.state; }
  pauseVideo() { this.state = 2; this.pauseCount += 1; }
}
window.YT = { Player, PlayerState: { PLAYING: 1 } };
window.onYouTubeIframeAPIReady();
intersectionCallback([{ target: directFrame, intersectionRatio: 0.49 }]);
const firstPlayer = playerByFrame.get(directFrame);
assert.equal(firstPlayer.pauseCount, 1);

const otherFrame = { tagName: 'IFRAME', src: 'https://www.youtube.com/embed/other?enablejsapi=1', getBoundingClientRect: directFrame.getBoundingClientRect };
window.registerActiveYouTube(otherFrame);
const secondPlayer = playerByFrame.get(otherFrame);
firstPlayer.state = 1;
secondPlayer.onStateChange({ data: 1, target: secondPlayer });
assert.equal(firstPlayer.pauseCount, 2, 'starting another video pauses the previous one');

console.log('pause-active-youtube: ok');
