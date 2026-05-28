/**
 * Ensures Leaflet is on window.L. HTML <script onerror=…> swaps are async — the next
 * script can run before the fallback finishes; modules may then see no L. This loader
 * is sequential and tries several CDNs.
 */

const BUNDLES = [
  {
    css: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
    js: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
  },
  {
    css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
  },
  {
    css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
    js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
  }
];

function hasStylesheet(href) {
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  for (const l of links) {
    if (l.getAttribute('href') === href) return true;
  }
  return false;
}

function loadCssOnce(href) {
  if (hasStylesheet(href)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`leaflet_css_failed:${href}`));
    document.head.appendChild(link);
  });
}

function loadScriptOnce(src, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    const t = setTimeout(() => {
      s.onload = null;
      s.onerror = null;
      reject(new Error(`leaflet_js_timeout:${src}`));
    }, timeoutMs);
    s.onload = () => {
      clearTimeout(t);
      resolve();
    };
    s.onerror = () => {
      clearTimeout(t);
      reject(new Error(`leaflet_js_failed:${src}`));
    };
    document.head.appendChild(s);
  });
}

/** @returns {typeof import('leaflet')} */
export async function ensureLeafletReady() {
  if (typeof window !== 'undefined' && window.L && typeof window.L.map === 'function') {
    return window.L;
  }
  let lastErr = null;
  for (const b of BUNDLES) {
    try {
      await loadCssOnce(b.css);
      await loadScriptOnce(b.js, 16000);
      if (window.L && typeof window.L.map === 'function') return window.L;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('leaflet_unavailable');
}
