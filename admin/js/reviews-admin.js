import { initNav } from '../../js/nav.js';
import { auth } from '../../js/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { db } from '../../js/firebase-init.js';
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast } from '../../js/utils.js';

initNav('../');

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

// ── load ──────────────────────────────────────────────────────────────────

try {
  // load places for name lookup
  const placesSnap = await getDocs(collection(db, 'places'));
  placesSnap.docs.forEach(d => {
    placesMap[d.id] = d.data().name || d.id;
  });

  // load all place reviews
  const q    = query(collection(db, 'placeReviews'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  allReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

  if (!filtered.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  listEl.innerHTML = filtered.map(r => {
    const stars     = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
    const dateStr   = r.createdAt?.toDate
      ? r.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const placeName = r.placeId ? (placesMap[r.placeId] || r.placeId) : '—';

    return `
      <div class="feedback-item">
        <div>
          <div class="feedback-item__place">${esc(placeName)}</div>
          <div class="feedback-item__email">${esc(r.name || '—')} &middot; ${esc(r.email || '—')}</div>
          <div class="feedback-item__message">${esc(r.comment || '')}</div>
        </div>
        <div class="feedback-item__meta">
          <div class="feedback-item__stars">${stars}</div>
          <div class="feedback-item__date">${dateStr}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
