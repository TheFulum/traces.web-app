import { db } from '../shared/firebase-init.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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

export async function fetchUserNotifications(uid) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, 'placeReviews'), where('uid', '==', uid)));
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return rows
    .filter(r => r.status === 'pending' || r.status === 'rejected')
    .sort((a, b) => (b?.createdAt?.seconds ?? 0) - (a?.createdAt?.seconds ?? 0));
}

export function getReadNotificationIds() {
  return readLsArray(READ_KEY);
}

export function getUnreadNotificationsCount(items) {
  const read = new Set(getReadNotificationIds());
  return items.reduce((sum, item) => sum + (read.has(String(item.id)) ? 0 : 1), 0);
}

export function markAllNotificationsRead(items) {
  const ids = items.map(i => String(i.id));
  const current = getReadNotificationIds();
  writeLsArray(READ_KEY, current.concat(ids));
}

export function pruneReadNotifications(items) {
  const currentIds = new Set(items.map(i => String(i.id)));
  const filtered = getReadNotificationIds().filter(id => currentIds.has(String(id)));
  writeLsArray(READ_KEY, filtered);
}
