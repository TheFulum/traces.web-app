import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getLang, loadDict, setLang, t, withLang, pickI18n } from './i18n.js';
import { getPlaces } from './places.js';
import {
  fetchUserNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  pruneReadNotifications
} from '../features/notifications-data.js';

let cachedPlaces = null;
let cachedExtraPages = null;

export function initNav(root = '') {
  const navEl = document.querySelector('nav.nav');
  if (!navEl) return;

  const path = window.location.pathname;
  const isAdminPath = path.includes('/admin/');
  const lang = getLang();
  let dict = null;

  // async load dict, then re-render nav labels
  loadDict(lang).then(d => {
    dict = d;
    buildNav(null);
  }).catch(() => {});

  const links = [
    { href: `${root}index.html`,    key: 'nav.home' },
    { href: `${root}pages/catalog.html`,  key: 'nav.catalog' },
    { href: `${root}pages/map.html`,      key: 'nav.map' },
    { href: `${root}pages/route.html`,    key: 'nav.route' },
    { href: `${root}pages/chat.html`,     key: 'nav.chat' },
  ];

  function isActive(href) {
    const pathOnly = String(href || '').split(/[#?]/)[0];
    const clean = pathOnly.replace(/^\.\.\//, '').replace(/^\.\//, '');
    return path.endsWith(clean) || (path.endsWith('/') && clean === `${root}index.html`);
  }

  async function buildNav(user) {
    const navLinks = links.map(l => ({
      href: withLang(l.href, lang),
      label: dict ? t(l.key, dict) : l.key
    }));

    if (!cachedExtraPages) {
      try {
        const snap = await getDocs(collection(db, 'pagesContent'));
        cachedExtraPages = snap.docs
          .map(d => {
            const data = d.data();
            const ruTitle = String(data.title || d.id || '').trim();
            const enTitle = String(data.i18n?.en?.title || '').trim();
            const title = lang === 'en' ? (enTitle || ruTitle) : ruTitle;
            return { slug: d.id, title };
          })
          .filter(p => p.slug && p.title);
        const sortLoc = lang === 'en' ? 'en' : 'ru';
        cachedExtraPages.sort((a, b) => a.title.localeCompare(b.title, sortLoc));
      } catch (err) {
        console.warn('nav extra pages:', err);
        cachedExtraPages = [];
      }
    }

    let notificationItems = [];
    let unreadNotifications = 0;
    if (user) {
      try {
        notificationItems = await fetchUserNotifications(user.uid);
        pruneReadNotifications(notificationItems);
        unreadNotifications = getUnreadNotificationsCount(notificationItems);
      } catch {
        notificationItems = [];
        unreadNotifications = 0;
      }
    }

    const notificationsMenu = user ? `
      <div class="nav__notify" id="nav-notify">
        <button class="nav__login nav__notify-btn" id="nav-notify-btn" aria-label="${dict ? t('nav.notifications', dict) : 'Уведомления'}" aria-expanded="false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          ${unreadNotifications > 0 ? `<span class="nav__notify-badge" id="nav-notify-badge">${unreadNotifications > 99 ? '99+' : unreadNotifications}</span>` : ''}
        </button>
        <div class="nav__notify-pop" id="nav-notify-pop">
          <div class="nav__notify-head">${dict ? t('nav.notifications', dict) : 'Уведомления'}</div>
          <div class="nav__notify-list" id="nav-notify-list">
            ${renderNotificationItems(notificationItems, dict, lang)}
          </div>
          <div class="nav__notify-actions">
            <a href="${withLang(`${root}pages/profile/notifications.html`, lang)}" class="nav__notify-link">${dict ? t('notifications.showAll', dict) : 'Показать все'}</a>
            <button type="button" class="nav__notify-mark" id="nav-notify-mark-read" ${unreadNotifications === 0 ? 'disabled' : ''}>${dict ? t('notifications.markAllRead', dict) : 'Отметить все как прочитанные'}</button>
          </div>
        </div>
      </div>
    ` : '';

    const topAuthControls = user
      ? `<div class="nav__auth-group">
           <a href="${withLang(`${root}pages/profile/index.html`, lang)}" class="nav__login">${dict ? t('nav.profile', dict) : 'Профиль'}</a>
         </div>`
      : `<a href="${withLang(isAdminPath ? `${root}admin/pages/login.html` : `${root}pages/auth.html`, lang)}" class="nav__login">${dict ? t('nav.login', dict) : 'Войти'}</a>`;

    const bottomAdminSlot = user
      ? `<a href="${root}admin/pages/dashboard.html" class="nav__login nav__admin nav__bottom-admin">${dict ? t('nav.admin', dict) : 'Админ'}</a>`
      : '';

    const drawerAuthBtn = user
      ? `<a href="${root}admin/pages/dashboard.html" class="nav__drawer__login nav__drawer__admin">${dict ? t('nav.admin', dict) : 'Админ'}</a>
         <a href="${withLang(`${root}pages/profile/notifications.html`, lang)}" class="nav__drawer__login">${dict ? t('nav.notifications', dict) : 'Уведомления'}</a>
         <a href="${withLang(`${root}pages/profile/index.html`, lang)}" class="nav__drawer__login">${dict ? t('nav.profile', dict) : 'Профиль'}</a>`
      : `<a href="${withLang(isAdminPath ? `${root}admin/pages/login.html` : `${root}pages/auth.html`, lang)}" class="nav__drawer__login">${dict ? t('nav.login', dict) : 'Войти'}</a>`;

    const langSwitch = `
      <button class="nav__login" id="lang-btn" style="padding:7px 12px">
        ${lang.toUpperCase()}
      </button>
    `;

    const searchBlock = !isAdminPath ? `
      <div class="nav__search" id="nav-place-search">
        <svg class="nav__search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="nav-place-search-input" class="nav__search-input" type="text" placeholder="${dict ? t('nav.searchPlaceholder', dict) : 'Поиск мест...'}" />
        <div id="nav-place-search-results" class="nav__search-results"></div>
      </div>
    ` : '';

    navEl.innerHTML = `
      <div class="nav__inner">
        <div class="nav__top">
          <a href="${withLang(`${root}index.html`, lang)}" class="nav__logo">
            <span class="nav__logo-mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </span>
            <span class="nav__logo-text">${dict ? t('common.brand', dict) : 'Traces of the Past'}</span>
          </a>

          <div class="nav__top-center">
            ${searchBlock}
          </div>

          <div class="nav__top-right">
            ${notificationsMenu}
            ${langSwitch}
            ${topAuthControls}
          </div>
        </div>

        <div class="nav__bottom" aria-label="Основная навигация">
          <span class="nav__bottom-balance" aria-hidden="true"></span>
          <ul class="nav__links">
            ${navLinks.map(l => `
              <li><a href="${l.href}"${isActive(l.href) ? ' class="active"' : ''}>${l.label}</a></li>
            `).join('')}
            <li class="nav__dropdown" id="nav-dropdown">
              <button class="nav__dropdown-btn" id="nav-dropdown-btn" aria-expanded="false">
                ${dict ? t('nav.more', dict) : 'Ещё'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="nav__dropdown-menu" id="nav-dropdown-menu">
                <a href="${withLang(`${root}pages/feedback.html`, lang)}">${dict ? t('nav.feedback', dict) : 'Обратная связь'}</a>
                ${cachedExtraPages?.length ? cachedExtraPages.map(p => {
                  const href = withLang(`${root}pages/page.html?slug=${encodeURIComponent(p.slug)}`, lang);
                  return `<a href="${esc(href)}">${esc(p.title)}</a>`;
                }).join('') : ''}
              </div>
            </li>
          </ul>
          <div class="nav__bottom-tail">${bottomAdminSlot}</div>
        </div>

        <button class="nav__burger" id="nav-burger" aria-label="${dict ? t('nav.menu', dict) : 'Меню'}" aria-expanded="false" aria-controls="nav-drawer">
          <span></span><span></span><span></span>
        </button>
      </div>

      <div class="nav__drawer" id="nav-drawer">
        ${navLinks.map(l => `
          <a href="${l.href}"${isActive(l.href) ? ' class="active"' : ''}>${l.label}</a>
        `).join('')}
        <div class="nav__drawer__divider"></div>
        <a href="${withLang(`${root}pages/feedback.html`, lang)}" class="nav__drawer__login" style="text-transform:none;letter-spacing:normal;font-weight:400">${dict ? t('nav.feedback', dict) : 'Обратная связь'}</a>
        ${cachedExtraPages?.length ? cachedExtraPages.map(p => {
          const href = withLang(`${root}pages/page.html?slug=${encodeURIComponent(p.slug)}`, lang);
          return `<a href="${esc(href)}" class="nav__drawer__login" style="text-transform:none;letter-spacing:normal;font-weight:400">${esc(p.title)}</a>`;
        }).join('') : ''}
        <div class="nav__drawer__divider"></div>
        <a href="#" id="lang-btn-drawer" class="nav__drawer__login" style="margin-top:8px">${lang.toUpperCase()}</a>
        ${drawerAuthBtn}
      </div>
    `;

    // burger
    const burger = document.getElementById('nav-burger');
    const drawer = document.getElementById('nav-drawer');

    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      drawer.classList.toggle('open');
      burger.setAttribute('aria-expanded', drawer.classList.contains('open') ? 'true' : 'false');
    });

    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        drawer.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', e => {
      if (!navEl.contains(e.target)) {
        burger.classList.remove('open');
        drawer.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });

    const notifyWrap = document.getElementById('nav-notify');
    const notifyBtn = document.getElementById('nav-notify-btn');
    const notifyPop = document.getElementById('nav-notify-pop');
    const notifyMarkRead = document.getElementById('nav-notify-mark-read');

    notifyBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const opened = notifyPop?.classList.toggle('open');
      notifyBtn.setAttribute('aria-expanded', opened ? 'true' : 'false');
    });

    notifyMarkRead?.addEventListener('click', () => {
      markAllNotificationsRead(notificationItems);
      window.dispatchEvent(new CustomEvent('notifications-updated'));
      buildNav(user);
    });

    document.addEventListener('click', (e) => {
      if (!notifyWrap || !notifyPop || !notifyBtn) return;
      if (!notifyWrap.contains(e.target)) {
        notifyPop.classList.remove('open');
        notifyBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // dropdown pages
    const dropWrap = document.getElementById('nav-dropdown');
    const dropBtn = document.getElementById('nav-dropdown-btn');
    const dropMenu = document.getElementById('nav-dropdown-menu');

    dropBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const opened = dropMenu?.classList.toggle('open');
      dropBtn.setAttribute('aria-expanded', opened ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!dropWrap || !dropMenu || !dropBtn) return;
      if (!dropWrap.contains(e.target)) {
        dropMenu.classList.remove('open');
        dropBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // language switch
    const next = lang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn')?.addEventListener('click', () => setLang(next));
    document.getElementById('lang-btn-drawer')?.addEventListener('click', (e) => {
      e.preventDefault();
      setLang(next);
    });

    initPlaceSearch();
  }

  function initPlaceSearch() {
    const input = document.getElementById('nav-place-search-input');
    const results = document.getElementById('nav-place-search-results');
    if (!input || !results) return;

    const render = (list) => {
      if (!list.length) {
        results.innerHTML = `<div class="nav__search-empty">${dict ? t('nav.searchNoMatches', dict) : 'Ничего не найдено'}</div>`;
        results.classList.add('open');
        return;
      }
      results.innerHTML = list.map((p) => {
        const i18nData = pickI18n(p, lang);
        const name = String(i18nData.name || p.name || '');
        const addr = String(i18nData.address || p.location?.address || '');
        const href = withLang(`${root}pages/place.html?id=${encodeURIComponent(p.id)}`, lang);
        return `
          <a class="nav__search-item" href="${href}">
            <div class="nav__search-item-title">${esc(name || p.id)}</div>
            <div class="nav__search-item-meta">${esc(addr)}</div>
          </a>
        `;
      }).join('');
      results.classList.add('open');
    };

    const ensurePlaces = async () => {
      if (cachedPlaces) return cachedPlaces;
      try {
        cachedPlaces = await getPlaces();
      } catch {
        cachedPlaces = [];
      }
      return cachedPlaces;
    };

    input.addEventListener('focus', async () => {
      const list = (await ensurePlaces()).slice(0, 6);
      if (list.length) render(list);
    });

    input.addEventListener('input', async () => {
      const q = input.value.trim().toLowerCase();
      const places = await ensurePlaces();
      const out = !q
        ? places.slice(0, 6)
        : places.filter((p) => {
            const i18nData = pickI18n(p, lang);
            const hay = `${i18nData.name || p.name || ''} ${i18nData.address || p.location?.address || ''}`.toLowerCase();
            return hay.includes(q);
          }).slice(0, 8);
      render(out);
    });

    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('nav-place-search');
      if (!wrap) return;
      if (!wrap.contains(e.target)) results.classList.remove('open');
    });
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // render immediately with no user, then update when auth resolves
  buildNav(null);
  onAuthStateChanged(auth, user => buildNav(user));
  window.addEventListener('notifications-updated', () => buildNav(auth.currentUser));

  function renderNotificationItems(items, dictLocal, currentLang) {
    if (!items.length) {
      return `<div class="nav__notify-empty">${dictLocal ? t('notifications.empty', dictLocal) : 'Новых уведомлений нет.'}</div>`;
    }
    return items.slice(0, 5).map((item) => {
      const placeId = String(item.placeId || '');
      const isRejected = item.status === 'rejected';
      const href = withLang(`${root}pages/place.html?id=${encodeURIComponent(placeId)}`, currentLang);
      const statusLabel = isRejected
        ? (dictLocal ? t('notifications.rejected', dictLocal) : 'Отклонён')
        : (dictLocal ? t('notifications.pending', dictLocal) : 'На модерации');
      const line = isRejected
        ? (dictLocal ? t('notifications.textRejected', dictLocal) : 'Ваш отзыв отклонён модератором.')
        : (dictLocal ? t('notifications.textPending', dictLocal) : 'Ваш отзыв ожидает модерацию.');
      return `
        <a class="nav__notify-item" href="${href}">
          <span class="nav__notify-item-title">${esc(placeId || 'place')}</span>
          <span class="nav__notify-item-meta">${esc(statusLabel)} · ${esc(line)}</span>
        </a>
      `;
    }).join('');
  }
}
