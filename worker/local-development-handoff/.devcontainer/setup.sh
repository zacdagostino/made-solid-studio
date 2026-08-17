#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

project_directory="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_directory"

setup_state_directory="${XDG_CACHE_HOME:-$HOME/.cache}/made-solid-editable-workspace"
setup_ready_file="$setup_state_directory/setup-v6.ready"
mkdir -p "$setup_state_directory"
exec 9>"$setup_state_directory/setup.lock"
if ! flock -n 9; then
  echo "[setup] Another startup is preparing this Codespace; waiting for it to finish..."
  flock 9
  echo "[setup] The setup lock is available; checking the completed work."
fi

echo "[setup 1/4] Checking the Codespace tools and website dependencies."
if
  [[ -f "$setup_ready_file" ]] &&
    [[ -x node_modules/.bin/next ]] &&
    command -v codex >/dev/null 2>&1 &&
    command -v tmux >/dev/null 2>&1
then
  echo "[setup complete] Dependencies, Codex, and tmux are ready."
  exit 0
fi

echo "[setup 2/4] Installing the website's locked dependencies. This can take a few minutes on a 2-core Codespace."
npm ci --no-audit --no-fund

if ! command -v codex >/dev/null 2>&1; then
  echo "[setup 3/4] Installing the Codex CLI from OpenAI."
  curl --fail --show-error --silent --location --retry 3 --connect-timeout 15 --max-time 180 \
    https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh
else
  echo "[setup 3/4] Codex is already installed."
fi

# Codex includes a compatible Linux bubblewrap helper. Put a user-owned link
# on PATH so local website workspaces do not require a privileged apt install.
if ! command -v bwrap >/dev/null 2>&1; then
  codex_entrypoint="$(readlink -f "$(command -v codex)" 2>/dev/null || true)"
  codex_package_directory="$(cd "$(dirname "$codex_entrypoint")/.." 2>/dev/null && pwd || true)"
  bundled_bwrap=""
  if [[ -n "$codex_package_directory" ]]; then
    bundled_bwrap="$(find "$codex_package_directory" -type f -path '*/codex-resources/bwrap' -print -quit 2>/dev/null || true)"
  fi
  if [[ -n "$bundled_bwrap" && -x "$bundled_bwrap" ]]; then
    mkdir -p "$HOME/.local/bin"
    ln -sfn "$bundled_bwrap" "$HOME/.local/bin/bwrap"
  fi
fi

echo "[setup 4/4] Checking the persistent terminal service."
if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required by the Codespace image but is not available. Rebuild the Codespace and try again."
  exit 1
fi

touch "$setup_ready_file"
echo "[setup complete] The website and Codex can now start."
