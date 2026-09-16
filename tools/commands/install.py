# tools/commands/install.py
import typer

from tools.core.utils import HERE, _run


def install():
    """Installiert Backend- und Frontend-Abhaengigkeiten.

    Fuehrt `uv sync` in `backend/` und `npm install` im Repository-Root
    (npm Workspaces: `packages/*`, `apps/*`) aus.
    """
    typer.echo("[PKG] uv sync (backend/)")
    _run(["uv", "sync"], cwd=HERE / "backend")

    typer.echo("[PKG] npm install (workspace-root)")
    _run(["npm", "install"], cwd=HERE)

    typer.echo("[OK] Installation abgeschlossen")
