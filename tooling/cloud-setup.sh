#!/usr/bin/env bash
# Run from any directory after selecting Node.js 24 using the environment's runtime manager.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
case "${1:-}" in
  ''|--with-deps) ;;
  *) echo 'Usage: bash tooling/cloud-setup.sh [--with-deps]' >&2; exit 2 ;;
esac
node --version
npm --version
node -e 'if (Number(process.versions.node.split(".")[0]) !== 24) { console.error("Node.js 24 required; select the version in .nvmrc first."); process.exit(1); }'
# Match upstream CI: include build tools even in a production environment.
NODE_ENV=production NPM_CONFIG_INCLUDE=dev npm ci
case "${1:-}" in
  --with-deps) npx playwright install --with-deps chromium ;;
  '')
    if [[ -n "${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-}" ]]; then
      test -x "$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"
      echo 'Using explicitly selected system Chromium; this does not validate the pinned browser.'
      "$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH" --version
    else
      npx playwright install chromium
    fi
    ;;
esac
