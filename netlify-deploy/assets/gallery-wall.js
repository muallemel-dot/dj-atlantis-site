(() => {
  const wall = document.querySelector(".gallery-wall");
  if (!wall) return;

  const figures = [...wall.querySelectorAll(":scope > figure")];
  if (!figures.length) return;

  const rows = Array.from({ length: 3 }, (_, rowIndex) => {
    const row = document.createElement("div");
    const stage = document.createElement("div");
    row.className = "gallery-3d-row";
    row.setAttribute("aria-label", `שורת גלריה ${rowIndex + 1}`);
    stage.className = "gallery-3d-stage";
    row.append(stage);
    wall.append(row);
    return { row, stage, items: [], active: rowIndex * 2, pointerX: null, dragged: false };
  });

  figures.forEach((figure, index) => {
    const state = rows[index % rows.length];
    state.items.push(figure);
    state.stage.append(figure);
  });
  wall.classList.add("is-3d");

  const renderRow = (state) => {
    const count = state.items.length;
    state.active = (state.active + count) % count;
    state.items.forEach((figure, index) => {
      let position = index - state.active;
      if (position > count / 2) position -= count;
      if (position < -count / 2) position += count;
      const depth = Math.abs(position);
      const visible = depth <= 2;
      figure.dataset.position = String(position);
      figure.dataset.visible = String(visible);
      figure.style.setProperty("--gallery-x", `${position * 92}%`);
      figure.style.setProperty("--gallery-z", `${-depth * 145}px`);
      figure.style.setProperty("--gallery-rotate", `${position * -30}deg`);
      figure.style.setProperty("--gallery-scale", String(Math.max(0.46, 1 - depth * 0.18)));
      figure.style.setProperty("--gallery-opacity", visible ? String(1 - depth * 0.3) : "0");
      figure.style.setProperty("--gallery-visibility", visible ? "visible" : "hidden");
      figure.style.setProperty("--gallery-pointer", visible ? "auto" : "none");
      figure.style.zIndex = String(10 - depth);
      figure.tabIndex = visible ? 0 : -1;
      figure.setAttribute("aria-hidden", String(!visible));
      const alt = figure.querySelector("img")?.alt || "תמונה מהאירוע";
      figure.setAttribute("aria-label", `פתיחת הגלריה מהתמונה: ${alt}`);
    });
  };

  const setRowActive = (state, index) => {
    state.active = index;
    renderRow(state);
  };
  rows.forEach(renderRow);

  const dialog = document.createElement("div");
  dialog.className = "gallery-carousel-dialog";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "קרוסלת תמונות מאירועים");
  dialog.innerHTML = `
    <button class="gallery-carousel-close" type="button" aria-label="סגירת הגלריה">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg>
    </button>
    <div class="gallery-carousel-stage"></div>`;
  document.body.append(dialog);

  const carouselStage = dialog.querySelector(".gallery-carousel-stage");
  const carouselClose = dialog.querySelector(".gallery-carousel-close");
  const carouselItems = figures.map((figure) => {
    const card = document.createElement("figure");
    const picture = figure.querySelector("picture");
    card.className = "gallery-carousel-card";
    if (picture) card.append(picture.cloneNode(true));
    carouselStage.append(card);
    return card;
  });

  let carouselActive = 0;
  let carouselTrigger = null;
  let autoplay = null;
  let carouselPointerX = null;
  let wheelLocked = false;
  let wallAutoplay = null;

  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("a11y-reduced-motion");

  const stopWallAutoplay = () => {
    clearInterval(wallAutoplay);
    wallAutoplay = null;
  };

  const startWallAutoplay = () => {
    stopWallAutoplay();
    wallAutoplay = setInterval(() => {
      const bounds = wall.getBoundingClientRect();
      if (reducedMotion() || !dialog.hidden || document.hidden || bounds.bottom < 0 || bounds.top > innerHeight) return;
      rows.forEach((state, index) => setRowActive(state, state.active + (index === 1 ? -1 : 1)));
    }, 2800);
  };

  const renderCarousel = () => {
    const count = carouselItems.length;
    carouselActive = (carouselActive + count) % count;
    carouselItems.forEach((card, index) => {
      let position = index - carouselActive;
      if (position > count / 2) position -= count;
      if (position < -count / 2) position += count;
      const depth = Math.abs(position);
      const visible = depth <= 2;
      card.dataset.position = String(position);
      card.style.setProperty("--carousel-x", `${position * 82}%`);
      card.style.setProperty("--carousel-z", `${-depth * 190}px`);
      card.style.setProperty("--carousel-rotate", `${position * -28}deg`);
      card.style.setProperty("--carousel-scale", String(Math.max(0.52, 1 - depth * 0.17)));
      card.style.setProperty("--carousel-opacity", visible ? String(1 - depth * 0.34) : "0");
      card.style.setProperty("--carousel-visibility", visible ? "visible" : "hidden");
      card.style.zIndex = String(10 - depth);
      card.setAttribute("aria-hidden", String(!visible));
      card.querySelector("img")?.setAttribute("loading", visible ? "eager" : "lazy");
    });
  };

  const stopAutoplay = () => {
    clearInterval(autoplay);
    autoplay = null;
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (reducedMotion()) return;
    autoplay = setInterval(() => {
      carouselActive += 1;
      renderCarousel();
    }, 2400);
  };

  const moveCarousel = (step) => {
    carouselActive += step;
    renderCarousel();
    startAutoplay();
  };

  const openCarousel = (index, trigger) => {
    stopWallAutoplay();
    carouselActive = index;
    carouselTrigger = trigger;
    renderCarousel();
    dialog.hidden = false;
    document.body.classList.add("gallery-carousel-open");
    carouselClose.focus();
    startAutoplay();
  };

  const closeCarousel = () => {
    stopAutoplay();
    dialog.hidden = true;
    document.body.classList.remove("gallery-carousel-open");
    carouselTrigger?.focus();
    carouselTrigger = null;
    rows.forEach((state, index) => setRowActive(state, state.active + (index === 1 ? -1 : 1)));
    startWallAutoplay();
  };

  wall.addEventListener("click", (event) => {
    const figure = event.target.closest("figure");
    if (!figure) return;
    const state = rows.find(({ items }) => items.includes(figure));
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state?.dragged) {
      state.dragged = false;
      return;
    }
    openCarousel(figures.indexOf(figure), figure);
  }, true);

  wall.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const figure = event.target.closest("figure");
    if (!figure) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openCarousel(figures.indexOf(figure), figure);
  }, true);

  rows.forEach((state) => {
    state.row.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") state.pointerX = event.clientX;
    });
    state.row.addEventListener("pointerup", (event) => {
      if (state.pointerX === null || event.pointerType === "mouse") return;
      const distance = event.clientX - state.pointerX;
      state.pointerX = null;
      if (Math.abs(distance) <= 48) return;
      state.dragged = true;
      setRowActive(state, state.active + (distance < 0 ? 1 : -1));
      setTimeout(() => { state.dragged = false; }, 0);
    });
  });

  let lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    const distance = window.scrollY - lastScrollY;
    const bounds = wall.getBoundingClientRect();
    if (Math.abs(distance) < 72 || bounds.bottom < 0 || bounds.top > window.innerHeight || wall.contains(document.activeElement)) return;
    lastScrollY = window.scrollY;
    const step = distance > 0 ? 1 : -1;
    rows.forEach((state, index) => setRowActive(state, state.active + step * (index === 1 ? -1 : 1)));
  }, { passive: true });

  carouselStage.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") carouselPointerX = event.clientX;
  });
  carouselStage.addEventListener("pointerup", (event) => {
    if (carouselPointerX === null || event.pointerType === "mouse") return;
    const distance = event.clientX - carouselPointerX;
    carouselPointerX = null;
    if (Math.abs(distance) > 48) moveCarousel(distance < 0 ? 1 : -1);
  });

  dialog.addEventListener("wheel", (event) => {
    const distance = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(distance) < 8) return;
    event.preventDefault();
    if (wheelLocked) return;
    wheelLocked = true;
    moveCarousel(distance > 0 ? 1 : -1);
    setTimeout(() => { wheelLocked = false; }, 220);
  }, { passive: false });

  carouselClose.addEventListener("click", closeCarousel);
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCarousel();
    if (event.key === "ArrowLeft") moveCarousel(1);
    if (event.key === "ArrowRight") moveCarousel(-1);
    if (event.key === "Tab") {
      event.preventDefault();
      carouselClose.focus();
    }
  });

  startWallAutoplay();
})();
