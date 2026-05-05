import { db } from '../../../js/shared/firebase-init.js';
import {
  addDoc,
  collection,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

/** Типы документов в users/{uid}/notifications — согласуйте с Android. */
export const NTYPE = {
  REVIEW_MODERATION: 'review_moderation',
  ROLE_ADMIN_GRANTED: 'role_admin_granted',
  ROLE_ADMIN_REVOKED: 'role_admin_revoked',
  COMMENTS_BANNED: 'comments_banned',
  COMMENTS_UNBANNED: 'comments_unbanned',
  /** Пишутся с сайта профилем пользователя (не из админки). */
  PROFILE_EMAIL_CHANGED: 'profile_email_changed',
  PROFILE_PASSWORD_CHANGED: 'profile_password_changed'
};

/**
 * @param {string} targetUid
 * @param {{
 *   type: string,
 *   title: string,
 *   body?: string,
 *   reviewId?: string,
 *   placeId?: string,
 *   placeName?: string,
 *   moderationStatus?: string,
 * }} data
 */
export async function sendUserNotification(targetUid, data) {
  const uid = String(targetUid || '').trim();
  if (!uid || !data?.type || !data?.title) return;

  await addDoc(collection(db, 'users', uid, 'notifications'), {
    type: String(data.type),
    title: String(data.title).slice(0, 400),
    body: data.body != null ? String(data.body).slice(0, 2000) : '',
    read: false,
    createdAt: serverTimestamp(),
    ...(data.reviewId ? { reviewId: String(data.reviewId) } : {}),
    ...(data.placeId ? { placeId: String(data.placeId) } : {}),
    ...(data.placeName ? { placeName: String(data.placeName).slice(0, 400) } : {}),
    ...(data.moderationStatus
      ? { moderationStatus: String(data.moderationStatus) }
      : {})
  });
}
