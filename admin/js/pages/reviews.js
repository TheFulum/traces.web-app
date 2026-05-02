import { initNav } from '../../../js/shared/nav.js';
import { auth, db } from '../../../js/shared/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  collection, getDocs, query, updateDoc, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast } from '../../../js/shared/utils.js';

initNav('../../');

// ── auth guard ────────────────────────────────────────────────────────────

onAuthStateChanged(auth, user => {
  if (!user) window.location.href = 'login.html';
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// ── state ─────────────────────────────────────────────────────────────────

let allReviews   = [];
let placesMap    = {};
let activeFilter = 0;
let activeStatus = 'all';
const selectedIds = new Set();

// ── load ──────────────────────────────────────────────────────────────────

try {
  const placesSnap = await getDocs(collection(db, 'places'));
  placesSnap.docs.forEach(d => {
    placesMap[d.id] = d.data().name || d.id;
  });

  const q    = query(collection(db, 'placeReviews'));
  const snap = await getDocs(q);
  allReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  allReviews.sort((a, b) => (b?.createdAt?.seconds ?? 0) - (a?.createdAt?.seconds ?? 0));
  renderStats();
  renderList();
} catch (err) {
  console.error(err);
  showToast('Ошибка загрузки отзывов', 'error');
}

// ── filter ────────────────────────────────────────────────────────────────

document.getElementById('filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activeFilter = parseInt(btn.dataset.rating, 10);
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
});

document.getElementById('status-filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activeStatus = String(btn.dataset.status || 'all');
  document.querySelectorAll('#status-filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
});

document.getElementById('bulk-approve-btn').addEventListener('click', () => applyBulkStatus('approved'));
document.getElementById('bulk-reject-btn').addEventListener('click', () => applyBulkStatus('rejected'));
document.getElementById('bulk-delete-btn').addEventListener('click', deleteSelected);

// ── render stats ──────────────────────────────────────────────────────────

function renderStats() {
  const total = allReviews.length;
  const avg   = total
    ? (allReviews.reduce((s, r) => s + (r.rating || 0), 0) / total).toFixed(1)
    : '—';
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-avg').textContent   = total ? `${avg} ★` : '—';
}

// ── render list ───────────────────────────────────────────────────────────

function renderList() {
  const listEl  = document.getElementById('reviews-list');
  const emptyEl = document.getElementById('empty-state');

  const filtered = activeFilter
    ? allReviews.filter(r => r.rating === activeFilter)
    : allReviews;
  const byStatus = activeStatus === 'all'
    ? filtered
    : filtered.filter(r => (r.status || 'approved') === activeStatus);

  if (!byStatus.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  listEl.innerHTML = byStatus.map(r => {
    const stars     = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
    const dateStr   = r.createdAt?.toDate
      ? r.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const placeName = r.placeId ? (placesMap[r.placeId] || r.placeId) : '—';

    const status = r.status || 'approved';
    const statusLabel = status === 'approved' ? 'Опубликован' : (status === 'rejected' ? 'Отклонён' : 'На модерации');
    const isChecked = selectedIds.has(r.id) ? 'checked' : '';
    return `
      <div class="feedback-item">
        <div>
          <div class="feedback-item__place">${esc(placeName)}</div>
          <div class="feedback-item__email">${esc(r.name || '—')} &middot; ${esc(r.email || '—')}</div>
          <div class="feedback-item__message">${esc(r.comment || '')}</div>
          <div class="feedback-item__status">
            <span class="status-chip status-chip--${status}">${statusLabel}</span>
            <label style="margin-left:10px;font-size:.78rem"><input type="checkbox" data-select-id="${r.id}" ${isChecked} /> выбрать</label>
          </div>
        </div>
        <div class="feedback-item__meta">
          <div class="feedback-item__stars">${stars}</div>
          <div class="feedback-item__date">${dateStr}</div>
          <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end;flex-wrap:wrap">
            <button class="btn btn--outline btn--sm" data-status-set="approved" data-id="${r.id}">Одобрить</button>
            <button class="btn btn--outline btn--sm" data-status-set="rejected" data-id="${r.id}">Отклонить</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-select-id]').forEach(ch => {
    ch.addEventListener('change', () => {
      const id = ch.getAttribute('data-select-id');
      if (ch.checked) selectedIds.add(id);
      else selectedIds.delete(id);
    });
  });
  listEl.querySelectorAll('[data-status-set]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const status = btn.getAttribute('data-status-set');
      await updateReviewStatus(id, status);
    });
  });
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function updateReviewStatus(id, status) {
  try {
    await updateDoc(doc(db, 'placeReviews', id), { status });
    const idx = allReviews.findIndex(r => r.id === id);
    if (idx >= 0) allReviews[idx].status = status;
    renderList();
    showToast('Статус обновлён');
  } catch (err) {
    console.error(err);
    showToast('Ошибка обновления статуса', 'error');
  }
}

async function applyBulkStatus(status) {
  const ids = Array.from(selectedIds);
  if (!ids.length) {
    showToast('Выберите отзывы', 'error');
    return;
  }
  try {
    await Promise.all(ids.map(id => updateDoc(doc(db, 'placeReviews', id), { status })));
    allReviews.forEach(r => { if (selectedIds.has(r.id)) r.status = status; });
    selectedIds.clear();
    renderList();
    showToast('Статусы обновлены');
  } catch (err) {
    console.error(err);
    showToast('Ошибка bulk-операции', 'error');
  }
}

async function deleteSelected() {
  const ids = Array.from(selectedIds);
  if (!ids.length) {
    showToast('Выберите отзывы', 'error');
    return;
  }
  if (!confirm(`Удалить ${ids.length} отзыв(ов)?`)) return;
  try {
    await Promise.all(ids.map(id => deleteDoc(doc(db, 'placeReviews', id))));
    allReviews = allReviews.filter(r => !selectedIds.has(r.id));
    selectedIds.clear();
    renderStats();
    renderList();
    showToast('Выбранные отзывы удалены');
  } catch (err) {
    console.error(err);
    showToast('Ошибка удаления', 'error');
  }
}
