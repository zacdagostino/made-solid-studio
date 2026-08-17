#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

project_directory="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_directory"
bash "$project_directory/.devcontainer/setup.sh"

if ! codex login status >/dev/null 2>&1; then
  if [[ -n "${CODEX_ACCESS_TOKEN:-}" ]]; then
    echo "Signing in to Codex with the CODEX_ACCESS_TOKEN Codespaces secret..."
    printenv CODEX_ACCESS_TOKEN | codex login --with-access-token
  elif [[ -n "${OPENAI_API_KEY:-}" ]]; then
    echo "Signing in to Codex with the OPENAI_API_KEY Codespaces secret..."
    printenv OPENAI_API_KEY | codex login --with-api-key
  else
    echo "No Codex login secret is configured. Follow the browser sign-in prompt once."
  fi
fi

exec codex \
  --model gpt-5.6-sol \
  --config 'model_reasoning_effort="medium"' \
  --sandbox danger-full-access \
  --enable prevent_idle_sleep \
  --disable shell_snapshot
