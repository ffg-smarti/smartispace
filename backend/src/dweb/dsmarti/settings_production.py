"""Django Settings für Production (COPI-LP).

Wird vom Dockerfile (collectstatic), docker-entrypoint.py und Coolify
verwendet. Alle Secrets kommen ausschließlich aus Umgebungsvariablen
(.env / Coolify-Environment) — niemals hartkodiert.

Pfad-Konvention laut workspace.md: dsmarti.settings_production
"""

import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

from .settings import *  # noqa: F401,F403 — Basis-Settings übernehmen
from .settings import MIDDLEWARE  # noqa: F401 — für insert unten

# Dotenv — erlaubt, Production-Settings lokal zu testen (backend/.env).
# Überschreibt gesetzte ENV-Variablen NICHT; Coolify-Env hat Vorrang.
BACKEND_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BACKEND_DIR / ".env")

# ── Sicherheit ────────────────────────────────────────────────
DEBUG = os.environ.get("DEBUG", "False").lower() in ("1", "true", "yes")

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY fehlt in Production-Settings!")

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]

# ── Datenbank (PostgreSQL via DATABASE_URL) ──────────────────
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
else:
    raise RuntimeError("DATABASE_URL fehlt in Production-Settings!")

# ── Storage (S3-kompatibel / Cloudflare R2) ──────────────────
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "endpoint_url": os.environ.get("R2_ENDPOINT_URL"),
            "access_key": os.environ.get("R2_ACCESS_KEY_ID"),
            "secret_key": os.environ.get("R2_SECRET_ACCESS_KEY"),
            "bucket_name": os.environ.get("R2_BUCKET_NAME", "copi-media"),
            "region_name": os.environ.get("R2_REGION_NAME", "auto"),
            "querystring_auth": True,
        },
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# ── Middleware / Static ──────────────────────────────────────
MIDDLEWARE.insert(0, "whitenoise.middleware.WhiteNoiseMiddleware")

# ── CORS (React-Clients) ─────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()
]

# ── E-Mail (SMTP, z. B. Zoho) ────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() in ("1", "true", "yes")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)

# ── Sicherheits-Header (Production) ──────────────────────────
CSRF_TRUSTED_ORIGINS = [
    f"https://{h}" for h in ALLOWED_HOSTS if h not in ("localhost", "127.0.0.1")
]
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "True").lower() in ("1", "true", "yes")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# ── Logging ──────────────────────────────────────────────────
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
}

# ── Celery (Broker via Umgebungsvariablen) ───────────────────
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)