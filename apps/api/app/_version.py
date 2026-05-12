"""Application version helpers."""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version


def get_app_version() -> str:
    """Return package version, falling back when the package is not installed."""

    try:
        return version("exokids-api")
    except PackageNotFoundError:
        return "0.0.0+unknown"
