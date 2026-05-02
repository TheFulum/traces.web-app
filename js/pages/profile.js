import { auth, db } from '../shared/firebase-init.js';
import { initNav } from '../shared/nav.js';
import { doc, setDoc, serverTimestamp, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getPlaces } from '../shared/places.js';
import { syncGuestDataWithAccount } from '../features/account-sync.js';
import {
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
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
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  document.title = `${t('profileDashboard.pageTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;
} catch {}
patchProfileNavLinks(lang);

initNav('../../');

const nameEl = document.getElementById('profile-name');
const emailEl = document.getElementById('profile-email');
const saveBtn = document.getElementById('profile-save');
const logoutBtn = document.getElementById('logout-btn');
const statusEl = document.getElementById('profile-status');
const securityStatusEl = document.getElementById('security-status');
const currentPasswordEl = document.getElementById('current-password');
const newPasswordEl = document.getElementById('new-password');
const passwordSaveBtn = document.getElementById('password-save');
const myReviewsListEl = document.getElementById('my-reviews-list');
const favoritesListEl = document.getElementById('favorites-list');
const historyListEl = document.getElementById('history-list');

let currentUser = null;

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = withLang('../../pages/auth.html', lang);
    return;
  }
  initProfile(user);
});

async function initProfile(user) {
  currentUser = user;
  nameEl.value = user.displayName || '';
  emailEl.value = user.email || '';
  try {
    await syncGuestDataWithAccount(user.uid);
  } catch (err) {
    console.warn('syncGuestDataWithAccount failed', err);
  }
  loadMyReviews(user.uid);
  renderFavorites();
  renderHistory();
}

saveBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const displayName = nameEl.value.trim();
  const email = emailEl.value.trim();
  if (!displayName || !email) {
    setStatus(statusEl, t('profileDashboard.statusFillFields', dictI18n), 'error');
    return;
  }

  saveBtn.disabled = true;
  const prev = saveBtn.textContent;
  saveBtn.textContent = t('profileDashboard.statusSaving', dictI18n);
  setStatus(statusEl, '');
  try {
    if (displayName !== (currentUser.displayName || '')) {
      await updateProfile(currentUser, { displayName });
    }
    if (email !== (currentUser.email || '')) {
      setStatus(statusEl, t('profileDashboard.emailChangeHint', dictI18n), 'error');
      return;
    }
    await setDoc(doc(db, 'users', currentUser.uid), {
      uid: currentUser.uid,
      displayName,
      email,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setStatus(statusEl, t('profileDashboard.statusProfileOk', dictI18n), 'success');
  } catch (err) {
    console.error(err);
    setStatus(statusEl, t('profileDashboard.statusProfileErr', dictI18n), 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = prev;
  }
});

passwordSaveBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const currentPassword = currentPasswordEl.value;
  const newPassword = newPasswordEl.value;
  const nextEmail = emailEl.value.trim();
  if (!currentPassword) {
    setStatus(securityStatusEl, t('profileDashboard.statusNeedPassword', dictI18n), 'error');
    return;
  }
  if (newPassword && newPassword.length < 6) {
    setStatus(securityStatusEl, t('profileDashboard.statusPasswordShort', dictI18n), 'error');
    return;
  }

  passwordSaveBtn.disabled = true;
  const prev = passwordSaveBtn.textContent;
  passwordSaveBtn.textContent = t('profileDashboard.statusSaving', dictI18n);
  setStatus(securityStatusEl, '');
  try {
    const cred = EmailAuthProvider.credential(currentUser.email || '', currentPassword);
    await reauthenticateWithCredential(currentUser, cred);

    if (nextEmail && nextEmail !== (currentUser.email || '')) {
      await updateEmail(currentUser, nextEmail);
    }
    if (newPassword) {
      await updatePassword(currentUser, newPassword);
      newPasswordEl.value = '';
    }

    await setDoc(doc(db, 'users', currentUser.uid), {
      uid: currentUser.uid,
      displayName: nameEl.value.trim() || currentUser.displayName || '',
      email: currentUser.email || nextEmail,
      updatedAt: serverTimestamp()
    }, { merge: true });

    currentPasswordEl.value = '';
    setStatus(securityStatusEl, t('profileDashboard.statusSecurityOk', dictI18n), 'success');
  } catch (err) {
    console.error(err);
    setStatus(securityStatusEl, t('profileDashboard.statusSecurityErr', dictI18n), 'error');
  } finally {
    passwordSaveBtn.disabled = false;
    passwordSaveBtn.textContent = prev;
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = withLang('../../index.html', lang);
});

function setStatus(el, text, type = '') {
  el.textContent = text;
  const base = 'user-status';
  el.className = type ? `${base} ${type}` : base;
}

async function loadMyReviews(uid) {
  if (!myReviewsListEl) return;
  const dateLoc = lang === 'en' ? 'en-GB' : 'ru-RU';
  myReviewsListEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.loading', dictI18n))}</p>`;
  try {
    const [reviewSnap, places] = await Promise.all([
      getDocs(query(collection(db, 'placeReviews'), where('uid', '==', uid))),
      getPlaces()
    ]);
    const placeMap = new Map(places.map(p => [p.id, p.name || p.id]));
    const reviews = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    reviews.sort((a, b) => (b?.createdAt?.seconds ?? 0) - (a?.createdAt?.seconds ?? 0));

    if (!reviews.length) {
      myReviewsListEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.reviewsEmptyPreview', dictI18n))}</p>`;
      return;
    }

    myReviewsListEl.innerHTML = reviews.slice(0, 20).map(r => {
      const stars = '★'.repeat(Number(r.rating || 0)) + '☆'.repeat(Math.max(0, 5 - Number(r.rating || 0)));
      const date = r?.createdAt?.toDate
        ? r.createdAt.toDate().toLocaleDateString(dateLoc, { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      const placeName = placeMap.get(r.placeId) || r.placeId || '—';
      const status = r.status || 'approved';
      const statusLabel =
        status === 'approved'
          ? t('profileDashboard.statusApproved', dictI18n)
          : status === 'rejected'
            ? t('profileDashboard.statusRejected', dictI18n)
            : t('profileDashboard.statusPending', dictI18n);
      const chipClass = status === 'approved' ? 'user-chip user-chip--ok' : (status === 'rejected' ? 'user-chip user-chip--no' : 'user-chip user-chip--wait');
      const ratingAria = t('profileDashboard.ratingAria', dictI18n).replace('{n}', String(Number(r.rating || 0)));
      const placeHref = withLang(`../../pages/place.html?id=${encodeURIComponent(String(r.placeId || ''))}`, lang);
      return `
        <article class="user-list-item">
          <div class="user-list-item__row">
            <a class="user-list-item__title" href="${esc(placeHref)}">${esc(placeName)}</a>
            <span class="user-stars" aria-label="${esc(ratingAria)}">${stars}</span>
          </div>
          <p class="user-list-item__meta">${esc(String(r.comment || ''))}</p>
          <div class="user-list-item__foot">
            <span class="${chipClass}">${esc(statusLabel)}</span>
            · ${esc(date)}
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    myReviewsListEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.reviewsLoadError', dictI18n))}</p>`;
  }
}

function renderFavorites() {
  if (!favoritesListEl) return;
  const list = readLs('profile_favorites');
  if (!list.length) {
    favoritesListEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.favoritesEmptyPreview', dictI18n))}</p>`;
    return;
  }
  favoritesListEl.innerHTML = list.slice(0, 30).map(item => `
    <article class="user-list-item">
      <div class="user-list-item__row">
        <a class="user-list-item__title" href="${esc(withLang(`../../pages/place.html?id=${encodeURIComponent(item.id)}`, lang))}">${esc(item.name || item.id)}</a>
        <button type="button" data-fav-remove="${esc(item.id)}" class="btn btn--outline btn--sm">${esc(t('profileDashboard.removeBtn', dictI18n))}</button>
      </div>
    </article>
  `).join('');
  favoritesListEl.querySelectorAll('[data-fav-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-fav-remove');
      const next = readLs('profile_favorites').filter(x => x.id !== id);
      localStorage.setItem('profile_favorites', JSON.stringify(next));
      renderFavorites();
    });
  });
}

function renderHistory() {
  if (!historyListEl) return;
  const dateLoc = lang === 'en' ? 'en-GB' : 'ru-RU';
  const list = readLs('profile_history');
  if (!list.length) {
    historyListEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.historyEmptyPreview', dictI18n))}</p>`;
    return;
  }
  historyListEl.innerHTML = list.slice(0, 30).map(item => `
    <article class="user-list-item">
      <a class="user-list-item__title" href="${esc(withLang(`../../pages/place.html?id=${encodeURIComponent(item.id)}`, lang))}">${esc(item.name || item.id)}</a>
      <div class="user-list-item__foot">${esc(t('profileDashboard.viewedPrefix', dictI18n))} ${esc(new Date(item.viewedAt || Date.now()).toLocaleString(dateLoc))}</div>
    </article>
  `).join('');
}

function readLs(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
