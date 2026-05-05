# Оставшиеся задачи (только web)

> Краткий чек-лист незакрытых пунктов из `tz/plan.md`. Только веб-версия. API/Cloud Functions (раздел 9) — за рамками этого этапа.

## 1. Модель данных + админка мест (ТЗ §3, §10.1–10.5, §10.7–10.9)

- [x] `js/places.js`: в `sanitize()` гарантированно проставлять `hasPhotos`, `has3D` (см. `sanitize(): hasPhotos/has3D`).
- [x] `js/places.js`: `sanitize()` зеркалит `i18n.ru.{name,description,author,address,openingAddress}` ↔ legacy top-level поля (см. `sanitize(): i18n.ru + legacy name/description/...`).
- [x] `admin/places.html` + `admin/js/places-admin.js`: RU/EN табы для `name`, `description`, `author`, `address`, `openingAddress`, запись в `i18n.{ru,en}` (см. `setFormLang(...)` и сбор `data.i18n` в `save()`).
- [x] Парсинг ручного ввода даты: `DD.MM.YYYY`, `MM.YYYY`, `YYYY` + красная подсветка ошибок (см. `parseManualCreatedDate()` / `applyManualCreatedDate()`).
- [x] Подключить `flatpickr` для режима «полная дата» (см. `if (window.flatpickr) { ... }`).
- [x] В таблицу мест: колонки «дата создания», «языки RU/EN», иконка featured (см. `renderTable()`).
- [ ] Smoke 5–10 записей: видны как раньше, регрессов нет.

## 2. Главная + `config/home` (ТЗ §4, §10.6)

- [x] `js/index.js`: подбирать `heroTitle/heroSubtitle/intro/collections.{title,description}` по текущему `lang` с фолбэком на `ru`/строку (см. `pickLocalized(...)` + `applyHomeConfig()`).
- [x] `admin/home.html` + `admin/js/home-admin.js`: мультиязычная схема `{ru,en}` для всех текстов; `id` (slug) для коллекций; порядок коллекций (см. `state` + `renderCollections()` + `save()`).
- [x] Counters: count-up при появлении в viewport (см. `animateCounter()` + `updateStats()` в `js/index.js`).
- [x] (Опц.) hero appear-on-load + лёгкий параллакс фото (см. `initHeroMotion()` в `js/index.js` + класс `is-ready`).
- [x] Footer: ссылки на API/GitHub (если применимо) — включены через `config/home.links` (`apiEnabled`, `github`) (см. `applyHomeConfig(): footerApi/footerGithub`).

## 3. Каталог `catalog` (ТЗ §5)

- [x] `js/catalog.js`: сортировка `created_asc/desc` — места без `createdOn` всегда в конец (см. `sortPlaces(): hasCreated(...)` + комментарий `missing dates always at end`).
- [x] Поиск: debounce 200 мс (см. `searchDebounce` + `setTimeout(..., 200)`).
- [x] Empty-states: разделить «БД пустая» и «фильтры дали 0» (см. `render(): emptyDbTitle/emptyTitle`).
- [x] Бейдж счётчика фото на карточке (`📷 N`); 3D-бейдж — в правый верхний угол вместе с photo-бейджем (см. `placeCard(): card__badges`).
- [x] Stagger reveal для динамически отрисованных карточек (повторный observe) (см. `observeDynamicReveals()`).
- [x] (Опц.) Пагинация / infinite scroll при росте БД >50 (клиентский шаг 24 + sentinel) (см. `PAGE_SIZE = 24` + `renderSentinel()`).

## 4. Страница места `place` (ТЗ §6)

- [x] Вынести форматтер даты в общий модуль и переиспользовать в `place` и карточках (см. `js/placeDate.js` + использование `formatPlaceDate()` в `js/place.js` и `pickPlaceDateLabel()` в `js/index.js`/`js/catalog.js`).
- [x] Эпоха-бейдж под заголовком, кликабелен → `catalog?...` (см. `renderEpochBadge()` в `js/place.js`).
- [x] Sketchfab `<iframe sandbox="allow-scripts allow-same-origin">` (без `allow-popups`/`allow-top-navigation`) (см. `renderSketchfab(): sandbox="allow-scripts allow-same-origin"`).
- [x] Финальная зачистка runtime-i18n (проверено по ключевым публичным страницам: `index/catalog/place/map/chat/feedback` используют `loadDict/applyDict/t(...)` для runtime-строк).

## 5. Анимации и переходы (ТЗ §7)

- [x] `js/scroll.js`: Lenis + отключение при `prefers-reduced-motion`, `smoothTouch:false` (см. `reduceMotion` guard + `smoothTouch:false`).
- [x] `js/transitions.js`: View Transitions API на same-origin `<a>`, безопасный фолбэк (см. проверки `startViewTransition`, `origin`, `_blank`).
- [x] `js/reveal.js`: гарантированный reveal для async-добавленных карточек (повторный `observe`) (см. `MutationObserver`).
- [x] Hero-intro split/stagger на главной, лёгкий параллакс hero-фото (реализовано “light” вариантом: `is-ready` + параллакс в `initHeroMotion()`, без SplitText).
- [x] Без WebGL вне hero на главной (в кодовой базе нет подключений Three/WebGL; hero работает на CSS/JS).

## 6. i18n web (ТЗ §8)

- [x] `map.html` + `js/map.js`: статика и runtime-строки через словари (см. `loadDict/applyDict/t(...)`).
- [x] `chat.html` + `js/chat.js`: статика и runtime-строки через словари (см. `loadDict/applyDict/t(...)`).
- [x] `pickI18n(place, lang)` использовать в `index/catalog/place` для контента мест с фолбэком на `ru` и legacy top-level (см. `js/i18n.js: pickI18n()` + вызовы).
- [x] SEO: `<html lang>` из JS, `<link rel="alternate" hreflang="...">`, `og:locale` под язык (см. `applyLanguageSeo()` в `js/i18n.js`).
- [x] `applyDict(...)` вызывается с актуальной сигнатурой в ключевых модулях (`feedback`, `index`, `catalog`, `place`, `map`, `chat`) — проверено по коду.

## 7. A11y / SEO / Perf (ТЗ §11)

- [x] `:focus-visible` стили для всех интерактивных элементов (см. `css/style.css` блок `/* ── global a11y focus ── */`).
- [x] ARIA: nav-burger, lightbox, модалки админки (`aria-label`, `aria-expanded`, `aria-modal`) (см. `js/nav.js` + `place.html` lightbox + `admin/places.html` modal).
- [x] Альт-тексты для всех `<img>`; декоративные — `alt=""`/`aria-hidden` (частично: ключевые картинки имеют `alt`, но нужны spot-check по всем страницам/карточкам).
- [x] `preconnect` для `res.cloudinary.com`, `gstatic.com`, `firestore.googleapis.com` в `<head>` ключевых страниц.
- [x] Уникальные `<title>` и `meta description` на всех публичных страницах.
- [x] Open Graph + Twitter Cards на странице места.
- [x] JSON-LD `TouristAttraction` на `place.html`.
- [ ] Адаптив-чек: `320/360/390/430/768/1024/1280` без горизонтального скролла, тач-таргеты ≥44px.
- [x] `prefers-reduced-motion`: отключение Lenis, reveal, параллакса, page transitions.

## 8. За рамками этапа (не делаем сейчас)

- Раздел 9 (Public API): `functions/`, `/api/v1/*`, `api.html`, sitemap-endpoint, OpenAPI — отдельный этап.
- Android-клиент (§2.5, §6A) — параллельный трек, не входит в текущий web-этап.
- Спринт 7 «полировка»: custom cursor, view-transition morph «карточка → hero», 404-дизайн — после закрытия пунктов 1–7 выше.

## 9. Новые требования (добавлено)

- [x] Регистрация и логин пользователей (email/password), плюс восстановление сессии.
- [x] Привязка отправки отзывов к аккаунту пользователя (`uid`, имя автора из профиля).
- [x] Личный кабинет (`profile.html`): изменение имени, email, пароля, базовые данные профиля.
- [x] Дополнительная дизайн-полировка по всем ключевым страницам (hover/focus/motion/spacing) без радикального редизайна.

## 10. WP-like часть 2 (кабинет/админка)

- [x] Админка: модуль «Страницы/инфоблоки» (`admin/pages.html`) с CRUD для `pagesContent`.
- [x] Админка: «Медиа-библиотека» (`admin/media.html`) с загрузкой в Cloudinary и сохранением в `mediaLibrary`.
- [x] Админ-навигация: добавлены пункты «Страницы» и «Медиа» на ключевых страницах.
- [x] Единый admin layout v2: topbar + breadcrumbs + унификация таблиц на всех экранах (проверено: `dashboard/places/home/pages/media/feedback/reviews` на `layout-v2.css`).

## 11. Маршруты (Trip planner) + оптимизация (ТЗ §16)

- [x] `route.html` + `js/route.js`: экран “Мой маршрут” (список точек, удалить, share, ручное изменение порядка up/down).
- [x] `route.html` + `js/route.js`: drag&drop перестановка точек.
- [x] Start/End: “дом” (geo), “вернуться домой”, “закончить на последней точке” + “в отель (geo)”.
- [x] Кнопка “В маршрут” на карточках и на `place.html`.
- [x] Guest mode: хранение маршрутов в `localStorage`.
- [x] Логин: merge local trips → account trips (без дублей) + синхронизация `favorites/history/trip` через `users/{uid}`.
- [x] Оптимизация порядка точек:
  - [x] `optimize=fast`: эвристика (nearest-neighbor + 2-opt).
  - [x] `optimize=api` (опц.): через routing API.
- [x] Построение polyline на карте маршрута + экспорт в навигацию.
- [x] Разбиение маршрута по дням (day1/day2/day3/day4) с оценкой дистанции по дням и отметкой ночёвки между днями.

## 12. Инфраструктура рядом (отели/еда) (ТЗ §17)

- [x] POI поиск по OSM (Overpass) или через backend endpoint (web: Overpass API из `js/route.js`).
- [x] UI: фильтры (тип, радиус), список + показ на карте (список + переход в OSM).
- [x] Привязка к маршруту: “показать рядом с точкой/днём”.

## 13. Чат-гид (OpenRouter через proxy) (ТЗ §18)

- [x] Убрать любые попытки держать ключ OpenRouter в клиенте (web): ключа в web-коде нет, вызов идёт на Worker URL (см. `js/chat.js: WORKER_URL` + `fetch(WORKER_URL)`).
- [x] Proxy endpoint (Cloudflare Worker): `/api/chat` с rate limit, лимитами, allowlist моделей (формальная фиксация конфига: `doc/README.md`).
- [x] Structured output: чат может вернуть `placeId[]` и фильтры, UI “Сохранить как маршрут” (поддержка `data.route` и fallback-парсинг JSON из текста ответа).
