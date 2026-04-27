import { initNav } from './nav.js';
import { showToast, checkRateLimit, formatRemaining } from './utils.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, t } from './i18n.js';

initNav('');
const lang = getLang();
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  document.title = `${t('chat.pageTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;
} catch {}

// ── config ────────────────────────────────────────────────────────────────
const WORKER_URL    = 'https://traces-chat.lipouski-daniil.workers.dev';
const RATE_LIMIT_MS = 30_000;

// ── state ─────────────────────────────────────────────────────────────────

const history = [];
let   isWaiting = false;

// ── elements ──────────────────────────────────────────────────────────────

const messagesEl = document.getElementById('messages');
const welcomeEl  = document.getElementById('welcome');
const inputEl    = document.getElementById('chat-input');
const sendBtn    = document.getElementById('send-btn');
const statusEl   = document.getElementById('chat-status');

// ── hint buttons ──────────────────────────────────────────────────────────

document.querySelectorAll('.chat-hint').forEach(btn => {
  btn.addEventListener('click', () => {
    inputEl.value = btn.textContent;
    autoResize();
    updateSendBtn();
    inputEl.focus();
  });
});

// ── input handling ────────────────────────────────────────────────────────

inputEl.addEventListener('input', () => { autoResize(); updateSendBtn(); });
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) submit(); }
});
sendBtn.addEventListener('click', submit);

function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
}
function updateSendBtn() {
  sendBtn.disabled = isWaiting || inputEl.value.trim().length === 0;
}

// ── submit ────────────────────────────────────────────────────────────────

async function submit() {
  const text = inputEl.value.trim();
  if (!text || isWaiting) return;

  const rl = checkRateLimit('chat', RATE_LIMIT_MS);
  if (!rl.allowed) {
    setStatus(`${t('chat.waitMore', dictI18n)} ${formatRemaining(rl.remainingMs)}`, 'error');
    return;
  }

  welcomeEl?.remove();
  appendMessage('user', text);
  history.push({ role: 'user', content: text });

  inputEl.value = '';
  inputEl.style.height = 'auto';
  isWaiting = true;
  updateSendBtn();
  setStatus('');

  const loadingId = 'loading-' + Date.now();
  appendLoading(loadingId);

  try {
    const reply = await callWorker(history);
    removeLoading(loadingId);
    appendMessage('assistant', reply);
    history.push({ role: 'assistant', content: reply });
    setStatus('');
  } catch (err) {
    removeLoading(loadingId);
    // Show friendly error instead of raw API message
    const friendly = friendlyError(err.message);
    setStatus(friendly, 'error');
    showToast(friendly, 'error');
    history.pop();
  } finally {
    isWaiting = false;
    updateSendBtn();
  }
}

// ── friendly error messages ──────────────────────────────────────────────

function friendlyError(raw) {
  const lower = (raw || '').toLowerCase();

  // Model errors (404, 503, unavailable, etc.)
  if (lower.includes('404') || lower.includes('not found') || lower.includes('model')) {
    return t('chat.errServiceUnavailable', dictI18n);
  }
  // Rate limit / quota
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return t('chat.errTooManyRequests', dictI18n);
  }
  // Server errors
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('server')) {
    return t('chat.errServer', dictI18n);
  }
  // Network
  if (lower.includes('сети') || lower.includes('network') || lower.includes('fetch')) {
    return t('chat.errNetwork', dictI18n);
  }
  // Empty response
  if (lower.includes('пустой') || lower.includes('empty')) {
    return t('chat.errEmpty', dictI18n);
  }
  // Fallback — don't expose raw error
  return t('chat.errGeneric', dictI18n);
}

// ── call Cloudflare Worker ────────────────────────────────────────────────

async function callWorker(messages) {
  let res;
  try {
    res = await fetch(WORKER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages })
    });
  } catch {
    throw new Error(t('chat.errNetwork', dictI18n));
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Ошибка сервера: ${res.status}`);
  if (!data?.content) throw new Error(t('chat.errEmpty', dictI18n));
  return data.content;
}

// ── render ────────────────────────────────────────────────────────────────

function appendMessage(role, text) {
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `msg ${isUser ? 'msg--user' : ''}`;
  div.innerHTML = `
    <div class="msg__avatar">${isUser ? t('chat.avatarYou', dictI18n) : t('chat.avatarGuide', dictI18n)}</div>
    <div class="msg__bubble">${formatText(text)}</div>`;
  messagesEl.appendChild(div);
  scrollBottom();
}

function appendLoading(id) {
  const div = document.createElement('div');
  div.className = 'msg'; div.id = id;
  div.innerHTML = `
    <div class="msg__avatar">${t('chat.avatarGuide', dictI18n)}</div>
    <div class="msg__bubble msg__bubble--loading">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>`;
  messagesEl.appendChild(div);
  scrollBottom();
}

function removeLoading(id) { document.getElementById(id)?.remove(); }
function scrollBottom()     { messagesEl.scrollTop = messagesEl.scrollHeight; }
function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `chat-status${type ? ' ' + type : ''}`;
}
function formatText(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}
