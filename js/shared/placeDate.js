export function formatPlaceDate(createdOn, lang = 'ru') {
  if (!createdOn || typeof createdOn !== 'object') return '';
  if (createdOn.display) return String(createdOn.display);

  const y = Number(createdOn.year);
  if (!Number.isFinite(y) || y <= 0) return '';

  const mRaw = createdOn.month != null ? Number(createdOn.month) : null;
  const dRaw = createdOn.day != null ? Number(createdOn.day) : null;
  const precision = createdOn.precision || (dRaw ? 'day' : (mRaw ? 'month' : 'year'));
  const m = Number.isFinite(mRaw) ? Math.min(12, Math.max(1, mRaw)) : null;
  const d = Number.isFinite(dRaw) ? Math.min(31, Math.max(1, dRaw)) : null;
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';

  if (precision === 'year' || !m) {
    return lang === 'en' ? String(y) : `${y} г.`;
  }
  if (precision === 'month' || !d) {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
      .format(new Date(Date.UTC(y, m - 1, 1)));
  }
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export function pickPlaceDateLabel(place, lang = 'ru') {
  const fromCreated = formatPlaceDate(place?.createdOn, lang);
  if (fromCreated) return fromCreated;
  if (place?.openingDate) return String(place.openingDate);
  return '';
}

