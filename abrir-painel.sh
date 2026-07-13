#!/usr/bin/env sh
# POSIX launcher for Applications Dashboard (macOS and Linux).
# Mirrors abrir-painel.cmd on Windows: builds the app if needed, then launches
# the Electron desktop shell against this directory.
set -e

cd "$(dirname "$0")"

if [ ! -f "dist/server.cjs" ]; then
  npm run build
fi

# Prefer the Electron binary that ships in node_modules; fall back to a system
# electron on PATH so users who installed it globally still get a launch.
if [ -x "node_modules/electron/dist/electron" ]; then
  exec "node_modules/electron/dist/electron" "$(pwd)"
elif [ -x "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
  exec "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" "$(pwd)"
else
  exec npx electron "$(pwd)"
fi
