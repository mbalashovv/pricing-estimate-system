FROM python:3.13-slim-bookworm AS python-base

COPY --from=ghcr.io/astral-sh/uv:0.7.2 /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=1 \
    APP_PATH="/app" \
    DJANGO_SETTINGS_MODULE=config.settings \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    VIRTUAL_ENV="/app/.venv" \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

FROM python-base AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/

COPY backend/pyproject.toml backend/uv.lock /app/

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

COPY backend/ /app/

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

FROM python-base AS runner

COPY --from=builder /app /app
COPY docker/backend/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["api"]
