import { auth, db } from './firebase-init.js';
import { initNav } from './nav.js';
import { doc, setDoc, serverTimestamp, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getPlaces } from './places.js';
import {
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

initNav('');

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
const notificationsListEl = document.getElementById('notifications-list');

let currentUser = null;

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  currentUser = user;
  nameEl.value = user.displayName || '';
  emailEl.value = user.email || '';
  loadMyReviews(user.uid);
  renderFavorites();
  renderHistory();
});

saveBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const displayName = nameEl.value.trim();
  const email = emailEl.value.trim();
  if (!displayName || !email) {
    setStatus(statusEl, 'Заполните имя и email.', 'error');
    return;
  }

  saveBtn.disabled = true;
  const prev = saveBtn.textContent;
  saveBtn.textContent = 'Сохранение…';
  setStatus(statusEl, '');
  try {
    if (displayName !== (currentUser.displayName || '')) {
      await updateProfile(currentUser, { displayName });
    }
    if (email !== (currentUser.email || '')) {
      setStatus(statusEl, 'Для смены email введите текущий пароль ниже и выполните повторно.', 'error');
      return;
    }
    await setDoc(doc(db, 'users', currentUser.uid), {
      uid: currentUser.uid,
      displayName,
      email,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setStatus(statusEl, 'Профиль обновлён.', 'success');
  } catch (err) {
    console.error(err);
    setStatus(statusEl, 'Не удалось обновить профиль.', 'error');
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
    setStatus(securityStatusEl, 'Введите текущий пароль.', 'error');
    return;
  }
  if (newPassword && newPassword.length < 6) {
    setStatus(securityStatusEl, 'Новый пароль должен быть не короче 6 символов.', 'error');
    return;
  }

  passwordSaveBtn.disabled = true;
  const prev = passwordSaveBtn.textContent;
  passwordSaveBtn.textContent = 'Сохранение…';
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
    setStatus(securityStatusEl, 'Данные безопасности обновлены.', 'success');
  } catch (err) {
    console.error(err);
    setStatus(securityStatusEl, 'Не удалось обновить email/пароль. Проверьте текущий пароль.', 'error');
  } finally {
    passwordSaveBtn.disabled = false;
    passwordSaveBtn.textContent = prev;
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});

function setStatus(el, text, type = '') {
  el.textContent = text;
  const base = 'user-status';
  el.className = type ? `${base} ${type}` : base;
}

async function loadMyReviews(uid) {
  if (!myReviewsListEl) return;
  myReviewsListEl.innerHTML = '<p class="user-empty">Загрузка…</p>';
  try {
    const [reviewSnap, places] = await Promise.all([
      getDocs(query(collection(db, 'placeReviews'), where('uid', '==', uid))),
      getPlaces()
    ]);
    const placeMap = new Map(places.map(p => [p.id, p.name || p.id]));
    const reviews = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    reviews.sort((a, b) => (b?.createdAt?.seconds ?? 0) - (a?.createdAt?.seconds ?? 0));

    if (!reviews.length) {
      myReviewsListEl.innerHTML = '<p class="user-empty">Пока нет отзывов. Откройте карточку места и поделитесь впечатлением.</p>';
      return;
    }

    myReviewsListEl.innerHTML = reviews.slice(0, 20).map(r => {
      const stars = '★'.repeat(Number(r.rating || 0)) + '☆'.repeat(Math.max(0, 5 - Number(r.rating || 0)));
      const date = r?.createdAt?.toDate
        ? r.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      const placeName = placeMap.get(r.placeId) || r.placeId || '—';
      const status = r.status || 'approved';
      const statusLabel = status === 'approved' ? 'Опубликован' : (status === 'rejected' ? 'Отклонён' : 'На модерации');
      const chipClass = status === 'approved' ? 'user-chip user-chip--ok' : (status === 'rejected' ? 'user-chip user-chip--no' : 'user-chip user-chip--wait');
      return `
        <article class="user-list-item">
          <div class="user-list-item__row">
            <a class="user-list-item__title" href="place.html?id=${encodeURIComponent(String(r.placeId || ''))}">${esc(placeName)}</a>
            <span class="user-stars" aria-label="Оценка ${Number(r.rating || 0)} из 5">${stars}</span>
          </div>
          <p class="user-list-item__meta">${esc(String(r.comment || ''))}</p>
          <div class="user-list-item__foot">
            <span class="${chipClass}">${esc(statusLabel)}</span>
            · ${esc(date)}
          </div>
        </article>
      `;
    }).join('');
    renderNotifications(reviews);
  } catch (err) {
    console.error(err);
    myReviewsListEl.innerHTML = '<p class="user-empty">Не удалось загрузить отзывы. Проверьте соединение и обновите страницу.</p>';
  }
}

function renderFavorites() {
  if (!favoritesListEl) return;
  const list = readLs('profile_favorites');
  if (!list.length) {
    favoritesListEl.innerHTML = '<p class="user-empty">Добавляйте места в избранное на странице объекта — они появятся здесь.</p>';
    return;
  }
  favoritesListEl.innerHTML = list.slice(0, 30).map(item => `
    <article class="user-list-item">
      <div class="user-list-item__row">
        <a class="user-list-item__title" href="place.html?id=${encodeURIComponent(item.id)}">${esc(item.name || item.id)}</a>
        <button type="button" data-fav-remove="${esc(item.id)}" class="btn btn--outline btn--sm">Убрать</button>
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
  const list = readLs('profile_history');
  if (!list.length) {
    historyListEl.innerHTML = '<p class="user-empty">Здесь будут недавно открытые карточки мест.</p>';
    return;
  }
  historyListEl.innerHTML = list.slice(0, 30).map(item => `
    <article class="user-list-item">
      <a class="user-list-item__title" href="place.html?id=${encodeURIComponent(item.id)}">${esc(item.name || item.id)}</a>
      <div class="user-list-item__foot">Просмотрено: ${new Date(item.viewedAt || Date.now()).toLocaleString('ru-RU')}</div>
    </article>
  `).join('');
}

function renderNotifications(reviews = []) {
  if (!notificationsListEl) return;
  const items = (reviews || [])
    .filter(r => r.status === 'pending' || r.status === 'rejected')
    .slice(0, 10)
    .map(r => ({
      text: r.status === 'rejected'
        ? `Ваш отзыв отклонён модератором (${String(r.placeId || 'место')}).`
        : `Ваш отзыв ожидает модерацию (${String(r.placeId || 'место')}).`
    }));
  if (!items.length) {
    notificationsListEl.innerHTML = '<p class="user-empty">Новых уведомлений нет — все отзывы обработаны или ещё не отправлены.</p>';
    return;
  }
  notificationsListEl.innerHTML = items.map(n => `
    <article class="user-list-item user-list-item--notice">${esc(n.text)}</article>
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
