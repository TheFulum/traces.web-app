const SUPPORTED = ['ru', 'en'];
const DEFAULT_LANG = 'ru';

export function getLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (SUPPORTED.includes(fromUrl)) return fromUrl;

  const fromLs = localStorage.getItem('lang');
  if (SUPPORTED.includes(fromLs)) return fromLs;

  const nav = (navigator.language || '').slice(0, 2);
  if (SUPPORTED.includes(nav)) return nav;

  return DEFAULT_LANG;
}

export function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  localStorage.setItem('lang', lang);
  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  location.href = url.toString();
}

export async function loadDict(lang) {
  const safe = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
  const url = new URL(`./i18n/locales/${safe}.json`, import.meta.url);
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

export function applyDict(dict) {
  if (!dict) return;
  document.documentElement.lang = dict.__lang || DEFAULT_LANG;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key, dict);
    if (val && val !== key) el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    const val = t(key, dict);
    if (val && val !== key) el.innerHTML = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = t(key, dict);
    if (val && val !== key) el.placeholder = val;
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.dataset.i18nAriaLabel;
    const val = t(key, dict);
    if (val && val !== key) el.setAttribute('aria-label', val);
  });
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
  const safeLang = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
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

  // og:locale
  let og = document.querySelector('meta[property="og:locale"]');
  if (!og) {
    og = document.createElement('meta');
    og.setAttribute('property', 'og:locale');
    document.head.appendChild(og);
  }
  og.setAttribute('content', safeLang === 'en' ? 'en_US' : 'ru_RU');
}

export function withLang(href, lang) {
  try {
    const url = new URL(href, location.href);
    url.searchParams.set('lang', lang);
    return url.pathname + url.search + url.hash;
  } catch {
    return href;
  }
}

