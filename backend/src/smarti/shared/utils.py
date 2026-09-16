# smarti/shared/utils.py

import logging
import secrets
from datetime import UTC, datetime
from difflib import SequenceMatcher, get_close_matches
from typing import Any

logger = logging.getLogger(__name__)


def ensure_datetime(value: Any) -> Any:
    """Stellt sicher, dass datetime-Werte timezone-aware sind."""
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value)
    return value


def short_id(length: int = 8) -> str:
    """Generate a short, URL-safe ID with secrets."""
    num_bytes = max(1, int(length * 3 / 4))
    token = secrets.token_urlsafe(num_bytes)
    return token[:length]


def normalize_string(text):
    # 1. Leerzeichen entfernen (trimmen)
    text = text.strip()

    # 2. Alle Leerzeichen im String entfernen (für "add ieren")
    text = text.replace(" ", "")

    # 3. Alles in Kleinbuchstaben umwandeln
    text = text.lower()

    # 5. Ersten Buchstaben großschreiben
    text = text.capitalize()

    return text


def normalize_fuzzy(text, target="addieren") -> str:
    # Bereinigen
    text = text.lower().replace(" ", "")

    # Ähnlichste Übereinstimmung finden
    matches = get_close_matches(text, [target], cutoff=0.6)

    if matches:
        return matches[0].capitalize()
    return text.capitalize()


def cluster_similar_words(words: list) -> list:
    """Gruppiert ähnliche Wörter und wählt den häufigsten als Standard
    # Test
    words = ["Addieren", "addieren", "Subtrahieren", "Subtrahieren", "Minus", "adieren"]
    result = cluster_similar_words(words)
    print(result)  # ['Addieren', 'Subtrahieren', 'Minus']
    """
    from collections import Counter

    # Bereinigen
    clean_words = [w.lower().strip().replace(" ", "") for w in words]

    # Gruppiere ähnliche Wörter
    groups = []
    used = set()

    for i, w1 in enumerate(clean_words):
        if i in used:
            continue

        # Finde alle ähnlichen Wörter
        group = [w1]
        used.add(i)

        for j, w2 in enumerate(clean_words):
            if j not in used and SequenceMatcher(None, w1, w2).ratio() > 0.6:
                group.append(w2)
                used.add(j)

        groups.append(group)

    # Für jede Gruppe: häufigste Variante als Standard nehmen
    result = []
    for group in groups:
        # Zähle Häufigkeit der Originalwörter (mit Großschreibung)
        original_variants = [
            w for idx, w in enumerate(words) if clean_words[idx] in group
        ]
        most_common = Counter(original_variants).most_common(1)[0][0]
        # Normalisiere Großschreibung
        result.append(most_common.capitalize())

    return result

