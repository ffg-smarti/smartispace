# tools/commands/docs.py
import subprocess
import sys

import typer

PYTHON_EXECUTABLE = sys.executable

app = typer.Typer(help="Dokumentation (MkDocs, StrictDoc, etc.)")


def run_tool(tool_module: str, args: list[str]):
    """Führt ein Tool als Python-Modul sicher aus."""
    command = [PYTHON_EXECUTABLE, "-m", tool_module] + args
    result = subprocess.run(command, check=False)
    return result.returncode


@app.command()
def build():
    """Baut MkDocs-Dokumentation."""
    typer.echo("Starte MkDocs-Build...")
    exit_code = run_tool("mkdocs", ["build"])
    if exit_code == 0:
        typer.echo("✅ MkDocs-Dokumentation erfolgreich gebaut.")
    else:
        typer.echo(f"❌ Fehler beim MkDocs-Build. Exit Code: {exit_code}", err=True)


@app.command()
def serve():
    """Startet MkDocs-Server im Entwicklungsmodus. Blockiert die Konsole."""
    typer.echo("Starte MkDocs Development Server. Drücken Sie CTRL+C zum Beenden.")
    run_tool("mkdocs", ["serve"])
