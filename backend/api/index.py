"""
Vercel Serverless Function Entry Point for AI Document Forensics API
File: api/index.py

Binds the FastAPI application from backend/main.py for Vercel Python runtime execution.
Maintains internal module import resolution across schemas, services, tools, and agents.
"""

import os
import sys
from pathlib import Path

# Compute absolute directory paths
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

# Ensure 'backend' directory is at the top of sys.path so internal imports
# (schemas, services, tools, agents) resolve cleanly without modifying backend package layout.
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(1, str(ROOT_DIR))

# Signal serverless execution environment
os.environ.setdefault("VERCEL", "1")

# Import the existing FastAPI application singleton from backend/main.py
from main import app  # noqa: E402

