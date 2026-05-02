import { initNav } from '../shared/nav.js';
import { getPlaces } from '../shared/places.js';
import { showToast, getParam } from '../shared/utils.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, pickI18n, t } from '../shared/i18n.js';
import { fetchLocalizedLibertyStyle } from '../shared/map-liberty-style.js';
import { pickPlaceDateLabel } from '../shared/placeDate.js';
import { addToTrip, isInTrip } from './trips.js';

// Init nav (was missing before — nav was hardcoded in HTML)
initNav('../');
const lang = getLang();
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  document.title = `${t('map.pageTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;
} catch {}

// ── map init ──────────────────────────────────────────────────────────────
const loadingEl = document.getElementById('map-loading');
const L = window.L;
if (!L || !document.getElementById('map')) {
  loadingEl?.classList.add('hidden');
  showToast(t('common.loadingError', dictI18n), 'error');
  throw new Error('Leaflet is not available or map container missing');
}

const map = L.map('map', {
  center: [53.9, 27.5667], // Minsk default (Belarus)
  zoom: 7,
  zoomControl: true,
  attributionControl: false // disable default attribution completely
});

await initializeBaseMap();

// ── custom marker icon ────────────────────────────────────────────────────

function makeIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="marker-pin"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32]
  });
}

// ── load places ───────────────────────────────────────────────────────────

let allPlaces   = [];
let markers     = [];
const markerByPlaceId = new Map();

try {
  allPlaces = await withTimeout(getPlaces(), 12000);
  allPlaces.forEach(addMarker);

  // if came from place.html with ?lat=&lng=&id=
  const lat = parseFloat(getParam('lat'));
  const lng = parseFloat(getParam('lng'));
  const id  = getParam('id');

  if (!isNaN(lat) && !isNaN(lng)) {
    map.setView([lat, lng], 14);
    const target = markers.find(m => m.placeId === id);
    if (target) target.marker.openPopup();
  } else if (markers.length) {
    // fit map to all markers
    const group = L.featureGroup(markers.map(m => m.marker));
    map.fitBounds(group.getBounds().pad(0.15));
  }

} catch (err) {
  console.error(err);
  showToast(t('common.loadingError', dictI18n), 'error');
} finally {
  loadingEl.classList.add('hidden');
}

async function initializeBaseMap() {
  try {
    const style = await fetchLocalizedLibertyStyle(lang);
    const canUseMapLibre = window.maplibregl && typeof L.maplibreGL === 'function';
    if (!canUseMapLibre) throw new Error('maplibre_missing');
    L.maplibreGL({
      style,
      maplibreOptions: { attributionControl: false }
    }).addTo(map);
  } catch {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);
  }
  requestAnimationFrame(() => {
    map.invalidateSize(true);
    setTimeout(() => map.invalidateSize(true), 260);
  });
}

// ── add marker ────────────────────────────────────────────────────────────

function addMarker(place) {
  if (!place.location?.lat || !place.location?.lng) return;

  const marker = L.marker([place.location.lat, place.location.lng], {
    icon: makeIcon(),
    title: place.name
  }).addTo(map);

  marker.bindPopup(buildPopup(place), {
    maxWidth: 300,
    className: 'traces-popup'
  });

  markers.push({ marker, placeId: place.id });
  markerByPlaceId.set(String(place.id), marker);
}

// ── popup content ─────────────────────────────────────────────────────────

function buildPopup(place) {
  const i18nData = pickI18n(place, lang);
  const placeName = i18nData.name || place.name || '';
  const placeAddress = i18nData.address || place.location?.address || '';
  const photosCount = Array.isArray(place.photos) ? place.photos.length : 0;
  const has3d = !!(place.modelUrl || place.sketchfabUrl || place.has3D);
  const img = place.photos?.[0]
    ? `<img class="map-popup__img" src="${esc(place.photos[0])}" alt="${esc(placeName)}" />`
    : `<div class="map-popup__img--placeholder">${esc(t('place.noPhotos', dictI18n))}</div>`;
  const badges = `
    <div class="map-popup__badges">
      ${photosCount ? `<span class="map-popup__badge map-popup__badge--photo">📷 ${photosCount}</span>` : ''}
      ${has3d ? '<span class="map-popup__badge">3D</span>' : ''}
    </div>
  `;

  const addr = placeAddress
    ? `<p class="map-popup__addr">${esc(placeAddress)}</p>`
    : '';
  const dateLabel = pickPlaceDateLabel(place);
  const firstTag = Array.isArray(place.tags) && place.tags.length ? String(place.tags[0]) : '';
  const inTrip = isInTrip(place.id);
  const tripLabel = inTrip ? t('map.inTrip', dictI18n) : t('trip.add', dictI18n);
  const meta = (dateLabel || firstTag)
    ? `<div class="map-popup__meta">
        ${dateLabel ? `<span class="map-popup__meta-item">${esc(dateLabel)}</span>` : ''}
        ${firstTag ? `<span class="map-popup__meta-item">${esc(firstTag)}</span>` : ''}
      </div>`
    : '';

  return `
    <div class="map-popup">
      <div class="map-popup__media">
        ${img}
        ${badges}
      </div>
      <div class="map-popup__body">
        <h3 class="map-popup__title">${esc(placeName)}</h3>
        ${meta}
        ${addr}
        <div class="map-popup__actions">
          <button
            type="button"
            class="map-popup__btn map-popup__btn--outline"
            data-map-trip-id="${esc(place.id)}"
            data-map-trip-name="${esc(placeName)}"
            ${inTrip ? 'disabled' : ''}
          >
            ${esc(tripLabel)}
          </button>
          <a href="place.html?id=${place.id}" class="map-popup__btn">
            ${esc(t('map.openPlace', dictI18n))}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
      </div>
    </div>`;
}

// ── "all places" button ──────────────────────────────────────────────────

const listBtn = document.getElementById('list-btn');
if (listBtn) {
  listBtn.addEventListener('click', () => {
    if (!markers.length) {
      showToast(t('map.noLoadedPlaces', dictI18n));
      return;
    }
    const group = L.featureGroup(markers.map(m => m.marker));
    map.fitBounds(group.getBounds().pad(0.15));
    map.closePopup();
  });
}

// ── Nominatim search ──────────────────────────────────────────────────────

const searchInput   = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchClear   = document.getElementById('search-clear');

let searchTimer = null;
let searchMarker = null;
let searchRequestSeq = 0;
let globalResultsCache = [];

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  searchClear.classList.toggle('visible', q.length > 0);

  clearTimeout(searchTimer);
  renderSearchSuggestions(q, [], false);
  if (q.length < 3) return;
  searchTimer = setTimeout(() => runGlobalSearch(q), 420);
});
searchInput.addEventListener('focus', () => {
  renderSearchSuggestions(searchInput.value.trim(), globalResultsCache, false, true);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  closeResults();
  if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
});

document.addEventListener('click', (e) => {
  if (!document.getElementById('map-search').contains(e.target)) closeResults();
});

async function runGlobalSearch(query) {
  const seq = ++searchRequestSeq;
  renderSearchSuggestions(query, [], true);
  try {
    const acceptLang = lang === 'en' ? 'en' : 'ru';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=${encodeURIComponent(acceptLang)}`;
    const res  = await fetch(url, {
      headers: { 'Accept-Language': acceptLang, 'User-Agent': 'TracesOfThePast/1.0' }
    });
    const data = await res.json();
    if (seq !== searchRequestSeq) return;
    globalResultsCache = Array.isArray(data) ? data.slice(0, 5) : [];
    renderSearchSuggestions(query, globalResultsCache, false);
  } catch (err) {
    if (seq !== searchRequestSeq) return;
    globalResultsCache = [];
    renderSearchSuggestions(query, [], false, true, true);
  }
}

function closeResults() {
  searchResults.classList.remove('open');
  searchResults.innerHTML = '';
}

searchResults.addEventListener('click', (e) => {
  const item = e.target.closest('.map-search__result');
  if (!item) return;
  const kind = item.getAttribute('data-kind');
  if (kind === 'local') {
    const placeId = item.getAttribute('data-place-id');
    const marker = markerByPlaceId.get(String(placeId || ''));
    if (marker) {
      map.setView(marker.getLatLng(), 14);
      marker.openPopup();
    }
    searchInput.value = item.getAttribute('data-label') || '';
    closeResults();
    return;
  }
  const lat = parseFloat(item.getAttribute('data-lat') || '');
  const lon = parseFloat(item.getAttribute('data-lon') || '');
  const label = item.getAttribute('data-label') || '';
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  map.setView([lat, lon], 14);
  if (searchMarker) map.removeLayer(searchMarker);
  searchMarker = L.marker([lat, lon], { icon: makeIcon(), title: label }).addTo(map);
  searchInput.value = shortName(label);
  closeResults();
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-map-trip-id]');
  if (!btn) return;
  if (btn.disabled) return;
  const id = btn.getAttribute('data-map-trip-id');
  const name = btn.getAttribute('data-map-trip-name') || '';
  if (!id) return;
  if (isInTrip(id)) {
    btn.textContent = t('map.inTrip', dictI18n);
    btn.disabled = true;
    return;
  }
  addToTrip({ id, name });
  showToast(t('trip.addedToast', dictI18n));
  btn.textContent = t('map.inTrip', dictI18n);
  btn.disabled = true;
});

function renderSearchSuggestions(query, globalItems = [], isGlobalLoading = false, forceOpen = false, hasGlobalError = false) {
  const q = String(query || '').trim().toLowerCase();
  const localItems = getLocalSearchMatches(q);
  const showGlobalBlock = forceOpen || q.length >= 1;
  const globalList = q.length >= 3 ? globalItems : [];
  let html = '';

  if (localItems.length) {
    html += localItems.map((item) => `
      <div class="map-search__result" data-kind="local" data-place-id="${esc(item.id)}" data-label="${esc(item.name)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <div>
          <div class="map-search__result-name">
            ${esc(item.name)}
            <span class="map-search__result-type">${esc(t('map.resultSite', dictI18n))}</span>
          </div>
          <div class="map-search__result-addr">${esc(item.address)}</div>
        </div>
      </div>
    `).join('');
  } else if (q.length >= 1) {
    html += `<p class="map-search__msg">${esc(t('map.siteNoMatches', dictI18n))}</p>`;
  } else {
    html += `<p class="map-search__msg">${esc(t('map.siteSuggestionsHint', dictI18n))}</p>`;
  }

  if (showGlobalBlock) {
    html += `<div class="map-search__divider">${esc(t('map.globalSearchTitle', dictI18n))}</div>`;
    if (isGlobalLoading) {
      html += `<p class="map-search__msg">${esc(t('map.searching', dictI18n))}</p>`;
    } else if (hasGlobalError) {
      html += `<p class="map-search__msg">${esc(t('map.searchError', dictI18n))}</p>`;
    } else if (q.length < 3) {
      html += `<p class="map-search__msg">${esc(t('map.globalTypeMore', dictI18n))}</p>`;
    } else if (!globalList.length) {
      html += `<p class="map-search__msg">${esc(t('map.nothingFound', dictI18n))}</p>`;
    } else {
      html += globalList.map((item) => `
        <div class="map-search__result" data-kind="global" data-lat="${esc(String(item.lat || ''))}" data-lon="${esc(String(item.lon || ''))}" data-label="${esc(item.display_name || '')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <div>
            <div class="map-search__result-name">
              ${esc(shortName(item.display_name || ''))}
              <span class="map-search__result-type">${esc(t('map.resultGlobal', dictI18n))}</span>
            </div>
            <div class="map-search__result-addr">${esc(item.display_name || '')}</div>
          </div>
        </div>
      `).join('');
    }
  }

  if (!html.trim()) {
    closeResults();
    return;
  }
  searchResults.innerHTML = html;
  searchResults.classList.add('open');
}

function getLocalSearchMatches(queryLower) {
  const source = allPlaces
    .filter((p) => p?.location?.lat && p?.location?.lng)
    .slice();
  const prepared = source.map((p) => {
    const i18nData = pickI18n(p, lang);
    const name = String(i18nData.name || p.name || '').trim();
    const address = String(i18nData.address || p.location?.address || '').trim();
    const hay = `${name} ${address} ${(Array.isArray(p.tags) ? p.tags.join(' ') : '')}`.toLowerCase();
    return {
      id: String(p.id || ''),
      name: name || address || (lang === 'en' ? 'Place' : 'Место'),
      address: address || (lang === 'en' ? 'No address' : 'Адрес не указан'),
      hay,
      featuredOrder: Number.isFinite(p?.featuredOrder) ? p.featuredOrder : 999999,
      updatedAt: Number(p?.updatedAt?.seconds || 0)
    };
  });
  if (!queryLower) {
    return prepared
      .sort((a, b) => a.featuredOrder - b.featuredOrder || b.updatedAt - a.updatedAt)
      .slice(0, 6);
  }
  return prepared
    .filter((x) => x.hay.includes(queryLower))
    .sort((a, b) => a.name.localeCompare(b.name, lang === 'en' ? 'en' : 'ru'))
    .slice(0, 6);
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortName(displayName) {
  return displayName.split(',')[0].trim();
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout while loading map data')), ms))
  ]);
}
