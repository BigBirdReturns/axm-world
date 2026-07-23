from pathlib import Path
import base64
import subprocess
import zlib

root = Path(__file__).resolve().parents[1]
payload_root = root / "tools/gate4-payload"
names = [
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
parts = [payload_root / name for name in names]
missing = [part.name for part in parts if not part.is_file()]
if missing:
    raise SystemExit(f"Incomplete Gate 4 payload: {missing}")
encoded = "".join(part.read_text().strip() for part in parts)
patch_path = root / ".gate4-world.patch"
patch_path.write_bytes(zlib.decompress(base64.b64decode(encoded)))
subprocess.run(
    ["git", "apply", "--whitespace=nowarn", str(patch_path)],
    cwd=root,
    check=True,
)
patch_path.unlink()
print("Applied the Gate 4 World patch.")
