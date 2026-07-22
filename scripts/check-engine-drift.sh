#!/usr/bin/env bash
# Verify every vendored Arc source/execution path against the exact commit pinned
# in src/engine/VENDORED_FROM.
set -euo pipefail

ARC_REPO="https://github.com/BigBirdReturns/axm-arc.git"
SHARED_PATHS=(
  "src/engine"
  "src/arcs"
  "src/godscar"
  "src/dark-tomb"
  "src/common-ship"
  "src/source-planes"
  "tests/engine"
  "tests/fixtures"
  "tests/godscar"
  "tests/dark-tomb"
  "tests/common-ship"
  "tests/source-planes"
  "cartridges"
)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROV="$ROOT/src/engine/VENDORED_FROM"

[ -f "$PROV" ] || { echo "ERROR: $PROV not found"; exit 2; }
SHA="$(awk '/^commit:/ {print $2}' "$PROV")"
[ -n "$SHA" ] || { echo "ERROR: no 'commit:' in $PROV"; exit 2; }

echo "Pinned axm-arc commit: $SHA"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! git clone --quiet "$ARC_REPO" "$TMP/arc" 2>/dev/null; then
  message="WARN: could not reach axm-arc to verify drift."
  if [ "${ENGINE_DRIFT_STRICT:-0}" = "1" ]; then echo "$message"; exit 1; fi
  echo "$message (soft-skip; set ENGINE_DRIFT_STRICT=1 to fail)"
  exit 0
fi
git -C "$TMP/arc" checkout --quiet "$SHA" || { echo "ERROR: pinned commit $SHA not found in axm-arc"; exit 1; }

DRIFTED=0
for path in "${SHARED_PATHS[@]}"; do
  if [ ! -d "$ROOT/$path" ]; then
    echo "DRIFT: World is missing vendored path $path"
    DRIFTED=1
    continue
  fi
  if diff -rq "$TMP/arc/$path" "$ROOT/$path" \
       --exclude='VENDORED_FROM' --exclude='*.js' --exclude='*.js.map'; then
    echo "OK: $path matches axm-arc@$SHA"
  else
    DRIFTED=1
  fi
done

if [ "$DRIFTED" = "0" ]; then
  echo "OK: complete vendored source plane matches axm-arc@$SHA"
  exit 0
fi

echo
echo "DRIFT: World's vendored source plane no longer matches the pinned Arc commit."
echo "Land shared changes in Arc first, then run scripts/sync-engine.sh <arc ref>."
exit 1
