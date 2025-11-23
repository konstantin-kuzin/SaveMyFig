#!/usr/bin/env bash

# Installer that works even if npm is missing.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_VERSION="${NODE_VERSION:-20.17.0}"
PORTABLE_NODE_DIR="$ROOT_DIR/.node"
PORTABLE_BIN="$PORTABLE_NODE_DIR/bin"
LOG_FILE="$ROOT_DIR/.install.log"

export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_PROGRESS=false

ensure_curl() {
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required to download Node.js. Please install curl and retry." >&2
    exit 1
  fi
}

run_quiet() {
  # Usage: run_quiet "title" cmd args...
  local title="$1"
  shift
  echo "$title..."
  {
    echo "---- $title ----"
    "$@"
  } >>"$LOG_FILE" 2>&1 || {
    echo "Failed: $title (see $LOG_FILE for details)" >&2
    tail -n 40 "$LOG_FILE" >&2
    exit 1
  }
}

detect_platform() {
  case "$(uname -s)" in
    Darwin) NODE_OS="darwin" ;;
    Linux) NODE_OS="linux" ;;
    *)
      echo "Unsupported OS: $(uname -s)" >&2
      exit 1
      ;;
  esac

  case "$(uname -m)" in
    arm64 | aarch64) NODE_ARCH="arm64" ;;
    x86_64 | amd64) NODE_ARCH="x64" ;;
    *)
      echo "Unsupported architecture: $(uname -m)" >&2
      exit 1
      ;;
  esac
}

bootstrap_portable_node() {
  # 1) Prefer portable Node if already downloaded (even if PATH doesn't include it).
  if [ -x "$PORTABLE_BIN/npm" ]; then
    export PATH="$PORTABLE_BIN:$PATH"
    NODE_CMD="$PORTABLE_BIN/node"
    NPM_CMD="$PORTABLE_BIN/npm"
    NPX_CMD="$PORTABLE_BIN/npx"
    return
  fi

  # 2) Fallback to system Node if available.
  if command -v npm >/dev/null 2>&1; then
    NODE_CMD="$(command -v node)"
    NPM_CMD="$(command -v npm)"
    NPX_CMD="$(command -v npx)"
    return
  fi

  # 3) Download portable Node if nothing is available.
  echo "npm not found. Bootstrapping portable Node.js v${NODE_VERSION}..."
  ensure_curl
  detect_platform

  mkdir -p "$PORTABLE_NODE_DIR"
  TAR_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}.tar.xz"
  TMP_TAR="$ROOT_DIR/node-v${NODE_VERSION}.tar.xz"

  echo "Downloading Node.js from $TAR_URL"
  curl -fsSL "$TAR_URL" -o "$TMP_TAR"
  tar -xJf "$TMP_TAR" -C "$PORTABLE_NODE_DIR" --strip-components=1
  rm -f "$TMP_TAR"

  export PATH="$PORTABLE_BIN:$PATH"
  NODE_CMD="$PORTABLE_BIN/node"
  NPM_CMD="$PORTABLE_BIN/npm"
  NPX_CMD="$PORTABLE_BIN/npx"
}

install_root() {
  echo "Installing root dependencies..."
  cd "$ROOT_DIR"
  run_quiet "npm install (root)" "$NPM_CMD" install --no-progress --silent
  echo "Installing Playwright Chromium..."
  run_quiet "npx playwright install chromium" "$NPX_CMD" playwright install chromium
}

install_gui() {
  echo "Installing GUI dependencies..."
  cd "$ROOT_DIR/gui"
  run_quiet "npm install (gui)" "$NPM_CMD" install --no-progress --silent
}

start_gui() {
  echo "Starting GUI..."
  cd "$ROOT_DIR"
  if [ -d "$ROOT_DIR/gui/dist" ]; then
    echo "Found gui/dist, running production build..."
    "$NPM_CMD" --workspace gui run gui
  else
    "$NPM_CMD" --workspace gui run start
  fi
}

main() {
  : > "$LOG_FILE"
  bootstrap_portable_node
  install_root
  install_gui
  start_gui

  echo
  echo "Installation complete."
  echo "Node: $("$NODE_CMD" -v)"
  echo "npm: $("$NPM_CMD" -v)"
  if [ -x "$PORTABLE_BIN/npm" ]; then
    ACTIVATE_FILE="$PORTABLE_NODE_DIR/activate"
    cat > "$ACTIVATE_FILE" <<'EOF'
# shellcheck shell=bash
# Portable Node.js env for this project.
export PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/bin:$PATH"
EOF
    chmod +x "$ACTIVATE_FILE"
    echo
    echo "Portable Node.js installed to $PORTABLE_NODE_DIR"
    echo "To enable it in this shell: source \"$ACTIVATE_FILE\""
    echo "Or prefix commands: PATH=\"$PORTABLE_BIN:\$PATH\" npm run start"
  fi
}

main "$@"
