#!/usr/bin/env bash
# Re-vendor src/engine/ from axm-arc and update the VENDORED_FROM provenance.
#
# Usage: scripts/sync-engine.sh [<axm-arc ref>]
#   ref defaults to "main".
#
# Requires read access to BigBirdReturns/axm-arc (run locally / where that
# access exists; world's normal build does NOT need it).
set -euo pipefail

REF="${1:-main}"
ARC_REPO="https://github.com/BigBirdReturns/axm-arc.git"
ARC_ENGINE_PATH="src/engine"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/src/engine"
PROV="$DEST/VENDORED_FROM"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Cloning axm-arc@$REF ..."
git clone --quiet --depth 1 --branch "$REF" "$ARC_REPO" "$TMP/arc" 2>/dev/null \
  || git clone --quiet "$ARC_REPO" "$TMP/arc"   # fall back for raw SHAs
git -C "$TMP/arc" checkout --quiet "$REF" 2>/dev/null || true
SHA="$(git -C "$TMP/arc" rev-parse HEAD)"

SRC="$TMP/arc/$ARC_ENGINE_PATH"
if [ ! -d "$SRC" ]; then
  echo "ERROR: $ARC_ENGINE_PATH not found in axm-arc@$REF" >&2
  exit 1
fi

echo "Vendoring $ARC_ENGINE_PATH from $SHA ..."
# Replace every tracked .ts source; preserve the provenance file itself.
find "$DEST" -maxdepth 1 -name '*.ts' -delete
cp "$SRC"/*.ts "$DEST"/

cat > "$PROV" <<EOF
# Provenance for the vendored simulation engine.
#
# The files in this directory (src/engine/) are vendored verbatim from
# axm-arc. world keeps a local copy so its build/deploy stay self-contained
# (no axm-arc access required at build time). This file records exactly which
# axm-arc commit the copy corresponds to, so drift can be detected.
#
# To re-sync after axm-arc's engine changes:
#   scripts/sync-engine.sh [<axm-arc ref, default: main>]
#
# To check for silent drift against the pinned commit:
#   scripts/check-engine-drift.sh
#
# Both are wired as npm scripts: \`npm run engine:sync\`, \`npm run engine:check\`.

repo: BigBirdReturns/axm-arc
path: src/engine
commit: $SHA
synced: $(date -u +%Y-%m-%d)
EOF

echo "Done. src/engine now matches axm-arc@$SHA."
echo "Review the diff, run 'npm run check', then commit."
