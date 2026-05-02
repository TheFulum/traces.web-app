/**
 * Сохранённые маршруты пользователя: users/{uid}/routes/{docId}
 *
 * В консоли Firebase → Firestore → Rules добавьте, например:
 * match /users/{userId}/routes/{routeId} {
 *   allow read, write: if request.auth != null && request.auth.uid == userId;
 * }
 */
import { db } from '../shared/firebase-init.js';
import { fingerprintSnapshot } from '../shared/route-snapshot.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const MAX_ITEMS = 200;
const MAX_TITLE = 160;
const LIST_LIMIT = 80;

function sanitizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr
    .map((x) => ({
      id: String(x?.id || '').trim(),
      name: String(x?.name || '').trim()
    }))
    .filter((x) => x.id)
    .slice(0, MAX_ITEMS);
}

export async function saveUserRoute(uid, { title, snapshot }) {
  const userId = String(uid || '').trim();
  if (!userId) throw new Error('no_uid');

  if (!snapshot || snapshot.v !== 1) throw new Error('bad_snapshot');

  const safeItems = sanitizeItems(snapshot.places);
  if (!safeItems.length) throw new Error('empty_route');

  const fp = fingerprintSnapshot(snapshot);
  const existing = await listUserRoutes(uid);
  if (fp && existing.some((r) => r.routeFingerprint === fp)) {
    throw new Error('duplicate_route');
  }

  const payload = {
    title: String(title || '').trim().slice(0, MAX_TITLE),
    items: safeItems,
    snapshot,
    routeFingerprint: fp || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await addDoc(collection(db, 'users', userId, 'routes'), payload);
}

export async function listUserRoutes(uid) {
  const userId = String(uid || '').trim();
  if (!userId) return [];

  const q = query(
    collection(db, 'users', userId, 'routes'),
    orderBy('createdAt', 'desc'),
    limit(LIST_LIMIT)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteUserRoute(uid, routeDocId) {
  const userId = String(uid || '').trim();
  const rid = String(routeDocId || '').trim();
  if (!userId || !rid) return;
  await deleteDoc(doc(db, 'users', userId, 'routes', rid));
}
