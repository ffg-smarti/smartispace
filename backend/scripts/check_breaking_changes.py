#!/usr/bin/env python3
"""Prüft das OpenAPI-Schema auf Breaking Changes gegen die Baseline (main).

Wird von .github/workflows/schema-contract.yml (Job: breaking-change-detection)
aufgerufen. Erwartet zwei Dateien im aktuellen Verzeichnis:
  - openapi.json            (neues Schema, aus dem CI-Artefakt)
  - openapi.baseline.json   (Schema von main)

Exit-Code 0 = keine Breaking Changes, 1 = Breaking Changes gefunden.
"""

import json
import sys


def main() -> int:
    with open("openapi.json") as f:
        new_schema = json.load(f)

    with open("openapi.baseline.json") as f:
        old_schema = json.load(f)

    if not old_schema.get("paths"):
        print("No baseline schema found, skipping breaking change check")
        return 0

    breaking_changes: list[str] = []

    # 1. Removed endpoints
    old_paths = set(old_schema.get("paths", {}).keys())
    new_paths = set(new_schema.get("paths", {}).keys())
    for path in sorted(old_paths - new_paths):
        breaking_changes.append(f"REMOVED ENDPOINT: {path}")

    # 2. Removed operations on existing paths
    for path in sorted(old_paths & new_paths):
        old_ops = set(old_schema["paths"][path].keys())
        new_ops = set(new_schema["paths"][path].keys())
        for op in sorted(old_ops - new_ops):
            breaking_changes.append(f"REMOVED OPERATION: {op.upper()} {path}")

    # 3. Added required parameters — tiefere Schema-Vergleiche sind hier bewusst
    #    ausgelassen; sie gehören in die API-Contract-Tests (Schemathesis).

    if breaking_changes:
        print("::error::BREAKING CHANGES DETECTED:")
        for change in breaking_changes:
            print(f"  - {change}")
        return 1

    print("✅ No breaking changes detected")
    return 0


if __name__ == "__main__":
    sys.exit(main())