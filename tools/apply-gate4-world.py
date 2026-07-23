from pathlib import Path
import base64
import json
import subprocess
import zlib

root = Path(__file__).resolve().parents[1]
payload_root = root / "tools/gate4-payload"

patch_names = [
    "00.txt",
    "01.txt",
    "02-00.txt",
    "02-01.txt",
    "02-02.txt",
    "02-03.txt",
    "02-04.txt",
    "02-05.txt",
    "03.txt",
]
patch_parts = [payload_root / name for name in patch_names]
missing_patch = [part.name for part in patch_parts if not part.is_file()]
if missing_patch:
    raise SystemExit(f"Incomplete Gate 4 patch payload: {missing_patch}")

patch_encoded = "".join(part.read_text().strip() for part in patch_parts)
patch_path = root / ".gate4-world.patch"
patch_path.write_bytes(zlib.decompress(base64.b64decode(patch_encoded)))
subprocess.run(
    ["git", "apply", "--whitespace=nowarn", str(patch_path)],
    cwd=root,
    check=True,
)
patch_path.unlink()

new_names = [f"new-{index:02d}.txt" for index in range(7)]
new_parts = [payload_root / name for name in new_names]
missing_new = [part.name for part in new_parts if not part.is_file()]
if missing_new:
    raise SystemExit(f"Incomplete Gate 4 new-file payload: {missing_new}")

new_encoded = "".join(part.read_text().strip() for part in new_parts)
new_files = json.loads(zlib.decompress(base64.b64decode(new_encoded)))
if set(new_files) != {"files"} or not isinstance(new_files["files"], dict):
    raise SystemExit("Malformed Gate 4 new-file payload.")
for relative, encoded in sorted(new_files["files"].items()):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base64.b64decode(encoded))

print(f"Applied the Gate 4 World patch and materialized {len(new_files['files'])} new files.")
