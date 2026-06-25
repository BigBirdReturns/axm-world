#!/usr/bin/env bash
# Verify that the vendored src/engine/ still matches the axm-arc commit
# pinned in src/engine/VENDORED_FROM.
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
ARC_ENGINE_PATH="src/engine"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/src/engine"
PROV="$DEST/VENDORED_FROM"

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

if diff -rq "$TMP/arc/$ARC_ENGINE_PATH" "$DEST" \
     --exclude='VENDORED_FROM' --exclude='*.js' --exclude='*.js.map'; then
  echo "OK: vendored engine matches axm-arc@$SHA"
  exit 0
else
  echo
  echo "DRIFT: vendored src/engine no longer matches the pinned commit."
  echo "  - intended change? run scripts/sync-engine.sh and commit."
  echo "  - unintended?      revert local edits to src/engine."
  exit 1
fi
