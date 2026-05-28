import { initNav } from '../../../js/shared/nav.js';
import { getLang, loadDict, t } from '../../../js/shared/i18n.js';
import { bindAdminLogout, gateAdmin } from '../shared/admin-guard.js';

initNav('../../');
bindAdminLogout();

const REPORT_STORAGE_KEY = 'placesImportReportV1';

let dict = null;
loadDict(getLang()).then(d => {
  dict = d;
  const dt = t('admin.placesImportReport.docTitle', d);
  if (dt && dt !== 'admin.placesImportReport.docTitle') document.title = dt;
}).catch(() => {});

function tp(key, fallback, vars) {
  let raw = dict ? t(key, dict) : key;
  if (!raw || raw === key) raw = fallback;
  if (vars && typeof raw === 'string') {
    return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  }
  return raw;
}

function reportToText(rep) {
  if (!rep) return '';
  const lines = [];
  lines.push(tp('admin.placesImportReport.fileTitle', 'Отчёт об импорте мест'));
  lines.push('');
  lines.push(`${tp('admin.placesImportReport.started', 'Начато')}: ${rep.startedAt || '—'}`);
  lines.push(`${tp('admin.placesImportReport.ended', 'Завершено')}: ${rep.endedAt || '—'}`);
  lines.push(`${tp('admin.placesImportReport.file', 'Файл')}: ${rep.fileHint || '—'}`);
  if (rep.errorMessage) {
    lines.push(`${tp('admin.placesImportReport.error', 'Ошибка')}: ${rep.errorMessage}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  for (const r of rep.rows || []) {
    lines.push(
      [
        `#${r.rowIndex ?? '—'}`,
        r.idLine || '—',
        r.action || '—',
        (r.reason || '').replace(/\r?\n/g, ' '),
        `RU файл: ${r.nameRuFile || '—'}`,
        `EN файл: ${r.nameEnFile || '—'}`,
        `BE файл: ${r.nameBeFile || '—'}`,
        `RU БД: ${r.nameRuDb || '—'}`,
        `EN БД: ${r.nameEnDb || '—'}`,
        `BE БД: ${r.nameBeDb || '—'}`
      ].join(' | ')
    );
  }
  lines.push('');
  lines.push(
    `${tp('admin.placesImportReport.generated', 'Отчёт сформирован')}: ${new Date().toISOString()}`
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(tp('admin.placesImportReport.footerOptions', 'Глобальные опции'));
  lines.push(
    `${tp('admin.placesImportReport.optReplaceAll', 'Массовая перезапись всех конфликтов')}: ${
      rep.globalReplaceAllUsed
        ? tp('admin.placesImportReport.yes', 'да')
        : tp('admin.placesImportReport.no', 'нет')
    }`
  );
  return lines.join('\n');
}

gateAdmin(() => {
  const metaEl = document.getElementById('report-meta');
  const tbody = document.getElementById('report-tbody');
  const emptyEl = document.getElementById('report-empty');
  const errEl = document.getElementById('report-error');
  const dlBtn = document.getElementById('btn-download-report');

  let raw = null;
  try {
    raw = sessionStorage.getItem(REPORT_STORAGE_KEY);
  } catch {
    raw = null;
  }

  let rep = null;
  if (raw) {
    try {
      rep = JSON.parse(raw);
    } catch {
      rep = null;
    }
  }

  if (!rep || !Array.isArray(rep.rows)) {
    emptyEl.classList.remove('hidden');
    dlBtn.disabled = true;
    return;
  }

  emptyEl.classList.add('hidden');
  dlBtn.disabled = false;

  metaEl.textContent = [
    `${tp('admin.placesImportReport.started', 'Начато')}: ${rep.startedAt || '—'}`,
    `${tp('admin.placesImportReport.ended', 'Завершено')}: ${rep.endedAt || '—'}`,
    `${tp('admin.placesImportReport.file', 'Файл')}: ${rep.fileHint || '—'}`,
    `${tp('admin.placesImportReport.optReplaceAll', 'Массовая перезапись всех конфликтов')}: ${
      rep.globalReplaceAllUsed
        ? tp('admin.placesImportReport.yes', 'да')
        : tp('admin.placesImportReport.no', 'нет')
    }`
  ].join(' · ');

  if (rep.errorMessage) {
    errEl.textContent = `${tp('admin.placesImportReport.error', 'Ошибка')}: ${rep.errorMessage}`;
    errEl.classList.remove('hidden');
  }

  const actLabel = (a) => {
    if (a === 'created') return tp('admin.placesImportReport.actCreated', 'создано');
    if (a === 'updated') return tp('admin.placesImportReport.actUpdated', 'обновлено');
    if (a === 'skipped') return tp('admin.placesImportReport.actSkipped', 'пропущено');
    if (a === 'error') return tp('admin.placesImportReport.actError', 'ошибка');
    return a || '—';
  };

  tbody.innerHTML = (rep.rows || [])
    .map(
      r => `
    <tr>
      <td>${r.rowIndex ?? '—'}</td>
      <td><code>${String(r.idLine || '—').replace(/</g, '&lt;')}</code></td>
      <td>${actLabel(r.action)}</td>
      <td>${String(r.reason || '').replace(/</g, '&lt;')}</td>
      <td><small>${String(r.nameRuFile || '—').replace(/</g, '&lt;')}</small></td>
      <td><small>${String(r.nameEnFile || '—').replace(/</g, '&lt;')}</small></td>
      <td><small>${String(r.nameBeFile || '—').replace(/</g, '&lt;')}</small></td>
      <td><small>${String(r.nameRuDb || '—').replace(/</g, '&lt;')}</small></td>
      <td><small>${String(r.nameEnDb || '—').replace(/</g, '&lt;')}</small></td>
      <td><small>${String(r.nameBeDb || '—').replace(/</g, '&lt;')}</small></td>
    </tr>`
    )
    .join('');

  dlBtn.addEventListener('click', () => {
    const text = reportToText(rep);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `places-import-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });
});
