import { db } from './firebase-init.js';
import {
  collection, addDoc, getDocs,
  query, where, orderBy, limit, startAfter, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const COL = 'placeReviews';
const PAGE_SIZE = 10;

/**
 * Add a review for a specific place.
 * @param {string} placeId
 * @param {{uid: string, displayName?: string, email?: string}} user
 * @param {number} rating  1–5
 * @param {string} comment
 */
export async function addPlaceReview(placeId, user, rating, comment) {
  const displayName = String(user?.displayName || user?.email || 'User').trim();
  const email = String(user?.email || '').trim();
  await addDoc(collection(db, COL), {
    placeId,
    uid:       String(user?.uid || ''),
    name:      displayName,
    email,
    rating:    Number(rating),
    comment:   String(comment).trim(),
    createdAt: serverTimestamp()
  });
}

/**
 * Get paginated reviews for a place.
 * @param {string} placeId
 * @param {import('firebase/firestore').QueryDocumentSnapshot|null} lastDoc
 * @returns {Promise<{ docs: Array, lastDoc: any, hasMore: boolean }>}
 */
export async function getPlaceReviews(placeId, lastDoc = null) {
  let q = query(
    collection(db, COL),
    where('placeId', '==', placeId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE + 1)
  );

  if (lastDoc) {
    q = query(
      collection(db, COL),
      where('placeId', '==', placeId),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(PAGE_SIZE + 1)
    );
  }

  const snap = await getDocs(q);
  const hasMore = snap.docs.length > PAGE_SIZE;
  const pageDocs = snap.docs.slice(0, PAGE_SIZE);

  const docs = pageDocs.map(d => ({ id: d.id, ...d.data() }));
  const newLastDoc = pageDocs.length ? pageDocs[pageDocs.length - 1] : null;

  return { docs, lastDoc: newLastDoc, hasMore };
}
