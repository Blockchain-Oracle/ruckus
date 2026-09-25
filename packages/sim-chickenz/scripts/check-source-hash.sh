#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
expected="$(cat "$here/pkg/SOURCE_HASH")"
actual="$("$here/scripts/source-hash.sh")"
if [ "$expected" != "$actual" ]; then
  echo "chickenz-sim sources changed but pkg/ was not rebuilt. Run: pnpm -F @arena/sim-chickenz wasm" >&2
  exit 1
fi
echo "SOURCE_HASH ok"
