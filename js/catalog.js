import { initNav } from './nav.js';
import { getPlaces } from './places.js';
import { showToast, showSkeletons, markActiveNav } from './utils.js';
import { pickPlaceDateLabel } from './placeDate.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, pickI18n, t } from './i18n.js';

initNav('');
markActiveNav();
const lang = getLang();
let dictI18n = null;

const grid = document.getElementById('grid');
const countEl = document.getElementById('count');
const search = document.getElementById('search');
const errorEl = document.getElementById('error');
const chipsEl = document.getElementById('chips');
const sentinelEl = document.getElementById('catalog-sentinel');

// filters UI
const fHas3d = document.getElementById('f-has3d');
const fHasPhotos = document.getElementById('f-hasphotos');
const fCity = document.getElementById('f-city');
const fTags = document.getElementById('f-tags');
const fDateFrom = document.getElementById('f-datefrom');
const fDateTo = document.getElementById('f-dateto');
const sortEl = document.getElementById('sort');

let allPlaces = [];
let dict = {
  sort: {
    updated_desc: 'Обновлённые (новые → старые)',
    updated_asc: 'Обновлённые (старые → новые)',
    created_desc: 'Создание (новые → старые)',
    created_asc: 'Создание (старые → новые)',
    name_asc: 'Название (А→Я)',
    name_desc: 'Название (Я→А)'
  }
};

const DEFAULT_STATE = {
  q: '',
  has3d: false,
  hasphotos: false,
  city: '',
  tags: [],
  dateFrom: null,
  dateTo: null,
  sort: 'updated_desc'
};

let state = { ...DEFAULT_STATE };
let searchDebounce = null;
let cardRevealObserver = null;
let paginationObserver = null;
const PAGE_SIZE = 24;
let visibleCount = PAGE_SIZE;
let latestView = [];

// ── boot ──────────────────────────────────────────────────────────────────

showSkeletons(grid, 12);

try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  syncSortOptionLabels();

  allPlaces = await getPlaces();

  hydrateFiltersFromData(allPlaces);

  state = parseStateFromUrl();
  applyStateToUi(state);
  applyState();

  // back/forward
  window.addEventListener('popstate', () => {
    state = parseStateFromUrl();
    applyStateToUi(state);
    applyState({ push: false });
  });

  // UI -> state events
  wireUiEvents();
} catch (err) {
  console.error(err);
  grid.innerHTML = '';
  errorEl.classList.remove('hidden');
  showToast('Не удалось загрузить места', 'error');
}

function syncSortOptionLabels() {
  if (!sortEl) return;
  const map = {
    updated_desc: 'catalog.sortUpdatedDesc',
    updated_asc: 'catalog.sortUpdatedAsc',
    created_desc: 'catalog.sortCreatedDesc',
    created_asc: 'catalog.sortCreatedAsc',
    name_asc: 'catalog.sortNameAsc',
    name_desc: 'catalog.sortNameDesc'
  };
  Array.from(sortEl.options).forEach(opt => {
    const key = map[opt.value];
    if (key) opt.textContent = t(key, dictI18n);
  });
}

// ── render ────────────────────────────────────────────────────────────────

function render(places) {
  latestView = places.slice();
  countEl.textContent = places.length
    ? (lang === 'en'
        ? `${places.length} ${places.length === 1 ? 'place' : 'places'}`
        : `${places.length} ${plural(places.length, 'место', 'места', 'мест')}`)
    : '';

  if (!places.length) {
    const hasActiveFilters = isStateDirty(state);
    const emptyTitle = hasActiveFilters ? t('catalog.emptyTitle', dictI18n) : t('catalog.emptyDbTitle', dictI18n);
    const emptyText = hasActiveFilters ? t('catalog.emptyText', dictI18n) : t('catalog.emptyDbText', dictI18n);
    const emptyAction = hasActiveFilters
      ? `<button class="btn btn--outline btn--sm" id="empty-reset-btn">${esc(t('catalog.chipReset', dictI18n))}</button>`
      : `<a class="btn btn--outline btn--sm" href="feedback.html">${esc(t('nav.feedback', dictI18n))}</a>`;
    grid.innerHTML = `
      <div class="state-empty" style="grid-column:1/-1">
        <h3>${esc(emptyTitle)}</h3>
        <p>${esc(emptyText)}</p>
        <div style="margin-top:12px">${emptyAction}</div>
      </div>`;
    const resetBtn = document.getElementById('empty-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state = { ...DEFAULT_STATE };
        applyStateToUi(state);
        applyState();
      });
    }
    return;
  }

  const shown = places.slice(0, visibleCount);
  const hasMore = places.length > shown.length;
  grid.innerHTML = shown.map((p, i) => placeCard(p, i)).join('');
  renderSentinel(hasMore, shown.length, places.length);
  observeDynamicReveals();
}

function applyState({ push = true } = {}) {
  visibleCount = PAGE_SIZE;
  const view = computeView(allPlaces, state);
  render(view);
  renderChips(state);
  updateUrlFromState(state, { push });
}

function computeView(places, s) {
  const q = (s.q || '').trim().toLowerCase();
  const tagSet = new Set((s.tags || []).map(t => String(t)));

  let out = places.filter(p => {
    if (s.has3d && !(p.modelUrl || p.sketchfabUrl || p.has3D)) return false;
    if (s.hasphotos && !((p.photos && p.photos.length) || p.hasPhotos)) return false;

    if (s.city) {
      const city = extractCity(p.location?.address || '');
      if (city !== s.city) return false;
    }

    if (tagSet.size) {
      const tags = Array.isArray(p.tags) ? p.tags.map(String) : [];
      // AND semantics: all selected tags must be present
      for (const t of tagSet) {
        if (!tags.includes(t)) return false;
      }
    }

    if (s.dateFrom != null || s.dateTo != null) {
      const y = Number(p?.createdOn?.year);
      if (!Number.isFinite(y)) return false;
      if (s.dateFrom != null && y < s.dateFrom) return false;
      if (s.dateTo != null && y > s.dateTo) return false;
    }

    if (q) {
      const hay = [
        (pickI18n(p, lang).name || p.name || ''),
        (pickI18n(p, lang).address || p.location?.address || ''),
        (pickI18n(p, lang).author || p.author || ''),
        ...(Array.isArray(p.tags) ? p.tags : [])
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  out = sortPlaces(out, s.sort);
  return out;
}

function sortPlaces(arr, sort) {
  const a = arr.slice();
  const getName = (p) => String(p?.name || '').toLowerCase();
  const getUpdated = (p) => Number(p?.updatedAt?.seconds ?? 0);
  const getCreatedKey = (p) => Number(p?.createdOn?.sortKey ?? 0);
  const hasCreated = (p) => Number.isFinite(Number(p?.createdOn?.sortKey));

  switch (sort) {
    case 'updated_asc':
      a.sort((x, y) => getUpdated(x) - getUpdated(y) || getName(x).localeCompare(getName(y), 'ru'));
      break;
    case 'created_asc':
      a.sort((x, y) => {
        const xHas = hasCreated(x);
        const yHas = hasCreated(y);
        if (xHas !== yHas) return xHas ? -1 : 1; // missing dates always at end
        return getCreatedKey(x) - getCreatedKey(y) || getName(x).localeCompare(getName(y), 'ru');
      });
      break;
    case 'created_desc':
      a.sort((x, y) => {
        const xHas = hasCreated(x);
        const yHas = hasCreated(y);
        if (xHas !== yHas) return xHas ? -1 : 1; // missing dates always at end
        return getCreatedKey(y) - getCreatedKey(x) || getName(x).localeCompare(getName(y), 'ru');
      });
      break;
    case 'name_desc':
      a.sort((x, y) => getName(y).localeCompare(getName(x), 'ru'));
      break;
    case 'name_asc':
      a.sort((x, y) => getName(x).localeCompare(getName(y), 'ru'));
      break;
    case 'updated_desc':
    default:
      a.sort((x, y) => getUpdated(y) - getUpdated(x) || getName(x).localeCompare(getName(y), 'ru'));
      break;
  }
  return a;
}

// ── URL state ─────────────────────────────────────────────────────────────

function parseStateFromUrl() {
  const sp = new URLSearchParams(location.search);
  const out = { ...DEFAULT_STATE };

  out.q = sp.get('q') || '';
  out.has3d = sp.get('has3d') === 'true';
  out.hasphotos = sp.get('hasphotos') === 'true';
  out.city = sp.get('city') || '';

  const tagsRaw = sp.get('tags');
  out.tags = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  out.dateFrom = parseIntOrNull(sp.get('dateFrom'));
  out.dateTo = parseIntOrNull(sp.get('dateTo'));

  const sort = sp.get('sort');
  out.sort = sort && dict.sort[sort] ? sort : DEFAULT_STATE.sort;

  return out;
}

function updateUrlFromState(s, { push } = { push: true }) {
  const url = new URL(location.href);
  const sp = url.searchParams;

  setOrDelete(sp, 'q', s.q);
  setOrDelete(sp, 'has3d', s.has3d ? 'true' : '');
  setOrDelete(sp, 'hasphotos', s.hasphotos ? 'true' : '');
  setOrDelete(sp, 'city', s.city);
  setOrDelete(sp, 'tags', (s.tags || []).length ? (s.tags || []).join(',') : '');
  setOrDelete(sp, 'dateFrom', s.dateFrom != null ? String(s.dateFrom) : '');
  setOrDelete(sp, 'dateTo', s.dateTo != null ? String(s.dateTo) : '');
  setOrDelete(sp, 'sort', s.sort && s.sort !== DEFAULT_STATE.sort ? s.sort : '');

  if (push) history.pushState({}, '', url.toString());
  else history.replaceState({}, '', url.toString());
}

function setOrDelete(sp, key, value) {
  if (value == null || value === '') sp.delete(key);
  else sp.set(key, value);
}

function parseIntOrNull(v) {
  if (v == null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

// ── UI sync ───────────────────────────────────────────────────────────────

function applyStateToUi(s) {
  if (search) search.value = s.q || '';
  if (fHas3d) fHas3d.checked = !!s.has3d;
  if (fHasPhotos) fHasPhotos.checked = !!s.hasphotos;
  if (fCity) fCity.value = s.city || '';
  if (fDateFrom) fDateFrom.value = s.dateFrom != null ? String(s.dateFrom) : '';
  if (fDateTo) fDateTo.value = s.dateTo != null ? String(s.dateTo) : '';
  if (sortEl) sortEl.value = s.sort || DEFAULT_STATE.sort;

  if (fTags) {
    const want = new Set(s.tags || []);
    Array.from(fTags.options).forEach(o => { o.selected = want.has(o.value); });
  }
}

function wireUiEvents() {
  search.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.q = search.value.trim();
      applyState();
    }, 200);
  });

  fHas3d.addEventListener('change', () => { state.has3d = fHas3d.checked; applyState(); });
  fHasPhotos.addEventListener('change', () => { state.hasphotos = fHasPhotos.checked; applyState(); });
  fCity.addEventListener('change', () => { state.city = fCity.value; applyState(); });
  sortEl.addEventListener('change', () => { state.sort = sortEl.value; applyState(); });

  fDateFrom.addEventListener('input', () => {
    state.dateFrom = parseIntOrNull(fDateFrom.value);
    applyState();
  });
  fDateTo.addEventListener('input', () => {
    state.dateTo = parseIntOrNull(fDateTo.value);
    applyState();
  });

  fTags.addEventListener('change', () => {
    state.tags = Array.from(fTags.selectedOptions).map(o => o.value);
    applyState();
  });
}

function renderChips(s) {
  if (!chipsEl) return;

  const chips = [];
  if (s.q) chips.push(chipUi(`${t('catalog.chipSearch', dictI18n)}: ${s.q}`, () => { state.q = ''; applyStateToUi(state); applyState(); }));
  if (s.has3d) chips.push(chipUi(t('catalog.chip3d', dictI18n), () => { state.has3d = false; applyStateToUi(state); applyState(); }));
  if (s.hasphotos) chips.push(chipUi(t('catalog.chipPhotos', dictI18n), () => { state.hasphotos = false; applyStateToUi(state); applyState(); }));
  if (s.city) chips.push(chipUi(`${t('catalog.chipCity', dictI18n)}: ${s.city}`, () => { state.city = ''; applyStateToUi(state); applyState(); }));
  if (s.dateFrom != null || s.dateTo != null) {
    const label = `${t('catalog.chipYears', dictI18n)}: ${s.dateFrom ?? '…'}–${s.dateTo ?? '…'}`;
    chips.push(chipUi(label, () => { state.dateFrom = null; state.dateTo = null; applyStateToUi(state); applyState(); }));
  }
  (s.tags || []).forEach(tagValue => {
    chips.push(chipUi(`${t('catalog.chipTag', dictI18n)}: ${tagValue}`, () => {
      state.tags = (state.tags || []).filter(x => x !== tagValue);
      applyStateToUi(state);
      applyState();
    }));
  });

  if (chips.length) {
    chips.unshift(chipUi(t('catalog.chipReset', dictI18n), () => {
      state = { ...DEFAULT_STATE };
      applyStateToUi(state);
      applyState();
    }, { strong: true }));
  }

  chipsEl.innerHTML = '';
  if (!chips.length) return;

  chips.forEach(({ el }) => chipsEl.appendChild(el));
}

function chipUi(label, onRemove, { strong = false } = {}) {
  const el = document.createElement('span');
  el.className = 'chip';
  el.innerHTML = `
    <span ${strong ? 'style="font-weight:700"' : ''}>${esc(label)}</span>
    <button type="button" aria-label="Удалить фильтр">×</button>
  `;
  el.querySelector('button').addEventListener('click', (e) => {
    e.preventDefault();
    onRemove();
  });
  return { el };
}

function hydrateFiltersFromData(places) {
  // city list
  const cities = new Set();
  const tags = new Set();

  places.forEach(p => {
    const city = extractCity(p.location?.address || '');
    if (city) cities.add(city);
    (Array.isArray(p.tags) ? p.tags : []).forEach(t => tags.add(String(t)));
  });

  if (fCity) {
    const current = fCity.value;
    const opts = Array.from(cities).sort((a, b) => a.localeCompare(b, 'ru'));
    fCity.innerHTML = `<option value="">${esc(t('catalog.any', dictI18n))}</option>` + opts.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join('');
    fCity.value = current;
  }

  if (fTags) {
    const currentSel = new Set(Array.from(fTags.selectedOptions || []).map(o => o.value));
    const opts = Array.from(tags).sort((a, b) => a.localeCompare(b, 'ru'));
    fTags.innerHTML = opts.map(t => `<option value="${escAttr(t)}"${currentSel.has(t) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  }
}

function extractCity(address) {
  const a = String(address || '').trim();
  if (!a) return '';
  const parts = a.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[0]; // "Минск, ..." — берём первую часть
  return parts[0] || '';
}

function placeCard(p, idx) {
  const i18nData = pickI18n(p, lang);
  const name = i18nData.name || p.name || '';
  const author = i18nData.author || p.author || '';
  const address = i18nData.address || p.location?.address || '';
  const has3d = p.modelUrl || p.sketchfabUrl || p.has3D;
  const photosCount = Array.isArray(p.photos) ? p.photos.length : 0;
  const photoBadge = photosCount > 1 ? `📷 ${photosCount}` : (photosCount === 1 ? '📷' : '');
  const badges = `
    <div class="card__badges">
      ${has3d ? '<span class="card__badge card__badge--3d">3D</span>' : ''}
      ${photoBadge ? `<span class="card__badge card__badge--photo">${esc(photoBadge)}</span>` : ''}
    </div>
  `;
  const img = p.photos?.[0]
    ? `<div class="card__img-wrap">
        <img class="card__img" src="${escAttr(p.photos[0])}" alt="${escAttr(name)}" loading="lazy" />
        ${badges}
       </div>`
    : `<div class="card__img-wrap">
        <div class="card__img--placeholder">нет фото</div>
        ${badges}
       </div>`;

  const loc = address
    ? `<span class="card__location">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        ${esc(address)}
      </span>`
    : '';

  const metaItems = [];
  const dateLabel = pickPlaceDateLabel(p);
  if (dateLabel) metaItems.push(chip('calendar', dateLabel));
  if (author) metaItems.push(chip('user', author));
  if (p.tags?.length) {
    p.tags.slice(0, 2).forEach(t => metaItems.push(chip('tag', t)));
  }
  const meta = metaItems.length ? `<div class="card__meta">${metaItems.join('')}</div>` : '';

  return `
    <article class="card reveal reveal--stagger" style="--i:${idx % 8}" onclick="location.href='place.html?id=${escAttr(p.id)}'">
      ${img}
      <div class="card__body">
        <h3 class="card__title">${esc(name)}</h3>
        ${loc}
        ${meta}
        <span class="card__btn">
          ${esc(t('catalog.details', dictI18n))}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </span>
      </div>
    </article>`;
}

function chip(kind, value) {
  const icon = kind === 'calendar'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
       </svg>`
    : kind === 'user'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
       </svg>`;
  return `<span class="card__meta-item">${icon}${esc(value)}</span>`;
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return esc(str).replace(/'/g, '&#39;');
}

function plural(n, one, few, many) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function isStateDirty(s) {
  return !!(
    (s.q || '').trim() ||
    s.has3d ||
    s.hasphotos ||
    (s.city || '').trim() ||
    (Array.isArray(s.tags) && s.tags.length) ||
    s.dateFrom != null ||
    s.dateTo != null ||
    (s.sort && s.sort !== DEFAULT_STATE.sort)
  );
}

function observeDynamicReveals() {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodes = Array.from(grid.querySelectorAll('.reveal')).filter((el) => !el.classList.contains('is-in'));
  if (!nodes.length) return;
  if (reduce) {
    nodes.forEach((el) => el.classList.add('is-in'));
    return;
  }
  if (!cardRevealObserver) {
    cardRevealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          cardRevealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  }
  nodes.forEach((el, i) => {
    el.style.setProperty('--i', String(i % 8));
    cardRevealObserver.observe(el);
  });
}

function renderSentinel(hasMore, shown, total) {
  if (!sentinelEl) return;
  if (!hasMore) {
    sentinelEl.classList.add('hidden');
    sentinelEl.textContent = '';
    if (paginationObserver) paginationObserver.disconnect();
    return;
  }
  sentinelEl.classList.remove('hidden');
  sentinelEl.textContent = lang === 'en'
    ? `Showing ${shown} of ${total}. Scroll to load more…`
    : `Показано ${shown} из ${total}. Прокрутите ниже, чтобы загрузить ещё…`;

  if (!paginationObserver) {
    paginationObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (visibleCount >= latestView.length) return;
        visibleCount = Math.min(visibleCount + PAGE_SIZE, latestView.length);
        render(latestView);
      });
    }, { root: null, threshold: 0.1, rootMargin: '200px 0px 200px 0px' });
  } else {
    paginationObserver.disconnect();
  }
  paginationObserver.observe(sentinelEl);
}

