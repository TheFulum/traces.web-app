import { initNav } from '../../../js/shared/nav.js';
import { auth } from '../../../js/shared/firebase-init.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getUserProfile, isAdminProfile } from '../../../js/shared/user-profile.js';

initNav('../../');

const emailEl    = document.getElementById('email');
const passwordEl = document.getElementById('password');
const loginBtn   = document.getElementById('login-btn');
const statusEl   = document.getElementById('form-status');

// Уже вошли — в админку только при role=admin, иначе в личный кабинет на сайте
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  let profile;
  try {
    profile = await getUserProfile(user.uid);
  } catch {
    profile = { role: 'user', commentsBanned: false };
  }
  window.location.href = isAdminProfile(profile)
    ? 'dashboard.html'
    : '../../pages/profile/index.html';
});

// enter key support
[emailEl, passwordEl].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
});

loginBtn.addEventListener('click', login);

async function login() {
  const email    = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) {
    setStatus('Заполните все поля.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Вход…';
  setStatus('');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    const profile = user ? await getUserProfile(user.uid) : { role: 'user', commentsBanned: false };
    window.location.href = isAdminProfile(profile)
      ? 'dashboard.html'
      : '../../pages/profile/index.html';
  } catch (err) {
    console.error(err);
    setStatus(friendlyError(err.code));
    loginBtn.disabled = false;
    loginBtn.textContent = 'Войти';
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':        return 'Неверный формат почты.';
    case 'auth/user-not-found':       return 'Пользователь не найден.';
    case 'auth/wrong-password':       return 'Неверный пароль.';
    case 'auth/invalid-credential':   return 'Неверная почта или пароль.';
    case 'auth/too-many-requests':    return 'Слишком много попыток. Попробуйте позже.';
    default:                          return 'Ошибка входа. Попробуйте ещё раз.';
  }
}
