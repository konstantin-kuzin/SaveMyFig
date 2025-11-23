#!/usr/bin/env bash
set -euo pipefail

# Always run from the script directory so Finder double-click works
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

npm --workspace gui run gui