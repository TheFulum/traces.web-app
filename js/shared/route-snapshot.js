/** Полное состояние маршрута для ссылки «Поделиться» / профиля (v1). */

export const ROUTE_SNAPSHOT_V = 1;

/** UTF-8 → base64url (без padding). */
export function encodeRouteSnapshot(snapshot) {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeRouteSnapshot(encoded) {
  if (!encoded || typeof encoded !== 'string') return null;
  let b64 = encoded.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const json = new TextDecoder().decode(bytes);
  const snap = JSON.parse(json);
  if (!snap || snap.v !== ROUTE_SNAPSHOT_V) return null;
  return snap;
}

export function readRouteSnapshotFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('route');
    if (q) {
      const snap = decodeRouteSnapshot(q);
      if (snap) return snap;
    }
    const rawHash = window.location.hash.replace(/^#/, '');
    if (rawHash.startsWith('route=')) {
      const snap = decodeRouteSnapshot(rawHash.slice(6));
      if (snap) return snap;
    }
    const fromAmp = /(?:^|&)route=([^&]+)/.exec(rawHash);
    if (fromAmp?.[1]) {
      const snap = decodeRouteSnapshot(decodeURIComponent(fromAmp[1]));
      if (snap) return snap;
    }
  } catch (e) {
    console.warn('route snapshot:', e);
  }
  return null;
}

/** Полный URL страницы маршрута снимком в query или hash (если длинно). */
export function buildRoutePageUrlWithSnapshot(snapshot, langCode) {
  const encoded = encodeRouteSnapshot(snapshot);
  const u = new URL('pages/route.html', `${window.location.origin}/`);
  u.searchParams.set('lang', langCode || 'ru');
  if (encoded.length < 1600) {
    u.searchParams.set('route', encoded);
  } else {
    u.hash = `route=${encoded}`;
  }
  return u.toString();
}

function round6(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(6) : '';
}

/** Отпечаток для антидубликата в профиле. */
export function fingerprintSnapshot(snap) {
  if (!snap || snap.v !== ROUTE_SNAPSHOT_V) return '';
  const norm = {
    p: (snap.places || []).map((x) => String(x?.id || '').trim()),
    dc: snap.dayCount || 1,
    o: (snap.overnight || []).map((x) =>
      x && Number.isFinite(Number(x.lat))
        ? `${round6(x.lat)},${round6(x.lng)},${String(x.name || '').slice(0, 120)}`
        : ''
    ),
    st: snap.start || {},
    en: snap.end || {}
  };
  const str = JSON.stringify(norm);
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
