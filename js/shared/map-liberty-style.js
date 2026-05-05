/**
 * OpenFreeMap Liberty style — приоритет подписей под язык интерфейса (ru / en).
 * Правим только простые выражения ["get", "name…"], чтобы не ломать сложные layout (format и т.д.).
 */
export async function fetchLocalizedLibertyStyle(siteLang) {
  const response = await fetch('https://tiles.openfreemap.org/styles/liberty');
  if (!response.ok) throw new Error('style_fetch_failed');
  const style = await response.json();

  let cloned;
  try {
    cloned = structuredClone(style);
  } catch {
    cloned = JSON.parse(JSON.stringify(style));
  }

  const normalizedLang = siteLang === 'en' ? 'en' : 'ru';
  const fallbackKeys =
    normalizedLang === 'ru'
      ? ['name:ru', 'name_ru', 'name:en', 'name_en', 'name']
      : ['name:en', 'name_en', 'name:latin', 'name:ru', 'name_ru', 'name'];

  function buildCoalesce(originalTf) {
    const branches = fallbackKeys.map((k) => ['get', k]);
    return ['coalesce', ...branches, originalTf];
  }

  try {
    (cloned.layers || []).forEach((layer) => {
      const layout = layer?.layout;
      if (!layout || !Object.prototype.hasOwnProperty.call(layout, 'text-field')) return;

      const tf = layout['text-field'];

      /* Частый случай: подписи номеров шоссе — не трогаем */
      if (
        Array.isArray(tf) &&
        tf[0] === 'to-string' &&
        Array.isArray(tf[1]) &&
        tf[1][0] === 'get' &&
        tf[1][1] === 'ref'
      ) {
        return;
      }

      /* Только простой ["get", "<prop>"] — иначе оставляем как в источнике (иначе карта падает на en/ru) */
      if (Array.isArray(tf) && tf[0] === 'get' && typeof tf[1] === 'string') {
        layout['text-field'] = buildCoalesce(tf);
      }
    });
  } catch {
    return JSON.parse(JSON.stringify(style));
  }

  return cloned;
}
