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
  getReadNotificationIds,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  pruneReadNotifications
} from '../features/notifications-data.js';

const lang = getLang();
const dictI18n = await loadDict(lang);
applyDict(dictI18n);
applyLanguageSeo(lang);
initNav('../../');

const listEl = document.getElementById('notifications-list');
const toggleBtn = document.getElementById('btn-toggle-all');
const markReadBtn = document.getElementById('btn-mark-read');

let expanded = false;
let notifications = [];
let placeMap = new Map();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = withLang('../../pages/auth.html', lang);
    return;
  }
  notifications = await fetchUserNotifications(user.uid);
  pruneReadNotifications(notifications);
  placeMap = await buildPlaceMap();
  render();
});

toggleBtn?.addEventListener('click', () => {
  expanded = !expanded;
  render();
});

markReadBtn?.addEventListener('click', () => {
  markAllNotificationsRead(notifications);
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
    toggleBtn.disabled = true;
    markReadBtn.disabled = true;
    return;
  }

  const visible = expanded ? notifications : notifications.slice(0, 5);
  const readIds = new Set(getReadNotificationIds());

  listEl.innerHTML = visible.map(item => {
    const placeId = String(item.placeId || '');
    const placeName = placeMap.get(placeId) || placeId || '—';
    const href = withLang(`../../pages/place.html?id=${encodeURIComponent(placeId)}`, lang);
    const isRejected = item.status === 'rejected';
    const isRead = readIds.has(String(item.id));
    const chipClass = isRejected ? 'user-chip user-chip--no' : 'user-chip user-chip--wait';
    const chipLabel = isRejected ? t('notifications.rejected', dictI18n) : t('notifications.pending', dictI18n);
    const date = item?.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU')
      : '';
    const text = isRejected
      ? t('notifications.textRejected', dictI18n)
      : t('notifications.textPending', dictI18n);
    return `
      <article class="user-list-item user-list-item--notice" ${isRead ? 'style="opacity:.65"' : ''}>
        <div class="user-list-item__row">
          <a class="user-list-item__title" href="${href}">${esc(placeName)}</a>
          <span class="${chipClass}">${esc(chipLabel)}</span>
        </div>
        <p class="user-list-item__meta">${esc(text)}</p>
        <div class="user-list-item__foot">${esc(date)}</div>
      </article>
    `;
  }).join('');

  const unread = getUnreadNotificationsCount(notifications);
  markReadBtn.disabled = unread === 0;
  toggleBtn.disabled = notifications.length <= 5;
  toggleBtn.textContent = expanded ? t('notifications.showLess', dictI18n) : t('notifications.showAll', dictI18n);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
