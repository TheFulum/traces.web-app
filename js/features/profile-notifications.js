import { db } from '../shared/firebase-init.js';
import {
  addDoc,
  collection,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

/** Согласуйте строковые значения с правилами Firestore и клиентом Android. */
export const PROFILE_NOTIFICATION_TYPES = {
  EMAIL_CHANGED: 'profile_email_changed',
  PASSWORD_CHANGED: 'profile_password_changed'
};

/**
 * @param {string} uid
 * @param {{
 *   emailChanged?: boolean,
 *   passwordChanged?: boolean,
 *   titles: {
 *     emailTitle: string,
 *     emailBody: string,
 *     passwordTitle: string,
 *     passwordBody: string,
 *   },
 * }} opts
 */
export async function notifyProfileSecurityChanges(uid, opts) {
  const id = String(uid || '').trim();
  if (!id || !opts?.titles) return;

  const col = collection(db, 'users', id, 'notifications');
  const tasks = [];

  if (opts.emailChanged) {
    tasks.push(
      addDoc(col, {
        type: PROFILE_NOTIFICATION_TYPES.EMAIL_CHANGED,
        title: String(opts.titles.emailTitle || '').slice(0, 400),
        body: String(opts.titles.emailBody || '').slice(0, 2000),
        read: false,
        createdAt: serverTimestamp()
      })
    );
  }
  if (opts.passwordChanged) {
    tasks.push(
      addDoc(col, {
        type: PROFILE_NOTIFICATION_TYPES.PASSWORD_CHANGED,
        title: String(opts.titles.passwordTitle || '').slice(0, 400),
        body: String(opts.titles.passwordBody || '').slice(0, 2000),
        read: false,
        createdAt: serverTimestamp()
      })
    );
  }

  await Promise.all(tasks);
}
