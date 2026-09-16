# tools/commands/backend/django.py
import os
import subprocess
import sys
from pathlib import Path

import typer

app = typer.Typer(help="Befehle für Django-Management")

BASE_ROOT = Path(
    __file__
).parent.parent.parent.parent  # tools/commands/backend/django.py → Projekt-Root
# typer.echo(f"→ BASE_ROOT Verzeichnis: {BASE_ROOT} ")

# Pfad zur manage.py, relativ zum Projekt-Root
MANAGE_PATH = str(BASE_ROOT / "backend" / "src" / "dweb" / "manage.py")
# MANAGE_PATH = "backend/src/dweb/manage.py"
PYTHON_EXECUTABLE = sys.executable


def run_manage_command(cmd_args: list[str]):
    """
    Führt ein Django-Management-Kommando sicher über den Python-Interpreter der Umgebung aus.

    Args:
        cmd_args: Eine Liste von Strings, die das Management-Kommando und seine Argumente enthält.
                  (z.B. ["runserver", "0.0.0.0:8000"])
    """
    # Zum dweb-Verzeichnis wechseln
    dweb_dir = BASE_ROOT / "backend" / "src" / "dweb"
    typer.echo(f"→ dweb_dir Verzeichnis: {dweb_dir} ")
    original_cwd = os.getcwd()
    try:
        os.chdir(str(dweb_dir))
        # Der vollständige Befehl: [python_executable, manage.py, command, arg1, arg2, ...]
        command = [PYTHON_EXECUTABLE, "manage.py"] + cmd_args
        typer.echo(f"→ Ausführen: {' '.join(command)} (in {dweb_dir})")

        result = subprocess.run(command, check=False)
        return result.returncode
    finally:
        os.chdir(original_cwd)  # Zurück zum originalen Verzeichnis

    # typer.echo(f"→ Ausführen: {' '.join(command)}")

    # # subprocess.run wird verwendet, um die Ein- und Ausgabe der Shell weiterzuleiten (z.B. für runserver)
    # # check=False erlaubt es dem Befehl, mit einem Fehlercode zurückzukehren, ohne das Skript zu beenden.
    # result = subprocess.run(command, check=False)

    # return result.returncode


@app.command()
def runserver(host: str = "127.0.0.1", port: int = 8000):
    """Startet den Django-Entwicklungsserver."""
    typer.echo("🌐 Starte Django development Server...")
    exit_code = run_manage_command(["runserver", f"{host}:{port}"])
    raise typer.Exit(code=exit_code)


@app.command()
def export_schema(
    output: str = typer.Option(
        "packages/smarti-api/openapi.json",
        "--output",
        "-o",
        help="Zielpfad für die OpenAPI-JSON-Datei (relativ zum Projekt-Root)",
    ),
    api: str = typer.Option(
        None,
        "--api",
        help="Python-Import-Pfad zur NinjaAPI-Instanz (default: dweb.dsmarti.api.api_v1)",
    ),
    indent: int = typer.Option(2, "--indent", help="JSON-Einrückung (default: 2)"),
    sorted_keys: bool = typer.Option(
        False, "--sorted", help="JSON-Keys alphabetisch sortieren"
    ),
    ensure_ascii: bool = typer.Option(
        False, "--ascii", help="ASCII-Escaping (\\uXXXX)"
    ),
):
    """Exportiert das OpenAPI-Schema als JSON-Datei.

    Nutzt das Django-Management-Command 'export_openapi_schema'.
    Standardziel: packages/smarti-api/openapi.json
    """
    output_path = Path(output)
    if not output_path.is_absolute():
        output_path = BASE_ROOT / output

    cmd = ["export_openapi_schema", "--output", str(output_path)]
    if api:
        cmd.extend(["--api", api])
    if indent != 2:
        cmd.extend(["--indent", str(indent)])
    if sorted_keys:
        cmd.append("--sorted")
    if ensure_ascii:
        cmd.append("--ensure-ascii")

    exit_code = run_manage_command(cmd)
    if exit_code == 0:
        typer.echo(f"✅ OpenAPI-Schema exportiert: {output_path.resolve()}")
        typer.echo("")
        typer.echo("📋 Nächste Schritte:")
        typer.echo("   Frontend-Typescript-Typen via Orval generieren (aus packages):")
        typer.echo("   →  npm run schema:generate")
        typer.echo("   oder komplett (Export + Generate):")
        typer.echo("   →  npm run schema:build")
    else:
        typer.echo("❌ Fehler beim Export des OpenAPI-Schemas", err=True)
    raise typer.Exit(code=exit_code)


@app.command()
def makemigrations(app_name: str | None = typer.Argument(None)):
    """Erstellt neue Migrationsdateien."""
    cmd_args = ["makemigrations"]
    if app_name:
        cmd_args.append(app_name)
    run_manage_command(cmd_args)


@app.command()
def migrate():
    """Führt alle ausstehenden Migrationsdateien aus."""
    run_manage_command(["migrate"])


@app.command()
def shell():
    """Startet die interaktive Django-Shell."""
    run_manage_command(["shell"])


@app.command()
def createsuperuser(
    email: str = typer.Option("admin@example.com", prompt=True),
    password: str = typer.Option(
        "admin123", prompt=True, hide_input=True, confirmation_prompt=True
    ),
):
    """
    Erstellt einen Superuser non-interaktiv über die Django-Shell.
    Existierende Benutzer werden nicht überschrieben.
    """
    typer.echo(
        f"Erstelle Superuser mit Email: {email} (wird übersprungen, falls bereits vorhanden)"
    )

    # Aufbau des Python-Codes, der in der Django-Shell ausgeführt wird
    # Dies ist erforderlich, um den Superuser non-interaktiv zu erstellen.

    py_code = "\n".join(
        [
            "from django.contrib.auth import get_user_model",
            "U = get_user_model()",
            f"if not U.objects.filter(email='{email}').exists():",
            f"    U.objects.create_superuser('{email}', plain_password='{password}')",
        ]
    )
    # Ausführen des Codes über 'manage.py shell -c'
    exit_code = run_manage_command(["shell", "-c", py_code])

    if exit_code == 0:
        typer.echo("✅ Superuser-Check abgeschlossen.")
    else:
        typer.echo("❌ Fehler beim Erstellen des Superusers.", err=True)


@app.command()
def create_app(
    app_name: str = typer.Argument(..., help="Name der neuen Django App"),
    with_models: bool = typer.Option(
        False, "--models", help="Erstellt Models.py mit Basis-Struktur"
    ),
    with_views: bool = typer.Option(
        False, "--views", help="Erstellt Views.py mit Basis-Views"
    ),
    with_urls: bool = typer.Option(
        True, "--urls/--no-urls", help="Erstellt URLs.py Datei"
    ),
):
    """
    Erstellt eine neue Django App mit automatischer Grundstruktur. create-app my_new_app --models --views --urls
    """
    typer.echo(f"🚀 Erstelle neue Django App: {app_name}")

    # 1. Django App erstellen
    exit_code = run_manage_command(["startapp", app_name])

    if exit_code != 0:
        typer.echo(f"❌ Fehler beim Erstellen der App '{app_name}'", err=True)
        return

    typer.echo(f"✅ App '{app_name}' erfolgreich erstellt")

    # 2. Optionale Dateien erweitern
    # app_path = f"backend/src/dweb/{app_name}"
    app_path = str(BASE_ROOT / "backend" / "src" / "dweb" / app_name)
    typer.echo(f"🔍 App-Pfad: {app_path}")
    if with_models:
        _create_models_file(app_path, app_name)

    if with_views:
        _create_views_file(app_path, app_name)

    if with_urls:
        _create_urls_file(app_path, app_name)

    # 3. App zu INSTALLED_APPS hinzufügen (optional)
    typer.echo(
        f"📝 Vergessen Sie nicht, '{app_name}' zu INSTALLED_APPS in settings.py hinzuzufügen"
    )


def _create_models_file(app_path: str, app_name: str):
    """Erstellt eine erweiterte models.py Datei"""
    models_content = f'''"""
Models für {app_name}
"""

from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    """Basis-Model mit gemeinsamen Feldern"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True


# Fügen Sie hier Ihre Models hinzu
# class ExampleModel(BaseModel):
#     name = models.CharField(max_length=100)
#     description = models.TextField(blank=True)
#     
#     def __str__(self):
#         return self.name
'''

    try:
        with open(f"{app_path}/models.py", "w", encoding="utf-8") as f:
            f.write(models_content)
        typer.echo("✅ models.py mit Basis-Struktur erstellt")
    except Exception as e:
        typer.echo(f"❌ Fehler beim Erstellen von models.py: {e}", err=True)


def _create_views_file(app_path: str, app_name: str):
    """Erstellt eine erweiterte views.py Datei"""
    views_content = f'''"""
Views für {app_name}
"""

from django.shortcuts import render
from django.http import JsonResponse
from django.views import View


def index(request):
    """Beispiel View"""
    return JsonResponse({{"message": "Willkommen bei {app_name}"}})


class ExampleView(View):
    """Beispiel Class-Based View"""
    
    def get(self, request):
        return JsonResponse({{"method": "GET", "app": "{app_name}"}})
    
    def post(self, request):
        return JsonResponse({{"method": "POST", "app": "{app_name}"}})
'''

    try:
        with open(f"{app_path}/views.py", "w", encoding="utf-8") as f:
            f.write(views_content)
        typer.echo("✅ views.py mit Beispiel-Views erstellt")
    except Exception as e:
        typer.echo(f"❌ Fehler beim Erstellen von views.py: {e}", err=True)


def _create_urls_file(app_path: str, app_name: str):
    """Erstellt eine urls.py Datei"""
    urls_content = f'''"""
URL Configuration für {app_name}
"""

from django.urls import path
from . import views

app_name = "{app_name}"

urlpatterns = [
    # path("", views.index, name="index"),
    # path("example/", views.ExampleView.as_view(), name="example"),
]
'''

    try:
        with open(f"{app_path}/urls.py", "w", encoding="utf-8") as f:
            f.write(urls_content)
        typer.echo("✅ urls.py erstellt")
    except Exception as e:
        typer.echo(f"❌ Fehler beim Erstellen von urls.py: {e}", err=True)
