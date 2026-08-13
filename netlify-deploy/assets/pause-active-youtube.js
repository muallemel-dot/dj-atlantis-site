(() => {
  const frames = new Set();
  const players = new Map();
  const visibleRatios = new Map();
  let apiReady = false;

  const pauseIfPlaying = (frame) => {
    const player = players.get(frame);
    if (player?.getPlayerState?.() === 1) player.pauseVideo();
  };

  const checkVisibility = (frame) => {
    const rect = frame.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const ratio = rect.width && rect.height ? (visibleWidth * visibleHeight) / (rect.width * rect.height) : 0;
    visibleRatios.set(frame, ratio);
    if (ratio < 0.5) pauseIfPlaying(frame);
  };

  const observer = 'IntersectionObserver' in window
    ? new window.IntersectionObserver((entries) => entries.forEach((entry) => {
        visibleRatios.set(entry.target, entry.intersectionRatio);
        if (entry.intersectionRatio < 0.5) pauseIfPlaying(entry.target);
      }), { threshold: [0, 0.5] })
    : { observe: checkVisibility };

  const attachPlayer = (frame) => {
    if (!apiReady || players.has(frame) || !frame.src) return;
    players.set(frame, new window.YT.Player(frame, {
      events: {
        onReady() {
          checkVisibility(frame);
          if (document.hidden) pauseIfPlaying(frame);
        },
        onStateChange(event) {
          if (event.data === window.YT.PlayerState.PLAYING && (document.hidden || (visibleRatios.get(frame) ?? 1) < 0.5)) {
            event.target.pauseVideo();
          }
        },
      },
    }));
  };

  const register = (frame) => {
    if (frame?.tagName !== 'IFRAME' || frames.has(frame)) return;
    const playerUrl = new URL(frame.src);
    if (playerUrl.searchParams.get('origin') !== window.location.origin) {
      playerUrl.searchParams.set('origin', window.location.origin);
      frame.src = playerUrl.href;
    }
    frames.add(frame);
    observer.observe(frame);
    attachPlayer(frame);
  };

  window.registerActiveYouTube = register;
  document.querySelectorAll('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]').forEach(register);

  const previousReady = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    previousReady?.();
    apiReady = true;
    frames.forEach(attachPlayer);
  };

  if (window.YT?.Player) {
    apiReady = true;
    frames.forEach(attachPlayer);
  } else if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.append(script);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) frames.forEach(pauseIfPlaying);
  });

  if (!('IntersectionObserver' in window)) {
    let scheduled = false;
    const checkFrames = () => {
      if (scheduled) return;
      scheduled = true;
      const schedule = window.requestAnimationFrame
        ? (callback) => window.requestAnimationFrame(callback)
        : (callback) => setTimeout(callback, 16);
      schedule(() => {
        frames.forEach(checkVisibility);
        scheduled = false;
      });
    };
    window.addEventListener('scroll', checkFrames, { passive: true });
    window.addEventListener('resize', checkFrames, { passive: true });
  }
})();
