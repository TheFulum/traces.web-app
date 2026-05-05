import { initNav } from '../../../js/shared/nav.js';
import {
  getPlace,
  addPlace,
  updatePlace,
  createPlaceWithId
} from '../../../js/shared/places.js';
import { showToast } from '../../../js/shared/utils.js';
import { getLang, loadDict, t } from '../../../js/shared/i18n.js';
import { bindAdminLogout, gateAdmin } from '../shared/admin-guard.js';

initNav('../../');
bindAdminLogout();

const MAX_ROWS = 50;
const REPORT_STORAGE_KEY = 'placesImportReportV1';

let dict = null;
loadDict(getLang()).then(d => {
  dict = d;
  const dt = t('admin.placesImport.docTitle', d);
  if (dt && dt !== 'admin.placesImport.docTitle') document.title = dt;
}).catch(() => {});

function tp(key, fallback, vars) {
  let raw = dict ? t(key, dict) : key;
  if (!raw || raw === key) raw = fallback;
  if (vars && typeof raw === 'string') {
    return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  }
  return raw;
}

function namesFromPlace(p) {
  if (!p) return { ru: '', en: '' };
  const ru = String(p.name || p.i18n?.ru?.name || '').trim();
  const en = String(p.i18n?.en?.name || '').trim();
  return { ru, en };
}

function stripIdsTimestamps(raw) {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = raw;
  return rest;
}

/** Простой CSV с кавычками RFC-подобно */
function parseCsv(text) {
  const s = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let i = 0;
  let inQ = false;
  while (i < s.length) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += c;
    i++;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/** Строка CSV → объект полей места */
function csvRowToPlace(headerRow, cells) {
  const map = {};
  headerRow.forEach((h, idx) => {
    map[normalizeHeader(h)] = cells[idx] ?? '';
  });

  let i18n = {};
  try {
    i18n = JSON.parse(map.i18n_json || '{}');
    if (!i18n || typeof i18n !== 'object') i18n = {};
  } catch {
    i18n = {};
  }

  const tags = String(map.tags || '')
    .split(';')
    .map(x => x.trim())
    .filter(Boolean);

  let photos = [];
  try {
    const ph = JSON.parse(map.photos_json || '[]');
    photos = Array.isArray(ph) ? ph : [];
  } catch {
    photos = [];
  }

  let createdOn = null;
  try {
    createdOn = JSON.parse(map.created_on_json || 'null');
  } catch {
    createdOn = null;
  }

  const enPatch = {};
  if (map.name_en) enPatch.name = map.name_en;
  if (map.description_en) enPatch.description = map.description_en;
  if (map.author_en) enPatch.author = map.author_en;
  if (map.address_en) enPatch.address = map.address_en;
  if (map.opening_address_en) enPatch.openingAddress = map.opening_address_en;
  if (map.tags_en) {
    enPatch.tags = String(map.tags_en)
      .split(';')
      .map(x => x.trim())
      .filter(Boolean);
  }
  if (Object.keys(enPatch).length) {
    i18n.en = { ...(i18n.en || {}), ...enPatch };
  }

  const openingDate = map.openingdate || map.opening_date || '';

  return {
    ...(map.id ? { id: String(map.id).trim() } : {}),
    name: map.name || '',
    description: map.description || '',
    author: map.author || '',
    openingAddress: map.opening_address || '',
    openingDate: String(openingDate || '').trim(),
    tags,
    photos,
    location: {
      lat: Number(map.lat) || 0,
      lng: Number(map.lng) || 0,
      address: map.address || ''
    },
    featured: map.featured === '1' || map.featured === 'true',
    featuredOrder:
      map.featured_order === '' || map.featured_order == null
        ? null
        : Number(map.featured_order),
    modelType: map.model_type || null,
    modelUrl: map.model_url || null,
    sketchfabUrl: map.sketchfab_url || null,
    createdOn,
    i18n
  };
}

function parseImportedPlaces(text, fileName) {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) throw new Error(tp('admin.placesImport.errEmpty', 'Файл пуст'));

  let rows = [];

  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed);
    if (!Array.isArray(arr)) {
      throw new Error(tp('admin.placesImport.errJsonArray', 'JSON должен быть массивом объектов'));
    }
    rows = arr;
  } else {
    const csvRows = parseCsv(trimmed);
    if (csvRows.length < 2) {
      throw new Error(tp('admin.placesImport.errCsv', 'В CSV нужны строка заголовков и данные'));
    }
    const headerRow = csvRows[0];
    for (let r = 1; r < csvRows.length; r++) {
      rows.push(csvRowToPlace(headerRow, csvRows[r]));
    }
  }

  if (rows.length > MAX_ROWS) {
    throw new Error(tp('admin.placesImport.errTooMany', 'Не больше {max} мест за раз', { max: MAX_ROWS }));
  }

  const ids = rows.map(r => r.id).filter(id => id != null && String(id).trim() !== '');
  const dup = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (dup.length) {
    throw new Error(
      tp('admin.placesImport.errDupIds', 'В файле повторяются id: {ids}', {
        ids: [...new Set(dup)].join(', ')
      })
    );
  }

  return rows;
}

gateAdmin(async () => {
  const fileInput = document.getElementById('import-file');
  const btnParse = document.getElementById('btn-parse');
  const btnRun = document.getElementById('btn-run');
  const btnReplaceAll = document.getElementById('btn-replace-all-conflicts');
  const previewWrap = document.getElementById('import-preview');
  const hintConflict = document.getElementById('hint-conflicts');

  /** @type {null | { rows: object[], items: object[], replaceAllClicked: boolean }} */
  let session = null;

  async function buildItems(rows) {
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const fileId = raw.id != null && String(raw.id).trim() !== '' ? String(raw.id).trim() : null;
      let exists = false;
      let dbPlace = null;
      if (fileId) {
        dbPlace = await getPlace(fileId);
        exists = !!dbPlace;
      }
      items.push({
        index: i,
        raw,
        fileId,
        conflict: !!exists,
        dbPlace,
        resolution: exists ? 'pending' : null
      });
    }
    return items;
  }

  function renderPreview() {
    if (!session) {
      previewWrap.innerHTML = '';
      hintConflict.classList.add('hidden');
      btnRun.disabled = true;
      btnReplaceAll.disabled = true;
      return;
    }

    const { items, replaceAllClicked } = session;
    const conflicts = items.filter(it => it.conflict);

    if (conflicts.length) {
      hintConflict.classList.remove('hidden');
      btnReplaceAll.disabled = false;
    } else {
      hintConflict.classList.add('hidden');
      btnReplaceAll.disabled = true;
    }

    const nf = namesFromPlace;

    let html = '<div class="import-summary">';
    html += `<p>${tp('admin.placesImport.summaryTotal', 'Всего строк: {n}', { n: items.length })}</p>`;
    html += `<p>${tp('admin.placesImport.summaryConflicts', 'Конфликтов по id: {n}', { n: conflicts.length })}</p>`;
    if (replaceAllClicked) {
      html += `<p class="import-warning">${tp('admin.placesImport.bannerReplaceAll', 'Включена массовая перезапись конфликтов — данные в БД будут заменены.')}</p>`;
    }
    html += '</div>';

    html += '<table class="admin-table import-table"><thead><tr>';
    html += `<th>#</th>`;
    html += `<th>${tp('admin.placesImport.colId', 'Id в файле')}</th>`;
    html += `<th>${tp('admin.placesImport.colDb', 'БД')}</th>`;
    html += `<th>${tp('admin.placesImport.colFile', 'Файл')}</th>`;
    html += `<th>${tp('admin.placesImport.colAction', 'Действие')}</th>`;
    html += '</tr></thead><tbody>';

    for (const it of items) {
      const fn = nf(it.raw);
      const dn = nf(it.dbPlace);

      html += '<tr>';
      html += `<td>${it.index + 1}</td>`;
      html += `<td><code>${it.fileId || '—'}</code></td>`;

      if (!it.conflict) {
        html += `<td colspan="2"><span class="import-muted">${tp('admin.placesImport.rowNew', 'Новая запись — будет создана автоматически')}</span><br>`;
        html += `<small>RU: ${escapeHtml(fn.ru || '—')} / EN: ${escapeHtml(fn.en || '—')}</small></td>`;
        html += `<td>—</td>`;
      } else {
        html += `<td class="import-names"><strong>RU:</strong> ${escapeHtml(dn.ru || '—')}<br><strong>EN:</strong> ${escapeHtml(dn.en || '—')}</td>`;
        html += `<td class="import-names"><strong>RU:</strong> ${escapeHtml(fn.ru || '—')}<br><strong>EN:</strong> ${escapeHtml(fn.en || '—')}</td>`;
        html += '<td class="import-actions">';
        const res = it.resolution;
        html += `<button type="button" class="btn btn--outline btn--sm" data-act="skip" data-idx="${it.index}">${tp('admin.placesImport.btnSkip', 'Не импортировать')}</button> `;
        html += `<button type="button" class="btn btn--outline btn--sm" data-act="newId" data-idx="${it.index}">${tp('admin.placesImport.btnNewId', 'Новый id')}</button> `;
        html += `<button type="button" class="btn btn--outline btn--sm" data-act="overwrite" data-idx="${it.index}">${tp('admin.placesImport.btnOverwrite', 'Перезаписать')}</button>`;
        html += `<div class="import-res">${resolutionLabel(res)}</div>`;
        html += '</td>';
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    previewWrap.innerHTML = html;

    previewWrap.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        const act = btn.getAttribute('data-act');
        const item = session.items[idx];
        if (!item || !item.conflict) return;
        item.resolution = act;
        renderPreview();
        updateRunEnabled();
      });
    });

    updateRunEnabled();
  }

  function resolutionLabel(res) {
    if (res === 'skip') return tp('admin.placesImport.resSkip', 'Выбрано: не импортировать');
    if (res === 'newId') return tp('admin.placesImport.resNewId', 'Выбрано: новый id');
    if (res === 'overwrite') return tp('admin.placesImport.resOverwrite', 'Выбрано: перезаписать');
    if (res === 'pending') return tp('admin.placesImport.resPending', 'Выберите действие');
    return '';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateRunEnabled() {
    if (!session) {
      btnRun.disabled = true;
      return;
    }
    const pending = session.items.some(it => it.conflict && it.resolution === 'pending');
    btnRun.disabled = pending;
  }

  btnReplaceAll.addEventListener('click', () => {
    if (!session) return;
    const ok = window.confirm(
      tp(
        'admin.placesImport.confirmReplaceAll',
        'Заменить данные по ВСЕМ конфликтующим id данными из файла? Текущее содержимое документов в базе будет безвозвратно перезаписано.'
      )
    );
    if (!ok) return;
    session.items.forEach(it => {
      if (it.conflict) it.resolution = 'overwrite';
    });
    session.replaceAllClicked = true;
    renderPreview();
  });

  btnParse.addEventListener('click', async () => {
    const f = fileInput.files?.[0];
    if (!f) {
      showToast(tp('admin.placesImport.pickFile', 'Выберите файл'), 'error');
      return;
    }
    try {
      const text = await f.text();
      const rows = parseImportedPlaces(text, f.name);
      const items = await buildItems(rows);
      session = { rows, items, replaceAllClicked: false };
      renderPreview();
      showToast(tp('admin.placesImport.parsed', 'Файл разобран'));
    } catch (e) {
      console.error(e);
      session = null;
      renderPreview();
      showToast(e.message || tp('admin.placesImport.parseErr', 'Не удалось разобрать файл'), 'error');
    }
  });

  btnRun.addEventListener('click', async () => {
    if (!session) return;

    const startedAt = new Date().toISOString();
    const report = {
      version: 1,
      startedAt,
      endedAt: null,
      globalReplaceAllUsed: session.replaceAllClicked,
      fileHint: fileInput.files?.[0]?.name || '',
      rows: []
    };

    try {
      for (const it of session.items) {
        try {
          const rawFile = it.raw;
          const fn = namesFromPlace(rawFile);
          const dn = namesFromPlace(it.dbPlace);

          if (!it.conflict) {
            const payload = stripIdsTimestamps(rawFile);

            if (it.fileId) {
              await createPlaceWithId(it.fileId, payload);
              report.rows.push({
                rowIndex: it.index + 1,
                sourceFileId: it.fileId,
                resultId: it.fileId,
                idLine: it.fileId,
                action: 'created',
                reason: tp('admin.placesImport.rCreatedId', 'Создан документ с id из файла'),
                nameRuFile: fn.ru,
                nameEnFile: fn.en,
                nameRuDb: '',
                nameEnDb: ''
              });
            } else {
              const newId = await addPlace(payload);
              report.rows.push({
                rowIndex: it.index + 1,
                sourceFileId: null,
                resultId: newId,
                idLine: newId,
                action: 'created',
                reason: tp('admin.placesImport.rCreatedAuto', 'Создан документ с новым id'),
                nameRuFile: fn.ru,
                nameEnFile: fn.en,
                nameRuDb: '',
                nameEnDb: ''
              });
            }
            continue;
          }

          const payload = stripIdsTimestamps(rawFile);

          if (it.resolution === 'skip') {
            report.rows.push({
              rowIndex: it.index + 1,
              sourceFileId: it.fileId,
              resultId: it.fileId,
              idLine: it.fileId,
              action: 'skipped',
              reason: tp('admin.placesImport.rSkipped', 'Пропуск по решению пользователя'),
              nameRuFile: fn.ru,
              nameEnFile: fn.en,
              nameRuDb: dn.ru,
              nameEnDb: dn.en
            });
            continue;
          }

          if (it.resolution === 'overwrite') {
            await updatePlace(it.fileId, payload);
            report.rows.push({
              rowIndex: it.index + 1,
              sourceFileId: it.fileId,
              resultId: it.fileId,
              idLine: it.fileId,
              action: 'updated',
              reason: tp('admin.placesImport.rOverwrite', 'Документ перезаписан из файла'),
              nameRuFile: fn.ru,
              nameEnFile: fn.en,
              nameRuDb: dn.ru,
              nameEnDb: dn.en
            });
            continue;
          }

          if (it.resolution === 'newId') {
            const newId = await addPlace(payload);
            report.rows.push({
              rowIndex: it.index + 1,
              sourceFileId: it.fileId,
              resultId: newId,
              idLine: `${it.fileId} → ${newId}`,
              action: 'created',
              reason: tp('admin.placesImport.rNewId', 'Импорт как новое место (конфликт id)'),
              nameRuFile: fn.ru,
              nameEnFile: fn.en,
              nameRuDb: dn.ru,
              nameEnDb: dn.en
            });
            continue;
          }

          throw new Error(tp('admin.placesImport.internalPending', 'Внутренняя ошибка: не выбрано действие'));
        } catch (rowErr) {
          console.error(rowErr);
          const fn = namesFromPlace(it.raw);
          const dn = namesFromPlace(it.dbPlace);
          report.rows.push({
            rowIndex: it.index + 1,
            sourceFileId: it.fileId || null,
            resultId: null,
            idLine: it.fileId || '—',
            action: 'error',
            reason: rowErr.message || String(rowErr),
            nameRuFile: fn.ru,
            nameEnFile: fn.en,
            nameRuDb: dn.ru,
            nameEnDb: dn.en
          });
          report.errorMessage = rowErr.message || String(rowErr);
          report.endedAt = new Date().toISOString();
          sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report));
          showToast(
            tp('admin.placesImport.stoppedError', 'Импорт остановлен из-за ошибки. Откройте отчёт.'),
            'error'
          );
          window.location.href = 'places-import-report.html';
          return;
        }
      }

      report.endedAt = new Date().toISOString();
      sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report));
      window.location.href = 'places-import-report.html';
    } catch (e) {
      console.error(e);
      report.endedAt = new Date().toISOString();
      report.errorMessage = e.message || String(e);
      sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report));
      showToast(
        tp('admin.placesImport.stoppedError', 'Импорт остановлен из-за ошибки. Откройте отчёт.'),
        'error'
      );
      window.location.href = 'places-import-report.html';
    }
  });

  renderPreview();
});
