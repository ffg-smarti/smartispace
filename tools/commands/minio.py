# tools/commands/minio.py
import time

import typer

from tools.core.utils import HERE, _run

COMPOSE_FILE = HERE / "docker-compose.yml"

MINIO_ALIAS = "smarti-local"
MINIO_ENDPOINT = "http://localhost:9000"
BUCKET_NAME = "smarti-h5p"

app = typer.Typer(help="MinIO-Container verwalten (Bucket, Setup)")


def _compose_file_guard() -> None:
    if not COMPOSE_FILE.exists():
        typer.echo(f"[FAIL] {COMPOSE_FILE} nicht gefunden")
        raise typer.Exit(code=1)


def minio_up() -> None:
    """Startet MinIO-Container via `docker compose up -d`.

    Startet ausschliesslich den `minio`-Service aus der
    `docker-compose.yml` im Root-Verzeichnis.
    """
    _compose_file_guard()
    typer.echo("[MINIO] Starte MinIO-Container...")
    _run(
        ["docker", "compose", "-f", str(COMPOSE_FILE), "up", "-d", "minio"],
    )
    typer.echo(
        "[OK] MinIO gestartet — API: http://localhost:9000 | Konsole: http://localhost:9001"
    )


def minio_down() -> None:
    """Stoppt MinIO-Container via `docker compose down`.

    Entfernt den `minio`-Container. Das Volume `minio_data`
    bleibt erhalten — Daten gehen nicht verloren.
    """
    _compose_file_guard()
    _run(
        ["docker", "compose", "-f", str(COMPOSE_FILE), "down", "minio"],
    )
    typer.echo("[OK] MinIO gestoppt")


def minio_setup() -> None:
    """Erstellt den `smarti-h5p`-Bucket in MinIO (einmalig).

    Erwartet einen laufenden MinIO-Container. Fuehrt `mc`-Befehle
    im `minio`-Container aus — kein lokales `mc`-Binary erforderlich.

    Schritte:
      1. Warten bis MinIO-API bereit ist (max. 15 s)
      2. Alias `smarti-local` setzen
      3. Bucket `smarti-h5p` anlegen (idempotent)
      4. Download-Policy fuer den Bucket setzen (privat)
    """
    _compose_file_guard()
    typer.echo("[MINIO] Warte auf MinIO-API...")

    credentials = _read_minio_credentials()
    access_key = credentials["MINIO_ROOT_USER"]
    secret_key = credentials["MINIO_ROOT_PASSWORD"]

    _wait_for_minio(access_key, secret_key)

    typer.echo(f"[MINIO] Setze Alias '{MINIO_ALIAS}'...")
    _mc(["alias", "set", MINIO_ALIAS, MINIO_ENDPOINT, access_key, secret_key])

    typer.echo(f"[MINIO] Erstelle Bucket '{BUCKET_NAME}'...")
    _mc(["mb", "--ignore-existing", f"{MINIO_ALIAS}/{BUCKET_NAME}"])

    typer.echo(f"[MINIO] Setze Policy (privat) fuer '{BUCKET_NAME}'...")
    _mc(["anonymous", "set", "none", f"{MINIO_ALIAS}/{BUCKET_NAME}"])

    typer.echo(f"[OK] Bucket '{BUCKET_NAME}' ist bereit")
    typer.echo("[OK] MinIO-Setup abgeschlossen")


def minio_reset() -> None:
    """Loescht und erstellt den `smarti-h5p`-Bucket neu.

    Alle gespeicherten H5P-Assets gehen verloren.
    Nur fuer lokale Entwicklung gedacht.
    """
    _compose_file_guard()
    credentials = _read_minio_credentials()
    access_key = credentials["MINIO_ROOT_USER"]
    secret_key = credentials["MINIO_ROOT_PASSWORD"]

    _mc(["alias", "set", MINIO_ALIAS, MINIO_ENDPOINT, access_key, secret_key])

    typer.echo(f"[MINIO] Loesche Bucket '{BUCKET_NAME}'...")
    _mc(["rb", "--force", f"{MINIO_ALIAS}/{BUCKET_NAME}"])

    typer.echo(f"[MINIO] Erstelle Bucket '{BUCKET_NAME}' neu...")
    _mc(["mb", f"{MINIO_ALIAS}/{BUCKET_NAME}"])
    _mc(["anonymous", "set", "none", f"{MINIO_ALIAS}/{BUCKET_NAME}"])

    typer.echo(f"[OK] Bucket '{BUCKET_NAME}' zurueckgesetzt")


# ---------------------------------------------------------------------------
# Interne Hilfsfunktionen
# ---------------------------------------------------------------------------


def _mc(args: list[str]) -> None:
    """Fuehrt einen `mc`-Befehl im laufenden MinIO-Container aus."""
    _run(
        ["docker", "compose", "-f", str(COMPOSE_FILE), "exec", "minio", "mc"] + args,
    )


def _wait_for_minio(access_key: str, secret_key: str, timeout: int = 15) -> None:
    """Wartet bis die MinIO-API antwortet (max. `timeout` Sekunden)."""
    for attempt in range(timeout):
        try:
            _mc(["alias", "set", MINIO_ALIAS, MINIO_ENDPOINT, access_key, secret_key])
            return
        except SystemExit:
            if attempt == timeout - 1:
                typer.echo(
                    "[FAIL] MinIO nicht erreichbar. Ist der Container gestartet?"
                )
                typer.echo("       Tipp: uv run smarti minio-up")
                raise typer.Exit(code=1)
            time.sleep(1)


def _read_minio_credentials() -> dict[str, str]:
    """Liest MINIO_ROOT_USER und MINIO_ROOT_PASSWORD aus .env oder secrets.env."""
    env_file = HERE / ".env"
    if not env_file.exists():
        env_file = HERE / "secrets.env"
    if not env_file.exists():
        typer.echo("[FAIL] Weder .env noch secrets.env gefunden.")
        raise typer.Exit(code=1)

    credentials: dict[str, str] = {}
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            credentials[key.strip()] = value.strip().strip('"')

    for required in ("MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD"):
        if required not in credentials:
            typer.echo(f"[FAIL] {required} fehlt in der .env-Datei")
            raise typer.Exit(code=1)

    return credentials


app.command("up")(minio_up)
app.command("down")(minio_down)
app.command("setup")(minio_setup)
app.command("reset")(minio_reset)
