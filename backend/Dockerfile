# backend/Dockerfile
# Build-Kontext: Repository-Root (docker build --file backend/Dockerfile .)
# Dadurch sind pyproject.toml + uv.lock aus dem Backend-Verzeichnis erreichbar.

# ── Build Stage ────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# uv installieren
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Abhängigkeiten installieren (gecacht wenn pyproject.toml unverändert)
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

# Quellcode kopieren (manage.py + src/)
COPY backend/src/ ./backend/src/
COPY backend/docker-entrypoint.py ./backend/

# ── Dev Stage ──────────────────────────────────────────────────
FROM builder AS dev
# Dev: CMD wird von docker-compose.yml überschrieben (runserver)

# ── Production Stage ───────────────────────────────────────────
FROM python:3.12-slim AS production

WORKDIR /app

# Nur die installierten Pakete aus dem Builder übernehmen
COPY --from=builder /app/.venv /app/.venv

# Quellcode und Entrypoint
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/backend/docker-entrypoint.py /app/backend/

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/backend/src:/app/backend/src/dweb:/app/backend/src/smarti"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Statische Dateien sammeln (Django-Admin CSS/JS via Whitenoise)
RUN SECRET_KEY=build-only-not-used DATABASE_URL=sqlite:///dev.db \
    R2_ENDPOINT_URL=http://dummy.local R2_ACCESS_KEY_ID=dummy \
    R2_SECRET_ACCESS_KEY=dummy R2_BUCKET_NAME=dummy \
    python -m dweb.manage collectstatic --no-input \
    --settings=dsmarti.settings_production

EXPOSE 8000
CMD ["python", "/app/backend/docker-entrypoint.py"]
