# tools/commands/backend/db.py

import glob
import os
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

import typer

app = typer.Typer(help="Datenbankverwaltung (PostgreSQL)")

BASE_ROOT = Path(
    __file__
).parent.parent.parent.parent  # tools/commands/backend/db.py → Projekt-Root

MANAGE_PATH = str(BASE_ROOT / "backend" / "src" / "dweb" / "manage.py")
DJANGO_DIR = BASE_ROOT / "backend" / "src" / "dweb"
PYTHON_EXECUTABLE = sys.executable


def _discover_apps_with_models() -> list[str]:
    """Findet Django-Apps mit Models unter `backend/src/dweb/` (Konvention: `dj_*` mit `models.py`)."""
    if not DJANGO_DIR.exists():
        return []
    return sorted(
        d.name
        for d in DJANGO_DIR.iterdir()
        if d.is_dir() and d.name.startswith("dj_") and (d / "models.py").exists()
    )


def _run_manage(cmd_args: list[str]) -> int:
    """Führt ein Django-Management-Kommando aus."""
    original_cwd = os.getcwd()
    try:
        os.chdir(str(DJANGO_DIR))
        command = [PYTHON_EXECUTABLE, "manage.py"] + cmd_args
        typer.echo(f"→ {' '.join(command)}")
        result = subprocess.run(command, check=False)
        return result.returncode
    finally:
        os.chdir(original_cwd)


def _run_django_sql(py_code: str) -> int:
    """Führt Python-Code aus, der Django's connection für SQL nutzt."""
    return _run_manage(["shell", "-c", py_code])


# ─────────────────────────────────────────────────────────────
# BACKUP
# ─────────────────────────────────────────────────────────────
@app.command()
def backup():
    """Erstellt ein Backup der PostgreSQL-Datenbank via pg_dump."""
    backup_dir = BASE_ROOT / "backups" / "db"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"db_backup_{timestamp}.sql"

    # Versuche pg_dump, fallback auf Django dumpdata
    db_url = os.environ.get(
        "DATABASE_URL", "postgresql://smarti:smarti@localhost:5432/smarti_dev"
    )
    command = [
        "pg_dump",
        db_url,
        "-f",
        str(backup_path),
        "--no-owner",
        "--no-privileges",
    ]
    typer.echo(f"→ {' '.join(command)}")
    result = subprocess.run(command, check=False)

    if result.returncode == 0:
        typer.echo(f"✅ Backup erstellt: {backup_path}")
    else:
        typer.echo("⚠️  pg_dump nicht verfügbar, versuche Django dumpdata...")
        fallback_path = backup_dir / f"db_backup_{timestamp}.json"
        rc = _run_manage(["dumpdata", "--output", str(fallback_path), "--indent", "2"])
        if rc == 0:
            typer.echo(f"✅ Backup (dumpdata) erstellt: {fallback_path}")
        else:
            typer.echo("❌ Backup fehlgeschlagen.", err=True)


# ─────────────────────────────────────────────────────────────
# RESTORE
# ─────────────────────────────────────────────────────────────
@app.command()
def restore(file: str):
    """Stellt ein Datenbank-Backup wiederher (.sql oder .json)."""
    if not os.path.exists(file):
        typer.echo(f"❌ Datei nicht gefunden: {file}", err=True)
        raise typer.Exit(1)

    typer.confirm(f"⚠️  Datenbank wirklich mit {file} überschreiben?", abort=True)

    if file.endswith(".json"):
        # Django dumpdata-Format
        rc = _run_manage(["loaddata", file])
    else:
        # SQL-Datei via psql
        db_url = os.environ.get(
            "DATABASE_URL", "postgresql://smarti:smarti@localhost:5432/smarti_dev"
        )
        command = ["psql", db_url, "-f", file]
        typer.echo(f"→ {' '.join(command)}")
        result = subprocess.run(command, check=False)
        rc = result.returncode

    if rc == 0:
        typer.echo("✅ Backup wiederhergestellt.")
    else:
        typer.echo(f"❌ Restore fehlgeschlagen. Exit Code: {rc}", err=True)


# ─────────────────────────────────────────────────────────────
# RESET
# ─────────────────────────────────────────────────────────────
@app.command()
def reset(
    nuke: bool = typer.Option(
        False, "--nuke", help="Migration-Dateien löschen und neu generieren"
    ),
):
    """Setzt die Datenbank komplett zurück (DROP SCHEMA + migrate)."""
    typer.confirm(
        "⚠️  Datenbank wirklich komplett zurücksetzen? ALLE DATEN GEHEN VERLOREN.",
        abort=True,
    )

    # 1. Schema droppen via Django connection
    typer.echo("🗑️  Droppe DB-Schema 'public'...")
    py_code = """
from django.db import connection
with connection.cursor() as c:
    c.execute('DROP SCHEMA public CASCADE')
    c.execute('CREATE SCHEMA public')
    c.execute("GRANT ALL ON SCHEMA public TO smarti")
    c.execute("GRANT ALL ON SCHEMA public TO public")
"""
    rc = _run_manage(["shell", "-c", py_code])
    if rc != 0:
        typer.echo("❌ Schema-Drop fehlgeschlagen.", err=True)
        raise typer.Exit(rc)
    typer.echo("✅ Schema zurückgesetzt und Berechtigungen gesetzt.")

    # 2. Migration-Dateien löschen (optional)
    if nuke:
        typer.echo("🗑️  Lösche Migration-Dateien...")
        deleted_count = 0
        for app_name in _discover_apps_with_models():
            migrations_dir = DJANGO_DIR / app_name / "migrations"
            if not migrations_dir.exists():
                continue
            for f in glob.glob(str(migrations_dir / "0*.py")):
                os.remove(f)
                deleted_count += 1
                typer.echo(f"  🗑️  {app_name}/{os.path.basename(f)}")

        # dj_lms: migrations-Verzeichnis anlegen falls nicht vorhanden
        dj_lms_migrations = DJANGO_DIR / "dj_lms" / "migrations"
        if not dj_lms_migrations.exists():
            dj_lms_migrations.mkdir(parents=True)
            (dj_lms_migrations / "__init__.py").touch()
            typer.echo("  📁 dj_lms/migrations/ erstellt.")

        typer.echo(f"✅ {deleted_count} Migration-Dateien gelöscht.")

        # 3. Migrationen neu generieren
        typer.echo("📝 Generiere neue Migrationen...")
        rc = _run_manage(["makemigrations"])
        if rc != 0:
            typer.echo("❌ makemigrations fehlgeschlagen.", err=True)
            raise typer.Exit(rc)
        typer.echo("✅ Migrationen generiert.")

    # 4. Migrationen anwenden
    typer.echo("🔄 Wende Migrationen an...")
    rc = _run_manage(["migrate"])
    if rc != 0:
        typer.echo("❌ migrate fehlgeschlagen.", err=True)
        raise typer.Exit(rc)

    typer.echo("✅ Datenbank erfolgreich zurückgesetzt.")
