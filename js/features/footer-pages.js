/**
 * Подставляет в подвал ссылки на документы из Firestore `pagesContent`.
 * Нужны правила: read для коллекции (или всего проекта) для неавторизованных.
 */
import { db } from '../shared/firebase-init.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getLang, withLang } from '../shared/i18n.js';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function injectFooterPages() {
  const slot = document.querySelector('[data-footer-pages]');
  if (!slot) return;

  try {
    const lang = getLang();

    const snap = await getDocs(collection(db, 'pagesContent'));
    const pages = snap.docs
      .map(d => {
        const data = d.data();
        const ruTitle = String(data.title || d.id || '').trim();
        const enTitle = String(data.i18n?.en?.title || '').trim();
        const title = lang === 'en' ? (enTitle || ruTitle) : ruTitle;
        return { slug: d.id, title };
      })
      .filter(p => p.slug && p.title);

    if (!pages.length) return;

    const sortLoc = lang === 'en' ? 'en' : 'ru';
    pages.sort((a, b) => a.title.localeCompare(b.title, sortLoc));
    const pageRoot = window.location.pathname.includes('/pages/') ? '' : 'pages/';
    slot.innerHTML = pages.map(p => {
      const href = withLang(`${pageRoot}page.html?slug=${encodeURIComponent(p.slug)}`, lang);
      return `<a href="${esc(href)}">${esc(p.title)}</a>`;
    }).join('');
  } catch (err) {
    console.warn('footer-pages:', err);
  }
}

await injectFooterPages();
