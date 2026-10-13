(() => {
  const frames = new Set();
  const players = new Map();
  const visibleFrames = new Map();
  const pauseTimers = new Map();
  let apiReady = false;

  const ensureApi = () => {
    if (window.YT?.Player) {
      apiReady = true;
      frames.forEach(attachPlayer);
    } else if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.append(script);
    }
  };

  const pauseIfPlaying = (frame) => {
    const player = players.get(frame);
    const state = player?.getPlayerState?.();
    if (state === 1 || state === 3) player.pauseVideo();
  };

  const updateVisibility = (frame, visible) => {
    visibleFrames.set(frame, visible);
    if (visible) {
      clearTimeout(pauseTimers.get(frame));
      pauseTimers.delete(frame);
    } else if (!pauseTimers.has(frame)) {
      // ponytail: brief viewport changes on mobile must not cancel a user's playback.
      pauseTimers.set(frame, setTimeout(() => {
        pauseTimers.delete(frame);
        if (visibleFrames.get(frame) === false) pauseIfPlaying(frame);
      }, 750));
    }
  };

  const checkVisibility = (frame) => {
    const rect = frame.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    updateVisibility(frame, visibleWidth > 0 && visibleHeight > 0);
  };

  const observer = 'IntersectionObserver' in window
    ? new window.IntersectionObserver((entries) => entries.forEach((entry) => {
        updateVisibility(entry.target, entry.isIntersecting);
      }), { threshold: 0 })
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
          if (event.data !== window.YT.PlayerState.PLAYING && event.data !== window.YT.PlayerState.BUFFERING) return;
          frames.forEach((otherFrame) => {
            if (otherFrame !== frame) pauseIfPlaying(otherFrame);
          });
          if (document.hidden) event.target.pauseVideo();
          else if (visibleFrames.get(frame) === false) updateVisibility(frame, false);
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
    ensureApi();
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
