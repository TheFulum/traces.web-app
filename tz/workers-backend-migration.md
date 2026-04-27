# ТЗ: перенос web-части на Cloudflare Workers (BFF)

## Цель

Сделать для web нормальный backend-слой (BFF), не трогая текущую мобильную часть на Firebase.

## Что остаётся как есть

- Android (`D:/data/source/android/traces`) продолжает работать напрямую с Firebase.
- Firestore и Firebase Auth остаются источником данных/пользователей.

## Что меняем только для web

- Web больше не ходит напрямую в Firestore для ключевых сценариев.
- Все web-запросы идут через API на Cloudflare Workers.
- Worker валидирует Firebase ID token и выполняет операции от имени backend.

## Принцип внедрения (важно)

- Сначала доводим текущий web до функционально стабильного состояния (feature complete + фиксы UX/багов).
- После этого фиксируем UI/UX и контракты данных (**feature freeze** для web на время миграции).
- Перенос на Workers выполняем как инфраструктурный этап без редизайна и без изменения пользовательских сценариев.
- Android в этом процессе не трогаем.

## Архитектура

- `web (static)` -> `Cloudflare Worker API` -> `Firebase Admin SDK` -> `Firestore/Auth`.
- Для публичных GET включается edge cache.
- Для write-эндпоинтов включается rate limit и валидация payload.

## API v1 (минимум)

### Public read
- `GET /api/v1/home`
- `GET /api/v1/places?city=&tags=&has3d=&hasphotos=&dateFrom=&dateTo=&sort=&page=&limit=`
- `GET /api/v1/places/:id`
- `GET /api/v1/reviews?placeId=&page=&limit=`

### Auth-required write (web)
- `POST /api/v1/reviews`
- `POST /api/v1/feedback`

### Service
- `GET /api/v1/health`

## Контракты данных

- Ответы API не возвращают приватные поля.
- Для отзывов:
  - `uid`, `placeId`, `rating`, `comment`, `createdAt`
  - публично: `authorName`, `rating`, `comment`, `createdAt`
- Для `places` обязательно возвращать:
  - `id`, `name`, `description`, `location`, `tags`, `createdOn`, `hasPhotos`, `has3D`, `photos[0..n]`, `modelUrl/sketchfabUrl`

## Безопасность

- Проверка Firebase ID token в `Authorization: Bearer <token>`.
- CORS только для доменов проекта.
- Rate limit на write (reviews/feedback).
- Санитайз и лимиты:
  - comment <= 2000
  - rating: 1..5
  - name <= 120

## Производительность

- Кэш:
  - `home`: 5-15 мин
  - `places list`: 30-120 сек
  - `place details`: 60-300 сек
- Пагинация только курсорами/страницами, без выборки всех документов.
- Индексы Firestore подготовить заранее под реальные запросы API.

## План внедрения

### Этап 0 (подготовка и freeze)
1. Закрыть критичные web-баги и согласовать финальный scope пользовательских фич.
2. Зафиксировать API-контракты (`places`, `place`, `reviews`, `feedback`) и payload-ограничения.
3. Ввести правило: во время миграции backend не меняем визуал/UX (кроме явных багов).

### Этап 1 (инфра)
1. Создать Worker проект + окружения `dev/prod`.
2. Подключить секреты Firebase service account.
3. Поднять `health` + базовый `home`.

### Этап 2 (read API)
1. Реализовать `places`, `place by id`, `reviews`.
2. Подключить кэш и базовый мониторинг ошибок.
3. Переключить `web` чтение на `/api/v1/*`.

### Этап 3 (write API)
1. Реализовать `POST /reviews` и `POST /feedback`.
2. Включить token verify + rate limit.
3. Переключить формы web на backend write.

### Этап 4 (стабилизация)
1. Отключить/ограничить прямые web-write в Firestore rules.
2. Нагрузочный smoke test.
3. Финальный rollback-план и релиз.

## Критерии готовности (DoD)

- Web полностью работает через Worker API без прямых read/write в Firestore.
- Android продолжает работать без изменений.
- Отзывы/feedback защищены токеном и rate limit.
- Время ответа публичных GET стабильно и предсказуемо.
- Визуальный и пользовательский паритет web сохранён (no-regression по UI/UX).
