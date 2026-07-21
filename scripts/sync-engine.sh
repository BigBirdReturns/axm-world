#!/usr/bin/env bash
# Re-vendor the shared surface from axm-arc and update the VENDORED_FROM
# provenance. The shared surface (see RECONCILIATION.md in axm-arc) is:
#
#   src/engine      the deterministic rules engine
#   src/arcs        the bundled tutorial arc content
#   tests/engine    engine subsystem + resolver tests
#   tests/fixtures  shared test fixtures
#   src/godscar     Godscar pocket grammar, compiler, and reference template
#   tests/godscar   Godscar conformance and artifact tests
#
# Usage: scripts/sync-engine.sh [<axm-arc ref>]
#   ref defaults to "main".
#
# Requires read access to BigBirdReturns/axm-arc (run locally / where that
# access exists; world's normal build does NOT need it).
set -euo pipefail

REF="${1:-main}"
ARC_REPO="https://github.com/BigBirdReturns/axm-arc.git"
SHARED_PATHS=("src/engine" "src/arcs" "tests/engine" "tests/fixtures" "src/godscar" "tests/godscar" "cartridges")

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROV="$ROOT/src/engine/VENDORED_FROM"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Cloning axm-arc@$REF ..."
git clone --quiet --depth 1 --branch "$REF" "$ARC_REPO" "$TMP/arc" 2>/dev/null \
  || git clone --quiet "$ARC_REPO" "$TMP/arc"   # fall back for raw SHAs
git -C "$TMP/arc" checkout --quiet "$REF" 2>/dev/null || true
SHA="$(git -C "$TMP/arc" rev-parse HEAD)"

for p in "${SHARED_PATHS[@]}"; do
  SRC="$TMP/arc/$p"
  DEST="$ROOT/$p"
  if [ ! -d "$SRC" ]; then
    echo "ERROR: $p not found in axm-arc@$REF" >&2
    exit 1
  fi
  echo "Vendoring $p from $SHA ..."
  if [ "$p" = "src/engine" ]; then
    # VENDORED_FROM is receiver-owned provenance, not upstream engine source.
    PRESERVED="$(mktemp)"
    [ -f "$PROV" ] && cp "$PROV" "$PRESERVED" || true
    rm -rf "$DEST"
    mkdir -p "$DEST"
    cp -a "$SRC/." "$DEST/"
    [ -s "$PRESERVED" ] && cp "$PRESERVED" "$PROV" || true
  else
    rm -rf "$DEST"
    mkdir -p "$(dirname "$DEST")"
    cp -a "$SRC" "$DEST"
  fi
done

cat > "$PROV" <<EOF
# Provenance for the surface shared with axm-arc.
#
# The following paths are vendored verbatim from axm-arc so world's
# build/deploy stay self-contained (no axm-arc access required at build time):
#
#   src/engine  src/arcs  tests/engine  tests/fixtures  src/godscar  tests/godscar  cartridges
#
# This file records exactly which axm-arc commit the copies correspond to, so
# drift can be detected. The reconciliation contract (what is shared, and the
# rule that shared-surface changes land in axm-arc first) lives in axm-arc's
# RECONCILIATION.md; see this repo's RECONCILIATION.md for the world-side
# workflow.
#
# To re-sync after axm-arc changes:
#   scripts/sync-engine.sh [<axm-arc ref, default: main>]
#
# To check for silent drift against the pinned commit:
#   scripts/check-engine-drift.sh
#
# Both are wired as npm scripts: \`npm run engine:sync\`, \`npm run engine:check\`.

repo: BigBirdReturns/axm-arc
paths: src/engine src/arcs tests/engine tests/fixtures src/godscar tests/godscar cartridges
commit: $SHA
synced: $(date -u +%Y-%m-%d)
EOF

echo "Done. Shared surface now matches axm-arc@$SHA."
echo "Review the diff, run 'npm run check', then commit."
