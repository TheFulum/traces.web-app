import { db } from './firebase-init.js';
import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const COL = 'places';

export async function getPlaces() {
  const q = query(collection(db, COL), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPlace(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addPlace(data) {
  const ref = await addDoc(collection(db, COL), {
    ...sanitize(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updatePlace(id, data) {
  await updateDoc(doc(db, COL, id), {
    ...sanitize(data),
    updatedAt: serverTimestamp()
  });
}

export async function deletePlace(id) {
  await deleteDoc(doc(db, COL, id));
}

/** То же поле, что уходит в Firestore из админки (для импорта). */
export function sanitizePlacePayload(data) {
  return sanitize(data);
}

/**
 * Эвристика: вытащить название города из строки адреса в стиле OSM/Nominatim.
 * Формат строки: «улица, район, город, область, индекс, страна».
 * Стратегия:
 *  1. часть с префиксом «г.»/«город»/«д.»/«с.»/«вёска» → её хвост
 *  2. иначе — первая часть, которая не похожа на улицу, район/область, пригород, страну, индекс
 *  3. в крайнем случае — пусто
 *
 * ВАЖНО: в JS `\b` распознаёт только ASCII-словные символы — для кириллицы
 * он не работает. Поэтому здесь не используем `\b` против кириллических
 * ключевых слов, а сравниваем первое слово по словарю.
 */
export function deriveCityFromAddress(address) {
  const a = String(address || '').trim();
  if (!a) return '';
  const parts = a.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';

  // Известные префиксы улиц/площадей (первое слово части)
  const STREET_PREFIXES = new Set([
    // Russian
    'ул', 'улица', 'просп', 'проспект', 'пр-т', 'пр',
    'пер', 'переулок', 'бул', 'бульвар',
    'наб', 'набережная', 'пл', 'площадь',
    'шоссе', 'тракт', 'аллея', 'проезд', 'тупик', 'микрорайон',
    // Belarusian
    'вул', 'вуліца', 'плошча', 'праспект', 'завулак', 'тупік', 'алея'
  ]);

  // English: street keyword обычно стоит в конце строки части
  const ENG_STREET_SUFFIX = /(?:^|\s)(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|square|sq|highway|hwy)\.?(?:\s*\d+\w*)?$/i;

  // Эти проверки не зависят от \b — у нас явные ключевые слова
  const districtRe = /(район|district|обл(асть|\.)|region|край|воблас(ць|ць\.|ть))/i;
  const countryRe = /^(беларусь|belarus|россия|russia|украина|ukraine|польша|poland|литва|lithuania|латвия|latvia|by|ru|ua|pl|lt|lv|usa|united\s+states|united\s+kingdom|uk|germany|deutschland)$/i;
  const zipRe = /^\s*\d[\d\s\-]*\s*$/;
  const cityPrefixRe = /^(г\.?|город|г-д|city\s+of|town\s+of|пасёлак|посёлок|поселок|деревня|вёска|агрогородок|аг\.?|д\.|с\.|пос\.)\s+/i;
  const suburbRe = /(пасад|пасе?лак|hamlet|suburb|мкр\.?|мкрн|кв-л|квартал)/i;

  function firstWord(part) {
    return String(part).trim().toLowerCase().split(/[\s.]+/)[0] || '';
  }
  function isStreet(part) {
    if (ENG_STREET_SUFFIX.test(part)) return true;
    return STREET_PREFIXES.has(firstWord(part));
  }

  // 1) явный префикс «г. X», «д. X» и т.п.
  for (const part of parts) {
    if (cityPrefixRe.test(part)) {
      const tail = part.replace(cityPrefixRe, '').trim();
      if (tail) return tail;
    }
  }

  // 2) первая правдоподобная часть
  for (const part of parts) {
    if (isStreet(part)) continue;
    if (districtRe.test(part)) continue;
    if (countryRe.test(part)) continue;
    if (zipRe.test(part)) continue;
    if (suburbRe.test(part)) continue;
    // одинокий номер дома и т.п.
    if (/^\d+[a-zа-я]?$/i.test(part)) continue;
    return part;
  }

  return '';
}

/** Создание документа с заданным id (миграция / импорт). */
export async function createPlaceWithId(id, data) {
  await setDoc(doc(db, COL, id), {
    ...sanitize(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

function sanitize(data) {
  const featured = !!data.featured;
  const featuredOrderRaw = data.featuredOrder;
  const featuredOrder = featuredOrderRaw === '' || featuredOrderRaw == null
    ? null
    : Number(featuredOrderRaw);

  const createdOn = sanitizeCreatedOn(data.createdOn);
  const photos = Array.isArray(data.photos) ? data.photos.slice(0, 10) : [];
  const modelUrl = data.modelUrl ? String(data.modelUrl).trim() : null;
  const sketchfabUrl = data.sketchfabUrl ? String(data.sketchfabUrl).trim() : null;
  const locationAddress = String(data.location?.address || '').trim();
  const openingAddress = String(data.openingAddress || '').trim();
  const topCity = String(data.city || '').trim();

  const i18nRuInput = data.i18n?.ru || {};
  const i18nEnInput = data.i18n?.en || {};
  const i18nBeInput = data.i18n?.be || {};

  // RU is canonical for legacy compatibility.
  const ruName = String(i18nRuInput.name || data.name || '').trim();
  const ruDescription = String(i18nRuInput.description || data.description || '').trim();
  const ruAuthor = String(i18nRuInput.author || data.author || '').trim();
  const ruAddress = String(i18nRuInput.address || locationAddress || '').trim();
  const ruOpeningAddress = String(i18nRuInput.openingAddress || openingAddress || '').trim();
  // City: explicit override > auto-derived from address. RU is the canonical fallback.
  const ruCityExplicit = String(i18nRuInput.city || topCity || '').trim();
  const ruCity = ruCityExplicit || deriveCityFromAddress(ruAddress);

  const enName = String(i18nEnInput.name || '').trim();
  const enDescription = String(i18nEnInput.description || '').trim();
  const enAuthor = String(i18nEnInput.author || '').trim();
  const enAddress = String(i18nEnInput.address || '').trim();
  const enOpeningAddress = String(i18nEnInput.openingAddress || '').trim();
  const enCityExplicit = String(i18nEnInput.city || '').trim();
  const enCity = enCityExplicit || deriveCityFromAddress(enAddress);
  const enTags = Array.isArray(i18nEnInput.tags) ? i18nEnInput.tags.map(t => String(t).trim()).filter(Boolean) : [];

  const hasEn = !!(enName || enDescription || enAuthor || enAddress || enOpeningAddress || enCity || enTags.length);

  const beName = String(i18nBeInput.name || '').trim();
  const beDescription = String(i18nBeInput.description || '').trim();
  const beAuthor = String(i18nBeInput.author || '').trim();
  const beAddress = String(i18nBeInput.address || '').trim();
  const beOpeningAddress = String(i18nBeInput.openingAddress || '').trim();
  const beCityExplicit = String(i18nBeInput.city || '').trim();
  const beCity = beCityExplicit || deriveCityFromAddress(beAddress);
  const beTags = Array.isArray(i18nBeInput.tags) ? i18nBeInput.tags.map(t => String(t).trim()).filter(Boolean) : [];

  const hasBe = !!(beName || beDescription || beAuthor || beAddress || beOpeningAddress || beCity || beTags.length);

  return {
    name:           ruName,
    description:    ruDescription,
    openingDate:    String(data.openingDate || '').trim(),
    openingAddress: ruOpeningAddress,
    author:         ruAuthor,
    city:           ruCity,
    tags:           Array.isArray(data.tags) ? data.tags.map(t => String(t).trim()).filter(Boolean) : [],
    location: {
      lat:     Number(data.location?.lat  || 0),
      lng:     Number(data.location?.lng  || 0),
      address: ruAddress
    },
    photos,
    modelUrl,
    sketchfabUrl,
    modelType:      data.modelType || null, // 'file' | 'sketchfab' | null
    hasPhotos:      photos.length > 0,
    has3D:          !!(modelUrl || sketchfabUrl),

    featured:       featured,
    featuredOrder:  Number.isFinite(featuredOrder) ? featuredOrder : null,

    createdOn,
    i18n: {
      ru: {
        name: ruName,
        description: ruDescription,
        author: ruAuthor,
        address: ruAddress,
        openingAddress: ruOpeningAddress,
        ...(ruCity ? { city: ruCity } : {})
      },
      ...(hasEn ? {
        en: {
          ...(enName ? { name: enName } : {}),
          ...(enDescription ? { description: enDescription } : {}),
          ...(enAuthor ? { author: enAuthor } : {}),
          ...(enAddress ? { address: enAddress } : {}),
          ...(enOpeningAddress ? { openingAddress: enOpeningAddress } : {}),
          ...(enCity ? { city: enCity } : {}),
          ...(enTags.length ? { tags: enTags } : {})
        }
      } : {}),
      ...(hasBe ? {
        be: {
          ...(beName ? { name: beName } : {}),
          ...(beDescription ? { description: beDescription } : {}),
          ...(beAuthor ? { author: beAuthor } : {}),
          ...(beAddress ? { address: beAddress } : {}),
          ...(beOpeningAddress ? { openingAddress: beOpeningAddress } : {}),
          ...(beCity ? { city: beCity } : {}),
          ...(beTags.length ? { tags: beTags } : {})
        }
      } : {})
    }
  };
}

function sanitizeCreatedOn(input) {
  if (!input || typeof input !== 'object') return null;
  const year = Number(input.year);
  if (!Number.isFinite(year) || year <= 0) return null;

  const precision = input.precision === 'day' || input.precision === 'month' || input.precision === 'year'
    ? input.precision
    : 'year';

  const month = precision === 'year' ? null : Number(input.month);
  const day = precision === 'day' ? Number(input.day) : null;

  const m = Number.isFinite(month) ? Math.min(12, Math.max(1, month)) : null;
  const d = Number.isFinite(day) ? Math.min(31, Math.max(1, day)) : null;

  const sortKey = year * 10000 + (m || 0) * 100 + (d || 0);
  const display = String(input.display || '').trim();

  return {
    year,
    month: m,
    day: d,
    precision,
    sortKey,
    ...(display ? { display } : {})
  };
}