'use strict';

const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// Preserve the single-line name even with wider user-selected text spacing.
const nameHeading = document.querySelector('.identity h1');
const nameLink = nameHeading.querySelector('a');
let nameFitFrame = false;
function fitProfileName() {
  if (nameFitFrame) return;
  nameFitFrame = true;
  requestAnimationFrame(() => {
    nameFitFrame = false;
    const width = nameLink.getBoundingClientRect().width;
    if (!width || !nameHeading.clientWidth) return;
    const current = Number(nameHeading.style.getPropertyValue('--name-fit')) || 1;
    const next = Math.min(1, current * (nameHeading.clientWidth - 1) / width);
    if (Math.abs(next - current) > .002) nameHeading.style.setProperty('--name-fit', next);
  });
}
if ('ResizeObserver' in window) {
  const nameObserver = new ResizeObserver(fitProfileName);
  nameObserver.observe(document.querySelector('.profile-header'));
  nameObserver.observe(nameLink);
}
window.addEventListener('resize', fitProfileName);
fitProfileName();

const navLinks = [...document.querySelectorAll('#navigation a[href^="#"]')];
const sections = [...document.querySelectorAll('main > section[id]')];
const sectionJump = document.querySelector('#section-jump');
const mobileJump = document.querySelector('#mobile-jump');
const sidebar = document.querySelector('.sidebar');
const sectionDirectory = document.querySelector('.section-directory');
const mobileLayout = matchMedia('(max-width: 850px)');
// Native details remains usable without JavaScript; desktop navigation stays expanded.
function syncSectionDirectory() {
  sectionDirectory.open = !mobileLayout.matches;
  updateActiveSection();
}
if (typeof mobileLayout.addEventListener === 'function') {
  mobileLayout.addEventListener('change', syncSectionDirectory);
} else if (typeof mobileLayout.addListener === 'function') {
  mobileLayout.addListener(syncSectionDirectory);
}
let navigationFrame = false;
syncSectionDirectory();

// Bulk controls affect content disclosures, not the mobile navigation menu.
const contentDetails = [...document.querySelectorAll('main details')];
const disclosureControls = document.querySelector('.disclosure-controls');
disclosureControls.hidden = false;
function setContentExpanded(open) {
  contentDetails.forEach(detail => { detail.open = open; });
  disclosureControls.querySelector('[role="status"]').textContent = open
    ? 'All content sections expanded.' : 'All content sections collapsed.';
  updateActiveSection();
}
document.querySelector('#expand-all').addEventListener('click', () => setContentExpanded(true));
document.querySelector('#collapse-all').addEventListener('click', () => setContentExpanded(false));

function updateActiveSection() {
  if (navigationFrame) return;
  navigationFrame = true;
  requestAnimationFrame(() => {
    const mobile = mobileLayout.matches;
    mobileJump.classList.toggle('is-visible', mobile && sidebar.getBoundingClientRect().bottom < 0);
    const offset = mobileJump.getBoundingClientRect().height + 24;
    const offsetValue = `${offset}px`;
    if (document.documentElement.style.getPropertyValue('--anchor-offset') !== offsetValue) {
      document.documentElement.style.setProperty('--anchor-offset', offsetValue);
    }
    let active = 'about';
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= offset + 24) active = section.id;
    }
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) active = 'contact';
    for (const link of navLinks) {
      if (link.hash === '#' + active) {
        if (link.getAttribute('aria-current') !== 'location') link.setAttribute('aria-current', 'location');
      } else if (link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
    }
    if (document.activeElement !== sectionJump && sectionJump.value !== active) sectionJump.value = active;
    navigationFrame = false;
  });
}

function hashTarget(hash = location.hash) {
  try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
  catch { return null; }
}

function revealTarget(target) {
  if (target instanceof HTMLDetailsElement) target.open = true;
  for (let parent = target?.parentElement; parent; parent = parent.parentElement) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
  }
}

function visitSection(hash) {
  const target = hashTarget(hash);
  if (!target) return;
  revealTarget(target);
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  if (mobileLayout.matches && target.closest('main')) {
    sectionDirectory.open = false;
    mobileJump.classList.add('is-visible');
    document.documentElement.style.setProperty('--anchor-offset', `${mobileJump.offsetHeight + 24}px`);
  }
  if (location.hash !== hash) history.pushState(null, '', hash);
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start' });
  updateActiveSection();
}

sectionJump.addEventListener('change', () => visitSection('#' + sectionJump.value));
sectionJump.addEventListener('blur', updateActiveSection);
window.addEventListener('scroll', updateActiveSection, { passive: true });
window.addEventListener('resize', updateActiveSection);
window.addEventListener('hashchange', () => {
  visitSection(location.hash);
});
document.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', updateActiveSection));
if ('ResizeObserver' in window) new ResizeObserver(updateActiveSection).observe(document.querySelector('main'));
if (location.hash) {
  requestAnimationFrame(() => visitSection(location.hash));
}
updateActiveSection();
document.querySelector('#year').textContent = new Date().getFullYear();

// Keep the email link available when clipboard access is unsupported or denied.
const copyEmailButton = document.querySelector('#copy-email');
const copyEmailStatus = document.querySelector('#copy-email-status');
const emailFallback = document.querySelector('#email-copy-fallback');
const emailField = document.querySelector('#email-copy-value');
const contactEmail = document.querySelector('.contact-links a[href^="mailto:"]').textContent.trim();
function selectEmailManually() {
  emailFallback.hidden = false;
  emailField.value = contactEmail;
  emailField.focus();
  emailField.select();
  emailField.setSelectionRange(0, contactEmail.length);
}
emailField.addEventListener('click', () => emailField.select());
copyEmailButton.hidden = false;
if (!navigator.clipboard?.writeText) copyEmailButton.textContent = 'Select email';
copyEmailButton.addEventListener('click', async () => {
    if (!navigator.clipboard?.writeText) {
      selectEmailManually();
      copyEmailStatus.textContent = 'Email selected for manual copying.';
      return;
    }
    copyEmailButton.disabled = true;
    copyEmailStatus.textContent = 'Copying email…';
    try {
      await navigator.clipboard.writeText(contactEmail);
      emailFallback.hidden = true;
      copyEmailStatus.textContent = 'Email address copied.';
    } catch {
      selectEmailManually();
      copyEmailStatus.textContent = 'Could not copy automatically. Use the selected email field below.';
    } finally {
      copyEmailButton.disabled = false;
    }
  });
if (navigator.clipboard?.writeText) {
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    const source = document.getElementById(button.dataset.copyTarget);
    const status = button.nextElementSibling;
    if (!source || !status) return;
    button.hidden = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      status.textContent = 'Copying commands…';
      try {
        await navigator.clipboard.writeText(source.textContent);
        status.textContent = 'Commands copied.';
      } catch {
        status.textContent = 'Select the commands above to copy them manually.';
      } finally {
        button.disabled = false;
      }
    });
  });
}

const localVideos = {
  'homography-calibration': {title: 'Homography Calibrator', caption: 'Camera-to-ground calibration demonstration · 25 seconds · Local XY / GPS references, road-plane grids, and coordinate inspection.'},
  'annotation-workbench': {title: 'AI Annotation Workbench', caption: 'Human-in-the-loop annotation demonstration · 30 seconds · The effort-reduction graphic in the video is conceptual, not a measured benchmark.'}
};
const galleries = {
  waterway: {title: 'Dhaka Circular Waterway · field visit', caption: 'Field observations with the BIWTA, BIWTC, DTCA, and BUET team, 2026.', alts: ['River view from a boat during the field visit', 'Dhaka riverfront seen from the bow of the boat', 'Inside the boat’s wheelhouse during the field visit']},
  workshop: {title: 'Protein folding & AlphaFold workshop', caption: 'BRAC University · 8 January 2026.', alts: ['Presentation on tokens at the AlphaFold workshop', 'Workshop presentation and laptop-based exercises', 'Presentation on template-based protein modeling']},
  buet: {title: 'Representing BUET · ICT Ministry program', caption: '“Tarunner Startup and Sombvobonar Bangladesh” · 2026.', alts: ['Participants at the ICT Ministry program', 'Printed program materials for the event', 'View across the program venue']}
};
const mediaDialog = document.querySelector('#media-dialog');
// Use actual buttons for in-page playback. Keep source links as a no-JS fallback,
// but do not leave an external navigation target on an enhanced play control.
if (typeof mediaDialog.showModal === 'function') {
  document.querySelectorAll('a[data-youtube]').forEach(link => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(link.dataset.youtube)) return;
    const button = document.createElement('button');
    for (const attribute of link.attributes) {
      if (!['href', 'target', 'rel'].includes(attribute.name)) button.setAttribute(attribute.name, attribute.value);
    }
    button.type = 'button';
    button.classList.add('media-trigger');
    button.dataset.printUrl = link.href;
    button.append(...link.childNodes);
    link.replaceWith(button);
  });
}
// Keep previews understandable when lazy images are slow or unavailable.
document.querySelectorAll('.video-thumb img, .image-thumb img, .gallery-image img, .field-image img').forEach(img => {
  const preview = img.parentElement;
  const alt = img.alt;
  const message = document.createElement('span');
  message.className = 'preview-message';
  message.setAttribute('aria-hidden', 'true');
  function update(state) {
    preview.dataset.previewState = state;
    if (state === 'ready') { message.remove(); img.alt = alt; return; }
    message.textContent = state === 'error' ? 'Preview unavailable' : 'Loading preview…';
    if (state === 'error') img.alt = alt + ' (preview unavailable)';
    preview.append(message);
  }
  img.addEventListener('load', () => update('ready'));
  img.addEventListener('error', () => update('error'));
  update(img.complete ? (img.naturalWidth ? 'ready' : 'error') : 'loading');
});

// Announce the enhanced interaction only where an in-page dialog is available.
if (typeof mediaDialog.showModal === 'function') {
  document.querySelectorAll('[data-video], [data-gallery], [data-youtube]').forEach(link => {
    const localMedia = owns(localVideos, link.dataset.video) || owns(galleries, link.dataset.gallery);
    const youtube = /^[A-Za-z0-9_-]{11}$/.test(link.dataset.youtube || '');
    if (localMedia || youtube) link.setAttribute('aria-haspopup', 'dialog');
  });
}
// Intrinsic dimensions reserve the right aspect ratio while each photo loads.
const galleryDimensions = {
  waterway: [[900,1200], [900,1200], [1600,1200]],
  workshop: [[1600,1200], [900,1200], [1600,1200]],
  buet: [[900,1200], [900,1200], [1600,1200]]
};
const mediaContent = document.querySelector('#media-content');
const mediaTitle = document.querySelector('#media-title');
const mediaCaption = document.querySelector('#media-caption');
const mediaStatus = document.querySelector('#media-status');
const mediaRetry = document.querySelector('#retry-media');
const galleryControls = document.querySelector('#gallery-controls');
const photoCount = document.querySelector('#photo-count');
let galleryName = null;
let galleryIndex = 0;
let cleanupYouTube = null;
let mediaTrigger = null;
let backdropPress = false;

function clearMedia() {
  cleanupYouTube?.();
  cleanupYouTube = null;
  const video = mediaContent.querySelector('video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  mediaContent.replaceChildren();
  mediaCaption.replaceChildren();
  mediaStatus.textContent = '';
  mediaRetry.hidden = true;
  mediaRetry.onclick = null;
  mediaContent.classList.remove('gallery-media');
  galleryControls.hidden = true;
  photoCount.textContent = '';
  galleryName = null;
}

function openMedia(title, trigger) {
  clearMedia();
  backdropPress = false;
  mediaTrigger = trigger;
  mediaTitle.textContent = title;
  mediaDialog.showModal();
  mediaDialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
}

function showGalleryImage() {
  const gallery = galleries[galleryName];
  const img = document.createElement('img');
  [img.width, img.height] = galleryDimensions[galleryName][galleryIndex];
  img.alt = gallery.alts[galleryIndex];
  img.decoding = 'async';
  mediaStatus.textContent = 'Loading photo…';
  mediaRetry.hidden = true;
  mediaRetry.onclick = null;
  mediaContent.classList.add('gallery-media');
  img.addEventListener('load', () => { if (img.isConnected) mediaStatus.textContent = ''; });
  img.addEventListener('error', () => {
    if (img.isConnected) {
      mediaStatus.textContent = 'This photo could not load. Try again or choose another photo.';
      mediaRetry.hidden = false;
      mediaRetry.onclick = showGalleryImage;
    }
  });
  img.src = `assets/images/${galleryName}-${galleryIndex + 1}.webp`;
  mediaContent.replaceChildren(img);
  const original = document.createElement('a');
  original.href = img.src;
  original.textContent = 'Open photo in new tab';
  original.target = '_blank';
  original.rel = 'noopener';
  original.setAttribute('aria-label', 'Open photo in new tab');
  mediaCaption.replaceChildren(document.createTextNode(gallery.caption + ' '), original);
  photoCount.textContent = `Photo ${galleryIndex + 1} of ${gallery.alts.length}`;
}

function stepGallery(direction) {
  if (!galleryName) return;
  galleryIndex = (galleryIndex + direction + galleries[galleryName].alts.length) % galleries[galleryName].alts.length;
  showGalleryImage();
}

document.querySelector('#previous-photo').addEventListener('click', () => stepGallery(-1));
document.querySelector('#next-photo').addEventListener('click', () => stepGallery(1));
mediaDialog.addEventListener('keydown', event => {
  if (!galleryName || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); stepGallery(event.key === 'ArrowLeft' ? -1 : 1);
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault(); galleryIndex = event.key === 'Home' ? 0 : galleries[galleryName].alts.length - 1; showGalleryImage();
  }
});

document.addEventListener('click', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
  const link = event.target.closest('a, button[data-youtube]');
  if (!link) return;
  if (link.getAttribute('href')?.startsWith('#')) {
    if (hashTarget(link.hash)) { event.preventDefault(); visitSection(link.hash); }
    return;
  }
  // Preserve real links only in browsers without dialog support.
  if (typeof mediaDialog.showModal !== 'function') return;
  if (link.dataset.video && owns(localVideos, link.dataset.video)) {
    event.preventDefault();
    const id = link.dataset.video;
    const data = localVideos[id];
    openMedia(data.title, link);
    const video = document.createElement('video');
    video.controls = true; video.playsInline = true; video.preload = 'metadata';
    video.poster = `assets/images/${id}.webp`;
    video.setAttribute('aria-label', data.title);
    video.addEventListener('error', () => {
      if (video.isConnected) {
        mediaStatus.textContent = 'This video could not load. Try again or use the direct video link below.';
        mediaRetry.hidden = false;
        mediaRetry.onclick = () => {
          mediaRetry.hidden = true;
          mediaStatus.textContent = 'Loading video…';
          video.load();
          video.play().catch(() => {
            if (video.isConnected && !video.error) mediaStatus.textContent = 'Press Play in the video controls to start.';
          });
        };
      }
    });
    video.src = `assets/videos/${id}.mp4`;
    const fallback = document.createElement('a');
    fallback.href = video.src; fallback.textContent = 'Open video'; fallback.target = '_blank'; fallback.rel = 'noopener';
    fallback.setAttribute('aria-label', 'Open video (opens in a new tab)');
    mediaContent.append(video);
    mediaCaption.replaceChildren(document.createTextNode(data.caption + ' '), fallback);
    mediaStatus.textContent = 'Loading video… Playback may take a moment on a slow connection.';
    video.addEventListener('waiting', () => {
      if (video.isConnected && !video.error) mediaStatus.textContent = 'Buffering video… Waiting for more data.';
    });
    video.addEventListener('canplay', () => { if (video.isConnected && !video.error) mediaStatus.textContent = ''; });
    video.play().catch(() => {
      if (video.isConnected && !video.error) mediaStatus.textContent = 'Press Play in the video controls to start.';
    });
    video.addEventListener('playing', () => { if (video.isConnected) mediaStatus.textContent = ''; });
  } else if (/^[A-Za-z0-9_-]{11}$/.test(link.dataset.youtube || '')) {
    event.preventDefault();
    openMedia(link.dataset.title, link);
    if (!/^https?:$/.test(location.protocol)) {
      mediaStatus.textContent = 'This page was opened directly from a file. To play YouTube videos inside the portfolio, open the local web preview or the published website.';
      const preview = document.createElement('a');
      preview.href = 'http://127.0.0.1:4173/' + (link.closest('article[id]') ? '#' + link.closest('article[id]').id : '#service');
      preview.className = 'action-button';
      preview.textContent = 'Open local portfolio preview';
      mediaCaption.replaceChildren(preview, document.createTextNode(' Requires the local preview server to be running.'));
    } else if (typeof window.openYoutubePlayer !== 'function') {
      mediaStatus.textContent = 'The video player could not initialize. Reload the page to try again.';
    } else {
      cleanupYouTube = window.openYoutubePlayer({id: link.dataset.youtube, title: link.dataset.title, container: mediaContent, caption: mediaCaption, status: mediaStatus});
    }
  } else if (link.dataset.gallery && owns(galleries, link.dataset.gallery)) {
    event.preventDefault();
    const name = link.dataset.gallery;
    openMedia(galleries[name].title, link);
    galleryName = name;
    const number = Number(link.getAttribute('href').match(/-(\d+)\.webp$/)?.[1]);
    galleryIndex = number >= 1 && number <= galleries[name].alts.length ? number - 1 : 0;
    galleryControls.hidden = false;
    showGalleryImage();
  }
});

document.querySelector('.close-dialog').addEventListener('click', () => mediaDialog.close());
function outsideDialog(event) {
  const rect = mediaDialog.getBoundingClientRect();
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
}
mediaDialog.addEventListener('pointerdown', event => {
  backdropPress = event.target === mediaDialog && outsideDialog(event);
});
mediaDialog.addEventListener('pointercancel', () => { backdropPress = false; });
mediaDialog.addEventListener('click', event => {
  const dismiss = backdropPress && event.target === mediaDialog && outsideDialog(event);
  backdropPress = false;
  if (dismiss) mediaDialog.close();
});
mediaDialog.addEventListener('close', () => {
  if (mediaDialog.open) return;
  backdropPress = false;
  document.body.classList.remove('dialog-open');
  clearMedia();
  mediaTrigger?.focus({preventScroll: true});
  mediaTrigger = null;
});

// Print complete text, then restore the reader's disclosure choices afterwards.
let printDetails = null;
window.addEventListener('beforeprint', () => {
  if (printDetails) return;
  printDetails = [...document.querySelectorAll('details')].map(el => [el, el.open]);
  printDetails.forEach(([el]) => { el.open = true; });
});
window.addEventListener('afterprint', () => {
  printDetails?.forEach(([el, open]) => { el.open = open; });
  printDetails = null;
});
