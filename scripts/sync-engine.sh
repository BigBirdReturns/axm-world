#!/usr/bin/env bash
# Re-vendor the shared surface from axm-arc and update the VENDORED_FROM
# provenance. The shared surface (see RECONCILIATION.md in axm-arc) is:
#
#   src/engine      the deterministic rules engine
#   src/arcs        the bundled tutorial arc content
#   tests/engine    engine subsystem + resolver tests
#   tests/fixtures  shared test fixtures
#
# Usage: scripts/sync-engine.sh [<axm-arc ref>]
#   ref defaults to "main".
#
# Requires read access to BigBirdReturns/axm-arc (run locally / where that
# access exists; world's normal build does NOT need it).
set -euo pipefail

REF="${1:-main}"
ARC_REPO="https://github.com/BigBirdReturns/axm-arc.git"
SHARED_PATHS=("src/engine" "src/arcs" "tests/engine" "tests/fixtures")

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
  mkdir -p "$DEST"
  # Mirror every tracked .ts source RECURSIVELY (subdirectories included), so the
  # vendored copy matches the recursive drift check (check-engine-drift.sh uses
  # `diff -rq`). Preserve the provenance file and any non-.ts content.
  find "$DEST" -name '*.ts' -delete
  ( cd "$SRC" && find . -name '*.ts' -print0 | while IFS= read -r -d '' f; do
      mkdir -p "$DEST/$(dirname "$f")"
      cp "$f" "$DEST/$f"
    done )
  # Prune directories left empty by the delete (e.g. a subdir removed upstream),
  # so a stale empty dir cannot register as drift.
  find "$DEST" -mindepth 1 -type d -empty -delete
done

cat > "$PROV" <<EOF
# Provenance for the surface shared with axm-arc.
#
# The following paths are vendored verbatim from axm-arc so world's
# build/deploy stay self-contained (no axm-arc access required at build time):
#
#   src/engine  src/arcs  tests/engine  tests/fixtures
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
paths: src/engine src/arcs tests/engine tests/fixtures
commit: $SHA
synced: $(date -u +%Y-%m-%d)
EOF

echo "Done. Shared surface now matches axm-arc@$SHA."
echo "Review the diff, run 'npm run check', then commit."
