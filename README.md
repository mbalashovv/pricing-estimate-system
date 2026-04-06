# Pricing Estimate System

Pricing Estimate System — это full-stack приложение для импорта прайс-листов поставщиков и проектных смет, разбора табличных данных и сопоставления загруженных позиций с центральным каталогом товаров.

Проект состоит из:

- `frontend/`: интерфейс на React + TypeScript + Vite для управления поставщиками, каталогом, проектами, прайс-листами и сметами.
- `backend/`: API на Django + Django REST Framework с PostgreSQL, pgvector, Redis и фоновыми задачами Celery.

## Что Делает Система

Основной сценарий работы:

1. Создать поставщиков, группы каталога, позиции каталога и проекты.
2. Загрузить прайс-листы поставщиков в формате `.xls` или `.xlsx`.
3. Просмотреть колонки таблицы, настроить сопоставление колонок и запустить разбор.
4. Запустить сопоставление распознанных позиций прайс-листа с позициями каталога.
5. Загрузить проектные сметы в формате `.xls` или `.xlsx`.
6. Настроить сопоставление колонок сметы, разобрать строки и запустить сопоставление сметы с каталогом.
7. Проверить AI- и ручные сопоставления, а также необработанные позиции в интерфейсе.

Backend предоставляет REST endpoints по пути `/api/` и выполняет асинхронные задачи разбора и сопоставления через Celery. Эмбеддинги позиций каталога хранятся в PostgreSQL с `pgvector`, а AI-сопоставление использует OpenAI Embeddings API.

## Стек

- Frontend: React 19, TypeScript, Vite, TanStack Query, Axios
- Backend: Django 6, Django REST Framework, Celery, Gunicorn
- Слой данных: PostgreSQL + `pgvector`
- Очередь и брокер: Redis
- Инфраструктура: Docker Compose, Nginx

## Запуск Проекта

### Вариант 1. Docker Compose

Это самый быстрый способ запустить проект целиком.

Создайте `backend/.env`:

```env
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost
DJANGO_SECURE_SSL_REDIRECT=0
DJANGO_SECURE_COOKIES=0
DJANGO_SECURE_HSTS_SECONDS=0

POSTGRES_DB=pricing_estimates
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

REDIS_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

OPENAI_API_KEY=your_openai_api_key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
MATCH_TOP_K=3
MATCH_STRONG_THRESHOLD=0.8
MATCH_REVIEW_THRESHOLD=0.5
```

Необязательный корневой `frontend/.env` для аргументов сборки frontend:

```env
VITE_API_BASE_URL=/api
```

Запустите стек:

```bash
docker compose up --build
```

После запуска:

- Frontend: `http://localhost`
- Backend API: `http://localhost/api/`

Что запускает Compose:

- `db`: PostgreSQL с `pgvector`
- `redis`: Redis как брокер и backend результатов
- `api`: контейнер Django + Gunicorn
- `celery`: фоновый воркер для разбора и сопоставления
- `frontend`: Nginx, раздающий собранное Vite-приложение

### Вариант 2. Локальная разработка

Запускайте сервисы вручную, если нужны отдельные dev-серверы frontend и backend.

#### Backend

Требования:

- Python `3.13`
- PostgreSQL с `pgvector`
- Redis
- `uv`

Создайте `backend/.env`:

```env
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DJANGO_SECURE_SSL_REDIRECT=0
DJANGO_SECURE_COOKIES=0
DJANGO_SECURE_HSTS_SECONDS=0

POSTGRES_DB=pricing_estimates
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

REDIS_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

OPENAI_API_KEY=your_openai_api_key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
MATCH_TOP_K=3
MATCH_STRONG_THRESHOLD=0.8
MATCH_REVIEW_THRESHOLD=0.5
```

Установите зависимости:

```bash
cd backend
uv sync
```

Примените миграции:

```bash
cd backend
set -a
source .env
set +a
uv run python manage.py migrate
```

Запустите Django API:

```bash
cd backend
set -a
source .env
set +a
uv run python manage.py runserver
```

Запустите Celery worker в отдельном терминале:

```bash
cd backend
set -a
source .env
set +a
uv run celery -A tasks.celery worker --loglevel=INFO
```

#### Frontend

Требования:

- Node.js `24`
- npm

Создайте `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Установите зависимости:

```bash
cd frontend
npm install
```

Запустите dev-сервер:

```bash
cd frontend
npm run dev
```

Локальные адреса по умолчанию:

- Frontend dev server: `http://localhost:5173`
- Backend dev server: `http://localhost:8000`

## Переменные Окружения

### Backend

Основные переменные, которые использует backend:

- `DJANGO_SECRET_KEY`: секретный ключ Django
- `DJANGO_DEBUG`: включает debug-режим при значении `1` или `true`
- `DJANGO_ALLOWED_HOSTS`: список разрешенных хостов через запятую
- `DJANGO_CSRF_TRUSTED_ORIGINS`: список доверенных origins через запятую
- `DJANGO_TIME_ZONE`: временная зона Django, по умолчанию `UTC`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `POSTGRES_HOST`, `POSTGRES_PORT`
- `REDIS_URL`
- `CELERY_RESULT_BACKEND`
- `OPENAI_API_KEY`: обязателен для сопоставления на основе эмбеддингов
- `EMBEDDING_MODEL`: по умолчанию `text-embedding-3-small`
- `EMBEDDING_DIMENSIONS`: по умолчанию `1536`
- `MATCH_TOP_K`: количество верхних кандидатов для анализа при сопоставлении
- `MATCH_STRONG_THRESHOLD`: порог автоматического сопоставления
- `MATCH_REVIEW_THRESHOLD`: порог для отправки менее уверенных совпадений на проверку

### Frontend

- `VITE_API_BASE_URL`: базовый URL для запросов к API. По умолчанию `/api`.

## Примечания

- Загруженные таблицы хранятся в media-хранилище backend.
- Разбор и сопоставление выполняются асинхронно. `celery` worker должен быть запущен.
- AI-сопоставление зависит от OpenAI embeddings. Без `OPENAI_API_KEY` сопоставление по эмбеддингам не будет работать.
- PostgreSQL должен поддерживать расширение `vector`. Docker-конфигурация уже использует совместимый образ `pgvector`.
