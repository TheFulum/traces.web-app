import { initNav } from '../../../js/shared/nav.js';
import { auth } from '../../../js/shared/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getPlaces, addPlace, updatePlace, deletePlace } from '../../../js/shared/places.js';
import { uploadImages, uploadModel } from '../../../js/shared/cloudinary.js';
import { showToast } from '../../../js/shared/utils.js';
import { getLang, loadDict, t } from '../../../js/shared/i18n.js';

initNav('../../');

let dict = null;
loadDict(getLang()).then(d => { dict = d; }).catch(() => {});
const tp = (key, fallback) => (dict ? t(key, dict) : null) || fallback;

// ── auth guard ────────────────────────────────────────────────────────────

onAuthStateChanged(auth, user => { if (!user) window.location.href = 'login.html'; });

document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// ── state ─────────────────────────────────────────────────────────────────

let places           = [];
let editingId        = null;
let photoUrls        = [];
let newFiles         = [];
let modelFile        = null;
let existingModelUrl = null;
let existingSketchfabUrl = null;
let currentModelType = 'file';    // 'file' | 'sketchfab'
let currentTags      = [];
let currentTagsEn    = [];
let pickerMap        = null;
let pickerMarker     = null;

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
const fAddressRu = document.getElementById('f-address-ru');
const fAddressEn = document.getElementById('f-address-en');
const fOpeningAddressRu = document.getElementById('f-opening-address-ru');
const fOpeningAddressEn = document.getElementById('f-opening-address-en');
const fAuthorRu = document.getElementById('f-author-ru');
const fAuthorEn = document.getElementById('f-author-en');
const fDescRu = document.getElementById('f-desc-ru');
const fDescEn = document.getElementById('f-desc-en');

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

// ── table ─────────────────────────────────────────────────────────────────

function renderTable() {
  const tbody   = document.getElementById('places-tbody');
  const emptyEl = document.getElementById('empty-state');

  if (!places.length) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  tbody.innerHTML = places.map(p => {
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
    const langs = `${hasRu ? 'RU' : '—'}${hasEn ? ' / EN' : ''}`;

    return `
    <tr>
      <td>${p.photos?.[0]
        ? `<img class="table-thumb" src="${esc(p.photos[0])}" alt="" />`
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
      if (btn.dataset.action === 'edit')   openEdit(btn.dataset.id);
      if (btn.dataset.action === 'delete') confirmDelete(btn.dataset.id);
    });
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

// ── modal ─────────────────────────────────────────────────────────────────

document.getElementById('add-btn').addEventListener('click', () => openModal(null));

function openEdit(id) {
  const place = places.find(p => p.id === id);
  if (place) openModal(place);
}

function openModal(place) {
  editingId            = place?.id || null;
  photoUrls            = place?.photos ? [...place.photos] : [];
  newFiles             = [];
  modelFile            = null;
  existingModelUrl     = null;
  existingSketchfabUrl = null;
  currentTags          = place?.tags ? [...place.tags] : [];
  currentTagsEn        = place?.i18n?.en?.tags ? [...place.i18n.en.tags] : [];

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
  fAddressRu.value = place?.i18n?.ru?.address || place?.location?.address || '';
  fAddressEn.value = place?.i18n?.en?.address || '';
  document.getElementById('f-lat').value                = place?.location?.lat || '';
  document.getElementById('f-lng').value                = place?.location?.lng || '';
  document.getElementById('f-opening-date').value       = place?.openingDate || '';
  fOpeningAddressRu.value = place?.i18n?.ru?.openingAddress || place?.openingAddress || '';
  fOpeningAddressEn.value = place?.i18n?.en?.openingAddress || '';
  fAuthorRu.value = place?.i18n?.ru?.author || place?.author || '';
  fAuthorEn.value = place?.i18n?.en?.author || '';
  fDescRu.value = place?.i18n?.ru?.description || place?.description || '';
  fDescEn.value = place?.i18n?.en?.description || '';
  document.getElementById('f-tags-input').value         = '';
  document.getElementById('f-sketchfab-url').value      = existingSketchfabUrl || '';
  document.getElementById('photo-progress').textContent = '';
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

  renderPhotoPreviews();
  renderTags();
  renderTagsEn();
  renderModelPreview();

  document.getElementById('modal').classList.remove('hidden');
  setTimeout(() => { initPickerMap(); }, 50);
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  if (pickerMap) { pickerMap.remove(); pickerMap = null; pickerMarker = null; }
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ── coord picker + Nominatim reverse geocode ──────────────────────────────

function initPickerMap() {
  if (pickerMap) return;
  const L   = window.L;
  const lat = parseFloat(document.getElementById('f-lat').value) || 53.9;
  const lng = parseFloat(document.getElementById('f-lng').value) || 27.5667;

  pickerMap = L.map('coord-map', { attributionControl: false }).setView([lat, lng], 7);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd'
  }).addTo(pickerMap);

  if (document.getElementById('f-lat').value) {
    pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
  }

  pickerMap.on('click', async e => {
    const { lat, lng } = e.latlng;
    document.getElementById('f-lat').value = lat.toFixed(6);
    document.getElementById('f-lng').value = lng.toFixed(6);
    document.getElementById('coord-hint').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    if (pickerMarker) pickerMap.removeLayer(pickerMarker);
    pickerMarker = L.marker([lat, lng]).addTo(pickerMap);

    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`, {
        headers: { 'User-Agent': 'TracesOfThePast/1.0' }
      });
      const data = await res.json();
      if (data?.display_name) {
        fAddressRu.value = data.display_name;
      }
    } catch { /* silent */ }
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

// ── photo upload ──────────────────────────────────────────────────────────

const uploadArea = document.getElementById('upload-area');
const fileInput  = document.getElementById('file-input');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles(fileInput.files));
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag'));
uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.classList.remove('drag'); handleFiles(e.dataTransfer.files); });

function handleFiles(files) {
  const remaining = 10 - photoUrls.length - newFiles.length;
  const toAdd = Array.from(files).slice(0, remaining);
  if (!toAdd.length) { showToast('Максимум 10 фотографий', 'error'); return; }
  newFiles.push(...toAdd);
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');
  const existingHtml = photoUrls.map((url, i) => `
    <div class="photo-preview">
      <img src="${esc(url)}" alt="" />
      <button class="photo-preview__del" data-type="existing" data-idx="${i}">×</button>
    </div>`).join('');
  const newHtml = newFiles.map((file, i) => `
    <div class="photo-preview">
      <img src="${URL.createObjectURL(file)}" alt="" />
      <button class="photo-preview__del" data-type="new" data-idx="${i}">×</button>
    </div>`).join('');
  container.innerHTML = existingHtml + newHtml;
  container.querySelectorAll('.photo-preview__del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.type === 'existing') photoUrls.splice(parseInt(btn.dataset.idx), 1);
      else newFiles.splice(parseInt(btn.dataset.idx), 1);
      renderPhotoPreviews();
    });
  });
}

// ── model file upload ────────────────────────────────────────────────────

const modelUploadArea = document.getElementById('model-upload-area');
const modelFileInput  = document.getElementById('model-file-input');

modelUploadArea.addEventListener('click', () => modelFileInput.click());
modelFileInput.addEventListener('change', () => {
  if (modelFileInput.files[0]) {
    modelFile = modelFileInput.files[0];
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
  if (f) { modelFile = f; existingModelUrl = null; renderModelPreview(); }
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
  const addressRu      = fAddressRu.value.trim();
  const addressEn      = fAddressEn.value.trim();
  const openingAddressRu = fOpeningAddressRu.value.trim();
  const openingAddressEn = fOpeningAddressEn.value.trim();
  const authorRu       = fAuthorRu.value.trim();
  const authorEn       = fAuthorEn.value.trim();
  const descRu         = fDescRu.value.trim();
  const descEn         = fDescEn.value.trim();
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
  saveBtn.disabled = true;
  saveBtn.textContent = 'Сохранение…';

  try {
    let uploadedUrls = [];
    if (newFiles.length) {
      const progressEl = document.getElementById('photo-progress');
      uploadedUrls = await uploadImages(newFiles, (_fi, _fp, overall) => {
        progressEl.textContent = `Загрузка фото… ${overall}%`;
      });
      document.getElementById('photo-progress').textContent = '';
    }

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
      location:       { lat: isNaN(lat) ? 0 : lat, lng: isNaN(lng) ? 0 : lng, address: addressRu },
      photos:         [...photoUrls, ...uploadedUrls],
      modelUrl:       finalModelUrl || null,
      sketchfabUrl:   finalSketchfabUrl || null,
      modelType:      finalModelType,
      i18n: {
        ru: {
          name: nameRu,
          description: descRu,
          author: authorRu,
          address: addressRu,
          openingAddress: openingAddressRu
        },
        en: {
          name: nameEn,
          description: descEn,
          author: authorEn,
          address: addressEn,
          openingAddress: openingAddressEn,
          ...(currentTagsEn.length ? { tags: currentTagsEn } : {})
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
    saveBtn.disabled = false;
    saveBtn.textContent = 'Сохранить';
  }
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
