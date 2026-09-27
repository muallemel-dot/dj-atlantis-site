(() => {
  const root = document.querySelector("[data-slider='reviews']");
  if (!root) return;

  const track = root.querySelector(".slides");
  const slides = [...root.querySelectorAll(".review-slide")];
  const previous = root.querySelector(".prev");
  const next = root.querySelector(".next");
  if (!track || !slides.length || !previous || !next) return;

  root.classList.add("review-3d");
  root.tabIndex = 0;
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "קרוסלת ביקורות זוגות");
  const sync = () => {
    const activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains("active")));
    slides.forEach((slide, index) => {
      let position = index - activeIndex;
      if (position > slides.length / 2) position -= slides.length;
      if (position < -slides.length / 2) position += slides.length;
      const depth = Math.abs(position);
      const visible = depth <= 2;
      slide.style.setProperty("--review-main-x", `${position * 72}%`);
      slide.style.setProperty("--review-main-z", `${-depth * 180}px`);
      slide.style.setProperty("--review-main-rotate", `${position * -28}deg`);
      slide.style.setProperty("--review-main-scale", String(Math.max(.56, 1 - depth * .18)));
      slide.style.setProperty("--review-main-opacity", visible ? String(1 - depth * .36) : "0");
      slide.style.setProperty("--review-main-visibility", visible ? "visible" : "hidden");
      slide.style.zIndex = String(10 - depth);
      slide.tabIndex = index === activeIndex ? 0 : -1;
      slide.setAttribute("aria-label", `פתיחת המלצה ${index + 1} בתצוגה המלאה`);
    });

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        const tallest = Math.max(...slides.map((slide) => slide.scrollHeight || 0));
        if (tallest) track.style.setProperty("--review-stage-height", `${Math.ceil(tallest + 8)}px`);
      });
    }
  };

  new MutationObserver(sync).observe(track, { subtree: true, attributes: true, attributeFilter: ["class"] });
  sync();

  let swipeStartX = null;
  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") swipeStartX = event.clientX;
  });
  track.addEventListener("pointerup", (event) => {
    if (swipeStartX === null || event.pointerType === "mouse") return;
    const distance = event.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(distance) < 50) return;
    (distance < 0 ? next : previous).click();
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") next.click();
    if (event.key === "ArrowRight") previous.click();
  });

  let mainWheelLocked = false;
  root.addEventListener("wheel", (event) => {
    if (mainWheelLocked || Math.abs(event.deltaY) < 8) return;
    mainWheelLocked = true;
    (event.deltaY > 0 ? next : previous).click();
    setTimeout(() => { mainWheelLocked = false; }, 320);
  }, { passive: true });

  globalThis.addEventListener?.("resize", sync, { passive: true });

  if (!document.createElement || !document.body) return;

  const dialog = document.createElement("div");
  dialog.className = "review-carousel-dialog";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "קרוסלת המלצות זוגות");
  dialog.innerHTML = `
    <button class="review-carousel-close" type="button" aria-label="סגירת ההמלצות">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg>
    </button>
    <div class="review-carousel-stage"></div>`;
  document.body.append(dialog);

  const dialogStage = dialog.querySelector(".review-carousel-stage");
  const dialogClose = dialog.querySelector(".review-carousel-close");
  const dialogCards = slides.map((slide) => {
    const card = document.createElement("article");
    card.className = "review-carousel-card";
    card.innerHTML = slide.innerHTML;
    dialogStage.append(card);
    return card;
  });

  let dialogActive = 0;
  let dialogTimer = null;
  let dialogTrigger = null;
  let pointerX = null;
  let wheelLocked = false;
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("a11y-reduced-motion");

  const renderDialog = () => {
    const count = dialogCards.length;
    dialogActive = (dialogActive + count) % count;
    dialogCards.forEach((card, index) => {
      let position = index - dialogActive;
      if (position > count / 2) position -= count;
      if (position < -count / 2) position += count;
      const depth = Math.abs(position);
      const visible = depth <= 2;
      card.dataset.position = String(position);
      card.style.setProperty("--review-dialog-x", `${position * 76}%`);
      card.style.setProperty("--review-dialog-z", `${-depth * 180}px`);
      card.style.setProperty("--review-dialog-rotate", `${position * -28}deg`);
      card.style.setProperty("--review-dialog-scale", String(Math.max(.54, 1 - depth * .18)));
      card.style.setProperty("--review-dialog-opacity", visible ? String(1 - depth * .34) : "0");
      card.style.setProperty("--review-dialog-visibility", visible ? "visible" : "hidden");
      card.style.zIndex = String(10 - depth);
      card.setAttribute("aria-hidden", String(!visible));
    });
  };

  const stopDialogAutoplay = () => {
    clearInterval(dialogTimer);
    dialogTimer = null;
  };

  const startDialogAutoplay = () => {
    stopDialogAutoplay();
    if (reducedMotion()) return;
    dialogTimer = setInterval(() => {
      dialogActive += 1;
      renderDialog();
    }, 2600);
  };

  const moveDialog = (amount) => {
    dialogActive += amount;
    renderDialog();
    startDialogAutoplay();
  };

  const openDialog = (index, trigger) => {
    dialogActive = index;
    dialogTrigger = trigger;
    renderDialog();
    dialog.hidden = false;
    document.body.classList.add("review-carousel-open");
    dialogClose.focus();
    startDialogAutoplay();
  };

  const closeDialog = () => {
    stopDialogAutoplay();
    dialog.hidden = true;
    document.body.classList.remove("review-carousel-open");
    dialogTrigger?.focus();
    dialogTrigger = null;
  };

  root.addEventListener("click", (event) => {
    const slide = event.target.closest(".review-slide");
    if (slide) openDialog(slides.indexOf(slide), slide);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const slide = event.target.closest(".review-slide");
    if (!slide) return;
    event.preventDefault();
    openDialog(slides.indexOf(slide), slide);
  });

  dialogStage.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") pointerX = event.clientX;
  });
  dialogStage.addEventListener("pointerup", (event) => {
    if (pointerX === null || event.pointerType === "mouse") return;
    const distance = event.clientX - pointerX;
    pointerX = null;
    if (Math.abs(distance) > 48) moveDialog(distance < 0 ? 1 : -1);
  });

  dialog.addEventListener("wheel", (event) => {
    const distance = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(distance) < 8) return;
    event.preventDefault();
    if (wheelLocked) return;
    wheelLocked = true;
    moveDialog(distance > 0 ? 1 : -1);
    setTimeout(() => { wheelLocked = false; }, 220);
  }, { passive: false });

  dialogClose.addEventListener("click", closeDialog);
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDialog();
    if (event.key === "ArrowLeft") moveDialog(1);
    if (event.key === "ArrowRight") moveDialog(-1);
    if (event.key === "Tab") {
      event.preventDefault();
      dialogClose.focus();
    }
  });
})();
