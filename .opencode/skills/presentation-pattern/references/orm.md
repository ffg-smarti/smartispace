# SMARTi Backend Code Templates (Coder) - Presentation

Konkrete, implementierungsfertige Code-Templates presentation Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/dweb/dj_<context>/models.py`.

**Prinzipien/Patterns** (nicht hier dupliziert):
- ORM↔Domain-Übersetzung → `../infra-pattern/references/adapters.md` (Repository, Infra-Mapper)
- ID-Referenzen zwischen Contexts (kein ForeignKey) → `shared/naming-conventions.md`

---

## Presentation Layer — Django

### ORM Model

Dünnes Persistenzmodell — nur Felder, kein Business-Code. Die Übersetzung zwischen ORM und Domain owns der Infra-Mapper, nicht das Modell.

```python
# dweb/dj_{{context}}/models.py
import uuid
from django.db import models

class {{AggregateRoot}}Model(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account_id = models.UUIDField(db_index=True)  # Kein ForeignKey — nur ID-Referenz
    {{field}} = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "dj_{{context}}"
        db_table = "{{context}}_{{aggregate_root_snake}}"
```

#### Regeln

1. `account_id` als `UUIDField` mit `db_index=True` — kein `ForeignKey` über Context-Grenzen, nur ID-Referenz.
2. `app_label = "dj_{{context}}"` und `db_table` immer setzen.
3. Kein Business-Code im Modell — keine Methoden mit Fachlogik, keine Signal-Handler mit Kaskaden.
4. Neue Felder → Migration erzeugen; Domain-Übersetzung im Infra-Mapper nachziehen.

#### Anti-Pattern

```python
# ANTI-PATTERN: ForeignKey über Context-Grenze + Logik im Modell
class {{AggregateRoot}}Model(models.Model):
    account = models.ForeignKey("dj_account.AccountModel", on_delete=models.CASCADE)  # kein Cross-Context-Join!

    def approve(self):  # Fachlogik gehört in Domain/Application, nicht ins ORM-Modell
        self.status = "approved"
        self.save()
```

### Hinweise zur Nutzung

```python
# Lesen/Schreiben nur über Infra-Adapter (Repository / QueryService),
# nie direkt aus Handler oder Endpoint:
# repo.find_by_id(...) / repo.create(...) statt {{AggregateRoot}}Model.objects.get(...)
```
