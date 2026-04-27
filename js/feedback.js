import { initNav } from './nav.js';
import { db } from './firebase-init.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast, checkRateLimit, formatRemaining } from './utils.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, t } from './i18n.js';

const lang = getLang();
const dictI18n = await loadDict(lang);
applyDict(dictI18n);
applyLanguageSeo(lang);
initNav('');

// ── star rating ───────────────────────────────────────────────────────────

const LABEL_KEYS = {
  1: 'feedback.rating1',
  2: 'feedback.rating2',
  3: 'feedback.rating3',
  4: 'feedback.rating4',
  5: 'feedback.rating5'
};

let selectedRating = 0;

const stars      = Array.from(document.querySelectorAll('.star'));
const ratingText = document.getElementById('rating-text');

function paint(upTo) {
  stars.forEach(s => s.classList.toggle('on', parseInt(s.dataset.v) <= upTo));
}

stars.forEach(star => {
  const v = parseInt(star.dataset.v);

  star.addEventListener('click', () => {
    selectedRating = v;
    paint(v);
    ratingText.textContent = t(LABEL_KEYS[v], dictI18n);
  });

  star.addEventListener('mouseenter', () => paint(v));
  star.addEventListener('mouseleave', () => paint(selectedRating));
});

// ── submit ────────────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 60_000;

const emailEl   = document.getElementById('email');
const messageEl = document.getElementById('message');
const submitBtn = document.getElementById('submit-btn');
const statusEl  = document.getElementById('form-status');
const formCard  = document.getElementById('form-card');
submitBtn.textContent = t('feedback.submit', dictI18n);

submitBtn.addEventListener('click', async () => {
  const email   = emailEl.value.trim();
  const message = messageEl.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus(t('feedback.emailInvalid', dictI18n), 'error');
    emailEl.focus();
    return;
  }
  if (!message) {
    setStatus(t('feedback.messageRequired', dictI18n), 'error');
    messageEl.focus();
    return;
  }
  if (!selectedRating) {
    setStatus(t('feedback.ratingRequired', dictI18n), 'error');
    return;
  }

  const rl = checkRateLimit('feedback', RATE_LIMIT_MS);
  if (!rl.allowed) {
    setStatus(`${t('feedback.rateLimitPrefix', dictI18n)} ${formatRemaining(rl.remainingMs)}.`, 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t('feedback.sending', dictI18n);
  setStatus('');

  try {
    await addDoc(collection(db, 'feedback'), {
      email,
      message,
      rating: selectedRating,
      createdAt: serverTimestamp()
    });
    showSuccess();
  } catch (err) {
    console.error(err);
    setStatus(t('feedback.sendError', dictI18n), 'error');
    showToast(t('feedback.sendErrorToast', dictI18n), 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = t('feedback.submit', dictI18n);
  }
});

// ── helpers ───────────────────────────────────────────────────────────────

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `form-status${type ? ' ' + type : ''}`;
}

function showSuccess() {
  formCard.innerHTML = `
    <div class="feedback-success">
      <div class="feedback-success__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 class="feedback-success__title">${t('feedback.successTitle', dictI18n)}</h2>
      <p class="feedback-success__sub">${t('feedback.successText', dictI18n)}</p>
      <a href="index.html" class="btn btn--outline">${t('feedback.successBack', dictI18n)}</a>
    </div>
  `;
}