# smarti/setup/wiring/account_wire.py
from __future__ import annotations

import logging

from smarti.shared.infra.bus.command_bus import CommandBus
from smarti.shared.infra.bus.composite_dispatcher import CompositeEventDispatcher

logger = logging.getLogger(__name__)


def wire_account_commands(bus: CommandBus) -> None:
    """Wire Commands mit den Handlern."""
    logger.debug("Wiring accounts domain")
    # from smarti.account.appl.commands.account_cmd import (
    #     AuthenticateChildCommand,
    #     AuthenticateUserCommand,
    #     ConfirmAccountDeletionCommand,
    #     CreateChildAccountCommand,
    #     CreateGuestAccountCommand,
    #     CreateParentAccountCommand,
    #     DeleteExpiredGuestsCommand,
    #     DeleteGuestAccountCommand,
    #     LogoutCommand,
    #     MarkAccountForDeletionCommand,
    #     RemoveChildAccountCommand,
    #     SetGuestEmailCommand,
    # )
    # from smarti.account.appl.handler.command.auth_cmd_handler import (
    #     ChildLoginHandler,
    #     UserLoginHandler,
    #     UserLogoutHandler,
    # )
    # from smarti.account.appl.handler.command.create_cmd_handler import (
    #     CreateChildAccountHandler,
    #     CreateParentAccountHandler,
    # )
    # from smarti.account.appl.handler.command.delete_cmd_handler import (
    #     ConfirmAccountDeletionHandler,
    #     DeleteChildAccountHandler,
    #     MarkAccountForDeletionHandler,
    # )
    # from smarti.account.appl.handler.command.guest_cmd_handler import (
    #     CreateGuestAccountHandler,
    #     DeleteGuestHandler,
    #     SetGuestEmailHandler,
    # )
    # from smarti.account.infra.adapters.hashers import DjangoPasswordHasher
    # from smarti.account.infra.adapters.uow import DjangoAccountUnitOfWork

    # hasher = DjangoPasswordHasher()

    # handler = CreateParentAccountHandler(uow_factory=DjangoAccountUnitOfWork, hasher=hasher)
    # bus.register(CreateParentAccountCommand, handler)

    # handler = CreateChildAccountHandler(uow_factory=DjangoAccountUnitOfWork, hasher=hasher)
    # bus.register(CreateChildAccountCommand, handler)

    # handler = DeleteChildAccountHandler(uow_factory=DjangoAccountUnitOfWork)
    # bus.register(RemoveChildAccountCommand, handler)

    # handler = UserLoginHandler(uow_factory=DjangoAccountUnitOfWork, hasher=hasher)
    # bus.register(AuthenticateUserCommand, handler)

    # handler = ChildLoginHandler(uow_factory=DjangoAccountUnitOfWork, hasher=hasher)
    # bus.register(AuthenticateChildCommand, handler)

    # handler = UserLogoutHandler(uow_factory=DjangoAccountUnitOfWork)
    # bus.register(LogoutCommand, handler)

    # handler = CreateGuestAccountHandler(uow_factory=DjangoAccountUnitOfWork)
    # bus.register(CreateGuestAccountCommand, handler)

    # handler = DeleteGuestHandler(uow_factory=DjangoAccountUnitOfWork)
    # bus.register(DeleteGuestAccountCommand, handler)

    # handler = SetGuestEmailHandler(uow_factory=DjangoAccountUnitOfWork)
    # bus.register(SetGuestEmailCommand, handler)

    # from smarti.account.appl.handler.command.guest_cleanup_handler import (
    #     DeleteExpiredGuestsHandler,
    # )

    # handler = DeleteExpiredGuestsHandler(uow_factory=DjangoAccountUnitOfWork)
    # bus.register(DeleteExpiredGuestsCommand, handler)

    # handler = MarkAccountForDeletionHandler(uow_factory=DjangoAccountUnitOfWork)
    # bus.register(MarkAccountForDeletionCommand, handler)

    # handler = ConfirmAccountDeletionHandler(uow_factory=DjangoAccountUnitOfWork)
    # bus.register(ConfirmAccountDeletionCommand, handler)

    # logger.debug("Accounts domain wired: 11 handlers registered")


def wire_account_events(bus: CompositeEventDispatcher) -> None:
    """Wire account domain events."""
    # from smarti.account.domain.events import ChildRemoved
    # from smarti.profiles.appl.handlers.event.profile_evt_handlers import (
    #     AccountChildRemovedHandler,
    # )
    # from smarti.profiles.infra.adapters.uow import DjangoProfileUnitOfWork

    # handler = AccountChildRemovedHandler(uow_factory=DjangoProfileUnitOfWork)
    # bus.register(ChildRemoved, handler)


def wire_account_async_events(bus: CompositeEventDispatcher) -> None:
    """Wire account domain async events (placeholder for future events)."""

