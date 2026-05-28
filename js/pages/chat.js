import { initNav } from '../shared/nav.js';
import { showToast, checkRateLimit, formatRemaining } from '../shared/utils.js';
import { getLang, loadDict, applyDict, applyLanguageSeo, t, pickI18n, withLang } from '../shared/i18n.js';
import { getPlaces } from '../shared/places.js';
import { parseRouteScope, placeMatchesScope } from '../shared/chat-route-scope.js';
import { setTripItems } from './trips.js';

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
/** @type {Map<string, string>} p1 → firestore id */
let catalogKeyToId = new Map();
/** @type {import('../shared/chat-route-scope.js').parseRouteScope extends Function ? ReturnType<typeof parseRouteScope> : object | null} */
let lastRouteScope = null;
/** @type {{ id: string, key: string, name: string, city: string }[]} */
let lastScopedCatalog = [];
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

function routeScopeFromMessages(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  return parseRouteScope(lastUser?.content || '', lang);
}

async function callWorker(messages) {
  if (placesById.size === 0) await bootstrapPlaces();

  lastRouteScope = routeScopeFromMessages(messages);
  const catalog = buildCatalogForWorker(lastRouteScope);
  lastScopedCatalog = catalog;

  let res;
  try {
    res = await fetch(WORKER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        messages,
        lang,
        catalog,
        routeScope: lastRouteScope
      })
    });
  } catch {
    throw new Error(t('chat.errNetwork', dictI18n));
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Ошибка сервера: ${res.status}`);
  if (!data?.content) throw new Error(t('chat.errEmpty', dictI18n));
  return processAssistantReply(data, lastRouteScope, catalog);
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
    const goBtn = div.querySelector('[data-go-route-id]');
    goBtn?.addEventListener('click', () => applySuggestedRouteAndGo(goBtn.getAttribute('data-go-route-id'), goBtn));
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

/** Каталог для воркера: при запросе маршрута — только места выбранного города/области. */
function buildCatalogForWorker(scope = null) {
  const locale = lang === 'en' ? 'en' : 'ru';
  const entries = [];
  placesById.forEach((place, id) => {
    if (scope?.kind && !placeMatchesScope(place, scope, pickI18n, lang)) return;
    const i18nData = pickI18n(place, lang);
    entries.push({
      id: String(id),
      name: String(i18nData?.name || place.name || id).slice(0, 140),
      city: String(i18nData?.city || place.city || '').slice(0, 80)
    });
  });
  entries.sort(
    (a, b) =>
      a.city.localeCompare(b.city, locale) || a.name.localeCompare(b.name, locale)
  );
  const withKeys = entries.map((p, i) => ({ ...p, key: `p${i + 1}` }));
  catalogKeyToId = new Map(withKeys.map((p) => [p.key, p.id]));
  return withKeys;
}

function filterRouteToCatalog(route) {
  if (!route?.placeIds?.length) return null;
  const placeIds = [];
  const seen = new Set();
  route.placeIds.forEach((token) => {
    const raw = String(token || '').trim();
    if (!raw) return;
    const id = catalogKeyToId.get(raw) || (placesById.has(raw) ? raw : '');
    if (!id || seen.has(id)) return;
    seen.add(id);
    placeIds.push(id);
  });
  if (!placeIds.length) return null;
  return {
    placeIds: placeIds.slice(0, 20),
    filters: route.filters && typeof route.filters === 'object' ? route.filters : {}
  };
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
  return filterRouteToCatalog({
    placeIds,
    filters: raw.filters && typeof raw.filters === 'object' ? raw.filters : {}
  });
}

function stripRouteJsonFromContent(text) {
  let s = String(text || '');
  s = s.replace(/<!--route:\s*\{[\s\S]*?\}\s*-->/gi, '');
  s = s.replace(/<!--route:[\s\S]*$/gi, '');
  s = s.replace(/```(?:json)?\s*\{[\s\S]*?"placeIds"[\s\S]*?\}\s*```/gi, '');
  s = s.replace(/\{\s*"placeIds"\s*:\s*\[[\s\S]*?\]\s*(?:,\s*"filters"\s*:\s*\{[\s\S]*?\})?\s*\}/gi, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function sanitizeRouteProse(text, catalog = []) {
  let s = stripRouteJsonFromContent(text);
  s = s.replace(/\(\s*(?:место\s+)?id\s*:\s*[`'"]?[^)\n]+[`'"]?\s*\)/gi, '');
  s = s.replace(/\bid\s*:\s*[`'"]?[^`'"\s,.)]+[`'"]?/gi, '');
  s = s.replace(/[`'](?:belarus_place_\d+|[A-Za-z0-9]{18,24})[`']/g, '');
  s = s.replace(/\b p\d{1,4}\b/gi, '');
  for (const p of catalog) {
    if (p.key) s = s.replace(new RegExp(`\\b${p.key}\\b`, 'gi'), '');
  }
  s = s.replace(/(?:,\s*){2,}/g, ', ');
  s = s.replace(/:\s*,/g, ':');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function enforceScopedRoute(route, scope, scopedCatalog) {
  const scopedIds = new Set(scopedCatalog.map((p) => p.id));
  if (!scopedCatalog.length) {
    return scope?.kind
      ? { placeIds: [], note: t('chat.routeScopeEmpty', dictI18n).replace('{scope}', scope.label || '') }
      : null;
  }

  let ids = (route?.placeIds || []).filter((id) => scopedIds.has(id));
  const limit = scope?.count ? Math.min(scope.count, 20) : ids.length || scopedCatalog.length;

  if (!ids.length) {
    ids = scopedCatalog.slice(0, limit).map((p) => p.id);
  } else {
    ids = ids.slice(0, limit);
  }

  let note = '';
  if (scope?.count && scopedCatalog.length < scope.count) {
    note = t('chat.routeFewerInCatalog', dictI18n)
      .replace('{requested}', String(scope.count))
      .replace('{available}', String(scopedCatalog.length));
  }

  return {
    placeIds: ids,
    filters: { ...(route?.filters || {}), scope: scope?.label || '' },
    note
  };
}

function parsePlaceIdsFromRouteFragment(fragment) {
  const ids = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(fragment))) {
    const token = String(m[1] || '').trim();
    if (token) ids.push(token);
  }
  return ids;
}

function extractRouteProposalFromText(content) {
  const text = String(content || '');
  const commentMatch = text.match(/<!--route:\s*(\{[\s\S]*?\})\s*-->/i);
  if (commentMatch) {
    try {
      const route = normalizeRouteProposal(JSON.parse(commentMatch[1]));
      if (route) return route;
    } catch {
      /* continue */
    }
  }
  const truncMatch = text.match(/<!--route:\s*\{[\s\S]*?"placeIds"\s*:\s*\[([^\]]*)/i);
  if (truncMatch) {
    const route = normalizeRouteProposal({ placeIds: parsePlaceIdsFromRouteFragment(truncMatch[1]) });
    if (route) return route;
  }
  const candidates = [];
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) candidates.push(codeBlockMatch[1]);
  const inlineMatch = text.match(/\{[^{}]*"placeIds"\s*:\s*\[[\s\S]*?\][^{}]*\}/);
  if (inlineMatch) candidates.push(inlineMatch[0]);
  for (const candidate of candidates) {
    try {
      const route = normalizeRouteProposal(JSON.parse(candidate));
      if (route) return route;
    } catch {
      /* next */
    }
  }
  return null;
}

function processAssistantReply(data, scope, scopedCatalog) {
  const rawContent = String(data?.content || '');
  const rawRoute =
    normalizeRouteProposal(data?.route) || extractRouteProposalFromText(rawContent);
  let route = filterRouteToCatalog(rawRoute);
  if (scope?.kind) {
    route = enforceScopedRoute(route, scope, scopedCatalog);
    if (route && !route.placeIds?.length) route = null;
  }
  let content = sanitizeRouteProse(rawContent, scopedCatalog);
  if (route?.note) {
    content = content ? `${content}\n\n${route.note}` : route.note;
  }
  if (scope?.kind && !scopedCatalog.length) {
    const note = t('chat.routeScopeEmpty', dictI18n).replace('{scope}', scope.label || '');
    content = content ? `${content}\n\n${note}` : note;
    route = null;
  } else if (rawRoute && !route?.placeIds?.length) {
    const note = t('chat.routeNoCatalogMatch', dictI18n);
    content = content ? `${content}\n\n${note}` : note;
  }
  return { content, route: route?.placeIds?.length ? route : null };
}

function renderRouteSuggestion(route) {
  const suggestionId = `s-${++suggestionSeq}`;
  routeSuggestions.set(suggestionId, route);
  const list = route.placeIds.map((id) => {
    const place = placesById.get(id);
    const i18nData = place ? pickI18n(place, lang) : null;
    const label = i18nData?.name || place?.name || id;
    return `<li>${esc(label)}</li>`;
  }).join('');
  const filtersText = formatFilters(route.filters);
  return `
    <div class="msg__route-box">
      <div class="msg__route-title">${esc(t('chat.routeSuggestionTitle', dictI18n))}</div>
      <div class="msg__route-disclaimer">${esc(t('chat.routeAiDisclaimer', dictI18n))}</div>
      ${route.note ? `<p class="msg__route-note">${esc(route.note)}</p>` : ''}
      <ol class="msg__route-list">${list}</ol>
      ${filtersText ? `<div class="msg__route-filters">${esc(t('chat.routeFilters', dictI18n))}: ${esc(filtersText)}</div>` : ''}
      <div class="msg__route-actions">
        <button type="button" class="btn btn--primary btn--sm" data-go-route-id="${escAttr(suggestionId)}">${esc(t('chat.routeGo', dictI18n))}</button>
      </div>
    </div>
  `;
}

function buildTripItemsFromRoute(route) {
  const base = Date.now();
  return route.placeIds.map((id, index) => {
    const place = placesById.get(id);
    const i18nData = place ? pickI18n(place, lang) : null;
    return {
      id,
      name: i18nData?.name || place?.name || id,
      addedAt: base - index
    };
  });
}

async function applySuggestedRouteAndGo(suggestionId, btn) {
  const route = routeSuggestions.get(String(suggestionId || ''));
  if (!route?.placeIds?.length) {
    showToast(t('chat.routeSaveError', dictI18n), 'error');
    return;
  }
  if (btn) btn.disabled = true;
  try {
    if (placesById.size === 0) await bootstrapPlaces();
    const items = buildTripItemsFromRoute(route);
    if (!items.length) {
      showToast(t('chat.routeAllUnknown', dictI18n), 'error');
      return;
    }
    setTripItems(items);
    window.location.href = withLang('route.html', lang);
  } finally {
    if (btn) btn.disabled = false;
  }
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
