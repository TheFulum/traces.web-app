/**
 * OpenFreeMap Liberty (OpenMapTiles) — по умолчанию двуязычные подписи:
 * `concat(name:latin, …, name:nonlatin)` при `has name:nonlatin`.
 * Заменяем на одну строку `coalesce` с приоритетом под язык сайта (ru / en / be).
 */
const EMPTY = ['literal', ''];

function isRefShieldTextField(tf) {
  return (
    Array.isArray(tf) &&
    tf[0] === 'to-string' &&
    Array.isArray(tf[1]) &&
    tf[1][0] === 'get' &&
    tf[1][1] === 'ref'
  );
}

/**
 * Одна строка без «латиница + кириллица».
 * Поля в духе OpenMapTiles: name:ru, name:nonlatin, name:latin, name_en, …
 */
function openMapTilesSingleLineTextField(siteLang) {
  const c = String(siteLang || 'ru').trim().toLowerCase().slice(0, 2);
  if (c === 'en') {
    // Латиница / en / int / ru до локальной кириллицы; общий `name` в конце (в BY часто = be).
    return [
      'coalesce',
      ['get', 'name:en'],
      ['get', 'name_en'],
      ['get', 'name:latin'],
      ['get', 'name_int'],
      ['get', 'name:ru'],
      ['get', 'name_ru'],
      ['get', 'name:be'],
      ['get', 'name_be'],
      ['get', 'name:nonlatin'],
      ['get', 'name'],
      EMPTY
    ];
  }
  if (c === 'be') {
    return [
      'coalesce',
      ['get', 'name:be'],
      ['get', 'name_be'],
      ['get', 'name:nonlatin'],
      ['get', 'name'],
      ['get', 'name:ru'],
      ['get', 'name_ru'],
      ['get', 'name:latin'],
      ['get', 'name_en'],
      ['get', 'name:en'],
      ['get', 'name_int'],
      EMPTY
    ];
  }
  return [
    'coalesce',
    ['get', 'name:ru'],
    ['get', 'name_ru'],
    ['get', 'name'],
    ['get', 'name:nonlatin'],
    ['get', 'name:latin'],
    ['get', 'name_en'],
    ['get', 'name:en'],
    ['get', 'name_int'],
    ['get', 'name:be'],
    ['get', 'name_be'],
    EMPTY
  ];
}

export async function fetchLocalizedLibertyStyle(siteLang) {
  const controller = new AbortController();
  const tmr = setTimeout(() => controller.abort(), 9000);
  const response = await fetch('https://tiles.openfreemap.org/styles/liberty', { signal: controller.signal });
  clearTimeout(tmr);
  if (!response.ok) throw new Error('style_fetch_failed');
  const style = await response.json();

  let cloned;
  try {
    cloned = structuredClone(style);
  } catch {
    cloned = JSON.parse(JSON.stringify(style));
  }

  const single = openMapTilesSingleLineTextField(siteLang);

  try {
    (cloned.layers || []).forEach((layer) => {
      const layout = layer?.layout;
      if (!layout || !Object.prototype.hasOwnProperty.call(layout, 'text-field')) return;

      const tf = layout['text-field'];
      if (isRefShieldTextField(tf)) return;

      layout['text-field'] = single;
    });
  } catch {
    return JSON.parse(JSON.stringify(style));
  }

  return cloned;
}
