# Lite и Standard

Серверный `AI_PAID_REQUESTS_ENABLED=false` запрещает новые платные текстовые запросы и начало звонков в Lite. Уже установленные звонки он не завершает. Общая дневная/месячная квота реализована только в Standard с D1; Lite остаётся без базы. [Границы защиты и настройка квот](AI-QUOTAS.md).

Новая сборка по умолчанию работает как Lite: Worker + Static Assets, без D1, R2, KV и миграций. В Lite нет хранения аккаунтов, заказов или диалогов. Rate Limiting binding ограничивает обращения к AI без прикладной базы данных.

| Возможность | Lite | Standard |
| --- | --- | --- |
| Главная с чатом, темы, фон | Да | Да |
| Каталог и публичные страницы | Из файла | D1/CMS |
| AI OpenAI/xAI | Серверные env/secrets | Админка + secrets |
| История | Только память вкладки | D1 |
| MCP | Публичное чтение | Авторизация, scopes, чтение/запись |
| Кабинет, админка, заказы, оплата, запись | Отключены | D1 |
| Файлы | Временные вложения в чат, без хранения | Пользовательские загрузки в R2 |
| Аудиозвонок | OpenAI WebRTC, отдельное включение | Пока не интегрирован |

## Настройка Lite

Файлы и голос: [настройка, ограничения и безопасность](LITE_MEDIA.md).

Редактируйте `site.config.json`: name, description, theme (northstar/editorial/ocean), backgroundImage (локальный путь или HTTPS), products и pages. Изменения публикуются вместе со следующей сборкой. Фон можно положить в `public/background.jpg` и указать `/background.jpg`. Все поля этого файла публичные; сборка отклоняет неизвестные поля, включая секреты и aiInstructions.

Пример элемента products:

```json
{ "id": "consultation", "slug": "consultation", "title": "Консультация", "kind": "service", "shortDescription": "Описание услуги", "description": "Условия оказания услуги", "price": 5000, "currency": "USD", "active": true }
```

Цена в сотых долях валюты, 5000 = 50.00. Каталог в Lite информационный: покупка и платёжная ссылка не создаются. Скрытые active:false товары не публикуются. Pages: slug вида `/about`, title, description, text (обычный текст). HTML не исполняется. Конфигурация ограничена 200 товарами и 200 страницами; страницы с адресами системных разделов отклоняются при сборке.

```bash
npm ci
npm run build
npm run start
npm run test:lite
npm run db:preflight -- --config deployment/lite.example.json --production
npx wrangler deploy --config deployment/lite.example.json
```

Для собственного аккаунта скопируйте deployment/lite.example.json, укажите account_id и уникальное имя Worker. D1/R2 создавать не требуется. OraVera использует deployment/oravera.lite.json.

Если аккаунт новый, сначала зарегистрируйте поддомен workers.dev в Cloudflare Workers onboarding. Без него Wrangler может загрузить код и assets, но завершить публикацию с ошибкой: это ещё не работающий публичный сайт. После регистрации повторите deploy и проверьте `/api/health` (mode: lite, storage: none), главную и `/api/mcp` по HTTPS.

## Консультант

По умолчанию `LITE_AI_ENABLED=false`: демонстрация без обращений к провайдеру. Для живых ответов задайте `OPENAI_API_KEY` либо `XAI_API_KEY` через Worker secrets, затем `LITE_AI_ENABLED=true`, `LITE_AI_PROVIDER=openai|xai`, `LITE_AI_MODEL`, `LITE_AI_REASONING=auto`, `LITE_AI_MAX_TOKENS=1024`. Инструкции бизнеса задаются серверным `LITE_SYSTEM_PROMPT`. Используется существующий адаптер моделей; ключи и системный промпт не выдаются API настроек.

При включённом AI обязателен LITE_RATE_LIMITER. Пример ограничивает 20 запросов в минуту на IP в пределах точки Cloudflare; это не глобальный денежный бюджет. Общий IP может объединять нескольких посетителей. Выберите свой namespace_id для каждой независимой установки. Документация: [Cloudflare Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

Текст разговора передаётся провайдеру для ответа, но движок не сохраняет его. Перезагрузка/закрытие страницы очищает историю. Вкладка отправляет ограниченный контекст последних сообщений; сервер принимает только роли user/assistant и ограничивает запрос 24 КБ. При отказе провайдера возвращается ошибка, а не demo-ответ. Поведение хранения на стороне провайдера определяется его политиками.

## MCP и Markdown

`POST /api/mcp` доступен без аккаунта только для публичного чтения: initialize, ping, tools/list, tools/call, notifications/initialized; tools: list_products, get_page_markdown. Версия 2025-03-26, JSON по HTTP, без OAuth/SSE. Запись, заказы, выдача токенов и платежи недоступны независимо от переданного Bearer/cookie. WebMCP регистрирует только чтение.

`/api/openapi` описывает только Lite endpoints. `/api/content?slug=/about`, `/llms.txt`, `/llms-full.txt` и `Accept: text/markdown` на публичных страницах дают текст из одного источника с HTML. Личные маршруты переадресуют на главную, отключённые API возвращают 404/module_disabled.

## Переход на Standard

Для развёрнутого Worker задайте ENGINE_MODE=standard, добавьте binding DB, примените миграции к новой БД и настройте INITIAL_ADMIN_TOKEN. Для загрузок добавьте FILES. Используйте deployment/worker.example.json как основу полного конфига. Не применяйте все миграции заново к существующей схеме.

Локально в PowerShell:

```powershell
$env:ENGINE_MODE='standard'
npm run build
npm run start
```

Это создаст прежние локальные bindings и подключит существующий `.wrangler-state`. Для возврата выполните сборку с ENGINE_MODE=lite. Новая сборка выбирает инфраструктуру через переменную процесса; runtime ENGINE_MODE задаётся vars/secrets Worker. Старые деплои без ENGINE_MODE, но с DB, продолжают работать как Standard. При явном ENGINE_MODE=lite подключённая DB не читается. Данные не удаляются, автоматически в конфиг не переносятся.

Автообновление через админку и D1-очередь доступно в Standard. Lite обновляется обычной сборкой и деплоем из репозитория; его контент и дизайн изменяет владелец или его coding-агент в исходниках.

## Заявки без базы

Lite поддерживает отключаемую форму «Оставить заявку» в чате: явное согласие, закрытый webhook получателя, подтверждение номера и безопасное поведение при неизвестном результате. По умолчанию выключена; получатель обязан поддерживать устойчивую дедупликацию. [Подключение, чеклист и ограничения](LITE_LEADS.md).

## Стабильность перед запуском

`npm run test:lite:stability` выполняет три чистых последовательных прогона API и браузера с остановкой на первом сбое. Включает проверку чата после отказов по одному HTTP-соединению без переподключений. [Исправленный сбой, команды и границы проверки](LITE_RELIABILITY.md).
