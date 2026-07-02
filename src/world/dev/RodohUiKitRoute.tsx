// Live design-system reference sheet for the Rodoh pixel-ui asset payload.
// This is the acceptance surface: every component here is the SAME component
// imported by gameplay (regions.tsx, ContractBoard, EncounterDirector) — not a
// separate mockup. If a component only exists here and not in gameplay, the
// integration is incomplete (see tests/world/pixel-ui-integration.test.ts).

import "../pixel-ui/pixel-ui.css";
import "../themes/first-charter/first-charter.css";
import "./rodoh-ui-kit.css";
import {
  PixelAttribute,
  PixelButton,
  PixelContractCard,
  PixelGearSlot,
  PixelIcon,
  PixelLootCard,
  PixelPanel,
  PixelReadinessRow,
  PixelRoleBadge,
  PixelRosterCard,
  PixelStateBadge,
  PIXEL_ICON_NAMES,
  type ContractCardState,
  type PixelBadgeState,
} from "../pixel-ui/index.js";
import { MotifIcon, type FirstCharterMotifName } from "../themes/first-charter/motif-icons.js";

const MOTIFS: FirstCharterMotifName[] = [
  "dandelion", "archiveBox", "coffeeMug", "crossedCalendar", "receiptTab", "notebook", "starSpark",
];

const CONTRACT_STATES: ContractCardState[] = [
  "selected", "available", "reliable", "risky", "failing", "locked", "recorded",
];

const BADGE_STATES: PixelBadgeState[] = [
  "available", "reliable", "risky", "failing", "locked", "recorded", "selected", "lootAvailable",
];

const PALETTE: Array<{ name: string; css: string }> = [
  { name: "cream", css: "var(--cream)" },
  { name: "ink", css: "var(--ink)" },
  { name: "gold", css: "var(--gold)" },
  { name: "teal", css: "var(--teal)" },
  { name: "danger", css: "var(--danger)" },
  { name: "coffee", css: "var(--coffee)" },
  { name: "stone", css: "var(--stone)" },
];

const SOURCE_RUNTIME_ROWS: Array<{ source: string; runtime: string; provenance: string }> = [
  { source: "rodoh_platform_identity_system_guide.png", runtime: "PixelPanel / PixelButton / PixelBadge tokens", provenance: "redrawn derivative — palette, panel frames, button/chip states" },
  { source: "axm_world_runtime_ui_asset_pack.png", runtime: "PixelIcon (all 19 state/role/attribute/item icons)", provenance: "redrawn derivative — see component-inventory.md for per-icon match quality" },
  { source: "first_charter_theme_asset_pack_overview.png", runtime: "MotifIcon (7 First Charter motifs)", provenance: "redrawn derivative — see component-inventory.md for per-motif match quality" },
  { source: "docs/design/harvest/AXM-WORLD.template.no-fonts.html", runtime: "reference only, not wired into runtime", provenance: "harvested asset (no-font standalone export)" },
  { source: "docs/design/harvest/standalone_inventory.json", runtime: "reference only, not wired into runtime", provenance: "harvested asset" },
];

const TOC: Array<{ id: string; label: string }> = [
  { id: "provenance", label: "Source Mapping" },
  { id: "icons", label: "Icon Matrix" },
  { id: "roles", label: "Role Badges" },
  { id: "attributes", label: "Attributes" },
  { id: "gear", label: "Gear Slots" },
  { id: "states", label: "State Badges" },
  { id: "readiness", label: "Readiness Rows" },
  { id: "roster", label: "Roster Cards" },
  { id: "contracts", label: "Contract Cards" },
  { id: "loot", label: "Loot / Equip" },
  { id: "encounter", label: "Encounter Motifs" },
  { id: "tone", label: "Dark / Light" },
  { id: "context", label: "Gameplay Context" },
  { id: "mobile", label: "Mobile Preview" },
];

function Section(props: { id: string; title: string; note?: string; wide?: boolean; children: React.ReactNode }): JSX.Element {
  return (
    <section id={props.id} className="rk-section">
      <h2>{props.title}</h2>
      {props.note && <p className="rk-section-note">{props.note}</p>}
      {props.children}
    </section>
  );
}

function IconMatrix(): JSX.Element {
  return (
    <div>
      {PIXEL_ICON_NAMES.map((name) => (
        <div key={name} className="rk-icon-row">
          <span className="rk-icon-name">{name}</span>
          <div className="rk-icon-sizes">
            {[16, 24, 32, 64].map((size) => (
              <div key={size} className="rk-icon-size-cell">
                <PixelIcon name={name} size={size} />
                <span className="rk-icon-size-label">{size}px</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RodohUiKitRoute(): JSX.Element {
  return (
    <div data-testid="rodoh-ui-kit" className="rk-page">
      <header className="rk-header">
        <div>
          <div className="rk-eyebrow">Rodoh Runtime · Design System</div>
          <h1>Pixel-UI Reference Sheet</h1>
          <p className="rk-sub">
            Every live component and state below is the exact same gameplay import — not a
            mockup. PixelIcon shapes are 32x32 grids extracted programmatically from
            <code> axm_world_runtime_ui_asset_pack.png</code> (connected-component detection,
            LANCZOS downsample, luminance-based fill/outline/detail classification) — traced
            directly from the sheet, not invented and not an embedded image slice. See "Source vs
            Runtime Mapping" below and
            <code> docs/design/references/component-inventory.md</code> for the per-icon citation
            and honest match-quality rating.
          </p>
        </div>
        <div className="rk-meta">
          <span><strong>v1.0</strong> component set</span>
          <span>8px grid unit</span>
          <span>touch targets ≥ 44px</span>
          <span className="rk-palette">
            {PALETTE.map((p) => (
              <span key={p.name} className="rk-swatch" style={{ background: p.css }} title={p.name} />
            ))}
          </span>
        </div>
      </header>

      <nav className="rk-toc">
        {TOC.map((t) => <a key={t.id} href={`#${t.id}`}>{t.label}</a>)}
      </nav>

      <Section id="provenance" title="Source vs Runtime Mapping" note="Every harvested reference sheet actually present in this repo, and what runtime code was redrawn from it. See docs/design/references/component-inventory.md for the full per-icon table.">
        <div style={{ display: "grid", gap: 8 }}>
          {SOURCE_RUNTIME_ROWS.map((row) => (
            <PixelPanel key={row.source} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1.3fr", gap: 12, padding: 10, alignItems: "start" }}>
              <div>
                <div className="pixel-panel__title">Harvested source</div>
                <div style={{ fontSize: 10, color: "var(--ink-soft)", lineHeight: 1.4, fontFamily: "var(--px-font)" }}>{row.source}</div>
              </div>
              <div>
                <div className="pixel-panel__title">Runtime</div>
                <div style={{ fontSize: 10, color: "var(--ink-soft)", lineHeight: 1.4, fontFamily: "var(--px-font)" }}>{row.runtime}</div>
              </div>
              <div>
                <div className="pixel-panel__title">Provenance</div>
                <div style={{ fontSize: 10, color: "var(--ink-soft)", lineHeight: 1.4, fontFamily: "var(--px-font)" }}>{row.provenance}</div>
              </div>
            </PixelPanel>
          ))}
        </div>
      </Section>

      <Section id="icons" title="Icon Matrix" note="Every PixelIcon at 16 / 24 / 32 / 64px. Each is a 32×32 grid extracted programmatically from axm_world_runtime_ui_asset_pack.png (fill/outline/detail classified by luminance) — never a text glyph, and not a slice of the source PNG. A few lost minor flourishes in extraction (selected's corner brackets, lootAvailable's sparkles); see component-inventory.md.">
        <IconMatrix />
      </Section>

      <Section id="roles" title="Role Badges" note="PixelRoleBadge — used inside PixelRosterCard in live gameplay.">
        <div className="rk-grid rk-grid--narrow">
          <div className="rk-cell"><PixelRoleBadge role="Vanguard" /><span className="rk-cell-label">Vanguard</span></div>
          <div className="rk-cell"><PixelRoleBadge role="Skirmisher" /><span className="rk-cell-label">Skirmisher</span></div>
          <div className="rk-cell"><PixelRoleBadge role="Mender" /><span className="rk-cell-label">Mender</span></div>
        </div>
      </Section>

      <Section id="attributes" title="Attributes" note="PixelAttribute — normal and highlighted (best-in-party) states, with and without gear bonus.">
        <div className="rk-grid rk-grid--narrow">
          <div className="rk-cell"><PixelAttribute name="Power" value={7} icon="power" /><span className="rk-cell-label">Base</span></div>
          <div className="rk-cell"><PixelAttribute name="Power" value={7} icon="power" gearBonus={2} /><span className="rk-cell-label">With gear bonus</span></div>
          <div className="rk-cell"><PixelAttribute name="Wits" value={5} icon="wits" gearBonus={1} highlighted /><span className="rk-cell-label">Highlighted (strongest)</span></div>
          <div className="rk-cell"><PixelAttribute name="Mettle" value={4} icon="mettle" /><span className="rk-cell-label">Mettle</span></div>
          <div className="rk-cell"><PixelAttribute name="Spirit" value={3} icon="spirit" /><span className="rk-cell-label">Spirit</span></div>
        </div>
      </Section>

      <Section id="gear" title="Gear Slots" note="PixelGearSlot — filled and empty states.">
        <div className="rk-grid rk-grid--narrow">
          <div className="rk-cell"><PixelGearSlot name="Rusty Blade" icon="rustyBlade" bonusText="Power +2" /><span className="rk-cell-label">Filled</span></div>
          <div className="rk-cell"><PixelGearSlot name="Guard Charm" icon="guardCharm" bonusText="Spirit +1" /><span className="rk-cell-label">Filled</span></div>
          <div className="rk-cell"><PixelGearSlot name="Field Satchel" icon="fieldSatchel" bonusText="Wits +1" /><span className="rk-cell-label">Filled</span></div>
          <div className="rk-cell"><PixelGearSlot /><span className="rk-cell-label">Empty</span></div>
        </div>
      </Section>

      <Section id="states" title="State Badges" note="PixelStateBadge — every state the engine can project onto a contract or check.">
        <div className="rk-grid rk-grid--narrow">
          {BADGE_STATES.map((s) => (
            <div key={s} className="rk-cell">
              <PixelStateBadge state={s}>{s[0]?.toUpperCase()}{s.slice(1)}</PixelStateBadge>
              <span className="rk-cell-label">{s}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="readiness" title="Readiness Rows" note="PixelReadinessRow — ready, thin (risky), and short (failing) states, as shown in ContractRegion.">
        <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <PixelReadinessRow name="Power Check" status="ready" projected={9} threshold={7} margin={2} shortBy={0} attributeNames={["Power"]} scope="team" />
          <PixelReadinessRow name="Wits Check" status="thin" projected={6} threshold={5.5} margin={0.5} shortBy={1.2} attributeNames={["Wits"]} scope="per-agent" />
          <PixelReadinessRow name="Spirit Check" status="short" projected={3} threshold={6} margin={-3} shortBy={3.5} attributeNames={["Spirit"]} scope="team" />
        </div>
      </Section>

      <Section id="roster" title="Roster Cards" note="PixelRosterCard — in-party, benched, downed, and afflicted states." wide>
        <div className="rk-grid rk-grid--wide">
          <PixelRosterCard
            name="Rook"
            role="Vanguard"
            inParty
            attributes={[
              { id: "power", name: "Power", value: 7, icon: "power", gearBonus: 2, highlighted: true },
              { id: "mettle", name: "Mettle", value: 4, icon: "mettle" },
            ]}
            gear={[{ id: "g1", name: "Rusty Blade", icon: "rustyBlade", bonusText: "Power +2" }]}
            stress={30}
            morale={70}
            selectable
          />
          <PixelRosterCard
            name="Sable"
            role="Skirmisher"
            attributes={[{ id: "wits", name: "Wits", value: 6, icon: "wits" }]}
            gear={[]}
            stress={55}
            morale={45}
            selectable
          />
          <PixelRosterCard
            name="Iven"
            role="Mender"
            downed
            affliction="Wounded"
            attributes={[{ id: "spirit", name: "Spirit", value: 5, icon: "spirit" }]}
            gear={[{ id: "g2", name: "Guard Charm", icon: "guardCharm", bonusText: "Spirit +1" }]}
            stress={80}
            morale={20}
          />
        </div>
      </Section>

      <Section id="contracts" title="Contract Cards" note="PixelContractCard — every projected outcome state, including locked with unlock requirements." wide>
        <div className="rk-grid rk-grid--wide">
          {CONTRACT_STATES.map((state) => (
            <PixelContractCard
              key={state}
              state={state}
              selected={state === "selected"}
              difficulty={3}
              title={state === "locked" ? "The Warden's Keep" : "The Bridge Toll"}
              description={state === "locked" ? "The old warden has gone rogue." : "A troll wants coin or trouble."}
              unlockRequirements={["Clear The Cellar", "Clear The Bridge Troll"]}
              requirements={state !== "locked" ? <span className="pixel-contract-card__pill"><PixelIcon name="vanguard" /> 1 Vanguard</span> : undefined}
              riskNote={state === "risky" || state === "failing" ? <><PixelIcon name={state === "failing" ? "failing" : "risky"} /> Wits needs +1.2 buffer.</> : undefined}
              readyNote={state === "reliable" ? <><PixelIcon name="reliable" /> Recommended party is reliable.</> : undefined}
              footerLeft="Party 2–3"
              footerRight={state !== "locked" ? <PixelIcon name="lootAvailable" label="Loot" /> : undefined}
              onClick={() => {}}
            />
          ))}
        </div>
      </Section>

      <Section id="loot" title="Loot / Equip" note="PixelLootCard — as rendered in LootRegion, with multiple eligible-agent equip targets." wide>
        <div className="rk-grid rk-grid--wide">
          <PixelLootCard itemName="Guard's Trophy" icon="guardCharm" slot="Trinket" bonusText="Spirit +1" flavorText="Taken from a warden who no longer needs it.">
            <PixelButton variant="confirm" style={{ minHeight: 36, fontSize: 10, padding: "5px 10px" }}>Equip → Rook</PixelButton>
            <PixelButton variant="secondary" style={{ minHeight: 36, fontSize: 10, padding: "5px 10px" }}>Equip → Sable</PixelButton>
          </PixelLootCard>
          <PixelLootCard itemName="Rusty Pick" icon="rustyBlade" slot="Weapon" bonusText="Power +2" flavorText="Better than fists. Barely.">
            <PixelButton variant="confirm" style={{ minHeight: 36, fontSize: 10, padding: "5px 10px" }}>Equip → Iven</PixelButton>
          </PixelLootCard>
        </div>
      </Section>

      <Section id="encounter" title="Encounter Motifs" note="First Charter MotifIcon set — redrawn derivatives of first_charter_theme_asset_pack_overview.png §1, replacing the emoji glyphs EncounterDirector used to render per-location." wide>
        <div className="rk-grid rk-grid--narrow">
          {MOTIFS.map((name) => (
            <div key={name} className="rk-cell">
              <MotifIcon name={name} size={40} className="enc-motif-stage" />
              <span className="rk-cell-label">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="tone" title="Dark / Light Examples" note="Gameplay chrome is dark (Board/Encounter shell); gameplay content panels are cream. Both share the same tokens.">
        <div className="rk-tone-demo">
          <div className="rk-tone-card rk-tone-card--dark">
            <span className="rk-tone-card-label">Dark shell chrome</span>
            <PixelStateBadge state="reliable">Reliable</PixelStateBadge>
            <PixelRoleBadge role="Vanguard" />
          </div>
          <PixelPanel className="rk-tone-card rk-tone-card--light" tone="light">
            <span className="rk-tone-card-label">Light gameplay panel</span>
            <PixelStateBadge state="risky">Risky</PixelStateBadge>
            <PixelGearSlot name="Rusty Blade" icon="rustyBlade" bonusText="Power +2" />
          </PixelPanel>
        </div>
      </Section>

      <Section id="context" title="Gameplay Context Sample" note="The same roster and contract components as they actually appear together in the Shell — not isolated swatches." wide>
        <div className="rk-context-board">
          <PixelRosterCard
            name="Rook"
            role="Vanguard"
            inParty
            attributes={[
              { id: "power", name: "Power", value: 7, icon: "power", gearBonus: 2, highlighted: true },
              { id: "mettle", name: "Mettle", value: 4, icon: "mettle" },
            ]}
            gear={[{ id: "g1", name: "Rusty Blade", icon: "rustyBlade", bonusText: "Power +2" }]}
            stress={30}
            morale={70}
            selectable
          />
          <div style={{ display: "grid", gap: 12 }}>
            <PixelContractCard
              state="risky"
              difficulty={4}
              title="The Bridge Troll"
              description="A troll has claimed the river crossing north of town, demanding tolls and searching merchant wagons."
              requirements={<span className="pixel-contract-card__pill"><PixelIcon name="vanguard" /> 1 Vanguard</span>}
              riskNote={<><PixelIcon name="risky" /> Wits needs +1.2 more buffer.</>}
              footerLeft="Party 2–3"
              footerRight={<PixelIcon name="lootAvailable" label="Loot" />}
              onClick={() => {}}
            />
            <PixelReadinessRow name="Wits Check" status="thin" projected={6} threshold={5.5} margin={0.5} shortBy={1.2} attributeNames={["Wits"]} scope="per-agent" />
          </div>
        </div>
      </Section>

      <Section id="mobile" title="Mobile Preview (390px)" note="Same components in the mobile bottom-dock / carousel layout used by the Shell below 480px.">
        <div className="rk-mobile-frame-wrap">
          <div className="rk-mobile-frame">
            <div className="rk-mobile-frame__notch" />
            <div className="rk-mobile-frame__screen">
              <div style={{ fontSize: 10, color: "#8b7d6a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Roster · party 2/4</div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                <div style={{ flex: "0 0 auto", width: "min(85vw, 240px)" }}>
                  <PixelRosterCard
                    name="Rook" role="Vanguard" inParty
                    attributes={[{ id: "power", name: "Power", value: 7, icon: "power", highlighted: true }]}
                    gear={[{ id: "g1", name: "Rusty Blade", icon: "rustyBlade", bonusText: "Power +2" }]}
                    stress={30} morale={70} selectable
                  />
                </div>
                <div style={{ flex: "0 0 auto", width: "min(85vw, 240px)" }}>
                  <PixelRosterCard
                    name="Sable" role="Skirmisher"
                    attributes={[{ id: "wits", name: "Wits", value: 6, icon: "wits" }]}
                    gear={[]}
                    stress={55} morale={45} selectable
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <PixelContractCard
                  state="available"
                  difficulty={2}
                  title="The Cellar"
                  description="A nest of giant rats has infested the guild cellar."
                  footerLeft="Party 6"
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="rk-mobile-label">390px viewport · bottom-dock roster carousel</div>
      </Section>
    </div>
  );
}
