"""Celery-Konfiguration (DSMARTI / COPI-LP).

Wird von docker-entrypoint.py und Coolify-Start-Commands referenziert
(`celery -A dsmarti worker ...`). Tasks werden pro Domain in
src/smarti/<domain>/infra/tasks.py definiert (siehe workspace.md).
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dsmarti.settings")

app = Celery("dsmarti")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()