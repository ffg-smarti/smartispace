# tools/commands/coverage/scanner.py
"""Scanner für Code und Tests - sucht nach :req: Docstrings."""

import re
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path


@dataclass
class CodeReference:
    """Eine Referenz auf Code mit REQ-Tag."""

    file_path: Path
    line_number: int
    symbol_name: str
    symbol_type: str
    req_ids: list[str]

    @property
    def domain(self) -> str:
        """Extrahiert die Domain aus dem Pfad."""
        parts = self.file_path.parts
        if "smarti" in parts:
            idx = parts.index("smarti")
            if idx + 1 < len(parts):
                return parts[idx + 1]
        return "unknown"

    @property
    def layer(self) -> str:
        """Extrahiert die Schicht aus dem Pfad."""
        parts = self.file_path.parts
        for layer in ["domain", "application", "infra"]:
            if layer in parts:
                return layer
        return "other"


@dataclass
class SymbolReference:
    """Ein Symbol (Klasse/Funktion) ohne REQ-Tag."""

    file_path: Path
    line_number: int
    symbol_name: str
    symbol_type: str
    has_docstring: bool

    @property
    def domain(self) -> str:
        """Extrahiert die Domain aus dem Pfad."""
        parts = self.file_path.parts
        if "smarti" in parts:
            idx = parts.index("smarti")
            if idx + 1 < len(parts):
                return parts[idx + 1]
        return "unknown"

    @property
    def layer(self) -> str:
        """Extrahiert die Schicht aus dem Pfad."""
        parts = self.file_path.parts
        for layer in ["domain", "application", "infra"]:
            if layer in parts:
                return layer
        return "other"


REQ_TAG_PATTERN = re.compile(r":req:\s*([A-Z0-9\-,\s]+)")
RANGE_PATTERN = re.compile(r"(\d+)\s+bis\s+([A-Z0-9\-]+)-(\d+)")


def scan_directory(
    src_dir: str = "src/", test_dir: str = "tests/"
) -> dict[str, set[str]]:
    """
    Scannt src/ und tests/ nach :req: Tags.

    Returns:
        Dict mit 'implemented' und 'tested' Sets von REQ-IDs
    """
    implemented = set()
    tested = set()

    for ref in scan_for_references(src_dir):
        implemented.update(ref.req_ids)

    for ref in scan_for_references(test_dir):
        tested.update(ref.req_ids)

    return {"implemented": implemented, "tested": tested}


def scan_for_references(directory: str) -> Iterator[CodeReference]:
    """
    Scannt ein Verzeichnis nach Python-Dateien mit :req: Tags.

    Args:
        directory: Pfad zum Verzeichnis

    Yields:
        CodeReference-Objekte mit allen gefundenen REQ-IDs
    """
    dir_path = Path(directory)
    if not dir_path.exists():
        return

    for py_file in sorted(dir_path.rglob("*.py")):
        if py_file.name.startswith("."):
            continue
        yield from scan_file(py_file)


def scan_file(file_path: Path) -> Iterator[CodeReference]:
    """
    Scannt eine Python-Datei nach :req: Tags.

    Args:
        file_path: Pfad zur Python-Datei

    Yields:
        CodeReference-Objekte mit allen gefundenen REQ-IDs
    """
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    in_function = False
    in_class = False
    current_function = ""
    current_class = ""

    func_or_class_pattern = re.compile(r"^(?:async\s+)?(?:def|class)\s+(\w+)")

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        if stripped.startswith("def ") or stripped.startswith("async def "):
            in_function = True
            in_class = False
            match = func_or_class_pattern.match(stripped)
            if match:
                current_function = match.group(1)
                current_class = ""

        elif stripped.startswith("class "):
            in_class = True
            in_function = False
            match = func_or_class_pattern.match(stripped)
            if match:
                current_class = match.group(1)
                current_function = ""

        if ":req:" in stripped:
            req_ids = extract_req_ids(stripped)

            if in_function:
                yield CodeReference(
                    file_path=file_path,
                    line_number=i,
                    symbol_name=current_function,
                    symbol_type="function",
                    req_ids=req_ids,
                )
            elif in_class:
                yield CodeReference(
                    file_path=file_path,
                    line_number=i,
                    symbol_name=current_class,
                    symbol_type="class",
                    req_ids=req_ids,
                )


def extract_req_ids(text: str) -> list[str]:
    """
    Extrahiert REQ-IDs aus einem Text mit :req: Tag.

    Unterstützt:
    - Einzelne IDs: REQ-FOO-001
    - Komma-getrennt: REQ-FOO-001, REQ-FOO-002
    - Bereiche: REQ-FOO-001 bis REQ-FOO-010

    Args:
        text: Text mit :req: Tag

    Returns:
        Liste von REQ-IDs
    """
    req_ids = []

    match = REQ_TAG_PATTERN.search(text)
    if not match:
        return req_ids

    content = match.group(1).strip()

    range_match = RANGE_PATTERN.search(content)
    if range_match:
        prefix = range_match.group(2)
        start = int(range_match.group(1))
        end = int(range_match.group(3))
        for i in range(start, end + 1):
            req_ids.append(f"{prefix}-{i:03d}")

    parts = content.split(",")
    for part in parts:
        part = part.strip()
        part = RANGE_PATTERN.sub("", part)
        if not part:
            continue

        single_pattern = re.compile(r"(REQ-[A-Z]+-[A-Z0-9\-]+-\d+)")
        single_match = single_pattern.search(part)
        if single_match:
            req_id = single_match.group(1)
            if req_id not in req_ids:
                req_ids.append(req_id)

    return req_ids


def scan_for_unspecified(directory: str) -> Iterator[SymbolReference]:
    """
    Scannt ein Verzeichnis nach Symbolen ohne :req: Tag.

    Args:
        directory: Pfad zum Verzeichnis

    Yields:
        SymbolReference-Objekte für alle Klassen und Funktionen
    """
    dir_path = Path(directory)
    if not dir_path.exists():
        return

    for py_file in sorted(dir_path.rglob("*.py")):
        if py_file.name.startswith(".") or py_file.name == "__init__.py":
            continue
        yield from scan_file_for_symbols(py_file)


def scan_file_for_symbols(file_path: Path) -> Iterator[SymbolReference]:
    """
    Scannt eine Python-Datei nach allen Klassen und Funktionen.

    Args:
        file_path: Pfad zur Python-Datei

    Yields:
        SymbolReference-Objekte für alle Symbol
    """
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    in_class = False
    in_function = False
    current_class = ""
    current_function = ""
    current_class_line = 0
    current_function_line = 0
    has_class_docstring = False
    has_function_docstring = False

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        if stripped.startswith("class "):
            if in_class and current_class:
                yield SymbolReference(
                    file_path=file_path,
                    line_number=current_class_line,
                    symbol_name=current_class,
                    symbol_type="class",
                    has_docstring=has_class_docstring,
                )
            in_class = True
            in_function = False
            current_class = stripped.split()[1].rstrip(":")
            current_class_line = i
            has_class_docstring = False

        elif stripped.startswith("def ") or stripped.startswith("async def "):
            func_name = stripped.split("(")[0].split()[-1]
            if func_name.startswith("__") and func_name.endswith("__"):
                continue
            if in_function and current_function:
                yield SymbolReference(
                    file_path=file_path,
                    line_number=current_function_line,
                    symbol_name=current_function,
                    symbol_type="function",
                    has_docstring=has_function_docstring,
                )
            in_function = True
            current_function = func_name
            current_function_line = i
            has_function_docstring = False

        if in_class and ":req:" not in stripped and stripped.startswith('"""'):
            has_class_docstring = True
        if in_function and ":req:" not in stripped and stripped.startswith('"""'):
            has_function_docstring = True

    if in_class and current_class:
        yield SymbolReference(
            file_path=file_path,
            line_number=current_class_line,
            symbol_name=current_class,
            symbol_type="class",
            has_docstring=has_class_docstring,
        )
    if in_function and current_function:
        yield SymbolReference(
            file_path=file_path,
            line_number=current_function_line,
            symbol_name=current_function,
            symbol_type="function",
            has_docstring=has_function_docstring,
        )


def yield_symbol(
    file_path: Path, name: str, line: int, symbol_type: str, has_docstring: bool
) -> Iterator[SymbolReference]:
    """Yield-Helper für SymbolReference."""
    yield SymbolReference(
        file_path=file_path,
        line_number=line,
        symbol_name=name,
        symbol_type=symbol_type,
        has_docstring=has_docstring,
    )
