#!/bin/sh
set -eu

cd /app

python - <<'PY'
import os
import time

import psycopg2

db_settings = {
    "dbname": os.getenv("POSTGRES_DB", "pricing_estimates"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
    "host": os.getenv("POSTGRES_HOST", "db"),
    "port": os.getenv("POSTGRES_PORT", "5432"),
}

for attempt in range(1, 31):
    try:
        connection = psycopg2.connect(**db_settings)
        connection.close()
        print("Postgres is available.")
        break
    except psycopg2.OperationalError as exc:
        print(f"Waiting for Postgres ({attempt}/30): {exc}")
        time.sleep(2)
else:
    raise SystemExit("Postgres did not become available in time.")
PY

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    python manage.py migrate --noinput
fi

if [ "${COLLECT_STATIC:-1}" = "1" ]; then
    python manage.py collectstatic --noinput
fi

case "${1:-api}" in
    api)
        exec gunicorn config.wsgi:application \
            --bind "0.0.0.0:${PORT:-8000}" \
            --workers "${GUNICORN_WORKERS:-3}" \
            --threads "${GUNICORN_THREADS:-2}" \
            --timeout "${GUNICORN_TIMEOUT:-120}"
        ;;
    worker)
        exec celery -A tasks.celery worker --loglevel="${CELERY_LOG_LEVEL:-INFO}"
        ;;
    *)
        exec "$@"
        ;;
esac
