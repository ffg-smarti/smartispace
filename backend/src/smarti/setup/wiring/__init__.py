# smarti/setup/wiring/__init__.py
"""Wiring registry: maps each bus to its per-context wiring functions.

Order is significant and mirrors the previous Bootstrap call order.
All wiring functions are pure module-level functions with lazy
(context-local) imports — importing this package has no side effects.
"""

from .account_wire import (
    wire_account_async_events,
    wire_account_commands,
    wire_account_events,
)
from .content_wire import wire_content_commands, wire_content_events
from .notification_wire import wire_notification_commands, wire_notification_events
from .plan_wire import (
    wire_learnpath_commands,
    wire_learnpath_queries,
    wire_learnplan_commands,
    wire_learnplan_queries,
    wire_plan_async_events,
    wire_plan_events,
)
from .profiles_wire import (
    wire_learning_pace_events,
    wire_profile_commands,
    wire_profile_events,
)
from .report_wire import wire_report_commands, wire_report_events
from .session_wire import (
    wire_session_async_events,
    wire_session_commands,
    wire_session_events,
)

COMMAND_WIRINGS = [
    wire_profile_commands,
    wire_account_commands,
    wire_learnplan_commands,
    wire_learnpath_commands,
    wire_content_commands,
    wire_session_commands,
    wire_report_commands,
    wire_notification_commands,
]

QUERY_WIRINGS = [
    wire_learnplan_queries,
    wire_learnpath_queries,
]

EVENT_WIRINGS = [
    wire_account_events,
    wire_profile_events,
    wire_session_events,
    wire_plan_events,
    wire_content_events,
    wire_report_events,
    wire_learning_pace_events,
    wire_notification_events,
]

ASYNC_EVENT_WIRINGS = [
    wire_account_async_events,
    wire_session_async_events,
    wire_plan_async_events,
]

__all__ = [
    "ASYNC_EVENT_WIRINGS",
    "COMMAND_WIRINGS",
    "EVENT_WIRINGS",
    "QUERY_WIRINGS",
]
