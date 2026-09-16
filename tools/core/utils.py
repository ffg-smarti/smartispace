# tools/core/utils.py

import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

import psutil
import typer

HERE = Path(__file__).resolve().parent.parent.parent


def _run(cmd: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess:
    typer.echo(f"  -> {' '.join(str(c) for c in cmd)}")
    return subprocess.run(cmd, cwd=cwd, check=True)


def _check_command(name: str) -> bool:
    return shutil.which(name) is not None


def _find_processes_by_cwd(name: str, work_dir: str) -> list[psutil.Process]:
    result = []
    for proc in psutil.process_iter(["pid", "name", "cwd"]):
        try:
            proc_name = proc.info["name"] or ""
            if name.lower() in proc_name.lower():
                cwd = proc.info["cwd"] or ""
                if work_dir.lower() in cwd.lower():
                    result.append(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return result


def _health_check(
    url: str, timeout: int = 3, retries: int = 1, delay: int = 2
) -> tuple[bool, int | None]:
    """Prueft ob ein HTTP-Endpunkt erreichbar ist.

    Wiederholt den Request bis zu `retries`-mal mit `delay` Sekunden Pause.
    Gibt (True, HTTP-Statuscode) oder (False, None) zurueck.
    """
    import time

    for attempt in range(retries):
        try:
            resp = urllib.request.urlopen(url, timeout=timeout)
            return (True, resp.status)
        except urllib.error.HTTPError as e:
            # Server antwortet, aber mit Fehler (z.B. 500) – gilt als erreichbar
            return (True, e.code)
        except (urllib.error.URLError, OSError):
            if attempt < retries - 1:
                time.sleep(delay)
                continue
            return (False, None)
    return (False, None)


def _detach_popen_kwargs() -> dict:
    if sys.platform == "win32":
        return {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    return {"start_new_session": True}
