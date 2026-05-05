import { db } from '../shared/firebase-init.js';
import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const READ_KEY = 'read_review_notifications';

function readLsArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLsArray(key, list) {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(list))));
}

/** Все «ожидают модерацию» без записи в Firestore — только через запрос отзывов */
function pendingSyntheticId(reviewId) {
  return `pending-review-${reviewId}`;
}

/**
 * Уведомления: сохранённые в users/{uid}/notifications + синтетические для pending-отзывов.
 * Прочитанность: stored.read в Firestore; для synthetic — ключи в localStorage (READ_KEY).
 */
export async function fetchUserNotifications(uid) {
  if (!uid) return [];

  let storedDocs = [];
  let reviewDocs = [];
  try {
    const pageSize = 100;
    let lastDoc = null;
    while (true) {
      let q = query(
        collection(db, 'users', uid, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      if (lastDoc) {
        q = query(
          collection(db, 'users', uid, 'notifications'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }
      const storedSnap = await getDocs(q);
      if (storedSnap.empty) break;
      storedDocs.push(...storedSnap.docs);
      lastDoc = storedSnap.docs[storedSnap.docs.length - 1];
      if (storedSnap.size < pageSize) break;
    }
  } catch (err) {
    console.warn('notifications subcollection:', err);
  }
  try {
    const reviewsSnap = await getDocs(
      query(collection(db, 'placeReviews'), where('uid', '==', uid))
    );
    reviewDocs = reviewsSnap.docs;
  } catch (err) {
    console.warn('notifications reviews:', err);
  }

  /** @type {Array<Record<string, unknown>>} */
  const stored = storedDocs.map((d) => ({
    id: d.id,
    synthetic: false,
    ...d.data()
  }));

  const pendingReviews = reviewDocs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => String(r.status || 'approved') === 'pending');

  const moderatedReviewIds = new Set(
    stored
      .filter((s) => s.type === 'review_moderation' && s.reviewId)
      .map((s) => String(s.reviewId))
  );

  const synthetic = pendingReviews
    .filter((r) => !moderatedReviewIds.has(String(r.id)))
    .map((r) => ({
      id: pendingSyntheticId(r.id),
      synthetic: true,
      type: 'review_pending',
      reviewId: r.id,
      placeId: r.placeId,
      title: '',
      body: '',
      read: undefined,
      createdAt: r.createdAt,
      moderationStatus: 'pending',
      status: 'pending'
    }));

  const merged = [...stored, ...synthetic].sort((a, b) => {
    const as = a?.createdAt?.seconds ?? a?.createdAt?._seconds ?? 0;
    const bs = b?.createdAt?.seconds ?? b?.createdAt?._seconds ?? 0;
    return bs - as;
  });

  return merged.map(normalizeNotificationRow);
}

function normalizeNotificationRow(row) {
  const readFlag =
    row.synthetic === true
      ? isPendingMarkedRead(row.reviewId)
      : Boolean(row.read === true);
  return {
    ...row,
    read: readFlag
  };
}

function isPendingMarkedRead(reviewId) {
  const id = pendingSyntheticId(String(reviewId || ''));
  const legacy = String(reviewId || '');
  const ls = readLsArray(READ_KEY);
  return ls.includes(id) || ls.includes(legacy);
}

export function getReadNotificationIds() {
  return readLsArray(READ_KEY);
}

export function getUnreadNotificationsCount(items) {
  return items.reduce((sum, item) => sum + (item.read === true ? 0 : 1), 0);
}

/** Отметить все прочитанными: batch для Firestore + localStorage для synthetic */
export async function markAllNotificationsRead(items, uid) {
  const userId = String(uid || '').trim();
  const syntheticIds = items.filter((i) => i.synthetic).map((i) => String(i.id));
  const storedUnread = items.filter((i) => !i.synthetic && i.read !== true);

  const lsAdd = new Set(readLsArray(READ_KEY));
  syntheticIds.forEach((id) => lsAdd.add(id));
  items.forEach((i) => {
    if (i.synthetic && i.reviewId) lsAdd.add(String(i.reviewId));
  });
  writeLsArray(READ_KEY, Array.from(lsAdd));

  if (userId && storedUnread.length) {
    let batch = writeBatch(db);
    let n = 0;
    for (const row of storedUnread) {
      const ref = doc(db, 'users', userId, 'notifications', String(row.id));
      batch.update(ref, { read: true });
      n += 1;
      if (n >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        n = 0;
      }
    }
    if (n > 0) await batch.commit();
  }
}

export function pruneReadNotifications(items) {
  const syntheticIds = new Set(
    items.filter((i) => i.synthetic).flatMap((i) => [String(i.id), String(i.reviewId || '')])
  );
  const filtered = readLsArray(READ_KEY).filter((id) => syntheticIds.has(id));
  writeLsArray(READ_KEY, filtered);
}

/** Удалить сохранённое уведомление (не synthetic). */
export async function deleteStoredNotification(uid, notificationId) {
  const userId = String(uid || '').trim();
  const id = String(notificationId || '').trim();
  if (!userId || !id || id.startsWith('pending-review-')) return;
  await deleteDoc(doc(db, 'users', userId, 'notifications', id));
}

/** Удалить все документы в подколлекции notifications пользователя. */
export async function deleteAllStoredNotifications(uid) {
  const userId = String(uid || '').trim();
  if (!userId) return;
  const colRef = collection(db, 'users', userId, 'notifications');
  while (true) {
    const snap = await getDocs(query(colRef, limit(450)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
