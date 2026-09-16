# tools/mcp/backend.py
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any

from mcp import stdio_server
from mcp.server import Server
from mcp.types import TextContent, Tool

BASE_DIR = Path(__file__).parent.parent.parent.resolve()
BACKEND_DIR = BASE_DIR / "backend"

UV_PATH = "/home/wawassik/.local/bin/uv"


def run_command(cmd: list[str]) -> str:
    """Führt einen Befehl aus und gibt die Ausgabe zurück."""
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND_DIR / "src")
    env["DJANGO_SETTINGS_MODULE"] = "dweb.dsmarti.settings"
    if "PATH" in env:
        env["PATH"] = f"/home/wawassik/.local/bin:{env['PATH']}"

    result = subprocess.run(
        cmd,
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        env=env,
        timeout=600,
    )
    return result.stdout + result.stderr


# =============================================================================
# Tool Definitions
# =============================================================================

TOOLS: list[Tool] = [
    Tool(
        name="unit-test",
        description="Führt Python Unit-Tests aus (pytest). Optional mit Coverage.",
        input_schema={
            "type": "object",
            "properties": {
                "coverage": {
                    "type": "boolean",
                    "description": "Mit Coverage Report ausführen",
                    "default": False,
                },
            },
        },
    ),
    Tool(
        name="e2e-test",
        description="Führt Python Playwright E2E-Tests aus (pytest mit @pytest.mark.playwright).",
        input_schema={
            "type": "object",
            "properties": {
                "ui": {
                    "type": "boolean",
                    "description": "Playwright UI öffnen",
                    "default": False,
                },
            },
        },
    ),
    Tool(
        name="api-test",
        description="Führt Schemathesis API Contract Tests aus. Prüft ob Server läuft, startet ihn wenn nötig.",
        input_schema={
            "type": "object",
            "properties": {
                "html": {
                    "type": "boolean",
                    "description": "HTML-Report erstellen",
                    "default": True,
                },
                "start_server": {
                    "type": "boolean",
                    "description": "Server automatisch starten wenn nicht läuft",
                    "default": True,
                },
            },
        },
    ),
    Tool(
        name="para-test",
        description="Führt parametrierte Python-Tests aus (pytest). Akzeptiert Testpfad und optionalen Testnamen.",
        input_schema={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Testpfad, z.B. tests/unit/account",
                    "default": "tests/unit",
                },
                "name": {
                    "type": "string",
                    "description": "Optional: Testnamen-Filter (-k), z.B. 'test_login'",
                },
                "coverage": {
                    "type": "boolean",
                    "description": "Mit Coverage Report ausführen",
                    "default": False,
                },
            },
        },
    ),
]


# =============================================================================
# Tool Handlers
# =============================================================================


async def handle_unit_test(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = [UV_PATH, "run", "smarti", "test", "unit-test"]
    if arguments.get("coverage"):
        cmd.append("--cov")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_e2e_test(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = [UV_PATH, "run", "smarti", "test", "e2e-test"]
    if arguments.get("ui"):
        cmd.append("--ui")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_api_test(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = [UV_PATH, "run", "smarti", "test", "api"]
    if not arguments.get("html", True):
        cmd.append("--no-html")
    if not arguments.get("start_server", True):
        cmd.append("--no-start-server")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_para_test(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = [
        UV_PATH,
        "run",
        "smarti",
        "test",
        "para-test",
        arguments.get("path", "tests/unit"),
    ]
    if name := arguments.get("name"):
        cmd.extend(["--name", name])
    if arguments.get("coverage"):
        cmd.append("--cov")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


HANDLERS: dict[str, Any] = {
    "unit-test": handle_unit_test,
    "e2e-test": handle_e2e_test,
    "api-test": handle_api_test,
    "para-test": handle_para_test,
}


# =============================================================================
# MCP Server Setup
# =============================================================================

server = Server(name="backend-mcp", version="1.0.0")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    handler = HANDLERS.get(name)
    if handler is None:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]
    return await handler(arguments)


# =============================================================================
# Main Entry Point
# =============================================================================


async def main():
    """Main entry point for the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def run():
    """Synchronous entry point."""
    import asyncio

    asyncio.run(main())


if __name__ == "__main__":
    run()
