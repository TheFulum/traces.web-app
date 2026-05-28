/** Символы, из‑за которых ломается presigned PUT в R2 (скобки, пробелы, кириллица в ключе и т.д.). */
const UNSAFE_FILENAME_RE = /[^a-zA-Z0-9._-]/g;

/**
 * Безопасное имя для ключа в R2: латиница, цифры, точка, дефис, подчёркивание.
 * @param {string} originalName
 * @returns {string}
 */
export function sanitizeUploadFilename(originalName) {
  const raw = String(originalName || '').trim() || 'file';
  const dot = raw.lastIndexOf('.');
  const hasExt = dot > 0 && dot < raw.length - 1;
  const base = hasExt ? raw.slice(0, dot) : raw;
  const ext = hasExt ? raw.slice(dot + 1) : '';

  let safeBase = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(UNSAFE_FILENAME_RE, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');

  if (!safeBase || safeBase.length < 3 || !/[a-zA-Z0-9]/.test(safeBase)) {
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    safeBase = `file-${stamp}-${rand}`;
  }

  let safeExt = ext
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, 8);

  if (!safeExt && hasExt) {
    safeExt = 'bin';
  }

  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

/** @returns {boolean} */
export function uploadFilenameNeedsFix(name) {
  const raw = String(name || '').trim();
  if (!raw) return false;
  return sanitizeUploadFilename(raw) !== raw;
}

/** Короткое пояснение для toast при выборе файла. */
export function uploadFilenameUserHint(name) {
  if (!uploadFilenameNeedsFix(name)) return '';
  return 'Имя файла будет преобразовано в латиницу для загрузки в R2 (кириллица и скобки в ключе ломают загрузку).';
}
