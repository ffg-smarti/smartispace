# tools/commands/docker.py
from pathlib import Path

import typer

from tools.core.utils import HERE, _run


def docker_build(
    compose_file: Path = typer.Option(
        "docker-compose.yml", "--file", "-f", help="Docker-Compose-Datei"
    ),
):
    """Baut alle Docker-Images via `docker compose build`.

    Nutzt standardmaessig die `docker-compose.yml` aus dem
    Projekt-Root-Verzeichnis. Eine abweichende Datei kann
    ueber `--file` angegeben werden.
    """
    compose_path = HERE / compose_file
    if not compose_path.exists():
        typer.echo(f"[FAIL] {compose_path} nicht gefunden")
        raise typer.Exit(code=1)
    typer.echo("Starte Docker Compose Build...")
    _run(["docker", "compose", "-f", str(compose_path), "build"])
    typer.echo("[OK] Docker-Images gebaut")


def docker_up(
    compose_file: Path = typer.Option(
        "docker-compose.yml", "--file", "-f", help="Docker-Compose-Datei"
    ),
):
    """Startet Docker-Dev-Umgebung via `docker compose up -d`.

    Nutzt standardmaessig die `docker-compose.yml` aus dem
    Projekt-Root-Verzeichnis. Eine abweichende Datei kann
    ueber `--file` angegeben werden.
    """
    compose_path = HERE / compose_file
    if not compose_path.exists():
        typer.echo(f"[FAIL] {compose_path} nicht gefunden")
        raise typer.Exit(code=1)
    _run(["docker", "compose", "-f", str(compose_path), "up", "-d"])
    typer.echo("[OK] Docker-Container gestartet")


def docker_down(
    compose_file: Path = typer.Option(
        "docker-compose.yml", "--file", "-f", help="Docker-Compose-Datei"
    ),
):
    """Stoppt Docker-Dev-Umgebung via `docker compose down`.

    Entfernt Container, Netzwerke und Volumes der Compose-Datei.
    Eine abweichende Datei kann ueber `--file` angegeben werden.
    """
    compose_path = HERE / compose_file
    if not compose_path.exists():
        typer.echo(f"[FAIL] {compose_path} nicht gefunden")
        raise typer.Exit(code=1)
    _run(["docker", "compose", "-f", str(compose_path), "down"])
    typer.echo("[OK] Docker-Container gestoppt")
