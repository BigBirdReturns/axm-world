from pathlib import Path

root = Path(__file__).resolve().parents[1]
player_path = root / "src/world/Player.tsx"
player = player_path.read_text()

anchor = 'import "./themes/lamp-district/lamp-district.css";\n'
imports = (
    'import "./themes/lamp-district/lamp-district.css";\n'
    'import "./themes/karazhan/production-assets.css";\n'
    'import "./themes/ilyon/production-assets.css";\n'
    'import "./rodoh-bay.css";\n'
)
if player.count(anchor) != 1:
    raise SystemExit("Could not locate the cartridge theme import anchor.")
if 'import "./rodoh-bay.css";' not in player:
    player = player.replace(anchor, imports, 1)

root_marker = '<div style={screen} role="region" aria-label={t("boot.heroTitle")}>'
root_replacement = '<div className="rodoh-bay-screen" data-testid="rodoh-cartridge-bay" style={screen} role="region" aria-label={t("boot.heroTitle")}>'
if player.count(root_marker) != 1:
    raise SystemExit("Could not locate the Rodoh bay root.")
player = player.replace(root_marker, root_replacement, 1)

shell_marker = '<div style={{ width: "min(560px, 92vw)" }}>'
shell_replacement = '<div className="rodoh-bay-shell" style={{ width: "min(560px, 92vw)" }}>'
if player.count(shell_marker) != 1:
    raise SystemExit("Could not locate the Rodoh bay shell.")
player = player.replace(shell_marker, shell_replacement, 1)

player_path.write_text(player)
print("Bound production asset wave one into Player.tsx.")