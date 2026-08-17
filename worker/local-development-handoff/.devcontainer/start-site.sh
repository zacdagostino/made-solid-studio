#!/usr/bin/env bash

set -euo pipefail

project_directory="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_directory"
bash "$project_directory/.devcontainer/setup.sh"
exec npm run dev
