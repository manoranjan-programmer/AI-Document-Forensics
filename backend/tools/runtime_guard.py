"""
Runtime Resource Guard and Model Load Registry
File: tools/runtime_guard.py

Central helper used by every agent that loads a heavy model. It provides:

1. Memory introspection that reads /proc/meminfo directly, so it never imports
   TensorFlow, PyTorch or any other AI framework just to answer a health check.
2. A pre-flight memory check that raises a clear InsufficientMemoryError instead
   of letting the kernel OOM-kill the worker mid-investigation.
3. A registry of which models are actually loaded, so /health can report the
   truth without triggering a load.
4. A cheap "is this package installed" probe (importlib.util.find_spec) that
   does not import the package.
5. release_memory() for dropping temporary tensors/images between stages.

Nothing here imports an AI framework at module level.
"""

import gc
import logging
import os
from datetime import datetime
from importlib.util import find_spec
from typing import Any, Dict, Optional

logger = logging.getLogger("runtime_guard")

# name -> {"state": "loading" | "loaded" | "failed", "error": str | None, "updated_at": iso}
_MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {}


class InsufficientMemoryError(RuntimeError):
    """Raised when a model cannot be loaded because the host is out of memory."""


# ---------------------------------------------------------------------------
# Memory introspection
# ---------------------------------------------------------------------------

def _read_meminfo() -> Dict[str, int]:
    """Parses /proc/meminfo into a dict of kB values. Empty dict if unavailable."""
    info: Dict[str, int] = {}
    try:
        with open("/proc/meminfo", "r", encoding="ascii") as fh:
            for line in fh:
                key, _, rest = line.partition(":")
                parts = rest.split()
                if parts:
                    info[key.strip()] = int(parts[0])
    except (OSError, ValueError):
        return {}
    return info


def available_memory_mb() -> Optional[float]:
    """Returns MemAvailable in MB, or None when the platform does not expose it."""
    info = _read_meminfo()
    if "MemAvailable" in info:
        return round(info["MemAvailable"] / 1024.0, 1)
    if "MemFree" in info:
        return round(info["MemFree"] / 1024.0, 1)
    return None


def memory_guard_enabled() -> bool:
    """The guard can be disabled with FORENSICS_MEMORY_GUARD=false."""
    return os.getenv("FORENSICS_MEMORY_GUARD", "true").strip().lower() not in (
        "false",
        "0",
        "no",
        "off",
    )


def require_memory(required_mb: float, label: str) -> None:
    """
    Raises InsufficientMemoryError when the host cannot plausibly hold `label`.

    This is a pre-flight estimate, not a reservation: it exists so a 2 GB box
    returns a readable error instead of being OOM-killed halfway through a run.
    """
    if not memory_guard_enabled():
        return

    available = available_memory_mb()
    if available is None:
        return

    if available < required_mb:
        raise InsufficientMemoryError(
            f"Insufficient memory to load {label}: approximately {required_mb:.0f} MB "
            f"required, {available:.0f} MB available. Free memory, process fewer "
            f"documents at once, or set FORENSICS_MEMORY_GUARD=false to attempt the "
            f"load anyway."
        )


# ---------------------------------------------------------------------------
# Model load registry
# ---------------------------------------------------------------------------

def _stamp(state: str, error: Optional[str] = None) -> Dict[str, Any]:
    return {
        "state": state,
        "error": error,
        "updated_at": datetime.utcnow().isoformat(),
    }


def mark_loading(name: str) -> None:
    _MODEL_REGISTRY[name] = _stamp("loading")


def mark_loaded(name: str) -> None:
    _MODEL_REGISTRY[name] = _stamp("loaded")


def mark_failed(name: str, error: Any) -> None:
    _MODEL_REGISTRY[name] = _stamp("failed", str(error))


def is_loaded(name: str) -> bool:
    entry = _MODEL_REGISTRY.get(name)
    return bool(entry and entry.get("state") == "loaded")


def get_model_status() -> Dict[str, Dict[str, Any]]:
    """Snapshot of the registry. Safe to call from /health: never loads anything."""
    return {name: dict(entry) for name, entry in _MODEL_REGISTRY.items()}


# ---------------------------------------------------------------------------
# Package probe and cleanup
# ---------------------------------------------------------------------------

def module_available(module_name: str) -> bool:
    """
    True when the package is installed. Uses find_spec, which resolves the
    module without executing it, so this stays cheap for TensorFlow-sized deps.
    """
    try:
        return find_spec(module_name) is not None
    except (ImportError, ValueError, AttributeError):
        return False


def release_memory() -> None:
    """Drops unreachable temporaries. Called between pipeline stages."""
    gc.collect()
