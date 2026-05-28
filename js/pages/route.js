import { initNav } from '../shared/nav.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, t, nominatimAcceptLanguage } from '../shared/i18n.js';
import {
  buildRoutePageUrlWithSnapshot,
  readRouteSnapshotFromLocation,
  ROUTE_SNAPSHOT_V
} from '../shared/route-snapshot.js';
import { auth } from '../shared/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { saveUserRoute } from '../features/user-saved-routes.js';
import { getTrip, clearTrip, removeFromTrip, moveTripItem, setTripItems } from './trips.js';
import { showToast } from '../shared/utils.js';
import { getPlaces } from '../shared/places.js';
import { ensureLeafletReady } from '../shared/load-leaflet.js';
import { buildOsrmWorkerProxyUrl } from '../shared/media-worker-url.js';

/** Filled after `ensureLeafletReady()` (see bootstrap below). */
let L = null;

initNav('../');

const lang = getLang();
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  document.title = `${t('route.pageTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;
} catch {}

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const statusEl = document.getElementById('status');
const btnShare = document.getElementById('btn-share');
const btnSaveProfile = document.getElementById('btn-save-profile');
const btnClear = document.getElementById('btn-clear');
const saveRouteModal = document.getElementById('save-route-modal');
const saveRouteTitleInput = document.getElementById('save-route-title-input');
const saveRouteCancel = document.getElementById('save-route-cancel');
const saveRouteConfirm = document.getElementById('save-route-confirm');
const saveRouteModalStatus = document.getElementById('save-route-modal-status');
const startModeEl = document.getElementById('start-mode');
const endModeEl = document.getElementById('end-mode');
const btnDetectStart = document.getElementById('btn-detect-start');
const btnOptimize = document.getElementById('btn-optimize');
const btnPlanDays = document.getElementById('btn-plan-days');
const btnOpenGmaps = document.getElementById('btn-open-gmaps');
const optimizeModeEl = document.getElementById('optimize-mode');
const btnDetectEndHotel = document.getElementById('btn-detect-end-hotel');
const dayCountEl = document.getElementById('day-count');
const planSplitModeEl = document.getElementById('plan-split-mode');
const summaryEl = document.getElementById('route-summary');
const daysPlanEl = document.getElementById('route-days');
const routeMapEl = document.getElementById('route-map');
const routeAltSectionEl = document.getElementById('route-alt-section');
const routeAltPickerEl = document.getElementById('route-alt-picker');
const poiModeEl = document.getElementById('poi-mode');
const poiTargetEl = document.getElementById('poi-target');
const poiTypeEl = document.getElementById('poi-type');
const poiRadiusEl = document.getElementById('poi-radius');
const btnPoiLoad = document.getElementById('btn-poi-load');
const poiSummaryEl = document.getElementById('poi-summary');
const poiListEl = document.getElementById('poi-list');
const startAddressRow = document.getElementById('start-address-row');
const endAddressRow = document.getElementById('end-address-row');
const startAddressInput = document.getElementById('start-address-input');
const endAddressInput = document.getElementById('end-address-input');
const btnGeocodeStart = document.getElementById('btn-geocode-start');
const btnGeocodeEnd = document.getElementById('btn-geocode-end');

let placesById = new Map();
let startPoint = null;
let startAddressPoint = null;
let endHotelPoint = null;
let endAddressPoint = null;
let routeMap = null;
let routeMapMarkers = [];
let routeMapPolylineLayers = [];
let routeMapHitLayers = [];
let routeAlternativesCache = [];
let selectedRouteAlternativeIndex = 0;
let lastRouteCoordsForMap = [];
let routeLegMarkers = [];
let routeMapGeometryGen = 0;
/** Отпечаток точек маршрута — без изменений не дергаем OSRM заново. */
let lastRouteCoordsFingerprint = '';
let mapLayoutRefreshTimer = null;
/** Только авто. Два зеркала: DE (основной) и project-osrm (часто даёт alternatives). */
const ROUTING_ENDPOINTS = [
  { kind: 'osrm', base: 'https://routing.openstreetmap.de', prefix: '/routed-car' },
  { kind: 'osrm', base: 'https://router.project-osrm.org', prefix: '' }
];
const MAX_ROUTE_DAYS = 7;
const ROUTE_PROFILE_DRIVING = 'driving';
/** Средняя скорость для оценки времени по дням (км/ч), пока нет OSRM по сегменту. */
const AVG_DRIVE_KMH = 72;
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
/** Номер дня (1…N) для каждого места в порядке маршрута; не убывает по списку. */
let dayAssignments = [];
/** Дебаунс тяжёлых OSRM-запросов при частых updateMap (иначе 429 и спам запросов). */
let routeGeometryDebounceTimer = null;
const OSRM_CACHE = new Map();
const OSRM_CACHE_TTL_MS = 8 * 60 * 1000;
const OSRM_CACHE_MAX = 48;
const OSRM_INFLIGHT = new Map();
let osrmCooldownUntil = 0;
let firebaseUser = null;
/** Ночёвки между днями: индекс = после chunks[idx], длина chunks.length - 1 */
let overnightStops = [];
/** Временный список отелей при выборе в UI: gapIdx → массив из fetchPoi */
let nightHotelChoicesByGap = {};
const nightPickLoading = new Set();
/** Список отелей для финиша (режим «В отель») после запроса Overpass */
let endHotelChoices = null;
let endHotelPickLoading = false;

onAuthStateChanged(auth, (user) => {
  firebaseUser = user;
});

function truncateRouteLabel(text, max = 80) {
  const s = String(text ?? '').trim();
  if (!s) return '';
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Ссылка с полным снимком маршрута (места, дни, ночёвки, старт/финиш). */
function buildShareableRouteUrl() {
  return buildRoutePageUrlWithSnapshot(collectRouteSnapshot(), lang);
}

function defaultSaveRouteTitle() {
  const trip = getTrip();
  const names = (trip.items || []).slice(0, 4).map((i) => String(i.name || i.id || '').trim()).filter(Boolean);
  if (names.length) return names.join(' — ');
  return t('route.saveDefaultTitle', dictI18n);
}

function openSaveRouteModal() {
  if (!saveRouteModal || !saveRouteTitleInput) return;
  saveRouteTitleInput.value = defaultSaveRouteTitle();
  if (saveRouteModalStatus) saveRouteModalStatus.textContent = '';
  saveRouteModal.classList.remove('hidden');
  saveRouteTitleInput.focus();
  saveRouteTitleInput.select();
}

function closeSaveRouteModal() {
  saveRouteModal?.classList.add('hidden');
}

async function submitSaveRouteToProfile() {
  if (!firebaseUser) return;
  const trip = getTrip();
  if (!trip.items?.length) {
    showToast(t('route.shareEmpty', dictI18n), 'error');
    return;
  }
  const title = String(saveRouteTitleInput?.value || '').trim() || defaultSaveRouteTitle();
  if (saveRouteConfirm) saveRouteConfirm.disabled = true;
  if (saveRouteModalStatus) saveRouteModalStatus.textContent = '';
  try {
    await saveUserRoute(firebaseUser.uid, { title, snapshot: collectRouteSnapshot() });
    showToast(t('route.savedOk', dictI18n));
    closeSaveRouteModal();
  } catch (e) {
    console.error(e);
    if (e?.message === 'duplicate_route') {
      if (saveRouteModalStatus) saveRouteModalStatus.textContent = t('route.savedDuplicate', dictI18n);
      showToast(t('route.savedDuplicate', dictI18n), 'error');
      return;
    }
    if (saveRouteModalStatus) {
      saveRouteModalStatus.textContent = t('route.savedError', dictI18n);
    }
    showToast(t('route.savedError', dictI18n), 'error');
  } finally {
    if (saveRouteConfirm) saveRouteConfirm.disabled = false;
  }
}

/**
 * Старый формат: только places=… (без отелей/старта). Часть серверов теряет повторяющиеся ключи.
 * @returns {boolean}
 */
function applyLegacyPlacesFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let ids = params.getAll('places');
  if (ids.length === 1 && ids[0].includes(',')) {
    ids = ids[0].split(',').map((s) => String(s).trim()).filter(Boolean);
  }
  if (!ids.length) return false;

  const seen = new Set();
  const items = [];
  const now = Date.now();
  for (const raw of ids) {
    const id = String(raw || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const place = placesById.get(id);
    items.push({
      id,
      name: place?.name ? String(place.name).trim() : '',
      addedAt: now
    });
    if (items.length >= 200) break;
  }
  if (!items.length) return false;
  setTripItems(items);
  return true;
}

function getStartCoord() {
  const mode = startModeEl?.value;
  if (mode === 'geo') return startPoint;
  if (mode === 'address') return startAddressPoint;
  return null;
}

function syncRouteAddressUi() {
  const sm = startModeEl?.value;
  const em = endModeEl?.value;
  startAddressRow?.classList.toggle('hidden', sm !== 'address');
  endAddressRow?.classList.toggle('hidden', em !== 'address');
  if (btnDetectStart) btnDetectStart.style.display = sm === 'geo' ? '' : 'none';

  const endHotelSlot = document.getElementById('route-end-hotel-slot');
  if (endHotelSlot) {
    const showHotelUi = em === 'hotel';
    endHotelSlot.classList.toggle('hidden', !showHotelUi);
    endHotelSlot.classList.toggle('route-end-hotel-slot--border', showHotelUi);
    if (showHotelUi) {
      endHotelSlot.innerHTML = endHotelSlotMarkup();
    } else {
      endHotelChoices = null;
      endHotelPickLoading = false;
      endHotelSlot.innerHTML = '';
    }
  }
  if (btnDetectEndHotel) {
    btnDetectEndHotel.classList.toggle('hidden', em !== 'hotel');
    btnDetectEndHotel.disabled = !!endHotelPickLoading;
  }
}

function endHotelSlotMarkup() {
  if (endHotelPickLoading) {
    return `<div class="route-night-row"><span class="route-night-loading">${esc(t('route.findingEndHotelsList', dictI18n))}</span></div>`;
  }
  if (Array.isArray(endHotelChoices) && endHotelChoices.length) {
    const opts = endHotelChoices
      .map((h, i) => `<option value="${i}">${esc(`${h.name} · ${h.dist.toFixed(1)} km`)}</option>`)
      .join('');
    const listSize = routeHotelListSelectSize(endHotelChoices.length);
    return `
      <div class="route-night-row route-night-row--pick">
        <label class="form-label" for="end-hotel-select">${esc(t('route.pickEndHotel', dictI18n))}</label>
        <select id="end-hotel-select" class="form-control route-hotel-picker-select" size="${listSize}">${opts}</select>
        <div class="route-night-row__btns">
          <button type="button" class="btn btn--primary btn--sm" data-end-hotel-apply>${esc(t('route.nightHotelApply', dictI18n))}</button>
          <button type="button" class="btn btn--outline btn--sm" data-end-hotel-cancel>${esc(t('route.saveModalCancel', dictI18n))}</button>
        </div>
      </div>`;
  }
  if (endHotelPoint && Number.isFinite(endHotelPoint.lat)) {
    return `
      <div class="route-night-row">
        <span class="route-night-picked">${esc(t('route.endHotelPickedShort', dictI18n))}: ${esc(endHotelPoint.name || t('route.poiUnnamed', dictI18n))}</span>
        <button type="button" class="btn btn--outline btn--sm" data-end-hotel-clear>${esc(t('route.nightHotelClear', dictI18n))}</button>
        <button type="button" class="btn btn--outline btn--sm" data-end-hotel-change>${esc(t('route.nightHotelChange', dictI18n))}</button>
      </div>`;
  }
  return `<div class="route-night-row route-night-row--pick">
    <p class="user-card__hint" style="margin:0">${esc(t('route.endHotelPickHint', dictI18n))}</p>
  </div>`;
}

async function geocodeAddress(query) {
  const q = String(query ?? '').trim();
  if (!q) return null;
  const locale = nominatimAcceptLanguage(lang);
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', q);
  url.searchParams.set('accept-language', locale);
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'Accept-Language': locale }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = Array.isArray(data) ? data[0] : null;
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    label: truncateRouteLabel(hit.display_name || q)
  };
}

async function geocodeStart() {
  const q = startAddressInput?.value;
  if (!String(q ?? '').trim()) {
    setStatus(t('route.addressEmpty', dictI18n), 'error');
    return;
  }
  setStatus(t('route.geocodeSearching', dictI18n));
  if (btnGeocodeStart) btnGeocodeStart.disabled = true;
  try {
    const hit = await geocodeAddress(q);
    if (!hit) throw new Error('none');
    startAddressPoint = { lat: hit.lat, lng: hit.lng, label: hit.label };
    renderSummary();
    setStatus(t('route.geocodeOk', dictI18n), 'success');
    showToast(t('route.geocodeOk', dictI18n));
  } catch {
    startAddressPoint = null;
    setStatus(t('route.geocodeError', dictI18n), 'error');
  } finally {
    if (btnGeocodeStart) btnGeocodeStart.disabled = false;
  }
}

async function geocodeEnd() {
  const q = endAddressInput?.value;
  if (!String(q ?? '').trim()) {
    setStatus(t('route.addressEmpty', dictI18n), 'error');
    return;
  }
  setStatus(t('route.geocodeSearching', dictI18n));
  if (btnGeocodeEnd) btnGeocodeEnd.disabled = true;
  try {
    const hit = await geocodeAddress(q);
    if (!hit) throw new Error('none');
    endAddressPoint = { lat: hit.lat, lng: hit.lng, label: hit.label };
    renderSummary();
    setStatus(t('route.geocodeOk', dictI18n), 'success');
    showToast(t('route.geocodeOk', dictI18n));
  } catch {
    endAddressPoint = null;
    setStatus(t('route.geocodeError', dictI18n), 'error');
  } finally {
    if (btnGeocodeEnd) btnGeocodeEnd.disabled = false;
  }
}

await bootstrapPlaces();

let openedRouteFromLink = false;
const snapFromUrl = readRouteSnapshotFromLocation();
if (snapFromUrl && applyRouteSnapshot(snapFromUrl)) {
  openedRouteFromLink = true;
  showToast(t('route.shareOpened', dictI18n));
} else if (applyLegacyPlacesFromUrl()) {
  openedRouteFromLink = true;
  showToast(t('route.shareOpened', dictI18n));
}

syncRouteAddressUi();
render();
try {
  await ensureLeafletReady();
  L = window.L;
} catch (e) {
  console.warn(e);
  L = window.L;
}
await initRouteMap();
if (openedRouteFromLink) {
  setTimeout(() => {
    routeMap?.invalidateSize(true);
    updateMap();
  }, 400);
}
ensureRouteMapVisibleFix();
renderSummary();
renderPoiTargets();

btnClear.addEventListener('click', () => {
  clearTrip();
  startPoint = null;
  startAddressPoint = null;
  endHotelPoint = null;
  endHotelChoices = null;
  endHotelPickLoading = false;
  endAddressPoint = null;
  overnightStops = [];
  nightHotelChoicesByGap = {};
  dayAssignments = [];
  lastRouteCoordsFingerprint = '';
  if (startAddressInput) startAddressInput.value = '';
  if (endAddressInput) endAddressInput.value = '';
  syncRouteAddressUi();
  render();
  renderSummary();
  renderPoiTargets();
  renderPoiResults([]);
  showToast(t('route.cleared', dictI18n));
});

btnDetectStart.addEventListener('click', detectStart);
btnGeocodeStart?.addEventListener('click', geocodeStart);
btnGeocodeEnd?.addEventListener('click', geocodeEnd);
startAddressInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    geocodeStart();
  }
});
endAddressInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    geocodeEnd();
  }
});
btnOptimize.addEventListener('click', optimizeRoute);
btnPlanDays.addEventListener('click', applyDaySplit);
btnOpenGmaps.addEventListener('click', openInGoogleMaps);
btnDetectEndHotel?.addEventListener('click', openEndHotelPicker);

document.querySelector('.route-planner')?.addEventListener('click', async (e) => {
  const applyBtn = e.target.closest('[data-end-hotel-apply]');
  const cancelBtn = e.target.closest('[data-end-hotel-cancel]');
  const clearBtn = e.target.closest('[data-end-hotel-clear]');
  const changeBtn = e.target.closest('[data-end-hotel-change]');
  if (clearBtn) {
    endHotelPoint = null;
    endHotelChoices = null;
    syncRouteAddressUi();
    renderSummary();
    updateMap();
    return;
  }
  if (cancelBtn) {
    endHotelChoices = null;
    syncRouteAddressUi();
    setStatus('');
    return;
  }
  if (applyBtn) {
    const sel = document.getElementById('end-hotel-select');
    const v = sel ? Number(sel.value) : NaN;
    const h = Number.isFinite(v) ? endHotelChoices?.[v] : null;
    if (!h) return;
    endHotelPoint = { lat: h.lat, lng: h.lng, name: h.name };
    endHotelChoices = null;
    setStatus(`${t('route.endHotelFound', dictI18n)}: ${h.name}`, 'success');
    syncRouteAddressUi();
    renderSummary();
    updateMap();
    return;
  }
  if (changeBtn) {
    await openEndHotelPicker();
  }
});
btnPoiLoad?.addEventListener('click', loadNearbyPoi);
poiModeEl?.addEventListener('change', () => renderPoiTargets());
startModeEl?.addEventListener('change', () => {
  const v = startModeEl.value;
  if (v === 'none') {
    startPoint = null;
    startAddressPoint = null;
  } else if (v === 'geo') {
    startAddressPoint = null;
  } else if (v === 'address') {
    startPoint = null;
  }
  syncRouteAddressUi();
  renderSummary();
});
endModeEl?.addEventListener('change', () => {
  if (endModeEl.value !== 'address') endAddressPoint = null;
  if (endModeEl.value !== 'hotel') {
    endHotelPoint = null;
    endHotelChoices = null;
    endHotelPickLoading = false;
  }
  syncRouteAddressUi();
  renderSummary();
  updateMap();
});
dayCountEl?.addEventListener('change', () => {
  syncDayCountSelect();
  ensureDayAssignments();
  render();
  renderDayPlan();
  renderPoiTargets();
  updateMap();
});

listEl?.addEventListener('change', (e) => {
  const sel = e.target.closest('select[data-place-day]');
  if (!sel) return;
  const idx = Number(sel.getAttribute('data-place-day'));
  const day = Number(sel.value);
  if (!Number.isFinite(idx) || !Number.isFinite(day)) return;
  setPlaceDay(idx, day);
});
optimizeModeEl?.addEventListener('change', () => setStatus(''));

btnShare.addEventListener('click', async () => {
  const trip = getTrip();
  if (!trip.items?.length) {
    const msg = t('route.shareEmpty', dictI18n);
    setStatus(msg, 'error');
    showToast(msg, 'error');
    return;
  }

  const url = buildShareableRouteUrl();
  const title = t('route.shareTitle', dictI18n);
  const text = `${t('route.shareTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;

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
    setStatus(t('route.shareCopied', dictI18n), 'success');
    showToast(t('route.shareCopied', dictI18n));
  } catch {
    setStatus(t('route.shareCopyError', dictI18n), 'error');
    showToast(t('route.shareCopyError', dictI18n), 'error');
  }
});

btnSaveProfile?.addEventListener('click', () => {
  const trip = getTrip();
  if (!trip.items?.length) {
    const msg = t('route.shareEmpty', dictI18n);
    setStatus(msg, 'error');
    showToast(msg, 'error');
    return;
  }
  if (!firebaseUser) {
    showToast(t('route.loginToSave', dictI18n));
    window.location.href = new URL(`auth.html?lang=${encodeURIComponent(lang)}`, window.location.href).toString();
    return;
  }
  openSaveRouteModal();
});

saveRouteCancel?.addEventListener('click', closeSaveRouteModal);
saveRouteConfirm?.addEventListener('click', () => submitSaveRouteToProfile());
saveRouteModal?.addEventListener('click', (e) => {
  if (e.target === saveRouteModal || (e.target && e.target.classList?.contains('route-save-modal__backdrop'))) {
    closeSaveRouteModal();
  }
});
saveRouteTitleInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSaveRouteModal();
  if (e.key === 'Enter') {
    e.preventDefault();
    submitSaveRouteToProfile();
  }
});

function render() {
  const trip = getTrip();
  const items = trip.items || [];
  syncDayCountSelect();
  ensureDayAssignments();

  emptyEl.classList.toggle('hidden', items.length !== 0);
  listEl.innerHTML = '';
  setStatus('');

  if (!items.length) {
    updateMap();
    return;
  }

  listEl.innerHTML = items.map((x, i) => {
    const placeName = x.name || (lang === 'en' ? 'Place' : 'Место');
    return `
      <article class="route-item" draggable="true" data-route-id="${escAttr(x.id)}">
        ${placeDaySelectMarkup(i)}
        <div class="route-item__main">
          <a class="route-item__title" href="place.html?id=${encodeURIComponent(x.id)}">${esc(placeName)}</a>
          <div class="route-item__meta">
            ${esc(t('route.point', dictI18n))} ${i + 1}
          </div>
        </div>
        <div class="route-item__btns">
          <button class="route-item__drag" type="button" aria-label="${escAttr(t('route.dragToReorder', dictI18n))}" title="${escAttr(t('route.dragToReorder', dictI18n))}">↕</button>
          <button class="btn btn--outline btn--sm" type="button" data-move="up" data-id="${escAttr(x.id)}" aria-label="${escAttr(t('route.moveUp', dictI18n))}">↑</button>
          <button class="btn btn--outline btn--sm" type="button" data-move="down" data-id="${escAttr(x.id)}" aria-label="${escAttr(t('route.moveDown', dictI18n))}">↓</button>
          <button class="btn btn--outline btn--sm" type="button" data-remove="${escAttr(x.id)}">${esc(t('route.remove', dictI18n))}</button>
        </div>
      </article>
    `;
  }).join('');

  listEl.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-remove');
      removeFromTrip(id);
      render();
      renderSummary();
      renderDayPlan();
      renderPoiTargets();
      showToast(t('route.removed', dictI18n));
    });
  });
  listEl.querySelectorAll('[data-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-move');
      const id = btn.getAttribute('data-id');
      const fromIdx = items.findIndex((x) => String(x.id) === String(id));
      moveTripItem(id, dir === 'up' ? 'up' : 'down');
      const toIdx = dir === 'up' ? fromIdx - 1 : fromIdx + 1;
      if (fromIdx >= 0 && toIdx >= 0) reorderDayAssignments(fromIdx, toIdx);
      render();
      renderSummary();
      renderDayPlan();
      renderPoiTargets();
    });
  });
  bindDnDReorder();
  updateMap();
}

async function bootstrapPlaces() {
  try {
    const places = await getPlaces();
    placesById = new Map(places.map((p) => [String(p.id), p]));
  } catch {
    placesById = new Map();
  }
}

async function detectStart() {
  if (!navigator.geolocation) {
    setStatus(t('route.geoUnavailable', dictI18n), 'error');
    return;
  }
  setStatus(t('route.geoDetecting', dictI18n));
  await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        startPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        startAddressPoint = null;
        if (startModeEl) startModeEl.value = 'geo';
        syncRouteAddressUi();
        setStatus(t('route.geoDetected', dictI18n), 'success');
        renderSummary();
        resolve();
      },
      () => {
        setStatus(t('route.geoError', dictI18n), 'error');
        resolve();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

async function openEndHotelPicker() {
  const trip = getTrip();
  const items = trip.items || [];
  if (!items.length) {
    setStatus(t('route.poiNeedRoute', dictI18n), 'error');
    return;
  }
  const lastCoord = getPlaceCoord(items[items.length - 1].id);
  if (!lastCoord) {
    setStatus(t('route.optimizeNeedCoords', dictI18n), 'error');
    return;
  }
  if (endHotelPickLoading) return;
  endHotelPickLoading = true;
  endHotelChoices = null;
  if (endModeEl) endModeEl.value = 'hotel';
  syncRouteAddressUi();
  setStatus(t('route.findingEndHotelsList', dictI18n));
  try {
    const hotels = await fetchHotelsNearCenters([lastCoord]);
    if (!hotels.length) {
      setStatus(t('route.endHotelNotFound', dictI18n), 'error');
    } else {
      endHotelChoices = hotels;
      setStatus(t('route.endHotelListLoaded', dictI18n), 'success');
    }
  } catch {
    setStatus(t('route.endHotelDetectError', dictI18n), 'error');
  } finally {
    endHotelPickLoading = false;
    syncRouteAddressUi();
  }
}

async function optimizeRoute() {
  if ((optimizeModeEl?.value || 'fast') === 'api') {
    await optimizeRouteApi();
    return;
  }
  optimizeRouteFast();
}

function optimizeRouteFast() {
  const trip = getTrip();
  if (!trip.items?.length) return;
  const nodes = trip.items
    .map((x) => ({
      id: x.id,
      name: x.name,
      coord: getPlaceCoord(x.id)
    }))
    .filter((x) => x.coord);

  if (nodes.length < 2) {
    setStatus(t('route.optimizeNeedCoords', dictI18n), 'error');
    return;
  }

  const start = getStartCoord();
  const ordered = nearestNeighbor(nodes, start);
  const improved = twoOpt(ordered, start, endModeEl?.value === 'return' ? start : null);

  const idOrder = improved.map((x) => x.id);
  const tripItems = trip.items.slice();
  tripItems.sort((a, b) => {
    const ai = idOrder.indexOf(a.id);
    const bi = idOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  setTripItems(tripItems);

  render();
  renderSummary();
  renderDayPlan();
  renderPoiTargets();
  updateMap();
  setStatus(t('route.optimized', dictI18n), 'success');
  showToast(t('route.optimized', dictI18n));
}

async function optimizeRouteApi() {
  const trip = getTrip();
  const items = trip.items || [];
  if (items.length < 2) {
    setStatus(t('route.optimizeNeedCoords', dictI18n), 'error');
    return;
  }
  const placeNodes = items
    .map((x) => ({ id: x.id, name: x.name, coord: getPlaceCoord(x.id) }))
    .filter((x) => x.coord);
  if (placeNodes.length < 2) {
    setStatus(t('route.optimizeNeedCoords', dictI18n), 'error');
    return;
  }
  setStatus(t('route.optimizingApi', dictI18n));
  try {
    const optimizedIds = await requestApiOrder(placeNodes);
    if (!optimizedIds.length) throw new Error('empty_order');
    const tripItems = trip.items.slice();
    tripItems.sort((a, b) => {
      const ai = optimizedIds.indexOf(a.id);
      const bi = optimizedIds.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    setTripItems(tripItems);
    render();
    renderSummary();
    renderDayPlan();
    renderPoiTargets();
    updateMap();
    setStatus(t('route.optimizedApi', dictI18n), 'success');
    showToast(t('route.optimizedApi', dictI18n));
  } catch {
    setStatus(t('route.optimizeApiError', dictI18n), 'error');
  }
}

function nearestNeighbor(nodes, start) {
  const pool = nodes.slice();
  const out = [];
  let cur = start;

  while (pool.length) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pool.length; i += 1) {
      const d = distance(cur || pool[0].coord, pool[i].coord);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = pool.splice(bestIdx, 1)[0];
    out.push(next);
    cur = next.coord;
  }
  return out;
}

function twoOpt(path, start, end) {
  const arr = path.slice();
  if (arr.length < 4) return arr;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < arr.length - 2; i += 1) {
      for (let k = i + 1; k < arr.length - 1; k += 1) {
        const before = routeDistance(arr, start, end);
        const candidate = arr.slice(0, i).concat(arr.slice(i, k + 1).reverse(), arr.slice(k + 1));
        const after = routeDistance(candidate, start, end);
        if (after + 0.001 < before) {
          arr.splice(0, arr.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return arr;
}

function routeDistance(pathNodes, start, end) {
  if (!pathNodes.length) return 0;
  let sum = 0;
  let prev = start || pathNodes[0].coord;
  for (let i = 0; i < pathNodes.length; i += 1) {
    sum += distance(prev, pathNodes[i].coord);
    prev = pathNodes[i].coord;
  }
  if (end) sum += distance(prev, end);
  return sum;
}

function distance(a, b) {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(x) {
  return (x * Math.PI) / 180;
}

function getPlaceCoord(placeId) {
  const p = placesById.get(String(placeId));
  const lat = Number(p?.location?.lat);
  const lng = Number(p?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getMaxRouteDays() {
  const n = (getTrip().items || []).length;
  if (n < 1) return 1;
  return Math.min(MAX_ROUTE_DAYS, n);
}

function getRouteDayCount() {
  const max = getMaxRouteDays();
  return Math.max(1, Math.min(max, Number(dayCountEl?.value || 1)));
}

function syncDayCountSelect() {
  if (!dayCountEl) return;
  const max = getMaxRouteDays();
  const prev = Math.max(1, Math.min(max, Number(dayCountEl.value) || 1));
  const opts = [];
  for (let d = 1; d <= max; d += 1) {
    opts.push(`<option value="${d}"${d === prev ? ' selected' : ''}>${d}</option>`);
  }
  dayCountEl.innerHTML = opts.join('');
  if (Number(dayCountEl.value) !== prev) dayCountEl.value = String(prev);
}

function enforceMonotonicDayAssignments() {
  const dc = getRouteDayCount();
  let prev = 1;
  for (let i = 0; i < dayAssignments.length; i += 1) {
    let d = Math.round(Number(dayAssignments[i])) || prev;
    d = Math.max(prev, Math.min(dc, d));
    dayAssignments[i] = d;
    prev = d;
  }
}

function ensureDayAssignments() {
  const items = getTrip().items || [];
  const dc = getRouteDayCount();
  while (dayAssignments.length < items.length) {
    const last = dayAssignments.length ? dayAssignments[dayAssignments.length - 1] : 1;
    dayAssignments.push(Math.min(last, dc));
  }
  dayAssignments.length = items.length;
  if (!dayAssignments.length) return;
  enforceMonotonicDayAssignments();
}

function buildDayChunks(items, dayCount, assignments) {
  const chunks = Array.from({ length: dayCount }, () => []);
  (assignments || []).forEach((dayNum, i) => {
    if (!items[i]) return;
    const slot = Math.max(1, Math.min(dayCount, Math.round(Number(dayNum)) || 1)) - 1;
    chunks[slot].push(items[i]);
  });
  return chunks;
}

function getDayChunks() {
  const trip = getTrip();
  const items = trip.items || [];
  const dayCount = getRouteDayCount();
  if (dayCount <= 1 || !items.length) return [];
  ensureDayAssignments();
  return buildDayChunks(items, dayCount, dayAssignments);
}

function setPlaceDay(index, newDay) {
  const dc = getRouteDayCount();
  const minDay = index > 0 ? dayAssignments[index - 1] : 1;
  dayAssignments[index] = Math.max(minDay, Math.min(dc, Math.round(Number(newDay)) || minDay));
  enforceMonotonicDayAssignments();
  render();
  renderSummary();
  renderDayPlan();
  renderPoiTargets();
  updateMap();
}

function reorderDayAssignments(fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
  if (fromIdx >= dayAssignments.length || toIdx >= dayAssignments.length) return;
  const [moved] = dayAssignments.splice(fromIdx, 1);
  dayAssignments.splice(toIdx, 0, moved);
  enforceMonotonicDayAssignments();
}

function autoAssignDaysEvenCount() {
  const items = getTrip().items || [];
  const dc = getRouteDayCount();
  if (dc <= 1 || !items.length) {
    dayAssignments = items.map(() => 1);
    return;
  }
  const perDay = Math.ceil(items.length / dc);
  dayAssignments = items.map((_, i) => Math.min(dc, Math.floor(i / perDay) + 1));
  enforceMonotonicDayAssignments();
}

function autoAssignDaysEvenKm() {
  const items = getTrip().items || [];
  const dc = getRouteDayCount();
  if (dc <= 1 || !items.length) {
    dayAssignments = items.map(() => 1);
    return;
  }
  const legKm = [];
  let prev = getStartCoord();
  for (const item of items) {
    const coord = getPlaceCoord(item.id);
    if (!coord) {
      legKm.push(0);
      continue;
    }
    legKm.push(prev ? haversineKm(prev, coord) : 0);
    prev = coord;
  }
  const total = legKm.reduce((a, b) => a + b, 0);
  const target = total > 0 ? total / dc : 0;
  dayAssignments = [];
  let day = 1;
  let acc = 0;
  for (let i = 0; i < items.length; i += 1) {
    dayAssignments.push(day);
    if (day >= dc) continue;
    acc += legKm[i];
    const remaining = items.length - i - 1;
    const daysLeft = dc - day;
    if (target > 0 && acc >= target && daysLeft > 0 && remaining >= daysLeft) {
      day += 1;
      acc = 0;
    }
  }
  enforceMonotonicDayAssignments();
}

function migrateLegacyDayAssignments(items, dayCount) {
  if (dayCount <= 1 || !items.length) {
    dayAssignments = items.map(() => 1);
    return;
  }
  const perDay = Math.ceil(items.length / dayCount);
  dayAssignments = items.map((_, i) => Math.min(dayCount, Math.floor(i / perDay) + 1));
  enforceMonotonicDayAssignments();
}

function applyDaySplit() {
  const dc = getRouteDayCount();
  if (dc <= 1) {
    renderDayPlan();
    return;
  }
  const mode = planSplitModeEl?.value || 'count';
  if (mode === 'km') autoAssignDaysEvenKm();
  else autoAssignDaysEvenCount();
  render();
  renderSummary();
  renderDayPlan();
  renderPoiTargets();
  updateMap();
  showToast(t('route.planDaysDone', dictI18n));
}

function formatRouteDuration(seconds) {
  const sec = Number(seconds);
  if (!Number.isFinite(sec) || sec < 0) return '';
  const totalMin = Math.round(sec / 60);
  if (totalMin < 60) {
    return `${totalMin} ${t('route.durationMinShort', dictI18n)}`;
  }
  const days = Math.floor(totalMin / (24 * 60));
  const rem = totalMin - days * 24 * 60;
  const hours = Math.floor(rem / 60);
  const mins = rem % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} ${t('route.durationDayShort', dictI18n)}`);
  if (hours > 0) parts.push(`${hours} ${t('route.durationHourShort', dictI18n)}`);
  if (mins > 0 && days === 0) parts.push(`${mins} ${t('route.durationMinShort', dictI18n)}`);
  else if (mins > 0 && days > 0 && hours === 0) parts.push(`${mins} ${t('route.durationMinShort', dictI18n)}`);
  return parts.join(' ');
}

function routeSpeedKmH(distanceM, durationS) {
  const d = Number(distanceM);
  const tSec = Number(durationS);
  if (!Number.isFinite(d) || !Number.isFinite(tSec) || tSec <= 0) return NaN;
  return (d / 1000) / (tSec / 3600);
}

function isPlausibleDrivingRoute(route) {
  const speed = routeSpeedKmH(route?.distanceM, route?.durationS);
  if (!Number.isFinite(speed)) return true;
  return speed >= 4 && speed <= 140;
}

function placeDaySelectMarkup(index) {
  const dc = getRouteDayCount();
  if (dc <= 1) return '';
  ensureDayAssignments();
  const minDay = index > 0 ? dayAssignments[index - 1] : 1;
  const cur = dayAssignments[index] ?? minDay;
  const opts = [];
  for (let d = minDay; d <= dc; d += 1) {
    opts.push(`<option value="${d}"${d === cur ? ' selected' : ''}>${d}</option>`);
  }
  return `
    <div class="route-item__day">
      <label class="route-item__day-label" for="place-day-${index}">${esc(t('route.placeDay', dictI18n))}</label>
      <select id="place-day-${index}" class="form-control route-item__day-select" data-place-day="${index}" aria-label="${escAttr(`${t('route.placeDay', dictI18n)} ${index + 1}`)}">${opts.join('')}</select>
    </div>`;
}

function syncOvernightSlots() {
  const trip = getTrip();
  const items = trip.items || [];
  const dayCount = getRouteDayCount();
  if (dayCount <= 1 || items.length === 0) {
    overnightStops = [];
    nightHotelChoicesByGap = {};
    return;
  }
  const slots = Math.max(0, dayCount - 1);
  const next = Array.from({ length: slots }, (_, i) => {
    const prev = overnightStops[i];
    if (prev && Number.isFinite(prev.lat) && Number.isFinite(prev.lng)) return prev;
    return null;
  });
  overnightStops = next;
}

function collectRouteSnapshot() {
  syncOvernightSlots();
  ensureDayAssignments();
  const trip = getTrip();
  const dc = getRouteDayCount();
  const overnight = overnightStops.map((s) =>
    s && Number.isFinite(s.lat) && Number.isFinite(s.lng)
      ? { lat: s.lat, lng: s.lng, name: String(s.name || '').slice(0, 200) }
      : null
  );

  const startMode = startModeEl?.value || 'none';
  let start = { mode: 'none' };
  if (startMode === 'geo' && startPoint) {
    start = { mode: 'geo', lat: startPoint.lat, lng: startPoint.lng };
  } else if (startMode === 'address' && startAddressPoint) {
    start = {
      mode: 'address',
      lat: startAddressPoint.lat,
      lng: startAddressPoint.lng,
      label: String(startAddressPoint.label || '').slice(0, 300)
    };
  } else {
    start = { mode: startMode === 'geo' || startMode === 'address' ? startMode : 'none' };
  }

  const endMode = endModeEl?.value || 'last';
  let end = { mode: 'last' };
  if (endMode === 'hotel' && endHotelPoint) {
    end = {
      mode: 'hotel',
      lat: endHotelPoint.lat,
      lng: endHotelPoint.lng,
      name: String(endHotelPoint.name || '').slice(0, 200)
    };
  } else if (endMode === 'address' && endAddressPoint) {
    end = {
      mode: 'address',
      lat: endAddressPoint.lat,
      lng: endAddressPoint.lng,
      label: String(endAddressPoint.label || '').slice(0, 300)
    };
  } else if (endMode === 'return' || endMode === 'last') {
    end = { mode: endMode };
  } else if (endMode === 'hotel') {
    end = { mode: 'hotel' };
  } else if (endMode === 'address') {
    end = { mode: 'address' };
  }

  return {
    v: ROUTE_SNAPSHOT_V,
    places: (trip.items || []).map((i) => ({
      id: String(i.id || '').trim(),
      name: String(i.name || '').trim().slice(0, 300)
    })),
    dayCount: dc,
    dayAssignments: dayAssignments.slice(),
    overnight,
    start,
    end
  };
}

function applyRouteSnapshot(snap) {
  if (!snap || snap.v !== ROUTE_SNAPSHOT_V) return false;

  const items = (snap.places || [])
    .map((p, i) => ({
      id: String(p?.id || '').trim(),
      name: String(p?.name || '').trim(),
      addedAt: Date.now() + i
    }))
    .filter((x) => x.id)
    .slice(0, 200);
  if (!items.length) return false;

  setTripItems(items);

  if (dayCountEl) {
    const dc = Math.max(1, Math.min(MAX_ROUTE_DAYS, Number(snap.dayCount) || 1));
    dayCountEl.value = String(dc);
    syncDayCountSelect();
  }

  const dcSnap = Math.max(1, Math.min(MAX_ROUTE_DAYS, Number(snap.dayCount) || 1));
  const rawAssign = Array.isArray(snap.dayAssignments) ? snap.dayAssignments : [];
  if (rawAssign.length === items.length) {
    dayAssignments = rawAssign.map((d) => Math.round(Number(d)) || 1);
    enforceMonotonicDayAssignments();
  } else {
    migrateLegacyDayAssignments(items, dcSnap);
  }

  const ov = Array.isArray(snap.overnight) ? snap.overnight : [];
  overnightStops = ov.map((entry) =>
    entry && Number.isFinite(Number(entry.lat)) && Number.isFinite(Number(entry.lng))
      ? { lat: Number(entry.lat), lng: Number(entry.lng), name: String(entry.name || '') }
      : null
  );
  syncOvernightSlots();

  const st = snap.start || {};
  if (startModeEl) {
    if (st.mode === 'geo' || st.mode === 'address' || st.mode === 'none') startModeEl.value = st.mode;
    else startModeEl.value = 'none';
  }
  startPoint = null;
  startAddressPoint = null;
  if (startAddressInput) startAddressInput.value = '';
  if (st.mode === 'geo' && Number.isFinite(Number(st.lat)) && Number.isFinite(Number(st.lng))) {
    startPoint = { lat: Number(st.lat), lng: Number(st.lng) };
  }
  if (st.mode === 'address' && Number.isFinite(Number(st.lat)) && Number.isFinite(Number(st.lng))) {
    startAddressPoint = {
      lat: Number(st.lat),
      lng: Number(st.lng),
      label: String(st.label || '').trim()
    };
    if (startAddressInput) startAddressInput.value = startAddressPoint.label;
  }

  const en = snap.end || {};
  if (endModeEl) {
    endModeEl.value = ['last', 'return', 'hotel', 'address'].includes(en.mode) ? en.mode : 'last';
  }
  endHotelPoint = null;
  endAddressPoint = null;
  if (endAddressInput) endAddressInput.value = '';
  if (en.mode === 'hotel' && Number.isFinite(Number(en.lat)) && Number.isFinite(Number(en.lng))) {
    endHotelPoint = {
      lat: Number(en.lat),
      lng: Number(en.lng),
      name: String(en.name || '').trim()
    };
  }
  if (en.mode === 'address' && Number.isFinite(Number(en.lat)) && Number.isFinite(Number(en.lng))) {
    endAddressPoint = {
      lat: Number(en.lat),
      lng: Number(en.lng),
      label: String(en.label || '').trim()
    };
    if (endAddressInput) endAddressInput.value = endAddressPoint.label;
  }

  nightHotelChoicesByGap = {};
  return true;
}

/** Точки поиска отеля между днями: конец дня, начало след., середина. */
function computeNightSearchCenters(gapIdx) {
  const chunks = getDayChunks();
  const a = chunks[gapIdx];
  const b = chunks[gapIdx + 1];
  const centers = [];
  const seen = new Set();
  const push = (c) => {
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return;
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
    if (seen.has(key)) return;
    seen.add(key);
    centers.push(c);
  };
  const lastA = a?.length ? getLastCoord(a) : null;
  const firstB = b?.length ? getPlaceCoord(b[0].id) : null;
  push(lastA);
  push(firstB);
  if (lastA && firstB) {
    push({ lat: (lastA.lat + firstB.lat) / 2, lng: (lastA.lng + firstB.lng) / 2 });
  }
  return centers;
}

function nightSlotMarkup(gapIdx) {
  const sel = overnightStops[gapIdx];
  const choices = nightHotelChoicesByGap[gapIdx];
  if (Array.isArray(choices) && choices.length) {
    const opts = choices
      .map(
        (h, i) =>
          `<option value="${i}">${esc(`${h.name} · ${h.dist.toFixed(1)} km`)}</option>`
      )
      .join('');
    const listSize = routeHotelListSelectSize(choices.length);
    return `
      <div class="route-night-row route-night-row--pick">
        <label class="form-label" for="night-hotel-select-${gapIdx}">${esc(t('route.pickOvernightHotel', dictI18n))}</label>
        <select id="night-hotel-select-${gapIdx}" class="form-control route-hotel-picker-select" size="${listSize}">${opts}</select>
        <div class="route-night-row__btns">
          <button type="button" class="btn btn--primary btn--sm" data-night-apply="${gapIdx}">${esc(t('route.nightHotelApply', dictI18n))}</button>
          <button type="button" class="btn btn--outline btn--sm" data-night-cancel="${gapIdx}">${esc(t('route.saveModalCancel', dictI18n))}</button>
        </div>
      </div>`;
  }
  if (sel && Number.isFinite(sel.lat)) {
    return `
      <div class="route-night-row">
        <span class="route-night-picked">${esc(t('route.nightStopShort', dictI18n))}: ${esc(sel.name || t('route.poiUnnamed', dictI18n))}</span>
        <button type="button" class="btn btn--outline btn--sm" data-night-clear="${gapIdx}">${esc(t('route.nightHotelClear', dictI18n))}</button>
        <button type="button" class="btn btn--outline btn--sm" data-night-pick="${gapIdx}">${esc(t('route.nightHotelChange', dictI18n))}</button>
      </div>`;
  }
  return `<button type="button" class="btn btn--outline btn--sm" data-night-pick="${gapIdx}">${esc(t('route.pickOvernightHotel', dictI18n))}</button>`;
}

function clearNightHotel(gapIdx) {
  syncOvernightSlots();
  if (gapIdx >= 0 && gapIdx < overnightStops.length) overnightStops[gapIdx] = null;
  delete nightHotelChoicesByGap[gapIdx];
  renderDayPlan();
  renderSummary();
  updateMap();
}

function applyNightHotelChoice(gapIdx, hotelIdx) {
  const list = nightHotelChoicesByGap[gapIdx];
  const hotel = list?.[hotelIdx];
  if (!hotel) return;
  syncOvernightSlots();
  overnightStops[gapIdx] = { lat: hotel.lat, lng: hotel.lng, name: hotel.name };
  delete nightHotelChoicesByGap[gapIdx];
  renderDayPlan();
  renderSummary();
  updateMap();
  showToast(t('route.nightHotelApplied', dictI18n));
}

async function openNightHotelPicker(gapIdx) {
  const slot = document.getElementById(`route-night-slot-${gapIdx}`);
  if (!slot || nightPickLoading.has(gapIdx)) return;
  const centers = computeNightSearchCenters(gapIdx);
  if (!centers.length) {
    slot.innerHTML = `<p class="route-night-error">${esc(t('route.nightHotelNeedCoords', dictI18n))}</p>`;
    return;
  }
  nightPickLoading.add(gapIdx);
  slot.innerHTML = `<span class="route-night-loading">${esc(t('route.findingHotel', dictI18n))}</span>`;
  try {
    const hotels = await fetchHotelsNearCenters(centers);
    if (!hotels.length) {
      delete nightHotelChoicesByGap[gapIdx];
      slot.innerHTML = `
        <div class="route-night-row route-night-row--error">
          <p class="route-night-error">${esc(t('route.nightHotelNotFound', dictI18n))}</p>
          <button type="button" class="btn btn--outline btn--sm" data-night-pick="${gapIdx}">${esc(t('route.nightHotelRetry', dictI18n))}</button>
        </div>`;
      return;
    }
    nightHotelChoicesByGap[gapIdx] = hotels;
    slot.innerHTML = nightSlotMarkup(gapIdx);
  } catch {
    delete nightHotelChoicesByGap[gapIdx];
    slot.innerHTML = `
      <div class="route-night-row route-night-row--error">
        <p class="route-night-error">${esc(t('route.nightHotelDetectError', dictI18n))}</p>
        <button type="button" class="btn btn--outline btn--sm" data-night-pick="${gapIdx}">${esc(t('route.nightHotelRetry', dictI18n))}</button>
      </div>`;
  } finally {
    nightPickLoading.delete(gapIdx);
  }
}

function renderSummary() {
  const trip = getTrip();
  const nodes = (trip.items || [])
    .map((x) => ({ id: x.id, coord: getPlaceCoord(x.id) }))
    .filter((x) => x.coord);
  if (!nodes.length) {
    summaryEl.textContent = '';
    return;
  }
  const withCoords = nodes.map((x) => ({ coord: x.coord }));
  const end = getEndPoint();
  const sum = routeDistance(withCoords, getStartCoord(), end);
  const missing = (trip.items || []).length - nodes.length;
  const missingText = missing > 0 ? ` · ${t('route.missingCoords', dictI18n)}: ${missing}` : '';
  const durEst = formatRouteDuration((sum / AVG_DRIVE_KMH) * 3600);
  const timePart = durEst ? ` · ${durEst}` : '';
  summaryEl.textContent = `${t('route.summaryDistance', dictI18n)}: ${sum.toFixed(1)} km${timePart}${missingText}`;
  renderDayPlan();
  updateMap();
}

function renderDayPlan() {
  syncOvernightSlots();
  const trip = getTrip();
  const items = trip.items || [];
  if (!daysPlanEl) return;
  daysPlanEl.innerHTML = '';
  if (!items.length) return;

  const dayCount = getRouteDayCount();
  if (dayCount <= 1) {
    daysPlanEl.innerHTML = `<div class="route-day"><div class="route-day__hint">${esc(t('route.oneDayHint', dictI18n))}</div></div>`;
    return;
  }

  ensureDayAssignments();
  const chunks = buildDayChunks(items, dayCount, dayAssignments);
  const startCoord = getStartCoord();
  const returnToStart = endModeEl?.value === 'return' && startCoord;

  let prevDayEnd = null;
  daysPlanEl.innerHTML = chunks.map((chunk, idx) => {
    const isLast = idx === chunks.length - 1;
    const dayStart = idx === 0 ? startCoord : prevDayEnd;
    const dayEnd = isLast && returnToStart ? startCoord : null;
    const dist = estimateChunkDistance(chunk, dayStart, dayEnd);
    const durSec = estimateChunkDurationSec(chunk, dayStart, dayEnd);
    const durText = formatRouteDuration(durSec);
    const timePart = durText ? ` · ${durText}` : '';
    prevDayEnd = getLastCoord(chunk) || prevDayEnd;
    const placeLines = chunk.length
      ? chunk.map((x) => `<li>${esc(x.name || x.id)}</li>`).join('')
      : `<li class="route-day__empty">${esc(t('route.dayEmpty', dictI18n))}</li>`;
    const overnightHint =
      idx < dayCount - 1
        ? `<div class="route-day__hint">${esc(t('route.overnightHint', dictI18n))}</div>`
        : '';
    const nightSlot =
      idx < dayCount - 1
        ? `<div class="route-day__night" id="route-night-slot-${idx}" aria-live="polite">${nightSlotMarkup(idx)}</div>`
        : '';
    return `
      <article class="route-day">
        <div class="route-day__title">${esc(t('route.dayLabel', dictI18n))} ${idx + 1}</div>
        <div class="route-day__meta">${esc(t('route.summaryDistance', dictI18n))}: ${dist.toFixed(1)} km${timePart}</div>
        <ol class="route-day__list">${placeLines}</ol>
        ${overnightHint}
        ${nightSlot}
      </article>
    `;
  }).join('');
}

daysPlanEl?.addEventListener('click', async (e) => {
  const applyBtn = e.target.closest('[data-night-apply]');
  const cancelBtn = e.target.closest('[data-night-cancel]');
  const clearBtn = e.target.closest('[data-night-clear]');
  const pickBtn = e.target.closest('[data-night-pick]');
  if (clearBtn) {
    clearNightHotel(Number(clearBtn.getAttribute('data-night-clear')));
    return;
  }
  if (cancelBtn) {
    const gap = Number(cancelBtn.getAttribute('data-night-cancel'));
    delete nightHotelChoicesByGap[gap];
    const slot = document.getElementById(`route-night-slot-${gap}`);
    if (slot) slot.innerHTML = nightSlotMarkup(gap);
    return;
  }
  if (applyBtn) {
    const gap = Number(applyBtn.getAttribute('data-night-apply'));
    const sel = document.getElementById(`night-hotel-select-${gap}`);
    const v = sel ? Number(sel.value) : NaN;
    if (Number.isFinite(v)) applyNightHotelChoice(gap, v);
    return;
  }
  if (pickBtn) {
    const gap = Number(pickBtn.getAttribute('data-night-pick'));
    if (Number.isFinite(gap)) await openNightHotelPicker(gap);
  }
});

function renderPoiTargets() {
  if (!poiTargetEl) return;
  const trip = getTrip();
  const items = trip.items || [];
  const mode = poiModeEl?.value || 'point';
  let options = [];

  if (mode === 'day') {
    const dayCount = getRouteDayCount();
    ensureDayAssignments();
    const chunks = buildDayChunks(items, dayCount, dayAssignments);
    options = chunks.map((chunk, i) => {
      let center = chunk.length ? calcDayCenter(chunk) : null;
      if (!center && i > 0) {
        const night = overnightStops[i - 1];
        if (night && Number.isFinite(night.lat)) center = { lat: night.lat, lng: night.lng };
      }
      return {
        key: `day-${i}`,
        label: `${t('route.dayLabel', dictI18n)} ${i + 1}`,
        center
      };
    }).filter((x) => x.center);
  } else {
    options = items.map((item, i) => {
      const center = getPlaceCoord(item.id);
      return {
        key: `point-${item.id}`,
        label: `${t('route.point', dictI18n)} ${i + 1}: ${item.name || item.id}`,
        center
      };
    }).filter((x) => x.center);
  }

  poiTargetEl.innerHTML = '';
  if (!options.length) {
    poiTargetEl.innerHTML = `<option value="">${esc(t('route.poiNoTargets', dictI18n))}</option>`;
    if (poiSummaryEl) poiSummaryEl.textContent = t('route.poiNeedRoute', dictI18n);
    return;
  }

  poiTargetEl.innerHTML = options.map((x) => `<option value="${escAttr(x.key)}">${esc(x.label)}</option>`).join('');
  poiTargetEl.dataset.targets = JSON.stringify(options);
  if (poiSummaryEl) poiSummaryEl.textContent = '';
}

async function loadNearbyPoi() {
  if (!poiTargetEl) return;
  const targets = safeParse(poiTargetEl.dataset.targets || '[]');
  const targetKey = poiTargetEl.value;
  const target = targets.find((x) => x.key === targetKey) || targets[0];
  if (!target?.center) {
    setStatus(t('route.poiNeedRoute', dictI18n), 'error');
    return;
  }

  const type = poiTypeEl?.value || 'hotel';
  const radius = Math.max(200, Math.min(10000, Number(poiRadiusEl?.value || 2000)));
  if (poiSummaryEl) poiSummaryEl.textContent = t('route.poiLoading', dictI18n);
  if (btnPoiLoad) btnPoiLoad.disabled = true;

  try {
    const items = await fetchPoi(target.center, radius, type);
    renderPoiResults(items, target.label, radius);
    setStatus(t('route.poiLoaded', dictI18n), 'success');
  } catch {
    renderPoiResults([]);
    setStatus(t('route.poiLoadError', dictI18n), 'error');
  } finally {
    if (btnPoiLoad) btnPoiLoad.disabled = false;
  }
}

/** Подпись POI из OSM: учитываем name:ru / name:en, а не только местный `name`. */
function poiNameFromOsmTags(tags, uiLang) {
  const tg = tags && typeof tags === 'object' ? tags : {};
  const pick = (keys) => {
    for (const k of keys) {
      const v = tg[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return '';
  };
  if (uiLang === 'en') {
    return pick([
      'name:en',
      'official_name:en',
      'int_name',
      'name',
      'name:ru',
      'name:be',
      'brand:en',
      'brand'
    ]);
  }
  return pick([
    'name:ru',
    'official_name:ru',
    'name:uk',
    'name',
    'name:be',
    'name:en',
    'brand:ru',
    'brand'
  ]);
}

function routeHotelListSelectSize(count) {
  const n = Number(count) || 0;
  return Math.min(Math.max(n, 4), 12);
}

function osmElementCoord(el) {
  const lat = Number(el?.lat ?? el?.center?.lat);
  const lng = Number(el?.lon ?? el?.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function runOverpassQuery(query) {
  let lastErr = null;
  for (const base of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: query
      });
      if (res.status === 429 || res.status === 504) {
        lastErr = new Error(`overpass_${res.status}`);
        await sleep(1200);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error('overpass_failed');
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('overpass_failed');
}

async function fetchPoi(center, radius, type) {
  const filters = type === 'hotel'
    ? [
        'node(around:R,LAT,LNG)[tourism=hotel];',
        'node(around:R,LAT,LNG)[tourism=guest_house];',
        'node(around:R,LAT,LNG)[tourism=motel];',
        'node(around:R,LAT,LNG)[tourism=hostel];',
        'way(around:R,LAT,LNG)[tourism=hotel];',
        'way(around:R,LAT,LNG)[tourism=guest_house];',
        'way(around:R,LAT,LNG)[tourism=motel];'
      ]
    : [
        'node(around:R,LAT,LNG)[amenity=restaurant];',
        'node(around:R,LAT,LNG)[amenity=cafe];',
        'node(around:R,LAT,LNG)[amenity=fast_food];'
      ];
  const query = `[out:json][timeout:28];(${filters.join('')});out center 60;`
    .replaceAll('R', String(radius))
    .replaceAll('LAT', String(center.lat))
    .replaceAll('LNG', String(center.lng));

  const data = await runOverpassQuery(query);
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  return elements
    .map((el) => {
      const coord = osmElementCoord(el);
      if (!coord) return null;
      const display = poiNameFromOsmTags(el?.tags, lang);
      const name = display || t('route.poiUnnamed', dictI18n);
      return {
        id: String(el?.id || `${coord.lat}:${coord.lng}`),
        name,
        lat: coord.lat,
        lng: coord.lng,
        dist: distance(center, coord),
        kind: String(el?.tags?.amenity || el?.tags?.tourism || '')
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 20);
}

async function fetchHotelsNearCenters(centers) {
  const radii = [8000, 18000, 35000, 55000];
  const byId = new Map();
  for (const center of centers) {
    for (const radius of radii) {
      const batch = await fetchPoi(center, radius, 'hotel');
      for (const h of batch) {
        if (!byId.has(h.id)) byId.set(h.id, h);
      }
      if (byId.size >= 8) break;
    }
    if (byId.size >= 12) break;
  }
  return Array.from(byId.values())
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 20);
}

function renderPoiResults(items, targetLabel = '', radius = 0) {
  if (!poiListEl || !poiSummaryEl) return;
  if (!items.length) {
    poiSummaryEl.textContent = t('route.poiEmpty', dictI18n);
    poiListEl.innerHTML = '';
    return;
  }

  const radiusText = radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`;
  poiSummaryEl.textContent = `${t('route.poiFound', dictI18n)}: ${items.length} · ${targetLabel} · ${radiusText}`;
  poiListEl.innerHTML = items.map((x) => `
    <article class="poi-item">
      <div class="poi-item__name">${esc(x.name)}</div>
      <div class="poi-item__meta">${esc(formatPoiKind(x.kind))} · ${x.dist.toFixed(2)} km</div>
      <div class="poi-item__actions">
        <a class="btn btn--outline btn--sm" href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lng}#map=17/${x.lat}/${x.lng}" target="_blank" rel="noopener">
          ${esc(t('route.poiOpenOsm', dictI18n))}
        </a>
      </div>
    </article>
  `).join('');
}

function calcDayCenter(chunk) {
  const coords = chunk.map((x) => getPlaceCoord(x.id)).filter(Boolean);
  if (!coords.length) return null;
  const sum = coords.reduce((acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
}

function formatPoiKind(kind) {
  if (kind === 'hotel') return t('route.poiTypeHotel', dictI18n);
  if (kind === 'restaurant' || kind === 'cafe' || kind === 'fast_food') return t('route.poiTypeFood', dictI18n);
  return kind || t('route.poiType', dictI18n);
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function requestApiOrder(nodes) {
  const points = [];
  const meta = [];
  const start = getStartCoord();
  const useHotelEnd = endModeEl?.value === 'hotel' && endHotelPoint;
  const useAddressEnd = endModeEl?.value === 'address' && endAddressPoint;
  if (start) {
    points.push(`${start.lng},${start.lat}`);
    meta.push({ type: 'start' });
  }
  nodes.forEach((n) => {
    points.push(`${n.coord.lng},${n.coord.lat}`);
    meta.push({ type: 'place', id: n.id });
  });
  if (useHotelEnd) {
    points.push(`${endHotelPoint.lng},${endHotelPoint.lat}`);
    meta.push({ type: 'end_hotel' });
  } else if (useAddressEnd) {
    points.push(`${endAddressPoint.lng},${endAddressPoint.lat}`);
    meta.push({ type: 'end_address' });
  }

  const src = start ? 'first' : 'any';
  const dst = useHotelEnd || useAddressEnd ? 'last' : 'any';
  const tripQs = `overview=false&steps=false&roundtrip=false&source=${encodeURIComponent(src)}&destination=${encodeURIComponent(dst)}`;
  const data = await fetchOsrmJsonWithFallback({
    service: 'trip',
    profile: 'driving',
    coordPath: points.join(';'),
    qs: tripQs
  });
  if (!data || !Array.isArray(data?.waypoints)) throw new Error('routing_api_failed');
  const waypoints = Array.isArray(data?.waypoints) ? data.waypoints : [];
  const ordered = waypoints
    .slice()
    .sort((a, b) => Number(a?.waypoint_index || 0) - Number(b?.waypoint_index || 0))
    .map((x) => meta[Number(x?.waypoint_index || 0)])
    .filter((x) => x?.type === 'place')
    .map((x) => x.id);
  return ordered;
}

function bindDnDReorder() {
  const cards = Array.from(listEl.querySelectorAll('.route-item[data-route-id]'));
  if (!cards.length) return;
  let dragId = '';
  const clearDropState = () => cards.forEach((el) => el.classList.remove('is-drop-target'));

  cards.forEach((card) => {
    card.addEventListener('dragstart', () => {
      dragId = card.getAttribute('data-route-id') || '';
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      clearDropState();
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      const overId = card.getAttribute('data-route-id') || '';
      if (!dragId || dragId === overId) return;
      clearDropState();
      card.classList.add('is-drop-target');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetId = card.getAttribute('data-route-id') || '';
      if (!dragId || !targetId || dragId === targetId) return;
      const trip = getTrip();
      const items = (trip.items || []).slice();
      const from = items.findIndex((x) => String(x.id) === String(dragId));
      const to = items.findIndex((x) => String(x.id) === String(targetId));
      if (from < 0 || to < 0) return;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      reorderDayAssignments(from, to);
      setTripItems(items);
      render();
      renderSummary();
      renderDayPlan();
      renderPoiTargets();
      setStatus(t('route.reordered', dictI18n), 'success');
    });
  });
}

function fixLeafletDefaultIcons() {
  const base = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/';
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: `${base}marker-icon-2x.png`,
    iconUrl: `${base}marker-icon.png`,
    shadowUrl: `${base}marker-shadow.png`
  });
}

async function initRouteMap() {
  if (!routeMapEl) return;
  if (!L || typeof L.map !== 'function') {
    const raw = t('route.leafletLoadError', dictI18n);
    const msg =
      raw && raw !== 'route.leafletLoadError'
        ? raw
        : 'Карта не загрузилась (библиотека карты недоступна). Обновите страницу или проверьте блокировщики и сеть.';
    routeMapEl.innerHTML = `<div style="padding:14px;color:var(--c-text-muted);font-size:.9rem">${msg}</div>`;
    return;
  }
  fixLeafletDefaultIcons();
  const rcInit = getRouteCoords();
  routeMap = L.map(routeMapEl, {
    zoomControl: true,
    attributionControl: false
  });
  if (rcInit.length >= 2) {
    const b0 = L.latLngBounds(rcInit.map((x) => [x.lat, x.lng]));
    routeMap.fitBounds(b0.pad(0.14), { maxZoom: 15, animate: false });
  } else if (rcInit.length === 1) {
    routeMap.setView([rcInit[0].lat, rcInit[0].lng], 13);
  } else {
    routeMap.setView([53.9, 27.56], 11);
  }
  // Use raster tiles by default for maximum reliability.
  // Some environments load MapLibre but fail to render WebGL, resulting in a blank map without console errors.
  const primaryTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: ''
  });
  primaryTiles.addTo(routeMap);

  let currentRaster = primaryTiles;
  let tileErr = 0;
  primaryTiles.on('tileerror', () => {
    tileErr += 1;
    if (tileErr === 6) {
      try {
        currentRaster.remove();
      } catch {}
      currentRaster = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: 'abc',
        attribution: ''
      }).addTo(routeMap);
    }
  });

  // Векторный Liberty на странице маршрута отключён: с маркерами/полилинией даёт дёрганье при pan.
  // Подложка — только растр Carto (+ fallback OSM).

  requestAnimationFrame(() => {
    routeMap.invalidateSize(true);
    setTimeout(() => routeMap.invalidateSize(true), 260);
  });
  updateMap();
}

function routeCoordsFingerprint(coords) {
  return (coords || [])
    .map((c) => `${Number(c.lat).toFixed(5)},${Number(c.lng).toFixed(5)}`)
    .join('|');
}

function polylinesStillOnMap() {
  return routeMapPolylineLayers.some((layer) => {
    try {
      return routeMap?.hasLayer(layer);
    } catch {
      return false;
    }
  });
}

/** Прямая «хорда» между точками — не считаем готовым маршрутом по дорогам. */
function hasValidRoadGeometry() {
  if (!routeAlternativesCache?.length) return false;
  const alt = routeAlternativesCache[selectedRouteAlternativeIndex] ?? routeAlternativesCache[0];
  const n = alt?.latLngs?.length ?? 0;
  if (n < 4) return false;
  if (n >= 12) return true;
  const pathKm = polylinePathKm(alt.latLngs);
  const chordKm = routeDistance(
    lastRouteCoordsForMap.map((c) => ({ coord: { lat: c.lat, lng: c.lng } })),
    null,
    null
  );
  return chordKm > 0 && pathKm / chordKm > 1.06;
}

function refreshRouteMarkers(routeCoords) {
  routeMapMarkers.forEach((m) => m.remove());
  routeMapMarkers = [];
  (routeCoords || []).forEach((point, idx) => {
    const marker = L.marker([point.lat, point.lng]).addTo(routeMap);
    marker.bindTooltip(`${idx + 1}. ${point.label}`);
    routeMapMarkers.push(marker);
  });
}

function addAlternativePolylinesToMap(alternatives) {
  clearRoutePolylines();
  (alternatives || []).forEach((alt, idx) => {
    const poly = L.polyline(alt.latLngs, {
      color: '#94a3b8',
      weight: 3,
      opacity: 0.42,
      dashArray: '10 14',
      interactive: true
    });
    poly.on('click', () => selectRouteAlternative(idx));
    poly.addTo(routeMap);
    routeMapPolylineLayers.push(poly);
    const hit = L.polyline(alt.latLngs, {
      color: '#000',
      weight: 20,
      opacity: 0.01,
      interactive: true
    });
    hit.on('click', () => selectRouteAlternative(idx));
    hit.addTo(routeMap);
    routeMapHitLayers.push(hit);
  });
}

/** Переклеить линии из кэша, если Leaflet их сбросил (resize / alt-tab). */
function repaintRouteFromCache() {
  if (!routeMap || !routeAlternativesCache?.length || !lastRouteCoordsForMap?.length) return;
  if (polylinesStillOnMap()) {
    applyRouteAlternativeStyles();
    refreshLegMarkersForSelection();
    return;
  }
  addAlternativePolylinesToMap(routeAlternativesCache);
  applyRouteAlternativeStyles();
  renderRouteAltPicker();
  try {
    const bounds = boundsCoveringAlternatives(routeAlternativesCache, lastRouteCoordsForMap);
    routeMap.fitBounds(bounds.pad(0.15), { animate: false });
  } catch {}
  refreshLegMarkersForSelection();
}

/** Только layout карты — без OSRM и без сброса линий. */
function refreshMapLayoutOnly() {
  if (!routeMap) return;
  routeMap.invalidateSize(true);
  try {
    routeMap.panBy([0, 0], { animate: false });
  } catch {}
  const routeCoords = getRouteCoords();
  const fp = routeCoordsFingerprint(routeCoords);
  if (fp && fp === lastRouteCoordsFingerprint && hasValidRoadGeometry()) {
    repaintRouteFromCache();
    return;
  }
  if (routeCoords.length) updateMap({ force: !hasValidRoadGeometry() });
}

function scheduleMapLayoutRefresh(delayMs = 140) {
  clearTimeout(mapLayoutRefreshTimer);
  mapLayoutRefreshTimer = setTimeout(refreshMapLayoutOnly, delayMs);
}

function ensureRouteMapVisibleFix() {
  if (!routeMapEl) return;

  window.addEventListener('pageshow', () => scheduleMapLayoutRefresh(80));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleMapLayoutRefresh(80);
  });

  window.addEventListener('resize', () => scheduleMapLayoutRefresh(160), { passive: true });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      const entry = entries && entries[0];
      if (!entry?.isIntersecting) return;
      scheduleMapLayoutRefresh(80);
      io.disconnect();
    }, { threshold: 0.15 });
    io.observe(routeMapEl);
  } else {
    scheduleMapLayoutRefresh(300);
  }
}

function dedupeAdjacentWaypoints(points) {
  const out = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && prev.lat === p.lat && prev.lng === p.lng) continue;
    out.push(p);
  }
  return out;
}

function nearlySameLatLngPair(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-5 && Math.abs(a[1] - b[1]) < 1e-5;
}

function osrmRouteToAlt(route) {
  if (!route?.geometry?.coordinates?.length) return null;
  return {
    latLngs: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceM: Number(route.distance),
    durationS: Number(route.duration)
  };
}

async function fetchOsrmFullRoute(points, options = {}) {
  if (points.length < 2) return null;
  const coordPath = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const qs = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    continue_straight: options.continueStraight !== false ? 'true' : 'false',
    alternatives: 'false'
  });
  const data = await fetchOsrmJsonWithFallback({
    service: 'route',
    profile: options.profile || ROUTE_PROFILE_DRIVING,
    coordPath,
    qs: qs.toString()
  });
  if (!data || data.code !== 'Ok' || !data.routes?.[0]) return null;
  const alt = osrmRouteToAlt(data.routes[0]);
  return alt?.latLngs?.length >= 2 ? alt : null;
}

async function fetchOsrmLeg(from, to, profile) {
  const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const qs = 'overview=full&geometries=geojson&continue_straight=true';
  const data = await fetchOsrmJsonWithFallback({ service: 'route', profile, coordPath, qs });
  if (!data || data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) return null;
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

/** Маршрут по отрезкам A→B (часто отличается от одного OSRM-запроса со всеми via). */
async function fetchRoadPolylineRoute(points, options = {}) {
  if (points.length < 2) return null;
  const continueStraight = options.continueStraight !== false;
  const merged = [];
  let distanceM = 0;
  let durationS = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const coordPath = `${a.lng},${a.lat};${b.lng},${b.lat}`;
    const qs = `overview=full&geometries=geojson&continue_straight=${continueStraight ? 'true' : 'false'}&alternatives=false`;
    const data = await fetchOsrmJsonWithFallback({
      service: 'route',
      profile: ROUTE_PROFILE_DRIVING,
      coordPath,
      qs
    });
    const route = data?.routes?.[0];
    const leg = route ? osrmRouteToAlt(route) : null;
    if (!leg?.latLngs?.length) return null;
    distanceM += Number(leg.distanceM) || 0;
    durationS += Number(leg.durationS) || 0;
    let coords = leg.latLngs;
    if (merged.length) {
      const prev = merged[merged.length - 1];
      const head = coords[0];
      if (nearlySameLatLngPair(prev, head)) coords = coords.slice(1);
    }
    merged.push(...coords);
  }
  if (merged.length < 2) return null;
  return { latLngs: merged, distanceM, durationS };
}

/** Запрос по каждому отрезку A→B: один общий запрос с несколькими via часто даёт «развороты под машину»
 * на двухполосных улицах; пеший профиль обычно ближе к «просто по улицам» для прогулок. */
async function fetchRoadPolyline(points) {
  if (points.length < 2) return null;
  const merged = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const legRaw = await fetchOsrmLeg(a, b, ROUTE_PROFILE_DRIVING);
    if (!legRaw?.length) return null;
    let leg = legRaw;
    if (merged.length) {
      const prev = merged[merged.length - 1];
      const head = leg[0];
      if (nearlySameLatLngPair(prev, head)) leg = leg.slice(1);
    }
    merged.push(...leg);
  }
  return merged.length >= 2 ? merged : null;
}

async function fetchOsrmAlternativeRoutes(points, profile, options = {}) {
  if (points.length < 2) return [];
  const coordPath = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const altCount = Math.min(3, options.altCount ?? 3);
  const continueStraight = options.continueStraight !== false;
  const qs = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    continue_straight: continueStraight ? 'true' : 'false',
    alternatives: String(altCount)
  });
  const data = await fetchOsrmJsonWithFallback({ service: 'route', profile, coordPath, qs: qs.toString() });
  if (!data || data.code !== 'Ok' || !Array.isArray(data.routes)) return [];
  return data.routes
    .filter((r) => r.geometry?.coordinates?.length)
    .map((r) => ({
      latLngs: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceM: Number(r.distance),
      durationS: Number(r.duration)
    }))
    .filter((x) => x.latLngs.length >= 2);
}

function endpointSupportsProfile(ep, profile) {
  if (!ep?.base) return false;
  if (ep.base.includes('routing.openstreetmap.de')) {
    if (profile === 'foot') return ep.prefix === '/routed-foot';
    if (profile === 'driving') return ep.prefix === '/routed-car';
    return false;
  }
  return true;
}

function endpointsForOsrmRequest(service, profile) {
  if (service === 'trip') {
    return ROUTING_ENDPOINTS.filter(
      (ep) => ep.base.includes('routing.openstreetmap.de') && ep.prefix === '/routed-car'
    );
  }
  return ROUTING_ENDPOINTS.filter((ep) => endpointSupportsProfile(ep, profile));
}

function buildOsrmUrl(ep, service, profile, coordPath, qs) {
  const base = String(ep.base).replace(/\/+$/, '');
  const prefix = String(ep.prefix || '').replace(/\/+$/, '');
  const path = `${prefix}/${service}/v1/${profile}/${coordPath}`.replace(/\/{2,}/g, '/');
  return `${base}${path}?${qs || ''}`;
}

let lastOsrmFetchAt = 0;
/** Пауза между любыми запросами к публичному OSRM (снижает 429). */
const OSRM_MIN_INTERVAL_MS = 420;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pruneOsrmCache() {
  if (OSRM_CACHE.size <= OSRM_CACHE_MAX) return;
  const drop = OSRM_CACHE.size - OSRM_CACHE_MAX + 8;
  const it = OSRM_CACHE.keys();
  for (let i = 0; i < drop; i += 1) {
    const k = it.next().value;
    if (k == null) break;
    OSRM_CACHE.delete(k);
  }
}

function readOsrmCache(url) {
  const row = OSRM_CACHE.get(url);
  if (!row) return undefined;
  if (Date.now() - row.t > OSRM_CACHE_TTL_MS) {
    OSRM_CACHE.delete(url);
    return undefined;
  }
  return row.json;
}

function writeOsrmCache(url, json) {
  OSRM_CACHE.set(url, { t: Date.now(), json });
  pruneOsrmCache();
}

async function osrmThrottle() {
  const now = Date.now();
  const cd = osrmCooldownUntil - now;
  if (cd > 0) await sleep(Math.min(cd, 45000));
  const wait = lastOsrmFetchAt + OSRM_MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastOsrmFetchAt = Date.now();
}

async function fetchOsrmJsonWithFallback({ service, profile, coordPath, qs }) {
  const endpoints = endpointsForOsrmRequest(service, profile);
  for (const ep of endpoints) {
    const url = buildOsrmUrl(ep, service, profile, coordPath, qs);
    const cached = readOsrmCache(url);
    if (cached !== undefined) return cached;

    const inflight = OSRM_INFLIGHT.get(url);
    if (inflight) {
      const j = await inflight;
      if (j) return j;
      continue;
    }

    const promise = (async () => {
      const proxy = buildOsrmWorkerProxyUrl(url);
      const fetchUrls = [proxy, url].filter((u, i, a) => u && a.indexOf(u) === i);
      for (const fetchUrl of fetchUrls) {
        await osrmThrottle();
        try {
          const res = await fetch(fetchUrl);
          if (res.status === 429) {
            osrmCooldownUntil = Math.max(osrmCooldownUntil, Date.now() + 12000);
            return null;
          }
          if (!res.ok) continue;
          const json = await res.json();
          writeOsrmCache(url, json);
          return json;
        } catch {
          continue;
        }
      }
      return null;
    })();

    OSRM_INFLIGHT.set(url, promise);
    let out;
    try {
      out = await promise;
    } finally {
      OSRM_INFLIGHT.delete(url);
    }
    if (out) return out;
  }
  return null;
}

function polylinePathKm(latLngs) {
  if (!latLngs?.length) return 0;
  let d = 0;
  for (let i = 1; i < latLngs.length; i += 1) {
    d += haversineKm(
      { lat: latLngs[i - 1][0], lng: latLngs[i - 1][1] },
      { lat: latLngs[i][0], lng: latLngs[i][1] }
    );
  }
  return d;
}

function samplePolylinePoint(latLngs, t01) {
  if (!latLngs?.length) return null;
  if (latLngs.length === 1) {
    return { lat: latLngs[0][0], lng: latLngs[0][1] };
  }
  const t = Math.max(0, Math.min(1, Number(t01) || 0));
  const idx = t * (latLngs.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(latLngs.length - 1, lo + 1);
  const k = idx - lo;
  const a = latLngs[lo];
  const b = latLngs[hi];
  return {
    lat: a[0] + (b[0] - a[0]) * k,
    lng: a[1] + (b[1] - a[1]) * k
  };
}

function routeDivergenceStatsKm(aLatLngs, bLatLngs) {
  const samples = 13;
  let maxKm = 0;
  let sumKm = 0;
  let count = 0;
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const pa = samplePolylinePoint(aLatLngs, t);
    const pb = samplePolylinePoint(bLatLngs, t);
    if (!pa || !pb) continue;
    const d = haversineKm(pa, pb);
    if (!Number.isFinite(d)) continue;
    sumKm += d;
    count += 1;
    if (d > maxKm) maxKm = d;
  }
  return {
    maxKm,
    meanKm: count > 0 ? sumKm / count : 0
  };
}

/** Разные геометрии — не склеивать в один вариант. */
function routesGeometryDistinct(a, b) {
  if (!a?.latLngs?.length || !b?.latLngs?.length) return true;
  const la = polylinePathKm(a.latLngs);
  const lb = polylinePathKm(b.latLngs);
  if (la > 0.25 && lb > 0.25) {
    const rl = Math.abs(la - lb) / Math.max(la, lb);
    if (rl > 0.006) return true;
  }
  const dv = routeDivergenceStatsKm(a.latLngs, b.latLngs);
  if (dv.maxKm > 0.08) return true;
  if (dv.meanKm > 0.03) return true;
  const midA = a.latLngs[Math.floor(a.latLngs.length / 2)];
  const midB = b.latLngs[Math.floor(b.latLngs.length / 2)];
  return haversineKm({ lat: midA[0], lng: midA[1] }, { lat: midB[0], lng: midB[1] }) > 0.06;
}

function routesNearlyIdentical(a, b) {
  if (routesGeometryDistinct(a, b)) return false;
  const da = Number(a.distanceM);
  const db = Number(b.distanceM);
  const ta = Number(a.durationS);
  const tb = Number(b.durationS);
  if (Number.isFinite(da) && Number.isFinite(db) && da > 30 && db > 30) {
    const rd = Math.abs(da - db) / Math.max(da, db);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta > 5 && tb > 5) {
      const rt = Math.abs(ta - tb) / Math.max(ta, tb);
      if (rd < 0.02 && rt < 0.02) return true;
    } else if (rd < 0.02) return true;
  }
  return false;
}

function dedupeAlternativeRoutes(routes) {
  const out = [];
  for (const r of routes) {
    if (!out.some((o) => routesNearlyIdentical(o, r))) out.push(r);
  }
  return out;
}

function routeIdentityKey(route) {
  const latLngs = route?.latLngs || [];
  if (!latLngs.length) return 'empty';
  const picks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const sig = picks
    .map((t) => {
      const p = samplePolylinePoint(latLngs, t);
      if (!p) return 'x';
      return `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    })
    .join('|');
  const km = polylinePathKm(latLngs);
  const dur = Number(route?.durationS);
  const d = Number(route?.distanceM);
  const durPart = Number.isFinite(dur) ? dur.toFixed(1) : 'na';
  const distPart = Number.isFinite(d) ? d.toFixed(1) : km.toFixed(3);
  return `${sig}|${distPart}|${durPart}`;
}

/** Оставляем до max маршрутов: только явные дубликаты убираем. */
function selectMaxDistinctRoutes(routes, max = 5) {
  const pool = routes.filter(isPlausibleDrivingRoute);
  const uniq = [];
  const seen = new Set();
  for (const r of pool) {
    const key = routeIdentityKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(r);
  }
  uniq.sort((a, b) => (Number(a.durationS) || 1e15) - (Number(b.durationS) || 1e15));
  const out = [];
  for (const r of uniq) {
    if (out.length >= max) break;
    out.push(r);
  }
  return out;
}

function mergeRouteCandidates(list) {
  return selectMaxDistinctRoutes(list, 5);
}

function mergeLegRouteAlts(legs) {
  if (!legs?.length) return null;
  const merged = [];
  let distanceM = 0;
  let durationS = 0;
  for (const leg of legs) {
    if (!leg?.latLngs?.length) return null;
    distanceM += Number(leg.distanceM) || 0;
    durationS += Number(leg.durationS) || 0;
    let coords = leg.latLngs;
    if (merged.length) {
      const prev = merged[merged.length - 1];
      const head = coords[0];
      if (nearlySameLatLngPair(prev, head)) coords = coords.slice(1);
    }
    merged.push(...coords);
  }
  if (merged.length < 2) return null;
  return { latLngs: merged, distanceM, durationS };
}

/** Варианты по каждому отрезку A→B (работает даже при многих via). */
async function fetchPerLegRouteAlternatives(points) {
  if (points.length < 2) return [];
  const segAlts = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const pair = [points[i], points[i + 1]];
    let alts = await fetchOsrmAlternativeRoutes(pair, ROUTE_PROFILE_DRIVING, {
      altCount: 5,
      continueStraight: true
    });
    if (alts.length < 2) {
      alts.push(
        ...(await fetchOsrmAlternativeRoutes(pair, ROUTE_PROFILE_DRIVING, {
          altCount: 5,
          continueStraight: false
        }))
      );
    }
    if (!alts.length) {
      const one = await fetchOsrmFullRoute(pair, { continueStraight: true });
      if (one) alts = [one];
    }
    if (!alts.length) {
      const chord = [
        [points[i].lat, points[i].lng],
        [points[i + 1].lat, points[i + 1].lng]
      ];
      const km = haversineKm(points[i], points[i + 1]);
      alts = [{ latLngs: chord, distanceM: km * 1000, durationS: NaN }];
    }
    segAlts.push(dedupeAlternativeRoutes(alts.filter(isPlausibleDrivingRoute)));
  }

  const out = [];
  const baseLegs = segAlts.map((list) => list[0]);
  const baseRoute = mergeLegRouteAlts(baseLegs);
  if (baseRoute) out.push(baseRoute);

  const segRank = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    if (segAlts[i].length < 2) continue;
    segRank.push({
      seg: i,
      km: haversineKm(points[i], points[i + 1]),
      altCount: segAlts[i].length
    });
  }
  segRank.sort((a, b) => b.km - a.km);

  for (const { seg } of segRank) {
    for (let j = 1; j < segAlts[seg].length; j += 1) {
      const legs = segAlts.map((list, idx) => (idx === seg ? segAlts[seg][j] : list[0]));
      const variant = mergeLegRouteAlts(legs);
      if (variant) out.push(variant);
      if (out.length >= 8) return out;
    }
  }
  const topSegs = segRank.slice(0, 3).map((x) => x.seg);
  for (let i = 0; i < topSegs.length; i += 1) {
    for (let j = i + 1; j < topSegs.length; j += 1) {
      const a = topSegs[i];
      const b = topSegs[j];
      const altA = segAlts[a]?.[1];
      const altB = segAlts[b]?.[1];
      if (!altA || !altB) continue;
      const legs = segAlts.map((list, idx) => {
        if (idx === a) return altA;
        if (idx === b) return altB;
        return list[0];
      });
      const variant = mergeLegRouteAlts(legs);
      if (variant) out.push(variant);
      if (out.length >= 10) return out;
    }
  }
  for (let i = 0; i < topSegs.length; i += 1) {
    const a = topSegs[i];
    const altsA = segAlts[a] || [];
    for (let j = 1; j < altsA.length; j += 1) {
      const altA = altsA[j];
      if (!altA) continue;
      const legs = segAlts.map((list, idx) => (idx === a ? altA : list[0]));
      const variant = mergeLegRouteAlts(legs);
      if (variant) out.push(variant);
      if (out.length >= 12) return out;
    }
  }
  return out;
}

async function fetchRouteAlternativesForMap(points) {
  const candidates = [];
  candidates.push(
    ...(await fetchOsrmAlternativeRoutes(points, ROUTE_PROFILE_DRIVING, {
      altCount: 5,
      continueStraight: true
    }))
  );
  if (!candidates.length) {
    const fullStrict = await fetchOsrmFullRoute(points, { continueStraight: true });
    if (fullStrict) candidates.push(fullStrict);
  }
  if (candidates.length < 2) {
    candidates.push(
      ...(await fetchOsrmAlternativeRoutes(points, ROUTE_PROFILE_DRIVING, {
        altCount: 5,
        continueStraight: false
      }))
    );
  }
  const merged = mergeRouteCandidates(candidates);
  if (merged.length > 0) return merged;
  const fallbackMerged = await fetchRoadPolylineRoute(points, { continueStraight: true });
  if (fallbackMerged) return [fallbackMerged];
  return [];
}

async function fetchRouteAlternativesDeep(points, seed = []) {
  const candidates = [];
  candidates.push(...(seed || []));

  const byLegsStrict = await fetchRoadPolylineRoute(points, { continueStraight: true });
  const byLegsFlexible = await fetchRoadPolylineRoute(points, { continueStraight: false });
  const fullStrict = await fetchOsrmFullRoute(points, { continueStraight: true });
  const fullFlexible = await fetchOsrmFullRoute(points, { continueStraight: false });
  if (byLegsStrict) candidates.push(byLegsStrict);
  if (byLegsFlexible) candidates.push(byLegsFlexible);
  if (fullStrict) candidates.push(fullStrict);
  if (fullFlexible) candidates.push(fullFlexible);

  candidates.push(
    ...(await fetchOsrmAlternativeRoutes(points, ROUTE_PROFILE_DRIVING, {
      altCount: 5,
      continueStraight: true
    }))
  );
  candidates.push(
    ...(await fetchOsrmAlternativeRoutes(points, ROUTE_PROFILE_DRIVING, {
      altCount: 5,
      continueStraight: false
    }))
  );

  candidates.push(...(await fetchPerLegRouteAlternatives(points)));

  const merged = mergeRouteCandidates(candidates);
  if (merged.length > 0) return merged;

  const fallbackMerged = await fetchRoadPolyline(points);
  if (fallbackMerged?.length >= 2) {
    return [{ latLngs: fallbackMerged, distanceM: NaN, durationS: NaN }];
  }
  return [];
}

function clearRoutePolylines() {
  routeMapPolylineLayers.forEach((layer) => layer.remove());
  routeMapPolylineLayers = [];
  routeMapHitLayers.forEach((layer) => layer.remove());
  routeMapHitLayers = [];
}

function clearLegMarkers() {
  routeLegMarkers.forEach((m) => m.remove());
  routeLegMarkers = [];
}

function legTooltipLabel(legIndexZero) {
  const leg = legIndexZero + 1;
  const from = legIndexZero + 1;
  const to = legIndexZero + 2;
  return String(t('route.legTooltip', dictI18n))
    .replace('{leg}', String(leg))
    .replace('{from}', String(from))
    .replace('{to}', String(to));
}

function makeLegBadgeIcon(num) {
  return L.divIcon({
    className: 'route-leg-badge',
    html: `<span class="route-leg-badge__n">${num}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function nearestPolylineVertexIndex(latLngs, lat, lng) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < latLngs.length; i += 1) {
    const d = (latLngs[i][0] - lat) ** 2 + (latLngs[i][1] - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function monotonicVertexIndicesForWaypoints(latLngs, waypointObjs) {
  const idx = waypointObjs.map((w) => nearestPolylineVertexIndex(latLngs, w.lat, w.lng));
  for (let i = 1; i < idx.length; i += 1) {
    if (idx[i] < idx[i - 1]) idx[i] = idx[i - 1];
  }
  return idx;
}

function renderLegMarkersAlongPolyline(routeCoordObjs, latLngs) {
  clearLegMarkers();
  if (!routeMap || !latLngs?.length || routeCoordObjs.length < 2) return;
  const idx = monotonicVertexIndicesForWaypoints(latLngs, routeCoordObjs);
  for (let leg = 0; leg < idx.length - 1; leg += 1) {
    const a = idx[leg];
    const b = idx[leg + 1];
    if (b <= a) continue;
    const mid = Math.floor((a + b) / 2);
    const [mlat, mlng] = latLngs[mid];
    const m = L.marker([mlat, mlng], {
      icon: makeLegBadgeIcon(leg + 1),
      interactive: true,
      zIndexOffset: 700
    });
    m.bindTooltip(legTooltipLabel(leg));
    m.addTo(routeMap);
    routeLegMarkers.push(m);
  }
}

function renderLegMarkersStraightChord(routeCoordObjs) {
  clearLegMarkers();
  if (!routeMap || routeCoordObjs.length < 2) return;
  for (let leg = 0; leg < routeCoordObjs.length - 1; leg += 1) {
    const p = routeCoordObjs[leg];
    const q = routeCoordObjs[leg + 1];
    const mlat = (p.lat + q.lat) / 2;
    const mlng = (p.lng + q.lng) / 2;
    const m = L.marker([mlat, mlng], {
      icon: makeLegBadgeIcon(leg + 1),
      interactive: true,
      zIndexOffset: 700
    });
    m.bindTooltip(legTooltipLabel(leg));
    m.addTo(routeMap);
    routeLegMarkers.push(m);
  }
}

function refreshLegMarkersForSelection() {
  const coords = lastRouteCoordsForMap;
  if (!coords?.length || coords.length < 2 || !routeMap) return;
  const alt = routeAlternativesCache[selectedRouteAlternativeIndex];
  if (alt?.latLngs?.length >= 2) {
    renderLegMarkersAlongPolyline(coords, alt.latLngs);
    return;
  }
  renderLegMarkersStraightChord(coords);
}

function formatAltChipLabel(alt, idx) {
  const parts = [`${t('route.altVariant', dictI18n)} ${idx + 1}`];
  if (Number.isFinite(alt.distanceM)) {
    parts.push(`${(alt.distanceM / 1000).toFixed(1)} ${t('route.altKmSuffix', dictI18n)}`);
  }
  if (Number.isFinite(alt.durationS)) {
    const dur = formatRouteDuration(alt.durationS);
    if (dur) parts.push(dur);
  }
  return parts.join(' · ');
}

function boundsCoveringAlternatives(alts, routeCoordObjs) {
  const b = L.latLngBounds(routeCoordObjs.map((x) => [x.lat, x.lng]));
  alts.forEach((alt) => {
    alt.latLngs.forEach((ll) => b.extend(ll));
  });
  return b;
}

function applyRouteAlternativeStyles() {
  routeMapPolylineLayers.forEach((layer, idx) => {
    const isSel = idx === selectedRouteAlternativeIndex;
    layer.setStyle({
      color: isSel ? '#1f5ec2' : '#94a3b8',
      weight: isSel ? 5 : 3,
      opacity: isSel ? 0.92 : 0.42,
      dashArray: isSel ? null : '10 14'
    });
    if (isSel && routeMap) layer.bringToFront();
  });
  routeMapHitLayers.forEach((layer, idx) => {
    const isSel = idx === selectedRouteAlternativeIndex;
    layer.setStyle({ weight: isSel ? 28 : 22, opacity: 0.01 });
    if (isSel && routeMap) layer.bringToFront();
  });
  const selectedVisible = routeMapPolylineLayers[selectedRouteAlternativeIndex];
  if (selectedVisible && routeMap) selectedVisible.bringToFront();
}

function renderRouteAltPicker() {
  if (!routeAltPickerEl || !routeAltSectionEl) return;
  const alts = routeAlternativesCache;
  if (!alts?.length || alts.length <= 1) {
    routeAltSectionEl.classList.add('hidden');
    routeAltPickerEl.innerHTML = '';
    return;
  }
  routeAltSectionEl.classList.remove('hidden');
  routeAltPickerEl.setAttribute('aria-label', t('route.altAriaGroup', dictI18n));
  routeAltPickerEl.innerHTML = '';
  alts.forEach((alt, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `route-alt-chip${idx === selectedRouteAlternativeIndex ? ' is-active' : ''}`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', idx === selectedRouteAlternativeIndex ? 'true' : 'false');
    btn.textContent = formatAltChipLabel(alt, idx);
    btn.addEventListener('click', () => selectRouteAlternative(idx));
    routeAltPickerEl.appendChild(btn);
  });
}

function selectRouteAlternative(idx) {
  if (!routeAlternativesCache[idx]) return;
  selectedRouteAlternativeIndex = idx;
  applyRouteAlternativeStyles();
  renderRouteAltPicker();
  refreshLegMarkersForSelection();
}

async function paintStraightFallback(latLngs, gen, waypointBounds, pts) {
  if (gen !== routeMapGeometryGen) return;

  if (pts?.length >= 2) {
    const road = await fetchRoadPolylineRoute(pts);
    if (road && gen === routeMapGeometryGen) {
      routeAlternativesCache = [road];
      addAlternativePolylinesToMap([road]);
      routeAltSectionEl?.classList.add('hidden');
      if (routeAltPickerEl) routeAltPickerEl.innerHTML = '';
      try {
        routeMap.fitBounds(waypointBounds.pad(0.15), { animate: false });
      } catch {}
      refreshLegMarkersForSelection();
      return;
    }
  }

  clearRoutePolylines();
  routeAlternativesCache = [];
  routeAltSectionEl?.classList.add('hidden');
  if (routeAltPickerEl) routeAltPickerEl.innerHTML = '';
  if (latLngs.length >= 2) {
    const poly = L.polyline(latLngs, {
      color: '#1f5ec2',
      weight: 4,
      opacity: 0.9,
      dashArray: '8 10'
    }).addTo(routeMap);
    routeMapPolylineLayers.push(poly);
  }
  routeMap.fitBounds(waypointBounds.pad(0.15), { animate: false });
  renderLegMarkersStraightChord(lastRouteCoordsForMap);
}

function updateMap(options = {}) {
  if (!routeMap || !L) return;
  const force = options.force === true;

  const routeCoords = getRouteCoords();
  const fp = routeCoordsFingerprint(routeCoords);
  if (!routeCoords.length) {
    lastRouteCoordsFingerprint = '';
    routeMapMarkers.forEach((m) => m.remove());
    routeMapMarkers = [];
    clearRoutePolylines();
    clearLegMarkers();
    routeAlternativesCache = [];
    routeAltSectionEl?.classList.add('hidden');
    if (routeAltPickerEl) routeAltPickerEl.innerHTML = '';
    lastRouteCoordsForMap = [];
    return;
  }

  if (!force && fp === lastRouteCoordsFingerprint && hasValidRoadGeometry()) {
    lastRouteCoordsForMap = routeCoords;
    refreshRouteMarkers(routeCoords);
    repaintRouteFromCache();
    return;
  }

  lastRouteCoordsFingerprint = fp;
  routeMapGeometryGen += 1;
  const gen = routeMapGeometryGen;

  lastRouteCoordsForMap = routeCoords;
  refreshRouteMarkers(routeCoords);
  clearLegMarkers();
  routeAltSectionEl?.classList.add('hidden');
  if (routeAltPickerEl) routeAltPickerEl.innerHTML = '';

  const waypointBounds = L.latLngBounds(routeCoords.map((x) => [x.lat, x.lng]));
  const straightLatLngs = routeCoords.map((x) => [x.lat, x.lng]);

  if (routeCoords.length < 2) {
    clearRoutePolylines();
    routeAlternativesCache = [];
    routeMap.fitBounds(waypointBounds.pad(0.15), { animate: false });
    clearLegMarkers();
    return;
  }

  const pts = dedupeAdjacentWaypoints(routeCoords.map((x) => ({ lat: x.lat, lng: x.lng })));
  if (pts.length < 2) {
    paintStraightFallback(straightLatLngs, gen, waypointBounds, pts);
    return;
  }

  try {
    routeMap.fitBounds(waypointBounds.pad(0.12), { maxZoom: 16, animate: false });
  } catch {}

  clearTimeout(routeGeometryDebounceTimer);
  const runGen = gen;
  routeGeometryDebounceTimer = setTimeout(() => {
    routeGeometryDebounceTimer = null;
    if (runGen !== routeMapGeometryGen) return;
    fetchRouteAlternativesForMap(pts)
      .then(async (alternatives) => {
        if (runGen !== routeMapGeometryGen) return;
        selectedRouteAlternativeIndex = 0;
        if (!alternatives?.length) {
          await paintStraightFallback(straightLatLngs, runGen, waypointBounds, pts);
          return;
        }
        routeAlternativesCache = alternatives;
        addAlternativePolylinesToMap(alternatives);
        applyRouteAlternativeStyles();
        renderRouteAltPicker();
        const bounds = boundsCoveringAlternatives(alternatives, routeCoords);
        routeMap.fitBounds(bounds.pad(0.15), { animate: false });
        refreshLegMarkersForSelection();
        fetchRouteAlternativesDeep(pts, alternatives)
          .then((enriched) => {
            if (runGen !== routeMapGeometryGen) return;
            if (!enriched?.length) return;
            if (enriched.length <= routeAlternativesCache.length) return;
            routeAlternativesCache = enriched;
            selectedRouteAlternativeIndex = Math.min(selectedRouteAlternativeIndex, enriched.length - 1);
            addAlternativePolylinesToMap(enriched);
            applyRouteAlternativeStyles();
            renderRouteAltPicker();
            refreshLegMarkersForSelection();
          })
          .catch(() => {});
      })
      .catch(async () => {
        if (runGen !== routeMapGeometryGen) return;
        await paintStraightFallback(straightLatLngs, runGen, waypointBounds, pts);
      });
  }, 140);
}

function getRouteCoords() {
  const trip = getTrip();
  const out = [];
  const start = getStartCoord();
  const sm = startModeEl?.value;
  if (start) {
    let startLabel = t('route.startGeo', dictI18n);
    if (sm === 'address') startLabel = start.label || t('route.startAddress', dictI18n);
    out.push({ lat: start.lat, lng: start.lng, label: startLabel });
  }

  const items = trip.items || [];
  const dayCount = getRouteDayCount();

  if (dayCount <= 1 || !items.length) {
    items.forEach((item, i) => {
      const coord = getPlaceCoord(item.id);
      if (!coord) return;
      out.push({
        lat: coord.lat,
        lng: coord.lng,
        label: `${t('route.point', dictI18n)} ${i + 1}: ${item.name || item.id}`
      });
    });
  } else {
    syncOvernightSlots();
    ensureDayAssignments();
    const chunks = buildDayChunks(items, dayCount, dayAssignments);
    let pi = 0;
    chunks.forEach((chunk, chunkIdx) => {
      chunk.forEach((item) => {
        const coord = getPlaceCoord(item.id);
        if (!coord) return;
        pi += 1;
        out.push({
          lat: coord.lat,
          lng: coord.lng,
          label: `${t('route.point', dictI18n)} ${pi}: ${item.name || item.id}`
        });
      });
      if (chunkIdx < dayCount - 1) {
        const night = overnightStops[chunkIdx];
        if (night && Number.isFinite(night.lat) && Number.isFinite(night.lng)) {
          out.push({
            lat: night.lat,
            lng: night.lng,
            label: `${t('route.nightStopLabel', dictI18n)}: ${night.name || t('route.poiUnnamed', dictI18n)}`
          });
        }
      }
    });
  }

  if (!out.length) return out;
  if (endModeEl?.value === 'return' && start) {
    out.push({ lat: start.lat, lng: start.lng, label: t('route.endReturn', dictI18n) });
  } else if (endModeEl?.value === 'hotel' && endHotelPoint) {
    out.push({ lat: endHotelPoint.lat, lng: endHotelPoint.lng, label: endHotelPoint.name || t('route.endHotel', dictI18n) });
  } else if (endModeEl?.value === 'address' && endAddressPoint) {
    out.push({
      lat: endAddressPoint.lat,
      lng: endAddressPoint.lng,
      label: endAddressPoint.label || t('route.endAddress', dictI18n)
    });
  }
  return out;
}


function estimateChunkDistance(chunk, start, end) {
  const nodes = chunk
    .map((x) => ({ coord: getPlaceCoord(x.id) }))
    .filter((x) => x.coord);
  return routeDistance(nodes, start || null, end || null);
}

function estimateChunkDurationSec(chunk, start, end) {
  const km = estimateChunkDistance(chunk, start, end);
  if (!Number.isFinite(km) || km <= 0) return NaN;
  return (km / AVG_DRIVE_KMH) * 3600;
}

function getLastCoord(chunk) {
  for (let i = chunk.length - 1; i >= 0; i -= 1) {
    const c = getPlaceCoord(chunk[i].id);
    if (c) return c;
  }
  return null;
}

function openInGoogleMaps() {
  const trip = getTrip();
  const coords = (trip.items || [])
    .map((x) => getPlaceCoord(x.id))
    .filter(Boolean);
  if (!coords.length) {
    setStatus(t('route.optimizeNeedCoords', dictI18n), 'error');
    return;
  }
  const startCoord = getStartCoord();
  let destination = coords[coords.length - 1];
  const origin = startCoord || coords[0];
  let waypoints = coords.slice(1, -1).map((c) => `${c.lat},${c.lng}`).join('|');
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  if (endModeEl?.value === 'hotel' && endHotelPoint) {
    const lastCoord = coords[coords.length - 1];
    if (lastCoord) {
      waypoints = waypoints ? `${waypoints}|${lastCoord.lat},${lastCoord.lng}` : `${lastCoord.lat},${lastCoord.lng}`;
    }
    destination = endHotelPoint;
  } else if (endModeEl?.value === 'address' && endAddressPoint) {
    const lastCoord = coords[coords.length - 1];
    if (lastCoord) {
      waypoints = waypoints ? `${waypoints}|${lastCoord.lat},${lastCoord.lng}` : `${lastCoord.lat},${lastCoord.lng}`;
    }
    destination = endAddressPoint;
  }
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  if (waypoints) url.searchParams.set('waypoints', waypoints);
  if (endModeEl?.value === 'return' && startCoord) {
    const wp = waypoints ? `${waypoints}|${destination.lat},${destination.lng}` : `${destination.lat},${destination.lng}`;
    url.searchParams.set('destination', `${startCoord.lat},${startCoord.lng}`);
    url.searchParams.set('waypoints', wp);
  }
  window.open(url.toString(), '_blank', 'noopener');
}

function getEndPoint() {
  const start = getStartCoord();
  if (endModeEl?.value === 'return' && start) return start;
  if (endModeEl?.value === 'hotel' && endHotelPoint) return endHotelPoint;
  if (endModeEl?.value === 'address' && endAddressPoint) return endAddressPoint;
  return null;
}

function setStatus(text, type = '') {
  statusEl.textContent = text;
  const base = 'user-status';
  statusEl.className = type ? `${base} ${type}` : base;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return esc(str).replace(/`/g, '&#96;');
}

