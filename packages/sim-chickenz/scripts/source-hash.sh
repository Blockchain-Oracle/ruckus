#!/usr/bin/env bash
# Hash of every input to the wasm build. pkg/ is committed (Nixpacks and Vercel have no Rust), so CI
# recomputes this and fails if the Rust changed without rebuilding pkg/ (ADR-002).
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$root"
{ find crates/chickenz-sim/src -type f -name '*.rs' | LC_ALL=C sort; echo crates/chickenz-sim/Cargo.toml; echo Cargo.lock; echo rust-toolchain.toml; } |
  while read -r f; do printf '%s\n' "$f"; cat "$f"; done | shasum -a 256 | cut -d' ' -f1
