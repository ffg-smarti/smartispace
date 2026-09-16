# cli.py
import os
from pathlib import Path


def _load_env_file(filepath: Path, override: bool = False):
    if not filepath.exists():
        return
    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip()
            if override:
                os.environ[key] = val
            else:
                os.environ.setdefault(key, val)


# build_config.env wird zuerst geladen (Vorgaben, koennen von secrets ueberschrieben werden)
_proj_root = None
for parent in [Path.cwd()] + list(Path.cwd().parents):
    candidate = parent / "build_config.env"
    if candidate.exists():
        _proj_root = parent
        _load_env_file(candidate)
        break

# secrets.env ueberschreibt bei Konflikten
if _proj_root:
    _load_env_file(_proj_root / "secrets.env", override=True)

from tools.commands import app

if __name__ == "__main__":
    app()
