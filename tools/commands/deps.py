# tools/commands/deps.py
import subprocess

import typer

from tools.core.utils import _check_command


def check_deps():
    """Prueft ob alle Abhaengigkeiten (uv, node, npm) installiert sind.

    Fuehrt `uv --version`, `node --version` und `npm --version` aus.
    Bricht mit Exit-Code 1 ab, wenn eine Abhaengigkeit fehlt.
    """
    ok = True

    if not _check_command("uv"):
        typer.echo("[FAIL] uv nicht gefunden")
        ok = False
    else:
        result = subprocess.run(["uv", "--version"], capture_output=True, text=True)
        typer.echo(f"[OK] uv {result.stdout.strip()}")

    if not _check_command("node"):
        typer.echo("[FAIL] node nicht gefunden")
        ok = False
    else:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        typer.echo(f"[OK] Node.js {result.stdout.strip()}")

    if not _check_command("npm"):
        typer.echo("[FAIL] npm nicht gefunden")
        ok = False
    else:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        typer.echo(f"[OK] npm {result.stdout.strip()}")

    if not ok:
        raise typer.Exit(code=1)
    typer.echo("[OK] Alle Abhaengigkeiten vorhanden")
