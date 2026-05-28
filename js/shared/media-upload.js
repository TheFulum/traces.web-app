// Media uploads — everything goes through the traces-media-upload
// Worker → Cloudflare R2. No storage credentials on the client; the Worker
// handles Firebase-admin auth, S3 presign and file serving.
import { resolveMediaWorkerUrl, resolveMediaPublicUrl } from './media-worker-url.js';
import { sanitizeUploadFilename } from './upload-filename.js';

const MEDIA_WORKER_URL = resolveMediaWorkerUrl();

/** Must match workers/traces-media-upload.js (kind === photo). */
export const ALLOWED_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

const PHOTO_MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};

function photoExtFromName(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function photoExtFromMime(type) {
  const mime = String(type || '').toLowerCase().split(';')[0].trim();
  return PHOTO_MIME_TO_EXT[mime] || '';
}

/** Имя для R2: латиница + расширение; если в имени нет .webp — берём из file.type. */
export function resolvePhotoUploadFilename(file) {
  let filename = sanitizeUploadFilename(file?.name || 'file');
  let ext = photoExtFromName(filename);
  const mimeExt = photoExtFromMime(file?.type);
  const extOk = ALLOWED_PHOTO_EXTENSIONS.includes(ext);

  if (!extOk && mimeExt) {
    const dot = filename.lastIndexOf('.');
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    filename = `${stem}.${mimeExt}`;
    ext = mimeExt;
  }

  return { filename, ext };
}

/**
 * @param {File} file
 * @returns {{ ok: true, filename: string } | { ok: false, message: string }}
 */
export function validatePhotoUploadFile(file) {
  const { filename, ext } = resolvePhotoUploadFilename(file);
  if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
    const rawExt = photoExtFromName(file?.name || '') || photoExtFromMime(file?.type);
    const hint =
      rawExt === 'heic' || rawExt === 'heif'
        ? ' На iPhone: Настройки → Камера → Форматы → «Совместимость» (JPEG), или экспортируйте фото как JPEG.'
        : ' Поддерживаются JPEG, PNG, WEBP, GIF, AVIF.';
    return { ok: false, message: `Формат «.${rawExt || '?'}» не поддерживается.${hint}` };
  }
  return { ok: true, filename };
}

function mapSignError(status, raw) {
  const msg = String(raw || '').trim();
  if (status === 403 || msg === 'Forbidden') {
    return (
      'Нет доступа к загрузке на Worker. В админке откройте «Пользователи», выберите роль «Админ» для этого аккаунта и нажмите «Сохранить» (синхронизация в KV).'
    );
  }
  if (msg === 'Unsupported image format' || msg.includes('Unsupported image')) {
    return 'Формат изображения не поддерживается. Используйте JPEG, PNG или WEBP (в т.ч. .webp в имени файла; HEIC с iPhone — нет).';
  }
  if (status === 504 || /firebase auth timeout/i.test(msg)) {
    return 'Проверка входа (Firebase) слишком долгая. Подождите и нажмите «Сохранить» снова или смените сеть.';
  }
  return msg || `Upload sign error: ${status}`;
}

/** Attach the current user's Firebase ID token (Worker endpoints are admin-gated). */
async function authHeaders(base = {}) {
  const headers = { ...base };
  try {
    const { auth } = await import('./firebase-init.js');
    const user = auth?.currentUser || null;
    if (user && typeof user.getIdToken === 'function') {
      const token = await user.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

// ── images ────────────────────────────────────────────────────────────────

/** Upload one image → returns its public (Worker-served) URL. */
export async function uploadImage(file, onProgress) {
  const check = validatePhotoUploadFile(file);
  if (!check.ok) throw new Error(check.message);
  return uploadViaMediaWorker('photo', file, onProgress, check.filename);
}

/** Upload up to 10 images → returns an array of public URLs. */
export async function uploadImages(files, onProgress) {
  const fileArray = Array.from(files).slice(0, 10);
  const urls = [];
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    const label = file?.name || `фото ${i + 1}`;
    try {
      const url = await uploadImage(file, (pct) => {
        if (onProgress) {
          const overall = Math.round(((i + pct / 100) / fileArray.length) * 100);
          onProgress(i, pct, overall);
        }
      });
      urls.push(url);
    } catch (e) {
      const detail = String(e?.message || e || 'ошибка загрузки');
      throw new Error(`Файл «${label}» (${i + 1}/${fileArray.length}): ${detail}`);
    }
    if (i < fileArray.length - 1) {
      await new Promise((r) => setTimeout(r, UPLOAD_GAP_MS));
    }
  }
  return urls;
}

// ── 3D models ─────────────────────────────────────────────────────────────

/**
 * Upload a .glb or .gltf file.
 * @param {File} file
 * @param {function(number):void} [onProgress]
 * @returns {Promise<string>} public URL
 */
export async function uploadModel(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['glb', 'gltf'].includes(ext)) {
    throw new Error('Поддерживаются только .glb и .gltf файлы');
  }
  return uploadViaMediaWorker('model', file, onProgress);
}

// ── internal ──────────────────────────────────────────────────────────────

const SIGN_TIMEOUT_MS = 45_000;
const PUT_TIMEOUT_MS = 180_000;
const UPLOAD_GAP_MS = 500;

function isNetworkFailure(msg) {
  return /failed to fetch|networkerror|connection reset|connection timed out|timed out|timeout|abort/i.test(msg);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ac.signal });
  } catch (e) {
    const name = String(e?.name || '');
    const msg = String(e?.message || e || '');
    if (name === 'AbortError' || /abort/i.test(msg)) {
      throw new Error(
        `Таймаут запроса к media-воркеру (${Math.round(timeoutMs / 1000)} с). Сеть перегружена или нестабильна — попробуйте снова.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSignWithRetry(url, options, attempts = 3) {
  let lastErr = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetchWithTimeout(url, options, SIGN_TIMEOUT_MS);
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  }
  const msg = String(lastErr?.message || lastErr || '');
  if (isNetworkFailure(msg)) {
    throw new Error(
      'Нет связи с media-воркером. Проверьте интернет/VPN, отключите блокировщики, загружайте по 2–3 фото за раз или с другой сети (раздача с телефона).'
    );
  }
  throw lastErr || new Error('Не удалось вызвать media-воркер');
}

async function uploadViaMediaWorker(kind, file, onProgress, filenameOverride) {
  const filename = filenameOverride || sanitizeUploadFilename(file?.name || 'file');
  const signRes = await fetchSignWithRetry(`${MEDIA_WORKER_URL}/api/media/sign`, {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      kind,
      filename,
      contentType: file?.type || ''
    })
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok) {
    throw new Error(mapSignError(signRes.status, signData?.error));
  }
  const putUrl = String(signData?.putUrl || '');
  const publicUrl = String(signData?.publicUrl || '');
  const putHeaders = signData?.putHeaders && typeof signData.putHeaders === 'object' ? signData.putHeaders : {};
  if (!putUrl || !publicUrl) throw new Error('Invalid sign response');

  await putFile(putUrl, file, putHeaders, onProgress);
  return resolveMediaPublicUrl(publicUrl);
}

function putFile(url, file, extraHeaders, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.timeout = PUT_TIMEOUT_MS;
    if (extraHeaders && typeof extraHeaders === 'object') {
      Object.entries(extraHeaders).forEach(([k, v]) => {
        try { xhr.setRequestHeader(String(k), String(v)); } catch {}
      });
    }
    if (file?.type) {
      try { xhr.setRequestHeader('Content-Type', file.type); } catch {}
    }
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else if (xhr.status === 403) {
        reject(new Error(
          'R2 отклонил загрузку (403). Проверьте CORS бакета для вашего домена и имя файла (только латиница).'
        ));
      } else reject(new Error(`Ошибка загрузки в R2: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => {
      reject(new Error(
        'Сеть оборвалась при загрузке в R2. Попробуйте снова, файл поменьше или другую сеть.'
      ));
    };
    xhr.ontimeout = () => {
      reject(new Error(
        `Таймаут загрузки в R2 (${Math.round(PUT_TIMEOUT_MS / 1000)} с). Файл слишком тяжёлый или сеть медленная.`
      ));
    };
    xhr.send(file);
  });
}
