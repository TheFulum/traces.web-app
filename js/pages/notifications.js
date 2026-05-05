import { auth } from '../shared/firebase-init.js';
import { initNav } from '../shared/nav.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getLang,
  loadDict,
  applyDict,
  applyLanguageSeo,
  t,
  withLang
} from '../shared/i18n.js';
import { getPlaces } from '../shared/places.js';
import {
  fetchUserNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  pruneReadNotifications,
  deleteStoredNotification,
  deleteAllStoredNotifications
} from '../features/notifications-data.js';
import { showToast } from '../shared/utils.js';

const lang = getLang();
const dictI18n = await loadDict(lang);
applyDict(dictI18n);
applyLanguageSeo(lang);
initNav('../../');

const listEl = document.getElementById('notifications-list');
const markReadBtn = document.getElementById('btn-mark-read');
const deleteAllBtn = document.getElementById('btn-delete-all');

let notifications = [];
let placeMap = new Map();
/** Для делегирования клика «Удалить» на строке — актуальный uid после входа. */
let sessionUid = '';

function wireListDeleteDelegateOnce() {
  if (!listEl || listEl.dataset.deleteDelegate === '1') return;
  listEl.dataset.deleteDelegate = '1';
  listEl.addEventListener('click', async (ev) => {
    const delBtn = ev.target.closest('[data-delete-id]');
    if (!delBtn) return;
    ev.preventDefault();
    const uid = sessionUid;
    if (!uid) return;
    const id = delBtn.getAttribute('data-delete-id') || '';
    if (!id) return;
    const ok = confirm(t('notifications.confirmDeleteOne', dictI18n));
    if (!ok) return;
    try {
      await deleteStoredNotification(uid, id);
      notifications = await fetchUserNotifications(uid);
      pruneReadNotifications(notifications);
      window.dispatchEvent(new CustomEvent('notifications-updated'));
      render();
    } catch (e) {
      console.error(e);
      showToast(t('notifications.deleteError', dictI18n), 'error');
    }
  });
}

wireListDeleteDelegateOnce();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = withLang('../../pages/auth.html', lang);
    return;
  }
  sessionUid = user.uid;
  notifications = await fetchUserNotifications(user.uid);
  pruneReadNotifications(notifications);
  placeMap = await buildPlaceMap();
  render();
});

deleteAllBtn?.addEventListener('click', async () => {
  const u = auth.currentUser?.uid;
  if (!u) return;
  const hasStored = notifications.some((i) => !i.synthetic);
  if (!hasStored) return;
  const ok = confirm(t('notifications.confirmDeleteAll', dictI18n));
  if (!ok) return;
  try {
    await deleteAllStoredNotifications(u);
    notifications = await fetchUserNotifications(u);
    pruneReadNotifications(notifications);
    window.dispatchEvent(new CustomEvent('notifications-updated'));
    render();
    showToast(t('notifications.deleteAllDone', dictI18n), 'success');
  } catch (e) {
    console.error(e);
    showToast(t('notifications.deleteError', dictI18n), 'error');
  }
});

markReadBtn?.addEventListener('click', async () => {
  const u = auth.currentUser?.uid;
  if (!u) return;
  await markAllNotificationsRead(notifications, u);
  notifications = await fetchUserNotifications(u);
  pruneReadNotifications(notifications);
  window.dispatchEvent(new CustomEvent('notifications-updated'));
  render();
});

async function buildPlaceMap() {
  try {
    const places = await getPlaces();
    return new Map(places.map(p => [String(p.id), String(p.name || p.id)]));
  } catch {
    return new Map();
  }
}

function render() {
  if (!listEl) return;
  if (!notifications.length) {
    listEl.innerHTML = `<p class="user-empty">${t('notifications.empty', dictI18n)}</p>`;
    markReadBtn.disabled = true;
    if (deleteAllBtn) deleteAllBtn.disabled = true;
    return;
  }

  listEl.innerHTML = notifications.map(item => {
    const placeId = String(item.placeId || '');
    const placeName = placeMap.get(placeId) || placeId || '—';
    const href = placeId
      ? withLang(`../../pages/place.html?id=${encodeURIComponent(placeId)}`, lang)
      : '#';

    let chipClass = 'user-chip user-chip--wait';
    let chipLabel = '';
    let titleLine = '';
    let text = '';

    if (
      item.type === 'profile_email_changed'
      || item.type === 'profile_password_changed'
    ) {
      chipClass = 'user-chip user-chip--ok';
      chipLabel = t('notifications.profileSecurityChip', dictI18n);
      titleLine = String(item.title || chipLabel);
      text = String(item.body || '');
    } else if (item.type === 'review_moderation') {
      const st = String(item.moderationStatus || '');
      const isAp = st === 'approved';
      const isRej = st === 'rejected';
      chipClass = isRej ? 'user-chip user-chip--no' : (isAp ? 'user-chip user-chip--ok' : 'user-chip user-chip--wait');
      chipLabel = isAp
        ? t('notifications.approved', dictI18n)
        : isRej
          ? t('notifications.rejected', dictI18n)
          : t('notifications.pending', dictI18n);
      titleLine = String(item.title || chipLabel);
      text = String(item.body || '');
    } else if (item.type === 'review_pending' || item.synthetic) {
      chipLabel = t('notifications.pending', dictI18n);
      titleLine = placeName;
      text = t('notifications.textPending', dictI18n);
    } else {
      chipLabel = t('notifications.accountNotice', dictI18n);
      titleLine = String(item.title || chipLabel);
      text = String(item.body || '');
    }

    const isRead = item.read === true;
    const date = item?.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU')
      : '';

    const deleteBtn = !item.synthetic
      ? `<button type="button" class="btn btn--ghost btn--sm" data-delete-id="${escAttr(String(item.id))}" data-i18n="notifications.deleteOne">${esc(t('notifications.deleteOne', dictI18n))}</button>`
      : '';

    return `
      <article class="user-list-item user-list-item--notice" ${isRead ? 'style="opacity:.65"' : ''}>
        <div class="user-list-item__row">
          <a class="user-list-item__title" href="${href}">${esc(titleLine)}</a>
          <span class="${chipClass}">${esc(chipLabel)}</span>
        </div>
        <p class="user-list-item__meta">${esc(text)}</p>
        <div class="user-list-item__foot" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <span>${esc(date)}</span>
          ${deleteBtn}
        </div>
      </article>
    `;
  }).join('');

  const unread = getUnreadNotificationsCount(notifications);
  const hasStored = notifications.some((i) => !i.synthetic);
  markReadBtn.disabled = unread === 0;
  if (deleteAllBtn) deleteAllBtn.disabled = !hasStored;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return esc(str).replace(/'/g, '&#39;');
}
