import { initNav } from './nav.js';
import { getPlace } from './places.js';
import { showToast, getParam, checkRateLimit, formatRemaining } from './utils.js';
import { addPlaceReview, getPlaceReviews } from './placeReviews.js';
import { auth } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getLang, loadDict, applyDict, applyLanguageSeo, pickI18n, t } from './i18n.js';
import { formatPlaceDate } from './placeDate.js';

initNav('');
const lang = getLang();
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
} catch {}

const skeletonEl = document.getElementById('skeleton');
const contentEl  = document.getElementById('content');
const errorEl    = document.getElementById('error');

// ── load ──────────────────────────────────────────────────────────────────

const id = getParam('id');
if (!id) { showError(); } else {
  try {
    const place = await getPlace(id);
    if (!place) showError();
    else render(place);
  } catch (err) {
    console.error(err);
    showError();
    showToast(t('place.loadError', dictI18n), 'error');
  }
}

// ── render ────────────────────────────────────────────────────────────────

function render(place) {
  const i18nData = pickI18n(place, lang);
  const placeName = i18nData.name || place.name || '';
  const placeDescription = i18nData.description || place.description || '';
  const placeAuthor = i18nData.author || place.author || '';
  const placeAddress = i18nData.address || place.location?.address || '';
  const placeOpeningAddress = i18nData.openingAddress || place.openingAddress || '';

  document.title = `${placeName} — ${t('common.brand', dictI18n)}`;
  applyPlaceSeo(placeName, placeDescription, place);

  document.getElementById('meta-title').textContent = placeName;

  // location
  if (placeAddress) {
    document.getElementById('meta-address').textContent = placeAddress;
    document.getElementById('meta-location').classList.remove('hidden');
  }

  // opening address
  if (placeOpeningAddress) {
    document.getElementById('meta-opening-address').textContent = placeOpeningAddress;
    document.getElementById('meta-opening-address-row').classList.remove('hidden');
  }

  // date
  const dateText = formatPlaceDate(place?.createdOn, lang) || String(place?.openingDate || '');
  if (dateText) {
    document.getElementById('meta-date').textContent = dateText;
    document.getElementById('meta-date-row').classList.remove('hidden');
  }
  renderEpochBadge(place);

  // author
  if (placeAuthor) {
    document.getElementById('meta-author').textContent = placeAuthor;
    document.getElementById('meta-author-row').classList.remove('hidden');
  }

  // tags
  if (place.tags?.length) {
    const tagsEl = document.getElementById('meta-tags');
    tagsEl.innerHTML = place.tags
      .map(t => `<a class="tag" href="catalog.html?tags=${encodeURIComponent(String(t))}">${esc(t)}</a>`)
      .join('');
    tagsEl.classList.remove('hidden');
  }

  // map link
  if (place.location?.lat && place.location?.lng) {
    const mapLink = document.getElementById('meta-map-link');
    mapLink.href = `map.html?lat=${place.location.lat}&lng=${place.location.lng}&id=${place.id}`;
    mapLink.classList.remove('hidden');
  }

  // gallery
  renderGallery(place.photos || []);

  // description
  const descEl = document.getElementById('description');
  if (placeDescription) {
    descEl.innerHTML = placeDescription
      .split(/\n{2,}/)
      .map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  // 3D model — use modelType field to determine render method
  if (place.modelType === 'sketchfab' && place.sketchfabUrl) {
    renderSketchfab(place.sketchfabUrl);
  } else if (place.modelType === 'file' && place.modelUrl) {
    renderModelViewer(place.modelUrl);
  } else if (place.sketchfabUrl) {
    // Fallback: sketchfabUrl exists without modelType
    renderSketchfab(place.sketchfabUrl);
  } else if (place.modelUrl) {
    // Fallback: legacy — auto-detect sketchfab vs file
    renderModelViewer(place.modelUrl);
  }

  // route button
  document.getElementById('btn-route').addEventListener('click', () => {
    openRoute({ ...place, name: placeName });
  });

  // share button
  document.getElementById('btn-share').addEventListener('click', () => {
    sharePlace({ ...place, name: placeName });
  });

  // show reviews section
  document.getElementById('reviews-section').classList.remove('hidden');
  initReviews(place.id);

  skeletonEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
}

function applyPlaceSeo(placeName, placeDescription, place) {
  const description = String(placeDescription || '').trim() || t('place.eyebrow', dictI18n);
  const image = place?.photos?.[0] ? String(place.photos[0]) : '';
  const url = window.location.href;

  setMetaByName('description', description);
  setMetaById('og-title', `${placeName} — ${t('common.brand', dictI18n)}`, 'content');
  setMetaById('og-description', description, 'content');
  setMetaById('og-image', image, 'content');
  setMetaById('og-url', url, 'content');
  setMetaById('tw-title', `${placeName} — ${t('common.brand', dictI18n)}`, 'content');
  setMetaById('tw-description', description, 'content');
  setMetaById('tw-image', image, 'content');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: placeName,
    description,
    image: Array.isArray(place?.photos) ? place.photos.slice(0, 5) : [],
    geo: (place?.location?.lat && place?.location?.lng)
      ? { '@type': 'GeoCoordinates', latitude: place.location.lat, longitude: place.location.lng }
      : undefined,
    address: place?.location?.address
      ? { '@type': 'PostalAddress', streetAddress: place.location.address, addressCountry: 'BY' }
      : undefined,
    url
  };
  const ld = document.getElementById('place-jsonld');
  if (ld) ld.textContent = JSON.stringify(jsonLd);
}

function setMetaByName(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaById(id, value, attr = 'content') {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute(attr, value || '');
}

// ── gallery + lightbox ────────────────────────────────────────────────────

var photos = [];
var lbIndex = 0;

function renderGallery(arr) {
  photos = arr;
  const galleryEl = document.getElementById('gallery');

  if (!photos.length) {
    galleryEl.innerHTML = `<div class="gallery__main--placeholder">${esc(t('place.noPhotos', dictI18n))}</div>`;
    return;
  }

  galleryEl.innerHTML = `
    <div class="gallery__main-wrap" id="main-wrap">
      <img id="gallery-main" class="gallery__main" src="${esc(photos[0])}" alt="${esc(t('place.galleryAlt', dictI18n))}" />
      <span class="gallery__zoom-hint">${esc(t('place.zoomHint', dictI18n))}</span>
    </div>
    ${photos.length > 1 ? `<div class="gallery__thumbs">
      ${photos.map((url, i) => `
        <img class="gallery__thumb${i === 0 ? ' active' : ''}"
          src="${esc(url)}" alt="${esc(t('place.photoAlt', dictI18n))} ${i+1}"
          data-idx="${i}" loading="lazy" />
      `).join('')}
    </div>` : ''}
  `;

  const mainImg  = document.getElementById('gallery-main');
  const mainWrap = document.getElementById('main-wrap');

  // thumb click → change main
  galleryEl.querySelectorAll('.gallery__thumb').forEach(th => {
    th.addEventListener('click', () => {
      const idx = parseInt(th.dataset.idx);
      mainImg.src = photos[idx];
      galleryEl.querySelectorAll('.gallery__thumb').forEach(t => t.classList.remove('active'));
      th.classList.add('active');
      lbIndex = idx;
    });
  });

  // open lightbox
  mainWrap.addEventListener('click', () => openLightbox(lbIndex));
}

// lightbox
const lightbox  = document.getElementById('lightbox');
const lbImg     = document.getElementById('lb-img');
const lbCounter = document.getElementById('lb-counter');
const lbPrev    = document.getElementById('lb-prev');
const lbNext    = document.getElementById('lb-next');

function openLightbox(idx) {
  lbIndex = idx;
  lbImg.src = photos[idx];
  lbCounter.textContent = photos.length > 1 ? `${idx + 1} / ${photos.length}` : '';
  lbPrev.classList.toggle('hidden', photos.length <= 1);
  lbNext.classList.toggle('hidden', photos.length <= 1);
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.add('hidden');
  document.body.style.overflow = '';
}

function lbGo(dir) {
  lbIndex = (lbIndex + dir + photos.length) % photos.length;
  lbImg.src = photos[lbIndex];
  lbCounter.textContent = `${lbIndex + 1} / ${photos.length}`;
}

document.getElementById('lb-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
lbPrev.addEventListener('click', e => { e.stopPropagation(); lbGo(-1); });
lbNext.addEventListener('click', e => { e.stopPropagation(); lbGo(1); });
document.addEventListener('keydown', e => {
  if (lightbox.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft')  lbGo(-1);
  if (e.key === 'ArrowRight') lbGo(1);
});

// ── model-viewer (for .glb files) ────────────────────────────────────────

function renderModelViewer(url) {
  // Check if it's a Sketchfab URL
  if (url.includes('sketchfab.com')) {
    renderSketchfab(url);
    return;
  }

  if (!customElements.get('model-viewer')) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src  = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
    document.head.appendChild(s);
  }
  document.getElementById('model-wrapper').innerHTML = `
    <model-viewer src="${esc(url)}" alt="${esc(t('place.modelAlt', dictI18n))}"
      camera-controls auto-rotate shadow-intensity="1"
      style="width:100%;height:100%;background:#0d0d0d">
    </model-viewer>`;
  document.getElementById('model-section').classList.remove('hidden');
}

// ── Sketchfab embed ──────────────────────────────────────────────────────

function renderSketchfab(url) {
  let embedUrl = url;
  
  // Sketchfab URL: /3d-models/name-a829ad5bfa7a4b8c995b54a4708f6362
  // Model ID = last 32 hex chars of the slug
  const match = url.match(/sketchfab\.com\/(?:3d-)?models\/[a-zA-Z0-9-]*?([a-f0-9]{32})\b/);
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  const mobileParams = 'autostart=1&ui_theme=dark'
    + '&ui_controls=0&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0&ui_hint=0'
    + '&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_help=0&ui_loading=0'
    + '&autospin=0.2';
  const desktopParams = 'autostart=1&ui_theme=dark';
  const params = isMobile ? mobileParams : desktopParams;

  if (match) {
    embedUrl = `https://sketchfab.com/models/${match[1]}/embed?${params}`;
  } else {
    // Try direct: /models/abc123/...
    const direct = url.match(/sketchfab\.com\/models\/([a-f0-9]+)/);
    if (direct) {
      embedUrl = `https://sketchfab.com/models/${direct[1]}/embed?${params}`;
    } else if (url.includes('/embed')) {
      embedUrl = url;
    }
  }

  document.getElementById('model-wrapper').innerHTML = `
    <iframe src="${esc(embedUrl)}" 
      title="${esc(t('place.modelAlt', dictI18n))}"
      sandbox="allow-scripts allow-same-origin"
      allow="autoplay; fullscreen; xr-spatial-tracking"
      allowfullscreen
      style="width:100%;height:100%;border:none;">
    </iframe>`;
  document.getElementById('model-section').classList.remove('hidden');
}

// ── route ─────────────────────────────────────────────────────────────────

function openRoute(place) {
  const lat = place.location?.lat;
  const lng = place.location?.lng;
  if (!lat || !lng) { showToast(t('place.noCoords', dictI18n), 'error'); return; }

  const geoUri   = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(place.name)})`;
  const gmaps    = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const yandex   = `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`;
  const osm      = `https://www.openstreetmap.org/directions?to=${lat},${lng}`;

  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    window.location.href = geoUri;
    return;
  }

  showRoutePicker({ gmaps, yandex, osm });
}

function showRoutePicker({ gmaps, yandex, osm }) {
  const existing = document.getElementById('route-picker');
  if (existing) existing.remove();

  const picker = document.createElement('div');
  picker.id = 'route-picker';
  picker.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:var(--c-surface);border:1px solid var(--c-border);
    border-radius:var(--radius-md);box-shadow:var(--shadow-lg);
    padding:18px;display:flex;flex-direction:column;gap:8px;
    z-index:300;min-width:240px;
  `;
  picker.innerHTML = `
    <p style="font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--c-accent);margin-bottom:4px">${esc(t('place.openIn', dictI18n))}</p>
    <a href="${gmaps}" target="_blank" rel="noopener" style="padding:10px 14px;border:1px solid var(--c-border);border-radius:var(--radius-sm);font-size:.875rem;font-weight:500;display:block;transition:background .15s,border-color .15s" onmouseover="this.style.background='var(--c-accent-soft)';this.style.borderColor='var(--c-accent)'" onmouseout="this.style.background='';this.style.borderColor='var(--c-border)'">${esc(t('place.openInGoogleMaps', dictI18n))}</a>
    <a href="${yandex}" target="_blank" rel="noopener" style="padding:10px 14px;border:1px solid var(--c-border);border-radius:var(--radius-sm);font-size:.875rem;font-weight:500;display:block;transition:background .15s,border-color .15s" onmouseover="this.style.background='var(--c-accent-soft)';this.style.borderColor='var(--c-accent)'" onmouseout="this.style.background='';this.style.borderColor='var(--c-border)'">${esc(t('place.openInYandexMaps', dictI18n))}</a>
    <a href="${osm}" target="_blank" rel="noopener" style="padding:10px 14px;border:1px solid var(--c-border);border-radius:var(--radius-sm);font-size:.875rem;font-weight:500;display:block;transition:background .15s,border-color .15s" onmouseover="this.style.background='var(--c-accent-soft)';this.style.borderColor='var(--c-accent)'" onmouseout="this.style.background='';this.style.borderColor='var(--c-border)'">${esc(t('place.openInOSM', dictI18n))}</a>
  `;
  document.body.appendChild(picker);
  setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 50);
}

// ── share ─────────────────────────────────────────────────────────────────

async function sharePlace(place) {
  const url   = window.location.href;
  const title = place.name;
  const text  = `${place.name} — ${t('common.brand', dictI18n)}`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    showToast(t('place.shareCopied', dictI18n));
  } catch {
    showToast(t('place.shareCopyError', dictI18n), 'error');
  }
}

function renderEpochBadge(place) {
  const badgeEl = document.getElementById('meta-epoch');
  if (!badgeEl) return;
  const year = Number(place?.createdOn?.year);
  if (!Number.isFinite(year) || year <= 0) {
    badgeEl.classList.add('hidden');
    return;
  }
  const epoch = getEpochByYear(year);
  if (!epoch) {
    badgeEl.classList.add('hidden');
    return;
  }
  badgeEl.textContent = t(epoch.labelKey, dictI18n);
  badgeEl.href = `catalog.html?dateFrom=${epoch.from}&dateTo=${epoch.to}&sort=created_asc`;
  badgeEl.classList.remove('hidden');
}

function getEpochByYear(year) {
  if (year >= 1919 && year <= 1939) {
    return { labelKey: 'place.epochInterwar', from: 1919, to: 1939 };
  }
  if (year >= 1901 && year <= 2000) {
    return { labelKey: 'place.epochTwentieth', from: 1901, to: 2000 };
  }
  if (year >= 2001) {
    return { labelKey: 'place.epochModern', from: 2001, to: 2100 };
  }
  if (year > 0) {
    return { labelKey: 'place.epochPre1900', from: 1, to: 1900 };
  }
  return null;
}

// ── reviews ───────────────────────────────────────────────────────────────

const REVIEW_RATE_LIMIT_MS = 60_000;

function initReviews(placeId) {
  let lastDoc    = null;
  let hasMore    = false;
  let reviewRating = 0;
  let currentUser = null;

  const starsEl      = document.getElementById('review-stars');
  const ratingTextEl = document.getElementById('review-rating-text');
  const starBtns     = Array.from(starsEl.querySelectorAll('.review-star'));

  function paintStars(upTo) {
    starBtns.forEach(s => s.classList.toggle('on', parseInt(s.dataset.v) <= upTo));
  }

  starBtns.forEach(star => {
    const v = parseInt(star.dataset.v);
    star.addEventListener('click', () => {
      reviewRating = v;
      paintStars(v);
      ratingTextEl.textContent = t(`place.reviewRating${v}`, dictI18n);
    });
    star.addEventListener('mouseenter', () => paintStars(v));
    star.addEventListener('mouseleave', () => paintStars(reviewRating));
  });

  // load first page
  loadReviews(true);

  // "load more" button
  document.getElementById('load-more-reviews').addEventListener('click', () => {
    loadReviews(false);
  });

  // submit
  const submitBtn  = document.getElementById('review-submit-btn');
  const statusEl   = document.getElementById('review-form-status');
  const authHintEl = document.getElementById('review-auth-hint');
  submitBtn.textContent = t('place.reviewSubmit', dictI18n);

  onAuthStateChanged(auth, user => {
    currentUser = user || null;
    submitBtn.disabled = !currentUser;
    authHintEl.textContent = currentUser
      ? t('place.reviewAuthOk', dictI18n)
      : t('place.reviewLoginRequired', dictI18n);
  });

  submitBtn.addEventListener('click', async () => {
    const comment = document.getElementById('review-comment').value.trim();

    if (!currentUser) {
      setReviewStatus(t('place.reviewLoginRequired', dictI18n), 'error');
      return;
    }
    if (!reviewRating) {
      setReviewStatus(t('place.reviewRatingRequired', dictI18n), 'error');
      return;
    }
    if (!comment) {
      setReviewStatus(t('place.reviewCommentRequired', dictI18n), 'error');
      document.getElementById('review-comment').focus();
      return;
    }

    const rl = checkRateLimit('place_review', REVIEW_RATE_LIMIT_MS);
    if (!rl.allowed) {
      setReviewStatus(`${t('place.reviewRateLimitPrefix', dictI18n)} ${formatRemaining(rl.remainingMs)}.`, 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t('place.reviewSending', dictI18n);
    setReviewStatus('');

    try {
      await addPlaceReview(placeId, currentUser, reviewRating, comment);
      setReviewStatus(t('place.reviewSent', dictI18n), 'success');
      submitBtn.textContent = t('place.reviewSubmit', dictI18n);
      // reset form
      document.getElementById('review-comment').value = '';
      reviewRating = 0;
      paintStars(0);
      ratingTextEl.textContent = '';
      // reload list from scratch
      lastDoc  = null;
      hasMore  = false;
      loadReviews(true);
    } catch (err) {
      console.error(err);
      setReviewStatus(t('place.reviewSendError', dictI18n), 'error');
      showToast(t('place.reviewSendError', dictI18n), 'error');
    } finally {
      submitBtn.disabled = false;
      if (submitBtn.textContent !== t('place.reviewSubmit', dictI18n)) {
        submitBtn.textContent = t('place.reviewSubmit', dictI18n);
      }
    }
  });

  function setReviewStatus(text, type = '') {
    statusEl.textContent = text;
    statusEl.className   = `form-status${type ? ' ' + type : ''}`;
  }

  async function loadReviews(reset) {
    if (reset) {
      lastDoc = null;
      hasMore = false;
      document.getElementById('reviews-list').innerHTML = '';
    }

    try {
      const result = await getPlaceReviews(placeId, reset ? null : lastDoc);
      lastDoc  = result.lastDoc;
      hasMore  = result.hasMore;
      renderReviews(result.docs, reset);
      document.getElementById('load-more-reviews')
        .classList.toggle('hidden', !hasMore);
    } catch (err) {
      console.error(err);
      showToast(t('place.reviewsLoadError', dictI18n), 'error');
    }
  }

  function renderReviews(docs, reset) {
    const listEl = document.getElementById('reviews-list');

    if (reset && !docs.length) {
      listEl.innerHTML = `<p class="reviews-empty">${esc(t('place.reviewsNone', dictI18n))}</p>`;
      return;
    }

    const html = docs.map(r => {
      const initial = esc((r.name || '?').charAt(0));
      const stars   = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
      const dateStr = r.createdAt?.toDate
        ? r.createdAt.toDate().toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric'
          })
        : '';
      return `
        <div class="review-card">
          <div class="review-card__header">
            <div class="review-card__avatar">${initial}</div>
            <div>
              <div class="review-card__name">${esc(r.name || '')}</div>
              <div class="review-card__date">${esc(dateStr)}</div>
            </div>
            <div class="review-card__stars">${stars}</div>
          </div>
          <div class="review-card__comment">${esc(r.comment || '')}</div>
        </div>
      `;
    }).join('');

    listEl.insertAdjacentHTML('beforeend', html);
  }
}

// ── helpers ───────────────────────────────────────────────────────────────

function showError() {
  skeletonEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
