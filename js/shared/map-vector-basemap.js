/**
 * After a reliable raster basemap is shown, try to replace it with MapLibre vector tiles
 * (OpenFreeMap Liberty) so street labels follow site language (ru / en / be).
 * On any failure, raster layers stay as-is.
 */
import { fetchLocalizedLibertyStyle } from './map-liberty-style.js';

function loadCssOnce(href) {
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  for (const l of links) {
    if (l.getAttribute('href') === href) return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`maplibre_css:${href}`));
    document.head.appendChild(link);
  });
}

function loadScriptOnce(src, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const scripts = document.getElementsByTagName('script');
    for (const s of scripts) {
      if (s.getAttribute('src') === src) {
        if (s.getAttribute('data-loaded') === '1') {
          resolve();
          return;
        }
        s.addEventListener('load', () => resolve(), { once: true });
        s.addEventListener('error', () => reject(new Error(`maplibre_js:${src}`)), { once: true });
        return;
      }
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    const t = setTimeout(() => {
      el.onload = null;
      el.onerror = null;
      reject(new Error(`maplibre_js_timeout:${src}`));
    }, timeoutMs);
    el.onload = () => {
      clearTimeout(t);
      el.setAttribute('data-loaded', '1');
      resolve();
    };
    el.onerror = () => {
      clearTimeout(t);
      reject(new Error(`maplibre_js:${src}`));
    };
    document.head.appendChild(el);
  });
}

let maplibreGluePromise = null;

async function ensureMaplibreLeafletGlue(L) {
  if (L.maplibreGL && window.maplibregl) return;
  if (maplibreGluePromise) {
    await maplibreGluePromise;
    return;
  }
  maplibreGluePromise = (async () => {
    if (!window.maplibregl) {
      await loadCssOnce('https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.min.js', 22000);
    }
    if (!L.maplibreGL) {
      await loadScriptOnce(
        'https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.1.2/leaflet-maplibre-gl.js',
        18000
      );
    }
    if (!window.maplibregl || !L.maplibreGL) {
      throw new Error('maplibre_leaflet_glue_missing');
    }
  })();
  try {
    await maplibreGluePromise;
  } catch (e) {
    maplibreGluePromise = null;
    throw e;
  }
}

/**
 * @param {object} opts
 * @param {*} opts.L Leaflet namespace
 * @param {import('leaflet').Map} opts.map
 * @param {string} opts.siteLang
 * @param {() => import('leaflet').TileLayer | null | undefined} opts.getRasterLayer currently visible raster basemap
 * @returns {Promise<boolean>} true if vector replaced raster
 */
export async function tryUpsellToLocalizedVectorBasemap({ L, map, siteLang, getRasterLayer }) {
  try {
    await ensureMaplibreLeafletGlue(L);
    const style = await fetchLocalizedLibertyStyle(siteLang);
    const glLayer = L.maplibreGL({
      style,
      // Let Leaflet own pan/zoom; WebGL layer as display-only avoids marker/polyline “jitter” vs tiles.
      interactive: false
    });
    glLayer.addTo(map);

    const ml =
      typeof glLayer.getMaplibreMap === 'function'
        ? glLayer.getMaplibreMap()
        : typeof glLayer.getMapboxMap === 'function'
          ? glLayer.getMapboxMap()
          : null;

    return await new Promise((resolve) => {
      let settled = false;
      const removeRaster = () => {
        const r = typeof getRasterLayer === 'function' ? getRasterLayer() : null;
        if (!r) return;
        try {
          if (map.hasLayer(r)) map.removeLayer(r);
          else r.remove?.();
        } catch {}
      };
      const ok = () => {
        if (settled) return;
        settled = true;
        removeRaster();
        try {
          map.invalidateSize(true);
        } catch {}
        resolve(true);
      };
      const bad = () => {
        if (settled) return;
        settled = true;
        try {
          map.removeLayer(glLayer);
        } catch {}
        resolve(false);
      };

      if (ml && typeof ml.once === 'function') {
        ml.once('load', () => setTimeout(ok, 80));
        ml.once('error', bad);
      } else {
        setTimeout(ok, 500);
      }
      setTimeout(() => {
        if (!settled) bad();
      }, 16000);
    });
  } catch (e) {
    console.warn('vector basemap skipped:', e);
    return false;
  }
}
