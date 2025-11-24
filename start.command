#!/usr/bin/env bash

# Installer that works even if npm is missing.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

NODE_VERSION="${NODE_VERSION:-24.11.1}"
PORTABLE_NODE_DIR="$ROOT_DIR/.node"
PORTABLE_BIN="$PORTABLE_NODE_DIR/bin"
LOG_FILE="$ROOT_DIR/.install.log"
PLAYWRIGHT_MARKER="$ROOT_DIR/.playwright-chromium.path"
PLAYWRIGHT_LOCAL_BROWSERS="$ROOT_DIR/node_modules/.cache/ms-playwright"
PLAYWRIGHT_PACKAGE_DIR="$ROOT_DIR/node_modules/playwright"

# Force Playwright to use local cache under node_modules.
export PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_LOCAL_BROWSERS"

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

hash_lockfile() {
  local file="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  else
    echo "Need shasum or sha256sum to hash $file" >&2
    return 1
  fi
}

npm_install_if_needed() {
  # Usage: npm_install_if_needed "/path/to/project" "label" ["optional lockfile path"]
  local project_dir="$1"
  local label="$2"
  local lockfile_hint="${3:-}"

  cd "$project_dir"

  local hash_source=""
  local marker=""
  local hash_label=""

  if [ -n "$lockfile_hint" ] && [ -f "$lockfile_hint" ]; then
    hash_source="$lockfile_hint"
    marker="$project_dir/node_modules/.lockfile.hash"
    hash_label="lockfile $hash_source"
  elif [ -f "$project_dir/package-lock.json" ]; then
    hash_source="$project_dir/package-lock.json"
    marker="$project_dir/node_modules/.package-lock.hash"
    hash_label="package-lock $hash_source"
  elif [ -f "$project_dir/package.json" ]; then
    hash_source="$project_dir/package.json"
    marker="$project_dir/node_modules/.package-json.hash"
    hash_label="package.json (lockfile missing)"
  else
    echo "No package.json found in $project_dir" >&2
    exit 1
  fi

  local current_hash
  current_hash="$(hash_lockfile "$hash_source")"

  if [ -d "$project_dir/node_modules" ] && [ -f "$marker" ] && [ "$(cat "$marker")" = "$current_hash" ]; then
    : #echo "[$label DEPENDENCIES] Installed (hash source: $hash_label)."
  else
    echo "[$label DEPENDENCIES] Installing (hash source: $hash_label)..."
    run_quiet "npm install ($label)" "$NPM_CMD" install --no-progress --silent
    mkdir -p "$project_dir/node_modules"
    echo "$current_hash" > "$marker"
  fi
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
  echo "[Node.js] Not found. Downloading portable Node.js v${NODE_VERSION}..."
  ensure_curl
  detect_platform

  mkdir -p "$PORTABLE_NODE_DIR"
  TAR_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}.tar.xz"
  TMP_TAR="$ROOT_DIR/node-v${NODE_VERSION}.tar.xz"

  echo "[Node.js] Downloading from $TAR_URL"
  curl -fsSL "$TAR_URL" -o "$TMP_TAR"
  tar -xJf "$TMP_TAR" -C "$PORTABLE_NODE_DIR" --strip-components=1
  rm -f "$TMP_TAR"

  export PATH="$PORTABLE_BIN:$PATH"
  NODE_CMD="$PORTABLE_BIN/node"
  NPM_CMD="$PORTABLE_BIN/npm"
  NPX_CMD="$PORTABLE_BIN/npx"
}

playwright_chromium_present() {
  # Prefer cached marker if present.
  if [ -f "$PLAYWRIGHT_MARKER" ]; then
    local cached
    cached="$(cat "$PLAYWRIGHT_MARKER")"
    if [ -n "$cached" ] && [ -x "$cached" ] && [[ "$cached" == "$PLAYWRIGHT_BROWSERS_PATH"* ]]; then
      return 0
    fi
  fi

  # Resolve via Playwright API and persist the path.
  local resolved
  resolved="$("$NODE_CMD" <<'NODE' 2>/dev/null
try {
  const { chromium } = require('playwright');
  const fs = require('fs');
  const p = chromium.executablePath();
  if (p && fs.existsSync(p)) console.log(p);
} catch (_) {
  // ignore
}
NODE
)"

  if [ -n "$resolved" ] && [ -x "$resolved" ] && [[ "$resolved" == "$PLAYWRIGHT_BROWSERS_PATH"* ]]; then
    echo "$resolved" > "$PLAYWRIGHT_MARKER"
    return 0
  fi

  return 1
}

ensure_playwright_dependency() {
  # If node_modules exists but playwright directory is missing, reinstall deps to restore it.
  if [ -f "$PLAYWRIGHT_PACKAGE_DIR/package.json" ]; then
    return
  fi

  echo "[PLAYWRIGHT] Package missing; reinstalling project dependencies locally..."
  run_quiet "npm install (root - ensure playwright)" "$NPM_CMD" install --no-progress --silent
}

install_root() {
  npm_install_if_needed "$ROOT_DIR" "root"
  cd "$ROOT_DIR"

  ensure_playwright_dependency

  if playwright_chromium_present; then
    : # echo "[Playwright] Chromium already installed."
  else
    echo "[PLAYWRIGHT] Installing Chromium locally..."
    mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
    run_quiet "npx playwright install chromium" "$NPX_CMD" playwright install chromium
    if playwright_chromium_present; then
    : # echo "[Playwright] Chromium ready."
    else
      echo "[PLAYWRIGHT] Warning: Playwright Chromium not detected after install; check $LOG_FILE" >&2
    fi
  fi
}

install_gui() {
  npm_install_if_needed "$ROOT_DIR/gui" "gui"
}

start_gui() {
  
  cd "$ROOT_DIR"
  if [ -d "$ROOT_DIR/gui/dist" ]; then
    echo "[GUI] Running production build..."
    "$NPM_CMD" --workspace gui run gui
  else
    echo "[GUI] Installing..."
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
