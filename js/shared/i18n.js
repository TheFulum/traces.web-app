const SUPPORTED = ['ru', 'en', 'be'];
const DEFAULT_LANG = 'ru';

/** Приводит значение lang из URL/storage к ru | en или ''. */
export function normalizeLangCode(raw) {
  if (raw == null) return '';
  const s = String(raw).trim().toLowerCase();
  if (!s) return '';
  const base = s.split(/[-_]/)[0].slice(0, 8);
  return SUPPORTED.includes(base) ? base : '';
}

/** Accept-Language / Nominatim `accept-language` (BCP‑47-ish). */
export function nominatimAcceptLanguage(siteLang) {
  const c = normalizeLangCode(siteLang) || DEFAULT_LANG;
  if (c === 'en') return 'en';
  if (c === 'be') return 'be';
  return 'ru';
}

export function getLang() {
  const params = new URLSearchParams(location.search);
  let code = normalizeLangCode(params.get('lang'));

  if (!code && location.hash) {
    const hash = location.hash.slice(1);
    const qMark = hash.indexOf('?');
    if (qMark >= 0) {
      code = normalizeLangCode(new URLSearchParams(hash.slice(qMark)).get('lang'));
    }
    if (!code) {
      const m = /(?:^|[?&#])lang=([^&]+)/.exec(location.hash);
      code = normalizeLangCode(m ? decodeURIComponent(m[1]) : '');
    }
  }

  if (code) {
    try {
      localStorage.setItem('lang', code);
    } catch (_) {}
    return code;
  }

  const fromLs = normalizeLangCode(localStorage.getItem('lang'));
  if (fromLs) return fromLs;

  const nav = normalizeLangCode(navigator.language || '');
  if (nav) return nav;

  return DEFAULT_LANG;
}

export function setLang(lang) {
  const code = normalizeLangCode(lang);
  if (!code) return;
  localStorage.setItem('lang', code);
  const url = new URL(location.href);
  url.searchParams.set('lang', code);
  location.href = url.toString();
}

export async function loadDict(lang) {
  const safe = normalizeLangCode(lang) || DEFAULT_LANG;
  // For be we load ru as a base and overlay small be-specific overrides.
  // This keeps the site functional even if be.json is partial.
  if (safe === 'be') {
    const baseUrl = new URL(`../i18n/locales/ru.json`, import.meta.url);
    const beUrl = new URL(`../i18n/locales/be.json`, import.meta.url);
    const [baseRes, beRes] = await Promise.all([
      fetch(baseUrl, { cache: 'no-store' }),
      fetch(beUrl, { cache: 'no-store' })
    ]);
    if (!baseRes.ok) throw new Error('Failed to load dict: ru');
    const base = await baseRes.json();
    const be = beRes.ok ? await beRes.json() : {};
    const merged = deepMerge(base, be);
    merged.__lang = 'be';
    return merged;
  }

  const url = new URL(`../i18n/locales/${safe}.json`, import.meta.url);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load dict: ${safe}`);
  const json = await res.json();
  json.__lang = safe;
  return json;
}

export function t(key, dict) {
  if (!dict) return key;
  return key.split('.').reduce((o, k) => o?.[k], dict) || key;
}

function applyDomTranslations(dict) {
  document.documentElement.lang = dict.__lang || DEFAULT_LANG;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const val = t(key, dict);
    if (val && val !== key) el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (!key) return;
    const val = t(key, dict);
    if (val && val !== key) el.innerHTML = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;
    const val = t(key, dict);
    if (val && val !== key) el.placeholder = val;
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (!key) return;
    const val = t(key, dict);
    if (val && val !== key) el.setAttribute('aria-label', val);
  });
}

export function applyDict(dict) {
  if (!dict) return;
  applyDomTranslations(dict);
  queueMicrotask(() => applyDomTranslations(dict));
}

export function pickI18n(obj, lang) {
  if (!obj || typeof obj !== 'object') return {};
  const fromLang = obj.i18n?.[lang];
  if (fromLang && typeof fromLang === 'object') return fromLang;
  const fromRu = obj.i18n?.ru;
  if (fromRu && typeof fromRu === 'object') return fromRu;
  return obj;
}

export function applyLanguageSeo(lang) {
  const safeLang = normalizeLangCode(lang) || DEFAULT_LANG;
  document.documentElement.lang = safeLang;

  // Alternate links
  const base = new URL(location.href);
  const ensureAlt = (code) => {
    const id = `alt-hreflang-${code}`;
    let link = document.querySelector(`link[data-i18n-alt="${id}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = 'alternate';
      link.dataset.i18nAlt = id;
      document.head.appendChild(link);
    }
    const url = new URL(base.href);
    url.searchParams.set('lang', code);
    link.hreflang = code;
    link.href = url.toString();
  };
  ensureAlt('ru');
  ensureAlt('en');
  ensureAlt('be');

  // og:locale
  let og = document.querySelector('meta[property="og:locale"]');
  if (!og) {
    og = document.createElement('meta');
    og.setAttribute('property', 'og:locale');
    document.head.appendChild(og);
  }
  og.setAttribute('content', safeLang === 'en' ? 'en_US' : safeLang === 'be' ? 'be_BY' : 'ru_RU');
}

function isPlainObject(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function deepMerge(base, over) {
  if (!isPlainObject(base)) return isPlainObject(over) ? { ...over } : over;
  const out = { ...base };
  if (!isPlainObject(over)) return out;
  for (const [k, v] of Object.entries(over)) {
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

export function withLang(href, lang) {
  try {
    const code = normalizeLangCode(lang) || DEFAULT_LANG;
    const url = new URL(href, location.href);
    url.searchParams.set('lang', code);
    return url.pathname + url.search + url.hash;
  } catch {
    return href;
  }
}

/** Добавляет ?lang= к относительным ссылкам внутри профиля (index/reviews/… в одной папке). */
export function patchProfileNavLinks(lang) {
  const code = normalizeLangCode(lang) || DEFAULT_LANG;
  document.querySelectorAll('.user-quick-nav a[href], a.user-link-btn[href]').forEach((a) => {
    const raw = a.getAttribute('href');
    if (!raw || raw.startsWith('#')) return;
    const pathOnly = raw.split(/[#?]/)[0];
    if (!pathOnly.endsWith('.html')) return;
    if (pathOnly.includes('/')) return;
    a.setAttribute('href', withLang(raw, code));
  });
}

