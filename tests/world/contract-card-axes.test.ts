import { describe, expect, it } from "vitest";
import type { WorldNode } from "../../src/world/contract.js";
import type { PartyReadiness } from "../../src/world/readiness.js";
import {
  contractCardState,
  squadFit,
  squadFitKind,
  squadFitLabelId,
  worldStateLabelId,
  worldStateNoteId,
} from "../../src/world/contract-board/card-axes.js";
import { formatMessage } from "../../src/world/i18n/messages.js";

// PR #63 — a board contract card reads on TWO independent axes:
//   • WORLD STATE  (available / locked / recorded) — what the world says.
//   • SQUAD FIT    (reliable / risky / failing / not-evaluated) — how THIS roster fits.
// These pin that the axes never collapse: the state axis can't emit a readiness
// verdict, squad fit is a pure independent read of the existing projection, and a
// locked contract never reads as a squad failure.

const node = (status: WorldNode["status"]): WorldNode => ({ status }) as unknown as WorldNode;
const rd = (projectedOutcome: PartyReadiness["projectedOutcome"]): PartyReadiness =>
  ({ projectedOutcome }) as unknown as PartyReadiness;

describe("board card: world state and squad fit are separate axes", () => {
  it("the WORLD-STATE axis is only ever available / locked / recorded — it takes no readiness at all", () => {
    expect(contractCardState(node("available"))).toBe("available");
    expect(contractCardState(node("locked"))).toBe("locked");
    expect(contractCardState(node("cleared"))).toBe("recorded");
  });

  it("Risky / Failing / Reliable are squad verdicts, never the primary contract state", () => {
    const states = (["available", "locked", "cleared"] as const).map((s) => contractCardState(node(s)));
    expect(states).not.toContain("risky");
    expect(states).not.toContain("failing");
    expect(states).not.toContain("reliable");
    // They live only on the squad-fit axis.
    expect(squadFit(node("available"), rd("success"))).toBe("reliable");
    expect(squadFit(node("available"), rd("partial"))).toBe("risky");
    expect(squadFit(node("available"), rd("failure"))).toBe("failing");
  });

  it("squad fit reads the existing projection independently, only for an OPEN contract", () => {
    expect(squadFit(node("available"), rd("none"))).toBeNull();
    expect(squadFit(node("available"), null)).toBeNull();
    // Locked / recorded contracts are not squad-evaluated at all, whatever a projection says.
    for (const s of ["locked", "cleared"] as const) {
      for (const o of ["success", "partial", "failure", "none"] as const) {
        expect(squadFit(node(s), rd(o))).toBeNull();
      }
    }
  });

  it("a locked card never implies squad FAILURE — the blocker is world-state progression", () => {
    // Even if a failing projection somehow existed, a locked contract reads "not evaluated".
    expect(squadFitKind(node("locked"), squadFit(node("locked"), rd("failure")))).toBe("not-evaluated");
    expect(squadFitLabelId(squadFitKind(node("locked"), null))).toBe("contractCard.squadNotEvaluated");
    expect(formatMessage("en", "contractCard.squadNotEvaluated")).toBe("Not evaluated until available");
    // A recorded contract is "no longer relevant" — also not a failure.
    expect(squadFitKind(node("cleared"), null)).toBe("not-relevant");
  });

  it("an OPEN contract with no projected party reads 'Assign a party', not the locked copy", () => {
    // Codex edge case: an available contract with no candidate party (e.g. all agents
    // downed) must NOT borrow the locked "not evaluated until available" copy — that
    // would contradict the same card's "Available now" world band.
    const kind = squadFitKind(node("available"), squadFit(node("available"), rd("none")));
    expect(kind).toBe("no-party");
    expect(squadFitLabelId(kind)).toBe("contractCard.squadNoParty");
    expect(formatMessage("en", "contractCard.squadNoParty")).toBe("Assign a party");
    // The open-but-unstaffed kind is distinct from the locked "not yet available" kind.
    expect(squadFitKind(node("available"), null)).not.toBe(squadFitKind(node("locked"), null));
  });

  it("the two bands draw from DISJOINT label sets — no shared word to blur the axes", () => {
    const worldIds = (["available", "locked", "recorded"] as const).map(worldStateLabelId);
    const squadIds = (["reliable", "risky", "failing", "not-evaluated", "no-party", "not-relevant"] as const).map(squadFitLabelId);
    expect(worldIds.some((id) => squadIds.includes(id as never))).toBe(false);
    // Every band label resolves in both locales.
    for (const id of [...worldIds, ...squadIds]) {
      expect(formatMessage("en", id)).not.toBe(id);
      expect(formatMessage("zh-Hant", id)).not.toBe(id);
    }
  });

  it("the world-state note reuses the map's own vocabulary, and only where it adds meaning", () => {
    expect(worldStateNoteId(node("cleared"), false)).toBe("worldMap.legendRecorded");
    expect(worldStateNoteId(node("locked"), false)).toBe("worldMap.legendLocked");
    expect(worldStateNoteId(node("available"), true)).toBe("contractCard.worldNextNote");
    expect(worldStateNoteId(node("available"), false)).toBeNull();
  });
});
