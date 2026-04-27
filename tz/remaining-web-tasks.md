# Оставшиеся задачи (только web)

> Краткий чек-лист незакрытых пунктов из `tz/plan.md`. Только веб-версия. API/Cloud Functions (раздел 9) — за рамками этого этапа.

## 1. Модель данных + админка мест (ТЗ §3, §10.1–10.5, §10.7–10.9)

- [x] `js/places.js`: в `sanitize()` гарантированно проставлять `hasPhotos`, `has3D`.
- [x] `js/places.js`: `sanitize()` зеркалит `i18n.ru.{name,description,author,address,openingAddress}` ↔ legacy top-level поля.
- [x] `admin/places.html` + `admin/js/places-admin.js`: RU/EN табы для `name`, `description`, `author`, `address`, `openingAddress`, запись в `i18n.{ru,en}`.
- [x] Парсинг ручного ввода даты: `DD.MM.YYYY`, `MM.YYYY`, `YYYY` + красная подсветка ошибок.
- [x] Подключить `flatpickr` для режима «полная дата».
- [x] В таблицу мест: колонки «дата создания», «языки RU/EN», иконка featured.
- [ ] Smoke 5–10 записей: видны как раньше, регрессов нет.

## 2. Главная + `config/home` (ТЗ §4, §10.6)

- [x] `js/index.js`: подбирать `heroTitle/heroSubtitle/intro/collections.{title,description}` по текущему `lang` с фолбэком на `ru`/строку.
- [x] `admin/home.html` + `admin/js/home-admin.js`: мультиязычная схема `{ru,en}` для всех текстов; `id` (slug) для коллекций; порядок коллекций.
- [x] Counters: count-up при появлении в viewport.
- [x] (Опц.) hero appear-on-load + лёгкий параллакс фото.
- [x] Footer: ссылки на API/GitHub (если применимо) — включены через `config/home.links` (`apiEnabled`, `github`).

## 3. Каталог `catalog` (ТЗ §5)

- [x] `js/catalog.js`: сортировка `created_asc/desc` — места без `createdOn` всегда в конец.
- [x] Поиск: debounce 200 мс.
- [x] Empty-states: разделить «БД пустая» и «фильтры дали 0».
- [x] Бейдж счётчика фото на карточке (`📷 N`); 3D-бейдж — в правый верхний угол вместе с photo-бейджем.
- [x] Stagger reveal для динамически отрисованных карточек (повторный observe).
- [x] (Опц.) Пагинация / infinite scroll при росте БД >50 (клиентский шаг 24 + sentinel).

## 4. Страница места `place` (ТЗ §6)

- [x] Вынести форматтер даты в общий модуль (например, `js/placeDate.js` / `js/i18n-date.js`) и переиспользовать в `place` и карточках.
- [x] Эпоха-бейдж под заголовком, кликабелен → `catalog?...`.
- [x] Sketchfab `<iframe sandbox="allow-scripts allow-same-origin">` (без `allow-popups`/`allow-top-navigation`).
- [x] Финальная зачистка runtime-i18n (если что-то осталось вне словаря).

## 5. Анимации и переходы (ТЗ §7)

- [x] `js/scroll.js`: Lenis + отключение при `prefers-reduced-motion`, `smoothTouch:false`.
- [x] `js/transitions.js`: View Transitions API на same-origin `<a>`, безопасный фолбэк.
- [x] `js/reveal.js`: гарантированный reveal для async-добавленных карточек (повторный `observe`).
- [x] Hero-intro split/stagger на главной, лёгкий параллакс hero-фото.
- [x] Без WebGL вне hero на главной.

## 6. i18n web (ТЗ §8)

- [x] `map.html` + `js/map.js`: статика и runtime-строки через словари.
- [x] `chat.html` + `js/chat.js`: статика и runtime-строки через словари.
- [x] `pickI18n(place, lang)` использовать в `index/catalog/place` для контента мест с фолбэком на `ru` и legacy top-level.
- [x] SEO: `<html lang>` из JS, `<link rel="alternate" hreflang="...">`, `og:locale` под язык.
- [x] Убедиться, что `applyDict(...)` вызывается с актуальной сигнатурой во всех модулях (`feedback`, `index`, `catalog`, `place`, `map`, `chat`).

## 7. A11y / SEO / Perf (ТЗ §11)

- [x] `:focus-visible` стили для всех интерактивных элементов.
- [x] ARIA: nav-burger, lightbox, модалки админки (`aria-label`, `aria-expanded`, `aria-modal`).
- [x] Альт-тексты для всех `<img>`; декоративные — `alt=""`/`aria-hidden`.
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
