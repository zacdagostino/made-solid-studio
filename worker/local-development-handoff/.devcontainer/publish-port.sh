#!/usr/bin/env bash

set -euo pipefail

if [[ "${CODESPACES:-false}" != "true" || -z "${CODESPACE_NAME:-}" ]]; then
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is unavailable; the website port could not be made public." >&2
  exit 1
fi

published=false
announced=false
refresh_cycle=0
while true; do
  refresh_cycle=$((refresh_cycle + 1))
  if ((refresh_cycle >= 8)); then
    published=false
    refresh_cycle=0
  fi
  if ss -H -ltn 'sport = :3000' 2>/dev/null | grep -q .; then
    if [[ "$published" != "true" ]] &&
      gh codespace ports visibility 3000:public -c "$CODESPACE_NAME" >/dev/null 2>&1; then
      published=true
      if [[ "$announced" != "true" ]]; then
        announced=true
        echo "Website port 3000 is public: https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/"
      fi
    fi
  else
    published=false
  fi
  sleep 2
done
