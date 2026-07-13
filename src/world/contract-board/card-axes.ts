// The TWO INDEPENDENT axes a board contract card reads on, plus the copy each band
// shows — kept pure (no React, no CSS) so the board and a regression test consume
// the exact same mapping.
//
// This is the #63 boundary made explicit and honest:
//   • WORLD STATE  — what the cartridge/world says about the contract
//                    (available / locked / recorded, plus up-next / steep markers).
//   • SQUAD FIT    — how the currently assigned roster performs against it
//                    (reliable / risky / failing, or "not evaluated" when the world
//                    hasn't opened it yet).
// They are different truths and never collapse into one badge. Neither touches the
// readiness MATH; squad fit is a pure read of the existing projection.

import { t, type MessageId } from "../i18n/index.js";
import type { WorldNode } from "../contract.js";
import type { CheckStatus, PartyReadiness } from "../readiness.js";
import type { ContractCardState, SquadFit } from "../pixel-ui/PixelContractCard.js";

/** The WORLD/CONTRACT-STATE axis — what the contract IS in the run: its engine
 *  status, collapsed to the world state the card names. Never a readiness verdict,
 *  so "risky" can't masquerade as a contract state. Selection is a separate visual
 *  (the card border), not a world state. */
export function contractCardState(node: WorldNode): ContractCardState {
  if (node.status === "locked") return "locked";
  if (node.status === "cleared") return "recorded";
  return "available";
}

/** The world-state band's primary line: "Available now" / "Locked" / "Recorded". */
export function worldStateLabelId(state: ContractCardState): MessageId {
  if (state === "locked") return "status.locked";
  if (state === "recorded") return "status.recorded";
  return "contractCard.worldAvailable";
}

/** The world-state band's secondary note, reusing the map's own vocabulary so the
 *  surfaces agree: the steward's-next hint, the unlock hint, or the ledger hint.
 *  Null when the plain state line says everything. */
export function worldStateNoteId(node: WorldNode, upNext: boolean): MessageId | null {
  if (node.status === "cleared") return "worldMap.legendRecorded"; // "Result written to the ledger"
  if (node.status === "locked") return "worldMap.legendLocked"; // "Clear earlier contracts first"
  if (upNext) return "contractCard.worldNextNote"; // "Steward's next contract"
  return null;
}

/** The SQUAD-FIT axis — the current party's relationship to an OPEN contract, read
 *  straight from the existing readiness projection (unchanged): reliable / risky /
 *  failing, or null when the contract isn't open or no party is projected. A separate
 *  axis from contractCardState — never folded into it. */
export function squadFit(node: WorldNode, readiness: PartyReadiness | null): SquadFit | null {
  if (node.status !== "available") return null;
  if (!readiness || readiness.projectedOutcome === "none") return null;
  if (readiness.projectedOutcome === "success") return "reliable";
  if (readiness.projectedOutcome === "partial") return "risky";
  return "failing";
}

/** Why the squad-fit band reads the way it does. A verdict when the contract is open
 *  AND has a projected party; otherwise an HONEST non-verdict — never "failing" for a
 *  contract the world hasn't opened. The three non-verdict kinds are kept distinct so
 *  the copy never contradicts the world band:
 *    • "not-evaluated" — locked (not yet available to evaluate against),
 *    • "no-party"      — OPEN but no party is projected (e.g. no eligible agents),
 *    • "not-relevant"  — already recorded. */
export type SquadFitKind = SquadFit | "not-evaluated" | "no-party" | "not-relevant";

export function squadFitKind(node: WorldNode, fit: SquadFit | null): SquadFitKind {
  if (fit) return fit;
  if (node.status === "cleared") return "not-relevant";
  if (node.status === "locked") return "not-evaluated";
  // Open, but nothing to judge yet — the contract IS available, so it must NOT borrow
  // the locked "not yet available" copy (that would contradict its own world band).
  return "no-party";
}

export function squadFitLabelId(kind: SquadFitKind): MessageId {
  switch (kind) {
    case "reliable":
      return "status.reliable";
    case "risky":
      return "status.risky";
    case "failing":
      return "status.failing";
    case "not-relevant":
      return "contractCard.squadNotRelevant"; // "No longer relevant"
    case "not-evaluated":
      return "contractCard.squadNotEvaluated"; // "Not evaluated until available"
    case "no-party":
      return "contractCard.squadNoParty"; // "Assign a party"
  }
}

function scoreText(value: number | undefined): string {
  if (value === undefined) return "";
  return String(Math.round(value * 10) / 10);
}

/** One shared explanation for the squad-fit verdict. Both the board card and the
 * detail/commit surface call this helper so the same party cannot receive two
 * different answers to "why?". */
export function squadFitReason(fit: SquadFit | null, readiness: PartyReadiness | null): string | undefined {
  if (!fit || !readiness) return undefined;
  if (fit === "reliable") return t("contractBoard.recommendedReliable");
  if (!readiness.countOk) return readiness.reasons[0] ?? t("contractBoard.countNeedsWork");
  if (!readiness.rolesOk) return readiness.reasons[0] ?? t("contractBoard.roleMissing");
  const weak = [...readiness.checks].sort((a, b) => {
    const severity = (status: CheckStatus) => status === "short" ? 2 : status === "thin" ? 1 : 0;
    return severity(b.status) - severity(a.status) || b.shortBy - a.shortBy;
  })[0];
  if (!weak || weak.status === "ready") return readiness.reasons[0];
  if (weak.status === "thin") return t("contractBoard.needsBuffer", { name: weak.name, n: scoreText(weak.shortBy) });
  return t("contractBoard.needsRecover", { name: weak.name, n: scoreText(weak.shortBy) });
}
