# smarti/shared/infra/adapter/uow.py

from abc import abstractmethod
from copy import deepcopy
from typing import Any, Generic, TypeVar

########################################################################################
#                           --- Fake Repository ---                                   #
########################################################################################

ID = TypeVar("ID")
T = TypeVar("T")

class FakeRepoMixin(Generic[T, ID]):
    """
    Mixin für Fake Repositories mit In-Memory Speicherung.

    Keine eigene __init__ — Initialisierung über _init_fake_store().
    Bietet gemeinsame Funktionalität für Index-Management, Tracking und CRUD.
    """

    def _init_fake_store(self) -> None:
        """Initialisiert den In-Memory-Speicher und die Test-Metriken."""
        self._store: dict[ID, T] = {}
        self._indexes: dict[str, dict[Any, list[ID]]] = {}
        self._save_calls: list[T] = []
        self._delete_calls: list[ID] = []
        self.update_ctr = 0
        self.create_ctr = 0
        self.delete_ctr = 0

    @abstractmethod
    def _get_index_keys(self, aggregate: T) -> dict[str, Any]:
        """
        Gibt Index-Schlüssel für das Aggregate zurück.

        Returns:
            Dictionary mit Index-Namen als Keys und Index-Werten als Values
            z.B.: {"creator_id": aggregate.creator_id, "child_id": aggregate.child_id}
        """
        pass

    # BASIS-IMPLEMENTIERUNGEN
    def add(self, aggregate: T) -> None:
        """
        Fügt Aggregate zum Fake-Repository hinzu (für Test-Setup).

        Unterschied zu save():
        - add(): Test-Setup, zählt nicht in _save_calls
        - save(): Von UseCase aufgerufen, zählt in _save_calls
        """
        aggregate_copy = deepcopy(aggregate)  # Defensive Copy
        aggregate_id = aggregate.identifier  # type: ignore

        # In Hauptspeicher
        self._store[aggregate_id] = aggregate_copy

        # Indizes aktualisieren
        self._update_indexes(aggregate_copy)

    def clear(self) -> None:
        """Leert das Repository (für Test-Isolation)"""
        self._store.clear()
        for index_name in self._indexes:
            self._indexes[index_name].clear()
        self._save_calls.clear()
        self._delete_calls.clear()
        self.update_ctr = 0
        self.create_ctr = 0
        self.delete_ctr = 0

    def _save(self, aggregate: T) -> None:
        """
        Speichert Aggregat im In-Memory Store.
        Trackt den Aufruf für Test-Assertions.
        """
        # Tracking für Tests
        self._save_calls.append(deepcopy(aggregate))

        aggregate_id = aggregate.identifier  # type: ignore

        # Alte Indizes entfernen (falls Update)
        old_aggregate = self._store.get(aggregate_id)
        if old_aggregate:
            self._remove_from_indexes(old_aggregate)

        # Eigentliches Speichern
        self._store[aggregate_id] = deepcopy(aggregate)

        # Neue Indizes hinzufügen
        self._update_indexes(aggregate)

    def _update_indexes(self, aggregate: T) -> None:
        """Fügt Aggregat zu allen Indizes hinzu."""
        aggregate_id = aggregate.identifier  # type: ignore
        index_keys = self._get_index_keys(aggregate)
        for index_name, index_value in index_keys.items():
            if index_value is None:
                continue
            # Index-Dictionary initialisieren falls nötig
            if index_name not in self._indexes:
                self._indexes[index_name] = {}

            # Index-Wert Liste initialisieren falls nötig
            if index_value not in self._indexes[index_name]:
                self._indexes[index_name][index_value] = []

            # Nur hinzufügen wenn nicht schon vorhanden
            if aggregate_id not in self._indexes[index_name][index_value]:
                self._indexes[index_name][index_value].append(aggregate_id)

    def _remove_from_indexes(self, aggregate: T) -> None:
        """Entfernt Aggregate aus allen Indizes."""
        aggregate_id = aggregate.identifier  # type: ignore
        index_keys = self._get_index_keys(aggregate)
        for index_name, index_value in index_keys.items():
            if index_value is None:
                continue
            if (
                index_name in self._indexes
                and index_value in self._indexes[index_name]
                and aggregate_id in self._indexes[index_name][index_value]
            ):
                self._indexes[index_name][index_value].remove(aggregate_id)

                # Leere Liste entfernen
                if not self._indexes[index_name][index_value]:
                    del self._indexes[index_name][index_value]

    def _get_from_index(self, index_name: str, index_value: Any) -> list[T]:
        """
        Holt alle Aggregate aus einem bestimmten Index.

        Args:
            index_name: Name des Index
            index_value: Wert im Index

        Returns:
            Liste der gefundenen Aggregate (Kopien)
        """
        if index_name not in self._indexes or index_value not in self._indexes[index_name]:
            return []
        result = []
        for aggregate_id in self._indexes[index_name][index_value]:
            aggregate = self._store.get(aggregate_id)
            if aggregate:
                result.append(deepcopy(aggregate))
        return result

    def _get_all_from_index(self, index_name: str) -> list[T]:
        """
        Holt alle Aggregate aus einem Index (alle Werte).

        Args:
            index_name: Name des Index

        Returns:
            Liste aller Aggregate im Index
        """
        if index_name not in self._indexes:
            return []
        result = []
        for index_value in self._indexes[index_name]:
            result.extend(self._get_from_index(index_name, index_value))
        return result

    # HILFSMETHODEN FÜR TESTS
    def get_all_aggregates(self) -> list[T]:
        """Gibt alle Aggregate zurück (für Tests)"""
        return [deepcopy(aggregate) for aggregate in self._store.values()]

    def get_save_calls(self) -> list[T]:
        """Gibt Historie aller save() Aufrufe zurück"""
        return [deepcopy(aggregate) for aggregate in self._save_calls]

    def get_delete_calls(self) -> list[ID]:
        """Gibt Historie aller delete() Aufrufe zurück"""
        return self._delete_calls.copy()

    def reset_counters(self) -> None:
        """Setzt alle Zähler zurück"""
        self.update_ctr = 0
        self.create_ctr = 0
        self.delete_ctr = 0
