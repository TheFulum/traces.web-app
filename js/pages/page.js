import { initNav } from '../shared/nav.js';
import { db } from '../shared/firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getLang, loadDict, applyDict, t } from '../shared/i18n.js';

const lang = getLang();
const dict = await loadDict(lang);

/** Корневые поля документа — русская версия; `i18n.en` — английская (с подстановкой с ru при пустых). */
function resolvePageFields(data, slug, locale) {
  const ruTitle = String(data.title || slug).trim() || slug;
  const ruSubtitle = String(data.subtitle || '').trim();
  const ruContent = String(data.content || '');
  const en = data.i18n?.en || {};
  const enTitle = String(en.title || '').trim();
  const enSubtitle = String(en.subtitle || '').trim();
  const enContent = String(en.content || '').trim();

  if (locale !== 'en') {
    return { title: ruTitle, subtitle: ruSubtitle, content: ruContent };
  }

  return {
    title: enTitle || ruTitle,
    subtitle: enSubtitle || ruSubtitle,
    content: enContent.trim() ? enContent : ruContent
  };
}
applyDict(dict);

initNav('../');

const params = new URLSearchParams(location.search);
const rawSlug = params.get('slug') || '';
const slug = normalizeSlug(rawSlug);

const heroEl = document.getElementById('page-hero');
const okEl = document.getElementById('page-state-ok');
const titleEl = document.getElementById('page-title');
const subtitleEl = document.getElementById('page-subtitle');
const bodyEl = document.getElementById('page-body');
const errWrap = document.getElementById('page-state-error');
const errTitle = document.getElementById('page-error-title');
const errText = document.getElementById('page-error-text');

function normalizeSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 80);
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || '';
}

function showError(title, text) {
  if (heroEl) heroEl.classList.add('hidden');
  okEl.classList.add('hidden');
  errWrap.classList.remove('hidden');
  errTitle.textContent = title;
  errText.textContent = text;
}

function showOk() {
  if (heroEl) heroEl.classList.remove('hidden');
  okEl.classList.remove('hidden');
  errWrap.classList.add('hidden');
}

async function run() {
  if (!slug) {
    document.title = `${t('staticPage.noSlugTitle', dict)} — ${t('common.brand', dict)}`;
    showError(t('staticPage.noSlugTitle', dict), t('staticPage.noSlugText', dict));
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'pagesContent', slug));
    if (!snap.exists()) {
      document.title = `${t('staticPage.notFoundTitle', dict)} — ${t('common.brand', dict)}`;
      showError(t('staticPage.notFoundTitle', dict), t('staticPage.notFoundText', dict));
      return;
    }

    showOk();

    const data = snap.data();
    const { title, subtitle, content } = resolvePageFields(data, slug, lang);

    titleEl.textContent = title;
    if (subtitle) {
      subtitleEl.textContent = subtitle;
      subtitleEl.classList.remove('hidden');
    } else {
      subtitleEl.textContent = '';
      subtitleEl.classList.add('hidden');
    }

    bodyEl.innerHTML = content.trim()
      ? content
      : `<p class="text-muted">—</p>`;

    document.title = `${title} — ${t('common.brand', dict)}`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const metaBase = subtitle || stripHtml(content).replace(/\s+/g, ' ').trim();
    meta.setAttribute('content', metaBase.slice(0, 158) || title);
  } catch (err) {
    console.error(err);
    document.title = `${t('staticPage.notFoundTitle', dict)} — ${t('common.brand', dict)}`;
    showError(t('staticPage.notFoundTitle', dict), t('staticPage.loadError', dict));
  }
}

await run();
