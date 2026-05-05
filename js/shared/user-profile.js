import { db } from './firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

export const ROLE_USER = 'user';
export const ROLE_ADMIN = 'admin';

/**
 * @param {Record<string, unknown> | undefined} data
 */
export function normalizeUserProfile(data) {
  const d = data || {};
  const role = d.role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USER;
  return {
    role,
    commentsBanned: Boolean(d.commentsBanned),
    displayName: typeof d.displayName === 'string' ? d.displayName : '',
    email: typeof d.email === 'string' ? d.email : ''
  };
}

/** @param {string} uid */
export async function getUserProfile(uid) {
  const id = String(uid || '').trim();
  if (!id) return normalizeUserProfile(undefined);
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return normalizeUserProfile(undefined);
  return normalizeUserProfile(snap.data());
}

/** @param {{ role?: string }} profile */
export function isAdminProfile(profile) {
  return profile?.role === ROLE_ADMIN;
}
