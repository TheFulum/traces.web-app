import { initNav } from '../../../js/shared/nav.js';
import { getPlaces } from '../../../js/shared/places.js';
import { showToast } from '../../../js/shared/utils.js';
import { getLang, loadDict, t } from '../../../js/shared/i18n.js';
import { bindAdminLogout, gateAdmin } from '../shared/admin-guard.js';

initNav('../../');
bindAdminLogout();

let dict = null;
loadDict(getLang()).then(d => {
  dict = d;
  const dt = t('admin.placesExport.docTitle', d);
  if (dt && dt !== 'admin.placesExport.docTitle') document.title = dt;
}).catch(() => {});
function tp(key, fallback, vars) {
  let raw = dict ? t(key, dict) : key;
  if (!raw || raw === key) raw = fallback;
  if (vars && typeof raw === 'string') {
    return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  }
  return raw;
}

/** @returns {number|null} */
function firestoreTsToMs(ts) {
  if (!ts || typeof ts !== 'object') return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return null;
}

/** Дата активности записи для фильтра по периоду */
function placeActivityMs(place) {
  return firestoreTsToMs(place.updatedAt) ?? firestoreTsToMs(place.createdAt);
}

function placeHasPhotos(place) {
  if (typeof place.hasPhotos === 'boolean') return place.hasPhotos;
  return Array.isArray(place.photos) && place.photos.length > 0;
}

function placeHas3d(place) {
  if (typeof place.has3D === 'boolean') return place.has3D;
  return !!(String(place.modelUrl || '').trim() || String(place.sketchfabUrl || '').trim());
}

/** @returns {{ start: number|null, end: number|null }} */
function getPeriodBounds(preset, customFromStr, customToStr, nowMs) {
  if (preset === 'all') return { start: null, end: null };
  const DAY = 86400000;
  if (preset === 'day') return { start: nowMs - DAY, end: nowMs };
  if (preset === 'week') return { start: nowMs - 7 * DAY, end: nowMs };
  if (preset === 'month') {
    const d = new Date(nowMs);
    d.setMonth(d.getMonth() - 1);
    return { start: d.getTime(), end: nowMs };
  }
  if (preset === 'year') {
    const d = new Date(nowMs);
    d.setFullYear(d.getFullYear() - 1);
    return { start: d.getTime(), end: nowMs };
  }
  if (preset === 'custom') {
    if (!customFromStr || !customToStr) return { start: null, end: null };
    const [fy, fm, fd] = customFromStr.split('-').map(Number);
    const [ty, tm, td] = customToStr.split('-').map(Number);
    if (![fy, fm, fd, ty, tm, td].every(n => Number.isFinite(n))) return { start: null, end: null };
    const start = new Date(fy, fm - 1, fd, 0, 0, 0, 0).getTime();
    const end = new Date(ty, tm - 1, td, 23, 59, 59, 999).getTime();
    if (start > end) return { start: end, end: start };
    return { start, end };
  }
  return { start: null, end: null };
}

function matchesPeriod(place, start, end) {
  if (start == null && end == null) return true;
  const ms = placeActivityMs(place);
  if (ms == null) return false;
  return ms >= start && ms <= end;
}

function matchesMediaFilters(place, photosOnly, d3Only) {
  if (photosOnly && !placeHasPhotos(place)) return false;
  if (d3Only && !placeHas3d(place)) return false;
  return true;
}

function tsToIso(ts) {
  const ms = firestoreTsToMs(ts);
  return ms != null ? new Date(ms).toISOString() : '';
}

/**
 * Выгрузка для людей и импорта: явный i18n.ru совпадает с полями формы админки,
 * i18n.en — только то, что задано (как при сохранении через sanitize в places.js).
 */
function serializePlace(place) {
  const { id, ...rest } = place;
  const ruDoc = place.i18n?.ru && typeof place.i18n.ru === 'object' ? place.i18n.ru : {};
  const ruNormalized = {
    name: String(ruDoc.name ?? place.name ?? '').trim(),
    description: String(ruDoc.description ?? place.description ?? '').trim(),
    author: String(ruDoc.author ?? place.author ?? '').trim(),
    address: String(ruDoc.address ?? place.location?.address ?? '').trim(),
    openingAddress: String(ruDoc.openingAddress ?? place.openingAddress ?? '').trim()
  };
  const i18nOut = {
    ru: { ...ruDoc, ...ruNormalized },
    ...(place.i18n?.en && typeof place.i18n.en === 'object' && Object.keys(place.i18n.en).length
      ? { en: place.i18n.en }
      : {})
  };

  const out = {
    ...rest,
    id,
    i18n: i18nOut,
    createdAt: tsToIso(place.createdAt) || undefined,
    updatedAt: tsToIso(place.updatedAt) || undefined
  };
  return out;
}

function csvEscape(val) {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function placesToCsv(rows) {
  const headers = [
    'id',
    'name',
    'description',
    'author',
    'address',
    'opening_address',
    'openingDate',
    'tags',
    'name_en',
    'description_en',
    'author_en',
    'address_en',
    'opening_address_en',
    'tags_en',
    'lat',
    'lng',
    'photos_json',
    'photo_count',
    'has_photos',
    'has_3d',
    'featured',
    'featured_order',
    'model_type',
    'model_url',
    'sketchfab_url',
    'created_on_json',
    'created_at',
    'updated_at',
    'i18n_json'
  ];
  const lines = [headers.join(',')];
  for (const p of rows) {
    const en = p.i18n?.en && typeof p.i18n.en === 'object' ? p.i18n.en : {};
    const tags = Array.isArray(p.tags) ? p.tags.join('; ') : '';
    const tagsEn = Array.isArray(en.tags) ? en.tags.map(t => String(t).trim()).filter(Boolean).join('; ') : '';
    const photoCount = Array.isArray(p.photos) ? p.photos.length : 0;
    const photosJson = JSON.stringify(Array.isArray(p.photos) ? p.photos : []);
    const createdOnJson = JSON.stringify(p.createdOn ?? null);
    const i18nJson = JSON.stringify(p.i18n || {});
    const cells = [
      p.id,
      p.name || '',
      p.description || '',
      p.author || '',
      p.location?.address ?? '',
      p.openingAddress ?? '',
      p.openingDate || '',
      tags,
      en.name ?? '',
      en.description ?? '',
      en.author ?? '',
      en.address ?? '',
      en.openingAddress ?? '',
      tagsEn,
      p.location?.lat ?? '',
      p.location?.lng ?? '',
      photosJson,
      photoCount,
      placeHasPhotos(p) ? '1' : '0',
      placeHas3d(p) ? '1' : '0',
      p.featured ? '1' : '0',
      p.featuredOrder ?? '',
      p.modelType ?? '',
      p.modelUrl ?? '',
      p.sketchfabUrl ?? '',
      createdOnJson,
      tsToIso(p.createdAt),
      tsToIso(p.updatedAt),
      i18nJson
    ];
    lines.push(cells.map(csvEscape).join(','));
  }
  return lines.join('\r\n');
}

function downloadBlob(filename, mime, body) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

gateAdmin(async () => {
  const reloadBtn = document.getElementById('reload-btn');
  const downloadJsonBtn = document.getElementById('download-json');
  const downloadCsvBtn = document.getElementById('download-csv');
  const exportCountEl = document.getElementById('export-count');
  const customRangeEl = document.getElementById('custom-range');
  const customFrom = document.getElementById('custom-from');
  const customTo = document.getElementById('custom-to');
  const filterPhotos = document.getElementById('filter-photos');
  const filter3d = document.getElementById('filter-3d');

  /** @type {Array<{ id: string } & Record<string, unknown>>} */
  let places = [];

  function getFiltered() {
    const preset = document.querySelector('input[name="period-preset"]:checked')?.value || 'all';
    const nowMs = Date.now();
    const { start, end } = getPeriodBounds(
      preset,
      customFrom?.value || '',
      customTo?.value || '',
      nowMs
    );
    const photosOnly = !!(filterPhotos && filterPhotos.checked);
    const d3Only = !!(filter3d && filter3d.checked);

    return places.filter(p =>
      matchesPeriod(p, start, end) && matchesMediaFilters(p, photosOnly, d3Only)
    );
  }

  function refreshCount() {
    if (!exportCountEl) return;
    const n = getFiltered().length;
    exportCountEl.textContent = tp(
      'admin.placesExport.count',
      'В базе: {total}, после фильтров: {n}',
      { total: places.length, n }
    );
  }

  function toggleCustomRange() {
    const preset = document.querySelector('input[name="period-preset"]:checked')?.value;
    if (!customRangeEl) return;
    customRangeEl.classList.toggle('is-visible', preset === 'custom');
  }

  async function loadPlaces() {
    try {
      places = await getPlaces();
      refreshCount();
      showToast(tp('admin.placesExport.loaded', 'Данные обновлены'));
    } catch (e) {
      console.error(e);
      showToast(tp('admin.placesExport.loadError', 'Не удалось загрузить места'), 'error');
    }
  }

  document.querySelectorAll('input[name="period-preset"]').forEach(el => {
    el.addEventListener('change', () => {
      toggleCustomRange();
      refreshCount();
    });
  });
  customFrom?.addEventListener('change', refreshCount);
  customTo?.addEventListener('change', refreshCount);
  filterPhotos?.addEventListener('change', refreshCount);
  filter3d?.addEventListener('change', refreshCount);

  reloadBtn?.addEventListener('click', loadPlaces);

  downloadJsonBtn?.addEventListener('click', () => {
    const preset = document.querySelector('input[name="period-preset"]:checked')?.value || 'all';
    if (preset === 'custom' && (!customFrom?.value || !customTo?.value)) {
      showToast(tp('admin.placesExport.customIncomplete', 'Укажите обе даты диапазона'), 'error');
      return;
    }
    const rows = getFiltered();
    if (!rows.length) {
      showToast(tp('admin.placesExport.emptyFiltered', 'Нет мест для выгрузки по текущим фильтрам'), 'error');
      return;
    }
    const payload = rows.map(serializePlace);
    downloadBlob(`places-export-${Date.now()}.json`, 'application/json;charset=utf-8',
      JSON.stringify(payload, null, 2));
  });

  downloadCsvBtn?.addEventListener('click', () => {
    const preset = document.querySelector('input[name="period-preset"]:checked')?.value || 'all';
    if (preset === 'custom' && (!customFrom?.value || !customTo?.value)) {
      showToast(tp('admin.placesExport.customIncomplete', 'Укажите обе даты диапазона'), 'error');
      return;
    }
    const rows = getFiltered();
    if (!rows.length) {
      showToast(tp('admin.placesExport.emptyFiltered', 'Нет мест для выгрузки по текущим фильтрам'), 'error');
      return;
    }
    const csv = '\uFEFF' + placesToCsv(rows);
    downloadBlob(`places-export-${Date.now()}.csv`, 'text/csv;charset=utf-8', csv);
  });

  toggleCustomRange();
  await loadPlaces();
});
