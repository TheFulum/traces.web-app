import { initNav } from '../shared/nav.js';
import { getPlaces } from '../shared/places.js';
import { showToast, showSkeletons, markActiveNav } from '../shared/utils.js';
import { db } from '../shared/firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { pickPlaceDateLabel } from '../shared/placeDate.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, pickI18n, t } from '../shared/i18n.js';
initNav('');

markActiveNav();

const errorEl = document.getElementById('error');
const highlightsGrid = document.getElementById('highlights-grid');
const lang = getLang();
let dict = null;

let allPlaces = [];

// ── boot ──────────────────────────────────────────────────────────────────

if (highlightsGrid) showSkeletons(highlightsGrid, 6);

try {
  dict = await loadDict(lang);
  applyDict(dict);
  applyLanguageSeo(lang);
  await applyHomeConfig();
  allPlaces = await getPlaces();
  updateStats(allPlaces);
  renderHighlights(allPlaces);
} catch (err) {
  console.error(err);
  if (highlightsGrid) highlightsGrid.innerHTML = '';
  errorEl.classList.remove('hidden');
  showToast('Не удалось загрузить места', 'error');
}

// ── home config ────────────────────────────────────────────────────────────

async function applyHomeConfig() {
  const elBg = document.getElementById('hero-bg');
  const elEyebrow = document.getElementById('hero-eyebrow');
  const elTitle = document.getElementById('hero-title');
  const elSub = document.getElementById('hero-subtitle');
  const elIntro = document.getElementById('intro-text');
  const collectionsGrid = document.getElementById('collections-grid');
  const teaserMapImage = document.getElementById('teaser-map-image');
  const teaserGuideImage = document.getElementById('teaser-guide-image');
  const footerApi = document.getElementById('footer-api-link');
  const footerGithub = document.getElementById('footer-github-link');

  // defaults (если config/home не задан)
  const defaults = {
    heroImage: '',
    heroEyebrow: { ru: t('home.heroEyebrow', dict), en: t('home.heroEyebrow', dict) },
    heroTitle: { ru: t('home.heroTitle', dict), en: t('home.heroTitle', dict) },
    heroSubtitle: { ru: t('home.heroSubtitle', dict), en: t('home.heroSubtitle', dict) },
    introText: { ru: t('home.aboutText', dict), en: t('home.aboutText', dict) },
    collections: [],
    teasers: {
      mapImage: 'https://images.unsplash.com/photo-1478476868527-002ae3f3e159?auto=format&fit=crop&w=1600&q=80',
      guideImage: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=1600&q=80'
    }
  };

  let cfg = null;
  try {
    const snap = await getDoc(doc(db, 'config', 'home'));
    if (snap.exists()) cfg = snap.data();
  } catch {
    // ignore: остаёмся на defaults
  }
  const merged = { ...defaults, ...(cfg || {}) };
  const heroEyebrow = pickLocalized(merged.heroEyebrow, lang, t('home.heroEyebrow', dict));
  const heroTitle = pickLocalized(merged.heroTitle, lang, t('home.heroTitle', dict));
  const heroSubtitle = pickLocalized(merged.heroSubtitle, lang, t('home.heroSubtitle', dict));
  const introText = pickLocalized(merged.introText, lang, t('home.aboutText', dict));

  if (elBg && merged.heroImage) {
    elBg.style.backgroundImage = `url("${merged.heroImage}")`;
  }
  if (elEyebrow) elEyebrow.textContent = heroEyebrow;
  if (elTitle) elTitle.innerHTML = heroTitle;
  if (elSub) elSub.textContent = heroSubtitle;
  if (elIntro) elIntro.textContent = introText;

  if (collectionsGrid) {
    const cols = Array.isArray(merged.collections) ? merged.collections : [];
    collectionsGrid.innerHTML = cols.length
      ? cols.slice(0, 6).map(collectionCard).join('')
      : defaultCollections().map(collectionCard).join('');
  }
  const teaserMap = String(merged?.teasers?.mapImage || defaults.teasers.mapImage || '').trim();
  const teaserGuide = String(merged?.teasers?.guideImage || defaults.teasers.guideImage || '').trim();
  if (teaserMapImage && teaserMap) teaserMapImage.style.backgroundImage = `url("${teaserMap}")`;
  if (teaserGuideImage && teaserGuide) teaserGuideImage.style.backgroundImage = `url("${teaserGuide}")`;

  if (footerApi) {
    const enabled = merged?.links?.apiEnabled === true;
    footerApi.classList.toggle('hidden', !enabled);
  }
  if (footerGithub) {
    const githubUrl = String(merged?.links?.github || '').trim();
    const enabled = !!githubUrl;
    footerGithub.classList.toggle('hidden', !enabled);
    if (enabled) footerGithub.href = githubUrl;
  }
}

function defaultCollections() {
  return [
    {
      title: lang === 'en' ? 'With 3D model' : 'С 3D-моделью',
      description: lang === 'en'
        ? 'Places you can explore in 3D directly in the browser'
        : 'Места, которые можно рассмотреть в объёме прямо в браузере',
      cover: '',
      filter: 'has3d=true'
    },
    {
      title: lang === 'en' ? 'Memory of war' : 'Память войны',
      description: lang === 'en'
        ? 'Memorials and places related to events of the 20th century'
        : 'Мемориалы и места, связанные с событиями XX века',
      cover: '',
      filter: 'tags=ВОВ,Мемориал'
    },
    {
      title: lang === 'en' ? 'City sculptures' : 'Скульптуры города',
      description: lang === 'en'
        ? 'Curated set of city sculptures and monuments'
        : 'Подборка городских скульптур и памятников',
      cover: '',
      filter: 'tags=Скульптура'
    }
  ];
}

function collectionCard(c) {
  const title = esc(pickLocalized(c?.title, lang, lang === 'en' ? 'Collection' : 'Подборка'));
  const desc = esc(pickLocalized(c?.description, lang, ''));
  const cover = c?.cover ? String(c.cover) : '';
  const href = `pages/catalog.html?${String(c?.filter || '').replace(/^\?/, '')}`;
  const bgStyle = cover ? `style="background-image:url('${escAttr(cover)}')"` : '';
  return `
    <a class="home-collection reveal reveal--stagger" href="${escAttr(href)}">
      <div class="home-collection__bg" ${bgStyle} aria-hidden="true"></div>
      <div class="home-collection__overlay" aria-hidden="true"></div>
      <div class="home-collection__body">
        <div class="home-collection__title">${title}</div>
        <div class="home-collection__meta">${desc}</div>
        <div class="home-collection__cta">
          ${esc(lang === 'en' ? 'Open' : 'Открыть')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>
      </div>
    </a>
  `;
}

function placeCard(p) {
  const i18nData = pickI18n(p, lang);
  const name = i18nData.name || p.name || '';
  const author = i18nData.author || p.author || '';
  const address = i18nData.address || p.location?.address || '';
  const has3d = p.modelUrl || p.sketchfabUrl;
  const img = p.photos?.[0]
    ? `<div class="card__img-wrap">
        <img class="card__img" src="${esc(p.photos[0])}" alt="${esc(name)}" loading="lazy" />
        ${has3d ? '<span class="card__badge">3D</span>' : ''}
       </div>`
    : `<div class="card__img-wrap">
        <div class="card__img--placeholder">нет фото</div>
        ${has3d ? '<span class="card__badge">3D</span>' : ''}
       </div>`;

  const loc = address
    ? `<span class="card__location">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        ${esc(address)}
      </span>`
    : '';

  // Build meta items (date, author, first tag)
  const metaItems = [];
  const dateLabel = pickPlaceDateLabel(p);
  if (dateLabel) {
    metaItems.push(`
      <span class="card__meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        ${esc(dateLabel)}
      </span>`);
  }
  if (author) {
    metaItems.push(`
      <span class="card__meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        ${esc(author)}
      </span>`);
  }
  const pTags = pickI18n(p, lang)?.tags || p.tags || [];
  if (pTags.length) {
    // Show first 2 tags max
    const showTags = pTags.slice(0, 2);
    showTags.forEach(t => {
      metaItems.push(`
        <span class="card__meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          ${esc(t)}
        </span>`);
    });
  }

  const meta = metaItems.length
    ? `<div class="card__meta">${metaItems.join('')}</div>`
    : '';

  return `
    <article class="card" onclick="location.href='pages/place.html?id=${p.id}'">
      ${img}
      <div class="card__body">
        <h3 class="card__title">${esc(name)}</h3>
        ${loc}
        ${meta}
        <span class="card__btn">
          ${esc(t('catalog.details', dict))}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </span>
      </div>
    </article>`;
}

// ── stats ─────────────────────────────────────────────────────────────────

function updateStats(places) {
  const statPlaces = document.getElementById('stat-places');
  const statCities = document.getElementById('stat-cities');
  const statYears  = document.getElementById('stat-years');
  if (statPlaces) animateCounter(statPlaces, places.length);

  if (statCities) {
    // Count unique cities from addresses
    const cities = new Set();
    places.forEach(p => {
      const addr = p.location?.address || '';
      // Try to extract city (usually after first comma or as the main part)
      const parts = addr.split(',');
      if (parts.length >= 2) {
        cities.add(parts[parts.length - 2].trim());
      } else if (parts.length === 1 && parts[0].trim()) {
        cities.add(parts[0].trim());
      }
    });
    if (cities.size) animateCounter(statCities, cities.size);
    else statCities.textContent = '—';
  }

  if (statYears) {
    const years = places
      .map(p => p?.createdOn?.year)
      .filter(y => Number.isFinite(y));
    if (!years.length) {
      statYears.textContent = '—';
    } else {
      const min = Math.min(...years);
      const max = Math.max(...years);
      statYears.textContent = min === max ? String(min) : `${min}–${max}`;
    }
  }
}

// ── hero motion ────────────────────────────────────────────────────────────
initHeroMotion();

function initHeroMotion() {
  const hero = document.querySelector('.home-hero');
  const heroBg = document.getElementById('hero-bg');
  if (!hero || !heroBg) return;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    requestAnimationFrame(() => hero.classList.add('is-ready'));
  } else {
    hero.classList.add('is-ready');
  }

  if (reduce || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)) return;

  const onScroll = () => {
    const rect = hero.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (0 - rect.top) / Math.max(1, rect.height)));
    const shift = progress * 24;
    heroBg.style.transform = `translate3d(0, ${shift}px, 0) scale(1.03)`;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ── highlights ────────────────────────────────────────────────────────────

function renderHighlights(places) {
  if (!highlightsGrid) return;

  if (!places.length) {
    highlightsGrid.innerHTML = `
      <div class="state-empty" style="grid-column:1/-1">
        <h3>${esc(t('home.emptyTitle', dict))}</h3>
        <p>${esc(t('home.emptyText', dict))}</p>
      </div>`;
    return;
  }

  const featured = places.filter(p => p?.featured);
  const pick = featured.length
    ? featured
        .slice()
        .sort((a, b) => {
          const ao = Number.isFinite(a?.featuredOrder) ? a.featuredOrder : 999999;
          const bo = Number.isFinite(b?.featuredOrder) ? b.featuredOrder : 999999;
          if (ao !== bo) return ao - bo;
          const at = Number(a?.updatedAt?.seconds ?? 0);
          const bt = Number(b?.updatedAt?.seconds ?? 0);
          return bt - at;
        })
        .slice(0, 8)
    : places.slice(0, 8);
  highlightsGrid.innerHTML = pick.map((p, i) => placeCardWithReveal(p, i)).join('');
}

function placeCardWithReveal(p, i) {
  return placeCard(p).replace('class="card"', `class="card reveal reveal--stagger" style="--i:${i}"`);
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return esc(str).replace(/'/g, '&#39;');
}

function pickLocalized(value, targetLang, fallback = '') {
  if (value && typeof value === 'object') {
    const exact = String(value[targetLang] || '').trim();
    if (exact) return exact;
    const ru = String(value.ru || '').trim();
    if (ru) return ru;
    const en = String(value.en || '').trim();
    if (en) return en;
  }
  const str = String(value || '').trim();
  if (str) return str;
  return fallback;
}

function animateCounter(el, target) {
  const finalValue = Number(target);
  if (!Number.isFinite(finalValue)) {
    el.textContent = String(target);
    return;
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = String(finalValue);
    return;
  }
  const duration = 800;
  const startAt = performance.now();
  const startValue = 0;
  function tick(now) {
    const p = Math.min(1, (now - startAt) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = Math.round(startValue + (finalValue - startValue) * eased);
    el.textContent = String(current);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
