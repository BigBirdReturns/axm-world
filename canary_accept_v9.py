from pathlib import Path


root = Path(__file__).resolve().parent
existing = root / "canary_scope" / "opaque-seed.txt"
created = root / "canary_scope" / "generated" / "result.txt"
escaped = root / "outside_v9.txt"

assert existing.read_text(encoding="utf-8").strip() == "EXISTING_TOKEN=EXISTING_OK_V9"
assert created.read_text(encoding="utf-8").strip() == "NEW_FILE_OK_V9"
assert not escaped.exists()
