/**
 * Абсолютный URL страницы маршрута с lang и повторяющимися places= (порядок точек).
 * Работает с любой страницы сайта (не зависит от текущего pathname).
 */
export function buildRoutePageFullUrl(items, langCode) {
  const u = new URL('pages/route.html', `${window.location.origin}/`);
  u.searchParams.set('lang', langCode || 'ru');
  const list = Array.isArray(items) ? items : [];
  for (const entry of list) {
    const id = typeof entry === 'string' ? String(entry).trim() : String(entry?.id || '').trim();
    if (id) u.searchParams.append('places', id);
  }
  return u.toString();
}
