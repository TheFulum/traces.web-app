import { getLang, loadDict, t, applyDict } from '../../../js/shared/i18n.js';

// href → i18n key mapping for sidebar links
const NAV_KEYS = {
  'dashboard.html': 'admin.nav.dashboard',
  'places.html':    'admin.nav.places',
  'home.html':      'admin.nav.home',
  'pages.html':     'admin.nav.pages',
  'media.html':     'admin.nav.media',
  'feedback.html':  'admin.nav.feedback',
  'reviews.html':   'admin.nav.reviews',
  'login.html':     'admin.nav.login',
};

async function applyAdminI18n() {
  try {
    const lang = getLang();
    const dict = await loadDict(lang);

    // Sidebar section label
    document.querySelectorAll('.admin-sidebar__label').forEach(el => {
      el.textContent = t('admin.nav.label', dict);
    });

    // Sidebar nav links — replace text node keeping SVG intact
    document.querySelectorAll('.admin-nav a').forEach(a => {
      const href = (a.getAttribute('href') || '').replace(/^.*\//, '');
      const key = NAV_KEYS[href];
      if (!key) return;
      const label = t(key, dict);
      if (!label || label === key) return;
      a.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = '\n          ' + label + '\n        ';
        }
      });
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.textContent = t('admin.nav.logout', dict);

    // Apply translations to all data-i18n elements on the page
    applyDict(dict);

    // Admin breadcrumb prefix and page name
    document.querySelectorAll('.admin-breadcrumb').forEach(el => {
      const href = window.location.pathname.replace(/^.*\//, '');
      const key = NAV_KEYS[href];
      
      const text = el.textContent.trim();
      const parts = text.split('/');
      if (parts.length >= 1) {
        parts[0] = t('admin.breadcrumb', dict) + ' ';
        if (parts.length >= 2 && key) {
          parts[1] = ' ' + t(key, dict);
        }
        el.textContent = parts.join('/');
      }
    });
  } catch {
    // silently ignore i18n errors — UI stays in Russian fallback
  }
}

function initAdminMobileNav() {
  const layout = document.querySelector('.admin-layout');
  const sidebar = document.querySelector('.admin-sidebar');
  const topbar = document.querySelector('.admin-topbar');
  if (!layout || !sidebar || !topbar) return;
  if (layout.dataset.adminShellReady === '1') return;
  layout.dataset.adminShellReady = '1';

  let backdrop = document.querySelector('.admin-mobile-nav-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'admin-mobile-nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
  }

  const existing = topbar.querySelector('.admin-mobile-nav-toggle');
  const btn = existing || document.createElement('button');
  if (!existing) {
    btn.type = 'button';
    btn.className = 'admin-mobile-nav-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'admin-sidebar');
    btn.setAttribute('aria-label', 'Открыть или закрыть меню разделов');
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
      </svg>
      <span>Меню</span>`;
    topbar.appendChild(btn);
  }

  sidebar.id = sidebar.id || 'admin-sidebar';

  function open() {
    layout.classList.add('admin-mobile-nav-open');
    btn.setAttribute('aria-expanded', 'true');
    backdrop.classList.add('is-visible');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    layout.classList.remove('admin-mobile-nav-open');
    btn.setAttribute('aria-expanded', 'false');
    backdrop.classList.remove('is-visible');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function toggle() {
    if (layout.classList.contains('admin-mobile-nav-open')) close();
    else open();
  }

  btn.addEventListener('click', toggle);
  backdrop.addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 700) close();
  });

  sidebar.querySelectorAll('.admin-nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 700) close();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAdminMobileNav();
    applyAdminI18n();
  });
} else {
  initAdminMobileNav();
  applyAdminI18n();
}
