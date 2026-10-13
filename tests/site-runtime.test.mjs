import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const site = new URL("../netlify-deploy/", import.meta.url);
const source = (path) => readFileSync(new URL(path, site), "utf8");
const pages = readdirSync(site, { recursive: true }).filter((path) => path.endsWith(".html"));
const scripts = (html) => [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);

function element(document) {
  const classes = new Set();
  return {
    children: [], attributes: {}, events: {}, dataset: {}, hidden: false,
    style: { setProperty() {} },
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle(name, value = !classes.has(name)) { value ? classes.add(name) : classes.delete(name); return value; },
    },
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.append(node); },
    contains(node) { return node === this || this.children.some((child) => child.contains?.(node)); },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); },
    toggleAttribute(name, value) { if (value) this.setAttribute(name, ""); else this.removeAttribute(name); },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(name, callback) { (this.events[name] ||= []).push(callback); },
    emit(name, event = {}) { this.events[name]?.forEach((callback) => callback(event)); },
    focus() { document.activeElement = this; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect: () => ({ top: 100, bottom: 400 }),
  };
}

function environment() {
  const document = {};
  Object.assign(document, element(document), { hidden: false });
  document.body = element(document);
  document.createElement = () => element(document);
  const timers = new Map();
  let serial = 0;
  const context = {
    document, location: { search: "", hash: "" }, URLSearchParams, Event,
    innerHeight: 800, scrollY: 0,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    setInterval(callback, delay) { timers.set(++serial, { callback, delay }); return serial; },
    clearInterval: (id) => timers.delete(id),
    setTimeout() {}, addEventListener: document.addEventListener.bind(document),
    IntersectionObserver: class { observe() {} unobserve() {} },
  };
  context.window = context;
  return { document, context, timers };
}

test("all live accessibility variants still toggle and reset when storage is denied", () => {
  const variants = new Set();
  let count = 0;
  for (const path of pages) {
    for (const script of scripts(source(path))) {
      if (!script.includes("dj-atlantis-accessibility")) continue;
      count += 1;
      variants.add(script);
    }
  }
  assert.equal(count, 523, "audit every deployed copy, including ignored city directories");
  assert.equal(variants.size, 2);
  for (const script of variants) {
    for (const denied of [false, true]) {
      const { document, context } = environment();
      const button = element(document);
      button.dataset = { a11yToggle: "reducedMotion", siteA11yToggle: "reducedMotion" };
      const reset = element(document);
      const controls = new Map([
        ["[data-header]", element(document)], [".menu-toggle", element(document)], [".site-menu", element(document)],
        [".accessibility-toggle", element(document)], [".accessibility-panel", element(document)],
        ["[data-a11y-reset]", reset], ["[data-site-a11y-reset]", reset],
        ['[data-a11y-toggle="reducedMotion"]', button], ['[data-site-a11y-toggle="reducedMotion"]', button],
      ]);
      document.querySelector = (selector) => controls.get(selector) || null;
      document.querySelectorAll = (selector) => selector === "[data-a11y-toggle]" || selector === "[data-site-a11y-toggle]" ? [button] : [];
      document.dispatchEvent = () => {};
      const storage = new Map();
      context.localStorage = {
        getItem: () => "null",
        setItem(key, value) { if (denied) throw new Error("SecurityError"); storage.set(key, value); },
        removeItem(key) { if (denied) throw new Error("SecurityError"); storage.delete(key); },
      };
      vm.runInNewContext(script, context);
      button.emit("click");
      assert.equal(document.body.classList.contains("a11y-reduced-motion"), true);
      assert.equal(button.attributes["aria-pressed"], "true");
      if (!denied) assert.equal(JSON.parse(storage.get("dj-atlantis-accessibility")).reducedMotion, true);
      reset.emit("click");
      assert.equal(document.body.classList.contains("a11y-reduced-motion"), false);
      assert.equal(button.attributes["aria-pressed"], "false");
    }
  }
});

test("blocked attribution storage does not disable the validated WhatsApp form", () => {
  const { document, context } = environment();
  const opened = [];
  const status = { textContent: "" };
  let valid = true;
  const values = { name: "Test Person", phone: "0501234567", event_date: "2027-05-10", event_type: "Wedding" };
  const form = { reportValidity: () => valid, querySelector: () => status };
  Object.assign(context, {
    location: { search: "?utm_source=test", pathname: "/landing/dj-dati-hatuna/" },
    sessionStorage: { setItem() { throw new Error("SecurityError"); } },
    FormData: class { get(key) { return values[key]; } },
    open: (url) => opened.push(url),
  });
  vm.runInNewContext(source("assets/conversion-tracking.js"), context);
  const event = { preventDefault() {}, target: { closest: () => form } };
  document.emit("submit", event);
  assert.equal(opened.length, 1);
  assert.match(new URL(opened[0]).searchParams.get("text"), /Test Person/);
  assert.equal(JSON.stringify(context.dataLayer).includes(values.phone), false);
  valid = false;
  document.emit("submit", event);
  assert.equal(opened.length, 1, "invalid form must not open WhatsApp");
});

test("homepage contact form validates before opening the correctly encoded event details", () => {
  const { document, context } = environment();
  const form = element(document);
  const status = { textContent: "" };
  form.elements = { eventDate: { min: "" } };
  form.querySelector = () => status;
  let valid = false;
  form.reportValidity = () => valid;
  document.querySelector = () => form;
  const opened = [];
  const values = { fullName: "Test & Partner", phone: "+972501234567", eventType: "Wedding", eventDate: "2027-05-10", location: "City" };
  context.FormData = class { get(key) { return values[key]; } };
  context.open = (url) => opened.push(url);
  vm.runInNewContext(source("assets/contact-form.js"), context);
  assert.match(form.elements.eventDate.min, /^\d{4}-\d{2}-\d{2}$/);
  form.emit("submit", { preventDefault() {} });
  assert.equal(opened.length, 0);
  valid = true;
  form.emit("submit", { preventDefault() {} });
  assert.equal(opened.length, 1);
  const url = new URL(opened[0]);
  assert.equal(url.origin + url.pathname, "https://wa.me/972507324480");
  assert.match(url.searchParams.get("text"), /Test & Partner/);
  assert.match(url.searchParams.get("text"), /2027-05-10/);
  assert.equal([...url.searchParams.keys()].length, 1);
});

test("gallery preserves the keyboard target on timer ticks and close; reduced motion stops scroll rotation", () => {
  const { document, context, timers } = environment();
  const wall = element(document);
  const close = element(document);
  const stage = element(document);
  const figures = Array.from({ length: 30 }, () => {
    const figure = element(document);
    const image = { alt: "Event", setAttribute() {} };
    const picture = { cloneNode: () => ({ image }) };
    figure.querySelector = (selector) => selector === "img" ? image : picture;
    figure.closest = () => figure;
    return figure;
  });
  wall.children.push(...figures);
  wall.querySelectorAll = () => figures;
  document.querySelector = () => wall;
  document.createElement = () => {
    const node = element(document);
    node.querySelector = (selector) => ({ ".gallery-carousel-stage": stage, ".gallery-carousel-close": close })[selector] || node.children[0]?.image || null;
    return node;
  };
  let reduced = false;
  context.matchMedia = () => ({ matches: reduced });
  vm.runInNewContext(source("assets/gallery-wall.js"), context);
  const positions = () => figures.map((figure) => figure.dataset.position);
  const trigger = figures[6]; // The edge card previously became hidden when close advanced the wall.
  trigger.focus();
  const before = positions();
  [...timers.values()].find((timer) => timer.delay === 2800).callback();
  assert.deepEqual(positions(), before);
  wall.emit("keydown", { key: "Enter", target: trigger, preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(document.activeElement, close);
  close.emit("click");
  assert.equal(document.activeElement, trigger);
  assert.deepEqual(positions(), before);
  assert.equal(trigger.attributes["aria-hidden"], "false");
  assert.ok(figures.every((figure) => figure.attributes.role === "button"));
  document.activeElement = null;
  reduced = true;
  context.scrollY = 200;
  document.emit("scroll");
  assert.deepEqual(positions(), before);
  reduced = false;
  document.emit("scroll");
  assert.notDeepEqual(positions(), before, "ordinary scroll navigation remains available");
});

test("video strip keeps native lazy images and manual arrows with reduced motion", () => {
  const { document, context, timers } = environment();
  const strip = element(document);
  const previous = element(document);
  const next = element(document);
  const cards = Array.from({ length: 38 }, () => {
    const card = element(document);
    card.image = element(document);
    card.image.setAttribute("loading", "lazy");
    card.querySelector = () => card.image;
    return card;
  });
  strip.children.push(...cards);
  strip.querySelectorAll = () => cards;
  document.querySelector = (selector) => ({ ".home-video-strip": strip, ".video-strip-prev": previous, ".video-strip-next": next })[selector] || null;
  let reduced = true;
  context.matchMedia = () => ({ matches: reduced });
  context.requestIdleCallback = (callback) => callback();
  vm.runInNewContext(source("assets/video-gallery-link.js"), context);
  assert.equal(timers.size, 0);
  next.emit("click");
  assert.equal(cards[37].dataset.position, "0", "arrows must work with reduced motion enabled");
  assert.ok(cards.every((card) => card.image.attributes.loading === "lazy"));
  reduced = false;
  previous.emit("click");
  assert.equal(cards[0].dataset.position, "0");
  cards[0].focus();
  [...timers.values()][0].callback();
  assert.equal(cards[0].dataset.position, "0", "autoplay must not hide the focused link");
});

test("all four review controllers pause while a reader has focus or the full review dialog open", () => {
  let count = 0;
  for (const path of pages) {
    for (let script of scripts(source(path))) {
      if (!script.includes("timer = setInterval") || !script.includes("review-slide")) continue;
      count += 1;
      const { document, context, timers } = environment();
      const root = element(document);
      const slides = Array.from({ length: 8 }, () => element(document));
      const previous = element(document), next = element(document), dots = element(document);
      root.children.push(...slides, previous, next, dots);
      root.querySelectorAll = () => slides;
      root.querySelector = (selector) => ({ ".prev": previous, ".next": next, ".slider-dots": dots })[selector];
      document.querySelector = () => root;
      document.querySelectorAll = () => [root];
      const observers = [];
      context.IntersectionObserver = class { constructor(callback) { observers.push(callback); } observe() {} };
      context.body = document.body;
      if (script.includes("const makeSlider")) {
        script = script.slice(script.indexOf("const makeSlider"), script.indexOf('document.querySelectorAll("[data-gallery-row]"'));
      }
      vm.runInNewContext(script, context);
      observers[0]([{ isIntersecting: true }]);
      const tick = [...timers.values()][0].callback;
      slides[0].focus();
      tick();
      assert.equal(slides[0].classList.contains("active"), true);
      document.activeElement = null;
      document.body.classList.add("review-carousel-open");
      tick();
      assert.equal(slides[0].classList.contains("active"), true);
      document.body.classList.remove("review-carousel-open");
      tick();
      assert.equal(slides[1].classList.contains("active"), true);
    }
  }
  assert.equal(count, 4);
});
