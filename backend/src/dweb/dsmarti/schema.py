# smarti_django/dj_lms/schema.py
"""API schema definitions for global."""

from ninja import Schema


class EmptyBody(Schema):
    pass


class ErrorItem(Schema):
    message: str
    code: str | None = None
    field: str | None = None


class ErrorResponse(Schema):
    errors: list[ErrorItem]
