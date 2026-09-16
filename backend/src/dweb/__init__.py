# dweb/__init__.py
# Django Application Layer — siehe workspace.md §Django Fein-Struktur.
# Celery-App wird vom Django-Projekt dsmarti bereitgestellt.
from .dsmarti.celery import app as celery_app  # noqa: F401