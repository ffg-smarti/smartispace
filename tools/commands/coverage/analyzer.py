# tools/commands/coverage/analyzer.py
"""Analyzer für Coverage-Berechnung."""

from dataclasses import dataclass, field

from .parser import Requirement, get_all_requirements
from .scanner import (
    CodeReference,
    SymbolReference,
    scan_for_references,
    scan_for_unspecified,
)


@dataclass
class CoverageData:
    """Container für alle Coverage-Daten."""

    requirements: dict[str, Requirement]
    implemented: dict[str, list[CodeReference]] = field(default_factory=dict)
    tested: dict[str, list[CodeReference]] = field(default_factory=dict)
    unspecified: list[SymbolReference] = field(default_factory=list)


def analyze_coverage(
    specs_dir: str = "specs/", src_dir: str = "src/", test_dir: str = "tests/"
) -> CoverageData:
    """
    Analysiert die Coverage von Requirements.

    Args:
        specs_dir: Pfad zum Specs-Verzeichnis
        src_dir: Pfad zum Source-Verzeichnis
        test_dir: Pfad zum Test-Verzeichnis

    Returns:
        CoverageData mit allen Analyse-Ergebnissen
    """
    data = CoverageData(requirements=get_all_requirements(specs_dir))

    for ref in scan_for_references(src_dir):
        for req_id in ref.req_ids:
            if req_id not in data.implemented:
                data.implemented[req_id] = []
            data.implemented[req_id].append(ref)

    for ref in scan_for_references(test_dir):
        for req_id in ref.req_ids:
            if req_id not in data.tested:
                data.tested[req_id] = []
            data.tested[req_id].append(ref)

    for sym in scan_for_unspecified(src_dir):
        data.unspecified.append(sym)

    return data


def get_coverage_status(req_id: str, data: CoverageData) -> tuple[bool, bool]:
    """
    Gibt den Coverage-Status für eine Requirement-ID zurück.

    Args:
        req_id: Die Requirement-ID
        data: Die Coverage-Daten

    Returns:
        Tuple (implemented, tested) als Booleans
    """
    implemented = req_id in data.implemented
    tested = req_id in data.tested

    return implemented, tested


def get_coverage_summary(data: CoverageData) -> dict[str, int]:
    """
    Gibt eine Zusammenfassung der Coverage zurück.

    Args:
        data: Die Coverage-Daten

    Returns:
        Dictionary mit Statistiken
    """
    total = len(data.requirements)
    implemented_count = len(data.implemented)
    tested_count = len(data.tested)
    both_count = len(set(data.implemented.keys()) & set(data.tested.keys()))

    return {
        "total": total,
        "implemented": implemented_count,
        "tested": tested_count,
        "both": both_count,
        "implemented_pct": (
            round(implemented_count / total * 100, 1)  # type: ignore
            if total > 0
            else 0
        ),
        "tested_pct": (
            round(tested_count / total * 100, 1) if total > 0 else 0  # type: ignore
        ),
    }  # type: ignore
