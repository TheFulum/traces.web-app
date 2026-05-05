import { auth } from '../shared/firebase-init.js';
import { initNav } from '../shared/nav.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {
  loadDict,
  applyDict,
  applyLanguageSeo,
  getLang,
  patchProfileNavLinks,
  t,
  withLang
} from '../shared/i18n.js';
import { buildRoutePageFullUrl } from '../shared/route-url.js';
import { buildRoutePageUrlWithSnapshot } from '../shared/route-snapshot.js';
import { listUserRoutes, deleteUserRoute } from '../features/user-saved-routes.js';

const lang = getLang();
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  document.title = `${t('profileRoutes.pageTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;
} catch {}
patchProfileNavLinks(lang);

initNav('../../');

const gridEl = document.getElementById('saved-routes-grid');
const emptyEl = document.getElementById('saved-routes-empty');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = withLang('../../pages/auth.html', lang);
    return;
  }
  await render(user.uid);
});

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSavedAt(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '';
  const d = ts.toDate();
  const loc = lang === 'en' ? 'en-GB' : 'ru-RU';
  try {
    return new Intl.DateTimeFormat(loc, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

async function render(uid) {
  if (!gridEl || !emptyEl) return;
  gridEl.innerHTML = '';
  emptyEl.classList.add('hidden');

  try {
    const routes = await listUserRoutes(uid);
    if (!routes.length) {
      emptyEl.textContent = t('profileRoutes.empty', dictI18n);
      emptyEl.classList.remove('hidden');
      return;
    }

    gridEl.innerHTML = routes.map((r) => cardHtml(r)).join('');
    gridEl.querySelectorAll('[data-delete-route]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-route');
        if (!id) return;
        btn.disabled = true;
        try {
          await deleteUserRoute(uid, id);
          btn.closest('.saved-route-card')?.remove();
          if (!gridEl.querySelector('.saved-route-card')) {
            emptyEl.textContent = t('profileRoutes.empty', dictI18n);
            emptyEl.classList.remove('hidden');
          }
          btn.disabled = false;
        } catch (e) {
          console.error(e);
          btn.disabled = false;
        }
      });
    });
  } catch (e) {
    console.error(e);
    emptyEl.textContent = t('profileRoutes.loadError', dictI18n);
    emptyEl.classList.remove('hidden');
  }
}

function cardHtml(route) {
  const titleRaw = String(route.title || '').trim();
  const title = titleRaw || t('profileRoutes.unnamed', dictI18n);
  const items = Array.isArray(route.items) ? route.items : [];
  const n = items.length;
  const snap = route.snapshot && route.snapshot.v === 1 ? route.snapshot : null;
  const openHref = snap ? buildRoutePageUrlWithSnapshot(snap, lang) : buildRoutePageFullUrl(items, lang);
  const previewList = items.slice(0, 4);
  const rest = Math.max(0, n - previewList.length);
  const previewText = previewList
    .map((x) => String(x?.name || x?.id || '').trim())
    .filter(Boolean)
    .join(' · ');
  const morePlain =
    rest > 0 ? ` · ${t('profileRoutes.previewMore', dictI18n).replace('{n}', String(rest))}` : '';
  const previewLine = previewText ? `${previewText}${morePlain}` : (n ? morePlain.trim() || '—' : '—');
  const when = formatSavedAt(route.createdAt);
  const savedLabel = t('profileRoutes.savedAt', dictI18n);

  return `
    <article class="saved-route-card">
      <h3 class="saved-route-card__title">${esc(title)}</h3>
      <p class="saved-route-card__meta">
        ${esc(t('profileRoutes.pointCount', dictI18n).replace('{n}', String(n)))}
        ${when ? ` · ${esc(savedLabel)} ${esc(when)}` : ''}
      </p>
      <p class="saved-route-card__preview">${esc(previewLine)}</p>
      <div class="saved-route-card__actions">
        <a class="btn btn--primary btn--sm" href="${esc(openHref)}">${esc(t('profileRoutes.open', dictI18n))}</a>
        <button type="button" class="btn btn--outline btn--sm" data-delete-route="${esc(route.id)}">${esc(t('profileRoutes.delete', dictI18n))}</button>
      </div>
    </article>
  `;
}
