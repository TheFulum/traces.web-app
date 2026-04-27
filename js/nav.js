import { auth } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getLang, loadDict, setLang, t, withLang } from './i18n.js';

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
    { href: `${root}catalog.html`,  key: 'nav.catalog' },
    { href: `${root}map.html`,      key: 'nav.map' },
    { href: `${root}chat.html`,     key: 'nav.chat' },
    { href: `${root}feedback.html`, key: 'nav.feedback' },
  ];

  function isActive(href) {
    const clean = href.replace(/^\.\.\//, '').replace(/^\.\//, '');
    return path.endsWith(clean) || (path.endsWith('/') && clean === `${root}index.html`);
  }

  function buildNav(user) {
    const navLinks = links.map(l => ({
      href: withLang(l.href, lang),
      label: dict ? t(l.key, dict) : l.key
    }));

    const authBtn = user
      ? (isAdminPath
          ? `<a href="${root}admin/places.html" class="nav__login nav__admin">${dict ? t('nav.admin', dict) : 'Админ'}</a>`
          : `<a href="${withLang(`${root}profile.html`, lang)}" class="nav__login nav__admin">${dict ? t('nav.profile', dict) : 'Профиль'}</a>`)
      : `<a href="${withLang(isAdminPath ? `${root}admin/login.html` : `${root}auth.html`, lang)}" class="nav__login">${dict ? t('nav.login', dict) : 'Войти'}</a>`;

    const drawerAuthBtn = user
      ? (isAdminPath
          ? `<a href="${root}admin/places.html" class="nav__drawer__login nav__drawer__admin">${dict ? t('nav.admin', dict) : 'Админ'}</a>`
          : `<a href="${withLang(`${root}profile.html`, lang)}" class="nav__drawer__login nav__drawer__admin">${dict ? t('nav.profile', dict) : 'Профиль'}</a>`)
      : `<a href="${withLang(isAdminPath ? `${root}admin/login.html` : `${root}auth.html`, lang)}" class="nav__drawer__login">${dict ? t('nav.login', dict) : 'Войти'}</a>`;

    const langSwitch = `
      <button class="nav__login" id="lang-btn" style="padding:7px 12px">
        ${lang.toUpperCase()}
      </button>
    `;

    navEl.innerHTML = `
      <div class="nav__inner">
        <a href="${withLang(`${root}index.html`, lang)}" class="nav__logo">
          <!-- LOGO: замените src на путь к вашему логотипу -->
          <img class="nav__logo-img" src="${root}img/logo.png" alt="Лого"
               onerror="this.style.display='none'" />
          Следы прошлого
        </a>

        <div class="nav__right">
          <ul class="nav__links">
            ${navLinks.map(l => `
              <li><a href="${l.href}"${isActive(l.href) ? ' class="active"' : ''}>${l.label}</a></li>
            `).join('')}
          </ul>
          ${langSwitch}
          ${authBtn}
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

    // language switch
    const next = lang === 'ru' ? 'en' : 'ru';
    document.getElementById('lang-btn')?.addEventListener('click', () => setLang(next));
    document.getElementById('lang-btn-drawer')?.addEventListener('click', (e) => {
      e.preventDefault();
      setLang(next);
    });
  }

  // render immediately with no user, then update when auth resolves
  buildNav(null);
  onAuthStateChanged(auth, user => buildNav(user));
}
