#!/usr/bin/env bash
# Rebuild #13's Blender moves into src/assets/athlete.glb.  Usage: scripts/athlete/build.sh [--preview <dir>]
set -euo pipefail
cd "$(dirname "$0")/../.."
BLENDER=${BLENDER:-$(command -v blender || echo /Applications/Blender.app/Contents/MacOS/Blender)}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
preview=()
if [ "${1:-}" = "--preview" ]; then mkdir -p "$2"; preview=("$2"); fi
# Blender can't read meshopt; unpack a copy for it
npx --yes @gltf-transform/cli@4.5.1 copy src/assets/athlete.glb "$tmp/raw.glb" >/dev/null
"$BLENDER" -b --python scripts/athlete/moves.py -- "$tmp/raw.glb" "$tmp/moves.glb" ${preview[@]+"${preview[@]}"} | grep -E '^MOVES|Error|Traceback' || true
node scripts/athlete/merge-moves.mjs "$tmp/moves.glb"
