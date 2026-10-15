import { initNav } from '../../../js/shared/nav.js';
import { getPlaces, addPlace, updatePlace, deletePlace, deriveCityFromAddress } from '../../../js/shared/places.js';
import { uploadImages, uploadModel, validatePhotoUploadFile } from '../../../js/shared/media-upload.js';
import { resolveMediaPublicUrl, bindMediaImageErrorHint } from '../../../js/shared/media-worker-url.js';
import { uploadFilenameNeedsFix, uploadFilenameUserHint } from '../../../js/shared/upload-filename.js';
import { showToast } from '../../../js/shared/utils.js';
import { getLang, loadDict, t } from '../../../js/shared/i18n.js';
import { bindAdminLogout, gateAdmin } from '../shared/admin-guard.js';
import { ensureLeafletReady } from '../../../js/shared/load-leaflet.js';

initNav('../../');
bindAdminLogout();

let dict = null;
loadDict(getLang()).then(d => { dict = d; }).catch(() => {});
const tp = (key, fallback) => (dict ? t(key, dict) : null) || fallback;

gateAdmin(async () => {

// ── state ─────────────────────────────────────────────────────────────────

let places           = [];
let editingId        = null;
/** @type {{ type: 'url', url: string } | { type: 'file', file: File, blobUrl?: string }}[]} */
let photoSlots       = [];
let modelFile        = null;
let existingModelUrl = null;
let existingSketchfabUrl = null;
let currentModelType = 'file';    // 'file' | 'sketchfab'
let currentTags      = [];
let currentTagsEn    = [];
let currentTagsBe    = [];
let pickerMap        = null;
let pickerMarker     = null;
/** @type {null | 'coords' | 'map'} */
let locationSyncSource = null;
let coordInputDebounce = null;
const COORD_SYNC_DEBOUNCE_MS = 500;

// ── createdOn controls ────────────────────────────────────────────────────

const cpYear   = document.getElementById('cp-year');
const cpMonth  = document.getElementById('cp-month');
const cpDay    = document.getElementById('cp-day');
const cYear    = document.getElementById('f-created-year');
const cMonth   = document.getElementById('f-created-month');
const cDay     = document.getElementById('f-created-day');
const cDisplay = document.getElementById('f-created-display');
const cManual = document.getElementById('f-created-manual');
const cManualError = document.getElementById('f-created-manual-error');
const cDayPicker = document.getElementById('f-created-day-picker');
let fullDatePicker = null;

const fNameRu = document.getElementById('f-name-ru');
const fNameEn = document.getElementById('f-name-en');
const fNameBe = document.getElementById('f-name-be');
const fAddressRu = document.getElementById('f-address-ru');
const fAddressEn = document.getElementById('f-address-en');
const fAddressBe = document.getElementById('f-address-be');
const fCityRu = document.getElementById('f-city-ru');
const fCityEn = document.getElementById('f-city-en');
const fCityBe = document.getElementById('f-city-be');
const fLat = document.getElementById('f-lat');
const fLng = document.getElementById('f-lng');
const coordHintEl = document.getElementById('coord-hint');
const fOpeningAddressRu = document.getElementById('f-opening-address-ru');
const fOpeningAddressEn = document.getElementById('f-opening-address-en');
const fOpeningAddressBe = document.getElementById('f-opening-address-be');
const fAuthorRu = document.getElementById('f-author-ru');
const fAuthorEn = document.getElementById('f-author-en');
const fAuthorBe = document.getElementById('f-author-be');
const fDescRu = document.getElementById('f-desc-ru');
const fDescEn = document.getElementById('f-desc-en');
const fDescBe = document.getElementById('f-desc-be');

function setCreatedPrecision(precision) {
  cpYear.checked  = precision === 'year';
  cpMonth.checked = precision === 'month';
  cpDay.checked   = precision === 'day';

  cMonth.disabled = precision === 'year';
  cDay.disabled   = precision !== 'day';
  cDayPicker.disabled = precision !== 'day';

  if (precision === 'year') {
    cMonth.value = '';
    cDay.value = '';
  }
  if (precision === 'month') {
    cDay.value = '';
  }
}

function getCreatedPrecision() {
  if (cpDay.checked) return 'day';
  if (cpMonth.checked) return 'month';
  return 'year';
}

function buildCreatedOnFromUi() {
  const year = parseInt(cYear.value, 10);
  if (!Number.isFinite(year) || year <= 0) return null;

  const precision = getCreatedPrecision();
  const month = precision === 'year' ? null : parseInt(cMonth.value, 10);
  const day = precision === 'day' ? parseInt(cDay.value, 10) : null;

  const m = Number.isFinite(month) ? Math.min(12, Math.max(1, month)) : null;
  const d = Number.isFinite(day) ? Math.min(31, Math.max(1, day)) : null;

  const sortKey = year * 10000 + (m || 0) * 100 + (d || 0);
  const display = cDisplay.value.trim();

  return {
    year,
    month: m,
    day: d,
    precision,
    sortKey,
    ...(display ? { display } : {})
  };
}

function applyCreatedOnToUi(createdOn) {
  if (!createdOn) {
    cYear.value = '';
    cMonth.value = '';
    cDay.value = '';
    cDisplay.value = '';
    cManual.value = '';
    cManualError.textContent = '';
    cManual.classList.remove('field-error');
    setCreatedPrecision('year');
    if (fullDatePicker) fullDatePicker.clear();
    return;
  }

  cYear.value = createdOn.year ?? '';
  cMonth.value = createdOn.month ?? '';
  cDay.value = createdOn.day ?? '';
  cDisplay.value = createdOn.display ?? '';
  setCreatedPrecision(createdOn.precision || 'year');
  cManual.value = '';
  cManualError.textContent = '';
  cManual.classList.remove('field-error');
  if (fullDatePicker && createdOn.precision === 'day' && createdOn.year && createdOn.month && createdOn.day) {
    const date = new Date(Date.UTC(createdOn.year, createdOn.month - 1, createdOn.day));
    fullDatePicker.setDate(date, true);
  } else if (fullDatePicker) {
    fullDatePicker.clear();
  }
}

// wire precision changes once
cpYear.addEventListener('change', () => setCreatedPrecision('year'));
cpMonth.addEventListener('change', () => setCreatedPrecision('month'));
cpDay.addEventListener('change', () => setCreatedPrecision('day'));
setCreatedPrecision('year');

function parseManualCreatedDate(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  let m = value.match(/^(\d{4})$/);
  if (m) {
    return { precision: 'year', year: Number(m[1]), month: null, day: null };
  }
  m = value.match(/^(\d{1,2})\.(\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const year = Number(m[2]);
    if (month >= 1 && month <= 12) return { precision: 'month', year, month, day: null };
    return null;
  }
  m = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { precision: 'day', year, month, day };
  }
  return null;
}

function applyManualCreatedDate(raw) {
  const parsed = parseManualCreatedDate(raw);
  if (!raw.trim()) {
    cManualError.textContent = '';
    cManual.classList.remove('field-error');
    return;
  }
  if (!parsed) {
    cManualError.textContent = 'Неверный формат. Используйте DD.MM.YYYY, MM.YYYY или YYYY.';
    cManual.classList.add('field-error');
    return;
  }
  cManualError.textContent = '';
  cManual.classList.remove('field-error');
  cYear.value = String(parsed.year);
  cMonth.value = parsed.month ?? '';
  cDay.value = parsed.day ?? '';
  setCreatedPrecision(parsed.precision);
  if (fullDatePicker && parsed.precision === 'day') {
    fullDatePicker.setDate(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)), true);
  }
}

cManual.addEventListener('blur', () => applyManualCreatedDate(cManual.value));

if (window.flatpickr) {
  const ruLocale = window.flatpickr?.l10ns?.ru || undefined;
  fullDatePicker = window.flatpickr(cDayPicker, {
    dateFormat: 'd.m.Y',
    allowInput: true,
    clickOpens: true,
    ...(ruLocale ? { locale: ruLocale } : {}),
    onChange(selectedDates) {
      const picked = selectedDates?.[0];
      if (!picked) return;
      const date = new Date(picked);
      cYear.value = String(date.getFullYear());
      cMonth.value = String(date.getMonth() + 1);
      cDay.value = String(date.getDate());
      setCreatedPrecision('day');
    }
  });
}

// ── i18n fields language tabs ──────────────────────────────────────────────
const langTabs = Array.from(document.querySelectorAll('[data-lang-tab]'));
const langPanels = Array.from(document.querySelectorAll('[data-lang-panel]'));
let activeFormLang = 'ru';
function setFormLang(lang) {
  activeFormLang = lang;
  langTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.langTab === lang));
  langPanels.forEach((panel) => panel.classList.toggle('hidden', panel.dataset.langPanel !== lang));
}
langTabs.forEach((btn) => btn.addEventListener('click', () => setFormLang(btn.dataset.langTab)));

// ── load ──────────────────────────────────────────────────────────────────

async function loadPlaces() {
  try {
    places = await getPlaces();
    renderTable();
  } catch (err) {
    console.error(err);
    showToast('Ошибка загрузки мест', 'error');
  }
}
loadPlaces();

// ── places list: stats, search, filters ────────────────────────────────────

const placesSearchInput = document.getElementById('places-search');
const placesSearchClear = document.getElementById('places-search-clear');
const placesSearchMeta = document.getElementById('places-search-meta');
const statTotalEl = document.getElementById('stat-total');
const stat3dEl = document.getElementById('stat-3d');
const statNo3dEl = document.getElementById('stat-no-3d');
const statPhotosEl = document.getElementById('stat-photos');
const statNoPhotosEl = document.getElementById('stat-no-photos');
let filter3dMode = '';
let filterPhotosMode = '';
const fDateFrom = document.getElementById('f-datefrom');
const fDateTo = document.getElementById('f-dateto');
const placesFiltersReset = document.getElementById('places-filters-reset');
let placesSearchTimer = null;

function placeHas3d(p) {
  return !!(p.modelUrl || p.sketchfabUrl || p.has3D);
}

function placeHasPhotos(p) {
  return !!((Array.isArray(p.photos) && p.photos.length) || p.hasPhotos);
}

function getYearForFilter(place) {
  const fromCreated = Number(place?.createdOn?.year);
  if (Number.isFinite(fromCreated) && fromCreated > 0) return fromCreated;
  const opening = String(place?.openingDate || '');
  const match = opening.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  if (!match) return NaN;
  return Number(match[1]);
}

function parseYearInput(el) {
  if (!el) return null;
  const raw = String(el.value || '').trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function hasActiveListFilters() {
  return !!(
    filter3dMode ||
    filterPhotosMode ||
    parseYearInput(fDateFrom) != null ||
    parseYearInput(fDateTo) != null
  );
}

function placeMatchesFilters(p) {
  if (filter3dMode === 'yes' && !placeHas3d(p)) return false;
  if (filter3dMode === 'no' && placeHas3d(p)) return false;
  if (filterPhotosMode === 'yes' && !placeHasPhotos(p)) return false;
  if (filterPhotosMode === 'no' && placeHasPhotos(p)) return false;
  const from = parseYearInput(fDateFrom);
  const to = parseYearInput(fDateTo);
  if (from != null || to != null) {
    const y = getYearForFilter(p);
    if (!Number.isFinite(y)) return false;
    if (from != null && y < from) return false;
    if (to != null && y > to) return false;
  }
  return true;
}

function updatePlacesStats(filtered) {
  const list = Array.isArray(filtered) ? filtered : places;
  const total = list.length;
  const with3d = list.filter(placeHas3d).length;
  const withPhotos = list.filter(placeHasPhotos).length;
  if (statTotalEl) statTotalEl.textContent = String(total);
  if (stat3dEl) stat3dEl.textContent = String(with3d);
  if (statNo3dEl) statNo3dEl.textContent = String(total - with3d);
  if (statPhotosEl) statPhotosEl.textContent = String(withPhotos);
  if (statNoPhotosEl) statNoPhotosEl.textContent = String(total - withPhotos);
}

function syncSearchClearBtn() {
  if (!placesSearchClear || !placesSearchInput) return;
  placesSearchClear.classList.toggle('visible', !!placesSearchInput.value.trim());
}

function hasAnythingToReset() {
  return !!getPlacesSearchQuery() || hasActiveListFilters();
}

function syncResetFiltersBtn() {
  if (!placesFiltersReset) return;
  placesFiltersReset.classList.toggle('hidden', !hasAnythingToReset());
}

function setFilterSegMode(key, value) {
  const seg = document.querySelector(`.places-filter-seg[data-filter-key="${key}"]`);
  if (!seg) return;
  seg.querySelectorAll('.places-filter-seg__btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.value === value);
  });
  if (key === '3d') filter3dMode = value;
  if (key === 'photos') filterPhotosMode = value;
}

function resetPlacesFilters() {
  if (placesSearchInput) placesSearchInput.value = '';
  setFilterSegMode('3d', '');
  setFilterSegMode('photos', '');
  if (fDateFrom) fDateFrom.value = '';
  if (fDateTo) fDateTo.value = '';
  syncSearchClearBtn();
  syncResetFiltersBtn();
  renderTable();
}

document.querySelectorAll('.places-filter-seg').forEach((seg) => {
  const key = seg.dataset.filterKey;
  seg.querySelectorAll('.places-filter-seg__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFilterSegMode(key, btn.dataset.value ?? '');
      syncResetFiltersBtn();
      renderTable();
    });
  });
});

function pushSearchPart(parts, v) {
  if (v == null) return;
  const s = String(v).trim();
  if (s) parts.push(s);
}

function collectPlaceSearchParts(p) {
  const parts = [];
  pushSearchPart(parts, p.id);
  pushSearchPart(parts, p.name);
  pushSearchPart(parts, p.description);
  pushSearchPart(parts, p.author);
  pushSearchPart(parts, p.city);
  pushSearchPart(parts, p.location?.address);
  pushSearchPart(parts, p.openingAddress);
  pushSearchPart(parts, p.sketchfabUrl);
  pushSearchPart(parts, p.modelUrl);
  if (Array.isArray(p.tags)) pushSearchPart(parts, p.tags.join(' '));
  for (const lang of ['ru', 'en', 'be']) {
    const x = p.i18n?.[lang];
    if (!x) continue;
    pushSearchPart(parts, x.name);
    pushSearchPart(parts, x.description);
    pushSearchPart(parts, x.author);
    pushSearchPart(parts, x.address);
    pushSearchPart(parts, x.openingAddress);
    pushSearchPart(parts, x.city);
    if (Array.isArray(x.tags)) pushSearchPart(parts, x.tags.join(' '));
  }
  return parts;
}

function placeMatchesSearch(p, qLower) {
  if (!qLower) return true;
  const hay = collectPlaceSearchParts(p).join('\u0001').toLowerCase();
  return hay.includes(qLower);
}

function getPlacesSearchQuery() {
  return String(placesSearchInput?.value || '').trim().toLowerCase();
}

function getFilteredPlacesForTable() {
  const q = getPlacesSearchQuery();
  return places.filter((p) => placeMatchesSearch(p, q) && placeMatchesFilters(p));
}

function updatePlacesSearchMeta(filteredCount, total, qRaw) {
  if (!placesSearchMeta) return;
  const q = String(qRaw || '').trim();
  const filtered = hasActiveListFilters() || !!q;
  if (!filtered || !total) {
    placesSearchMeta.textContent = '';
    return;
  }
  const tpl = tp('admin.places.listCount', 'Показано: {n} из {total}');
  placesSearchMeta.textContent = tpl.replace('{n}', String(filteredCount)).replace('{total}', String(total));
}

function scheduleRenderTable() {
  clearTimeout(placesSearchTimer);
  placesSearchTimer = setTimeout(() => renderTable(), 160);
}

placesSearchInput?.addEventListener('input', () => {
  syncSearchClearBtn();
  syncResetFiltersBtn();
  scheduleRenderTable();
});

placesSearchClear?.addEventListener('click', () => {
  if (!placesSearchInput) return;
  placesSearchInput.value = '';
  syncSearchClearBtn();
  syncResetFiltersBtn();
  placesSearchInput.focus();
  renderTable();
});

placesFiltersReset?.addEventListener('click', () => resetPlacesFilters());

[fDateFrom, fDateTo].forEach((el) => {
  el?.addEventListener('change', () => {
    syncResetFiltersBtn();
    renderTable();
  });
  el?.addEventListener('input', () => {
    syncResetFiltersBtn();
    scheduleRenderTable();
  });
});

// ── table ─────────────────────────────────────────────────────────────────

function renderTable() {
  const tbody   = document.getElementById('places-tbody');
  const emptyEl = document.getElementById('empty-state');
  const qRaw = placesSearchInput?.value || '';
  const q = getPlacesSearchQuery();

  if (!places.length) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    if (placesSearchMeta) placesSearchMeta.textContent = '';
    updatePlacesStats([]);
    return;
  }
  emptyEl.classList.add('hidden');

  const filtered = getFilteredPlacesForTable();
  updatePlacesStats(filtered);
  updatePlacesSearchMeta(filtered.length, places.length, qRaw);
  syncResetFiltersBtn();

  if (!filtered.length && (q || hasActiveListFilters())) {
    tbody.innerHTML = `<tr><td colspan="6" class="places-table__empty-filter">${esc(tp('admin.places.searchNoMatches', 'Ничего не найдено — измените запрос или фильтры.'))}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    let modelBadge = '—';
    if (p.modelUrl && p.modelType !== 'sketchfab') {
      modelBadge = '<span class="table-model-badge">📦 Файл</span>';
    } else if (p.sketchfabUrl || p.modelType === 'sketchfab') {
      modelBadge = '<span class="table-model-badge">🌐 Sketchfab</span>';
    } else if (p.modelUrl) {
      if (p.modelUrl.includes('sketchfab.com')) {
        modelBadge = '<span class="table-model-badge">🌐 Sketchfab</span>';
      } else {
        modelBadge = '<span class="table-model-badge">📦 Файл</span>';
      }
    }

    const createdYear = p.createdOn?.year ? String(p.createdOn.year) : '—';
    const hasRu = !!(p.i18n?.ru?.name || p.name || p.description || p.author || p.location?.address || p.openingAddress);
    const hasEn = !!(p.i18n?.en?.name || p.i18n?.en?.description || p.i18n?.en?.author || p.i18n?.en?.address || p.i18n?.en?.openingAddress);
    const hasBe = !!(p.i18n?.be?.name || p.i18n?.be?.description || p.i18n?.be?.author || p.i18n?.be?.address || p.i18n?.be?.openingAddress);
    const langs = `${hasRu ? 'RU' : '—'}${hasEn ? ' / EN' : ''}${hasBe ? ' / BE' : ''}`;

    return `
    <tr>
      <td>${p.photos?.[0]
        ? (() => {
          const thumb = resolveMediaPublicUrl(p.photos[0]);
          return `<img class="table-thumb table-thumb--preview" src="${esc(thumb)}" alt="" loading="lazy" decoding="async" data-preview-src="${escAttr(thumb)}" />`;
        })()
        : `<div class="table-thumb--empty">нет</div>`}
      </td>
      <td>
        <div class="table-name">
          ${p.featured ? '<span title="Featured" style="color:var(--c-accent);margin-right:6px">★</span>' : ''}
          ${esc(p.name)}
        </div>
        <div class="table-addr">${esc(p.location?.address || '—')}</div>
      </td>
      <td>${createdYear}</td>
      <td>${langs}</td>
      <td>${modelBadge}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon" data-action="view" data-id="${p.id}" title="${esc(tp('admin.places.viewPublic', 'Открыть на сайте'))}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="btn-icon" data-action="edit" data-id="${p.id}" title="Редактировать">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${p.id}" title="Удалить">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'view') {
        const id = btn.dataset.id;
        if (!id) return;
        window.open(
          `../../pages/place.html?id=${encodeURIComponent(id)}`,
          '_blank',
          'noopener,noreferrer'
        );
        return;
      }
      if (btn.dataset.action === 'edit')   openEdit(btn.dataset.id);
      if (btn.dataset.action === 'delete') confirmDelete(btn.dataset.id);
    });
  });

  bindMediaImageErrorHint(tbody);
  bindTableThumbPreviews(tbody);
}

function bindTableThumbPreviews(container) {
  container.querySelectorAll('.table-thumb--preview[data-preview-src]').forEach((el) => {
    const src = el.dataset.previewSrc || '';
    if (!src) return;
    el.addEventListener('mouseenter', (e) => showPhotoPreviewPopover(src, e.clientX, e.clientY));
    el.addEventListener('mousemove', (e) => showPhotoPreviewPopover(src, e.clientX, e.clientY));
    el.addEventListener('mouseleave', hidePhotoPreviewPopover);
  });
}

// ── delete ────────────────────────────────────────────────────────────────

async function confirmDelete(id) {
  const place = places.find(p => p.id === id);
  if (!place) return;
  if (!confirm(`Удалить «${place.name}»?`)) return;
  try {
    await deletePlace(id);
    showToast('Место удалено');
    await loadPlaces();
  } catch { showToast('Ошибка удаления', 'error'); }
}

// ── model type switcher ──────────────────────────────────────────────────

const mtFileBtn      = document.getElementById('mt-file-btn');
const mtSketchfabBtn = document.getElementById('mt-sketchfab-btn');
const panelFile      = document.getElementById('model-panel-file');
const panelSketchfab = document.getElementById('model-panel-sketchfab');

function setModelType(type) {
  currentModelType = type;
  mtFileBtn.classList.toggle('active', type === 'file');
  mtSketchfabBtn.classList.toggle('active', type === 'sketchfab');
  panelFile.classList.toggle('active', type === 'file');
  panelSketchfab.classList.toggle('active', type === 'sketchfab');
}

mtFileBtn.addEventListener('click', () => setModelType('file'));
mtSketchfabBtn.addEventListener('click', () => setModelType('sketchfab'));

// Sketchfab URL preview
const sketchfabInput   = document.getElementById('f-sketchfab-url');
const sketchfabPreview = document.getElementById('sketchfab-preview');

let sfDebounce = null;
sketchfabInput.addEventListener('input', () => {
  clearTimeout(sfDebounce);
  sfDebounce = setTimeout(() => {
    const url = sketchfabInput.value.trim();
    if (url && url.includes('sketchfab.com')) {
      const embedUrl = buildSketchfabEmbed(url);
      sketchfabPreview.innerHTML = `
        <div style="width:100%;aspect-ratio:16/9;border-radius:8px;overflow:hidden;border:1px solid var(--c-border)">
          <iframe src="${esc(embedUrl)}" style="width:100%;height:100%;border:none"
            allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>
        </div>
        <p style="font-size:.78rem;color:var(--c-text-muted);margin-top:6px">✓ Превью загружено</p>`;
    } else {
      sketchfabPreview.innerHTML = '';
    }
  }, 600);
});

function buildSketchfabEmbed(url) {
  const match = url.match(/sketchfab\.com\/(?:3d-)?models\/[a-zA-Z0-9-]*?([a-f0-9]{32})\b/);
  if (match) {
    return `https://sketchfab.com/models/${match[1]}/embed?autostart=1&ui_theme=dark`;
  }
  const directMatch = url.match(/sketchfab\.com\/models\/([a-f0-9]+)/);
  if (directMatch) {
    return `https://sketchfab.com/models/${directMatch[1]}/embed?autostart=1&ui_theme=dark`;
  }
  if (url.includes('/embed')) return url;
  return url;
}

// ── city input + autocomplete ─────────────────────────────────────────────

function setupCityAutocomplete(input, suggestionsEl, lang) {
  if (!input || !suggestionsEl) return;
  let debounce = null;
  let activeIdx = -1;

  function hideSuggestions() {
    suggestionsEl.classList.add('hidden');
    suggestionsEl.innerHTML = '';
    activeIdx = -1;
  }

  function selectItem(name) {
    input.value = name;
    input.dataset.manual = '1';
    hideSuggestions();
  }

  function renderSuggestions(items) {
    if (!items.length) { hideSuggestions(); return; }
    activeIdx = -1;
    suggestionsEl.innerHTML = items.map((item, i) =>
      `<div class="city-suggestion-item" data-idx="${i}">
        <span class="city-suggestion-item__name">${esc(item.name)}</span>
        ${item.sub ? `<span class="city-suggestion-item__sub">${esc(item.sub)}</span>` : ''}
      </div>`
    ).join('');
    suggestionsEl.classList.remove('hidden');
    suggestionsEl.querySelectorAll('.city-suggestion-item').forEach((el, i) => {
      el.addEventListener('mousedown', e => { e.preventDefault(); selectItem(items[i].name); });
    });
  }

  async function fetchCities(q) {
    const acceptLang = lang === 'en' ? 'en' : lang === 'be' ? 'be' : 'ru';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&accept-language=${acceptLang}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TracesOfThePast/1.0' } });
    const data = await res.json();
    const seen = new Set();
    const items = [];
    for (const r of data) {
      const addr = r.address || {};
      const city = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || r.name;
      if (!city) continue;
      const key = city.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ name: city, sub: addr.country || '' });
      if (items.length >= 5) break;
    }
    return items;
  }

  input.addEventListener('input', () => {
    input.dataset.manual = '1';
    clearTimeout(debounce);
    const q = input.value.trim();
    if (q.length < 2) { hideSuggestions(); return; }
    debounce = setTimeout(async () => {
      try { renderSuggestions(await fetchCities(q)); } catch { hideSuggestions(); }
    }, 300);
  });

  input.addEventListener('keydown', e => {
    const items = suggestionsEl.querySelectorAll('.city-suggestion-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('kbd-active', i === activeIdx));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      items.forEach((el, i) => el.classList.toggle('kbd-active', i === activeIdx));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectItem(items[activeIdx].querySelector('.city-suggestion-item__name').textContent);
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  input.addEventListener('blur', () => setTimeout(hideSuggestions, 150));
}

setupCityAutocomplete(fCityRu, document.getElementById('city-suggestions-ru'), 'ru');
setupCityAutocomplete(fCityEn, document.getElementById('city-suggestions-en'), 'en');
setupCityAutocomplete(fCityBe, document.getElementById('city-suggestions-be'), 'be');

// ── modal ─────────────────────────────────────────────────────────────────

document.getElementById('add-btn').addEventListener('click', () => openModal(null));

function openEdit(id) {
  const place = places.find(p => p.id === id);
  if (place) openModal(place);
}

function openModal(place) {
  editingId            = place?.id || null;
  clearPhotoSlots();
  photoSlots = (place?.photos || []).map((url) => ({
    type: 'url',
    url: normalizePhotoSlotUrl(url) || resolveMediaPublicUrl(url)
  }));
  modelFile            = null;
  existingModelUrl     = null;
  existingSketchfabUrl = null;
  currentTags          = place?.tags ? [...place.tags] : [];
  currentTagsEn        = place?.i18n?.en?.tags ? [...place.i18n.en.tags] : [];
  currentTagsBe        = place?.i18n?.be?.tags ? [...place.i18n.be.tags] : [];

  if (place?.sketchfabUrl) {
    existingSketchfabUrl = place.sketchfabUrl;
    setModelType('sketchfab');
  } else if (place?.modelUrl && place.modelUrl.includes('sketchfab.com')) {
    existingSketchfabUrl = place.modelUrl;
    setModelType('sketchfab');
  } else if (place?.modelUrl) {
    existingModelUrl = place.modelUrl;
    setModelType('file');
  } else if (place?.modelType === 'sketchfab') {
    setModelType('sketchfab');
  } else {
    setModelType('file');
  }

  document.getElementById('modal-title').textContent    = place ? tp('admin.places.editTitle', 'Редактировать место') : tp('admin.places.addTitle', 'Добавить место');
  document.getElementById('f-featured').checked         = !!place?.featured;
  document.getElementById('f-featured-order').value     = place?.featuredOrder ?? '';
  applyCreatedOnToUi(place?.createdOn || null);
  fNameRu.value = place?.i18n?.ru?.name || place?.name || '';
  fNameEn.value = place?.i18n?.en?.name || '';
  if (fNameBe) fNameBe.value = place?.i18n?.be?.name || '';
  fAddressRu.value = place?.i18n?.ru?.address || place?.location?.address || '';
  fAddressEn.value = place?.i18n?.en?.address || '';
  if (fAddressBe) fAddressBe.value = place?.i18n?.be?.address || '';
  [fCityRu, fCityEn, fCityBe].forEach(el => { if (el) el.dataset.manual = '0'; });
  if (fCityRu) fCityRu.value = String(place?.i18n?.ru?.city || place?.city || '').trim() || deriveCityFromAddress(fAddressRu.value);
  if (fCityEn) fCityEn.value = String(place?.i18n?.en?.city || '').trim() || deriveCityFromAddress(fAddressEn.value);
  if (fCityBe) fCityBe.value = String(place?.i18n?.be?.city || '').trim() || deriveCityFromAddress(fAddressBe?.value || '');
  const placeLat = place?.location?.lat;
  const placeLng = place?.location?.lng;
  if (fLat) fLat.value = placeLat ?? '';
  if (fLng) fLng.value = placeLng ?? '';
  if (coordHintEl) {
    const latN = parseFloat(placeLat);
    const lngN = parseFloat(placeLng);
    coordHintEl.textContent = Number.isFinite(latN) && Number.isFinite(lngN)
      ? `${latN.toFixed(5)}, ${lngN.toFixed(5)}`
      : tp('admin.places.coordsHint', 'Координаты не выбраны');
  }
  document.getElementById('f-opening-date').value       = place?.openingDate || '';
  fOpeningAddressRu.value = place?.i18n?.ru?.openingAddress || place?.openingAddress || '';
  fOpeningAddressEn.value = place?.i18n?.en?.openingAddress || '';
  if (fOpeningAddressBe) fOpeningAddressBe.value = place?.i18n?.be?.openingAddress || '';
  fAuthorRu.value = place?.i18n?.ru?.author || place?.author || '';
  fAuthorEn.value = place?.i18n?.en?.author || '';
  if (fAuthorBe) fAuthorBe.value = place?.i18n?.be?.author || '';
  fDescRu.value = place?.i18n?.ru?.description || place?.description || '';
  fDescEn.value = place?.i18n?.en?.description || '';
  if (fDescBe) fDescBe.value = place?.i18n?.be?.description || '';
  document.getElementById('f-tags-input').value         = '';
  document.getElementById('f-sketchfab-url').value      = existingSketchfabUrl || '';
  document.getElementById('photo-progress').textContent = '';
  const urlInp = document.getElementById('photo-url-input');
  if (urlInp) urlInp.value = '';
  document.getElementById('model-progress').textContent = '';
  sketchfabPreview.innerHTML = '';
  cManual.value = '';
  cManualError.textContent = '';
  cManual.classList.remove('field-error');
  setFormLang('ru');

  if (existingSketchfabUrl) {
    const embedUrl = buildSketchfabEmbed(existingSketchfabUrl);
    sketchfabPreview.innerHTML = `
      <div style="width:100%;aspect-ratio:16/9;border-radius:8px;overflow:hidden;border:1px solid var(--c-border)">
        <iframe src="${esc(embedUrl)}" style="width:100%;height:100%;border:none"
          allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>
      </div>
      <p style="font-size:.78rem;color:var(--c-text-muted);margin-top:6px">✓ Текущая модель</p>`;
  }

  renderTags();
  renderTagsEn();
  renderTagsBe();
  renderModelPreview();

  document.getElementById('modal').classList.remove('hidden');
  renderPhotoPreviews();
  setTimeout(() => {
    void initPickerMap();
  }, 50);
}

function closeModal() {
  hidePhotoPreviewPopover();
  document.getElementById('modal').classList.add('hidden');
  if (pickerMap) { pickerMap.remove(); pickerMap = null; pickerMarker = null; }
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ── coord picker (coords ↔ map only; address is manual) ───────────────────

function fixPickerLeafletIcons(L) {
  const base = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/';
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: `${base}marker-icon-2x.png`,
    iconUrl: `${base}marker-icon.png`,
    shadowUrl: `${base}marker-shadow.png`
  });
}

function parseCoordInputs() {
  const lat = parseFloat(fLat?.value);
  const lng = parseFloat(fLng?.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function setCoordInputs(lat, lng) {
  if (fLat) fLat.value = lat.toFixed(6);
  if (fLng) fLng.value = lng.toFixed(6);
  if (coordHintEl) coordHintEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function clearCoordHint() {
  if (coordHintEl) {
    coordHintEl.textContent = tp('admin.places.coordsHint', 'Координаты не выбраны');
  }
}

function setPickerMarker(lat, lng) {
  const L = window.L;
  if (!L || !pickerMap) return;
  if (pickerMarker) pickerMap.removeLayer(pickerMarker);
  pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
}

function clearPickerMarker() {
  if (pickerMarker && pickerMap) {
    pickerMap.removeLayer(pickerMarker);
    pickerMarker = null;
  }
}

function updatePickerMapView(lat, lng, zoom) {
  if (!pickerMap) return;
  const z = zoom ?? Math.max(pickerMap.getZoom(), 14);
  pickerMap.setView([lat, lng], z);
  setPickerMarker(lat, lng);
}

async function applyLocationFromCoords(lat, lng, source) {
  locationSyncSource = source;
  try {
    setCoordInputs(lat, lng);
    if (!pickerMap) await initPickerMap();
    if (pickerMap) updatePickerMapView(lat, lng, source === 'map' ? undefined : 14);
  } catch (e) {
    console.warn(e);
  } finally {
    locationSyncSource = null;
  }
}

async function syncFromCoordInputs() {
  if (locationSyncSource && locationSyncSource !== 'coords') return;
  const coords = parseCoordInputs();
  if (!coords) {
    clearPickerMarker();
    if (!fLat?.value?.trim() && !fLng?.value?.trim()) clearCoordHint();
    return;
  }
  await applyLocationFromCoords(coords.lat, coords.lng, 'coords');
}

function scheduleSyncFromCoords() {
  if (locationSyncSource && locationSyncSource !== 'coords') return;
  clearTimeout(coordInputDebounce);
  coordInputDebounce = setTimeout(() => { void syncFromCoordInputs(); }, COORD_SYNC_DEBOUNCE_MS);
}

fLat?.addEventListener('input', scheduleSyncFromCoords);
fLng?.addEventListener('input', scheduleSyncFromCoords);

async function initPickerMap() {
  if (pickerMap) return;
  const mapEl = document.getElementById('coord-map');
  try {
    await ensureLeafletReady();
  } catch (e) {
    console.warn(e);
    if (mapEl) {
      mapEl.innerHTML = `<div style="padding:12px;font-size:.85rem;color:var(--c-text-muted)">${esc(
        tp('admin.places.leafletLoadError', 'Карта координат не загрузилась. Обновите страницу или проверьте блокировщики.')
      )}</div>`;
    }
    showToast(tp('admin.places.leafletLoadError', 'Карта координат не загрузилась.'), 'error');
    return;
  }

  const L = window.L;
  if (!L || typeof L.map !== 'function') {
    if (mapEl) {
      mapEl.innerHTML = `<div style="padding:12px;font-size:.85rem;color:var(--c-text-muted)">${esc(
        tp('admin.places.leafletLoadError', 'Карта координат не загрузилась. Обновите страницу или проверьте блокировщики.')
      )}</div>`;
    }
    return;
  }

  fixPickerLeafletIcons(L);
  if (mapEl) mapEl.innerHTML = '';
  const parsed = parseCoordInputs();
  const lat = parsed?.lat ?? 53.9;
  const lng = parsed?.lng ?? 27.5667;
  const initialZoom = parsed ? 14 : 7;

  pickerMap = L.map('coord-map', { attributionControl: false }).setView([lat, lng], initialZoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(pickerMap);

  if (parsed) setPickerMarker(lat, lng);

  pickerMap.on('click', (e) => {
    void applyLocationFromCoords(e.latlng.lat, e.latlng.lng, 'map');
  });
}

// ── tags ──────────────────────────────────────────────────────────────────

function makeTagChip(text, onRemove) {
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;
    background:var(--c-accent-soft);border:1px solid var(--c-border);
    border-radius:20px;font-size:.8rem;color:var(--c-text)">
    ${esc(text)}
    <button data-remove style="background:none;border:none;cursor:pointer;color:var(--c-text-muted);font-size:.85rem;padding:0;line-height:1">×</button>
  </span>`;
}

function renderTagList(wrapId, tags, onRemove) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.innerHTML = tags.map((t, i) => makeTagChip(t, i)).join('');
  wrap.querySelectorAll('[data-remove]').forEach((btn, i) => {
    btn.addEventListener('click', () => { onRemove(i); });
  });
}

function renderTags() {
  renderTagList('tags-wrap', currentTags, i => { currentTags.splice(i, 1); renderTags(); });
}

function renderTagsEn() {
  renderTagList('tags-wrap-en', currentTagsEn, i => { currentTagsEn.splice(i, 1); renderTagsEn(); });
}

function renderTagsBe() {
  renderTagList('tags-wrap-be', currentTagsBe, i => { currentTagsBe.splice(i, 1); renderTagsBe(); });
}

document.getElementById('f-tags-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/^#/, '');
    if (val && !currentTags.includes(val)) {
      currentTags.push(val);
      renderTags();
    }
    e.target.value = '';
  }
});

document.getElementById('f-tags-input-en').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/^#/, '');
    if (val && !currentTagsEn.includes(val)) {
      currentTagsEn.push(val);
      renderTagsEn();
    }
    e.target.value = '';
  }
});

document.getElementById('f-tags-input-be')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/^#/, '');
    if (val && !currentTagsBe.includes(val)) {
      currentTagsBe.push(val);
      renderTagsBe();
    }
    e.target.value = '';
  }
});

// ── photo upload ──────────────────────────────────────────────────────────

const uploadArea = document.getElementById('upload-area');
const fileInput  = document.getElementById('file-input');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles(fileInput.files));
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag'));
uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.classList.remove('drag'); handleFiles(e.dataTransfer.files); });

const photoUrlInput = document.getElementById('photo-url-input');
const photoUrlAddBtn = document.getElementById('photo-url-add');

photoUrlAddBtn?.addEventListener('click', addPhotoByUrl);
photoUrlInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addPhotoByUrl();
  }
});

function isPhotoReferenceInput(raw) {
  const t = String(raw || '').trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^photos\//i.test(t)) return true;
  if (/^\/?files\/photos\//i.test(t)) return true;
  return false;
}

function normalizePhotoSlotUrl(raw) {
  const resolved = resolveMediaPublicUrl(String(raw || '').trim());
  return /^https?:\/\//i.test(resolved) ? resolved : '';
}

function addPhotoByUrl() {
  const raw = photoUrlInput?.value?.trim() || '';
  if (!raw) return;
  if (!isPhotoReferenceInput(raw)) {
    showToast('Укажите https://… или ключ photos/… с воркера', 'error');
    return;
  }
  const url = normalizePhotoSlotUrl(raw);
  if (!url) {
    showToast('Не удалось разобрать ссылку на фото', 'error');
    return;
  }
  if (photoSlots.length >= 10) {
    showToast('Максимум 10 фотографий', 'error');
    return;
  }
  if (photoSlots.some((s) => s.type === 'url' && normalizePhotoSlotUrl(s.url) === url)) {
    showToast('Это фото уже добавлено', 'error');
    return;
  }
  photoSlots.push({ type: 'url', url });
  const urlInp = document.getElementById('photo-url-input');
  if (urlInp) urlInp.value = '';
  renderPhotoPreviews();
}

function warnIfRiskyFilename(file) {
  if (file && uploadFilenameNeedsFix(file.name)) {
    showToast(uploadFilenameUserHint(file.name));
  }
}

function handleFiles(files) {
  const remaining = 10 - photoSlots.length;
  const toAdd = Array.from(files).slice(0, remaining);
  if (!toAdd.length) { showToast('Максимум 10 фотографий', 'error'); return; }
  for (const file of toAdd) {
    const check = validatePhotoUploadFile(file);
    if (!check.ok) {
      showToast(check.message, 'error');
      return;
    }
  }
  const risky = toAdd.find((f) => uploadFilenameNeedsFix(f.name));
  if (risky) warnIfRiskyFilename(risky);
  toAdd.forEach((file) => {
    photoSlots.push({ type: 'file', file, blobUrl: URL.createObjectURL(file) });
  });
  renderPhotoPreviews();
}

function clearPhotoSlots() {
  photoSlots.forEach((slot) => {
    if (slot.type === 'file' && slot.blobUrl) URL.revokeObjectURL(slot.blobUrl);
  });
  photoSlots = [];
}

function getPhotoSlotPreviewSrc(slot) {
  if (slot.type === 'url') return slot.url;
  if (!slot.blobUrl) slot.blobUrl = URL.createObjectURL(slot.file);
  return slot.blobUrl;
}

let photoDragFromIdx = null;
const photoPreviewPopover = document.getElementById('photo-preview-popover');
const photoPreviewPopoverImg = photoPreviewPopover?.querySelector('img');
const PHOTO_PREVIEW_W = 700;
const PHOTO_PREVIEW_H = 500;
const PHOTO_PREVIEW_ABOVE_CURSOR = 50;

function getPhotoPreviewSize() {
  const pad = 16;
  return {
    w: Math.min(PHOTO_PREVIEW_W, window.innerWidth - pad * 2),
    h: Math.min(PHOTO_PREVIEW_H, window.innerHeight - pad * 2)
  };
}

function positionPhotoPreviewPopover(clientX, clientY) {
  if (!photoPreviewPopover || !photoPreviewPopoverImg) return;
  const pad = 16;
  const max = getPhotoPreviewSize();
  const w = photoPreviewPopoverImg.offsetWidth || max.w;
  const h = photoPreviewPopoverImg.offsetHeight || max.h;
  let left = clientX - w / 2;
  let top = clientY - PHOTO_PREVIEW_ABOVE_CURSOR - h;
  left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));
  top = Math.max(pad, Math.min(top, window.innerHeight - h - pad));
  photoPreviewPopover.style.left = `${left}px`;
  photoPreviewPopover.style.top = `${top}px`;
}

function showPhotoPreviewPopover(src, clientX, clientY) {
  if (!photoPreviewPopover || !photoPreviewPopoverImg || !src) return;
  const needsLoad = photoPreviewPopoverImg.src !== src;
  if (needsLoad) {
    photoPreviewPopoverImg.onload = () => {
      positionPhotoPreviewPopover(clientX, clientY);
      photoPreviewPopoverImg.onload = null;
    };
    photoPreviewPopoverImg.src = src;
  }
  positionPhotoPreviewPopover(clientX, clientY);
  photoPreviewPopover.classList.add('is-visible');
  photoPreviewPopover.setAttribute('aria-hidden', 'false');
}

function hidePhotoPreviewPopover() {
  if (!photoPreviewPopover) return;
  photoPreviewPopover.classList.remove('is-visible');
  photoPreviewPopover.setAttribute('aria-hidden', 'true');
  if (photoPreviewPopoverImg) photoPreviewPopoverImg.removeAttribute('src');
}

function movePhotoSlot(fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
  if (fromIdx >= photoSlots.length || toIdx >= photoSlots.length) return;
  const [item] = photoSlots.splice(fromIdx, 1);
  photoSlots.splice(toIdx, 0, item);
}

function bindPhotoPreviewInteractions(container) {
  container.querySelectorAll('.photo-preview').forEach((el) => {
    const idx = parseInt(el.dataset.idx, 10);
    const src = el.dataset.previewSrc || '';

    el.addEventListener('mouseenter', (e) => showPhotoPreviewPopover(src, e.clientX, e.clientY));
    el.addEventListener('mousemove', (e) => showPhotoPreviewPopover(src, e.clientX, e.clientY));
    el.addEventListener('mouseleave', hidePhotoPreviewPopover);

    el.addEventListener('dragstart', (e) => {
      if (e.target.closest('.photo-preview__del')) {
        e.preventDefault();
        return;
      }
      photoDragFromIdx = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
      el.classList.add('photo-preview--dragging');
      hidePhotoPreviewPopover();
    });

    el.addEventListener('dragend', () => {
      photoDragFromIdx = null;
      el.classList.remove('photo-preview--dragging');
      container.querySelectorAll('.photo-preview--over').forEach((n) => n.classList.remove('photo-preview--over'));
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    el.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (photoDragFromIdx !== null && photoDragFromIdx !== idx) {
        el.classList.add('photo-preview--over');
      }
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('photo-preview--over');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('photo-preview--over');
      const from = photoDragFromIdx;
      if (from === null || from === idx) return;
      movePhotoSlot(from, idx);
      renderPhotoPreviews();
    });
  });

  container.querySelectorAll('.photo-preview__del').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.idx, 10);
      const slot = photoSlots[i];
      if (slot?.type === 'file' && slot.blobUrl) URL.revokeObjectURL(slot.blobUrl);
      photoSlots.splice(i, 1);
      renderPhotoPreviews();
    });
  });
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');
  if (!container) return;
  hidePhotoPreviewPopover();

  container.innerHTML = photoSlots.map((slot, i) => {
    const src = getPhotoSlotPreviewSrc(slot);
    const displaySrc = slot.type === 'file' ? src : normalizePhotoSlotUrl(src);
    const badge = slot.type === 'file'
      ? '<span class="photo-preview__badge" title="Новое фото">+</span>'
      : '';
    return `
    <div class="photo-preview" draggable="true" data-idx="${i}" data-preview-src="${escAttr(displaySrc)}">
      <img src="${escAttr(displaySrc)}" alt="" loading="eager" decoding="async" />
      ${badge}
      <button type="button" class="photo-preview__del" data-idx="${i}" aria-label="Удалить">×</button>
    </div>`;
  }).join('');

  bindMediaImageErrorHint(container);
  bindPhotoPreviewInteractions(container);
}

// ── model file upload ────────────────────────────────────────────────────

const modelUploadArea = document.getElementById('model-upload-area');
const modelFileInput  = document.getElementById('model-file-input');

modelUploadArea.addEventListener('click', () => modelFileInput.click());
modelFileInput.addEventListener('change', () => {
  if (modelFileInput.files[0]) {
    modelFile = modelFileInput.files[0];
    warnIfRiskyFilename(modelFile);
    existingModelUrl = null;
    renderModelPreview();
    modelFileInput.value = '';
  }
});
modelUploadArea.addEventListener('dragover', e => { e.preventDefault(); modelUploadArea.classList.add('drag'); });
modelUploadArea.addEventListener('dragleave', () => modelUploadArea.classList.remove('drag'));
modelUploadArea.addEventListener('drop', e => {
  e.preventDefault(); modelUploadArea.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f) {
    modelFile = f;
    warnIfRiskyFilename(modelFile);
    existingModelUrl = null;
    renderModelPreview();
  }
});

function renderModelPreview() {
  const el = document.getElementById('model-preview');
  if (!el) return;
  if (modelFile) {
    el.innerHTML = `<span>📦 ${esc(modelFile.name)}</span>
      <button id="model-remove" style="margin-left:8px;color:var(--c-danger);background:none;border:none;cursor:pointer;font-size:.85rem">✕ Убрать</button>`;
    document.getElementById('model-remove')?.addEventListener('click', () => { modelFile = null; renderModelPreview(); });
  } else if (existingModelUrl) {
    el.innerHTML = `<span>Текущий файл: <a href="${esc(existingModelUrl)}" target="_blank" style="text-decoration:underline;color:var(--c-accent)">открыть</a></span>
      <button id="model-remove" style="margin-left:8px;color:var(--c-danger);background:none;border:none;cursor:pointer;font-size:.85rem">✕ Убрать</button>`;
    document.getElementById('model-remove')?.addEventListener('click', () => { existingModelUrl = null; renderModelPreview(); });
  } else {
    el.innerHTML = '';
  }
}

// ── save ──────────────────────────────────────────────────────────────────

document.getElementById('modal-save').addEventListener('click', save);

async function save() {
  const nameRu         = fNameRu.value.trim();
  const nameEn         = fNameEn.value.trim();
  const nameBe         = (fNameBe?.value ?? '').trim();
  const addressRu      = fAddressRu.value.trim();
  const addressEn      = fAddressEn.value.trim();
  const addressBe      = (fAddressBe?.value ?? '').trim();
  const cityRu = (fCityRu?.value ?? '').trim() || deriveCityFromAddress(addressRu);
  const cityEn = (fCityEn?.value ?? '').trim() || deriveCityFromAddress(addressEn);
  const cityBe = (fCityBe?.value ?? '').trim() || deriveCityFromAddress(addressBe);
  const openingAddressRu = fOpeningAddressRu.value.trim();
  const openingAddressEn = fOpeningAddressEn.value.trim();
  const openingAddressBe = (fOpeningAddressBe?.value ?? '').trim();
  const authorRu       = fAuthorRu.value.trim();
  const authorEn       = fAuthorEn.value.trim();
  const authorBe       = (fAuthorBe?.value ?? '').trim();
  const descRu         = fDescRu.value.trim();
  const descEn         = fDescEn.value.trim();
  const descBe         = (fDescBe?.value ?? '').trim();
  const lat            = parseFloat(document.getElementById('f-lat').value);
  const lng            = parseFloat(document.getElementById('f-lng').value);
  const featured       = document.getElementById('f-featured').checked;
  const featuredOrder  = document.getElementById('f-featured-order').value;
  const createdOn      = buildCreatedOnFromUi();
  const openingDate    = document.getElementById('f-opening-date').value.trim();
  const sketchfabUrl   = document.getElementById('f-sketchfab-url').value.trim();

  const tagInputVal = document.getElementById('f-tags-input').value.trim().replace(/^#/, '');
  if (tagInputVal && !currentTags.includes(tagInputVal)) currentTags.push(tagInputVal);

  if (!nameRu) {
    setFormLang('ru');
    fNameRu.focus();
    showToast('Введите название (RU)', 'error');
    return;
  }

  if (currentModelType === 'sketchfab' && sketchfabUrl && !sketchfabUrl.includes('sketchfab.com')) {
    showToast('Некорректная ссылка Sketchfab', 'error');
    return;
  }

  const saveBtn = document.getElementById('modal-save');
  const progressEl = document.getElementById('photo-progress');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Сохранение…';

  // Карта тянет десятки тайлов OpenStreetMap — на слабой сети мешает загрузке в R2.
  const restorePickerMapAfterSave = Boolean(pickerMap);
  if (pickerMap) {
    pickerMap.remove();
    pickerMap = null;
    pickerMarker = null;
  }

  try {
    const filesToUpload = photoSlots.filter((s) => s.type === 'file').map((s) => s.file);
    let uploadedUrls = [];
    if (filesToUpload.length) {
      if (filesToUpload.length > 3) {
        progressEl.textContent = `Загрузка ${filesToUpload.length} фото… не закрывайте вкладку`;
      }
      uploadedUrls = await uploadImages(filesToUpload, (fi, _fp, overall) => {
        const n = filesToUpload.length;
        progressEl.textContent = n > 1
          ? `Загрузка фото… ${overall}% (${fi + 1}/${n})`
          : `Загрузка фото… ${overall}%`;
      });
      progressEl.textContent = '';
    }
    let uploadIdx = 0;
    const photos = photoSlots.map((slot) => {
      if (slot.type === 'url') return normalizePhotoSlotUrl(slot.url) || resolveMediaPublicUrl(slot.url);
      return resolveMediaPublicUrl(uploadedUrls[uploadIdx++]);
    });

    let finalModelUrl    = null;
    let finalSketchfabUrl = null;
    let finalModelType   = null;

    if (currentModelType === 'file') {
      if (modelFile) {
        const progressEl = document.getElementById('model-progress');
        finalModelUrl = await uploadModel(modelFile, pct => {
          progressEl.textContent = `Загрузка модели… ${pct}%`;
        });
        document.getElementById('model-progress').textContent = '';
        finalModelType = 'file';
      } else if (existingModelUrl) {
        finalModelUrl  = existingModelUrl;
        finalModelType = 'file';
      }
    } else if (currentModelType === 'sketchfab') {
      if (sketchfabUrl) {
        finalSketchfabUrl = sketchfabUrl;
        finalModelType    = 'sketchfab';
      }
    }

    const data = {
      name:           nameRu,
      description:    descRu,
      createdOn,
      openingDate,
      openingAddress: openingAddressRu,
      author:         authorRu,
      tags:           currentTags,
      city:           cityRu,
      location:       { lat: isNaN(lat) ? 0 : lat, lng: isNaN(lng) ? 0 : lng, address: addressRu },
      photos,
      modelUrl:       finalModelUrl || null,
      sketchfabUrl:   finalSketchfabUrl || null,
      modelType:      finalModelType,
      i18n: {
        ru: {
          name: nameRu,
          description: descRu,
          author: authorRu,
          address: addressRu,
          openingAddress: openingAddressRu,
          city: cityRu
        },
        en: {
          name: nameEn,
          description: descEn,
          author: authorEn,
          address: addressEn,
          openingAddress: openingAddressEn,
          city: cityEn,
          ...(currentTagsEn.length ? { tags: currentTagsEn } : {})
        },
        be: {
          name: nameBe,
          description: descBe,
          author: authorBe,
          address: addressBe,
          openingAddress: openingAddressBe,
          city: cityBe,
          ...(currentTagsBe.length ? { tags: currentTagsBe } : {})
        }
      },
      featured,
      featuredOrder
    };

    if (editingId) { await updatePlace(editingId, data); showToast('Место обновлено'); }
    else           { await addPlace(data);               showToast('Место добавлено'); }

    closeModal();
    await loadPlaces();
  } catch (err) {
    console.error(err);
    showToast('Ошибка: ' + err.message, 'error');
  } finally {
    if (progressEl) progressEl.textContent = '';
    saveBtn.disabled = false;
    saveBtn.textContent = 'Сохранить';
    if (restorePickerMapAfterSave && !document.getElementById('modal').classList.contains('hidden')) {
      setTimeout(() => { void initPickerMap(); }, 150);
    }
  }
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return esc(str).replace(/'/g, '&#39;');
}

}); // gateAdmin
