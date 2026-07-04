// Typed message catalog. Message values are either plain strings or small
// formatting functions that take a params bag — this lets pluralized English
// strings and their zh-Hant counterparts live side by side under one id
// without any runtime template-string parsing.
//
// GRAMMAR RULE: only world-authored CHROME strings belong here. Arc data
// (challenge names/descriptions, tier names, role/attribute/item names,
// outcome narratives, drama text, agent names, resource names like
// currencyName/tokenName/reputationName) must keep flowing from the loaded
// arc verbatim — it is passed in as a `params` value, never catalogued or
// translated, so a second cartridge's own vocabulary always wins.

import type { Locale } from "./locale.js";

export type MessageParams = Record<string, string | number>;

type MessageValue = string | ((params: MessageParams) => string);

export type MessageId =
  // ── coach ──────────────────────────────────────────────────────────────
  | "coach.arcComplete"
  | "coach.pendingDecision"
  | "coach.outcomeRecorded"
  // ── advance blockers ───────────────────────────────────────────────────
  | "blockers.dramaCards"
  | "blockers.rewardDecisions"
  // ── locale switcher ────────────────────────────────────────────────────
  | "locale.enLabel"
  | "locale.zhHantLabel"
  // ── shell chrome ───────────────────────────────────────────────────────
  | "shell.cycle"
  | "shell.recorded"
  | "shell.dispatches"
  | "shell.lootEquip"
  | "shell.bench"
  | "shell.recommendedParty"
  | "shell.recommendedChip"
  | "shell.topPick"
  | "shell.mobileBackBoard"
  | "shell.mobileBackContract"
  | "shell.mobileAdjustParty"
  | "shell.mobileReviewContract"
  | "shell.contractOutcome"
  | "shell.rosterPartyOf"
  | "shell.rosterSelectContract"
  | "shell.collapseName"
  | "shell.expandName"
  | "shell.unlockRequirement"
  | "shell.recordedOutcomeNote"
  | "shell.partyCount"
  | "shell.fixThisContract"
  | "shell.moreOptions"
  | "shell.addAgent"
  | "shell.swapInAgent"
  | "shell.roles"
  | "shell.time"
  | "shell.scopeTeam"
  | "shell.scopeRole"
  | "shell.scopePerAgent"
  | "shell.assignRange"
  | "shell.riskRun"
  | "shell.runWithRisk"
  | "shell.runContract"
  | "shell.difficultyMode"
  | "shell.difficultyBase"
  | "shell.riskWarning"
  | "shell.thinWarning"
  | "shell.projectedReliable"
  | "shell.projectedRisky"
  | "shell.projectedFail"
  | "shell.assignParty"
  | "shell.equipArrow"
  | "shell.outcomeSuccess"
  | "shell.outcomePartial"
  | "shell.outcomeFailed"
  | "shell.engineLoop"
  | "shell.everyContractCleared"
  | "shell.complete"
  | "shell.equipped"
  | "shell.rewardMomentTitle"
  | "shell.rewardMomentBody"
  | "shell.readinessRecalculated"
  | "shell.recordButton"
  | "shell.cartridgeButton"
  | "shell.recordedOutcomeTitle"
  | "shell.dismissViewNote"
  | "shell.closeRecordedOutcome"
  // ── in-shell program identity strip ──────────────────────────────────────
  | "shell.runtimeName"
  | "shell.identityRecorded"
  | "shell.identityFresh"
  // ── shared status vocabulary (roster/contract/readiness states) ────────
  | "status.selected"
  | "status.available"
  | "status.reliable"
  | "status.risky"
  | "status.failing"
  | "status.locked"
  | "status.recorded"
  | "status.cleared"
  | "status.assigned"
  | "status.down"
  // ── readiness (src/world/readiness.ts) ──────────────────────────────────
  | "readiness.assignAtLeast"
  | "readiness.tooMany"
  | "readiness.missingRole"
  | "readiness.checkFailingBy"
  | "readiness.checkPassingBy"
  | "readiness.addsRequired"
  | "readiness.improves"
  | "readiness.downtimeChangesReason"
  | "readiness.swapOut"
  | "readiness.noCleanFix"
  | "readiness.recommendationRationale"
  | "readiness.checkedAttributesFallback"
  // ── PixelReadinessRow ────────────────────────────────────────────────────
  | "readinessRow.passingBy"
  | "readinessRow.failingBy"
  | "readinessRow.reliableBufferReached"
  | "readinessRow.top"
  // ── PixelContractCard ───────────────────────────────────────────────────
  | "contractCard.needs"
  | "contractCard.clearEarlier"
  // ── PixelGearSlot ────────────────────────────────────────────────────────
  | "gearSlot.noGear"
  // ── PixelRosterCard ──────────────────────────────────────────────────────
  | "rosterCard.assignTooltip"
  | "rosterCard.selectFirstTooltip"
  | "rosterCard.stress"
  | "rosterCard.morale"
  // ── agent-management downtime actions ──────────────────────────────────
  | "agentAction.rest"
  | "agentAction.train"
  | "agentAction.rally"
  // ── contract board ──────────────────────────────────────────────────────
  | "contractBoard.title"
  | "contractBoard.heading"
  | "contractBoard.explainer"
  | "contractBoard.party"
  | "contractBoard.partyRange"
  | "contractBoard.recommendedReliable"
  | "contractBoard.needsBuffer"
  | "contractBoard.needsRecover"
  | "contractBoard.countNeedsWork"
  | "contractBoard.roleMissing"
  | "contractBoard.waitingCycles"
  | "contractBoard.waitingTitle"
  | "contractBoard.chapterFallback"
  // ── encounter director ──────────────────────────────────────────────────
  | "encounter.dispatching"
  | "encounter.travelingToBoard"
  | "encounter.travelNote"
  | "encounter.resolving"
  | "encounter.recordedOnBoard"
  | "encounter.continue"
  | "encounter.clickToSkip"
  | "encounter.partyMovesOut"
  | "encounter.reliableProjection"
  | "encounter.reliableProjectionDetail"
  | "encounter.riskWindow"
  | "encounter.riskWindowDetail"
  | "encounter.failurePressure"
  | "encounter.failurePressureDetail"
  | "encounter.noProjection"
  | "encounter.noProjectionDetail"
  | "encounter.outcomeFulfilled"
  | "encounter.outcomePartial"
  | "encounter.outcomeFailure"
  | "encounter.outcomeRecordedFallback"
  // ── encounter shell (playable encounter surface) ────────────────────────
  | "encounterShell.playEncounter"
  | "encounterShell.difficulty"
  | "encounterShell.derivedNote"
  | "encounterShell.objectives"
  | "encounterShell.party"
  | "encounterShell.hazards"
  | "encounterShell.reach"
  | "encounterShell.resolve"
  | "encounterShell.ledger"
  | "encounterShell.detail"
  | "encounterShell.objectiveCleared"
  | "encounterShell.objectiveNotCleared"
  | "encounterShell.reqCheckPassed"
  | "encounterShell.reqCheckFailed"
  | "encounterShell.reqCheckPassedNoAttr"
  | "encounterShell.reqCheckFailedNoAttr"
  | "encounterShell.best"
  | "encounterShell.coverageAll"
  | "encounterShell.coveragePartial"
  | "encounterShell.agentPassedBy"
  | "encounterShell.agentShortBy"
  | "encounterShell.unlocks"
  | "encounterShell.worldChanges"
  | "encounterShell.leave"
  | "encounterShell.deploy"
  | "encounterShell.committed"
  | "encounterShell.reserve"
  | "encounterShell.projected"
  | "encounterShell.minNeeded"
  | "encounterShell.projReliable"
  | "encounterShell.projRisky"
  | "encounterShell.projFailing"
  | "encounterShell.projNone"
  | "encounterShell.posture"
  | "encounterShell.postureStandard"
  | "encounterShell.steady"
  | "encounterShell.steadyOn"
  | "encounterShell.steadyOff"
  | "encounterShell.spentSteadied"
  // ── presentations (representation switcher) ────────────────────────────
  | "presentations.board.label"
  | "presentations.board.blurb"
  | "presentations.board.controlsHint"
  | "presentations.board.purpose"
  | "presentations.map.label"
  | "presentations.map.blurb"
  | "presentations.map.controlsHint"
  | "presentations.map.purpose"
  | "worldMap.difficulty"
  | "worldMap.enterEncounter"
  | "worldMap.stateLocked"
  | "worldMap.stateAvailable"
  | "worldMap.stateActive"
  | "worldMap.stateRecorded"
  | "presentations.globe.label"
  | "presentations.globe.blurb"
  | "presentations.globe.controlsHint"
  | "presentations.globe.purpose"
  | "presentations.graph.label"
  | "presentations.graph.blurb"
  | "presentations.graph.controlsHint"
  | "presentations.graph.purpose"
  | "presentations.legend.selected"
  | "presentations.legend.available"
  | "presentations.legend.locked"
  | "presentations.legend.recorded"
  | "presentations.legend.risky"
  | "presentations.loadingRenderer"
  // ── decision panel ───────────────────────────────────────────────────────
  | "decision.worldResponds"
  | "decision.foundingHall"
  | "decision.aDecision"
  | "decision.openingBlurb"
  | "decision.effect"
  | "decision.markDoctrine"
  | "decision.hiddenConsequence"
  | "decision.noVisibleEffect"
  | "decision.continue"
  // ── cartridge object panel ──────────────────────────────────────────────
  | "cartridgePanel.eyebrow"
  | "cartridgePanel.domain"
  | "cartridgePanel.engine"
  | "cartridgePanel.cycle"
  | "cartridgePanel.recordedNodes"
  | "cartridgePanel.decisionMark"
  | "cartridgePanel.body"
  | "cartridgePanel.exportRun"
  | "cartridgePanel.resume"
  | "cartridgePanel.leave"
  | "cartridgePanel.trust"
  | "cartridgePanel.identity"
  | "cartridgePanel.ledger"
  | "cartridgePanel.ledgerEmpty"
  | "cartridgePanel.outcomeSuccess"
  | "cartridgePanel.outcomePartial"
  | "cartridgePanel.outcomeFailure"
  // ── boot screen (cartridge bay) ──────────────────────────────────────────
  | "boot.openCartridge"
  | "boot.remove"
  | "boot.importedNamed"
  | "boot.importFailedHeading"
  | "boot.trustBundled"
  | "boot.trustImportedUnsigned"
  | "boot.trustVerified"
  | "boot.trustQuarantined"
  // ── boot screen: program-of-record plaque ────────────────────────────────
  | "boot.programOfRecord"
  | "boot.identity"
  | "boot.freshProgram"
  | "boot.contractsRecorded"
  | "boot.resumable"
  | "boot.enter"
  | "boot.resume"
  // ── boot screen: chrome copy (swept from bare literals) ──────────────────
  | "boot.runtimeEyebrow"
  | "boot.heroTitle"
  | "boot.heroBody"
  | "boot.footerNote"
  | "boot.holdTheLoop"
  | "boot.loadingNamed"
  | "boot.cartridgeMeta";

/**
 * Ids intentionally left out of the zh-Hant catalog. Documented, not
 * accidental — the locale guard test (tests/world/locale.test.ts) checks
 * every en id is either present in zh-Hant OR listed here.
 *
 * "shell.contractOutcome" is the seeded demo id that exercises the
 * zh-Hant → en fallback path honestly; keep it missing on purpose.
 */
export const EN_ONLY_IDS: MessageId[] = [
  "shell.contractOutcome",
  "cartridgePanel.identity",
  "cartridgePanel.ledger",
  "cartridgePanel.ledgerEmpty",
  "cartridgePanel.outcomeSuccess",
  "cartridgePanel.outcomePartial",
  "cartridgePanel.outcomeFailure",
];

function num(params: MessageParams, key: string): number {
  return Number(params[key] ?? 0);
}

function str(params: MessageParams, key: string): string {
  return String(params[key] ?? "");
}

export const MESSAGES: Record<Locale, Partial<Record<MessageId, MessageValue>>> = {
  en: {
    "coach.arcComplete": "Cartridge marked complete. Inspect or export the run state before leaving.",
    "coach.pendingDecision": "Resolve the active decision. The engine applies its consequences to this cartridge run.",
    "coach.outcomeRecorded": "Outcome recorded. Inspect the changed cartridge state or choose another available node.",
    "blockers.dramaCards": (params) => {
      const count = num(params, "count");
      return `Resolve ${count} drama card${count === 1 ? "" : "s"} before advancing.`;
    },
    "blockers.rewardDecisions": (params) => {
      const count = num(params, "count");
      return `Resolve ${count} pending reward decision${count === 1 ? "" : "s"} in Reports.`;
    },

    "locale.enLabel": "EN",
    "locale.zhHantLabel": "中文",

    "shell.cycle": "Cycle",
    "shell.recorded": "Recorded",
    "shell.dispatches": "Dispatches",
    "shell.lootEquip": "Loot / Equip",
    "shell.bench": "Bench",
    "shell.recommendedParty": "Recommended party",
    "shell.recommendedChip": "Recommended",
    "shell.topPick": "Top",
    "shell.mobileBackBoard": "Board",
    "shell.mobileBackContract": "Contract",
    "shell.mobileAdjustParty": (params) => `Party ${num(params, "count")}/${num(params, "max")} — adjust`,
    "shell.mobileReviewContract": "Review contract",
    "shell.contractOutcome": "Contract Outcome",
    "shell.rosterPartyOf": (params) => `Roster · party ${num(params, "count")}/${num(params, "max")}`,
    "shell.rosterSelectContract": (params) => `Roster · ${num(params, "count")} agents · select a contract to assign`,
    "shell.collapseName": (params) => `Collapse ${str(params, "name")}`,
    "shell.expandName": (params) => `Expand ${str(params, "name")}`,
    "shell.unlockRequirement": "Unlock requirement",
    "shell.recordedOutcomeNote": "This run has recorded a successful outcome here.",
    "shell.partyCount": (params) => {
      const count = num(params, "count");
      const min = num(params, "min");
      const max = num(params, "max");
      return `Party ${count} · need ${min}${max !== min ? `–${max}` : ""}`;
    },
    "shell.fixThisContract": "Fix this contract",
    "shell.moreOptions": (params) => {
      const count = num(params, "count");
      return `+${count} more option${count > 1 ? "s" : ""}`;
    },
    "shell.addAgent": (params) => `Add ${str(params, "name")}`,
    "shell.swapInAgent": (params) => `Swap in ${str(params, "name")}`,
    "shell.roles": "Roles:",
    "shell.time": "Time:",
    "shell.scopeTeam": "team",
    "shell.scopeRole": "role",
    "shell.scopePerAgent": "per-agent",
    "shell.assignRange": (params) => {
      const min = num(params, "min");
      const max = num(params, "max");
      return `Assign ${min}${max !== min ? `–${max}` : ""}`;
    },
    "shell.riskRun": "Risk Run",
    "shell.runWithRisk": "Run With Risk",
    "shell.runContract": "Run Contract",
    "shell.difficultyMode": "Mode",
    "shell.difficultyBase": "Standard",
    "shell.riskWarning": "Projected failure. Fix the party or knowingly accept the risk.",
    "shell.thinWarning": "Risk remains. The run can work, but the buffer is thin.",
    "shell.projectedReliable": "Projected Reliable",
    "shell.projectedRisky": "Projected Risky",
    "shell.projectedFail": "Projected to Fail",
    "shell.assignParty": "Assign a party",
    "shell.equipArrow": (params) => `Equip → ${str(params, "name")}`,
    "shell.outcomeSuccess": "Outcome: Success",
    "shell.outcomePartial": "Outcome: Partial",
    "shell.outcomeFailed": "Outcome: Failed",
    "shell.engineLoop": "Engine loop",
    "shell.everyContractCleared": "Every contract cleared",
    "shell.complete": (params) => `${str(params, "name")} — Complete`,
    "shell.equipped": "Equipped:",
    "shell.rewardMomentTitle": "Reward moment.",
    "shell.rewardMomentBody": "Equip the item before the next decision. This rail belongs only to loot until the claim is resolved.",
    "shell.readinessRecalculated": "Readiness below has recalculated from the new gear state.",
    "shell.recordButton": "Record",
    "shell.cartridgeButton": "Cartridge",
    "shell.recordedOutcomeTitle": "Recorded outcome",
    "shell.dismissViewNote": "Dismiss view note",
    "shell.closeRecordedOutcome": "Close recorded outcome",
    // "RODOH" is the runtime wordmark shown as chrome (a brand token, kept as a
    // key so the localization guard applies and there is one place to change it);
    // its value is the same in every locale.
    "shell.runtimeName": "RODOH",
    "shell.identityRecorded": (params) => `${num(params, "count")} recorded`,
    "shell.identityFresh": "No runs recorded",

    "status.selected": "Selected",
    "status.available": "Available",
    "status.reliable": "Reliable",
    "status.risky": "Risky",
    "status.failing": "Failing",
    "status.locked": "Locked",
    "status.recorded": "Recorded",
    "status.cleared": "Cleared",
    "status.assigned": "Assigned",
    "status.down": "Down",

    "readiness.assignAtLeast": (params) => {
      const min = num(params, "min");
      const have = num(params, "have");
      return `Assign at least ${min} ${min === 1 ? "agent" : "agents"} (have ${have}).`;
    },
    "readiness.tooMany": (params) => `Too many assigned — max ${num(params, "max")} (have ${num(params, "have")}).`,
    "readiness.missingRole": (params) => {
      const need = num(params, "need");
      return `Missing ${need} ${str(params, "roleName")}${need > 1 ? "s" : ""} — add that role before trusting the projection.`;
    },
    "readiness.checkFailingBy": (params) =>
      `${str(params, "name")}: failing by ${num(params, "margin")} — needs +${num(params, "shortBy")} to become reliable.`,
    "readiness.checkPassingBy": (params) =>
      `${str(params, "name")}: passing by +${num(params, "margin")} — needs +${num(params, "shortBy")} more buffer to be reliable.`,
    "readiness.addsRequired": (params) => `Adds required ${str(params, "roleName")}.`,
    "readiness.improves": (params) => {
      const attrNames = str(params, "attrNames");
      return `Improves ${str(params, "checkName")}${attrNames ? ` with ${attrNames}` : ""}.`;
    },
    "readiness.downtimeChangesReason": (params) => {
      const stressDelta = num(params, "stressDelta");
      const moraleDelta = num(params, "moraleDelta");
      return `${str(params, "label")} changes Stress ${stressDelta >= 0 ? "+" : ""}${stressDelta} and Morale ${moraleDelta >= 0 ? "+" : ""}${moraleDelta}.`;
    },
    "readiness.swapOut": (params) => `Swap out ${str(params, "name")}.`,
    "readiness.noCleanFix": "No clean fix is available from the current roster. Run another contract, earn gear, or accept the risk.",
    "readiness.recommendationRationale": (params) => {
      const hasRoles = num(params, "hasRoles") === 1;
      const roleList = str(params, "roleList");
      const attrPart = str(params, "attrPart");
      const rolePart = hasRoles ? `fills the required ${roleList} first, then ` : "";
      return `Recommended party ${rolePart}picks the highest ${attrPart}, and deprioritizes stressed agents.`;
    },
    "readiness.checkedAttributesFallback": "the checked attributes",

    "readinessRow.passingBy": (params) => `Passing by +${num(params, "margin")} · needs +${num(params, "shortBy")} more buffer to become reliable.`,
    "readinessRow.failingBy": (params) => `Failing by ${num(params, "margin")} · needs +${num(params, "shortBy")} to become reliable.`,
    "readinessRow.reliableBufferReached": "Reliable buffer reached.",
    "readinessRow.top": (params) => `Top: ${str(params, "list")}`,

    "contractCard.needs": "Needs",
    "contractCard.clearEarlier": "Clear earlier contracts",

    "gearSlot.noGear": "No gear equipped",

    "rosterCard.assignTooltip": "Assign to the selected contract",
    "rosterCard.selectFirstTooltip": "Select a contract first",
    "rosterCard.stress": (params) => `Stress ${num(params, "value")}`,
    "rosterCard.morale": (params) => `Morale ${num(params, "value")}`,

    "agentAction.rest": "Rest",
    "agentAction.train": "Train",
    "agentAction.rally": "Rally",

    "contractBoard.title": "Contract Board",
    "contractBoard.heading": "Choose the next place",
    "contractBoard.explainer": "Cards show what is available, what is locked, what is risky, and what the cartridge has recorded. Lines show which cleared place opens which locked one.",
    "contractBoard.party": "Party",
    "contractBoard.partyRange": (params) => {
      const min = num(params, "min");
      const max = num(params, "max");
      return `Party ${min}${max !== min ? `–${max}` : ""}`;
    },
    "contractBoard.recommendedReliable": "Recommended party is reliable.",
    "contractBoard.needsBuffer": (params) => `${str(params, "name")} needs +${num(params, "n")} buffer.`,
    "contractBoard.needsRecover": (params) => `${str(params, "name")} needs +${num(params, "n")} to recover.`,
    "contractBoard.countNeedsWork": "Party count needs work.",
    "contractBoard.roleMissing": "A required role is missing.",
    "contractBoard.waitingCycles": (params) => `Waiting ${num(params, "n")} cycles`,
    "contractBoard.waitingTitle": (params) => `Available since cycle ${num(params, "since")}, unaddressed for ${num(params, "n")} cycles.`,
    "contractBoard.chapterFallback": (params) => `Chapter ${num(params, "n")}`,

    "encounter.dispatching": "Dispatching…",
    "encounter.travelingToBoard": "Traveling to board position",
    "encounter.travelNote": "The committed party is moving toward the selected contract card.",
    "encounter.resolving": "Resolving…",
    "encounter.recordedOnBoard": "Recorded on board",
    "encounter.continue": "Continue →",
    "encounter.clickToSkip": "click anywhere to skip",
    "encounter.partyMovesOut": "The party moves out.",
    "encounter.reliableProjection": "Reliable projection",
    "encounter.reliableProjectionDetail": "Every authored check has buffer.",
    "encounter.riskWindow": "Risk window",
    "encounter.riskWindowDetail": "The party can pass, but the buffer is thin.",
    "encounter.failurePressure": "Failure pressure",
    "encounter.failurePressureDetail": "At least one check is projected short.",
    "encounter.noProjection": "No projection",
    "encounter.noProjectionDetail": "Assign a party before trusting the run.",
    "encounter.outcomeFulfilled": "Contract fulfilled.",
    "encounter.outcomePartial": "Partial success. Barely.",
    "encounter.outcomeFailure": "They came back empty-handed.",
    "encounter.outcomeRecordedFallback": "Outcome recorded.",

    "encounterShell.playEncounter": "Play Encounter",
    "encounterShell.difficulty": "Difficulty",
    "encounterShell.derivedNote": "Compiled from the contract — objectives, hazards, party, and rewards are derived, not hand-authored.",
    "encounterShell.objectives": "Objectives",
    "encounterShell.party": "Party",
    "encounterShell.hazards": "Hazards",
    "encounterShell.reach": (params) => `Reach ${num(params, "n")}`,
    "encounterShell.resolve": "Resolve Encounter",
    "encounterShell.ledger": "Ledger writeback",
    "encounterShell.detail": "Per-agent detail",
    "encounterShell.objectiveCleared": (params) => `${str(params, "name")} cleared.`,
    "encounterShell.objectiveNotCleared": (params) => `${str(params, "name")} not cleared.`,
    "encounterShell.reqCheckPassed": (params) => `The party beat the required ${str(params, "attr")} check.`,
    "encounterShell.reqCheckFailed": (params) => `The party fell short of the required ${str(params, "attr")} check.`,
    "encounterShell.reqCheckPassedNoAttr": "The party cleared the check.",
    "encounterShell.reqCheckFailedNoAttr": "The party fell short of the check.",
    "encounterShell.best": (params) => `Best: ${str(params, "name")} — ${num(params, "score")} vs target ${num(params, "target")}.`,
    "encounterShell.coverageAll": (params) => `All ${num(params, "count")} assigned agents contributed.`,
    "encounterShell.coveragePartial": (params) => `${num(params, "passed")} of ${num(params, "total")} cleared it.`,
    "encounterShell.agentPassedBy": (params) => `${str(params, "name")}: ${num(params, "score")} vs target ${num(params, "target")}, passed by +${num(params, "margin")}`,
    "encounterShell.agentShortBy": (params) => `${str(params, "name")}: ${num(params, "score")} vs target ${num(params, "target")}, short by ${num(params, "margin")}`,
    "encounterShell.unlocks": "Unlocks",
    "encounterShell.worldChanges": "World changes",
    "encounterShell.leave": "Leave",
    "encounterShell.deploy": "Deploy your squad",
    "encounterShell.committed": "In the room",
    "encounterShell.reserve": "Reserve",
    "encounterShell.projected": "Projected",
    "encounterShell.minNeeded": (params) => `Commit at least ${num(params, "n")}`,
    "encounterShell.projReliable": "Reliable",
    "encounterShell.projRisky": "Risky",
    "encounterShell.projFailing": "Failing",
    "encounterShell.projNone": "Assign a squad",
    "encounterShell.posture": "Posture",
    "encounterShell.postureStandard": "Standard",
    "encounterShell.steady": "Steady the roll",
    "encounterShell.steadyOn": "narrower risk, same strength",
    "encounterShell.steadyOff": "spend to narrow the risk band",
    "encounterShell.spentSteadied": (params) => `Spent ${num(params, "n")} ${str(params, "token")}: steadied the roll`,

    "presentations.board.label": "Board",
    "presentations.board.blurb": "2D contract board — readable cards, gates, risk, rewards, recorded marks",
    "presentations.board.controlsHint": "select a contract card",
    "presentations.board.purpose": "The cartridge's work as board-game cards: choose a place, inspect gates and risk, then manage the roster.",
    "presentations.map.label": "Map",
    "presentations.map.blurb": "2D world map — the same contracts as locations, by region, with state and an enter-encounter action",
    "presentations.map.controlsHint": "pick a location, or enter its encounter",
    "presentations.map.purpose": "The cartridge's contracts as world locations, grouped by region: see what's available, active, or recorded, and walk into an encounter.",
    "worldMap.difficulty": "Difficulty",
    "worldMap.enterEncounter": "Enter Encounter",
    "worldMap.stateLocked": "Locked",
    "worldMap.stateAvailable": "Available",
    "worldMap.stateActive": "Active",
    "worldMap.stateRecorded": "Recorded",
    "presentations.globe.label": "Planet",
    "presentations.globe.blurb": "3D world — optional spatial renderer",
    "presentations.globe.controlsHint": "drag to orbit · scroll to zoom · right-drag to pan · click a ◆ contract",
    "presentations.globe.purpose": "The same cartridge state placed in a 3D world. Useful only when location matters for the cartridge.",
    "presentations.graph.label": "Debug Graph",
    "presentations.graph.blurb": "Developer dependency graph",
    "presentations.graph.controlsHint": "drag to orbit · scroll to zoom · click a ◆ contract",
    "presentations.graph.purpose": "Developer view of the dependency graph. Not the default player surface.",
    "presentations.legend.selected": "selected",
    "presentations.legend.available": "available",
    "presentations.legend.locked": "locked",
    "presentations.legend.recorded": "recorded",
    "presentations.legend.risky": "risky (projected to fall short)",
    "presentations.loadingRenderer": "Loading renderer…",

    "decision.worldResponds": "The world responds",
    "decision.foundingHall": "Founding the hall",
    "decision.aDecision": "A decision",
    "decision.openingBlurb": "You run a contract hall. Choices mark the cartridge. Morale improves projections. Stress makes outcomes less reliable. Contracts can earn gear that changes the next run.",
    "decision.effect": "Effect:",
    "decision.markDoctrine": " · Mark: cartridge doctrine",
    "decision.hiddenConsequence": "Hidden consequence",
    "decision.noVisibleEffect": "No immediate visible effect",
    "decision.continue": "Continue",

    "cartridgePanel.eyebrow": "Cartridge",
    "cartridgePanel.domain": "Domain",
    "cartridgePanel.engine": "Engine",
    "cartridgePanel.cycle": "Cycle",
    "cartridgePanel.recordedNodes": "Recorded nodes",
    "cartridgePanel.decisionMark": "Decision mark",
    "cartridgePanel.body": "Rodoh held the loop. This cartridge now carries engine marks — decisions, cleared nodes, cycle count, and roster state — that survive representation changes.",
    "cartridgePanel.exportRun": "Export run",
    "cartridgePanel.resume": "Resume",
    "cartridgePanel.leave": "Leave",
    "cartridgePanel.trust": "Trust",
    "cartridgePanel.identity": "Authored identity",
    "cartridgePanel.ledger": "Contract ledger",
    "cartridgePanel.ledgerEmpty": "No contracts recorded yet.",
    "cartridgePanel.outcomeSuccess": "Cleared",
    "cartridgePanel.outcomePartial": "Partial",
    "cartridgePanel.outcomeFailure": "Failed",

    "boot.openCartridge": "Open cartridge…",
    "boot.remove": "Remove",
    "boot.importedNamed": (params) => `Imported "${str(params, "name")}".`,
    "boot.importFailedHeading": "Import failed:",
    "boot.trustBundled": "Bundled",
    "boot.trustImportedUnsigned": "Imported (unsigned)",
    "boot.trustVerified": "Verified",
    "boot.trustQuarantined": "Quarantined",
    "boot.programOfRecord": "Program of record",
    "boot.identity": "Authored identity",
    "boot.freshProgram": "New program — no runs recorded yet",
    "boot.contractsRecorded": (params) => {
      const count = num(params, "count");
      return `${count} contract${count === 1 ? "" : "s"} recorded`;
    },
    "boot.resumable": "Resumable",
    "boot.enter": "Enter",
    "boot.resume": "Resume",
    "boot.runtimeEyebrow": "AXM-WORLD runtime shell",
    "boot.heroTitle": "Cartridge worlds that remember.",
    "boot.heroBody": "Pick up a cartridge. Hold the loop. Mark what happened. Keep going.",
    "boot.footerNote": "Rodoh records the run. AXM-WORLD renders the shell. The cartridge stays yours.",
    "boot.holdTheLoop": "Hold the loop.",
    "boot.loadingNamed": (params) => `Loading ${str(params, "name")}`,
    // domain / engine version / count flow verbatim as content params; only the
    // "engine" and "contracts" words are chrome.
    "boot.cartridgeMeta": (params) => {
      const count = num(params, "count");
      return `${str(params, "domain")} · engine ${str(params, "engine")} · ${count} contract${count === 1 ? "" : "s"}`;
    },
  },
  "zh-Hant": {
    "coach.arcComplete": "卡匣已標記為完成。離開前請檢視或匯出本次執行狀態。",
    "coach.pendingDecision": "請處理目前的決策。引擎將把結果套用到此卡匣的執行進度。",
    "coach.outcomeRecorded": "結果已記錄。請檢視已變更的卡匣狀態，或選擇其他可用節點。",
    "blockers.dramaCards": (params) => `推進前請先處理 ${num(params, "count")} 張劇情卡。`,
    "blockers.rewardDecisions": (params) => `請在報告中處理 ${num(params, "count")} 項待定的獎勵決策。`,

    "locale.enLabel": "EN",
    "locale.zhHantLabel": "中文",

    "shell.cycle": "週期",
    "shell.recorded": "已記錄",
    "shell.dispatches": "快報",
    "shell.lootEquip": "戰利品／裝備",
    "shell.bench": "候補",
    "shell.recommendedParty": "推薦隊伍",
    "shell.recommendedChip": "推薦",
    "shell.topPick": "最佳",
    "shell.mobileBackBoard": "契約板",
    "shell.mobileBackContract": "契約",
    "shell.mobileAdjustParty": (params) => `隊伍 ${num(params, "count")}/${num(params, "max")} — 調整`,
    "shell.mobileReviewContract": "檢視契約",
    // Intentionally left untranslated (see EN_ONLY_IDS) to exercise the
    // zh-Hant → en fallback path honestly.
    // "shell.contractOutcome": "契約結果",
    "shell.rosterPartyOf": (params) => `名冊 · 隊伍 ${num(params, "count")}/${num(params, "max")}`,
    "shell.rosterSelectContract": (params) => `名冊 · ${num(params, "count")} 名成員 · 選擇契約以指派`,
    "shell.collapseName": (params) => `收合 ${str(params, "name")}`,
    "shell.expandName": (params) => `展開 ${str(params, "name")}`,
    "shell.unlockRequirement": "解鎖條件",
    "shell.recordedOutcomeNote": "此次執行已在此記錄一次成功結果。",
    "shell.partyCount": (params) => {
      const count = num(params, "count");
      const min = num(params, "min");
      const max = num(params, "max");
      return `隊伍 ${count} 人 · 需要 ${min}${max !== min ? `–${max}` : ""} 人`;
    },
    "shell.fixThisContract": "修正此契約",
    "shell.moreOptions": (params) => `還有 ${num(params, "count")} 個選項`,
    "shell.addAgent": (params) => `加入 ${str(params, "name")}`,
    "shell.swapInAgent": (params) => `替換為 ${str(params, "name")}`,
    "shell.roles": "職位：",
    "shell.time": "時間：",
    "shell.scopeTeam": "團隊",
    "shell.scopeRole": "職位",
    "shell.scopePerAgent": "個別成員",
    "shell.assignRange": (params) => {
      const min = num(params, "min");
      const max = num(params, "max");
      return `指派 ${min}${max !== min ? `–${max}` : ""} 人`;
    },
    "shell.riskRun": "冒險執行",
    "shell.runWithRisk": "冒險執行契約",
    "shell.runContract": "執行契約",
    "shell.difficultyMode": "模式",
    "shell.difficultyBase": "標準",
    "shell.riskWarning": "預測將會失敗。請調整隊伍，或明知風險仍執行。",
    "shell.thinWarning": "仍有風險。此次執行可能成功，但緩衝很薄弱。",
    "shell.projectedReliable": "預測：可靠",
    "shell.projectedRisky": "預測：有風險",
    "shell.projectedFail": "預測：將失敗",
    "shell.assignParty": "請指派隊伍",
    "shell.equipArrow": (params) => `裝備 → ${str(params, "name")}`,
    "shell.outcomeSuccess": "結果：成功",
    "shell.outcomePartial": "結果：部分成功",
    "shell.outcomeFailed": "結果：失敗",
    "shell.engineLoop": "引擎循環",
    "shell.everyContractCleared": "所有契約皆已完成",
    "shell.complete": (params) => `${str(params, "name")} — 已完成`,
    "shell.equipped": "已裝備：",
    "shell.rewardMomentTitle": "獎勵時刻。",
    "shell.rewardMomentBody": "請在下一個決策前裝備此物品。在領取完成前，此欄只顯示戰利品。",
    "shell.readinessRecalculated": "下方的準備度已依新的裝備狀態重新計算。",
    "shell.recordButton": "記錄",
    "shell.cartridgeButton": "卡匣",
    "shell.recordedOutcomeTitle": "已記錄的結果",
    "shell.dismissViewNote": "關閉檢視說明",
    "shell.closeRecordedOutcome": "關閉已記錄的結果",
    "shell.runtimeName": "RODOH",
    "shell.identityRecorded": (params) => `已記錄 ${num(params, "count")}`,
    "shell.identityFresh": "尚無執行記錄",

    "status.selected": "已選取",
    "status.available": "可承接",
    "status.reliable": "可靠",
    "status.risky": "有風險",
    "status.failing": "將失敗",
    "status.locked": "鎖定",
    "status.recorded": "已記錄",
    "status.cleared": "已完成",
    "status.assigned": "已指派",
    "status.down": "倒下",

    "readiness.assignAtLeast": (params) => `請至少指派 ${num(params, "min")} 名人員（目前 ${num(params, "have")} 名）。`,
    "readiness.tooMany": (params) => `指派人數過多 — 上限 ${num(params, "max")} 人（目前 ${num(params, "have")} 人）。`,
    "readiness.missingRole": (params) => `缺少 ${num(params, "need")} 名${str(params, "roleName")} — 請先補齊該職位，再信任預測結果。`,
    "readiness.checkFailingBy": (params) => `${str(params, "name")}：落後 ${num(params, "margin")} — 需要 +${num(params, "shortBy")} 才能達到可靠。`,
    "readiness.checkPassingBy": (params) => `${str(params, "name")}：領先 +${num(params, "margin")} — 還需要 +${num(params, "shortBy")} 緩衝才能可靠。`,
    "readiness.addsRequired": (params) => `補齊所需的${str(params, "roleName")}。`,
    "readiness.improves": (params) => {
      const attrNames = str(params, "attrNames");
      return `提升${str(params, "checkName")}${attrNames ? `（${attrNames}）` : ""}。`;
    },
    "readiness.downtimeChangesReason": (params) => {
      const stressDelta = num(params, "stressDelta");
      const moraleDelta = num(params, "moraleDelta");
      return `${str(params, "label")}會使壓力${stressDelta >= 0 ? "+" : ""}${stressDelta}、士氣${moraleDelta >= 0 ? "+" : ""}${moraleDelta}。`;
    },
    "readiness.swapOut": (params) => `替換掉 ${str(params, "name")}。`,
    "readiness.noCleanFix": "目前名冊沒有乾淨的解法。可以先執行其他契約、取得裝備，或是接受風險直接執行。",
    "readiness.recommendationRationale": (params) => {
      const hasRoles = num(params, "hasRoles") === 1;
      const roleList = str(params, "roleList");
      const attrPart = str(params, "attrPart");
      const rolePart = hasRoles ? `優先補滿所需的 ${roleList}，接著` : "";
      return `推薦隊伍${rolePart}挑選最高的 ${attrPart}，並降低高壓力人員的優先度。`;
    },
    "readiness.checkedAttributesFallback": "檢定所需的屬性",

    "readinessRow.passingBy": (params) => `領先 +${num(params, "margin")} · 還需 +${num(params, "shortBy")} 緩衝才能達到可靠。`,
    "readinessRow.failingBy": (params) => `落後 ${num(params, "margin")} · 需要 +${num(params, "shortBy")} 才能達到可靠。`,
    "readinessRow.reliableBufferReached": "已達到可靠緩衝。",
    "readinessRow.top": (params) => `最佳：${str(params, "list")}`,

    "contractCard.needs": "需要",
    "contractCard.clearEarlier": "請先完成較早的契約",

    "gearSlot.noGear": "尚未裝備",

    "rosterCard.assignTooltip": "指派至所選契約",
    "rosterCard.selectFirstTooltip": "請先選擇契約",
    "rosterCard.stress": (params) => `壓力 ${num(params, "value")}`,
    "rosterCard.morale": (params) => `士氣 ${num(params, "value")}`,

    "agentAction.rest": "休息",
    "agentAction.train": "訓練",
    "agentAction.rally": "激勵",

    "contractBoard.title": "契約板",
    "contractBoard.heading": "選擇下一個地點",
    "contractBoard.explainer": "卡片顯示哪些契約可承接、哪些鎖定、哪些有風險，以及卡匣已記錄的結果。連線顯示已完成的地點解鎖了哪個鎖定地點。",
    "contractBoard.party": "隊伍",
    "contractBoard.partyRange": (params) => {
      const min = num(params, "min");
      const max = num(params, "max");
      return `隊伍 ${min}${max !== min ? `–${max}` : ""} 人`;
    },
    "contractBoard.recommendedReliable": "推薦隊伍可靠。",
    "contractBoard.needsBuffer": (params) => `${str(params, "name")}還需要 +${num(params, "n")} 緩衝。`,
    "contractBoard.needsRecover": (params) => `${str(params, "name")}還需要 +${num(params, "n")} 才能恢復。`,
    "contractBoard.countNeedsWork": "隊伍人數需要調整。",
    "contractBoard.roleMissing": "缺少必要職位。",
    "contractBoard.waitingCycles": (params) => `已等待 ${num(params, "n")} 個週期`,
    "contractBoard.waitingTitle": (params) => `自第 ${num(params, "since")} 週期起可承接，已擱置 ${num(params, "n")} 個週期。`,
    "contractBoard.chapterFallback": (params) => `第 ${num(params, "n")} 章`,

    "encounter.dispatching": "派遣中…",
    "encounter.travelingToBoard": "前往契約板位置",
    "encounter.travelNote": "已指派的隊伍正前往所選契約卡片。",
    "encounter.resolving": "結算中…",
    "encounter.recordedOnBoard": "已記錄於契約板",
    "encounter.continue": "繼續 →",
    "encounter.clickToSkip": "點擊任意處以跳過",
    "encounter.partyMovesOut": "隊伍出發了。",
    "encounter.reliableProjection": "可靠預測",
    "encounter.reliableProjectionDetail": "每項已授權檢定皆有緩衝。",
    "encounter.riskWindow": "風險區間",
    "encounter.riskWindowDetail": "隊伍可以通過，但緩衝薄弱。",
    "encounter.failurePressure": "失敗壓力",
    "encounter.failurePressureDetail": "至少一項檢定預測不足。",
    "encounter.noProjection": "尚無預測",
    "encounter.noProjectionDetail": "請先指派隊伍，再信任此次執行。",
    "encounter.outcomeFulfilled": "契約已履行。",
    "encounter.outcomePartial": "勉強算是部分成功。",
    "encounter.outcomeFailure": "隊伍空手而歸。",
    "encounter.outcomeRecordedFallback": "結果已記錄。",

    "encounterShell.playEncounter": "進行遭遇",
    "encounterShell.difficulty": "難度",
    "encounterShell.derivedNote": "由契約編譯而成 — 目標、危害、隊伍與獎勵皆為衍生，並非手動撰寫。",
    "encounterShell.objectives": "目標",
    "encounterShell.party": "隊伍",
    "encounterShell.hazards": "危害",
    "encounterShell.reach": (params) => `達到 ${num(params, "n")}`,
    "encounterShell.resolve": "解決遭遇",
    "encounterShell.ledger": "帳本更新",
    "encounterShell.detail": "各人員細節",
    "encounterShell.objectiveCleared": (params) => `${str(params, "name")} 已完成。`,
    "encounterShell.objectiveNotCleared": (params) => `${str(params, "name")} 未完成。`,
    "encounterShell.reqCheckPassed": (params) => `隊伍以充足優勢通過了所需的${str(params, "attr")}檢定。`,
    "encounterShell.reqCheckFailed": (params) => `隊伍未達到所需的${str(params, "attr")}檢定。`,
    "encounterShell.reqCheckPassedNoAttr": "隊伍通過了檢定。",
    "encounterShell.reqCheckFailedNoAttr": "隊伍未通過檢定。",
    "encounterShell.best": (params) => `最佳：${str(params, "name")} — ${num(params, "score")}，目標 ${num(params, "target")}。`,
    "encounterShell.coverageAll": (params) => `全部 ${num(params, "count")} 名指派人員皆有貢獻。`,
    "encounterShell.coveragePartial": (params) => `${num(params, "total")} 名中有 ${num(params, "passed")} 名通過。`,
    "encounterShell.agentPassedBy": (params) => `${str(params, "name")}：${num(params, "score")}，目標 ${num(params, "target")}，超出 +${num(params, "margin")}`,
    "encounterShell.agentShortBy": (params) => `${str(params, "name")}：${num(params, "score")}，目標 ${num(params, "target")}，不足 ${num(params, "margin")}`,
    "encounterShell.unlocks": "解鎖",
    "encounterShell.worldChanges": "世界變化",
    "encounterShell.leave": "離開",
    "encounterShell.deploy": "部署隊伍",
    "encounterShell.committed": "已進場",
    "encounterShell.reserve": "後備",
    "encounterShell.projected": "預估",
    "encounterShell.minNeeded": (params) => `至少投入 ${num(params, "n")} 名`,
    "encounterShell.projReliable": "穩妥",
    "encounterShell.projRisky": "有風險",
    "encounterShell.projFailing": "恐將失敗",
    "encounterShell.projNone": "指派隊伍",
    "encounterShell.posture": "姿態",
    "encounterShell.postureStandard": "標準",
    "encounterShell.steady": "穩定擲值",
    "encounterShell.steadyOn": "風險更窄，實力不變",
    "encounterShell.steadyOff": "花費以收窄風險區間",
    "encounterShell.spentSteadied": (params) => `花費 ${num(params, "n")} ${str(params, "token")}：穩定了擲值`,

    "presentations.board.label": "契約板",
    "presentations.board.blurb": "2D 契約板 — 易讀卡片、關卡、風險、獎勵、已記錄標記",
    "presentations.board.controlsHint": "點選契約卡片",
    "presentations.board.purpose": "以桌遊卡片呈現卡匣的工作：選擇地點、檢視關卡與風險，再管理名冊。",
    "presentations.map.label": "地圖",
    "presentations.map.blurb": "2D 世界地圖 — 相同契約化為地點，依地區分組，顯示狀態並可進入遭遇",
    "presentations.map.controlsHint": "選擇地點，或進入其遭遇",
    "presentations.map.purpose": "將卡匣的契約呈現為世界地點，依地區分組：查看可用、進行中或已記錄的狀態，並走入遭遇。",
    "worldMap.difficulty": "難度",
    "worldMap.enterEncounter": "進入遭遇",
    "worldMap.stateLocked": "鎖定",
    "worldMap.stateAvailable": "可用",
    "worldMap.stateActive": "進行中",
    "worldMap.stateRecorded": "已記錄",
    "presentations.globe.label": "星球",
    "presentations.globe.blurb": "3D 世界 — 選用的空間化渲染器",
    "presentations.globe.controlsHint": "拖曳以環繞 · 滾動以縮放 · 按右鍵拖曳以平移 · 點選 ◆ 契約",
    "presentations.globe.purpose": "同樣的卡匣狀態，置於 3D 世界中。僅在地點對此卡匣有意義時才需要。",
    "presentations.graph.label": "除錯圖表",
    "presentations.graph.blurb": "開發者相依性圖表",
    "presentations.graph.controlsHint": "拖曳以環繞 · 滾動以縮放 · 點選 ◆ 契約",
    "presentations.graph.purpose": "開發者用的相依性圖表檢視，非玩家預設畫面。",
    "presentations.legend.selected": "已選取",
    "presentations.legend.available": "可承接",
    "presentations.legend.locked": "鎖定",
    "presentations.legend.recorded": "已記錄",
    "presentations.legend.risky": "有風險（預測未達標）",
    "presentations.loadingRenderer": "渲染器載入中…",

    "decision.worldResponds": "世界的回應",
    "decision.foundingHall": "創立契約堂",
    "decision.aDecision": "一項決策",
    "decision.openingBlurb": "你經營一間契約堂。選擇會標記於卡匣。士氣能提升預測，壓力會讓結果較不可靠。契約能取得改變下次執行的裝備。",
    "decision.effect": "效果：",
    "decision.markDoctrine": " · 標記：卡匣方針",
    "decision.hiddenConsequence": "隱藏後果",
    "decision.noVisibleEffect": "暫無明顯效果",
    "decision.continue": "繼續",

    "cartridgePanel.eyebrow": "卡匣",
    "cartridgePanel.domain": "領域",
    "cartridgePanel.engine": "引擎",
    "cartridgePanel.cycle": "週期",
    "cartridgePanel.recordedNodes": "已記錄節點",
    "cartridgePanel.decisionMark": "決策標記",
    "cartridgePanel.body": "Rodoh 持續維護此循環。此卡匣現在帶有引擎標記 — 決策、已完成節點、週期數與名冊狀態 — 在切換呈現方式後依然保留。",
    "cartridgePanel.exportRun": "匯出執行",
    "cartridgePanel.resume": "繼續",
    "cartridgePanel.leave": "離開卡匣",
    "cartridgePanel.trust": "信任等級",

    "boot.openCartridge": "開啟卡匣…",
    "boot.remove": "移除",
    "boot.importedNamed": (params) => `已匯入「${str(params, "name")}」。`,
    "boot.importFailedHeading": "匯入失敗：",
    "boot.trustBundled": "內建",
    "boot.trustImportedUnsigned": "已匯入（未簽署）",
    "boot.trustVerified": "已驗證",
    "boot.trustQuarantined": "已隔離",
    "boot.programOfRecord": "正式記錄程式",
    "boot.identity": "作者識別碼",
    "boot.freshProgram": "全新程式 — 尚無執行記錄",
    "boot.contractsRecorded": (params) => `已記錄 ${num(params, "count")} 份契約`,
    "boot.resumable": "可繼續",
    "boot.enter": "進入",
    "boot.resume": "繼續",
    "boot.runtimeEyebrow": "AXM-WORLD 執行環境外殼",
    "boot.heroTitle": "會記憶的卡匣世界。",
    "boot.heroBody": "拿起一張卡匣。維持循環。記下發生的事。繼續前進。",
    "boot.footerNote": "Rodoh 記錄執行。AXM-WORLD 呈現外殼。卡匣仍歸你所有。",
    "boot.holdTheLoop": "維持循環。",
    "boot.loadingNamed": (params) => `載入 ${str(params, "name")} 中`,
    "boot.cartridgeMeta": (params) => `${str(params, "domain")} · 引擎 ${str(params, "engine")} · ${num(params, "count")} 份契約`,
  },
};

export function formatMessage(locale: Locale, id: MessageId, params?: MessageParams): string {
  const value = MESSAGES[locale]?.[id] ?? MESSAGES.en[id];
  if (value === undefined) return id;
  if (typeof value === "function") return value(params ?? {});
  return value;
}
