# Backend Stack — Python / Django / Django-Ninja / Pydantic (allgemeine Idiome)

Allgemeines Framework-Wissen. **Keine SMARTi-Base-Klassen** (→ `domain-pattern`/`appl-pattern`/etc.).
Versionen verbindlich: `AGENTS.md` §1.5 (Single Source of Truth).

---

## Python

- Immer `from __future__ import annotations` als erste Import-Zeile (moderne Annotationen, lazy evaluation).
- Keine String-Forward-Referenzen (`-> "Type"`) — bare Typen verwenden (`-> Type`).
- `Self` für `@classmethod`-Factories, die die eigene Klasse zurückgeben.
- Typ-Hints sind Pflicht (mypy-strict-Welt); keine `Any`-Verschleierung von Schichtgrenzen.

## Django

- **ORM statt Raw-SQL** — Ausnahmen nur bei nachweisbarer Notwendigkeit.
- N+1 vermeiden: `select_related()` (FK/O2O) und `prefetch_related()` (M2M/Reverse).
- Indizes auf häufig abgefragte Spalten (`db_index=True` in `Meta`/Feld).
- `ON DELETE CASCADE` wo fachlich korrekt.
- Django-Cache für selten ändernde Daten: `cache.set()`/`cache.get()`.
- Keine Session-Cookies/CSRF im API-Betrieb — **JWT via `django-ninja-jwt`** (Bearer-Token).

## Django-Ninja

- Schemas = `ninja.Schema` (Pydantic v2) — validieren automatisch, **keine manuelle Validierung**.
- Feld-Constraints via `Field(min_length=…, max_length=…)`, `Field(ge=…)` usw.
- Endpoints auf `Router` (ggf. `Router(auth=JWTAuth())`), `operation_id`-Konventionen einhalten.
- Response-Mapping über Status-Code-Dicts: `response={200: ReadDTO, 404: ErrorResponse, ...}`.

## Pydantic (**v2-API**)

- **Nicht v1-API verwenden:**
  - ❌ `class Config: ...` / `orm_mode` → ✅ `model_config = ConfigDict(...)`
  - ❌ `model.dict()` / `obj.copy()` → ✅ `model.model_dump()` / `model.model_copy()`
  - ❌ `@root_validator` / `@validator` → ✅ `@model_validator(mode="before"/"after")` / `@field_validator`
- `ConfigDict(from_attributes=True)` für ORM-Mapping, `ConfigDict(str_strip_whitespace=True)` für Input.
- `Field(..., description="…")` für OpenAPI-Schema-Dokumentation.

## Tests & Linting

- **pytest-django**: Testklassen mit `@pytest.mark.django_db`; pytest statt unittest.
- **ruff**: Linting + Formatierung (flakes8/isort/black-Ersatz). `uv run smarti test lint`.
- Unit-Tests gezielt (kein DB-Zwang pro Test), Coverage via pytest-cov.

## Idiome (verbindlich, aus `AGENTS.md`)

- Strings immer in `"doppelten Anführungszeichen"` — nie einfache.
- Logger via `logger.info("...%s...", variable)` — **keine f-Strings** in Log-Meldungen.
- Jede `.py`-Datei beginnt mit `# <import-path>` (z. B. `# smarti/<ctx>/appl/dtos.py`).

---

## Wichtige Fallstricke

| Problem | Lösung |
|---|---|
| Pydantic-v1-API erzeugt | `model_config = ConfigDict(...)`, `model_dump()`, `field_validator` verwenden |
| Manuelle Validierung im Endpoint | Weglassen — `ninja.Schema` validiert automatisch |
| `csrf_exempt`/Session-Cookie-Denken | Bearer-JWT via `django-ninja-jwt` |
| Raw-SQL | Django ORM verwenden |
| N+1 | `select_related`/`prefetch_related` prüfen |