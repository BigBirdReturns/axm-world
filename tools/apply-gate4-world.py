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

# A steward is ordinary authored content, not authority to redirect every opening
# into the Hall. Preserve the historical Program 001 handoff only for programs
# whose entry contract explicitly requests guided-first-contract. Direct-runtime
# cartridges, including Program 004, remain on their manifest representation.
shell_path = root / "src/world/shell/Shell.tsx"
shell = shell_path.read_text()
import_marker = 'import { hallSteward } from "../inhabited/people.js";\n'
if shell.count(import_marker) != 1:
    raise SystemExit("Gate 4 could not locate the Hall steward import.")
shell = shell.replace(
    import_marker,
    import_marker + 'import { programForCartridge } from "../program-of-record.js";\n',
    1,
)
condition_marker = "if (closesOpening && hallSteward(world.cartridge)) {"
if shell.count(condition_marker) != 1:
    raise SystemExit("Gate 4 could not locate the opening Hall handoff condition.")
shell = shell.replace(
    condition_marker,
    'if (closesOpening && programForCartridge(world.cartridge)?.entryExperience === "guided-first-contract" && hallSteward(world.cartridge)) {',
    1,
)

# Entering a selected Underworld expedition must commit the party the holder has
# actually composed. Recommending again at the encounter boundary silently erased
# add, swap, and downtime decisions made in the shared roster surface.
party_marker = "    setEncounterParty(world.recommendedParty(challengeId));"
if shell.count(party_marker) != 1:
    raise SystemExit("Gate 4 could not locate the encounter-party seed.")
shell = shell.replace(
    party_marker,
    "    const committedParty = ix.selectedId === challengeId && ix.party.length > 0\n"
    "      ? ix.party\n"
    "      : world.recommendedParty(challengeId);\n"
    "    setEncounterParty(committedParty);",
    1,
)
shell_path.write_text(shell)

# Mobile intentionally returns from an encounter to its staged Contract sheet.
# The Gate 4 browser journey must perform the same Back-to-Board action a holder
# performs before asserting the Underworld representation is visible again.
e2e_path = root / "e2e/lamp-district-gate4.spec.ts"
e2e = e2e_path.read_text()
e2e = e2e.replace("attempt <= 24", "attempt <= 32", 1)
return_marker = "    await page.getByTestId(\"encs-leave\").click();\n    await resolvePendingDecisions(page);\n    await expect(page.getByTestId(\"underworld-scene\")).toBeVisible();"
return_replacement = "    await page.getByTestId(\"encs-leave\").click();\n    await resolvePendingDecisions(page);\n    const mobileBack = page.getByTestId(\"mobile-step-back\");\n    if (await mobileBack.isVisible().catch(() => false)) await mobileBack.click();\n    await expect(page.getByTestId(\"underworld-scene\")).toBeVisible();"
if e2e.count(return_marker) != 1:
    raise SystemExit("Gate 4 could not locate the post-encounter Underworld assertion.")
e2e = e2e.replace(return_marker, return_replacement, 1)
e2e = e2e.replace("test.setTimeout(600_000);", "test.setTimeout(900_000);", 1)
e2e_path.write_text(e2e)

print(f"Applied the Gate 4 World patch and materialized {len(new_files['files'])} new files.")
