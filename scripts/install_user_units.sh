#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
mkdir -p "$unit_dir"
for unit in qwendirector-api qwendirector-worker qwendirector-web; do
  install -m 0644 "$project_root/deploy/systemd/${unit}.service.example" "$unit_dir/${unit}.service"
done
systemctl --user daemon-reload
systemctl --user enable qwendirector-api.service qwendirector-worker.service qwendirector-web.service
echo "Units installed. Stop any manually started API/worker first, then run:"
echo "systemctl --user start qwendirector-api.service qwendirector-worker.service qwendirector-web.service"
