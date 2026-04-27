import { initNav } from '../../js/nav.js';
import { auth, db } from '../../js/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast } from '../../js/utils.js';

initNav('../');

onAuthStateChanged(auth, user => { if (!user) window.location.href = 'login.html'; });
document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

const pagesListEl = document.getElementById('pages-list');
const slugEl = document.getElementById('page-slug');
const titleEl = document.getElementById('page-title');
const contentEl = document.getElementById('page-content');
const addBtn = document.getElementById('add-page-btn');
const saveBtn = document.getElementById('save-page-btn');
const deleteBtn = document.getElementById('delete-page-btn');

let pages = [];
let activeSlug = '';

addBtn.addEventListener('click', () => {
  activeSlug = '';
  slugEl.value = '';
  titleEl.value = '';
  contentEl.value = '';
  renderList();
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
  activeSlug = slug;
  slugEl.value = page?.slug || slug;
  titleEl.value = page?.title || '';
  contentEl.value = page?.content || '';
  renderList();
}

async function savePage() {
  const slug = slugEl.value.trim().toLowerCase().replace(/\s+/g, '-');
  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  if (!slug) {
    showToast('Укажите slug', 'error');
    return;
  }
  try {
    await setDoc(doc(db, 'pagesContent', slug), {
      slug,
      title,
      content,
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
      contentEl.value = '';
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка удаления', 'error');
  }
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
