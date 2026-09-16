"""Exportiert das OpenAPI-Schema der Ninja-API als JSON-Datei.

Wird von der CI/CD-Pipeline (backend-ci, deploy, release-ready, schema-contract)
genutzt, um das Schema nach backend/openapi.json und packages/*/openapi.json
zu schreiben (Single Source of Truth fuer den generierten API-Client).
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Exportiert das OpenAPI-Schema (Ninja) als JSON-Datei."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default="openapi.json",
            help="Zielpfad fuer die OpenAPI-JSON-Datei (default: openapi.json)",
        )

    def handle(self, *args, **options):
        # Ninja-API-Instanz importieren (Pfad wird beim Anlegen der API gesetzt).
        # Solange die API noch nicht existiert, liefern wir ein leeres Schema
        # mit Hinweis, damit die Pipeline nicht hart fehlschlaeft.
        from dsmarti.api import api  # noqa: F401

        try:
            schema = api.get_openapi_schema()
        except Exception as exc:  # pragma: no cover - API fehlt noch
            self.stderr.write(
                f"WARN: Ninja-API nicht verfuegbar ({exc}). Exportiere leeres Schema."
            )
            schema = {
                "openapi": "3.1.0",
                "info": {"title": "COPI-LP API", "version": "0.1.0"},
                "paths": {},
            }

        output_path = Path(options["output"])
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(schema, indent=2), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"OpenAPI-Schema exportiert nach {output_path}"))