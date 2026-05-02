import { initNav } from '../shared/nav.js';
import { showToast, checkRateLimit, formatRemaining } from '../shared/utils.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, t, pickI18n } from '../shared/i18n.js';
import { getPlaces } from '../shared/places.js';
import { addToTrip, isInTrip } from './trips.js';

initNav('../');
const lang = getLang();
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  document.title = `${t('chat.pageTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;
} catch {}

// ── config ────────────────────────────────────────────────────────────────
/** Override without editing bundle: `window.__TRACES_CHAT_WORKER_URL__ = 'https://…'` */
const WORKER_URL =
  (typeof window !== 'undefined' && window.__TRACES_CHAT_WORKER_URL__)
    ? String(window.__TRACES_CHAT_WORKER_URL__).trim().replace(/\/+$/, '')
    : 'https://traces-chat.lipouski-daniil.workers.dev';
const RATE_LIMIT_MS = 30_000;

// ── state ─────────────────────────────────────────────────────────────────

const history = [];
let   isWaiting = false;
let placesById = new Map();
let suggestionSeq = 0;
const routeSuggestions = new Map();

// ── elements ──────────────────────────────────────────────────────────────

const messagesEl = document.getElementById('messages');
const welcomeEl  = document.getElementById('welcome');
const inputEl    = document.getElementById('chat-input');
const sendBtn    = document.getElementById('send-btn');
const statusEl   = document.getElementById('chat-status');
bootstrapPlaces();

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
    appendMessage('assistant', reply.content, reply.route);
    history.push({ role: 'assistant', content: reply.content });
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
  const route = normalizeRouteProposal(data?.route) || extractRouteProposalFromText(data?.content);
  return { content: String(data.content || ''), route };
}

// ── render ────────────────────────────────────────────────────────────────

function appendMessage(role, text, route = null) {
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `msg ${isUser ? 'msg--user' : ''}`;
  const routeHtml = !isUser && route?.placeIds?.length ? renderRouteSuggestion(route) : '';
  div.innerHTML = `
    <div class="msg__avatar">${isUser ? t('chat.avatarYou', dictI18n) : t('chat.avatarGuide', dictI18n)}</div>
    <div class="msg__bubble">${formatText(text)}${routeHtml}</div>`;
  messagesEl.appendChild(div);
  if (!isUser && route?.placeIds?.length) {
    const saveBtn = div.querySelector('[data-save-route-id]');
    saveBtn?.addEventListener('click', () => saveSuggestedRoute(saveBtn.getAttribute('data-save-route-id'), saveBtn));
  }
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
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

async function bootstrapPlaces() {
  try {
    const places = await getPlaces();
    placesById = new Map(places.map((p) => [String(p.id), p]));
  } catch {
    placesById = new Map();
  }
}

function normalizeRouteProposal(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const idsRaw = Array.isArray(raw.placeIds) ? raw.placeIds : (Array.isArray(raw.placeId) ? raw.placeId : []);
  const placeIds = [];
  const seen = new Set();
  idsRaw.forEach((id) => {
    const safe = String(id || '').trim();
    if (!safe || seen.has(safe)) return;
    seen.add(safe);
    placeIds.push(safe);
  });
  if (!placeIds.length) return null;
  return {
    placeIds: placeIds.slice(0, 20),
    filters: raw.filters && typeof raw.filters === 'object' ? raw.filters : {}
  };
}

function extractRouteProposalFromText(content) {
  const text = String(content || '');
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = codeBlockMatch ? codeBlockMatch[1] : text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
    return normalizeRouteProposal(parsed);
  } catch {
    return null;
  }
}

function renderRouteSuggestion(route) {
  const suggestionId = `s-${++suggestionSeq}`;
  routeSuggestions.set(suggestionId, route);
  const list = route.placeIds.map((id) => {
    const place = placesById.get(id);
    const i18nData = place ? pickI18n(place, lang) : null;
    const name = i18nData?.name || place?.name || id;
    return `<li>${esc(name)}</li>`;
  }).join('');
  const filtersText = formatFilters(route.filters);
  return `
    <div class="msg__route-box">
      <div class="msg__route-title">${esc(t('chat.routeSuggestionTitle', dictI18n))}</div>
      <ol class="msg__route-list">${list}</ol>
      ${filtersText ? `<div class="msg__route-filters">${esc(t('chat.routeFilters', dictI18n))}: ${esc(filtersText)}</div>` : ''}
      <div class="msg__route-actions">
        <button type="button" class="btn btn--outline btn--sm" data-save-route-id="${escAttr(suggestionId)}">${esc(t('chat.routeSave', dictI18n))}</button>
      </div>
    </div>
  `;
}

async function saveSuggestedRoute(suggestionId, btn) {
  const route = routeSuggestions.get(String(suggestionId || ''));
  if (!route?.placeIds?.length) {
    showToast(t('chat.routeSaveError', dictI18n), 'error');
    return;
  }
  if (btn) btn.disabled = true;
  let added = 0;
  route.placeIds.forEach((id) => {
    if (isInTrip(id)) return;
    const place = placesById.get(id);
    const i18nData = place ? pickI18n(place, lang) : null;
    addToTrip({ id, name: i18nData?.name || place?.name || id });
    added += 1;
  });
  const msg = `${t('chat.routeSaved', dictI18n)}: ${added}`;
  showToast(msg, added > 0 ? 'success' : '');
  setStatus(msg);
}

function formatFilters(filters) {
  if (!filters || typeof filters !== 'object') return '';
  const out = [];
  if (filters.city) out.push(`city=${filters.city}`);
  if (Array.isArray(filters.tags) && filters.tags.length) out.push(`tags=${filters.tags.join(',')}`);
  if (filters.has3d != null) out.push(`3d=${Boolean(filters.has3d)}`);
  if (filters.hasPhotos != null) out.push(`photos=${Boolean(filters.hasPhotos)}`);
  if (filters.yearFrom != null || filters.yearTo != null) out.push(`years=${filters.yearFrom || ''}-${filters.yearTo || ''}`);
  return out.join(' · ');
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return esc(str).replace(/`/g, '&#96;');
}
