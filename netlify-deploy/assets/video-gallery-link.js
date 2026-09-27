(() => {
  const strip = document.querySelector(".home-video-strip");
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("a11y-reduced-motion");

  if (strip && !reducedMotion()) {
    const cards = [...strip.querySelectorAll(".home-video-card")];
    let active = 0;
    let autoplay = null;
    let pointerX = null;
    let dragged = false;
    const previous = document.querySelector(".video-strip-prev");
    const next = document.querySelector(".video-strip-next");

    const render = () => {
      cards.forEach((card, index) => {
        let position = index - active;
        if (position > cards.length / 2) position -= cards.length;
        if (position < -cards.length / 2) position += cards.length;
        const depth = Math.abs(position);
        const visible = depth <= 3;
        card.dataset.position = String(position);
        card.style.setProperty("--video-x", `${position * 78}%`);
        card.style.setProperty("--video-z", `${-depth * 135}px`);
        card.style.setProperty("--video-rotate", `${position * -26}deg`);
        card.style.setProperty("--video-scale", String(Math.max(0.5, 1 - depth * 0.17)));
        card.style.setProperty("--video-opacity", visible ? String(1 - depth * 0.27) : "0");
        card.style.setProperty("--video-visibility", visible ? "visible" : "hidden");
        card.style.setProperty("--video-pointer", visible ? "auto" : "none");
        card.style.setProperty("--video-display", visible ? "block" : "none");
        card.style.zIndex = String(10 - depth);
        card.tabIndex = visible ? 0 : -1;
        card.setAttribute("aria-hidden", String(!visible));
      });
    };

    const stopAutoplay = () => {
      clearInterval(autoplay);
      autoplay = null;
    };

    const startAutoplay = () => {
      stopAutoplay();
      autoplay = setInterval(() => {
        if (document.hidden || reducedMotion()) return;
        active = (active + 1) % cards.length;
        render();
      }, 2800);
    };

    const move = (step) => {
      active = (active + step + cards.length) % cards.length;
      render();
      startAutoplay();
    };

    strip.classList.add("is-3d");
    render();
    startAutoplay();
    const preloadImages = () => cards.forEach((card) => {
      card.querySelector("img")?.setAttribute("loading", "eager");
    });
    if ("requestIdleCallback" in window) requestIdleCallback(preloadImages, { timeout: 2000 });
    else setTimeout(preloadImages, 600);
    strip.addEventListener("pointerenter", stopAutoplay);
    strip.addEventListener("pointerleave", startAutoplay);
    strip.addEventListener("focusin", stopAutoplay);
    strip.addEventListener("focusout", startAutoplay);
    previous?.addEventListener("click", () => move(1));
    next?.addEventListener("click", () => move(-1));
    strip.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") pointerX = event.clientX;
    });
    strip.addEventListener("pointerup", (event) => {
      if (pointerX === null || event.pointerType === "mouse") return;
      const distance = event.clientX - pointerX;
      pointerX = null;
      if (Math.abs(distance) <= 48) return;
      dragged = true;
      move(distance < 0 ? 1 : -1);
      setTimeout(() => { dragged = false; }, 0);
    });
    strip.addEventListener("click", (event) => {
      if (!dragged) return;
      event.preventDefault();
    });
  }

  const selectedId = new URLSearchParams(location.search).get("watch");
  if (!selectedId || !/^[A-Za-z0-9_-]{6,20}$/.test(selectedId)) return;

  const featured = document.querySelector(".featured-event");
  const featuredFacade = featured?.querySelector(".youtube-facade");
  const selectedFacade = [...document.querySelectorAll(".video-card .youtube-facade")].find((facade) => facade.dataset.youtubeSrc.includes(`/embed/${selectedId}`));
  if (!featured || !featuredFacade || !selectedFacade) return;

  const selectedCard = selectedFacade.closest(".video-card");
  if (!selectedCard) return;
  featured.classList.add("is-selected");
  const selectedTitle = selectedCard?.querySelector("h3")?.textContent?.trim() || selectedFacade.dataset.youtubeTitle;
  const selectedImage = selectedFacade.querySelector("img")?.cloneNode(true);
  const selectedLink = selectedCard?.querySelector(".text-link");

  featuredFacade.dataset.youtubeSrc = selectedFacade.dataset.youtubeSrc;
  featuredFacade.dataset.youtubeTitle = selectedFacade.dataset.youtubeTitle;
  featuredFacade.setAttribute("aria-label", `הפעלת הסרטון: ${selectedTitle}`);
  if (selectedImage) {
    selectedImage.loading = "eager";
    selectedImage.setAttribute("fetchpriority", "high");
    featuredFacade.querySelector("img")?.replaceWith(selectedImage);
  }
  featured.querySelector("#featured-title").textContent = selectedTitle;
  if (selectedLink) featured.querySelector(".text-link").href = selectedLink.href;
})();
