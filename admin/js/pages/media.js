import { initNav } from '../../../js/shared/nav.js';
import { auth, db } from '../../../js/shared/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { uploadImages } from '../../../js/shared/cloudinary.js';
import { showToast } from '../../../js/shared/utils.js';

initNav('../../');

onAuthStateChanged(auth, user => { if (!user) window.location.href = 'login.html'; });
document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('media-files');
const progressEl = document.getElementById('upload-progress');
const gridEl = document.getElementById('media-grid');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

await loadMedia();

async function handleFiles(files) {
  const arr = Array.from(files || []).slice(0, 10);
  if (!arr.length) return;
  try {
    const urls = await uploadImages(arr, (_i, _pct, overall) => {
      progressEl.textContent = `Загрузка... ${overall}%`;
    });
    await Promise.all(urls.map(url => addDoc(collection(db, 'mediaLibrary'), {
      url,
      type: 'image',
      createdAt: serverTimestamp()
    })));
    progressEl.textContent = '';
    showToast('Файлы загружены');
    await loadMedia();
  } catch (err) {
    console.error(err);
    progressEl.textContent = '';
    showToast('Ошибка загрузки файлов', 'error');
  } finally {
    fileInput.value = '';
  }
}

async function loadMedia() {
  try {
    const snap = await getDocs(query(collection(db, 'mediaLibrary'), orderBy('createdAt', 'desc')));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!items.length) {
      gridEl.innerHTML = '<p class="admin-list-empty">Библиотека пока пуста.</p>';
      return;
    }
    gridEl.innerHTML = items.map(item => `
      <article class="admin-media-tile">
        <img src="${esc(item.url)}" alt="" />
        <div class="admin-media-tile__body">
          <span>${formatDate(item.createdAt)}</span>
          <a href="${esc(item.url)}" target="_blank" rel="noopener" class="btn btn--outline btn--sm">Открыть</a>
          <button class="btn btn--outline btn--sm" data-copy="${esc(item.url)}">Копировать URL</button>
        </div>
      </article>
    `).join('');
    gridEl.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.getAttribute('data-copy') || '');
          showToast('URL скопирован');
        } catch {
          showToast('Не удалось скопировать', 'error');
        }
      });
    });
  } catch (err) {
    console.error(err);
    showToast('Ошибка загрузки библиотеки', 'error');
  }
}

function formatDate(ts) {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
