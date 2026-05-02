import { initNav } from '../../../js/shared/nav.js';
import { auth, db } from '../../../js/shared/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast } from '../../../js/shared/utils.js';

initNav('../../');

onAuthStateChanged(auth, user => { if (!user) window.location.href = 'login.html'; });
document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

const pagesListEl = document.getElementById('pages-list');
const slugEl = document.getElementById('page-slug');
const titleEl = document.getElementById('page-title');
const subtitleEl = document.getElementById('page-subtitle');
const contentEl = document.getElementById('page-content');
const titleEnEl = document.getElementById('page-title-en');
const subtitleEnEl = document.getElementById('page-subtitle-en');
const contentEnEl = document.getElementById('page-content-en');
const addBtn = document.getElementById('add-page-btn');
const saveBtn = document.getElementById('save-page-btn');
const deleteBtn = document.getElementById('delete-page-btn');
const publicSlugHintEl = document.getElementById('page-public-slug-hint');

let pages = [];
let activeSlug = '';

function updatePublicSlugHint() {
  if (publicSlugHintEl) publicSlugHintEl.textContent = slugEl.value.trim() || 'ваш-slug';
}

slugEl.addEventListener('input', updatePublicSlugHint);

addBtn.addEventListener('click', () => {
  activeSlug = '';
  slugEl.value = '';
  titleEl.value = '';
  subtitleEl.value = '';
  contentEl.value = '';
  if (titleEnEl) titleEnEl.value = '';
  if (subtitleEnEl) subtitleEnEl.value = '';
  if (contentEnEl) contentEnEl.value = '';
  renderList();
  updatePublicSlugHint();
  slugEl.focus();
});

saveBtn.addEventListener('click', savePage);
deleteBtn.addEventListener('click', deletePageCurrent);

await loadPages();

async function loadPages() {
  try {
    const snap = await getDocs(collection(db, 'pagesContent'));
    pages = snap.docs.map(d => ({ slug: d.id, ...d.data() }))
      .sort((a, b) => String(a.slug).localeCompare(String(b.slug), 'ru'));
    renderList();
    if (!activeSlug && pages.length) openPage(pages[0].slug);
    else updatePublicSlugHint();
  } catch (err) {
    console.error(err);
    showToast('Ошибка загрузки страниц', 'error');
  }
}

function renderList() {
  if (!pages.length) {
    pagesListEl.innerHTML = '<p class="admin-list-empty">Пока нет страниц.</p>';
    return;
  }
  pagesListEl.innerHTML = pages.map(p => `
    <article class="admin-pages-list-item ${p.slug === activeSlug ? 'active' : ''}" data-open="${esc(p.slug)}">
      <strong>${esc(p.title || p.slug)}</strong><br />
      <small class="text-muted">${esc(p.slug)}</small>
    </article>
  `).join('');
  pagesListEl.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => openPage(el.getAttribute('data-open') || ''));
  });
}

function openPage(slug) {
  const page = pages.find(p => p.slug === slug);
  const en = page?.i18n?.en || {};
  activeSlug = slug;
  slugEl.value = page?.slug || slug;
  titleEl.value = page?.title || '';
  subtitleEl.value = page?.subtitle || '';
  contentEl.value = page?.content || '';
  if (titleEnEl) titleEnEl.value = en.title ?? '';
  if (subtitleEnEl) subtitleEnEl.value = en.subtitle ?? '';
  if (contentEnEl) contentEnEl.value = en.content ?? '';
  renderList();
  updatePublicSlugHint();
}

async function savePage() {
  const slug = slugEl.value.trim().toLowerCase().replace(/\s+/g, '-');
  const title = titleEl.value.trim();
  const subtitle = subtitleEl.value.trim();
  const content = contentEl.value.trim();
  const titleEn = (titleEnEl?.value ?? '').trim();
  const subtitleEn = (subtitleEnEl?.value ?? '').trim();
  const contentEn = (contentEnEl?.value ?? '').trim();
  if (!slug) {
    showToast('Укажите slug', 'error');
    return;
  }
  try {
    await setDoc(doc(db, 'pagesContent', slug), {
      slug,
      title,
      subtitle,
      content,
      i18n: {
        en: {
          title: titleEn,
          subtitle: subtitleEn,
          content: contentEn
        }
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
    activeSlug = slug;
    showToast('Страница сохранена');
    await loadPages();
  } catch (err) {
    console.error(err);
    showToast('Ошибка сохранения', 'error');
  }
}

async function deletePageCurrent() {
  const slug = (slugEl.value || '').trim();
  if (!slug) return;
  if (!confirm(`Удалить страницу "${slug}"?`)) return;
  try {
    await deleteDoc(doc(db, 'pagesContent', slug));
    if (activeSlug === slug) activeSlug = '';
    showToast('Страница удалена');
    await loadPages();
    if (!pages.length) {
      slugEl.value = '';
      titleEl.value = '';
      subtitleEl.value = '';
      contentEl.value = '';
      if (titleEnEl) titleEnEl.value = '';
      if (subtitleEnEl) subtitleEnEl.value = '';
      if (contentEnEl) contentEnEl.value = '';
      updatePublicSlugHint();
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка удаления', 'error');
  }
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
