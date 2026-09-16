# tools/commands/__init__.py
import typer

from . import deps, docker, install, server
from . import docs as docs_mod
from . import minio as minio_mod
from . import spec as spec_mod
from .backend import db, django, test

app = typer.Typer(help="SMARTi CLI – Entwicklung, Tests, Verwaltung")


@app.command(name="clean", help="Löscht Build-Artefakte und temporäre Dateien")
def clean(remove_venv: bool = False):
    """Bereinigt Build- und Output-Verzeichnisse."""
    from .clean import clean as _clean

    _clean(remove_venv=remove_venv)


# Demo-Umgebung (Dev-Server, Docker, Setup)
demo_app = typer.Typer(help="Demo-Umgebung verwalten (Dev-Server, Docker, Setup)")

demo_app.command()(deps.check_deps)
demo_app.command()(install.install)
demo_app.command("up")(server.up)
demo_app.command("down")(server.down)
demo_app.command("status")(server.status)
demo_app.command("start")(server.start)
demo_app.command("docker-build")(docker.docker_build)
demo_app.command("docker-up")(docker.docker_up)
demo_app.command("docker-down")(docker.docker_down)

app.add_typer(
    demo_app, name="demo", help="Demo-Umgebung verwalten (Dev-Server, Docker, Setup)"
)
app.add_typer(docs_mod.app, name="docs", help="Dokumentationstools (MkDocs, etc.)")
app.add_typer(
    spec_mod.app,
    name="spec",
    help="StrictDoc Befehle: export, import, ids, runserver, coverage",
)
app.add_typer(
    minio_mod.app, name="minio", help="MinIO-Container verwalten (Bucket, Setup)"
)
app.add_typer(django.app, name="dj", help="Django-bezogene Befehle")
app.add_typer(db.app, name="db", help="Datenbankbefehle (Backup, Restore, etc.)")
app.add_typer(
    test.app, name="test", help="Test- und QA-Befehle: lint, format, unit-test"
)
