import { auth, db } from '../shared/firebase-init.js';
import { initNav } from '../shared/nav.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { syncGuestDataWithAccount } from '../features/account-sync.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, t, withLang } from '../shared/i18n.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const lang = getLang();
const dictI18n = await loadDict(lang);
applyDict(dictI18n);
applyLanguageSeo(lang);
initNav('../');

const emailEl = document.getElementById('auth-email');
const passwordEl = document.getElementById('auth-password');
const nameEl = document.getElementById('auth-name');
const nameWrap = document.getElementById('name-wrap');
const submitBtn = document.getElementById('auth-submit');
const statusEl = document.getElementById('auth-status');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

let mode = 'login';
let isSubmitting = false;
let isRedirecting = false;
const privacyLink = document.querySelector('.auth-link');
const footerCatalogLink = document.querySelector('.auth-footer a');

if (privacyLink) privacyLink.href = withLang('page.html?slug=privacy', lang);
if (footerCatalogLink) footerCatalogLink.href = withLang('catalog.html', lang);
setPageSeo();
switchMode(mode);

onAuthStateChanged(auth, async (user) => {
  if (!user || isSubmitting || isRedirecting) return;
  try {
    await syncGuestDataWithAccount(user.uid);
  } catch (err) {
    console.warn('syncGuestDataWithAccount failed', err);
  }
  isRedirecting = true;
  window.location.href = 'profile/index.html';
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
  submitBtn.textContent = isRegister ? t('auth.submitRegister', dictI18n) : t('auth.submitLogin', dictI18n);
  statusEl.textContent = '';
  statusEl.className = 'auth-status';
}

async function submit() {
  const email = emailEl.value.trim();
  const password = passwordEl.value;
  const displayName = nameEl.value.trim();

  if (!email || !password) {
    setStatus(t('auth.errorFillEmailPassword', dictI18n), 'error');
    return;
  }
  if (mode === 'register' && !displayName) {
    setStatus(t('auth.errorNameRequired', dictI18n), 'error');
    nameEl.focus();
    return;
  }

  submitBtn.disabled = true;
  isSubmitting = true;
  setStatus('');
  const prevLabel = submitBtn.textContent;
  submitBtn.textContent = mode === 'register' ? t('auth.loadingRegister', dictI18n) : t('auth.loadingLogin', dictI18n);

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
      await syncGuestDataWithAccount(cred.user.uid);
      setStatus(t('auth.statusAccountCreated', dictI18n), 'success');
    } else {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await syncGuestDataWithAccount(cred.user.uid);
    }
    isRedirecting = true;
    window.location.href = 'profile/index.html';
  } catch (err) {
    console.error(err);
    setStatus(friendlyError(err?.code), 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = prevLabel;
    isSubmitting = false;
  }
}

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `auth-status${type ? ' ' + type : ''}`;
}

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return t('auth.errorEmailInUse', dictI18n);
    case 'auth/invalid-email': return t('auth.errorInvalidEmail', dictI18n);
    case 'auth/weak-password': return t('auth.errorWeakPassword', dictI18n);
    case 'auth/invalid-credential': return t('auth.errorInvalidCredential', dictI18n);
    case 'auth/too-many-requests': return t('auth.errorTooManyRequests', dictI18n);
    default: return t('auth.errorGeneric', dictI18n);
  }
}

function setPageSeo() {
  document.title = t('auth.pageTitle', dictI18n);
  const meta = document.getElementById('auth-meta-description');
  if (meta) meta.setAttribute('content', t('auth.pageDescription', dictI18n));
}
