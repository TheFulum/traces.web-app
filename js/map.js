import { initNav } from './nav.js';
import { getPlaces } from './places.js';
import { showToast, getParam } from './utils.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, pickI18n, t } from './i18n.js';

// Init nav (was missing before — nav was hardcoded in HTML)
initNav('');
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

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  subdomains: 'abcd'
}).addTo(map);

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
}

// ── popup content ─────────────────────────────────────────────────────────

function buildPopup(place) {
  const i18nData = pickI18n(place, lang);
  const placeName = i18nData.name || place.name || '';
  const placeAddress = i18nData.address || place.location?.address || '';
  const img = place.photos?.[0]
    ? `<img class="map-popup__img" src="${esc(place.photos[0])}" alt="${esc(placeName)}" />`
    : `<div class="map-popup__img--placeholder">${esc(t('place.noPhotos', dictI18n))}</div>`;

  const addr = placeAddress
    ? `<p class="map-popup__addr">${esc(placeAddress)}</p>`
    : '';

  return `
    <div class="map-popup">
      ${img}
      <div class="map-popup__body">
        <h3 class="map-popup__title">${esc(placeName)}</h3>
        ${addr}
        <a href="place.html?id=${place.id}" class="map-popup__btn">
          ${esc(t('map.openPlace', dictI18n))}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
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

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  searchClear.classList.toggle('visible', q.length > 0);

  clearTimeout(searchTimer);
  if (q.length < 3) { closeResults(); return; }

  searchTimer = setTimeout(() => nominatimSearch(q), 500);
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

async function nominatimSearch(query) {
  searchResults.innerHTML = `<p class="map-search__msg">${esc(t('map.searching', dictI18n))}</p>`;
  searchResults.classList.add('open');

  try {
    const acceptLang = lang === 'en' ? 'en' : 'ru';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=${encodeURIComponent(acceptLang)}`;
    const res  = await fetch(url, {
      headers: { 'Accept-Language': acceptLang, 'User-Agent': 'TracesOfThePast/1.0' }
    });
    const data = await res.json();

    if (!data.length) {
      searchResults.innerHTML = `<p class="map-search__msg">${esc(t('map.nothingFound', dictI18n))}</p>`;
      return;
    }

    searchResults.innerHTML = data.map(item => `
      <div class="map-search__result" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${esc(item.display_name)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <div>
          <div class="map-search__result-name">${esc(shortName(item.display_name))}</div>
          <div class="map-search__result-addr">${esc(item.display_name)}</div>
        </div>
      </div>
    `).join('');

    searchResults.querySelectorAll('.map-search__result').forEach(el => {
      el.addEventListener('click', () => {
        const lat  = parseFloat(el.dataset.lat);
        const lon  = parseFloat(el.dataset.lon);
        const name = el.dataset.name;

        map.setView([lat, lon], 14);

        if (searchMarker) map.removeLayer(searchMarker);
        searchMarker = L.marker([lat, lon], { icon: makeIcon(), title: name }).addTo(map);

        searchInput.value = shortName(name);
        closeResults();
      });
    });

  } catch (err) {
    searchResults.innerHTML = `<p class="map-search__msg">${esc(t('map.searchError', dictI18n))}</p>`;
  }
}

function closeResults() {
  searchResults.classList.remove('open');
  searchResults.innerHTML = '';
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
