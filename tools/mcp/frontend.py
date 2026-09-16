# tools/mcp/frontend.py
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any

from mcp import stdio_server
from mcp.server import Server
from mcp.types import TextContent, Tool

BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = Path(os.environ.get("FRONTEND_DIR", BASE_DIR / "frontend"))
FRONTEND_PORT = int(os.environ.get("MCP_PORT", "8080"))
SERVER_NAME = os.environ.get("MCP_NAME", "smarti-mcp")


def run_command(cmd: list[str], cwd: Path = FRONTEND_DIR) -> str:
    env = os.environ.copy()
    if "PATH" in env:
        env["PATH"] = f"/home/wawassik/.local/bin:{env['PATH']}"

    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        env=env,
        timeout=600,
    )
    return result.stdout + result.stderr


TOOLS: list[Tool] = [
    Tool(
        name="js-unit",
        description="Führt Vitest Unit-Tests aus (JavaScript/TypeScript).",
        input_schema={
            "type": "object",
            "properties": {
                "coverage": {
                    "type": "boolean",
                    "description": "Mit Coverage Report ausführen",
                    "default": False,
                },
                "watch": {
                    "type": "boolean",
                    "description": "Im Watch-Modus ausführen",
                    "default": False,
                },
                "ui": {
                    "type": "boolean",
                    "description": "Vitest UI öffnen",
                    "default": False,
                },
            },
        },
    ),
    Tool(
        name="frontend",
        description="Führt alle Frontend-Tests aus (Vitest Unit).",
        input_schema={
            "type": "object",
            "properties": {
                "coverage": {
                    "type": "boolean",
                    "description": "Vitest mit Coverage Report ausführen",
                    "default": False,
                },
            },
        },
    ),
    Tool(
        name="lint",
        description="Führt ESLint für das Frontend aus.",
        input_schema={
            "type": "object",
            "properties": {
                "fix": {
                    "type": "boolean",
                    "description": "Automatisch behebbare Fehler korrigieren",
                    "default": False,
                },
            },
        },
    ),
    Tool(
        name="format",
        description="Prüft die Formatierung mit Prettier.",
        input_schema={
            "type": "object",
            "properties": {
                "write": {
                    "type": "boolean",
                    "description": "Dateien automatisch formatieren",
                    "default": False,
                },
            },
        },
    ),
    Tool(
        name="integration-test",
        description="Führt Frontend-Integrationstests aus.",
        input_schema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="e2e-test",
        description="Führt Playwright E2E-Tests aus.",
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
        name="watch",
        description=f"Startet den Frontend Dev-Server (Port {FRONTEND_PORT}).",
        input_schema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="run",
        description="Baut das Frontend für Production.",
        input_schema={
            "type": "object",
            "properties": {},
        },
    ),
]


async def handle_js_unit(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = ["npm", "run"]
    if arguments.get("ui"):
        cmd.append("test:ui")
    elif arguments.get("coverage"):
        cmd.append("test:coverage")
    elif arguments.get("watch"):
        cmd.append("test:watch")
    else:
        cmd.append("test:run")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_frontend(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = ["npm", "run"]
    if arguments.get("coverage"):
        cmd.append("test:coverage")
    else:
        cmd.append("test:run")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_lint(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = ["npx", "eslint", "src/"]
    if arguments.get("fix"):
        cmd.append("--fix")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_format(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = ["npx", "prettier"]
    if arguments.get("write"):
        cmd.append("--write")
    else:
        cmd.append("--check")
    cmd.append("src/")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_integration_test(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = ["npm", "run", "test:integration"]
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_e2e_test(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = ["npx", "playwright", "test"]
    if arguments.get("ui"):
        cmd.append("--ui")
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_watch(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = ["npm", "run", "dev"]
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


async def handle_run(arguments: dict[str, Any]) -> list[TextContent]:
    cmd = ["npm", "run", "build"]
    output = run_command(cmd)
    return [TextContent(type="text", text=output)]


HANDLERS: dict[str, Any] = {
    "js-unit": handle_js_unit,
    "frontend": handle_frontend,
    "lint": handle_lint,
    "format": handle_format,
    "integration-test": handle_integration_test,
    "e2e-test": handle_e2e_test,
    "watch": handle_watch,
    "run": handle_run,
}

server = Server(name=SERVER_NAME, version="1.0.0")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    handler = HANDLERS.get(name)
    if handler is None:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]
    return await handler(arguments)


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def run():
    import asyncio

    asyncio.run(main())


if __name__ == "__main__":
    run()
