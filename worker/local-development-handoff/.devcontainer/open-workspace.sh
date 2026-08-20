#!/usr/bin/env bash

set -euo pipefail

project_directory="$(cd "$(dirname "$0")/.." && pwd)"
session_name="made-solid-editable"
workspace_state_directory="${XDG_CACHE_HOME:-$HOME/.cache}/made-solid-editable-workspace"
startup_log="$workspace_state_directory/startup.log"
startup_pid_file="$workspace_state_directory/startup.pid"

bash "$project_directory/.devcontainer/launch-workspace.sh"

if ! tmux has-session -t "$session_name" 2>/dev/null; then
  echo "[workspace] Preparing the website and Codex. Verified setup stages will appear below."
  touch "$startup_log"
  tail -n +1 -F "$startup_log" &
  log_tail_pid="$!"
  cleanup_log_tail() {
    kill "$log_tail_pid" 2>/dev/null || true
    wait "$log_tail_pid" 2>/dev/null || true
  }
  trap cleanup_log_tail EXIT

  while ! tmux has-session -t "$session_name" 2>/dev/null; do
    if [[ -s "$startup_pid_file" ]]; then
      startup_pid="$(<"$startup_pid_file")"
      if [[ "$startup_pid" =~ ^[0-9]+$ ]] && ! kill -0 "$startup_pid" 2>/dev/null; then
        sleep 1
        if ! tmux has-session -t "$session_name" 2>/dev/null; then
          echo "[workspace failed] Startup stopped before the tmux session was ready. The final setup output above identifies the failing command."
          exit 1
        fi
      fi
    fi
    sleep 1
  done

  cleanup_log_tail
  trap - EXIT
fi

echo "[workspace ready] Attaching to Codex. Press Ctrl+B then W to choose the website window."
exec tmux attach-session -d -t "$session_name"
