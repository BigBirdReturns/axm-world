// The inhabited hall — the first "make it real" surface. The player stands in the
// cartridge's founding hall as a presence marker and can either take a contract
// from the steward in person (quick resolve) OR walk to the encounter threshold
// and play it out. BOTH paths reach the SAME engine: the steward resolves via
// world.runChallenge, and the threshold hands off to the SAME EncounterShell the
// board's PLAY ENCOUNTER opens (onEnterEncounter) — no duplicate resolver. So the
// board and inhabited paths converge on one digest-stamped ledger entry, and the
// world visibly changes.
//
// This scene reads run state and calls the engine — it authors nothing. What it
// shows is derived (deriveHallView); what it writes is the existing ledger. All
// chrome routes through t() (guarded by the i18n coverage test); the contract's
// authored name flows verbatim.

import { useState, type CSSProperties } from "react";
import type { SceneProps } from "../presentations.js";
import { deriveHallView, canTakeContract } from "./hall.js";
import { hallSteward } from "./people.js";
import { regionNameForTier } from "../progression.js";
import { summarizeLedger } from "../ledger.js";
import { CartridgePortrait, CartridgeSprite } from "../themes/CartridgeMotif.js";
import { PixelDoll, PixelSprite } from "../pixel-ui/index.js";
import { resolveDollAppearance } from "../themes/appearance.js";
import { themeForArc } from "../themes/select.js";
import { t } from "../i18n/index.js";

// Projected-outcome chrome for the steward's held contract — the same catalog ids
// and tones the encounter's deploy control uses, so the hall speaks the board's
// squad-fit language rather than minting a new verdict vocabulary.
const PROJ_LABEL: Record<string, "encounterShell.projReliable" | "encounterShell.projRisky" | "encounterShell.projFailing" | "encounterShell.projNone"> = {
  success: "encounterShell.projReliable",
  partial: "encounterShell.projRisky",
  failure: "encounterShell.projFailing",
  none: "encounterShell.projNone",
};
const PROJ_COLOR: Record<string, string> = {
  success: "#74ad77",
  partial: "#c9a14a",
  failure: "#b01c18",
  none: "#8b7d6a",
};

const wrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  background: "radial-gradient(120% 90% at 50% 8%, #241f16 0%, #17130d 60%, #0b0a08 100%)",
  display: "flex",
  flexDirection: "column",
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
};

const figureBase: CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: 6,
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const groupStyle: CSSProperties = { display: "grid", justifyItems: "center", gap: 10, flex: "none" };

const btnPrimary: CSSProperties = {
  padding: "8px 16px", border: "none", background: "var(--gold, #c9a14a)", color: "#1b160c",
  fontFamily: "var(--px-font)", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase",
};
const btnGhost: CSSProperties = {
  padding: "7px 14px", border: "1px solid #6b5935", background: "rgba(32,28,20,0.92)", color: "#e6dcc6",
  fontFamily: "var(--px-font)", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
};
// The "next contract" chip — deliberately identical to the world-map's
// .wm-next-tag (parchment-gold on ink, ▸ caret) so the marker on the steward's
// contract and the marker on the map's next pin read as the SAME affordance.
const nextTag: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 3,
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 8, fontWeight: 800,
  letterSpacing: "0.08em", textTransform: "uppercase", color: "#1b160c",
  background: "var(--parchment-gold, #d8b276)", padding: "1px 5px",
};

// Shared "▸ Up next" marker + authored region name. The region flows verbatim
// (authored content); the marker routes through t() and only shows while the
// contract is still the one to take (unresolved).
function ContractPlace(props: { regionName: string; isNext: boolean; testid: string }): JSX.Element {
  return (
    <span
      data-testid={props.testid}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b7d6a" }}
    >
      {props.isNext && (
        <span data-testid={`${props.testid}-next`} style={nextTag}>
          <span aria-hidden="true">▸</span> {t("worldMap.nextContract")}
        </span>
      )}
      {props.regionName}
    </span>
  );
}

function Figure(props: { color: string; label: string; testid?: string; resolved?: boolean; face?: JSX.Element | null }): JSX.Element {
  return (
    <div style={figureBase} data-testid={props.testid} data-resolved={props.resolved === undefined ? undefined : props.resolved ? "true" : "false"}>
      {/* An authored face when the cartridge names this person; the neutral
          capsule body otherwise — presence is authored, never invented. */}
      {props.face ?? (
        <span aria-hidden="true" style={{ width: 26, height: 40, borderRadius: "13px 13px 5px 5px", background: props.color, boxShadow: "0 6px 14px -6px rgba(0,0,0,0.8)" }} />
      )}
      <span style={{ color: "#a59c8b" }}>{props.label}</span>
    </div>
  );
}

export function HallScene({ world, interaction, modalOpen = false, onEnterEncounter, onNavigate }: SceneProps): JSX.Element {
  const theme = themeForArc(world.cartridge.arc);
  const [open, setOpen] = useState(false);
  const [atThreshold, setAtThreshold] = useState(false);
  const view = deriveHallView(world.nodes);
  // The authored person the cartridge places in the hall (name/role/bio/spoken
  // lines flow verbatim); null → a generic runtime steward for cartridges that
  // author no people. Personhood is authored; the action paths are unchanged.
  const person = hallSteward(world.cartridge);
  // The contract the steward holds is the SAME node the world-map marks "next"
  // (both derive from deriveHallView). Naming its region here — via the shared
  // regionNameForTier the map groups by — lets the player see the steward's
  // contract and the map's next pin as one place, not two navigation systems.
  const heldNode = view.challengeId ? world.nodes.find((n) => n.challengeId === view.challengeId) ?? null : null;
  const regionName = heldNode ? regionNameForTier(world.cartridge.arc, heldNode.tierIndex) : null;
  // What the hall REMEMBERS — derived from the same run ledger every surface reads
  // (summarizeLedger). A result enters the ledger on any outcome, so the hall
  // acknowledges memory keyed on the ledger, not just on a visibly-cleared node.
  const memory = summarizeLedger(world.ledger);
  const remembers = memory.entryCount > 0;
  // Unclaimed loot must be claimed before starting another run: runChallenge
  // replaces the pending reward choices, so taking a new contract now would
  // silently discard the previous reward. Mirrors the board's loot-owns-the-rail
  // guarantee — and gates BOTH the steward and the threshold.
  const lootPending = world.pendingLoot.length > 0;
  const canTake = canTakeContract(view, world.pendingLoot.length);
  const walked = canTake && atThreshold;
  // Party status for the steward's contract — the SAME resolver-faithful projection
  // the board and encounter read (evaluateParty over the recommended party), so the
  // hall's verdict can never disagree with the other surfaces. Display-only.
  const heldReadiness = view.challengeId && !view.resolved
    ? world.evaluateParty(view.challengeId, world.recommendedParty(view.challengeId))
    : null;

  // Route to the board with the steward's contract selected: the same interaction
  // selection + view switch the shell already owns — one place, one route into play.
  const viewOnBoard = (): void => {
    if (!view.challengeId) return;
    interaction.select(view.challengeId);
    onNavigate?.("board");
  };

  // The squad standing WITH you in the hall — the same recommended party the
  // steward's quick-accept resolves with and heldReadiness projects over. Bodies
  // for names the run already has; nothing invented.
  const heldPartyIds = view.challengeId && !view.resolved ? world.recommendedParty(view.challengeId) : [];
  const heldParty = heldPartyIds
    .map((id) => world.roster.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const accept = (): void => {
    if (!canTake || !view.challengeId) return;
    world.runChallenge(view.challengeId, world.recommendedParty(view.challengeId));
    setOpen(false);
  };

  // Walk into the encounter: hand off to the SAME EncounterShell the board's PLAY
  // ENCOUNTER opens, so resolution reuses the engine path (no duplicate resolver).
  const enterEncounter = (): void => {
    if (!canTake || !view.challengeId) return;
    onEnterEncounter?.(view.challengeId);
    setAtThreshold(false);
  };

  return (
    <div data-testid="hall-scene" style={wrap}>
      {/* Memory band: derived from the run ledger — once a result is recorded, the
          hall acknowledges it. It says the place remembers (worldChanged), then NAMES
          the last result and how many the ledger now holds (where the memory lives).
          The steward below still points to what remains next — you returned to a place
          that remembers what happened AND knows what is left. */}
      {remembers && (
        <div
          data-testid="hall-world-change"
          style={{ flex: "none", padding: "8px 14px", borderBottom: "1px solid rgba(116,173,119,0.4)", background: "rgba(116,173,119,0.12)", color: "#cfe0c6", fontSize: 11, letterSpacing: "0.06em", textAlign: "center" }}
        >
          <div>{t("hall.worldChanged")}</div>
          {memory.lastResult && (
            <div
              data-testid="hall-last-recorded"
              style={{ marginTop: 3, fontSize: 10, letterSpacing: "0.04em", color: "#a7b89e" }}
            >
              {t("hall.lastRecorded", { name: memory.lastResult.challengeName, count: memory.entryCount })}
            </div>
          )}
        </div>
      )}

      {/* The hall floor: presence marker, the steward (quick resolve), and the
          encounter threshold (walk in and play it out). */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-around", gap: 16, padding: "12px 20px", minHeight: 0 }}>
        {/* The GROUND — the hall rendered as a place to stand: plank floor rising
            behind the figures. Pure CSS pattern (no image assets), display-only. */}
        <div
          data-testid="hall-floor"
          aria-hidden="true"
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0, height: "44%",
            background: "repeating-linear-gradient(90deg, rgba(96,74,44,0.30) 0 30px, rgba(74,58,36,0.30) 30px 60px)",
            borderTop: "2px solid rgba(107,89,53,0.55)",
            boxShadow: "inset 0 10px 22px -12px rgba(0,0,0,0.7)",
          }}
        />
        {/* Presence marker — you and your squad, standing as bodies; walks toward
            the threshold on approach. */}
        <div style={{ flex: "none", position: "relative", transition: "transform 0.5s ease", transform: walked ? "translateX(22vw)" : "translateX(0)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
            <Figure color="#6f8f57" label={t("hall.you")} testid="hall-you" face={<PixelSprite name="person" size={44} />} />
            {heldParty.length > 0 && (
              <div data-testid="hall-party-bodies" style={{ display: "flex", alignItems: "flex-end", marginBottom: 18 }}>
                {heldParty.map((m) => (
                  <PixelDoll key={m.id} appearance={resolveDollAppearance(theme, m.role)} identity={m.id} state={view.resolved ? "cleared" : "idle"} size={30} label={m.name} title={`${m.name} · ${m.role}`} style={{ marginLeft: -6 }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* The steward — an authored person when the cartridge names one, else a
            generic runtime steward. Take the contract in person (quick resolve). */}
        <div style={{ ...groupStyle, position: "relative" }}>
          {/* The authored line, SPOKEN in the scene — a face and words from a person,
              not a status row. Same authored text the dialogue shows, verbatim. */}
          {person && (
            <div
              data-testid="hall-speech"
              style={{ maxWidth: 220, padding: "8px 10px", background: "rgba(246,239,227,0.96)", border: "2px solid #4a4238", borderRadius: 6, color: "#2a2018", fontFamily: "'Lora', Georgia, serif", fontSize: 12, lineHeight: 1.45, textTransform: "none", letterSpacing: "normal" }}
            >
              {view.resolved ? person.fulfilledLine : person.greeting}
            </div>
          )}
          <Figure
            color={view.resolved ? "#74ad77" : "#c9a14a"}
            label={person ? person.name : t("hall.steward")}
            testid="hall-npc"
            resolved={view.resolved}
            face={person
              ? CartridgeSprite({ arcId: world.arc.meta.id, personId: person.id, size: 52 })
                ?? CartridgePortrait({ arcId: world.arc.meta.id, personId: person.id, size: 44 })
              : null}
          />
          {person && (
            <span data-testid="hall-npc-role" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b7d6a" }}>{person.role}</span>
          )}
          <span data-testid="hall-npc-state" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: view.resolved ? "#74ad77" : "#c9a14a" }}>
            {view.resolved ? t("hall.fulfilled") : t("hall.offering")}
          </span>
          {/* The steward's contract, named by the same region the map groups it under —
              with the same "▸ Up next" marker the map's next pin carries. */}
          {view.challengeId && regionName && (
            <ContractPlace regionName={regionName} isNext={!view.resolved} testid="hall-contract-region" />
          )}
          {/* Party status for the held contract — the same projection the board reads
              (evaluateParty over the recommended party), so surfaces agree. */}
          {heldReadiness && (
            <span
              data-testid="hall-party-status"
              data-projected={heldReadiness.projectedOutcome}
              style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: PROJ_COLOR[heldReadiness.projectedOutcome] ?? "#8b7d6a" }}
            >
              {t("encounterShell.projected")}: {t(PROJ_LABEL[heldReadiness.projectedOutcome] ?? "encounterShell.projNone")}
            </span>
          )}
          {view.challengeId && (
            <button type="button" data-testid="hall-talk" disabled={modalOpen} onClick={() => setOpen(true)} style={{ ...btnGhost, cursor: modalOpen ? "not-allowed" : "pointer" }}>
              {t("hall.talk")}
            </button>
          )}
          {/* One route into play: the hall hands the player to the board with THIS
              contract selected — same selection + view switch the shell owns. */}
          {view.challengeId && onNavigate && (
            <button type="button" data-testid="hall-view-on-board" disabled={modalOpen} onClick={viewOnBoard} style={{ ...btnGhost, cursor: modalOpen ? "not-allowed" : "pointer" }}>
              {t("hall.viewOnBoard")}
            </button>
          )}
        </div>

        {/* The encounter threshold — walk in and play it out via the shared shell. */}
        <div style={{ ...groupStyle, position: "relative" }}>
          <div
            data-testid="hall-threshold"
            aria-hidden="true"
            style={{ width: 34, height: 48, borderRadius: "5px 5px 0 0", border: "2px solid #6b5935", borderBottom: "none", background: walked ? "rgba(201,161,74,0.25)" : "rgba(20,17,11,0.9)", boxShadow: walked ? "0 0 18px -4px rgba(201,161,74,0.6)" : "none", transition: "background 0.4s, box-shadow 0.4s" }}
          />
          <span style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8b7d6a" }}>{t("hall.threshold")}</span>
          {canTake && !atThreshold && (
            <button type="button" data-testid="hall-approach" disabled={modalOpen} onClick={() => setAtThreshold(true)} style={{ ...btnGhost, cursor: modalOpen ? "not-allowed" : "pointer" }}>
              {t("hall.approach")}
            </button>
          )}
          {canTake && atThreshold && (
            <button type="button" data-testid="hall-enter-encounter" disabled={modalOpen} onClick={enterEncounter} style={{ ...btnPrimary, cursor: modalOpen ? "not-allowed" : "pointer" }}>
              {t("hall.enterEncounter")}
            </button>
          )}
          {!view.resolved && lootPending && (
            <span data-testid="hall-threshold-claim" style={{ color: "#e0a23a", fontSize: 10, letterSpacing: "0.04em" }}>{t("hall.claimFirst")}</span>
          )}
        </div>
      </div>

      {/* Dialogue: the steward presents the authored contract; Accept & resolve maps
          to the existing engine (world.runChallenge) — no scene-only outcome. */}
      {open && view.challengeId && (
        <div
          data-testid="hall-dialogue"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 16px", borderTop: "1px solid #4a4238", background: "rgba(23,21,15,0.98)", display: "grid", gap: 10 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* The speaker's authored face beside their name — dialogue from a person. */}
            {person && CartridgePortrait({ arcId: world.arc.meta.id, personId: person.id, size: 30 })}
            <strong data-testid="hall-dialogue-speaker" style={{ color: "#c9a14a", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>{person ? person.name : t("hall.steward")}</strong>
            {person && <span style={{ color: "#8b7d6a", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>{person.role}</span>}
          </div>
          {person && (
            <div data-testid="hall-dialogue-bio" style={{ color: "#a59c8b", fontFamily: "'Lora', Georgia, serif", fontSize: 12, lineHeight: 1.5 }}>{person.bio}</div>
          )}
          {/* Authored spoken line when the cartridge names a person; otherwise the
              generic status copy. */}
          <div data-testid="hall-dialogue-line" style={{ color: "#d8cfbd", fontFamily: "'Lora', Georgia, serif", fontSize: 13, lineHeight: 1.5 }}>
            {view.resolved
              ? (person ? person.fulfilledLine : t("hall.recordedNote"))
              : (person ? person.greeting : t("hall.offering"))}
          </div>
          {regionName && (
            <ContractPlace regionName={regionName} isNext={!view.resolved} testid="hall-dialogue-region" />
          )}
          <div data-testid="hall-dialogue-contract" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: "#ece4d4" }}>
            {view.challengeName}
          </div>
          {!view.resolved && lootPending && (
            <div data-testid="hall-claim-first" style={{ color: "#e0a23a", fontSize: 11, letterSpacing: "0.04em" }}>
              {t("hall.claimFirst")}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {!view.resolved && (
              <button
                type="button"
                data-testid="hall-accept"
                disabled={!canTake || modalOpen}
                onClick={accept}
                style={{ ...btnPrimary, cursor: !canTake || modalOpen ? "not-allowed" : "pointer", opacity: !canTake || modalOpen ? 0.5 : 1 }}
              >
                {t("hall.accept")}
              </button>
            )}
            <button
              type="button"
              data-testid="hall-leave"
              onClick={() => setOpen(false)}
              style={{ cursor: "pointer", padding: "8px 16px", border: "1px solid #4a4238", background: "transparent", color: "#a59c8b", fontFamily: "var(--px-font)", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}
            >
              {t("hall.leave")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
