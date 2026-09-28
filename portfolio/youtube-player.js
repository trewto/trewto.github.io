(() => {
  'use strict';

  const sessions = new WeakMap();

  /** Mount a native YouTube iframe without waiting for the optional Player API. */
  window.openYoutubePlayer = ({ id, title, container, caption, status }) => {
    if (!(container instanceof HTMLElement) || !(caption instanceof HTMLElement)) {
      throw new TypeError('YouTube player requires container and caption elements.');
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new TypeError('Invalid YouTube video ID.');

    sessions.get(container)?.();

    const iframe = document.createElement('iframe');
    iframe.title = title || 'Video demonstration';
    iframe.className = 'youtube-embed';
    iframe.width = '960';
    iframe.height = '540';
    iframe.style.minHeight = '200px';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    // Match the standard iframe host used in the original showcase. No API, no
    // autoplay, and no timer that can remove a slow-loading or paused player.
    iframe.src = `https://www.youtube.com/embed/${id}?playsinline=1&rel=0`;

    const label = document.createElement('span');
    label.className = 'youtube-caption-text';
    label.textContent = 'YouTube demonstration · Arnob Roy. ';
    const watchLink = document.createElement('a');
    watchLink.href = `https://www.youtube.com/watch?v=${id}`;
    watchLink.target = '_blank';
    watchLink.rel = 'noopener';
    watchLink.className = 'action-button youtube-watch-link';
    watchLink.textContent = 'Watch on YouTube ↗';
    watchLink.setAttribute('aria-label', 'Watch on YouTube (opens in a new tab)');

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'action-button youtube-retry';
    retry.textContent = 'Retry player';
    retry.hidden = true;
    let loadTimer;
    function waitForFrame() {
      clearTimeout(loadTimer);
      retry.hidden = true;
      if (status instanceof HTMLElement) status.textContent = 'Loading YouTube player…';
      loadTimer = setTimeout(() => {
        if (sessions.get(container) !== cleanup) return;
        retry.hidden = false;
        if (status instanceof HTMLElement) status.textContent = 'YouTube is taking longer than expected to load. Retry here, or open this portfolio in your regular browser if the embedded preview stays blank.';
      }, 12000);
    }
    retry.addEventListener('click', () => {
      waitForFrame();
      iframe.src = `https://www.youtube.com/embed/${id}?playsinline=1&rel=0`;
    });

    function cleanup() {
      // An old cleanup callback must not remove a newer player in this container.
      if (sessions.get(container) !== cleanup) return;
      sessions.delete(container);
      clearTimeout(loadTimer);
      iframe.remove();
      container.replaceChildren();
      caption.replaceChildren();
      if (status instanceof HTMLElement) status.textContent = '';
      delete container.dataset.youtubeState;
    }

    sessions.set(container, cleanup);
    waitForFrame();
    iframe.addEventListener('load', () => {
      if (sessions.get(container) !== cleanup) return;
      clearTimeout(loadTimer);
      retry.hidden = false;
      if (status instanceof HTMLElement) status.textContent = '';
    });
    caption.replaceChildren(label, retry, document.createTextNode(' '), watchLink);
    container.replaceChildren(iframe);
    container.dataset.youtubeState = 'embedded';
    return cleanup;
  };
})();
