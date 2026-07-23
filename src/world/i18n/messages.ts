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
  | "sensory.group"
  | "sensory.soundOn"
  | "sensory.soundOff"
  | "sensory.motionFull"
  | "sensory.motionReduced"
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
  | "shell.recommendedFit"
  | "shell.engineLoop"
  | "shell.everyContractRecorded"
  | "shell.openCompletedCartridge"
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
  // ── result / ledger clarity (post-action loop) ───────────────────────────
  | "result.outcome"
  | "result.objectives"
  | "result.rewards"
  | "result.worldChanges"
  | "result.changeRecorded"
  | "result.changeUnlocked"
  | "result.recorded"
  | "result.persists"
  | "result.ledgerRecordedAt"
  // ── canonical outcome grade axis (Cleared / Partial / Failed) — the one
  //    grade vocabulary spoken by the immediate overlay, the revisit modal,
  //    the encounter receipt, and the ledger. NOT the memory axis ("recorded"),
  //    and NOT the authored per-outcome narrative ("encounter.outcome*"). ─────
  | "outcome.cleared"
  | "outcome.partial"
  | "outcome.failed"
  // ── shared status vocabulary (roster/contract/readiness states) ────────
  | "status.selected"
  | "status.available"
  | "status.reliable"
  | "status.risky"
  | "status.failing"
  | "status.locked"
  | "status.recorded"
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
  | "readinessRow.scoreAgainstTarget"
  | "readinessRow.passingBy"
  | "readinessRow.failingBy"
  | "readinessRow.reliableBufferReached"
  | "readinessRow.top"
  // ── PixelContractCard ───────────────────────────────────────────────────
  | "contractCard.needs"
  | "contractCard.clearEarlier"
  | "contractCard.difficulty"
  | "contractCard.worldState"
  | "contractCard.squadFit"
  | "contractCard.worldAvailable"
  | "contractCard.worldNextNote"
  | "contractCard.squadNotEvaluated"
  | "contractCard.squadNoParty"
  | "contractCard.squadNotRelevant"
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
  | "encounterShell.staging"
  | "encounterShell.goingIn"
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
  | "presentations.aperture.label"
  | "presentations.aperture.blurb"
  | "presentations.aperture.controlsHint"
  | "presentations.aperture.purpose"
  | "presentations.underworld.label"
  | "presentations.underworld.blurb"
  | "presentations.underworld.controlsHint"
  | "presentations.underworld.purpose"
  | "presentations.commonShip.label"
  | "presentations.commonShip.blurb"
  | "presentations.commonShip.controlsHint"
  | "presentations.commonShip.purpose"
  | "underworld.metadataRefused"
  | "underworld.invalidHeading"
  | "underworld.invalidBody"
  | "underworld.noSource"
  | "underworld.eyebrow"
  | "underworld.stateLedger"
  | "underworld.alarm"
  | "underworld.signature"
  | "underworld.visibility"
  | "underworld.recordedMovements"
  | "underworld.civicHub"
  | "underworld.steward"
  | "underworld.ordinaryLife"
  | "underworld.exteriorClassification"
  | "underworld.observer"
  | "underworld.hubChanged"
  | "underworld.hubHeld"
  | "underworld.layeredMap"
  | "underworld.layeredMapHint"
  | "underworld.available"
  | "underworld.recorded"
  | "underworld.locked"
  | "underworld.expedition"
  | "underworld.depthVector"
  | "underworld.objective"
  | "underworld.route"
  | "underworld.authority"
  | "underworld.claim"
  | "underworld.signatureBudget"
  | "underworld.inheritance"
  | "underworld.enterExpedition"
  | "underworld.cast"
  | "underworld.wakeSources"
  | "underworld.inheritedConsequences"
  | "underworld.inherited"
  | "underworld.pending"
  // ── inhabited hall (presentation + scene chrome) ─────────────────────────
  | "presentations.hall.label"
  | "presentations.hall.blurb"
  | "presentations.hall.controlsHint"
  | "presentations.hall.purpose"
  | "hall.you"
  | "hall.steward"
  | "hall.offering"
  | "hall.fulfilled"
  | "hall.talk"
  | "hall.viewOnBoard"
  | "hall.accept"
  | "hall.leave"
  | "hall.recordedNote"
  | "hall.worldChanged"
  | "hall.lastRecorded"
  | "hall.claimFirst"
  | "hall.threshold"
  | "hall.approach"
  | "hall.enterEncounter"
  | "hall.enterNamed"
  | "hall.notYet"
  | "hall.squadDetails"
  | "worldMap.difficulty"
  | "worldMap.enterEncounter"
  | "worldMap.talkToSteward"
  // ── one world, one route (cross-surface navigation) ──────────────────────
  | "shell.seeOnMap"
  | "shell.takeInPerson"
  | "shell.stewardNote"
  | "worldMap.stateLocked"
  | "worldMap.stateAvailable"
  | "worldMap.stateActive"
  | "worldMap.stateRecorded"
  | "worldMap.contractMap"
  | "worldMap.recordedOf"
  | "worldMap.regionLocked"
  | "worldMap.regionOpen"
  | "worldMap.regionComplete"
  | "worldMap.nextContract"
  | "worldMap.steep"
  | "worldMap.steepContract"
  | "worldMap.legendTitle"
  | "worldMap.legendNext"
  | "worldMap.legendAvailable"
  | "worldMap.legendActive"
  | "worldMap.legendSteep"
  | "worldMap.legendRecorded"
  | "worldMap.legendLocked"
  | "presentations.globe.label"
  | "presentations.globe.blurb"
  | "presentations.globe.controlsHint"
  | "presentations.globe.purpose"
  | "presentations.globe.fallbackTitle"
  | "presentations.globe.fallbackBody"
  | "world.movementControls"
  | "world.walkForward"
  | "world.walkBackward"
  | "world.strafeLeft"
  | "world.strafeRight"
  | "world.jump"
  | "world.walkToInteract"
  | "world.interactionUnlocked"
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
  | "decision.groupChange"
  | "decision.exactChanges"
  | "decision.continue"
  // ── Godscar Pocket Aperture projection ──────────────────────────────────
  | "godscar.metadataRefused"
  | "godscar.invalidHeading"
  | "godscar.invalidBody"
  | "godscar.pocketEyebrow"
  | "godscar.canonRelation.foundational"
  | "godscar.canonRelation.compatible"
  | "godscar.canonRelation.contested"
  | "godscar.canonRelation.alternateSequence"
  | "godscar.canonRelation.crossover"
  | "godscar.canonRelation.privateBranch"
  | "godscar.canonTier.settledCanon"
  | "godscar.canonTier.contestedCanon"
  | "godscar.canonTier.factionDoctrine"
  | "godscar.canonTier.storyFacingUnknown"
  | "godscar.pressure.pocket"
  | "godscar.pressure.patron"
  | "godscar.pressure.excludedActor"
  | "godscar.pressure.approachingTrigger"
  | "godscar.pressure.costOfResistance"
  | "godscar.pressure.scaleRevelation"
  | "godscar.evidenceLedger"
  | "godscar.claim"
  | "godscar.venue"
  | "godscar.legitimacyAtStake"
  | "godscar.ifAccepted"
  | "godscar.costOfAcceptance"
  | "godscar.ifFalse"
  | "godscar.intervention"
  | "godscar.limits"
  | "godscar.factionReceipts"
  | "godscar.prevents"
  | "godscar.failsBy"
  | "godscar.persistentConsequences"
  | "godscar.inheritedBy"
  | "godscar.moreInSource"
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
  | "cartridgePanel.ledgerProvenance"
  // ── boot screen (cartridge bay) ──────────────────────────────────────────
  | "boot.openCartridge"
  | "boot.remove"
  | "boot.importedNamed"
  | "boot.runRestoredNamed"
  | "boot.importFailedHeading"
  | "boot.preflightNew"
  | "boot.preflightUpdate"
  | "boot.preflightDuplicate"
  | "boot.preflightSameIdBundled"
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
  | "boot.legacyRunUnavailable"
  | "boot.enter"
  | "boot.resume"
  // ── boot screen: chrome copy (swept from bare literals) ──────────────────
  | "boot.runtimeEyebrow"
  | "boot.heroTitle"
  | "boot.heroBody"
  | "boot.footerNote"
  | "boot.holdTheLoop"
  | "boot.loadingNamed"
  | "boot.skipEntry"
  | "boot.cartridgeMeta"
  // ── boot screen: classic-row save state (PR 057) ──────────────────────────
  // "boot.freshProgram" says "program" — honest on the program-of-record
  // plaque, but a lie on a classic row (an imported cartridge, or The Waking Tower,
  // are never "a program"). "boot.resumable" carries no such claim and is
  // reused verbatim. This is the one neutral pair PR 057 adds.
  | "boot.freshEntry";

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
    "sensory.group": "Presentation preferences",
    "sensory.soundOn": "Sound on",
    "sensory.soundOff": "Sound off",
    "sensory.motionFull": "Full motion",
    "sensory.motionReduced": "Reduced motion",

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
    "shell.recommendedFit": "Recommended fit",
    "shell.engineLoop": "Engine loop",
    "shell.everyContractRecorded": "Every contract recorded",
    "shell.openCompletedCartridge": "Return to the completed cartridge",
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

    // The post-action loop, made legible: the OUTCOME grade (what happened) is a
    // different axis from RECORDED (the memory state). The result names both, the
    // ledger stamps the "when".
    "result.outcome": "Outcome",
    "result.objectives": "Objectives",
    "result.rewards": "Rewards",
    "result.worldChanges": "World changes",
    "result.changeRecorded": (params) => `${str(params, "name")} recorded`,
    "result.changeUnlocked": (params) => `${str(params, "name")} unlocked`,
    "result.recorded": "Recorded to the ledger",
    "result.persists": "Written to the Program 001 ledger — this result persists.",
    "result.ledgerRecordedAt": (params) => `Cycle ${String(num(params, "cycle")).padStart(2, "0")}`,
    "outcome.cleared": "Cleared",
    "outcome.partial": "Partial",
    "outcome.failed": "Failed",

    "status.selected": "Selected",
    "status.available": "Available",
    "status.reliable": "Reliable",
    "status.risky": "Risky",
    "status.failing": "Failing",
    "status.locked": "Locked",
    "status.recorded": "Recorded",
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

    "readinessRow.scoreAgainstTarget": (params) => `Squad ${str(params, "score")} · Need ${num(params, "target")}`,
    "readinessRow.passingBy": (params) => `Above the requirement by +${num(params, "margin")} · add +${num(params, "shortBy")} for a reliable projection.`,
    "readinessRow.failingBy": (params) => `Below the requirement by ${num(params, "margin")} · add +${num(params, "shortBy")} for a reliable projection.`,
    "readinessRow.reliableBufferReached": "Comfortably above the requirement.",
    "readinessRow.top": (params) => `Strongest contributors: ${str(params, "list")}`,

    "contractCard.needs": "Needs",
    "contractCard.clearEarlier": "Clear earlier contracts",
    "contractCard.difficulty": "Difficulty",
    // The two card axes, named. World-state band vs squad-fit band — a player reads
    // "what the world says" and "how my squad measures up" as different truths.
    "contractCard.worldState": "World state",
    "contractCard.squadFit": "Squad fit",
    "contractCard.worldAvailable": "Available now",
    "contractCard.worldNextNote": "Steward's next contract",
    "contractCard.squadNotEvaluated": "Not evaluated until available",
    "contractCard.squadNoParty": "Assign a party",
    "contractCard.squadNotRelevant": "No longer relevant",

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
    "contractBoard.explainer": "Cards show what is available, what is locked, what is risky, and what the cartridge has recorded. Lines show which recorded place opens which locked one.",
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
    "encounterShell.staging": "Staging",
    "encounterShell.goingIn": (params) => `${num(params, "n")} going in`,
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
    "presentations.aperture.label": "Aperture",
    "presentations.aperture.blurb": "Semantic command deck — campaign, contracts, bounded people, and exact receipts",
    "presentations.aperture.controlsHint": "switch Map / Trace / Surface · zoom between cartridge and receipts · copy an exact view",
    "presentations.aperture.purpose": "A high-information projection of the same run. It exposes authored structure and recorded consequence without manufacturing routes, choices, or relationships.",
    "presentations.underworld.label": "Underworld",
    "presentations.underworld.blurb": "Civic hub and layered Tomb map — ordinary life, descent, breach, return, and exact inherited state",
    "presentations.underworld.controlsHint": "choose a layer, inspect its expedition ledger, then enter the authored encounter",
    "presentations.underworld.purpose": "The Dark Tomb as an inhabited political architecture. Read the hub, Long Alarm, signature budget, layers, and persistent consequences without replacing Arc law.",
    "presentations.commonShip.label": "Common Ship",
    "presentations.commonShip.blurb": "Compose watches across bodies, clocks, habitats, and inherited obligations.",
    "presentations.commonShip.controlsHint": "Select an operation, compose the watch, inspect the Arc verdict, then commit.",
    "presentations.commonShip.purpose": "Manage the vessel as a shared polity rather than a human-normal vehicle.",
    "underworld.metadataRefused": "DARK TOMB METADATA REFUSED",
    "underworld.invalidHeading": "The cartridge claims a Dark Tomb source it cannot validate.",
    "underworld.invalidBody": "Play law remains the validated Arc. Rodoh will not infer layers, Alarm state, or consequences from malformed source.",
    "underworld.noSource": "This cartridge does not contain a registered Dark Tomb source.",
    "underworld.eyebrow": "DARK TOMB · CIVIC UNDERWORLD",
    "underworld.stateLedger": "Tomb state ledger",
    "underworld.alarm": "Long Alarm",
    "underworld.signature": "Signature",
    "underworld.visibility": "Visibility",
    "underworld.recordedMovements": "Recorded movements",
    "underworld.civicHub": "Lamp District civic hub",
    "underworld.steward": "Local witness",
    "underworld.ordinaryLife": "Ordinary life",
    "underworld.exteriorClassification": "Exterior classification",
    "underworld.observer": "Observer regime",
    "underworld.hubChanged": "The hub inherited the descent",
    "underworld.hubHeld": "The previous map still governs",
    "underworld.layeredMap": "Seven-layer district map",
    "underworld.layeredMapHint": "Select a layer to focus its current or next movement",
    "underworld.available": "Available",
    "underworld.recorded": "Recorded",
    "underworld.locked": "Locked",
    "underworld.expedition": "Expedition ledger",
    "underworld.depthVector": "Depth vector",
    "underworld.objective": "Objective",
    "underworld.route": "Authorized route",
    "underworld.authority": "Authority",
    "underworld.claim": "Claim to prove",
    "underworld.signatureBudget": "Signature budget",
    "underworld.inheritance": "Likely inheritance",
    "underworld.enterExpedition": "Enter expedition",
    "underworld.cast": "District cast",
    "underworld.wakeSources": "Wake sources",
    "underworld.inheritedConsequences": "Inherited consequences",
    "underworld.inherited": "Inherited",
    "underworld.pending": "Pending",
    "presentations.hall.label": "Hall",
    "presentations.hall.blurb": "Inhabited hall — meet the steward and take a contract in person",
    "presentations.hall.controlsHint": "talk to the steward to take a contract",
    "presentations.hall.purpose": "The cartridge's founding hall, inhabited: meet the steward, accept a contract in person, and watch the world change — the same contract and ledger as every other surface.",
    "hall.you": "You",
    "hall.steward": "The Steward",
    "hall.offering": "Has a contract for you",
    "hall.fulfilled": "Contract fulfilled",
    "hall.talk": "Talk",
    "hall.viewOnBoard": "View on board",
    "hall.accept": "Accept & resolve",
    "hall.leave": "Leave",
    "hall.recordedNote": "This contract is recorded in the world.",
    "hall.worldChanged": "The charter has begun — the world remembers.",
    "hall.lastRecorded": (params) => `Last recorded: ${str(params, "name")} · ${num(params, "count")} in the ledger.`,
    "hall.claimFirst": "Claim your reward before taking another contract.",
    "hall.threshold": "Encounter threshold",
    "hall.approach": "Approach",
    "hall.enterEncounter": "Enter encounter",
    "hall.enterNamed": (params) => `Enter ${str(params, "name")}`,
    "hall.notYet": "Not yet",
    "hall.squadDetails": "Squad details",
    "worldMap.difficulty": "Difficulty",
    "worldMap.enterEncounter": "Enter Encounter",
    "worldMap.talkToSteward": "Talk to the steward",
    "shell.seeOnMap": "See on map",
    "shell.takeInPerson": "Take in person",
    "shell.stewardNote": "Steward's note",
    "worldMap.stateLocked": "Locked",
    "worldMap.stateAvailable": "Available",
    "worldMap.stateActive": "Active",
    "worldMap.stateRecorded": "Recorded",
    "worldMap.contractMap": "Contract Map",
    "worldMap.recordedOf": (params) => `${num(params, "recorded")}/${num(params, "total")} recorded`,
    "worldMap.regionLocked": "Locked",
    "worldMap.regionOpen": "Open",
    "worldMap.regionComplete": "Complete",
    "worldMap.nextContract": "Up next",
    "worldMap.steep": "Steep",
    "worldMap.steepContract": "Steep contract — high authored difficulty",
    // Legend / state key — a compact glossary tying every pin marker to the word
    // the map already prints and what it means. The terms reuse the existing state
    // labels above; only these one-line glosses are new chrome.
    "worldMap.legendTitle": "Map key",
    "worldMap.legendNext": "The steward's held contract",
    "worldMap.legendAvailable": "Open — enter now",
    "worldMap.legendActive": "The pin you selected",
    "worldMap.legendSteep": "High authored difficulty",
    "worldMap.legendRecorded": "Result written to the ledger",
    "worldMap.legendLocked": "Clear earlier contracts first",
    "presentations.globe.label": "World",
    "presentations.globe.blurb": "Enter the cartridge as a spatial world",
    "presentations.globe.controlsHint": "WASD / arrows or touch pad to walk · drag to turn · Space to jump · approach a ◆ contract",
    "presentations.globe.purpose": "The cartridge made spatial: its places, contracts, and consequences remain the same world state.",
    "presentations.globe.fallbackTitle": "Spatial atlas",
    "presentations.globe.fallbackBody": "3D acceleration is unavailable in this browser. The same cartridge places and carried run remain available in a local orbital view.",
    "world.movementControls": "World movement controls",
    "world.walkForward": "Walk forward",
    "world.walkBackward": "Walk backward",
    "world.strafeLeft": "Move left",
    "world.strafeRight": "Move right",
    "world.jump": "Jump",
    "world.walkToInteract": "Walk to a contract marker to interact",
    "world.interactionUnlocked": "Interaction unlocked",
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
    "decision.groupChange": (params) => `${str(params, "type")}: ${num(params, "count")} people · ${str(params, "delta")}`,
    "decision.exactChanges": (params) => `Exact changes (${num(params, "count")})`,
    "decision.continue": "Continue",

    "godscar.metadataRefused": "GODSCAR POCKET METADATA REFUSED",
    "godscar.invalidHeading": "The cartridge claims a Godscar grammar it cannot validate.",
    "godscar.invalidBody": "Play law remains the validated Arc. Rodoh will not invent canon, provenance, or pressures from malformed metadata.",
    "godscar.pocketEyebrow": (params) => `GODSCAR POCKET · ${str(params, "relation")}`,
    "godscar.canonRelation.foundational": "foundational",
    "godscar.canonRelation.compatible": "compatible",
    "godscar.canonRelation.contested": "contested",
    "godscar.canonRelation.alternateSequence": "alternate sequence",
    "godscar.canonRelation.crossover": "crossover",
    "godscar.canonRelation.privateBranch": "private branch",
    "godscar.canonTier.settledCanon": "settled canon",
    "godscar.canonTier.contestedCanon": "contested canon",
    "godscar.canonTier.factionDoctrine": "faction doctrine",
    "godscar.canonTier.storyFacingUnknown": "story-facing unknown",
    "godscar.pressure.pocket": "Pocket",
    "godscar.pressure.patron": "Patron / controlling system",
    "godscar.pressure.excludedActor": "Excluded actor",
    "godscar.pressure.approachingTrigger": "Approaching trigger",
    "godscar.pressure.costOfResistance": "Cost of resistance",
    "godscar.pressure.scaleRevelation": "Scale revelation",
    "godscar.evidenceLedger": (params) => {
      const count = num(params, "count");
      return `Evidence ledger · ${count} provenance receipt${count === 1 ? "" : "s"}`;
    },
    "godscar.claim": "Claim",
    "godscar.venue": "Venue",
    "godscar.legitimacyAtStake": "Legitimacy at stake",
    "godscar.ifAccepted": "If accepted",
    "godscar.costOfAcceptance": "Cost of acceptance",
    "godscar.ifFalse": "If false",
    "godscar.intervention": "Intervention:",
    "godscar.limits": "Limits:",
    "godscar.factionReceipts": (params) => `Faction receipts · ${num(params, "count")}`,
    "godscar.prevents": "Prevents:",
    "godscar.failsBy": "Fails by:",
    "godscar.persistentConsequences": (params) => `Persistent consequences · ${num(params, "count")}`,
    "godscar.inheritedBy": (params) => `Inherited by ${str(params, "name")}`,
    "godscar.moreInSource": (params) => `${num(params, "count")} more remain in the cartridge source.`,

    "cartridgePanel.eyebrow": "Cartridge",
    "cartridgePanel.domain": "Domain",
    "cartridgePanel.engine": "Engine",
    "cartridgePanel.cycle": "Cycle",
    "cartridgePanel.recordedNodes": "Recorded nodes",
    "cartridgePanel.decisionMark": "Decision mark",
    "cartridgePanel.body": "Rodoh held the loop. This cartridge now carries engine marks — decisions, recorded nodes, cycle count, and roster state — that survive representation changes.",
    "cartridgePanel.exportRun": "Export run",
    "cartridgePanel.resume": "Resume",
    "cartridgePanel.leave": "Leave",
    "cartridgePanel.trust": "Trust",
    "cartridgePanel.identity": "Authored identity",
    "cartridgePanel.ledger": "Contract ledger",
    "cartridgePanel.ledgerEmpty": "No contracts recorded yet.",
    "cartridgePanel.ledgerProvenance": "Each result is recorded under the authored identity above. This ledger checks against the program.",

    "boot.openCartridge": "Open cartridge…",
    "boot.remove": "Remove",
    "boot.importedNamed": (params) => `Imported "${str(params, "name")}".`,
    "boot.runRestoredNamed": (params) => `Exact run restored: ${str(params, "name")}.`,
    "boot.importFailedHeading": "Import failed:",
    "boot.preflightNew": "New — not seen in this bay before.",
    "boot.preflightUpdate": "Revision — installed beside the held revision; no owned bytes are replaced.",
    "boot.preflightDuplicate": "Duplicate — this exact cartridge is already in the bay.",
    "boot.preflightSameIdBundled": "A bundled cartridge shares this id and stays untouched.",
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
    "boot.legacyRunUnavailable": "Legacy 1.0 run evidence preserved — replay profile unavailable",
    "boot.enter": "Enter",
    "boot.resume": "Resume",
    "boot.runtimeEyebrow": "AXM-WORLD runtime shell",
    "boot.heroTitle": "Cartridge worlds that remember.",
    "boot.heroBody": "Pick up a cartridge. Hold the loop. Mark what happened. Keep going.",
    "boot.footerNote": "Rodoh records the run. AXM-WORLD renders the shell. The cartridge stays yours.",
    "boot.holdTheLoop": "Hold the loop.",
    "boot.loadingNamed": (params) => `Loading ${str(params, "name")}`,
    "boot.skipEntry": "Skip entry",
    "boot.freshEntry": "Fresh — no runs recorded yet",
    // domain / engine version / count flow verbatim as content params; only the
    // "engine" and "contracts" words are chrome.
    "boot.cartridgeMeta": (params) => {
      const count = num(params, "count");
      return `${str(params, "domain")} · engine ${str(params, "engine")} · ${count} contract${count === 1 ? "" : "s"}`;
    },
  },
  "zh-Hant": {
    "sensory.group": "呈現偏好",
    "sensory.soundOn": "音效開啟",
    "sensory.soundOff": "音效關閉",
    "sensory.motionFull": "完整動態效果",
    "sensory.motionReduced": "減少動態效果",
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
    "shell.recommendedFit": "建議配置",
    "shell.engineLoop": "引擎循環",
    "shell.everyContractRecorded": "所有契約皆已記錄",
    "shell.openCompletedCartridge": "返回已完成的卡匣",
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

    "result.outcome": "結果",
    "result.objectives": "目標",
    "result.rewards": "獎勵",
    "result.worldChanges": "世界變化",
    "result.changeRecorded": (params) => `${str(params, "name")} 已記錄`,
    "result.changeUnlocked": (params) => `${str(params, "name")} 已解鎖`,
    "result.recorded": "已記錄至帳本",
    "result.persists": "已寫入 Program 001 帳本 — 此結果將保留。",
    "result.ledgerRecordedAt": (params) => `週期 ${String(num(params, "cycle")).padStart(2, "0")}`,
    "outcome.cleared": "達成",
    "outcome.partial": "部分",
    "outcome.failed": "失敗",

    "status.selected": "已選取",
    "status.available": "可承接",
    "status.reliable": "可靠",
    "status.risky": "有風險",
    "status.failing": "將失敗",
    "status.locked": "鎖定",
    "status.recorded": "已記錄",
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

    "readinessRow.scoreAgainstTarget": (params) => `隊伍 ${str(params, "score")} · 需要 ${num(params, "target")}`,
    "readinessRow.passingBy": (params) => `高於需求 +${num(params, "margin")} · 再增加 +${num(params, "shortBy")} 即可達到可靠預測。`,
    "readinessRow.failingBy": (params) => `低於需求 ${num(params, "margin")} · 增加 +${num(params, "shortBy")} 即可達到可靠預測。`,
    "readinessRow.reliableBufferReached": "已明顯高於需求。",
    "readinessRow.top": (params) => `主要貢獻者：${str(params, "list")}`,

    "contractCard.needs": "需要",
    "contractCard.clearEarlier": "請先完成較早的契約",
    "contractCard.difficulty": "難度",
    "contractCard.worldState": "世界狀態",
    "contractCard.squadFit": "隊伍契合",
    "contractCard.worldAvailable": "現可承接",
    "contractCard.worldNextNote": "管事的下一份契約",
    "contractCard.squadNotEvaluated": "開放後才會評估",
    "contractCard.squadNoParty": "請指派隊伍",
    "contractCard.squadNotRelevant": "已無關聯",

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
    "contractBoard.explainer": "卡片顯示哪些契約可承接、哪些鎖定、哪些有風險，以及卡匣已記錄的結果。連線顯示已記錄的地點解鎖了哪個鎖定地點。",
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
    "encounterShell.staging": "對陣",
    "encounterShell.goingIn": (params) => `${num(params, "n")} 人出戰`,
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
    "presentations.aperture.label": "孔徑",
    "presentations.aperture.blurb": "語意指揮台 — 戰役、契約、受限人物與精確收據",
    "presentations.aperture.controlsHint": "切換地圖／追蹤／界面 · 在卡匣與收據間縮放 · 複製精確檢視",
    "presentations.aperture.purpose": "同一執行紀錄的高資訊投影。它揭示作者結構與已記錄後果，不虛構路徑、選擇或關係。",
    "presentations.underworld.label": "地下世界",
    "presentations.underworld.blurb": "市民樞紐與分層墓域地圖 — 日常生活、下降、破口、返回與精確繼承狀態",
    "presentations.underworld.controlsHint": "選擇一層、檢視遠征帳本，再進入作者設定的遭遇",
    "presentations.underworld.purpose": "將黑暗墓域呈現為有人居住的政治建築。讀取樞紐、長期警報、訊號預算、層次與持續後果，不取代 Arc 規則。",
    "presentations.commonShip.label": "共同船艦",
    "presentations.commonShip.blurb": "跨越不同身體、時鐘、棲地與繼承義務編組值班。",
    "presentations.commonShip.controlsHint": "選擇一項行動、編組值班、檢視 Arc 判定，然後提交。",
    "presentations.commonShip.purpose": "將船艦作為共享政體管理，而非以人類常態為基準的載具。",
    "underworld.metadataRefused": "黑暗墓域中繼資料已拒絕",
    "underworld.invalidHeading": "此卡匣聲稱使用的黑暗墓域來源無法通過驗證。",
    "underworld.invalidBody": "遊玩規則仍以已驗證的 Arc 為準。Rodoh 不會從格式錯誤的來源推測層次、警報狀態或後果。",
    "underworld.noSource": "此卡匣不含已登錄的黑暗墓域來源。",
    "underworld.eyebrow": "黑暗墓域 · 市民地下世界",
    "underworld.stateLedger": "墓域狀態帳本",
    "underworld.alarm": "長期警報",
    "underworld.signature": "訊號",
    "underworld.visibility": "可見度",
    "underworld.recordedMovements": "已記錄行動",
    "underworld.civicHub": "燈區市民樞紐",
    "underworld.steward": "在地見證者",
    "underworld.ordinaryLife": "日常生活",
    "underworld.exteriorClassification": "外部分類",
    "underworld.observer": "觀察者制度",
    "underworld.hubChanged": "樞紐已繼承此次下降",
    "underworld.hubHeld": "舊地圖仍在治理",
    "underworld.layeredMap": "七層區域地圖",
    "underworld.layeredMapHint": "選擇一層以聚焦目前或下一項行動",
    "underworld.available": "可用",
    "underworld.recorded": "已記錄",
    "underworld.locked": "鎖定",
    "underworld.expedition": "遠征帳本",
    "underworld.depthVector": "深度向量",
    "underworld.objective": "目標",
    "underworld.route": "授權路線",
    "underworld.authority": "權限",
    "underworld.claim": "待證明主張",
    "underworld.signatureBudget": "訊號預算",
    "underworld.inheritance": "可能繼承",
    "underworld.enterExpedition": "進入遠征",
    "underworld.cast": "區域角色",
    "underworld.wakeSources": "外洩來源",
    "underworld.inheritedConsequences": "已繼承後果",
    "underworld.inherited": "已繼承",
    "underworld.pending": "待處理",
    "presentations.hall.label": "契約堂",
    "presentations.hall.blurb": "有人的契約堂 — 與管事會面，親自承接契約",
    "presentations.hall.controlsHint": "與管事對話以承接契約",
    "presentations.hall.purpose": "卡匣的創立之堂，有人居住：與管事會面、親自承接契約，並看著世界改變 — 與其他所有介面相同的契約與帳本。",
    "hall.you": "你",
    "hall.steward": "管事",
    "hall.offering": "有一份契約給你",
    "hall.fulfilled": "契約已履行",
    "hall.talk": "對話",
    "hall.viewOnBoard": "在契約板上查看",
    "hall.accept": "承接並結算",
    "hall.leave": "離開",
    "hall.recordedNote": "此契約已記錄於世界中。",
    "hall.worldChanged": "憲章已然開始 — 世界記得。",
    "hall.lastRecorded": (params) => `最近記錄：${str(params, "name")} · 帳本中共 ${num(params, "count")} 筆。`,
    "hall.claimFirst": "領取獎勵後才能承接下一份契約。",
    "hall.threshold": "遭遇入口",
    "hall.approach": "靠近",
    "hall.enterEncounter": "進入遭遇",
    "hall.enterNamed": (params) => `進入 ${str(params, "name")}`,
    "hall.notYet": "尚未",
    "hall.squadDetails": "隊伍細節",
    "worldMap.difficulty": "難度",
    "worldMap.enterEncounter": "進入遭遇",
    "worldMap.talkToSteward": "與管事對話",
    "shell.seeOnMap": "在地圖上查看",
    "shell.takeInPerson": "親自承接",
    "shell.stewardNote": "管事的備註",
    "worldMap.stateLocked": "鎖定",
    "worldMap.stateAvailable": "可用",
    "worldMap.stateActive": "進行中",
    "worldMap.stateRecorded": "已記錄",
    "worldMap.contractMap": "契約地圖",
    "worldMap.recordedOf": (params) => `已記錄 ${num(params, "recorded")}/${num(params, "total")}`,
    "worldMap.regionLocked": "鎖定",
    "worldMap.regionOpen": "開放",
    "worldMap.regionComplete": "完成",
    "worldMap.nextContract": "接下來",
    "worldMap.steep": "險峻",
    "worldMap.steepContract": "險峻契約 — 作者設定的高難度",
    "worldMap.legendTitle": "地圖圖例",
    "worldMap.legendNext": "管事持有的契約",
    "worldMap.legendAvailable": "開放 — 立即進入",
    "worldMap.legendActive": "你選取的地點",
    "worldMap.legendSteep": "作者設定的高難度",
    "worldMap.legendRecorded": "結果已寫入帳本",
    "worldMap.legendLocked": "請先完成較早的契約",
    "presentations.globe.label": "世界",
    "presentations.globe.blurb": "進入卡匣所構成的空間世界",
    "presentations.globe.controlsHint": "使用 WASD、方向鍵或觸控板行走 · 拖曳轉向 · 空白鍵跳躍 · 靠近 ◆ 契約",
    "presentations.globe.purpose": "卡匣成為空間世界：其中的地點、契約與後果仍共享同一份世界狀態。",
    "presentations.globe.fallbackTitle": "空間星圖",
    "presentations.globe.fallbackBody": "此瀏覽器無法使用 3D 加速。相同的卡匣地點與已攜帶的執行狀態仍可在本機軌道檢視中使用。",
    "world.movementControls": "世界移動控制",
    "world.walkForward": "向前行走",
    "world.walkBackward": "向後行走",
    "world.strafeLeft": "向左移動",
    "world.strafeRight": "向右移動",
    "world.jump": "跳躍",
    "world.walkToInteract": "走近契約標記以進行互動",
    "world.interactionUnlocked": "互動已解鎖",
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
    "decision.groupChange": (params) => `${str(params, "type")}：${num(params, "count")} 人 · ${str(params, "delta")}`,
    "decision.exactChanges": (params) => `精確變化（${num(params, "count")}）`,
    "decision.continue": "繼續",

    "godscar.metadataRefused": "GODSCAR POCKET 中繼資料已拒絕",
    "godscar.invalidHeading": "此卡匣聲稱使用的 Godscar 文法無法通過驗證。",
    "godscar.invalidBody": "遊玩規則仍以已驗證的 Arc 為準。Rodoh 不會從格式錯誤的中繼資料虛構正典、來源或壓力。",
    "godscar.pocketEyebrow": (params) => `GODSCAR POCKET · ${str(params, "relation")}`,
    "godscar.canonRelation.foundational": "基礎正典",
    "godscar.canonRelation.compatible": "相容支線",
    "godscar.canonRelation.contested": "爭議支線",
    "godscar.canonRelation.alternateSequence": "替代序列",
    "godscar.canonRelation.crossover": "跨界",
    "godscar.canonRelation.privateBranch": "私人分支",
    "godscar.canonTier.settledCanon": "確立正典",
    "godscar.canonTier.contestedCanon": "爭議正典",
    "godscar.canonTier.factionDoctrine": "派系教義",
    "godscar.canonTier.storyFacingUnknown": "故事面未知",
    "godscar.pressure.pocket": "口袋域",
    "godscar.pressure.patron": "庇護者／控制系統",
    "godscar.pressure.excludedActor": "被排除行動者",
    "godscar.pressure.approachingTrigger": "逼近中的觸發點",
    "godscar.pressure.costOfResistance": "抵抗代價",
    "godscar.pressure.scaleRevelation": "尺度揭示",
    "godscar.evidenceLedger": (params) => `證據帳本 · ${num(params, "count")} 筆來源收據`,
    "godscar.claim": "主張",
    "godscar.venue": "驗證場所",
    "godscar.legitimacyAtStake": "受影響的正當性",
    "godscar.ifAccepted": "若被接受",
    "godscar.costOfAcceptance": "接受代價",
    "godscar.ifFalse": "若為假",
    "godscar.intervention": "介入：",
    "godscar.limits": "限制：",
    "godscar.factionReceipts": (params) => `派系收據 · ${num(params, "count")}`,
    "godscar.prevents": "防止：",
    "godscar.failsBy": "失敗方式：",
    "godscar.persistentConsequences": (params) => `持續後果 · ${num(params, "count")}`,
    "godscar.inheritedBy": (params) => `由 ${str(params, "name")} 繼承`,
    "godscar.moreInSource": (params) => `卡匣來源中仍有 ${num(params, "count")} 項。`,

    "cartridgePanel.eyebrow": "卡匣",
    "cartridgePanel.domain": "領域",
    "cartridgePanel.engine": "引擎",
    "cartridgePanel.cycle": "週期",
    "cartridgePanel.recordedNodes": "已記錄節點",
    "cartridgePanel.decisionMark": "決策標記",
    "cartridgePanel.body": "Rodoh 持續維護此循環。此卡匣現在帶有引擎標記 — 決策、已記錄節點、週期數與名冊狀態 — 在切換呈現方式後依然保留。",
    "cartridgePanel.exportRun": "匯出執行",
    "cartridgePanel.resume": "繼續",
    "cartridgePanel.leave": "離開卡匣",
    "cartridgePanel.trust": "信任等級",
    "cartridgePanel.ledgerProvenance": "每筆結果皆記錄於上方的作者身分之下。此帳本可對照程式核對。",

    "boot.openCartridge": "開啟卡匣…",
    "boot.remove": "移除",
    "boot.importedNamed": (params) => `已匯入「${str(params, "name")}」。`,
    "boot.runRestoredNamed": (params) => `已還原精確執行紀錄：${str(params, "name")}。`,
    "boot.importFailedHeading": "匯入失敗：",
    "boot.preflightNew": "全新 — 此貯放槽尚未有此卡匣。",
    "boot.preflightUpdate": "修訂版 — 安裝在既有版本旁，不會取代持有者的內容。",
    "boot.preflightDuplicate": "重複 — 此貯放槽中已有內容完全相同的卡匣。",
    "boot.preflightSameIdBundled": "有一張內建卡匣使用相同識別碼，該內建項目維持不變。",
    "boot.trustBundled": "內建",
    "boot.trustImportedUnsigned": "已匯入（未簽署）",
    "boot.trustVerified": "已驗證",
    "boot.trustQuarantined": "已隔離",
    "boot.programOfRecord": "正式記錄程式",
    "boot.identity": "作者識別碼",
    "boot.freshProgram": "全新程式 — 尚無執行記錄",
    "boot.contractsRecorded": (params) => `已記錄 ${num(params, "count")} 份契約`,
    "boot.resumable": "可繼續",
    "boot.legacyRunUnavailable": "舊版 1.0 執行證據已保留 — 重播設定檔目前無法使用",
    "boot.enter": "進入",
    "boot.resume": "繼續",
    "boot.runtimeEyebrow": "AXM-WORLD 執行環境外殼",
    "boot.heroTitle": "會記憶的卡匣世界。",
    "boot.heroBody": "拿起一張卡匣。維持循環。記下發生的事。繼續前進。",
    "boot.footerNote": "Rodoh 記錄執行。AXM-WORLD 呈現外殼。卡匣仍歸你所有。",
    "boot.holdTheLoop": "維持循環。",
    "boot.loadingNamed": (params) => `載入 ${str(params, "name")} 中`,
    "boot.skipEntry": "略過進場",
    "boot.freshEntry": "全新 — 尚無執行記錄",
    "boot.cartridgeMeta": (params) => `${str(params, "domain")} · 引擎 ${str(params, "engine")} · ${num(params, "count")} 份契約`,
  },
};

export function formatMessage(locale: Locale, id: MessageId, params?: MessageParams): string {
  const value = MESSAGES[locale]?.[id] ?? MESSAGES.en[id];
  if (value === undefined) return id;
  if (typeof value === "function") return value(params ?? {});
  return value;
}
