#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

project_directory="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_directory"
bash "$project_directory/.devcontainer/setup.sh"

login_status="$(codex --config 'forced_login_method="chatgpt"' login status 2>&1 || true)"
if [[ ! "$login_status" =~ [Ll]ogged[[:space:]]in[[:space:]]using[[:space:]][Cc]hat[Gg][Pp][Tt] ]]; then
  if [[ -n "${CODEX_ACCESS_TOKEN:-}" ]]; then
    echo "Signing in to Codex with the ChatGPT-workspace CODEX_ACCESS_TOKEN secret..."
    printenv CODEX_ACCESS_TOKEN | codex --config 'forced_login_method="chatgpt"' login --with-access-token
  else
    echo "This editable website requires a ChatGPT subscription sign-in."
    echo "Run 'codex login --device-auth' once, then restart the Codespace."
    echo "OPENAI_API_KEY fallback is deliberately disabled to prevent separate API charges."
    exit 1
  fi
fi

login_status="$(codex --config 'forced_login_method="chatgpt"' login status 2>&1 || true)"
if [[ ! "$login_status" =~ [Ll]ogged[[:space:]]in[[:space:]]using[[:space:]][Cc]hat[Gg][Pp][Tt] ]]; then
  echo "Codex did not establish a ChatGPT subscription session. Startup stopped."
  exit 1
fi

unset OPENAI_API_KEY SITEFORGE_CODEX_API_KEY CODEX_API_KEY

exec codex \
  --config 'forced_login_method="chatgpt"' \
  --model gpt-5.6-sol \
  --config 'model_reasoning_effort="medium"' \
  --sandbox danger-full-access \
  --enable prevent_idle_sleep \
  --disable shell_snapshot
