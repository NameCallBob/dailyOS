#!/usr/bin/env bash
set -e

echo "Waiting for database..."
python - <<'PY'
import os
import sys
import time

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection

for attempt in range(30):
    try:
        connection.ensure_connection()
        break
    except Exception as exc:  # noqa: BLE001
        print(f"DB not ready ({exc}); retrying ({attempt + 1}/30)...")
        time.sleep(1)
else:
    print("Database never became available.", file=sys.stderr)
    sys.exit(1)
PY

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting..."
exec "$@"
