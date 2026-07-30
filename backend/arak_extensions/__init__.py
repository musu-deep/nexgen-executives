"""ARAAK extensions package.

Loads the legacy feature module first, then overlays secure invitation-only
identity management and the ARAAK Access Fabric authorization layer.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_PACKAGE_PARENT = __name__.rpartition(".")[0]
_LEGACY_NAME = f"{_PACKAGE_PARENT}._legacy_arak_extensions" if _PACKAGE_PARENT else "_legacy_arak_extensions"
_LEGACY_PATH = Path(__file__).resolve().parent.parent / "arak_extensions.py"
_LEGACY_SPEC = importlib.util.spec_from_file_location(_LEGACY_NAME, _LEGACY_PATH)
if _LEGACY_SPEC is None or _LEGACY_SPEC.loader is None:
    raise ImportError(f"Unable to load legacy extensions from {_LEGACY_PATH}")
_LEGACY_MODULE = importlib.util.module_from_spec(_LEGACY_SPEC)
sys.modules[_LEGACY_NAME] = _LEGACY_MODULE
_LEGACY_SPEC.loader.exec_module(_LEGACY_MODULE)

from . import secure_access  # noqa: F401,E402
from . import access_fabric  # noqa: F401,E402
