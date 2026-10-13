(() => {
  const showPlayer = (facade, autoplay) => {
    const iframe = document.createElement('iframe');
    const url = new URL(facade.dataset.youtubeSrc);
    url.searchParams.set('autoplay', autoplay ? '1' : '0');
    url.searchParams.set('enablejsapi', '1');
    url.searchParams.set('playsinline', '1');
    url.searchParams.set('origin', window.location.origin);
    iframe.title = facade.dataset.youtubeTitle;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    iframe.loading = autoplay ? 'eager' : 'lazy';
    iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;border-radius:inherit';
    if (!autoplay) {
      iframe.addEventListener('load', () => window.registerActiveYouTube?.(iframe), { once: true });
    }
    iframe.src = url.href;
    facade.replaceWith(iframe);
    if (autoplay) {
      window.registerActiveYouTube?.(iframe);
      iframe.focus();
    }
  };

  document.addEventListener('click', (event) => {
    const facade = event.target.closest('.youtube-facade');
    if (facade) showPlayer(facade, true);
  });

  const nativePlay = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Android|Edg\//.test(navigator.userAgent));
  if (nativePlay) {
    // ponytail: WebKit needs a tap on the native player; lazy frames avoid loading the whole gallery.
    // Wait for the deferred gallery script to apply the selected ?watch= video first.
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.youtube-facade').forEach((facade) => showPlayer(facade, false));
    }, { once: true });
  }
})();
