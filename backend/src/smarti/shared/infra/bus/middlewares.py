# smarti/shared/infra/bus/middlewares.py
import logging
import time
from collections.abc import Callable
from typing import Any

from smarti.shared.appl.ports import IMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(IMiddleware):

    def process(self, command_type: Any, next: Callable) -> Any:  # noqa: A002 (shadowing built-in next is intentional)
        command_name = type(command_type).__name__
        start_time = time.perf_counter()

        logger.info("🚀 [Command] Starting: %s", command_name)

        try:
            # Hier wird der nächste Schritt in der Kette aufgerufen
            # (entweder die nächste Middleware oder der Handler)
            result = next(command_type)

            duration = (time.perf_counter() - start_time) * 1000

            if hasattr(result, "is_success") and result.is_success:
                logger.info(
                    f"✅ [Command] Finished: {command_name} in {duration:.2f}ms"
                )
            else:
                logger.warning(
                    f"⚠️ [Command] Failed: {command_name} (Duration: {duration:.2f}ms)"
                )

            return result

        except Exception as e:
            duration = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"❌ [Command] Crashed: {command_name} - Error: {str(e)} (Duration: {duration:.2f}ms)"
            )
            raise e
