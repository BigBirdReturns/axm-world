#!/usr/bin/env bash
# Verify that the vendored shared surface (src/engine, src/arcs, tests/engine,
# tests/fixtures) still matches the axm-arc commit pinned in
# src/engine/VENDORED_FROM.
#
# Exit codes:
#   0  in sync (or axm-arc unreachable -> soft-skip, see ENGINE_DRIFT_STRICT)
#   1  drift detected against the pinned commit
#   2  provenance file missing/malformed
#
# Set ENGINE_DRIFT_STRICT=1 to treat "axm-arc unreachable" as a failure
# (use this in CI, where access is expected).
set -euo pipefail

ARC_REPO="https://github.com/BigBirdReturns/axm-arc.git"
SHARED_PATHS=("src/engine" "src/arcs" "tests/engine" "tests/fixtures")

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROV="$ROOT/src/engine/VENDORED_FROM"

[ -f "$PROV" ] || { echo "ERROR: $PROV not found"; exit 2; }
SHA="$(awk '/^commit:/ {print $2}' "$PROV")"
[ -n "$SHA" ] || { echo "ERROR: no 'commit:' in $PROV"; exit 2; }

echo "Pinned axm-arc commit: $SHA"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! git clone --quiet "$ARC_REPO" "$TMP/arc" 2>/dev/null; then
  msg="WARN: could not reach axm-arc to verify drift."
  if [ "${ENGINE_DRIFT_STRICT:-0}" = "1" ]; then echo "$msg"; exit 1; fi
  echo "$msg (soft-skip; set ENGINE_DRIFT_STRICT=1 to fail)"; exit 0
fi
git -C "$TMP/arc" checkout --quiet "$SHA" || { echo "ERROR: pinned commit $SHA not found in axm-arc"; exit 1; }

DRIFTED=0
for p in "${SHARED_PATHS[@]}"; do
  if diff -rq "$TMP/arc/$p" "$ROOT/$p" \
       --exclude='VENDORED_FROM' --exclude='*.js' --exclude='*.js.map'; then
    echo "OK: $p matches axm-arc@$SHA"
  else
    DRIFTED=1
  fi
done

if [ "$DRIFTED" = "0" ]; then
  echo "OK: vendored shared surface matches axm-arc@$SHA"
  exit 0
else
  echo
  echo "DRIFT: the vendored shared surface no longer matches the pinned commit."
  echo "  - intended change? upstream it to axm-arc first, then run"
  echo "    scripts/sync-engine.sh <arc ref> and commit (see RECONCILIATION.md)."
  echo "  - unintended?      revert local edits to the paths above."
  exit 1
fi
