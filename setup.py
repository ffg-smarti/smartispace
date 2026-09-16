# setup.py
from setuptools import find_packages, setup

setup(
    packages=(
        [
            "tools",
            "tools.core",
            "tools.commands",
            "tools.commands.backend",
            "tools.commands.coverage",
            "tools.mcp",
        ]
        + find_packages(
            where="backend/src",
            include=["smarti*", "dweb*"],
        )
    ),
    package_dir={
        "": ".",
        "tools": "tools",
        "smarti": "backend/src/smarti",
        "dweb": "backend/src/dweb",
    },
    py_modules=["cli"],
)
