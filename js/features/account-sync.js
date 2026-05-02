import { db } from '../shared/firebase-init.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const LS_FAVORITES = 'profile_favorites';
const LS_HISTORY = 'profile_history';
const LS_TRIP = 'traces_trip_v1';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeFav(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((x) => ({
      id: String(x?.id || '').trim(),
      name: String(x?.name || '').trim(),
      addedAt: Number(x?.addedAt || Date.now())
    }))
    .filter((x) => x.id)
    .slice(0, 200);
}

function normalizeHistory(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((x) => ({
      id: String(x?.id || '').trim(),
      name: String(x?.name || '').trim(),
      viewedAt: Number(x?.viewedAt || Date.now())
    }))
    .filter((x) => x.id)
    .slice(0, 300);
}

function normalizeTrip(state) {
  const items = Array.isArray(state?.items) ? state.items : [];
  return {
    version: 1,
    items: items
      .map((x) => ({
        id: String(x?.id || '').trim(),
        name: String(x?.name || '').trim(),
        addedAt: Number(x?.addedAt || Date.now())
      }))
      .filter((x) => x.id)
      .slice(0, 200)
  };
}

function mergeById(localList, remoteList, tsKey) {
  const out = new Map();
  for (const row of remoteList) out.set(row.id, row);
  for (const row of localList) {
    const prev = out.get(row.id);
    if (!prev || Number(row?.[tsKey] || 0) >= Number(prev?.[tsKey] || 0)) {
      out.set(row.id, row);
    }
  }
  return Array.from(out.values()).sort((a, b) => Number(b?.[tsKey] || 0) - Number(a?.[tsKey] || 0));
}

function mergeTrip(localTrip, remoteTrip) {
  const merged = mergeById(localTrip.items || [], remoteTrip.items || [], 'addedAt');
  return { version: 1, items: merged.slice(0, 200) };
}

export async function syncGuestDataWithAccount(uid) {
  const userId = String(uid || '').trim();
  if (!userId) return { ok: false };

  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const remote = snap.exists() ? (snap.data() || {}) : {};

  const localFav = normalizeFav(readJson(LS_FAVORITES, []));
  const localHistory = normalizeHistory(readJson(LS_HISTORY, []));
  const localTrip = normalizeTrip(readJson(LS_TRIP, { version: 1, items: [] }));

  const remoteFav = normalizeFav(remote.favorites || []);
  const remoteHistory = normalizeHistory(remote.history || []);
  const remoteTrip = normalizeTrip(remote.trip || { version: 1, items: [] });

  const mergedFav = mergeById(localFav, remoteFav, 'addedAt').slice(0, 100);
  const mergedHistory = mergeById(localHistory, remoteHistory, 'viewedAt').slice(0, 100);
  const mergedTrip = mergeTrip(localTrip, remoteTrip);

  writeJson(LS_FAVORITES, mergedFav);
  writeJson(LS_HISTORY, mergedHistory);
  writeJson(LS_TRIP, mergedTrip);

  await setDoc(userRef, {
    favorites: mergedFav,
    history: mergedHistory,
    trip: mergedTrip,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    ok: true,
    favorites: mergedFav.length,
    history: mergedHistory.length,
    trip: mergedTrip.items.length
  };
}

