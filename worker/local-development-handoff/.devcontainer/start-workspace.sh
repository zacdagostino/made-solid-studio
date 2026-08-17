#!/usr/bin/env bash

set -euo pipefail

session_name="made-solid-editable"
project_directory="$(cd "$(dirname "$0")/.." && pwd)"
workspace_state_directory="${XDG_CACHE_HOME:-$HOME/.cache}/made-solid-editable-workspace"

bash "$project_directory/.devcontainer/setup.sh"

mkdir -p "$workspace_state_directory"
exec 8>"$workspace_state_directory/startup.lock"
flock 8
trap 'flock -u 8' EXIT

run_window() {
  local window_name="$1"
  local script_name="$2"
  local command="bash -lc 'bash .devcontainer/$script_name; exit_code=\$?; echo; echo \"${window_name^^} STOPPED — exit code \$exit_code\"; exit \$exit_code'"

  if ! tmux list-windows -t "$session_name" -F '#{window_name}' | grep -Fqx "$window_name"; then
    tmux new-window -d -t "$session_name" -n "$window_name" -c "$project_directory" "$command"
    tmux set-option -w -t "$session_name:$window_name" remain-on-exit on
    return
  fi

  if [[ "$(tmux display-message -p -t "$session_name:$window_name.0" '#{pane_dead}')" == "1" ]]; then
    tmux respawn-pane -k -t "$session_name:$window_name.0" -c "$project_directory" "$command"
  fi
}

if ! tmux has-session -t "$session_name" 2>/dev/null; then
  tmux new-session \
    -d \
    -s "$session_name" \
    -n codex \
    -c "$project_directory" \
    "bash -lc 'bash .devcontainer/start-codex.sh; exit_code=\$?; echo; echo \"CODEX STOPPED — exit code \$exit_code\"; exit \$exit_code'"
  tmux set-option -w -t "$session_name:codex" remain-on-exit on
fi

run_window codex start-codex.sh
run_window website start-site.sh
run_window ports publish-port.sh

tmux select-window -t "$session_name:codex"
echo "The website and Codex are running in tmux session $session_name."
