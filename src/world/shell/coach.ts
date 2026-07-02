// Engine-loop coaching: a single derived hint about the *engine* state (not cartridge
// fiction), shared by every breakpoint and costume. It is intentionally null whenever
// another region already owns the primary action, so the shell never narrates the same
// state twice.

import type { PlayReportView } from "../../play-pipeline/compile.js";
import type { WorldNode } from "../contract.js";
import { t } from "../i18n/index.js";

export interface EngineCoachState {
  pendingDecision: boolean;
  selected: Pick<WorldNode, "status"> | null;
  partyCount: number;
  min: number;
  canRun: boolean;
  lastReport: PlayReportView | null;
  arcComplete: boolean;
}

export function getEngineCoachMessage(props: EngineCoachState): string | null {
  if (props.arcComplete) return t("coach.arcComplete");
  if (props.pendingDecision) return t("coach.pendingDecision");
  // Once a node is selected, the contract region owns the primary action and its
  // readiness panel owns the "why". Do not narrate the same state twice.
  if (props.selected) return null;
  if (!props.selected && props.lastReport) return t("coach.outcomeRecorded");
  return null;
}
