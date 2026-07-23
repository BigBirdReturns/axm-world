from pathlib import Path
import base64
import subprocess
import zlib

root = Path(__file__).resolve().parents[1]
parts = sorted((root / "tools/gate4-payload").glob("*.txt"))
if [part.name for part in parts] != ["00.txt", "01.txt", "02.txt", "03.txt"]:
    raise SystemExit(f"Incomplete Gate 4 payload: {[part.name for part in parts]}")
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
