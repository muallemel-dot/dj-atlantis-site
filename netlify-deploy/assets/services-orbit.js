(() => {
  const section = document.querySelector(".services-orbit");
  if (!section) return;

  const cards = [...section.querySelectorAll(".reason-card")];
  const desktop = matchMedia("(min-width: 1081px)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const show = () => section.classList.add("is-orbit-visible");
  section.classList.add("is-orbit-ready");

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    show();
  } else {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      show();
      observer.disconnect();
    }, { threshold: .14 });

    observer.observe(section);
  }

  let ticking = false;
  const updateParallax = () => {
    ticking = false;
    const enabled = desktop.matches && !reducedMotion.matches && !document.body.classList.contains("a11y-reduced-motion");
    section.classList.toggle("is-orbit-parallax", enabled);

    if (!enabled) {
      cards.forEach((card) => card.style.removeProperty("--scroll-x"));
      cards.forEach((card) => card.style.removeProperty("--scroll-y"));
      cards.forEach((card) => card.style.removeProperty("--scroll-scale"));
      return;
    }

    const rect = section.getBoundingClientRect();
    const distance = Math.min(1, Math.abs(rect.top + rect.height / 2 - innerHeight / 2) / (rect.height / 2 + innerHeight / 2));
    const shift = Math.round(distance * 76);
    const directions = [[0, -1], [1, -.45], [1, .45], [0, 1], [-1, .45], [-1, -.45]];

    cards.forEach((card, index) => {
      const [x, y] = directions[index];
      card.style.setProperty("--scroll-x", `${Math.round(x * shift)}px`);
      card.style.setProperty("--scroll-y", `${Math.round(y * shift)}px`);
      card.style.setProperty("--scroll-scale", String(1 - distance * .08));
    });
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateParallax);
  };

  addEventListener("scroll", requestUpdate, { passive: true });
  addEventListener("resize", requestUpdate);
  document.addEventListener("atlantis:a11y-change", requestUpdate);
  desktop.addEventListener?.("change", requestUpdate);
  reducedMotion.addEventListener?.("change", requestUpdate);
  requestUpdate();
})();
