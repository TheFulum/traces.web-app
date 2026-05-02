import { db } from './firebase-init.js';
import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
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

  const i18nRuInput = data.i18n?.ru || {};
  const i18nEnInput = data.i18n?.en || {};

  // RU is canonical for legacy compatibility.
  const ruName = String(i18nRuInput.name || data.name || '').trim();
  const ruDescription = String(i18nRuInput.description || data.description || '').trim();
  const ruAuthor = String(i18nRuInput.author || data.author || '').trim();
  const ruAddress = String(i18nRuInput.address || locationAddress || '').trim();
  const ruOpeningAddress = String(i18nRuInput.openingAddress || openingAddress || '').trim();

  const enName = String(i18nEnInput.name || '').trim();
  const enDescription = String(i18nEnInput.description || '').trim();
  const enAuthor = String(i18nEnInput.author || '').trim();
  const enAddress = String(i18nEnInput.address || '').trim();
  const enOpeningAddress = String(i18nEnInput.openingAddress || '').trim();
  const enTags = Array.isArray(i18nEnInput.tags) ? i18nEnInput.tags.map(t => String(t).trim()).filter(Boolean) : [];

  const hasEn = !!(enName || enDescription || enAuthor || enAddress || enOpeningAddress || enTags.length);

  return {
    name:           ruName,
    description:    ruDescription,
    openingDate:    String(data.openingDate || '').trim(),
    openingAddress: ruOpeningAddress,
    author:         ruAuthor,
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
        openingAddress: ruOpeningAddress
      },
      ...(hasEn ? {
        en: {
          ...(enName ? { name: enName } : {}),
          ...(enDescription ? { description: enDescription } : {}),
          ...(enAuthor ? { author: enAuthor } : {}),
          ...(enAddress ? { address: enAddress } : {}),
          ...(enOpeningAddress ? { openingAddress: enOpeningAddress } : {}),
          ...(enTags.length ? { tags: enTags } : {})
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