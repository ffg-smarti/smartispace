# SMARTi Backend Code Templates (Coder) - Infrastructure

Konkrete, implementierungsfertige Code-Templates infrastructure Schicht. **Für Coder**. Platzhalter in `{{doppelten Krammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/infra/acl.py`.

---

## Infrastructure Layer

### ACL (Anti-Corruption Layer)

**ACL übersetzt externe Modelle in die interne Domain-Sprache.** ACL orchestriert KEINE Kaskaden-Operationen und entscheidet NICHT über Sync/Async Events.

```python
# smarti/{{context}}/infra/adapters/acl.py
class SessionACL:
    """Anti-Corruption Layer — übersetzt Session-Events in Plan-Konzepte."""
    def handle_session_completed(self, event: SessionCompleted) -> None:
        command = UpdateStationProgressCommand(
            station_id=StationId(event.station_id),
            progress=StationProgress(event.score),
        )
        self._command_bus.dispatch(command)
```

**Wann ACL verwenden?**
- Zwischen zwei Bounded Contexts mit unterschiedlichen Modellen
- Übersetzung externer Datenstrukturen in interne Domain-Modelle
- Schutz der Domain vor externen Inkompatibilitäten

**Wann NICHT ACL verwenden?**
- Kaskaden-Operationen zwischen Aggregates → Sync-Event (gleicher Context) oder Async-Event + DeadLetterStore (verschiedene Contexts)
- Event-Orchestrierung → Domain Events + UoW
- Model-Übersetzung innerhalb eines Contexts → Repository Mapper

### Sync vs. Async Events — Entscheidungsbaum (Infrastructure)

```
Fachliche Abhängigkeit zwischen Aggregates?
├── Ja, gleicher Bounded Context / gleiche DB → SyncDomainEvent
│   → DomainEventDispatcher → Transaction-Rollback bei Fehler
│   → Beispiel: Account gelöscht → Profile gelöscht
├── Ja, verschiedene Bounded Contexts → AsyncDomainEvent
│   → CeleryEventDispatcher → DeadLetterStore bei Fehler
│   → Beispiel: Account gelöscht → E-Mail senden
└── Nein, nur Model-Übersetzung nötig → ACL
    → Übersetzt externes Modell in interne Domain-Sprache
    → Beispiel: Externes {status: "completed"} → OrderStatus.COMPLETED
```

### ACL vs. Events vs. Sync — Zusammenfassung

| Muster | Zweck | Kontext | Fehlerbehandlung |
|--------|-------|---------|------------------|
| **Sync-Event** | Atomare Kaskade | Gleicher Context | Exception → Rollback |
| **Async-Event** | Eventual Consistency | Verschiedene Contexts | DeadLetterStore + Retry |
| **ACL** | Model-Übersetzung | Zwischen Contexts | Kein Event — übersetzt Modelle |