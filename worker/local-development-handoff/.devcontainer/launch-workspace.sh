#!/usr/bin/env bash

set -euo pipefail

session_name="made-solid-editable"
project_directory="$(cd "$(dirname "$0")/.." && pwd)"
workspace_state_directory="${XDG_CACHE_HOME:-$HOME/.cache}/made-solid-editable-workspace"
startup_log="$workspace_state_directory/startup.log"
startup_pid_file="$workspace_state_directory/startup.pid"

mkdir -p "$workspace_state_directory"

if tmux has-session -t "$session_name" 2>/dev/null; then
  echo "[workspace] The persistent website and Codex session is already running."
  exit 0
fi

exec 7>"$workspace_state_directory/launcher.lock"
flock 7

if tmux has-session -t "$session_name" 2>/dev/null; then
  echo "[workspace] The persistent website and Codex session is already running."
  exit 0
fi

if [[ -s "$startup_pid_file" ]]; then
  startup_pid="$(<"$startup_pid_file")"
  if [[ "$startup_pid" =~ ^[0-9]+$ ]] && kill -0 "$startup_pid" 2>/dev/null; then
    echo "[workspace] Startup is already running. Progress is available in $startup_log"
    exit 0
  fi
fi

: >"$startup_log"
nohup bash "$project_directory/.devcontainer/start-workspace.sh" \
  >>"$startup_log" 2>&1 </dev/null 7>&- &
startup_pid="$!"
printf '%s\n' "$startup_pid" >"$startup_pid_file"
echo "[workspace] Startup launched in the background. Progress is available in $startup_log"
