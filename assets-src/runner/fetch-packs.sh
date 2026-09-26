#!/bin/bash
# Fetches the CC0 Quaternius animation libraries into packs/ (gitignored), then builds runner.glb.
# itch.io only serves free packs through its download page: download_url → the page's csrf → file.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p packs
get() { # <game url> <upload id> <zip>
  local G=$1 ID=$2 OUT=$3 J; J=$(mktemp)
  local T D T2 U
  T=$(curl -s -c "$J" -b "$J" "$G" | grep -o 'csrf_token" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"$//')
  D=$(curl -s -c "$J" -b "$J" -X POST "$G/download_url" --data-urlencode "csrf_token=$T" | python3 -c 'import sys,json;print(json.load(sys.stdin)["url"])')
  T2=$(curl -s -c "$J" -b "$J" "$D" | grep -o 'csrf_token" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"$//')
  U=$(curl -s -c "$J" -b "$J" -X POST "$G/file/$ID?source=game_download" -H "Referer: $D" --data-urlencode "csrf_token=$T2" | python3 -c 'import sys,json;print(json.load(sys.stdin)["url"])')
  curl -sL "$U" -o "$OUT"
}
get https://quaternius.itch.io/universal-animation-library 17958403 packs/ual1.zip
get https://quaternius.itch.io/universal-animation-library-2 17958478 packs/ual2.zip
unzip -jo packs/ual1.zip '*Unreal-Godot/UAL1_Standard.glb' -d packs
unzip -jo packs/ual2.zip '*Unreal-Godot/UAL2_Standard.glb' -d packs
node ../../packages/assets-pipeline/src/runner-character.ts packs/UAL1_Standard.glb packs/UAL2_Standard.glb ../../apps/web/src/games/runner/assets/models/runner.glb
