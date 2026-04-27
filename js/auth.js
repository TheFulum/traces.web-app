import { auth, db } from './firebase-init.js';
import { initNav } from './nav.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

initNav('');

const emailEl = document.getElementById('auth-email');
const passwordEl = document.getElementById('auth-password');
const nameEl = document.getElementById('auth-name');
const nameWrap = document.getElementById('name-wrap');
const submitBtn = document.getElementById('auth-submit');
const statusEl = document.getElementById('auth-status');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

let mode = 'login';

onAuthStateChanged(auth, user => {
  if (!user) return;
  window.location.href = 'profile.html';
});

tabLogin.addEventListener('click', () => switchMode('login'));
tabRegister.addEventListener('click', () => switchMode('register'));
submitBtn.addEventListener('click', submit);

[emailEl, passwordEl, nameEl].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
  });
});

function switchMode(next) {
  mode = next;
  const isRegister = mode === 'register';
  tabLogin.classList.toggle('active', !isRegister);
  tabRegister.classList.toggle('active', isRegister);
  tabLogin.setAttribute('aria-selected', String(!isRegister));
  tabRegister.setAttribute('aria-selected', String(isRegister));
  nameWrap.classList.toggle('hidden', !isRegister);
  submitBtn.textContent = isRegister ? 'Создать аккаунт' : 'Войти';
  statusEl.textContent = '';
  statusEl.className = 'auth-status';
}

async function submit() {
  const email = emailEl.value.trim();
  const password = passwordEl.value;
  const displayName = nameEl.value.trim();

  if (!email || !password) {
    setStatus('Заполните email и пароль.', 'error');
    return;
  }
  if (mode === 'register' && !displayName) {
    setStatus('Введите имя для профиля.', 'error');
    nameEl.focus();
    return;
  }

  submitBtn.disabled = true;
  setStatus('');
  const prevLabel = submitBtn.textContent;
  submitBtn.textContent = mode === 'register' ? 'Создание…' : 'Вход…';

  try {
    if (mode === 'register') {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        displayName,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      setStatus('Аккаунт создан.', 'success');
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    window.location.href = 'profile.html';
  } catch (err) {
    console.error(err);
    setStatus(friendlyError(err?.code), 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = prevLabel;
  }
}

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `auth-status${type ? ' ' + type : ''}`;
}

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Этот email уже используется.';
    case 'auth/invalid-email': return 'Неверный формат email.';
    case 'auth/weak-password': return 'Слишком простой пароль.';
    case 'auth/invalid-credential': return 'Неверная почта или пароль.';
    case 'auth/too-many-requests': return 'Слишком много попыток. Повторите позже.';
    default: return 'Не удалось выполнить операцию. Попробуйте снова.';
  }
}
