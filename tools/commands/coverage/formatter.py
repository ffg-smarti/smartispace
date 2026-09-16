# tools/commands/coverage/formatter.py
"""Formatter für Markdown Coverage Report."""

from datetime import datetime
from pathlib import Path

from .analyzer import CoverageData, get_coverage_status, get_coverage_summary


def format_report(data: CoverageData) -> str:
    """
    Formatiert die Coverage-Daten als Markdown.

    Args:
        data: Die Coverage-Daten

    Returns:
        Markdown-String
    """
    lines = []
    lines.append("# Coverage\n")

    from collections import defaultdict

    reqs_by_domain = defaultdict(list)
    for req_id, req in data.requirements.items():
        impl, tested = get_coverage_status(req_id, data)
        reqs_by_domain[req.domain].append((req_id, impl, tested))

    for domain in sorted(reqs_by_domain.keys()):
        lines.append(f"\n## {domain}")
        lines.append("| Req-ID | implemented | tested |")
        lines.append("|--------|------------|--------|")
        for req_id, impl, tested in sorted(reqs_by_domain[domain], key=lambda x: x[0]):
            impl_status = "ja" if impl else "nein"
            test_status = "ja" if tested else "nein"
            lines.append(f"| {req_id} | {impl_status} | {test_status} |")

    lines.append("")
    lines.append("## Coverage Details\n")

    from collections import defaultdict

    impl_by_domain = defaultdict(lambda: defaultdict(list))
    for req_id in data.implemented.keys():
        for ref in data.implemented[req_id]:
            impl_by_domain[ref.domain][ref.layer].append((req_id, ref))

    for domain in sorted(impl_by_domain.keys()):
        lines.append(f"\n### {domain}")
        for layer in sorted(impl_by_domain[domain].keys()):
            lines.append(f"\n#### {layer}")
            lines.append("| Req-ID | filename.py | ln. ### |")
            lines.append("|--------|--------------|---------|")
            for req_id, ref in sorted(
                impl_by_domain[domain][layer], key=lambda x: (x[0], x[1].line_number)
            ):
                filename = ref.file_path.name
                lines.append(f"| {req_id} | {filename} | ln. {ref.line_number} |")

    lines.append("\n### tested")
    tested_by_domain = defaultdict(lambda: defaultdict(list))
    for req_id in data.tested.keys():
        for ref in data.tested[req_id]:
            tested_by_domain[ref.domain][ref.layer].append((req_id, ref))

    for domain in sorted(tested_by_domain.keys()):
        lines.append(f"\n#### {domain}")
        for layer in sorted(tested_by_domain[domain].keys()):
            lines.append(f"\n##### {layer}")
            lines.append("| Req-ID | test_filename.py | test_name |")
            lines.append("|--------|-----------------|----------|")
            for req_id, ref in sorted(
                tested_by_domain[domain][layer], key=lambda x: (x[0], x[1].line_number)
            ):
                filename = ref.file_path.name
                test_name = ref.symbol_name
                lines.append(f"| {req_id} | {filename} | {test_name} |")

    lines.append("# Unspecified Code")

    from collections import defaultdict

    unspecified_by_domain = defaultdict(lambda: defaultdict(list))

    unspecified_sorted = sorted(
        data.unspecified,
        key=lambda x: (x.domain, x.layer, str(x.file_path), x.line_number),
    )

    for sym in unspecified_sorted:
        key = (str(sym.file_path), sym.symbol_name, sym.symbol_type)
        if key in [
            (s.file_path, s.symbol_name, s.symbol_type)
            for s in unspecified_by_domain[sym.domain][sym.layer]
        ]:
            continue
        unspecified_by_domain[sym.domain][sym.layer].append(sym)

    for domain in sorted(unspecified_by_domain.keys()):
        lines.append(f"\n## {domain}")
        for layer in sorted(unspecified_by_domain[domain].keys()):
            lines.append(f"\n### {layer}")
            lines.append("| filename.py | SymbolName | type |")
            lines.append("|-------------|------------|------|")

            for sym in sorted(
                unspecified_by_domain[domain][layer],
                key=lambda x: (str(x.file_path), x.line_number),
            ):
                filename = sym.file_path.name
                symbol_type = sym.symbol_type
                lines.append(f"| {filename} | {sym.symbol_name} | {symbol_type} |")

    summary = get_coverage_summary(data)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines.insert(1, f"*Generated: {timestamp}*\n")
    lines.insert(
        2,
        f"- Total: {summary['total']} | Implemented: {summary['implemented']} ({summary['implemented_pct']}%) | Tested: {summary['tested']} ({summary['tested_pct']}%)\n",
    )

    return "\n".join(lines)


def write_report(data: CoverageData, output_path: str = "build/coverage.md") -> None:
    """
    Schreibt den Coverage-Report in eine Markdown-Datei.

    Args:
        data: Die Coverage-Daten
        output_path: Pfad für die Ausgabedatei
    """
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    report = format_report(data)
    output.write_text(report, encoding="utf-8")
