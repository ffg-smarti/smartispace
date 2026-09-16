# tools/commands/server.py
import subprocess
import time

import psutil
import typer

from tools.commands.deps import check_deps as _check_deps
from tools.commands.install import install as _install
from tools.core.utils import (
    HERE,
    _detach_popen_kwargs,
    _find_processes_by_cwd,
    _health_check,
)

BACKEND_MANAGE = HERE / "backend" / "src" / "dweb"
PARENT_DIR = HERE / "apps" / "parent"
KIDS_DIR = HERE / "apps" / "kids"
LOG_DIR = HERE / "build" / "logs"
PARENT_PORT = 8080
KIDS_PORT = 8081


def up():
    """Startet Django- und Vite-Dev-Server als Hintergrundprozesse.

    Beendet vorher laufende Dev-Server im Projekt.
    Schreibt Logs nach `build/logs/`.
    Setzt installierte Abhaengigkeiten voraus (vorher `psmarti demo install`).
    """
    if not BACKEND_MANAGE.exists():
        typer.echo("[FAIL] backend/src/dweb nicht gefunden")
        raise typer.Exit(code=1)

    down()
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    detach = _detach_popen_kwargs()

    typer.echo("[START] Django Dev-Server -> http://localhost:8000")
    with (
        open(LOG_DIR / "backend.log", "w") as out,
        open(LOG_DIR / "backend-err.log", "w") as err,
    ):
        subprocess.Popen(
            ["uv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"],
            cwd=BACKEND_MANAGE,
            stdout=out,
            stderr=err,
            **detach,
        )

    for app_dir, port, app_name in (
        (PARENT_DIR, PARENT_PORT, "parent"),
        (KIDS_DIR, KIDS_PORT, "kids"),
    ):
        if app_dir.exists() and (app_dir / "package.json").exists():
            typer.echo(f"[START] Vite Dev-Server ({app_name}) -> http://localhost:{port}")
            with (
                open(LOG_DIR / f"{app_name}.log", "w") as out,
                open(LOG_DIR / f"{app_name}-err.log", "w") as err,
            ):
                subprocess.Popen(
                    ["npm", "run", "dev", "--workspace", f"apps/{app_name}", "--", "--host"],
                    cwd=HERE,
                    stdout=out,
                    stderr=err,
                    **detach,
                )
        else:
            typer.echo(f"[SKIP] apps/{app_name} nicht vollstaendig – Frontend uebersprungen")

    typer.echo("[OK] Dev-Server gestartet")


def down():
    """Beendet alle Dev-Server-Prozesse im Projekt.

    Sucht nach Python- und Node-Prozessen, deren Arbeitsverzeichnis
    auf das Projekt-Root zeigt, und terminiert sie.
    Nutzt psutil fuer plattformunabhaengiges Prozess-Management.
    """
    project_root = str(HERE.resolve())
    count = 0

    for proc in _find_processes_by_cwd("python", project_root):
        try:
            proc.terminate()
            count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    for proc in _find_processes_by_cwd("node", project_root):
        try:
            proc.terminate()
            count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    if count > 0:
        psutil.wait_procs(
            psutil.process_iter(),
            timeout=3,
            callback=lambda p: p.kill() if p.is_running() else None,
        )
        time.sleep(1)

    typer.echo(f"[OK] {count} Prozess(e) beendet")


def _status(wait: int = 8, retries: int = 4):
    """Prueft ob Backend und Frontends laufen und erreichbar sind.

    Sendet HTTP-Anfragen an localhost:8000 (Backend), localhost:8080 (Parent)
    und localhost:8081 (Kids).
    Wiederholt den Check bis zu `retries`-mal mit 2s Pause.
    Zeigt bei Fehlern die entsprechenden Log-Dateien an.
    Gibt Exit-Code 0 zurueck, auch wenn der Server Fehler wirft
    (solange er auf Anfragen antwortet).
    """
    wait = max(wait, 2)
    retries = max(retries, 1)
    typer.echo(f"⏳ Warte bis zu {wait}s auf Server-Start...")
    time.sleep(min(wait, 2))

    backend_log = ""
    if (LOG_DIR / "backend-err.log").exists():
        backend_log = (LOG_DIR / "backend-err.log").read_text()

    backend_alive, backend_code = _health_check(
        "http://localhost:8000", retries=retries, delay=2
    )
    parent_alive, parent_code = _health_check(
        f"http://localhost:{PARENT_PORT}", retries=retries, delay=2
    )
    kids_alive, kids_code = _health_check(
        f"http://localhost:{KIDS_PORT}", retries=retries, delay=2
    )

    def fmt(alive: bool, code: int | None) -> str:
        if alive:
            return f"[OK] erreichbar (HTTP {code})" if code else "[OK] erreichbar"
        return "[FAIL] nicht erreichbar"

    typer.echo(f"Backend  (8000): {fmt(backend_alive, backend_code)}")
    typer.echo(f"Parent   ({PARENT_PORT}): {fmt(parent_alive, parent_code)}")
    typer.echo(f"Kids     ({KIDS_PORT}): {fmt(kids_alive, kids_code)}")

    if not backend_alive:
        if backend_log:
            last = "".join(backend_log.splitlines(keepends=True)[-30:])
            typer.echo("--- Backend-Log (letzte 30 Zeilen) ---", err=True)
            typer.echo(last, err=True)
        raise typer.Exit(code=1)
    elif backend_code and backend_code >= 400:
        typer.echo("⚠️  Backend laeuft, liefert aber HTTP-Fehler (siehe Log)", err=True)

    if parent_alive and parent_code and parent_code >= 400:
        typer.echo("⚠️  Parent laeuft, liefert aber HTTP-Fehler (siehe Log)", err=True)

    if kids_alive and kids_code and kids_code >= 400:
        typer.echo("⚠️  Kids laeuft, liefert aber HTTP-Fehler (siehe Log)", err=True)


def status(
    wait: int = typer.Option(
        8, "--wait", "-w", help="Sekunden, die auf Server-Start gewartet wird"
    ),
    retries: int = typer.Option(
        4, "--retries", "-r", help="Anzahl Healthcheck-Wiederholungen"
    ),
):
    _status(wait, retries)


def start(
    wait: int = typer.Option(
        8, "--wait", "-w", help="Sekunden auf Server-Start warten"
    ),
):
    """All-in-One: komplette Demo-Umgebung hochfahren.

    Fuehrt nacheinander aus:
      1. check-deps   – Prueft Abhaengigkeiten (uv, node, npm)
      2. install      – Installiert Backend- + Frontend-Dependencies
      3. up           – Startet Django + Vite Dev-Server
      4. status       – Prueft Erreichbarkeit beider Server
    """
    _check_deps()
    _install()
    up()
    _status(wait=wait)
