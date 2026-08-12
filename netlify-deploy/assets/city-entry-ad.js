(() => {
  "use strict";

  if (window.__atlantisHomepageBannerLoaded) return;
  window.__atlantisHomepageBannerLoaded = true;

  const DAY = 24 * 60 * 60 * 1000;
  const STORAGE_KEYS = {
    shown: "djAtlantisHomepageBannerLastShownV1",
    dismissed: "djAtlantisHomepageBannerDismissedV1",
    clicked: "djAtlantisHomepageBannerClickedV1",
    session: "djAtlantisHomepageBannerSessionV1",
  };
  const SERVICE_NAMES = {
    "דיגיי-דתי": "אירוע דתי",
    "דיגיי-לאירוע-חרדי": "אירוע חרדי",
    "דיגיי-לאירועים-בהפרדה": "אירוע בהפרדה",
    "דיגיי-לבר-מצווה-דתית": "בר מצווה דתית",
    "דיגיי-לבת-מצווה-דתית": "בת מצווה דתית",
    "דיגיי-לדתי-לאומי": "אירוע לקהל דתי לאומי",
    "דיגיי-לחינה-דתית": "חינה דתית",
    "דיגיי-לחתונה-דתית": "חתונה דתית",
  };

  const storageGet = (storageName, key) => {
    try {
      return window[storageName].getItem(key);
    } catch (_) {
      return null;
    }
  };
  const storageSet = (storageName, key, value) => {
    try {
      window[storageName].setItem(key, value);
    } catch (_) {
      // ponytail: storage is optional; a privacy setting must never break the page.
    }
  };

  let pathParts;
  try {
    pathParts = decodeURIComponent(window.location.pathname).split("/").filter(Boolean);
  } catch (_) {
    return;
  }
  if (pathParts.length !== 2 || !["ערים", "שירותים"].includes(pathParts[0])) return;

  const pageType = pathParts[0] === "ערים" ? "city" : "service";
  const slug = pathParts[1];
  const pageName = pageType === "city"
    ? slug.replace(/^דיגיי-תקליטן-חרדי-דתי-לאומי-/, "").replaceAll("-", " ")
    : SERVICE_NAMES[slug] || slug.replace(/^דיגיי-/, "").replaceAll("-", " ");
  if (!pageName) return;

  const recent = [STORAGE_KEYS.shown, STORAGE_KEYS.dismissed, STORAGE_KEYS.clicked]
    .some((key) => {
      const timestamp = Number(storageGet("localStorage", key));
      return Number.isFinite(timestamp) && timestamp > 0 && Date.now() - timestamp < DAY;
    });
  if (recent || storageGet("sessionStorage", STORAGE_KEYS.session)) return;

  const style = document.createElement("style");
  style.dataset.atlantisHomepageBannerStyle = "";
  style.textContent = `
    .atlantis-homepage-banner {
      position: fixed;
      z-index: 1100;
      left: 50%;
      bottom: 24px;
      width: min(960px, calc(100vw - 48px));
      max-height: min(20vh, 180px);
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 18px;
      overflow: hidden;
      padding: 16px 18px;
      border: 1px solid rgba(240, 200, 117, .72);
      border-radius: 22px;
      direction: rtl;
      color: #fff;
      background:
        radial-gradient(circle at 86% 0%, rgba(240, 200, 117, .14), transparent 34%),
        linear-gradient(135deg, rgba(8, 8, 8, .98), rgba(24, 21, 15, .98));
      box-shadow: 0 18px 48px rgba(0, 0, 0, .52), 0 0 0 1px rgba(0, 0, 0, .4) inset;
      font-family: inherit;
      line-height: 1.25;
      opacity: 0;
      visibility: hidden;
      transform: translate(-50%, 14px);
      transition: opacity 240ms ease, transform 240ms ease, visibility 240ms;
      contain: layout paint;
    }
    .atlantis-homepage-banner.is-visible {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, 0);
    }
    .atlantis-homepage-banner.is-avoiding-form {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .atlantis-homepage-banner__close {
      position: absolute;
      inset-block-start: 8px;
      inset-inline-end: 8px;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, .45);
      border-radius: 50%;
      color: #fff;
      background: rgba(0, 0, 0, .78);
      font: 800 24px/1 Arial, sans-serif;
      cursor: pointer;
    }
    .atlantis-homepage-banner__copy {
      min-width: 0;
    }
    .atlantis-homepage-banner__brand {
      display: block;
      margin-block-end: 3px;
      color: #f0c875;
      font-size: 14px;
      font-weight: 900;
    }
    .atlantis-homepage-banner__headline {
      display: block;
      margin: 0;
      color: #fff;
      font-size: clamp(21px, 2.3vw, 28px);
      font-weight: 900;
      line-height: 1.12;
    }
    .atlantis-homepage-banner__support {
      display: block;
      margin-block-start: 5px;
      color: #ddd7cd;
      font-size: 15px;
      font-weight: 650;
    }
    .atlantis-homepage-banner__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-inline-end: 48px;
      white-space: nowrap;
    }
    .atlantis-homepage-banner__primary,
    .atlantis-homepage-banner__continue {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font: inherit;
      font-weight: 900;
      text-decoration: none;
      cursor: pointer;
    }
    .atlantis-homepage-banner__primary {
      min-height: 48px;
      padding: 0 20px;
      border: 1px solid #f0c875;
      color: #111;
      background: linear-gradient(180deg, #f5d47f, #d4a74c);
      box-shadow: 0 10px 24px rgba(212, 167, 76, .22);
    }
    .atlantis-homepage-banner__continue {
      min-height: 44px;
      padding: 0 14px;
      border: 1px solid rgba(255, 255, 255, .38);
      color: #fff;
      background: rgba(255, 255, 255, .045);
    }
    .atlantis-homepage-banner button:focus-visible,
    .atlantis-homepage-banner a:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 3px;
    }
    @media (max-width: 1199px) {
      .atlantis-homepage-banner {
        bottom: calc(140px + env(safe-area-inset-bottom, 0px));
        width: min(800px, calc(100vw - 32px));
        max-height: min(22svh, 190px);
      }
    }
    @media (max-width: 720px) {
      .atlantis-homepage-banner {
        width: min(520px, calc(100vw - 16px));
        max-height: min(22svh, 180px);
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
        padding: 11px 12px;
        border-radius: 18px;
      }
      .atlantis-homepage-banner__copy {
        padding-inline-end: 48px;
      }
      .atlantis-homepage-banner__headline {
        font-size: clamp(19px, 6vw, 24px);
      }
      .atlantis-homepage-banner__support {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
      }
      .atlantis-homepage-banner__actions {
        width: 100%;
        gap: 6px;
        padding-inline-end: 0;
      }
      .atlantis-homepage-banner__primary {
        flex: 1 1 auto;
        min-width: 0;
        padding-inline: 10px;
        font-size: 14px;
      }
      .atlantis-homepage-banner__continue {
        flex: 0 1 auto;
        padding-inline: 10px;
        font-size: 13px;
      }
    }
    @media (max-height: 700px) and (max-width: 720px) {
      .atlantis-homepage-banner__brand,
      .atlantis-homepage-banner__support {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .atlantis-homepage-banner {
        transform: translate(-50%, 0);
        transition: opacity 80ms linear, visibility 80ms;
      }
    }
  `;

  let banner = null;
  let displayed = false;
  let destroyed = false;
  let triggerType = "";
  let retryTimer = 0;
  let dwellTimer = 0;
  let visibleSince = 0;
  let dwellRemaining = 8000;
  let layoutFrame = 0;

  const hasBlocker = () => {
    const active = document.activeElement;
    if (active && (active.closest("form") || active.matches('[contenteditable="true"]'))) return true;
    return Boolean(document.querySelector([
      "dialog[open]",
      '[role="dialog"]:not([hidden])',
      ".site-a11y-panel:not([hidden])",
      ".accessibility-panel:not([hidden])",
      ".gallery-lightbox:not([hidden])",
      "body.menu-open",
      "body.nav-open",
      "body.lightbox-open",
      '[aria-expanded="true"][aria-controls*="menu"]',
    ].join(",")));
  };

  const remember = (kind) => {
    const now = String(Date.now());
    storageSet("localStorage", STORAGE_KEYS[kind], now);
    storageSet("sessionStorage", STORAGE_KEYS.session, "1");
  };

  const rectsOverlap = (a, b) => (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );

  const updateFormAvoidance = () => {
    if (!banner || !displayed || layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      const bannerRect = banner.getBoundingClientRect();
      const overlaps = hasBlocker() || [...document.querySelectorAll("form input, form select, form textarea, form button")]
        .some((control) => {
          const style = getComputedStyle(control);
          if (style.visibility === "hidden" || style.display === "none") return false;
          const rect = control.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rectsOverlap(bannerRect, rect);
        });
      banner.classList.toggle("is-avoiding-form", overlaps);
    });
  };

  const removeBanner = () => {
    destroyed = true;
    displayed = false;
    window.clearTimeout(retryTimer);
    window.clearTimeout(dwellTimer);
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", updateFormAvoidance);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    document.removeEventListener("focusin", updateFormAvoidance);
    document.removeEventListener("focusout", updateFormAvoidance);
    document.removeEventListener("click", updateFormAvoidance);
    banner?.remove();
    style.remove();
  };

  const dismiss = () => {
    if (!banner) return;
    remember("dismissed");
    banner.classList.remove("is-visible");
    window.setTimeout(removeBanner, 260);
  };

  const show = () => {
    if (destroyed || displayed) return;
    displayed = true;
    remember("shown");
    window.clearTimeout(dwellTimer);
    window.clearTimeout(retryTimer);

    banner = document.createElement("aside");
    banner.className = "atlantis-homepage-banner";
    banner.setAttribute("aria-label", "הודעה מ-DJ ATLANTIS");
    banner.dataset.pageType = pageType;
    banner.dataset.pageName = pageName;
    banner.dataset.triggerType = triggerType;
    const headline = pageType === "city" ? `מחפשים דיג׳יי ב${pageName}?` : `מתכננים ${pageName}?`;
    banner.innerHTML = `
      <button class="atlantis-homepage-banner__close" type="button" aria-label="סגירת המודעה"><span aria-hidden="true">×</span></button>
      <div class="atlantis-homepage-banner__copy">
        <span class="atlantis-homepage-banner__brand">דיג׳יי אטלנטיס</span>
        <strong class="atlantis-homepage-banner__headline"></strong>
        <span class="atlantis-homepage-banner__support">הכירו את <span dir="ltr">DJ ATLANTIS</span> וגלו בעמוד הראשי את הסגנון, החוויה והשירות לכל אירוע.</span>
      </div>
      <div class="atlantis-homepage-banner__actions">
        <a class="atlantis-homepage-banner__primary" href="/" aria-label="מעבר לעמוד הראשי של DJ ATLANTIS">מעבר לעמוד הראשי</a>
        <button class="atlantis-homepage-banner__continue" type="button">המשך בעמוד הזה</button>
      </div>
    `;
    document.head.append(style);
    document.body.append(banner);
    banner.querySelector(".atlantis-homepage-banner__headline").textContent = headline;
    banner.querySelector(".atlantis-homepage-banner__close").addEventListener("click", dismiss);
    banner.querySelector(".atlantis-homepage-banner__continue").addEventListener("click", dismiss);
    banner.querySelector(".atlantis-homepage-banner__primary").addEventListener("click", () => {
      remember("clicked");
      removeBanner();
    });
    requestAnimationFrame(() => {
      banner?.classList.add("is-visible");
      updateFormAvoidance();
    });
  };

  const requestShow = (type) => {
    if (destroyed || displayed) return;
    triggerType ||= type;
    if (document.visibilityState !== "visible" || hasBlocker()) {
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => requestShow(triggerType), 600);
      return;
    }
    show();
  };

  const pauseDwell = () => {
    if (!visibleSince) return;
    dwellRemaining = Math.max(0, dwellRemaining - (performance.now() - visibleSince));
    visibleSince = 0;
    window.clearTimeout(dwellTimer);
  };

  const resumeDwell = () => {
    if (destroyed || displayed || triggerType || document.visibilityState !== "visible") return;
    visibleSince = performance.now();
    dwellTimer = window.setTimeout(() => {
      visibleSince = 0;
      dwellRemaining = 0;
      requestShow("dwell");
    }, dwellRemaining);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      if (triggerType) requestShow(triggerType);
      else {
        resumeDwell();
        onScroll();
      }
    } else {
      pauseDwell();
    }
  };

  function onScroll() {
    if (displayed) {
      updateFormAvoidance();
      return;
    }
    if (document.visibilityState !== "visible") return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable > 0 && window.scrollY / scrollable >= .35) requestShow("scroll");
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateFormAvoidance, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("focusin", updateFormAvoidance);
  document.addEventListener("focusout", updateFormAvoidance);
  document.addEventListener("click", updateFormAvoidance);
  resumeDwell();
  onScroll();
})();
