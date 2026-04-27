import { db } from './firebase-init.js';
import {
  collection, addDoc, getDocs,
  query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const COL = 'placeReviews';

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
    status:    'pending',
    createdAt: serverTimestamp()
  });
}

/**
 * Get reviews for a place (sorted client-side).
 * @param {string} placeId
 * @returns {Promise<Array>}
 */
export async function getPlaceReviews(placeId) {
  const q = query(
    collection(db, COL),
    where('placeId', '==', placeId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Public page shows only approved reviews (legacy docs without status are treated as approved)
  const visible = docs.filter(r => !r.status || r.status === 'approved');
  visible.sort((a, b) => {
    const aTs = a?.createdAt?.seconds ?? 0;
    const bTs = b?.createdAt?.seconds ?? 0;
    return bTs - aTs;
  });
  return visible;
}
