const body = document.body;
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const siteMenu = document.querySelector(".site-menu");
const accessibilityToggle = document.querySelector(".accessibility-toggle");
const accessibilityPanel = document.querySelector(".accessibility-panel");
const accessibilityButtons = document.querySelectorAll("[data-a11y-toggle]");
const accessibilityReset = document.querySelector("[data-a11y-reset]");

let lastScrollY = window.scrollY;
const a11yStorageKey = "dj-atlantis-accessibility";
const a11yClasses = {
  largeText: "a11y-large-text",
  highContrast: "a11y-high-contrast",
  underlineLinks: "a11y-underline-links",
  readableFont: "a11y-readable-font",
  reducedMotion: "a11y-reduced-motion",
};

const setHeaderState = () => {
  if (!header) return;
  const current = window.scrollY;
  header.classList.toggle("is-hidden", current > 220 && current > lastScrollY && !body.classList.contains("menu-open"));
  lastScrollY = current;
};

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

if (siteMenu && menuToggle) {
  siteMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      body.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const getA11yState = () => {
  try {
    return JSON.parse(localStorage.getItem(a11yStorageKey)) || {};
  } catch {
    return {};
  }
};

const saveA11yState = (state) => {
  localStorage.setItem(a11yStorageKey, JSON.stringify(state));
};

const applyA11yState = (state) => {
  Object.entries(a11yClasses).forEach(([key, className]) => {
    body.classList.toggle(className, Boolean(state[key]));
    const button = document.querySelector(`[data-a11y-toggle="${key}"]`);
    if (button) button.setAttribute("aria-pressed", String(Boolean(state[key])));
  });
};

let a11yState = getA11yState();
applyA11yState(a11yState);

if (accessibilityToggle && accessibilityPanel) {
  accessibilityToggle.addEventListener("click", () => {
    const isOpen = accessibilityPanel.hasAttribute("hidden");
    accessibilityPanel.toggleAttribute("hidden", !isOpen);
    accessibilityToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

accessibilityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.a11yToggle;
    a11yState = { ...a11yState, [key]: !a11yState[key] };
    saveA11yState(a11yState);
    applyA11yState(a11yState);
  });
});

if (accessibilityReset) {
  accessibilityReset.addEventListener("click", () => {
    a11yState = {};
    localStorage.removeItem(a11yStorageKey);
    applyA11yState(a11yState);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  body.classList.remove("menu-open");
  if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
  if (accessibilityPanel) accessibilityPanel.setAttribute("hidden", "");
  if (accessibilityToggle) accessibilityToggle.setAttribute("aria-expanded", "false");
});

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -35px" })
  : null;

document.querySelectorAll(".reveal").forEach((element) => {
  const rect = element.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    element.classList.add("is-visible");
    return;
  }

  if (revealObserver) {
    revealObserver.observe(element);
  } else {
    element.classList.add("is-visible");
  }
});

const makeSlider = (root) => {
  const slides = [...root.querySelectorAll(".review-slide")];
  const prev = root.querySelector(".prev");
  const next = root.querySelector(".next");
  const dots = root.querySelector(".slider-dots");
  let index = 0;
  let timer;

  if (!slides.length || !prev || !next || !dots) return;

  const render = () => {
    slides.forEach((slide, slideIndex) => slide.classList.toggle("active", slideIndex === index));
    [...dots.children].forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === index));
  };

  const go = (step) => {
    index = (index + step + slides.length) % slides.length;
    render();
  };

  const shouldAutoplay = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !body.classList.contains(a11yClasses.reducedMotion);

  const restart = () => {
    clearInterval(timer);
    if (shouldAutoplay()) timer = setInterval(() => go(1), 5200);
  };

  slides.forEach((_, dotIndex) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `מעבר להמלצה ${dotIndex + 1}`);
    dot.addEventListener("click", () => {
      index = dotIndex;
      render();
      restart();
    });
    dots.appendChild(dot);
  });

  prev.addEventListener("click", () => {
    go(-1);
    restart();
  });

  next.addEventListener("click", () => {
    go(1);
    restart();
  });

  root.addEventListener("mouseenter", () => clearInterval(timer));
  root.addEventListener("mouseleave", restart);
  root.addEventListener("focusin", () => clearInterval(timer));
  root.addEventListener("focusout", restart);

  render();
  restart();
};

document.querySelectorAll("[data-slider='reviews']").forEach(makeSlider);

document.querySelectorAll("[data-gallery-row]").forEach((galleryRow) => {
  const track = galleryRow.querySelector(".gallery-row-track");
  const prev = galleryRow.querySelector(".prev");
  const next = galleryRow.querySelector(".next");

  if (!track || !prev || !next) return;

  const scrollGallery = (direction) => {
    const firstItem = track.querySelector("figure");
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 16;
    const amount = firstItem ? firstItem.getBoundingClientRect().width + gap : 280;
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  prev.addEventListener("click", () => scrollGallery(1));
  next.addEventListener("click", () => scrollGallery(-1));
});

document.querySelectorAll("[data-gallery-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".gallery-extra[hidden]").forEach((figure) => {
      figure.removeAttribute("hidden");
      figure.classList.add("is-visible");
    });
    button.hidden = true;
  });
});

const galleryImages = [...document.querySelectorAll(".gallery-grid img, .gallery-row-track img")];

if (galleryImages.length) {
  const lightbox = document.createElement("div");
  lightbox.className = "gallery-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "תצוגת תמונה מוגדלת");
  lightbox.setAttribute("hidden", "");
  lightbox.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="סגירת תמונה">×</button>
    <button class="lightbox-arrow lightbox-prev" type="button" aria-label="תמונה קודמת">‹</button>
    <figure class="lightbox-frame">
      <img src="" alt="תמונה מגלריית DJ ATLANTIS">
      <figcaption></figcaption>
    </figure>
    <button class="lightbox-arrow lightbox-next" type="button" aria-label="תמונה הבאה">›</button>
  `;
  document.body.appendChild(lightbox);

  const lightboxImage = lightbox.querySelector("img");
  const lightboxCaption = lightbox.querySelector("figcaption");
  const closeLightboxButton = lightbox.querySelector(".lightbox-close");
  const previousLightboxButton = lightbox.querySelector(".lightbox-prev");
  const nextLightboxButton = lightbox.querySelector(".lightbox-next");
  let activeGalleryIndex = 0;
  let lastFocusedElement = null;

  const renderLightbox = () => {
    const image = galleryImages[activeGalleryIndex];
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt || "תמונה מגלריית ATLANTIS";
    lightboxCaption.textContent = `${activeGalleryIndex + 1} / ${galleryImages.length}`;
  };

  const openLightbox = (index) => {
    lastFocusedElement = document.activeElement;
    activeGalleryIndex = index;
    renderLightbox();
    lightbox.removeAttribute("hidden");
    body.classList.add("lightbox-open");
    closeLightboxButton.focus();
  };

  const closeLightbox = () => {
    lightbox.setAttribute("hidden", "");
    body.classList.remove("lightbox-open");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  };

  const moveLightbox = (step) => {
    activeGalleryIndex = (activeGalleryIndex + step + galleryImages.length) % galleryImages.length;
    renderLightbox();
  };

  galleryImages.forEach((image, index) => {
    const figure = image.closest("figure");
    if (!figure) return;

    figure.setAttribute("role", "button");
    figure.setAttribute("tabindex", "0");
    figure.setAttribute("aria-label", `פתיחת תמונה ${index + 1} בגלריה`);
    figure.addEventListener("click", () => openLightbox(index));
    figure.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(index);
      }
    });
  });

  closeLightboxButton.addEventListener("click", closeLightbox);
  previousLightboxButton.addEventListener("click", () => moveLightbox(-1));
  nextLightboxButton.addEventListener("click", () => moveLightbox(1));
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hasAttribute("hidden")) return;

    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowRight") {
      moveLightbox(1);
    } else if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    } else if (event.key === "Tab") {
      const focusable = [...lightbox.querySelectorAll("button")];
      const currentIndex = focusable.indexOf(document.activeElement);
      if (event.shiftKey && currentIndex === 0) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
  });
}

document.querySelectorAll("[data-whatsapp-form]").forEach((form) => {
  const status = form.querySelector(".form-status");
  const submit = form.querySelector("button[type='submit']");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const requiredFields = ["name", "phone"];
    let isValid = true;

    form.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));

    requiredFields.forEach((fieldName) => {
      const field = form.elements[fieldName];
      if (!String(data.get(fieldName) || "").trim()) {
        field.classList.add("is-invalid");
        isValid = false;
      }
    });

    if (!isValid) {
      status.textContent = "נא למלא שם וטלפון כדי שאפשר יהיה לחזור אליכם.";
      return;
    }

    const lines = [
      "היי אלי, הגעתי דרך האתר ורציתי לבדוק זמינות לאירוע.",
      `שם: ${data.get("name")}`,
      `טלפון: ${data.get("phone")}`,
      data.get("date") ? `תאריך: ${data.get("date")}` : "",
      data.get("eventType") ? `סוג האירוע: ${data.get("eventType")}` : "",
      data.get("place") ? `מקום האירוע: ${data.get("place")}` : "",
      data.get("message") ? `הודעה: ${data.get("message")}` : "",
    ].filter(Boolean);

    const url = `https://wa.me/972507324480?text=${encodeURIComponent(lines.join("\n"))}`;
    status.textContent = "פותח שיחה בוואטסאפ...";
    if (submit) submit.disabled = true;
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => {
      if (submit) submit.disabled = false;
    }, 1200);
  });
});

document.querySelectorAll("[data-video-toggle]").forEach((button) => {
  const video = document.getElementById(button.dataset.videoToggle);
  if (!video) return;
  const volume = document.querySelector(`[data-video-volume="${button.dataset.videoToggle}"]`);

  const syncSoundButton = () => {
    const off = video.muted || video.volume === 0;
    button.textContent = off ? "🔇" : "🔊";
    button.setAttribute("aria-label", off ? "הפעלת שמע" : "השתקת שמע");
  };

  video.volume = 0.7;
  syncSoundButton();

  button.addEventListener("click", () => {
    const turnOn = video.muted || video.volume === 0;
    video.muted = !turnOn;
    if (turnOn && video.volume === 0) {
      video.volume = 0.7;
      if (volume) volume.value = 70;
    }
    syncSoundButton();
    video.play().catch(() => {});
  });
});

document.querySelectorAll("[data-video-volume]").forEach((input) => {
  const video = document.getElementById(input.dataset.videoVolume);
  if (!video) return;
  const button = document.querySelector(`[data-video-toggle="${input.dataset.videoVolume}"]`);

  input.addEventListener("input", () => {
    video.volume = Number(input.value) / 100;
    video.muted = video.volume === 0;
    if (button) {
      const off = video.muted || video.volume === 0;
      button.textContent = off ? "🔇" : "🔊";
      button.setAttribute("aria-label", off ? "הפעלת שמע" : "השתקת שמע");
    }
  });
});

document.querySelectorAll("[data-video-fullscreen]").forEach((button) => {
  const video = document.getElementById(button.dataset.videoFullscreen);
  if (!video) return;

  button.addEventListener("click", () => {
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  });
});
