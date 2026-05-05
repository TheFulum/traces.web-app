import { auth, db } from '../shared/firebase-init.js';
import { initNav } from '../shared/nav.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import { getPlaces } from '../shared/places.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {
  getLang,
  loadDict,
  applyDict,
  applyLanguageSeo,
  patchProfileNavLinks,
  t,
  withLang
} from '../shared/i18n.js';

const lang = getLang();
const dateLoc = lang === 'en' ? 'en-GB' : 'ru-RU';
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  document.title = `${t('profileDashboard.reviewsPageTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;
} catch {}
patchProfileNavLinks(lang);

initNav('../../');

const listEl = document.getElementById('reviews-full-list');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = withLang('../../pages/auth.html', lang);
    return;
  }
  await render(user.uid);
});

async function render(uid) {
  if (!listEl) return;
  listEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.loading', dictI18n))}</p>`;

  try {
    const [reviewSnap, places] = await Promise.all([
      getDocs(query(collection(db, 'placeReviews'), where('uid', '==', uid))),
      getPlaces()
    ]);

    const placeMap = new Map(places.map(p => [String(p.id), String(p.name || p.id)]));
    const reviews = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    reviews.sort((a, b) => (b?.createdAt?.seconds ?? 0) - (a?.createdAt?.seconds ?? 0));

    if (!reviews.length) {
      listEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.reviewsEmptyFull', dictI18n))}</p>`;
      return;
    }

    listEl.innerHTML = reviews.map(r => {
      const stars = '★'.repeat(Number(r.rating || 0)) + '☆'.repeat(Math.max(0, 5 - Number(r.rating || 0)));
      const date = r?.createdAt?.toDate
        ? r.createdAt.toDate().toLocaleDateString(dateLoc, { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      const placeId = String(r.placeId || '');
      const placeName = placeMap.get(placeId) || placeId || '—';
      const status = r.status || 'approved';
      const statusLabel =
        status === 'approved'
          ? t('profileDashboard.statusApproved', dictI18n)
          : status === 'rejected'
            ? t('profileDashboard.statusRejected', dictI18n)
            : t('profileDashboard.statusPending', dictI18n);
      const chipClass = status === 'approved' ? 'user-chip user-chip--ok' : (status === 'rejected' ? 'user-chip user-chip--no' : 'user-chip user-chip--wait');
      const ratingAria = t('profileDashboard.ratingAria', dictI18n).replace('{n}', String(Number(r.rating || 0)));
      return `
        <article class="user-list-item">
          <div class="user-list-item__row">
            <a class="user-list-item__title" href="${withLang(`../../pages/place.html?id=${encodeURIComponent(placeId)}`, lang)}">${esc(placeName)}</a>
            <span class="user-stars" aria-label="${esc(ratingAria)}">${stars}</span>
          </div>
          <p class="user-list-item__meta">${esc(String(r.comment || ''))}</p>
          <div class="user-list-item__foot">
            <span class="${chipClass}">${esc(statusLabel)}</span>
            ${date ? ` · ${esc(date)}` : ''}
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.reviewsLoadError', dictI18n))}</p>`;
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
