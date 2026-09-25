#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
root="$(cd "$here/../.." && pwd)"
wasm-pack build "$root/crates/chickenz-sim" --release --target web --out-dir "$here/pkg" --out-name chickenz_sim --no-pack -- --features wasm
# wasm-pack writes a catch-all .gitignore; the artefacts are committed on purpose.
rm -f "$here/pkg/.gitignore"
"$here/scripts/source-hash.sh" > "$here/pkg/SOURCE_HASH"
echo "pkg built, SOURCE_HASH $(cat "$here/pkg/SOURCE_HASH")"
