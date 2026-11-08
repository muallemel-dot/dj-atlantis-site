(() => {
  const gallery = document.querySelector('#music');
  if (!gallery) return;
  const motionToggle = gallery.querySelector('.music-motion-toggle');

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      gallery.classList.toggle('is-in-view', entry.isIntersecting);
    }).observe(gallery);
  }

  motionToggle.hidden = false;
  motionToggle.addEventListener('click', () => {
    const paused = !gallery.classList.contains('is-paused');
    gallery.classList.toggle('is-paused', paused);
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.textContent = paused ? 'הפעלת התנועה' : 'עצירת התנועה';
  });

})();
