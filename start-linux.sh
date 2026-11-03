#!/bin/bash
# Double-click to open the Sound Arcade setup page. Needs Node.js from https://nodejs.org
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Get it from https://nodejs.org then try again."
  read -n 1 -s -r -p "Press any key to close"
  exit 1
fi
node setup/server.mjs
