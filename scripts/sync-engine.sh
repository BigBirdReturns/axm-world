#!/usr/bin/env bash
# Re-vendor the complete Arc source and execution plane and update exact
# provenance. Arc's RECONCILIATION.md is the canonical path contract.
set -euo pipefail

REF="${1:-main}"
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
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Cloning axm-arc@$REF ..."
git clone --quiet --depth 1 --branch "$REF" "$ARC_REPO" "$TMP/arc" 2>/dev/null \
  || git clone --quiet "$ARC_REPO" "$TMP/arc"
git -C "$TMP/arc" checkout --quiet "$REF" 2>/dev/null || true
SHA="$(git -C "$TMP/arc" rev-parse HEAD)"

for path in "${SHARED_PATHS[@]}"; do
  source_path="$TMP/arc/$path"
  destination="$ROOT/$path"
  if [ ! -d "$source_path" ]; then
    echo "ERROR: $path not found in axm-arc@$REF" >&2
    exit 1
  fi
  echo "Vendoring $path from $SHA ..."
  if [ "$path" = "src/engine" ]; then
    preserved="$(mktemp)"
    [ -f "$PROV" ] && cp "$PROV" "$preserved" || true
    rm -rf "$destination"
    mkdir -p "$destination"
    cp -a "$source_path/." "$destination/"
    [ -s "$preserved" ] && cp "$preserved" "$PROV" || true
  else
    rm -rf "$destination"
    mkdir -p "$(dirname "$destination")"
    cp -a "$source_path" "$destination"
  fi
done

paths_line="${SHARED_PATHS[*]}"
cat > "$PROV" <<EOF
# Provenance for the complete source and execution plane shared with axm-arc.
#
# The listed paths are vendored verbatim so World builds and runs offline without
# repository access. VENDORED_FROM itself is receiver-owned provenance and is
# excluded from byte comparison.
#
# To update:
#   scripts/sync-engine.sh [<axm-arc ref, default: main>]
# To verify:
#   scripts/check-engine-drift.sh

repo: BigBirdReturns/axm-arc
paths: $paths_line
commit: $SHA
synced: $(date -u +%Y-%m-%d)
EOF

echo "Done. Shared surface now matches axm-arc@$SHA."
echo "Review the diff, run 'npm run check', then commit."
