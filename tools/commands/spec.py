# tools/commands/spec.py
from pathlib import Path

import typer

from .coverage.analyzer import analyze_coverage
from .coverage.formatter import write_report

app = typer.Typer(help="Requirements Coverage")

REQ_PATH = "docs/specs/"
BACKEND_SRC = "backend/src/"
BACKEND_TESTS = "backend/tests/"


@app.command()
def coverage(
    output: Path = typer.Option(
        "build/reports/specs/coverage.md",
        "--output",
        "-o",
        help="Output-Pfad für den Coverage-Report",
    ),
):
    """Erstellt einen Requirements Coverage Report.

    Scannt backend/src/ und backend/tests/ nach :req:-Referenzen
    und gleicht sie mit den Requirements in docs/specs/ ab.
    """
    typer.echo("📊 Starte Coverage-Analyse...")
    data = analyze_coverage(
        specs_dir=REQ_PATH,
        src_dir=BACKEND_SRC,
        test_dir=BACKEND_TESTS,
    )
    write_report(data, str(output))
    typer.echo(f"✅ Coverage-Report erstellt: {output}")
