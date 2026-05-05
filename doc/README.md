# Cloudflare Worker Chat Config

Этот документ формально фиксирует базовый конфиг proxy Worker для чат-гида (`POST /api/chat`) по ТЗ §18.

## Назначение

- Клиенты (`web` и `android`) вызывают только Worker endpoint.
- Ключ OpenRouter хранится только в Worker secrets.
- Worker делает proxy-вызов к OpenRouter и возвращает унифицированный JSON.

## Endpoint

- Метод: `POST`
- Путь: `/api/chat`
- Request body: `{ "messages": [{ "role": "user|assistant|system", "content": "..." }, ...] }`
- Response body (успех): `{ "content": "..." }` или `{ "content": "...", "route": { "placeIds": [...], "filters": {...} } }`

## Обязательные ограничения

### 1) Rate limit

- Окно: `60s`
- Ключ лимита: `ip` + `uid` (если `uid` передан; иначе только `ip`)
- Значение по умолчанию: не более `20` запросов в минуту на ключ
- При превышении: HTTP `429` + JSON `{ "error": "Rate limit exceeded" }`

### 2) Allowlist моделей

Worker принимает `model` только из явно разрешенного списка.

Базовый allowlist:

- `openai/gpt-4.1-mini`
- `anthropic/claude-3.5-haiku`
- `google/gemini-2.0-flash-001`

Если модель не в allowlist:

- HTTP `400` + JSON `{ "error": "Model is not allowed" }`
- Фолбэк на дефолтную модель допускается только при явно включенном флаге в Worker-конфиге.

### 3) Лимиты payload

- Максимум сообщений в запросе: `20`
- Максимальная длина одного сообщения: `2000` символов
- Максимальный суммарный размер `messages[*].content`: `12000` символов
- Верхняя граница `max_tokens` на upstream-запрос: `800`

При нарушении лимитов: HTTP `400` + JSON `{ "error": "Input is too large" }`.

## Конфиг Worker (рекомендуемые переменные)

- `OPENROUTER_API_KEY` (secret, обязательный)
- `CHAT_DEFAULT_MODEL` (например, `openai/gpt-4.1-mini`)
- `CHAT_ALLOWED_MODELS` (строка через запятую; источник allowlist)
- `CHAT_RATE_LIMIT_RPM` (по умолчанию `20`)
- `CHAT_MAX_MESSAGES` (по умолчанию `20`)
- `CHAT_MAX_CHARS_PER_MESSAGE` (по умолчанию `2000`)
- `CHAT_MAX_CHARS_TOTAL` (по умолчанию `12000`)
- `CHAT_MAX_TOKENS` (по умолчанию `800`)

## Минимальные требования к логированию

- Логировать только технические метрики и статусы (`model`, latency, status code, limit hit).
- Не логировать полный пользовательский prompt/ответ в открытом виде.

## Статус

Пункт `tz/remaining-web-tasks.md` §13 про "формально описать/зафиксировать конфиг Worker и лимиты" закрывается этим документом.
