import { initNav } from '../../../js/shared/nav.js';
import { auth, db } from '../../../js/shared/firebase-init.js';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import { showToast } from '../../../js/shared/utils.js';
import { getLang, loadDict, t } from '../../../js/shared/i18n.js';
import { bindAdminLogout, gateAdmin } from '../shared/admin-guard.js';
import { normalizeUserProfile, ROLE_ADMIN, ROLE_USER } from '../../../js/shared/user-profile.js';
import { sendUserNotification, NTYPE } from '../shared/send-user-notification.js';
import { resolveMediaWorkerUrl } from '../../../js/shared/media-worker-url.js';

initNav('../../');
bindAdminLogout();

const lang = getLang();
let dict = null;
try {
  dict = await loadDict(lang);
} catch { /* ignore */ }

const td = (key, fallback) => (dict ? t(key, dict) : null) || fallback;

const tbodyEl = document.getElementById('users-tbody');
const searchEl = document.getElementById('users-search');
const countMetaEl = document.getElementById('users-count');
/** @type {Array<{ id: string, email: string, displayName: string, role: string, commentsBanned: boolean }>} */
let allRows = [];

gateAdmin(async () => {
  await loadUsers();
  searchEl?.addEventListener('input', () => render(filterRows(searchEl.value)));
});

async function loadUsers() {
  tbodyEl.innerHTML = `<tr><td colspan="6">${esc(td('admin.users.loading', 'Загрузка…'))}</td></tr>`;
  try {
    const snap = await getDocs(collection(db, 'users'));
    allRows = snap.docs.map((d) => {
      const raw = d.data() || {};
      const norm = normalizeUserProfile(raw);
      return {
        id: d.id,
        email: String(raw.email || norm.email || ''),
        displayName: String(raw.displayName || norm.displayName || ''),
        role: norm.role,
        commentsBanned: norm.commentsBanned
      };
    });
    allRows.sort((a, b) => (a.email || a.id).localeCompare(b.email || b.id, lang === 'en' ? 'en' : 'ru'));
    render(filterRows(searchEl?.value || ''));
  } catch (err) {
    console.error(err);
    tbodyEl.innerHTML = '';
    showToast(td('admin.users.loadError', 'Не удалось загрузить пользователей'), 'error');
  }
}

function filterRows(q) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return allRows.slice();
  return allRows.filter((row) => {
    const email = (row.email || '').toLowerCase();
    const name = (row.displayName || '').toLowerCase();
    return email.includes(needle) || name.includes(needle) || row.id.toLowerCase().includes(needle);
  });
}

function render(rows) {
  if (!tbodyEl) return;
  const emptyEl = document.getElementById('users-empty');
  if (countMetaEl) {
    countMetaEl.textContent = td('admin.users.showing', 'Показано: {n}').replace('{n}', String(rows.length));
  }

  if (!rows.length) {
    tbodyEl.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');

  tbodyEl.innerHTML = rows.map((row) => renderRow(row)).join('');
  tbodyEl.querySelectorAll('[data-save-user]').forEach((btn) => {
    btn.addEventListener('click', () => saveRow(btn.getAttribute('data-save-user') || ''));
  });
}

function renderRow(row) {
  const uidShort = row.id.length > 12 ? `${row.id.slice(0, 8)}…` : row.id;
  const roleUserLabel = td('admin.users.roleUser', 'Пользователь');
  const roleAdminLabel = td('admin.users.roleAdmin', 'Админ');
  const banLabel = td('admin.users.commentsBanned', 'Запрет отзывов');
  const saveLabel = td('admin.users.save', 'Сохранить');
  const isSelf = auth.currentUser?.uid === row.id;
  const selfRoleLockHint = td('admin.users.selfRoleLock', 'Нельзя снять админку с самого себя');

  return `
    <tr data-uid="${escAttr(row.id)}">
      <td>${esc(row.email || '—')}</td>
      <td>${esc(row.displayName || '—')}</td>
      <td title="${escAttr(row.id)}"><code>${esc(uidShort)}</code>${isSelf ? ` <small>(${esc(td('admin.users.you', 'вы'))})</small>` : ''}</td>
      <td>
        <select data-field="role" aria-label="${escAttr(td('admin.users.colRole', 'Роль'))}" ${isSelf ? 'disabled title="' + escAttr(selfRoleLockHint) + '"' : ''}>
          <option value="${ROLE_USER}" ${row.role !== ROLE_ADMIN ? 'selected' : ''}>${esc(roleUserLabel)}</option>
          <option value="${ROLE_ADMIN}" ${row.role === ROLE_ADMIN ? 'selected' : ''}>${esc(roleAdminLabel)}</option>
        </select>
      </td>
      <td>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;cursor:pointer">
          <input type="checkbox" data-field="commentsBanned" ${row.commentsBanned ? 'checked' : ''} />
          ${esc(banLabel)}
        </label>
      </td>
      <td>
        <button type="button" class="btn btn--primary btn--sm" data-save-user="${escAttr(row.id)}">${esc(saveLabel)}</button>
      </td>
    </tr>
  `;
}

async function saveRow(uid) {
  const tr = tbodyEl.querySelector(`tr[data-uid="${escAttr(uid)}"]`);
  if (!tr || !uid) return;
  const roleSel = tr.querySelector('select[data-field="role"]');
  const banCh = tr.querySelector('input[data-field="commentsBanned"]');
  const role = roleSel?.value === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USER;
  const commentsBanned = Boolean(banCh?.checked);

  const ix = allRows.findIndex((r) => r.id === uid);
  const prev = ix >= 0 ? allRows[ix] : null;
  const prevRole = prev?.role ?? ROLE_USER;
  const prevBan = Boolean(prev?.commentsBanned);

  // Never allow self-demotion from admin panel (prevents lock-out and KV desync).
  if (uid === auth.currentUser?.uid && role !== ROLE_ADMIN) {
    showToast(td('admin.users.selfDemoteBlocked', 'Нельзя снять права администратора с самого себя.'), 'error');
    // Repaint current selection back to admin.
    if (roleSel) roleSel.value = ROLE_ADMIN;
    return;
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      role,
      commentsBanned,
      updatedAt: serverTimestamp()
    });
    if (ix >= 0) {
      allRows[ix].role = role;
      allRows[ix].commentsBanned = commentsBanned;
    }
    /** Независимые записи: если одна упадёт по правилам, остальные всё равно отправятся. */
    async function notifyQuiet(payload) {
      try {
        await sendUserNotification(uid, payload);
      } catch (nErr) {
        console.warn('sendUserNotification', uid, payload?.type, nErr);
      }
    }

    if (prevRole !== role) {
      if (role === ROLE_ADMIN) {
        await syncAdminKv(uid, true);
        await notifyQuiet({
          type: NTYPE.ROLE_ADMIN_GRANTED,
          title: td('admin.users.notifyAdminGrantedTitle', 'Вам выдан доступ к админ-панели'),
          body: td(
            'admin.users.notifyAdminGrantedBody',
            'Вы можете управлять контентом и модерацией на сайте в разделе «Админ».'
          )
        });
      } else if (prevRole === ROLE_ADMIN) {
        await syncAdminKv(uid, false);
        await notifyQuiet({
          type: NTYPE.ROLE_ADMIN_REVOKED,
          title: td('admin.users.notifyAdminRevokedTitle', 'Права администратора сняты'),
          body: td('admin.users.notifyAdminRevokedBody', 'Доступ к веб-админке для этого аккаунта отключён.')
        });
      }
    }
    if (prevBan !== commentsBanned) {
      if (commentsBanned) {
        await notifyQuiet({
          type: NTYPE.COMMENTS_BANNED,
          title: td('admin.users.notifyCommentsBannedTitle', 'Ограничение отзывов'),
          body: td('admin.users.notifyCommentsBannedBody', 'Вам временно запрещено оставлять отзывы о местах.')
        });
      } else {
        await notifyQuiet({
          type: NTYPE.COMMENTS_UNBANNED,
          title: td('admin.users.notifyCommentsUnbannedTitle', 'Отзывы снова доступны'),
          body: td('admin.users.notifyCommentsUnbannedBody', 'Ограничение на публикацию отзывов снято.')
        });
      }
    }
    showToast(td('admin.users.saved', 'Сохранено'));
  } catch (err) {
    console.error(err);
    showToast(td('admin.users.saveError', 'Ошибка сохранения (проверьте правила Firestore)'), 'error');
  }
}

async function syncAdminKv(uid, makeAdmin) {
  const base = resolveMediaWorkerUrl();
  if (!base) return;
  try {
    const token = await auth.currentUser?.getIdToken?.();
    if (!token) throw new Error('no_token');
    const endpoint = makeAdmin ? '/api/admins/add' : '/api/admins/remove';
    const res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ uid })
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || `kv_sync_failed_${res.status}`);
    }
  } catch (e) {
    console.warn('KV sync failed', uid, makeAdmin, e);
    showToast(td('admin.users.kvSyncWarn', 'Права сохранены, но синхронизация доступа к загрузке моделей не прошла. Проверьте worker/KV.'), 'error');
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return esc(str).replace(/'/g, '&#39;');
}
