# tools/commands/clean.py
import os
import shutil
from pathlib import Path

import typer

# Repo-Root bestimmen (workspace root), unabhängig vom CWD
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Verzeichnisse, die beim Aufräumen NICHT durchlaufen werden sollen
_IGNORE_DIRS = {".venv", "node_modules", ".git", ".opencode"}

app = typer.Typer(help="Löscht Build-Artefakte und temporäre Dateien")


@app.command(name="clean", help="Löscht Build-Artefakte und temporäre Dateien")
def clean(remove_venv: bool = False):
    """Bereinigt Build- und Output-Verzeichnisse."""
    dirs_to_clean = [
        # Backend-Build-Artefakte
        "backend/build",
        "backend/dist",
        "backend/.coverage",
        "backend/.mypy_cache",
        "backend/.pytest_cache",
        "backend/.ruff_cache",
        "backend/src/dweb/logs",
        # Frontend-Build-Artefakte
        "apps/parent/dist",
        "apps/kids/dist",
        # Root-Artefakte
        "build",
        "dist",
        "output",
        "smarti.egg-info",
        ".hypothesis",
        # Log-Dateien
        "linter-summarized.log",
    ]
    # Rekursiv alle __pycache__ Verzeichnisse finden (ohne .venv/node_modules)
    for d in dirs_to_clean:
        _delete_path(PROJECT_ROOT / d)

    for pycache in _rglob_pycache(PROJECT_ROOT):
        _delete_path(pycache)

    if remove_venv:
        venv_path = PROJECT_ROOT / ".venv"
        if venv_path.exists():
            shutil.rmtree(venv_path)
            typer.echo("✅ Virtuelle Umgebung gelöscht")
    typer.echo("✨ Bereinigung abgeschlossen!")


def _rglob_pycache(root: Path) -> list[Path]:
    """Findet alle __pycache__-Verzeichnisse unter root, überspringt ignorierte Ordner."""
    pycache_dirs: list[Path] = []
    for current, dirs, _ in os.walk(root):
        # Ignorierte Ordner während des Traversierens überspringen (Pruning)
        dirs[:] = [d for d in dirs if d not in _IGNORE_DIRS]
        if "__pycache__" in dirs:
            pycache_dirs.append(Path(current) / "__pycache__")
    return pycache_dirs


def _delete_path(path: Path) -> None:
    """Hilfsfunktion zum Löschen von Pfaden"""
    if not path.exists():
        return

    try:
        if path.is_dir():
            shutil.rmtree(path)
            typer.echo(f"✅ Verzeichnis {path} gelöscht")
        else:
            path.unlink()
            typer.echo(f"✅ Datei {path} gelöscht")
    except PermissionError as e:
        typer.echo(f"⚠️  Konnte {path} nicht löschen: {e}", err=True)
    except Exception as e:
        typer.echo(f"❌ Fehler beim Löschen von {path}: {e}", err=True)
