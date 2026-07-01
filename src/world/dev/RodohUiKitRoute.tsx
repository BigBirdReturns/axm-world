// Live catalogue of every Rodoh pixel-ui component and First Charter motif icon.
// This is the acceptance surface: if a component only exists here and not in
// gameplay, the integration is incomplete. Every component rendered below must
// also appear in the actual gameplay surfaces (regions.tsx, ContractBoard,
// EncounterDirector) using the same class names and component APIs.

import "../pixel-ui/pixel-ui.css";
import "../themes/first-charter/first-charter.css";
import {
  PixelAttribute,
  PixelBadge,
  PixelButton,
  PixelContractCard,
  PixelFrame,
  PixelGearSlot,
  PixelIcon,
  PixelLootCard,
  PixelMeter,
  PixelPanel,
  PixelReadinessRow,
  PixelRoleBadge,
  PixelRosterCard,
  PixelStateBadge,
} from "../pixel-ui/index.js";
import { MotifIcon, type FirstCharterMotifName } from "../themes/first-charter/motif-icons.js";

const MOTIFS: FirstCharterMotifName[] = [
  "dandelion", "archiveBox", "coffeeMug", "crossedCalendar", "receiptTab", "notebook", "starSpark",
];

function Section(props: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: "var(--px-font)", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--parchment-gold)", marginBottom: 12 }}>
        {props.title}
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{props.children}</div>
    </section>
  );
}

export function RodohUiKitRoute(): JSX.Element {
  return (
    <div
      data-testid="rodoh-ui-kit"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "auto",
        padding: 24,
        background: "linear-gradient(180deg, #11100d, #080706 70%)",
        color: "#ece4d4",
        fontFamily: "var(--px-font)",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Rodoh UI Kit</h1>
      <p style={{ color: "#a59c8b", fontSize: 12, marginBottom: 24, maxWidth: 560 }}>
        Every live Rodoh pixel-ui component and First Charter motif icon, rendered directly
        from the same source used in gameplay. No emoji, no placeholder glyphs.
      </p>

      <Section title="Role Badges">
        <PixelRoleBadge role="Vanguard" />
        <PixelRoleBadge role="Skirmisher" />
        <PixelRoleBadge role="Mender" />
      </Section>

      <Section title="Attributes">
        <PixelAttribute name="Power" value={7} icon="power" gearBonus={2} highlighted />
        <PixelAttribute name="Mettle" value={4} icon="mettle" />
        <PixelAttribute name="Wits" value={5} icon="wits" gearBonus={1} />
        <PixelAttribute name="Spirit" value={3} icon="spirit" />
      </Section>

      <Section title="Gear Slots">
        <PixelGearSlot name="Rusty Blade" icon="rustyBlade" bonusText="Power +2" />
        <PixelGearSlot name="Guard Charm" icon="guardCharm" bonusText="Spirit +1" />
        <PixelGearSlot />
      </Section>

      <Section title="State Badges">
        <PixelStateBadge state="available">Available</PixelStateBadge>
        <PixelStateBadge state="reliable">Reliable</PixelStateBadge>
        <PixelStateBadge state="risky">Risky</PixelStateBadge>
        <PixelStateBadge state="failing">Failing</PixelStateBadge>
        <PixelStateBadge state="locked">Locked</PixelStateBadge>
        <PixelStateBadge state="recorded">Recorded</PixelStateBadge>
      </Section>

      <Section title="Readiness Rows">
        <div style={{ display: "grid", gap: 8, width: 320 }}>
          <PixelReadinessRow name="Power Check" status="ready" projected={9} threshold={7} margin={2} shortBy={0} attributeNames={["Power"]} scope="team" />
          <PixelReadinessRow name="Wits Check" status="thin" projected={6} threshold={5.5} margin={0.5} shortBy={1.2} attributeNames={["Wits"]} scope="per-agent" />
          <PixelReadinessRow name="Spirit Check" status="short" projected={3} threshold={6} margin={-3} shortBy={3.5} attributeNames={["Spirit"]} scope="team" />
        </div>
      </Section>

      <Section title="Loot Cards">
        <div style={{ width: 320 }}>
          <PixelLootCard itemName="Guard's Trophy" icon="guardCharm" slot="Trinket" bonusText="Spirit +1" flavorText="Taken from a warden who no longer needs it.">
            <PixelButton variant="confirm" style={{ minHeight: 36, fontSize: 10, padding: "5px 10px" }}>Equip → Rook</PixelButton>
          </PixelLootCard>
        </div>
      </Section>

      <Section title="Roster Card">
        <div style={{ width: 300 }}>
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
        </div>
      </Section>

      <Section title="Contract Card">
        <div style={{ width: 260 }}>
          <PixelContractCard
            state="reliable"
            difficulty={3}
            title="The Bridge Toll"
            description="A troll wants coin or trouble."
            requirements={<span className="pixel-contract-card__pill"><PixelIcon name="vanguard" /> 1 Vanguard</span>}
            footerLeft="Party 2–3"
            footerRight={<PixelIcon name="lootAvailable" label="Loot" />}
            onClick={() => {}}
          />
        </div>
      </Section>

      <Section title="Meters &amp; Frames">
        <div style={{ width: 160 }}>
          <PixelMeter value={60} max={100} segments={5} color="var(--teal)" label="Stress" />
        </div>
        <PixelFrame style={{ padding: 12, width: 160 }}>Pixel Frame</PixelFrame>
        <PixelBadge state="lootAvailable" icon={<PixelIcon name="lootAvailable" />}>Loot Ready</PixelBadge>
      </Section>

      <Section title="First Charter Motif Icons">
        {MOTIFS.map((name) => (
          <PixelPanel key={name} style={{ padding: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 96 }}>
            <MotifIcon name={name} size={32} />
            <span style={{ fontSize: 9 }}>{name}</span>
          </PixelPanel>
        ))}
      </Section>
    </div>
  );
}
