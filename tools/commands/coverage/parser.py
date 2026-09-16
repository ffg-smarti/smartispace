# tools/commands/coverage/parser.py
"""Parser für StrictDoc Spec-Dateien."""

import re
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Requirement:
    """Eine Anforderung mit ID, Status und Datei."""

    req_id: str
    status: str
    spec_file: str

    @property
    def domain(self) -> str:
        """Extrahiert die Domain aus der REQ-ID."""
        parts = self.req_id.split("-")
        if len(parts) >= 2:
            return parts[1]
        return "unknown"


@dataclass
class SpecFile:
    """Eine Spec-Datei mit allen Anforderungen."""

    file_path: Path
    prefix: str
    requirements: list[Requirement] = field(default_factory=list)


def parse_spec_files(specs_dir: str = "specs/") -> Iterator[SpecFile]:
    """
    Parst alle Markdown-Spec-Dateien und extrahiert Anforderungen.

    Args:
        specs_dir: Pfad zum Specs-Verzeichnis

    Yields:
        SpecFile-Objekte mit allen gefundenen Anforderungen
    """
    specs_path = Path(specs_dir)
    if not specs_path.exists():
        return

    for md_file in sorted(specs_path.rglob("*.md")):
        if md_file.name.startswith("."):
            continue
        spec_file = parse_spec_file(md_file)
        if spec_file.requirements:
            yield spec_file


def parse_spec_file(file_path: Path) -> SpecFile:
    """
    Parst eine einzelne Spec-Datei.

    Args:
        file_path: Pfad zur Markdown-Datei

    Returns:
        SpecFile mit allen gefundenen Anforderungen
    """
    content = file_path.read_text(encoding="utf-8")

    prefix = extract_prefix(content)
    requirements = extract_requirements(content, str(file_path))

    return SpecFile(file_path=file_path, prefix=prefix, requirements=requirements)


def extract_prefix(content: str) -> str:
    """Extrahiert das REQ-Präfix aus dem Header."""
    match = re.search(r"REQ-Präfix:\s*`?([A-Z0-9\-]+)`?", content)
    if match:
        return match.group(1)
    match = re.search(r"^#\s+\w+.*?—\s+Spec", content, re.MULTILINE)
    if match:
        return ""
    return ""


def extract_requirements(content: str, file_path: str) -> list[Requirement]:
    """
    Extrahiert alle Anforderungen aus dem Markdown-Content.

    Sucht nach Tabellen mit REQ-IDs und Status.
    """
    requirements = []

    in_table = False
    table_lines = []

    for line in content.split("\n"):
        line = line.strip()

        if line.startswith("|") and "REQ-" in line:
            in_table = True
            table_lines.append(line)
        elif in_table and line.startswith("|"):
            table_lines.append(line)
        elif in_table:
            table_requirements = parse_req_table(table_lines)
            for req_id, status in table_requirements:
                requirements.append(
                    Requirement(req_id=req_id, status=status, spec_file=file_path)
                )
            in_table = False
            table_lines = []

    if in_table and table_lines:
        table_requirements = parse_req_table(table_lines)
        for req_id, status in table_requirements:
            requirements.append(
                Requirement(req_id=req_id, status=status, spec_file=file_path)
            )

    return requirements


def parse_req_table(table_lines: list[str]) -> list[tuple[str, str]]:
    """
    Parst eine Requirement-Tabelle.

    Args:
        table_lines: Zeilen der Markdown-Tabelle

    Returns:
        Liste von (REQ-ID, Status)-Tupeln
    """
    results = []

    req_pattern = re.compile(r"(REQ-[A-Z]+-[A-Z0-9\-]+-\d+)")
    status_pattern = re.compile(r"(APPROVED|DRAFT|REVIEW|REJECTED)")

    for line in table_lines:
        req_match = req_pattern.search(line)
        status_match = status_pattern.search(line)

        if req_match:
            req_id = req_match.group(1)
            status = status_match.group(1) if status_match else "UNKNOWN"
            results.append((req_id, status))

    return results


def get_all_requirements(specs_dir: str = "specs/") -> dict[str, Requirement]:
    """
    Sammelt alle Anforderungen aus allen Spec-Dateien.

    Args:
        specs_dir: Pfad zum Specs-Verzeichnis

    Returns:
        Dictionary mit REQ-ID als Key und Requirement als Value
    """
    all_reqs = {}

    for spec_file in parse_spec_files(specs_dir):
        for req in spec_file.requirements:
            all_reqs[req.req_id] = req

    return all_reqs
