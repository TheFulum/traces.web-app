import { initNav } from '../../../js/shared/nav.js';
import { db } from '../../../js/shared/firebase-init.js';
import {
  collection, getDocs, query, orderBy, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast } from '../../../js/shared/utils.js';
import { bindAdminLogout, gateAdmin } from '../shared/admin-guard.js';

initNav('../../');
bindAdminLogout();

gateAdmin(async () => {

// ── state ─────────────────────────────────────────────────────────────────

let allFeedback  = [];
let activeFilter = 0;

// ── load ──────────────────────────────────────────────────────────────────

try {
  const q    = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  allFeedback = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

// ── delete ────────────────────────────────────────────────────────────────

const deleteModal = createDeleteModal();

document.getElementById('feedback-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-feedback-delete]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (!id) return;

  const item = allFeedback.find(f => f.id === id);
  const ok = await deleteModal.confirm(item);
  if (!ok) return;

  btn.disabled = true;
  try {
    await deleteDoc(doc(db, 'feedback', id));
    allFeedback = allFeedback.filter(f => f.id !== id);
    renderStats();
    renderList();
    showToast('Удалено', 'success');
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    showToast('Не удалось удалить', 'error');
  }
});

// ── render stats ──────────────────────────────────────────────────────────

function renderStats() {
  const total = allFeedback.length;
  const avg   = total
    ? (allFeedback.reduce((s, f) => s + (f.rating || 0), 0) / total).toFixed(1)
    : '—';
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-avg').textContent   = total ? `${avg} ★` : '—';
}

// ── render list ───────────────────────────────────────────────────────────

function renderList() {
  const listEl   = document.getElementById('feedback-list');
  const emptyEl  = document.getElementById('empty-state');

  const filtered = activeFilter
    ? allFeedback.filter(f => f.rating === activeFilter)
    : allFeedback;

  if (!filtered.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  listEl.innerHTML = filtered.map(f => {
    const stars   = '★'.repeat(f.rating || 0) + '☆'.repeat(5 - (f.rating || 0));
    const dateStr = f.createdAt?.toDate
      ? f.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const name = String(f.name || '').trim();

    return `
      <div class="feedback-item" data-id="${escAttr(f.id)}">
        <div>
          <div class="feedback-item__email">${esc(f.email || '—')}${name ? ` <span style="color:var(--c-text-muted);font-weight:400">· ${esc(name)}</span>` : ''}</div>
          <div class="feedback-item__message">${esc(f.message || '')}</div>
        </div>
        <div class="feedback-item__meta">
          <div class="feedback-item__stars">${stars}</div>
          <div class="feedback-item__date">${dateStr}</div>
          <button class="btn btn--outline btn--sm" data-feedback-delete data-id="${escAttr(f.id)}">Удалить</button>
        </div>
      </div>
    `;
  }).join('');
}

}); // gateAdmin

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createDeleteModal() {
  const root = document.getElementById('delete-modal');
  const bodyEl = document.getElementById('delete-modal-body');
  const btnCancel = document.getElementById('delete-modal-cancel');
  const btnConfirm = document.getElementById('delete-modal-confirm');
  if (!root || !bodyEl || !btnCancel || !btnConfirm) {
    return { confirm: async () => window.confirm('Удалить сообщение?') };
  }

  let pendingResolve = null;
  let lastActive = null;

  function open(text) {
    lastActive = document.activeElement;
    bodyEl.textContent = text;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => btnCancel.focus());
  }

  function close(result) {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    btnConfirm.disabled = false;
    if (lastActive && typeof lastActive.focus === 'function') lastActive.focus();
    if (pendingResolve) {
      const r = pendingResolve;
      pendingResolve = null;
      r(result);
    }
  }

  root.addEventListener('click', (e) => {
    if (e.target && e.target.closest('[data-modal-close]')) close(false);
  });

  btnCancel.addEventListener('click', () => close(false));
  btnConfirm.addEventListener('click', () => close(true));

  document.addEventListener('keydown', (e) => {
    if (!root.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close(false);
      return;
    }
    // light focus trap
    if (e.key === 'Tab') {
      const focusables = [btnCancel, btnConfirm].filter(Boolean);
      const idx = focusables.indexOf(document.activeElement);
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          focusables[focusables.length - 1].focus();
        }
      } else {
        if (idx === focusables.length - 1) {
          e.preventDefault();
          focusables[0].focus();
        }
      }
    }
  });

  async function confirm(item) {
    const email = String(item?.email || '').trim();
    const name = String(item?.name || '').trim();
    const dateStr = item?.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const bits = [
      email ? `Email: ${email}` : null,
      name ? `Имя: ${name}` : null,
      dateStr ? `Дата: ${dateStr}` : null
    ].filter(Boolean);

    return await new Promise((resolve) => {
      pendingResolve = resolve;
      open(bits.length ? bits.join('\n') : 'Это действие нельзя отменить.');
    });
  }

  return { confirm };
}
