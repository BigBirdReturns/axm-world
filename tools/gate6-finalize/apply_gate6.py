from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
import subprocess
import zlib

root = Path.cwd()
carrier = root / "tools/gate6-finalize"
manifest = json.loads((carrier / "manifest.json").read_text())
parts = [carrier / "payload" / name for name in manifest["parts"]]
missing = [path.name for path in parts if not path.is_file()]
if missing:
    raise SystemExit(f"Incomplete Gate 6 payload: {missing}")

encoded = "".join(path.read_text().strip() for path in parts)
encoded_sha = hashlib.sha256(encoded.encode()).hexdigest()
print(f"Gate 6 encoded chars={len(encoded)} sha256={encoded_sha}")
if len(encoded) != manifest["encodedChars"] or encoded_sha != manifest["encodedSha256"]:
    raise SystemExit("Gate 6 encoded payload identity mismatch")

patch = zlib.decompress(base64.b64decode(encoded))
patch_sha = hashlib.sha256(patch).hexdigest()
print(f"Gate 6 patch bytes={len(patch)} sha256={patch_sha}")
if len(patch) != manifest["patchBytes"] or patch_sha != manifest["patchSha256"]:
    raise SystemExit("Gate 6 patch identity mismatch")

patch_path = root / ".gate6-world.patch"
patch_path.write_bytes(patch)
check = subprocess.run(
    ["git", "apply", "--check", "--verbose", str(patch_path)],
    cwd=root,
    text=True,
    capture_output=True,
)
print(check.stdout)
print(check.stderr)
if check.returncode != 0:
    raise SystemExit(f"Gate 6 patch check failed with status {check.returncode}")
subprocess.run(
    ["git", "apply", "--whitespace=nowarn", str(patch_path)],
    cwd=root,
    check=True,
)
patch_path.unlink()
print("Applied the World-specific Gate 6 implementation.")
