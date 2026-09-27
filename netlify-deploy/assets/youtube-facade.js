(() => {
  document.addEventListener('click', (event) => {
    const facade = event.target.closest('.youtube-facade');
    if (!facade) return;

    const iframe = document.createElement('iframe');
    const url = new URL(facade.dataset.youtubeSrc);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('enablejsapi', '1');
    url.searchParams.set('origin', window.location.origin);
    iframe.src = url.href;
    iframe.title = facade.dataset.youtubeTitle;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;border-radius:inherit';
    facade.replaceWith(iframe);
    window.registerActiveYouTube?.(iframe);
    iframe.focus();
  });
})();
