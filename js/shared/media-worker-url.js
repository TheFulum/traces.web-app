/** Fallback if nothing is set on `window` / Firestore. */
const DEFAULT_MEDIA_WORKER_URL = 'https://traces-media-upload.lipouski-daniil.workers.dev';

/**
 * Resolves Cloudflare Worker base URL for media uploads (3D → R2).
 * Priority: `window.__TRACES_MEDIA_WORKER_URL__` (HTTPS), else built-in default.
 */
export function resolveMediaWorkerUrl() {
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const raw = String(w?.__TRACES_MEDIA_WORKER_URL__ || '').trim().replace(/\/+$/, '');
    if (/^https:\/\/.+/i.test(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_MEDIA_WORKER_URL;
}

/** R2 key → путь /files/photos/…/file.jpg (слэши, не photos%2F — меньше сбоев на слабых сетях). */
export function mediaPublicUrlFromKey(key) {
  const k = String(key || '').trim().replace(/^\/+/, '');
  if (!k) return '';
  const base = resolveMediaWorkerUrl().replace(/\/+$/, '');
  if (k === 'app/traces.apk') return `${base}/app/traces.apk`;
  const path = k.split('/').filter(Boolean).map((seg) => encodeURIComponent(seg)).join('/');
  return `${base}/files/${path}`;
}

/**
 * Абсолютный URL файла на media-воркере.
 * @param {string} urlOrKey
 * @returns {string}
 */
export function resolveMediaPublicUrl(urlOrKey) {
  let raw = String(urlOrKey || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    raw = raw.replace(/%252F/gi, '%2F');
    if (/\/files\/photos%2F/i.test(raw)) {
      try {
        const u = new URL(raw);
        const key = decodeURIComponent(u.pathname.replace(/^\/files\//, ''));
        return mediaPublicUrlFromKey(key);
      } catch {
        return raw;
      }
    }
    return raw;
  }

  let key = raw.replace(/^\/+/, '');
  if (key.startsWith('files/')) key = key.slice('files/'.length);
  if (key.includes('%2F') || key.includes('%2f')) {
    try {
      key = decodeURIComponent(key);
    } catch {
      /* keep */
    }
  }

  if (key.startsWith('photos/') || key.startsWith('models/') || key.startsWith('app/')) {
    return mediaPublicUrlFromKey(key);
  }

  return raw;
}

/** Подсказка, если GET с воркера оборвался (фото в R2 есть). */
export function bindMediaImageErrorHint(root) {
  if (!root || typeof document === 'undefined') return;
  const hint =
    'Фото на сервере есть, но браузер не смог его скачать (сеть). Обновите страницу или смените Wi‑Fi.';
  root.querySelectorAll('img.table-thumb--preview, .photo-preview img').forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return;
    img.addEventListener(
      'error',
      () => {
        img.classList.add('media-img--failed');
        img.title = hint;
        img.alt = 'не загрузилось';
      },
      { once: true }
    );
  });
}

/**
 * Прокси OSRM: GET `<base>/osrm?url=<encodeURIComponent upstream>`.
 * По умолчанию **выключен** (иначе 404, пока на Worker не добавлен маршрут `/osrm`).
 * Включение: `window.__TRACES_OSRM_PROXY__ = true` (тогда base = resolveMediaWorkerUrl)
 * или `window.__TRACES_OSRM_PROXY_BASE__ = 'https://…worker…'` без хвостового слэша.
 */
export function buildOsrmWorkerProxyUrl(upstreamUrl) {
  const u = String(upstreamUrl || '').trim();
  if (!/^https:\/\/routing\.openstreetmap\.de\//i.test(u)) return '';
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const explicit = String(w?.__TRACES_OSRM_PROXY_BASE__ || '').trim().replace(/\/+$/, '');
    if (/^https:\/\/.+/i.test(explicit)) {
      return `${explicit}/osrm?url=${encodeURIComponent(u)}`;
    }
    if (w?.__TRACES_OSRM_PROXY__ !== true) return '';
    const base = resolveMediaWorkerUrl().replace(/\/+$/, '');
    return `${base}/osrm?url=${encodeURIComponent(u)}`;
  } catch {
    return '';
  }
}
