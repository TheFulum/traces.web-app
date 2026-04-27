import { auth, db } from './firebase-init.js';
import { initNav } from './nav.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
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

let currentUser = null;

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  currentUser = user;
  nameEl.value = user.displayName || '';
  emailEl.value = user.email || '';
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
  el.className = `profile-status${type ? ' ' + type : ''}`;
}
