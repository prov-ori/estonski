# Eesti keel B1 — тренажёр для подготовки к экзамену

Неофициальный статический тренажёр к экзамену «eesti keel teise keelena» (9 класс, B1). Чистые HTML/CSS/JS, без бэкенда, без CDN и внешних шрифтов, без аккаунтов и аналитики. Прогресс — только в `localStorage`. Записи голоса — только в памяти вкладки.

> Неофициальный тренажёр. Не связан с HARNO и министерством. Задания составлены автором.

## Дерево файлов

```
index.html              каркас страницы
css/style.css           стили (mobile-first, светлая и тёмная тема, контраст AA)
js/
  app.js                роутер (#/раздел/аргумент), меню
  util.js               h(), таймер, загрузка JSON, наследование topic/level/status
  store.js              localStorage (try/catch, запасной режим в памяти)
  question.js           единый рендер вопросов: choice | tf | input | match
  widgets.js            панель букв õäöü, таймер, запись голоса, чек-лист
  speech.js             Web Speech API (et-EE) для аудирования
  views/                home, about, diagnostic, grammar, vocab, reading,
                        listening, writing, speaking, mock, progress
config/
  exam-format.json      ВСЕ «фактические» числа формата экзамена (verified: false)
  topics.json           справочник тем + памятки по грамматике
content/                весь контент (код его только читает)
  grammar.json  diagnostic.json  vocab.json  reading.json  listening.json
  writing.json  speaking.json    mock-exam.json
validate.js             проверка JSON
tools/                  smoke.js (тест в браузере), contrast.js, list-draft.js
CONTENT_TODO.md         план наполнения
DRAFT_REVIEW.md         все эстонские предложения со статусом draft (генерируется)
```

## Запуск локально

Нужен любой статический сервер (из `file://` браузер не даёт загрузить JSON):

```bash
python3 -m http.server 8000
```

Откройте http://localhost:8000.

## Публикация на GitHub Pages

1. Закоммитьте и отправьте файлы в репозиторий (корень репозитория = корень сайта; файл `.nojekyll` уже есть).
2. На GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, ветка `main` (или та, где лежит сайт), папка `/ (root)`, **Save**.
3. Через 1–2 минуты сайт будет по адресу `https://<пользователь>.github.io/<репозиторий>/`.

Все пути в проекте относительные, поэтому подпапка репозитория в адресе ничего не ломает.

## Как добавить задание

Правка только в `content/*.json`, код менять не нужно. После правки:

```bash
node validate.js
```

**Обязательные поля каждого элемента:** `id` (уникальный во всех файлах), `topic` (из `config/topics.json`), `level` (`A2` | `B1` | `B2`), `status` (`draft` | `reviewed`), `explanation_ru`. Вложенные элементы (вопросы внутри текста) наследуют `topic`, `level`, `status` от родителя.

Новые эстонские тексты добавляйте со `status: "draft"`; после проверки носителем или учителем меняйте на `reviewed`.

### Вопрос (грамматика, диагностика, чтение, аудирование, пробник)

```json
{"id":"g-cases-08","topic":"cases","level":"B1","status":"draft","type":"choice",
 "prompt_et":"Ma ootan ___.","hint":"(buss)","ru":"Я жду автобус.",
 "options":["buss","bussi","bussile","bussis"],"answer":1,
 "explanation_ru":"Ootama требует партитива: bussi."}
```

| `type` | поля ответа |
|---|---|
| `choice` | `options` (минимум 3, без повторов), `answer` — индекс **одного** верного варианта |
| `tf` | `answer: true/false` (внутри текста) |
| `input` | `answer` — одна строка (регистр и пробелы по краям не важны; `õ ä ö ü` важны) |
| `match` | `items:[{left, answer:индекс}]` и `options` (лучше с лишним вариантом; один вариант — одна пара) |

Опционально: `options_lang: "ru"` для русских вариантов, `prompt_ru` — пояснение к заданию, `ru` — перевод предложения.

### Другие файлы

- **Грамматика** — добавьте вопрос в `content/grammar.json → items`.
- **Словарь** — карточка `{id, topic, level, status, et, forms, ru, example_et, example_ru, explanation_ru}` в `content/vocab.json`. `topic` — тема из `themes`.
- **Чтение** — элемент в `content/reading.json` с `title_et`, `title_ru`, `text_et` (абзацы через пустую строку) и `questions[]`.
- **Аудирование** — элемент в `content/listening.json` со `script_et: [{sp:"A", text:"…"}]` (реплики `B` звучат ниже) и `questions[]`.
- **Письмо** — `content/writing.json → items` (`prompt_et`, `prompt_ru`, `content_points_et/ru`); связки — `connectors`, чек-лист — `checklist`.
- **Говорение** — `content/speaking.json → items` (`situation_ru`, `role_a`, `role_b`, `phrases_et`).
- **Пробный экзамен** — `content/mock-exam.json`: части `listening / reading / language / writing / speaking` в `parts`. Список и порядок частей берётся из `config/exam-format.json`.
- **Новая тема** — добавьте её в `config/topics.json` (`grammar`, `themes` или `skills`).

## Формат экзамена: что не проверено

Всё, что касается формата (длительность частей, состав частей, порог, число баллов), лежит в `config/exam-format.json` с `verified: false` и пометкой «проверить на harno.ee». Сайт берёт значения только оттуда и подписывает их как тренировочные. После сверки с официальными материалами поправьте числа и поставьте `verified: true`.

Процент в пробном экзамене считается только по автоматически проверяемым частям (аудирование, чтение, язык). Письмо и говорение оцениваются самим учеником по чек-листам — автооценки нет. Процент — ориентир, а не предсказание результата.

## Проверка перед публикацией

```bash
node validate.js          # JSON: уникальные id, один верный ответ, explanation_ru, status, темы
node tools/contrast.js    # контраст цветов WCAG AA
node tools/smoke.js       # тест в Chromium (нужен Playwright): все страницы, консоль, прогресс после перезагрузки
node tools/list-draft.js  # обновить DRAFT_REVIEW.md
```

## Ограничения

- Синтез речи (Web Speech API) — не записи с экзамена; эстонского голоса на устройстве может не быть (тогда текст показывается после попытки).
- Запись голоса требует HTTPS (GitHub Pages даёт его) и разрешения на микрофон.
- Офлайн-режима (service worker) пока нет.

## Расширение тренировок

Банк: 227 грамматических вопросов, 10 текстов для чтения, 11 письменных заданий и 12 разговорных ситуаций. Добавлены 197 грамматических упражнений, 8 текстов с 24 вопросами и по 8 письменных и разговорных задач. Материалы остаются draft до проверки преподавателем.

Грамматика: выбор уровня и типа, сессии на 10/20/50 вопросов или весь банк, режим только новых заданий. Настройки применяются кнопкой «Начать заново». Повтор ошибок учитывает актуальные результаты. Пустой ответ в тренировке не завершает вопрос.

Исправлено управление pidama: pean õppima (ma-инфинитив), в отличие от tahan õppida. Уточнены формы minema.

Для браузерных проверок можно использовать установленный Chrome: задайте BROWSER_EXECUTABLE полным путём к браузеру и запустите node tools/smoke.js. Проверки охватывают мобильную и настольную ширину, сохранение прогресса, новые тексты, настройки сессии и пустые ответы.
