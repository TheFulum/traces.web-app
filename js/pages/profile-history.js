import { auth } from '../shared/firebase-init.js';
import { initNav } from '../shared/nav.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {
  getLang,
  loadDict,
  applyDict,
  applyLanguageSeo,
  patchProfileNavLinks,
  t,
  withLang
} from '../shared/i18n.js';

const lang = getLang();
let dictI18n = null;
try {
  dictI18n = await loadDict(lang);
  applyDict(dictI18n);
  applyLanguageSeo(lang);
  document.title = `${t('profileDashboard.historyPageTitle', dictI18n)} — ${t('common.brand', dictI18n)}`;
} catch {}
patchProfileNavLinks(lang);

initNav('../../');

const listEl = document.getElementById('history-full-list');
const clearBtn = document.getElementById('history-clear');
const dateLoc = lang === 'en' ? 'en-GB' : 'ru-RU';

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = withLang('../../pages/auth.html', lang);
    return;
  }
  render();
});

clearBtn?.addEventListener('click', () => {
  localStorage.setItem('profile_history', JSON.stringify([]));
  render();
});

function render() {
  if (!listEl) return;
  const list = readLs('profile_history');
  if (!list.length) {
    listEl.innerHTML = `<p class="user-empty">${esc(t('profileDashboard.historyEmptyFull', dictI18n))}</p>`;
    return;
  }

  listEl.innerHTML = list.map(item => `
    <article class="user-list-item">
      <a class="user-list-item__title" href="${withLang(`../../pages/place.html?id=${encodeURIComponent(item.id)}`, lang)}">${esc(item.name || item.id)}</a>
      <div class="user-list-item__foot">${esc(t('profileDashboard.viewedPrefix', dictI18n))} ${esc(new Date(item.viewedAt || Date.now()).toLocaleString(dateLoc))}</div>
    </article>
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
