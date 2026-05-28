import { initNav } from '../../../js/shared/nav.js';
import { auth, db } from '../../../js/shared/firebase-init.js';
import { resolveMediaWorkerUrl } from '../../../js/shared/media-worker-url.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast } from '../../../js/shared/utils.js';
import { getLang, loadDict, t } from '../../../js/shared/i18n.js';
import { bindAdminLogout, gateAdmin } from '../shared/admin-guard.js';

initNav('../../');
bindAdminLogout();

const lang = getLang();
let dict = null;

try {
  dict = await loadDict(lang);
} catch { /* stay with null */ }

const td = (key, fallback) => (dict ? t(key, dict) : null) || fallback;

gateAdmin(async () => {

await initSiteMediaIntegrations();

// ── fetch all data ────────────────────────────────────────────────────────

let places = [], reviews = [], feedbackDocs = [];

try {
  const [placesSnap, reviewsSnap, feedbackSnap] = await Promise.all([
    getDocs(collection(db, 'places')),
    getDocs(collection(db, 'placeReviews')),
    getDocs(collection(db, 'feedback')),
  ]);
  places = placesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  feedbackDocs = feedbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
} catch (err) {
  console.error(err);
  showToast('Ошибка загрузки данных', 'error');
}

// ── KPI ───────────────────────────────────────────────────────────────────

const pending = reviews.filter(r => r.status === 'pending').length;
const approved = reviews.filter(r => r.status === 'approved').length;
const rejected = reviews.filter(r => r.status === 'rejected').length;

setKpi('kpi-places', places.length, td('admin.dashboard.kpiPlaces', 'Места'));
setKpi('kpi-reviews', reviews.length, td('admin.dashboard.kpiReviews', 'Отзывы'));
setKpi('kpi-pending', pending, td('admin.dashboard.kpiPending', 'На модерации'), pending > 0 ? 'var(--c-warn, #d97706)' : null);
setKpi('kpi-feedback', feedbackDocs.length, td('admin.dashboard.kpiFeedback', 'Обратная связь'));

function setKpi(id, value, label, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = String(value);
  if (color) el.style.color = color;
  const labelEl = el.previousElementSibling;
  if (labelEl && label) labelEl.textContent = label;
  const subEl = el.nextElementSibling;
  if (subEl && id === 'kpi-reviews' && reviews.length > 0) {
    subEl.textContent = `${approved} одобрено · ${rejected} отклонено`;
  }
}

// ── section titles i18n ────────────────────────────────────────────────────

document.querySelectorAll('.dash-section-title').forEach((el, i) => {
  if (i === 0) el.textContent = td('admin.dashboard.analyticsTitle', 'Аналитика');
  if (i === 1) el.textContent = td('admin.dashboard.recentActivity', 'Последняя активность');
});

document.querySelectorAll('.dash-card__title').forEach((el, i) => {
  const titles = [
    td('admin.dashboard.reviewsByStatus', 'Отзывы о местах: статусы модерации'),
    td('admin.dashboard.topTags', 'Топ тегов'),
    td('admin.dashboard.feedbackRatings', 'Распределение оценок обратной связи'),
    td('admin.dashboard.placesCompleteness', 'Полнота данных мест'),
    td('admin.dashboard.placesByYear', 'Места по году'),
    td('admin.dashboard.recentPlaces', 'Последние места'),
    td('admin.dashboard.recentReviews', 'Последние отзывы'),
  ];
  if (titles[i]) el.textContent = titles[i];
});

// ── Chart: review status (doughnut) ───────────────────────────────────────

const reviewCtx = document.getElementById('chart-review-status');
if (reviewCtx) {
  if (!reviews.length) {
    reviewCtx.parentElement.innerHTML = `<p style="color:var(--c-text-muted);font-size:.875rem">${td('admin.dashboard.noData', 'Нет данных')}</p>`;
  } else {
    new Chart(reviewCtx, {
      type: 'doughnut',
      data: {
        labels: [
          td('admin.dashboard.statusApproved', 'Одобрены'),
          td('admin.dashboard.statusPending', 'На модерации'),
          td('admin.dashboard.statusRejected', 'Отклонены'),
        ],
        datasets: [{
          data: [approved, pending, rejected],
          backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
          borderColor: ['#fff', '#fff', '#fff'],
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              font: { size: 12, family: 'var(--font-body, sans-serif)' },
              color: '#6b7280',
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / reviews.length * 100)}%)`,
            },
          },
        },
      },
    });
  }
}

// ── Chart: top tags (horizontal bar) ──────────────────────────────────────

const tagsCtx = document.getElementById('chart-tags');
if (tagsCtx) {
  const tagCount = {};
  places.forEach(p => {
    (Array.isArray(p.tags) ? p.tags : []).forEach(tag => {
      if (tag) tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (!sorted.length) {
    tagsCtx.parentElement.innerHTML = `<p style="color:var(--c-text-muted);font-size:.875rem">${td('admin.dashboard.noData', 'Нет данных')}</p>`;
  } else {
    new Chart(tagsCtx, {
      type: 'bar',
      data: {
        labels: sorted.map(([tag]) => tag),
        datasets: [{
          label: td('admin.dashboard.topTags', 'Мест'),
          data: sorted.map(([, count]) => count),
          backgroundColor: 'rgba(139, 107, 61, 0.18)',
          borderColor: 'rgba(139, 107, 61, 0.8)',
          borderWidth: 1.5,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.parsed.x} мест` },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#9ca3af', font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          y: {
            ticks: { color: '#374151', font: { size: 12 } },
            grid: { display: false },
          },
        },
      },
    });
  }
}

// ── Chart: feedback rating distribution ───────────────────────────────────

const feedbackRatingsCtx = document.getElementById('chart-feedback-ratings');
if (feedbackRatingsCtx) {
  const ratingCount = [0, 0, 0, 0, 0];
  feedbackDocs.forEach(f => {
    const r = Math.round(Number(f.rating));
    if (r >= 1 && r <= 5) ratingCount[r - 1]++;
  });
  const total = ratingCount.reduce((s, v) => s + v, 0);
  if (!total) {
    feedbackRatingsCtx.parentElement.innerHTML = `<p style="color:var(--c-text-muted);font-size:.875rem">${td('admin.dashboard.noData', 'Нет данных')}</p>`;
  } else {
    new Chart(feedbackRatingsCtx, {
      type: 'bar',
      data: {
        labels: ['★', '★★', '★★★', '★★★★', '★★★★★'],
        datasets: [{
          data: ratingCount,
          backgroundColor: ['#dc2626', '#f97316', '#eab308', '#84cc16', '#16a34a'],
          borderRadius: 6,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} (${Math.round(ctx.parsed.y / total * 100)}%)` } },
        },
        scales: {
          x: { ticks: { color: '#374151', font: { size: 14 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0, color: '#9ca3af', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
      },
    });
  }
}

// ── Chart: places content completeness ────────────────────────────────────

const placesCompletenessCtx = document.getElementById('chart-places-completeness');
if (placesCompletenessCtx) {
  if (!places.length) {
    placesCompletenessCtx.parentElement.innerHTML = `<p style="color:var(--c-text-muted);font-size:.875rem">${td('admin.dashboard.noData', 'Нет данных')}</p>`;
  } else {
    const withPhotos = places.filter(p => Array.isArray(p.photos) && p.photos.length > 0).length;
    const with3d = places.filter(p => p.modelUrl || p.sketchfabUrl).length;
    new Chart(placesCompletenessCtx, {
      type: 'bar',
      data: {
        labels: [
          td('admin.dashboard.withPhotos', 'С фото'),
          td('admin.dashboard.noPhotos', 'Без фото'),
          td('admin.dashboard.with3d', 'С 3D'),
          td('admin.dashboard.no3d', 'Без 3D'),
        ],
        datasets: [{
          data: [withPhotos, places.length - withPhotos, with3d, places.length - with3d],
          backgroundColor: ['#16a34a', '#e5e7eb', '#8b6b3d', '#e5e7eb'],
          borderRadius: 6,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#374151', font: { size: 12 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0, color: '#9ca3af', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
      },
    });
  }
}

// ── Chart: places by year ─────────────────────────────────────────────────

const placesByYearCtx = document.getElementById('chart-places-by-year');
if (placesByYearCtx) {
  const yearCount = {};
  places.forEach(p => {
    const y = p?.created?.year || (p?.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000).getFullYear() : null);
    if (y) yearCount[y] = (yearCount[y] || 0) + 1;
  });
  const years = Object.keys(yearCount).sort();
  if (!years.length) {
    placesByYearCtx.parentElement.innerHTML = `<p style="color:var(--c-text-muted);font-size:.875rem">${td('admin.dashboard.noData', 'Нет данных')}</p>`;
  } else {
    new Chart(placesByYearCtx, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: td('admin.dashboard.kpiPlaces', 'Места'),
          data: years.map(y => yearCount[y]),
          backgroundColor: 'rgba(139, 107, 61, 0.7)',
          borderColor: 'rgba(139, 107, 61, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#374151', font: { size: 11 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0, color: '#9ca3af', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
      },
    });
  }
}

// ── Recent places ──────────────────────────────────────────────────────────

const recentPlacesEl = document.getElementById('recent-places');
if (recentPlacesEl) {
  const sorted = [...places]
    .sort((a, b) => {
      const at = Number(a?.updatedAt?.seconds ?? a?.createdAt?.seconds ?? 0);
      const bt = Number(b?.updatedAt?.seconds ?? b?.createdAt?.seconds ?? 0);
      return bt - at;
    })
    .slice(0, 6);

  if (!sorted.length) {
    recentPlacesEl.innerHTML = `<div class="dash-recent-empty">${td('admin.dashboard.noData', 'Нет данных')}</div>`;
  } else {
    recentPlacesEl.innerHTML = sorted.map(p => {
      const name = pickName(p, lang);
      const ts = p?.updatedAt ?? p?.createdAt;
      const date = ts?.toDate ? fmtDate(ts.toDate()) : '—';
      return `
        <div class="dash-recent-item">
          <a class="dash-recent-item__name" href="places.html" title="${esc(name)}">${esc(name || p.id)}</a>
          <span class="dash-recent-item__meta">${date}</span>
        </div>`;
    }).join('');
  }
}

// ── Recent reviews ─────────────────────────────────────────────────────────

const recentReviewsEl = document.getElementById('recent-reviews');
if (recentReviewsEl) {
  const sorted = [...reviews]
    .sort((a, b) => {
      const at = Number(a?.createdAt?.seconds ?? 0);
      const bt = Number(b?.createdAt?.seconds ?? 0);
      return bt - at;
    })
    .slice(0, 6);

  if (!sorted.length) {
    recentReviewsEl.innerHTML = `<div class="dash-recent-empty">${td('admin.dashboard.noData', 'Нет данных')}</div>`;
  } else {
    const statusLabel = s => ({
      approved: td('admin.dashboard.statusApproved', 'Одобрен'),
      pending:  td('admin.dashboard.statusPending',  'На модерации'),
      rejected: td('admin.dashboard.statusRejected', 'Отклонён'),
    }[s] || s);

    const statusColor = s => ({
      approved: '#16a34a',
      pending:  '#d97706',
      rejected: '#dc2626',
    }[s] || 'var(--c-text-muted)');

    recentReviewsEl.innerHTML = sorted.map(r => {
      const name = esc(r.name || r.email || '—');
      const placeId = esc(r.placeId || '—');
      const ts = r?.createdAt;
      const date = ts?.toDate ? fmtDate(ts.toDate()) : '—';
      const stars = r.rating ? '★'.repeat(Math.min(5, r.rating)) : '';
      return `
        <div class="dash-recent-item">
          <div>
            <span class="dash-recent-item__name">${name}</span>
            <span class="dash-recent-item__meta" style="margin-left:6px">${stars}</span>
            <br>
            <span class="dash-recent-item__meta">${placeId}</span>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <span style="font-size:.72rem;font-weight:700;color:${statusColor(r.status)}">${statusLabel(r.status)}</span>
            <br>
            <span class="dash-recent-item__meta">${date}</span>
          </div>
        </div>`;
    }).join('');
  }
}

// ── helpers ───────────────────────────────────────────────────────────────

function pickName(p, targetLang) {
  if (p?.i18n?.[targetLang]?.name) return p.i18n[targetLang].name;
  if (p?.i18n?.ru?.name) return p.i18n.ru.name;
  return p?.name || p?.id || '';
}

function fmtDate(date) {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function putFileToSignedUrl(putUrl, file, putHeaders, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', putUrl);
    if (putHeaders && typeof putHeaders === 'object') {
      Object.entries(putHeaders).forEach(([k, v]) => {
        try { xhr.setRequestHeader(String(k), String(v)); } catch {}
      });
    }
    if (contentType) {
      try { xhr.setRequestHeader('Content-Type', contentType); } catch {}
    }
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Ошибка сети при загрузке'));
    xhr.send(file);
  });
}

async function uploadDashboardAppApk(file, onProgress) {
  const base = resolveMediaWorkerUrl().replace(/\/+$/, '');
  const token = await auth.currentUser?.getIdToken?.();
  if (!token) throw new Error('Нет авторизации');

  const signRes = await fetch(`${base}/api/media/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ kind: 'app_apk', filename: file.name || 'app.apk' })
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok) {
    const raw = String(signData?.error || '').trim();
    if (raw === 'Unsupported kind' || raw.includes('Unsupported kind')) {
      throw new Error(
        'Воркер не знает загрузку APK (нет kind «app_apk»). Задеплойте актуальный workers/media-upload (wrangler deploy) и проверьте базовый URL в Интеграциях.'
      );
    }
    throw new Error(raw || `sign: ${signRes.status}`);
  }

  const putUrl = String(signData?.putUrl || '');
  const putHeaders = signData?.putHeaders && typeof signData.putHeaders === 'object' ? signData.putHeaders : {};
  if (!putUrl) throw new Error('Нет putUrl');

  await putFileToSignedUrl(
    putUrl,
    file,
    putHeaders,
    'application/vnd.android.package-archive',
    onProgress
  );
}

async function initSiteMediaIntegrations() {
  const input = document.getElementById('site-media-worker-url');
  const btn = document.getElementById('site-media-worker-save');
  const status = document.getElementById('site-media-worker-status');
  const apkInput = document.getElementById('site-app-apk');
  const apkBtn = document.getElementById('site-app-apk-btn');
  const apkStatus = document.getElementById('site-app-apk-status');
  if (!input || !btn) return;
  try {
    const snap = await getDoc(doc(db, 'config', 'site'));
    if (snap.exists()) input.value = String(snap.data()?.mediaWorkerUrl || '').trim();
  } catch {
    // ignore
  }
  btn.addEventListener('click', async () => {
    const url = input.value.trim();
    if (url && !/^https:\/\/.+/i.test(url)) {
      showToast('Нужен HTTPS URL или оставьте поле пустым', 'error');
      return;
    }
    try {
      await setDoc(doc(db, 'config', 'site'), { mediaWorkerUrl: url }, { merge: true });
      if (url) window.__TRACES_MEDIA_WORKER_URL__ = url.replace(/\/+$/, '');
      else delete window.__TRACES_MEDIA_WORKER_URL__;
      if (status) {
        status.textContent = url
          ? 'Сохранено. Эта вкладка уже использует новый URL.'
          : 'Сохранено. Используется URL по умолчанию из кода.';
      }
      showToast('Сохранено', 'success');
    } catch (err) {
      console.error(err);
      showToast('Не удалось сохранить (проверьте права админа в Firestore)', 'error');
    }
  });

  apkBtn?.addEventListener('click', () => apkInput?.click());
  apkInput?.addEventListener('change', async () => {
    const file = apkInput.files?.[0];
    const clearInput = () => { apkInput.value = ''; };
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.apk')) {
      showToast('Нужен файл .apk', 'error');
      clearInput();
      return;
    }
    const maxBytes = 150 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast('Файл больше 150 МБ', 'error');
      clearInput();
      return;
    }
    if (apkStatus) apkStatus.textContent = 'Загрузка…';
    try {
      await uploadDashboardAppApk(file, (p) => {
        if (apkStatus) apkStatus.textContent = `Загрузка… ${p}%`;
      });
      if (apkStatus) {
        apkStatus.textContent = 'Готово. Скачивание: …/app/traces.apk на домене воркера.';
      }
      showToast('APK обновлён', 'success');
    } catch (err) {
      console.error(err);
      if (apkStatus) apkStatus.textContent = '';
      showToast(String(err?.message || 'Ошибка загрузки APK'), 'error');
    }
    clearInput();
  });
}

}); // gateAdmin
