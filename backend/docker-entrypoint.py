# backend/docker-entrypoint.py
"""
Docker Entrypoint für SMARTi Backend (Production).

Führt beim Container-Start aus:
1. Datenbank-Migrationen (via Django manage.py migrate)
2. Startet gunicorn WSGI-Server

Dieses Script ersetzt das übliche Shell-Entrypoint-Script,
damit Konsistenz in der Python-Umgebung gewährleistet ist.
"""

import logging
import os
import subprocess
import sys

logger = logging.getLogger("entrypoint")

SRC_DIR = "/app/backend/src"
DJANGO_SETTINGS_MODULE = "dsmarti.settings_production"


def _ensure_django_env():
    """Stellt sicher, dass PYTHONPATH und DJANGO_SETTINGS_MODULE korrekt gesetzt sind."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", DJANGO_SETTINGS_MODULE)

    if SRC_DIR not in sys.path:
        sys.path.insert(0, SRC_DIR)

    pythonpath = os.environ.get("PYTHONPATH", "")
    if SRC_DIR not in pythonpath:
        parts = [p for p in pythonpath.split(":") if p] if pythonpath else []
        parts.insert(0, SRC_DIR)
        os.environ["PYTHONPATH"] = ":".join(parts)


def _run_migrations() -> int:
    """Führt Django-Migrationen aus. Returns Exit-Code (0 = Erfolg)."""
    print("=== Running database migrations ===")
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "dweb.manage",
            "migrate",
            "--no-input",
        ],
        cwd=SRC_DIR,
    )
    return result.returncode


def _start_gunicorn():
    """Startet gunicorn als WSGI-Server (ersetzt den aktuellen Prozess via os.execvp)."""
    print("=== Starting gunicorn ===")
    os.execvp("gunicorn", [
        "gunicorn",
        "dsmarti.wsgi:application",
        "--bind", "0.0.0.0:8000",
        "--workers", "2",
        "--timeout", "120",
        "--access-logfile", "-",
        "--error-logfile", "-",
    ])


# Service-Rollen: welche Rolle erwartet welchen Start-Modus?
# - web-Rollen starten gunicorn (wenn kein COMMAND übergeben)
# - async-Rollen (worker/beat) MÜSSEN ein COMMAND haben, sonst Hard-Fail
WEB_ROLES = ("api", "web")
ASYNC_ROLES = ("worker", "beat")


def main():
    _ensure_django_env()

    migrations_ok = _run_migrations()
    if migrations_ok != 0:
        print("FATAL: Database migrations failed. Aborting.", file=sys.stderr)
        sys.exit(migrations_ok)

    role = os.environ.get("SERVICE_ROLE", "").lower()
    if role:
        logger.info("SERVICE_ROLE=%s", role)

    # Wenn ein externes COMMAND übergeben wird (z.B. Coolify Start-Command
    # "celery -A dsmarti worker ..."), dieses ausführen statt gunicorn.
    if len(sys.argv) > 1:
        logger.info("Starting via COMMAND: %s", " ".join(sys.argv[1:]))
        os.execvp(sys.argv[1], sys.argv[1:])

    # Kein COMMAND übergeben — Entscheidung anhand SERVICE_ROLE:
    if role in ASYNC_ROLES:
        # Hart abbrechen statt heimlich gunicorn zu starten — das würde den
        # Fehler "Worker läuft als Webserver" unbemerkt lassen.
        logger.error(
            "SERVICE_ROLE=%s but NO Start Command passed! "
            "Set Command (Build > Custom Docker Options): "
            "celery -A dsmarti %s ...",
            role,
            role,
        )
        sys.exit(1)

    if role and role not in WEB_ROLES:
        # Unbekannte/ungeplante Rolle ohne COMMAND — nicht einfach gunicorn
        # starten, das verdeckt Konfigurationsfehler.
        logger.error(
            "SERVICE_ROLE=%s is not a web role and no COMMAND passed. "
            "Use one of %s (web) or %s (async, needs Command).",
            role,
            WEB_ROLES,
            ASYNC_ROLES,
        )
        sys.exit(1)

    logger.info("Starting gunicorn (web mode, SERVICE_ROLE=%s).", role or "unset")
    _start_gunicorn()
    # os.execvp übernimmt — wir kommen nie hierher


if __name__ == "__main__":
    main()
