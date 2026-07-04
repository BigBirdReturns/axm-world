// The inhabited hall — the first "make it real" surface. Instead of choosing a
// contract from a board, the player stands in the cartridge's founding hall as a
// presence marker, walks up to the steward (one NPC), and takes a contract in
// person. Resolution goes through the SAME engine every other surface uses
// (world.runChallenge), so the board path and this scene path converge on one
// digest-stamped ledger entry; the world then visibly changes.
//
// This scene reads run state and calls the engine — it authors nothing. What it
// shows is derived (deriveHallView); what it writes is the existing ledger. All
// chrome routes through t() (guarded by the i18n coverage test); the contract's
// authored name flows verbatim.

import { useState, type CSSProperties } from "react";
import type { SceneProps } from "../presentations.js";
import { deriveHallView, canTakeContract } from "./hall.js";
import { t } from "../i18n/index.js";

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

function Figure(props: { color: string; label: string; testid?: string; resolved?: boolean }): JSX.Element {
  return (
    <div style={figureBase} data-testid={props.testid} data-resolved={props.resolved === undefined ? undefined : props.resolved ? "true" : "false"}>
      <span aria-hidden="true" style={{ width: 26, height: 40, borderRadius: "13px 13px 5px 5px", background: props.color, boxShadow: "0 6px 14px -6px rgba(0,0,0,0.8)" }} />
      <span style={{ color: "#a59c8b" }}>{props.label}</span>
    </div>
  );
}

export function HallScene({ world, modalOpen = false }: SceneProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const view = deriveHallView(world.nodes);
  const worldChanged = world.clearedCount > 0;
  // Unclaimed loot must be claimed before starting another run: runChallenge
  // replaces the pending reward choices, so taking a new contract now would
  // silently discard the previous reward. Mirrors the board's loot-owns-the-rail
  // guarantee.
  const lootPending = world.pendingLoot.length > 0;
  const canTake = canTakeContract(view, world.pendingLoot.length);

  const accept = (): void => {
    if (!canTake || !view.challengeId) return;
    world.runChallenge(view.challengeId, world.recommendedParty(view.challengeId));
    setOpen(false);
  };

  return (
    <div data-testid="hall-scene" style={wrap}>
      {/* World-change band: derived from run state — the world visibly answers once
          any contract is recorded. */}
      {worldChanged && (
        <div
          data-testid="hall-world-change"
          style={{ flex: "none", padding: "8px 14px", borderBottom: "1px solid rgba(116,173,119,0.4)", background: "rgba(116,173,119,0.12)", color: "#cfe0c6", fontSize: 11, letterSpacing: "0.06em", textAlign: "center" }}
        >
          {t("hall.worldChanged")}
        </div>
      )}

      {/* The hall floor: the steward stands opposite the player's presence marker. */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 24px", minHeight: 0 }}>
        <Figure color="#6f8f57" label={t("hall.you")} testid="hall-you" />

        <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
          <Figure
            color={view.resolved ? "#74ad77" : "#c9a14a"}
            label={t("hall.steward")}
            testid="hall-npc"
            resolved={view.resolved}
          />
          <span data-testid="hall-npc-state" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: view.resolved ? "#74ad77" : "#c9a14a" }}>
            {view.resolved ? t("hall.fulfilled") : t("hall.offering")}
          </span>
          {view.challengeId && (
            <button
              type="button"
              data-testid="hall-talk"
              disabled={modalOpen}
              onClick={() => setOpen(true)}
              style={{ cursor: modalOpen ? "not-allowed" : "pointer", padding: "7px 14px", border: "1px solid #6b5935", background: "rgba(32,28,20,0.92)", color: "#e6dcc6", fontFamily: "var(--px-font)", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              {t("hall.talk")}
            </button>
          )}
        </div>
      </div>

      {/* Dialogue: the steward presents the authored contract; choices map to the
          existing engine (accept & resolve) — no scene-only outcome. */}
      {open && view.challengeId && (
        <div
          data-testid="hall-dialogue"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 16px", borderTop: "1px solid #4a4238", background: "rgba(23,21,15,0.98)", display: "grid", gap: 10 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <strong style={{ color: "#c9a14a", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("hall.steward")}</strong>
            <span style={{ color: "#a59c8b", fontSize: 12 }}>{view.resolved ? t("hall.recordedNote") : t("hall.offering")}</span>
          </div>
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
                style={{ cursor: !canTake || modalOpen ? "not-allowed" : "pointer", opacity: !canTake || modalOpen ? 0.5 : 1, padding: "8px 16px", border: "none", background: "var(--gold, #c9a14a)", color: "#1b160c", fontFamily: "var(--px-font)", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}
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
