from __future__ import annotations

from pathlib import Path

ROOT = Path.cwd()


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    source = target.read_text()
    if new in source:
        return
    if old not in source:
        raise SystemExit(f"Expected localization target not found in {path}: {old[:100]!r}")
    target.write_text(source.replace(old, new, 1))


scene = "src/world/common-ship/CommonShipScene.tsx"

replace_once(
    scene,
    'import { PixelButton } from "../pixel-ui/index.js";\n',
    'import { PixelButton } from "../pixel-ui/index.js";\nimport { t, type MessageId } from "../i18n/index.js";\n',
)

replace_once(
    scene,
    '''const STATE_LABEL: Record<string, string> = {
  "habitat-integrity": "Habitat Integrity",
  "temporal-coherence": "Temporal Coherence",
  "translation-trust": "Translation Trust",
  "roster-resilience": "Roster Resilience",
  "stores-and-care": "Stores and Care",
  continuity: "Continuity",
  visibility: "Visibility",
  "compatibility-debt": "Compatibility Debt",
};

function rangeText(range: { min: number; max: number } | null, unit: string): string {
  return range ? `${range.min}–${range.max}${unit}` : "variable";
}
''',
    '''const STATE_LABEL: Record<string, MessageId> = {
  "habitat-integrity": "commonShip.state.habitatIntegrity",
  "temporal-coherence": "commonShip.state.temporalCoherence",
  "translation-trust": "commonShip.state.translationTrust",
  "roster-resilience": "commonShip.state.rosterResilience",
  "stores-and-care": "commonShip.state.storesAndCare",
  continuity: "commonShip.state.continuity",
  visibility: "commonShip.state.visibility",
  "compatibility-debt": "commonShip.state.compatibilityDebt",
};

const SYSTEM_LABEL: Record<string, MessageId> = {
  "transit-body": "commonShip.system.transitBody",
  "habitat-bands": "commonShip.system.habitatBands",
  "common-thresholds": "commonShip.system.commonThresholds",
  "translation-mesh": "commonShip.system.translationMesh",
  "watch-lattice": "commonShip.system.watchLattice",
  "continuity-commons": "commonShip.system.continuityCommons",
  "sovereign-core": "commonShip.system.sovereignCore",
};

const ALLOCATION_LABEL: Record<string, MessageId> = {
  habitatBands: "commonShip.allocation.habitatBands",
  translationPaths: "commonShip.allocation.translationPaths",
  directInterfaces: "commonShip.allocation.directInterfaces",
  standby: "commonShip.allocation.standby",
  stores: "commonShip.allocation.stores",
  emergencyAuthority: "commonShip.allocation.emergencyAuthority",
};

const HANDOFF_LABEL: Record<string, MessageId> = {
  dissent: "commonShip.handoff.dissent",
  injury: "commonShip.handoff.injury",
  readinessDebt: "commonShip.handoff.readinessDebt",
  promises: "commonShip.handoff.promises",
  missingPersons: "commonShip.handoff.missingPersons",
  uncertainty: "commonShip.handoff.uncertainty",
};

const PROJECTION_LABEL: Record<string, MessageId> = {
  success: "outcome.cleared",
  partial: "outcome.partial",
  failure: "outcome.failed",
  none: "encounterShell.projNone",
};

const CONNECTION_STATUS_LABEL: Record<string, MessageId> = {
  outbound: "commonShip.connection.outbound",
  returned: "commonShip.connection.returned",
};

function translatedLabel(labels: Record<string, MessageId>, key: string): string {
  const id = labels[key];
  return id ? t(id) : key;
}

function rangeText(range: { min: number; max: number } | null, unit: string): string {
  return range ? `${range.min}–${range.max}${unit}` : t("commonShip.variable");
}
''',
)

replace_once(scene, '<span>{member?.roleId ?? "unassigned"}</span>', '<span>{member?.roleId ?? t("commonShip.unassigned")}</span>')
replace_once(
    scene,
    '''          <div><dt>Passage</dt><dd>{profile.scale.minimumPassageMeters}m</dd></div>
          <div><dt>Gravity</dt><dd>{rangeText(profile.environment.gravityG, "g")}</dd></div>
          <div><dt>Life</dt><dd>{profile.temporal.expectedLifespan}</dd></div>
''',
    '''          <div><dt>{t("commonShip.profile.passage")}</dt><dd>{profile.scale.minimumPassageMeters}m</dd></div>
          <div><dt>{t("commonShip.profile.gravity")}</dt><dd>{rangeText(profile.environment.gravityG, "g")}</dd></div>
          <div><dt>{t("commonShip.profile.life")}</dt><dd>{profile.temporal.expectedLifespan}</dd></div>
''',
)

replace_once(scene, '<small>Decision horizon</small>', '<small>{t("commonShip.decisionHorizon")}</small>')
replace_once(
    scene,
    '''          <div><dt>Closes when</dt><dd>{watch.horizon.closesWhen}</dd></div>
          <div><dt>Physical</dt><dd>{watch.horizon.physicalUrgency}</dd></div>
          <div><dt>Informational</dt><dd>{watch.horizon.informationalUrgency}</dd></div>
          <div><dt>Institutional</dt><dd>{watch.horizon.institutionalUrgency}</dd></div>
          <div><dt>Manufactured</dt><dd>{watch.horizon.manufacturedUrgency}</dd></div>
''',
    '''          <div><dt>{t("commonShip.closesWhen")}</dt><dd>{watch.horizon.closesWhen}</dd></div>
          <div><dt>{t("commonShip.physical")}</dt><dd>{watch.horizon.physicalUrgency}</dd></div>
          <div><dt>{t("commonShip.informational")}</dt><dd>{watch.horizon.informationalUrgency}</dd></div>
          <div><dt>{t("commonShip.institutional")}</dt><dd>{watch.horizon.institutionalUrgency}</dd></div>
          <div><dt>{t("commonShip.manufactured")}</dt><dd>{watch.horizon.manufacturedUrgency}</dd></div>
''',
)
replace_once(scene, '<small>Composition receipt</small>', '<small>{t("commonShip.compositionReceipt")}</small>')
replace_once(
    scene,
    '''          <div><dt>Absent actor</dt><dd>{watch.composition.absentActor}</dd></div>
          <div><dt>Excluded body</dt><dd>{watch.composition.excludedBody}</dd></div>
          <div><dt>Dependency</dt><dd>{watch.composition.dependency}</dd></div>
''',
    '''          <div><dt>{t("commonShip.absentActor")}</dt><dd>{watch.composition.absentActor}</dd></div>
          <div><dt>{t("commonShip.excludedBody")}</dt><dd>{watch.composition.excludedBody}</dd></div>
          <div><dt>{t("commonShip.dependency")}</dt><dd>{watch.composition.dependency}</dd></div>
''',
)
replace_once(scene, '<small>Common systems allocation</small>', '<small>{t("commonShip.allocation.heading")}</small>')
replace_once(
    scene,
    '{Object.entries(watch.allocation).map(([key, value]) => <div key={key}><dt>{key.replaceAll("-", " ")}</dt><dd>{value}</dd></div>)}',
    '{Object.entries(watch.allocation).map(([key, value]) => <div key={key}><dt>{translatedLabel(ALLOCATION_LABEL, key)}</dt><dd>{value}</dd></div>)}',
)
replace_once(scene, '<small>Handoff</small>', '<small>{t("commonShip.handoff.heading")}</small>')
replace_once(
    scene,
    '{Object.entries(watch.handoff).map(([key, value]) => <div key={key}><dt>{key.replaceAll("-", " ")}</dt><dd>{value}</dd></div>)}',
    '{Object.entries(watch.handoff).map(([key, value]) => <div key={key}><dt>{translatedLabel(HANDOFF_LABEL, key)}</dt><dd>{value}</dd></div>)}',
)
replace_once(scene, '<small>Precedent</small>', '<small>{t("commonShip.precedent.heading")}</small>')
replace_once(
    scene,
    '''          <div><dt>Newly possible</dt><dd>{watch.precedent.newlyPossible}</dd></div>
          <div><dt>Newly impossible</dt><dd>{watch.precedent.newlyImpossible}</dd></div>
          <div><dt>Newly governable</dt><dd>{watch.precedent.newlyGovernable}</dd></div>
          <div><dt>Inherited</dt><dd>{watch.precedent.inheritedAsInfrastructure}</dd></div>
''',
    '''          <div><dt>{t("commonShip.precedent.newlyPossible")}</dt><dd>{watch.precedent.newlyPossible}</dd></div>
          <div><dt>{t("commonShip.precedent.newlyImpossible")}</dt><dd>{watch.precedent.newlyImpossible}</dd></div>
          <div><dt>{t("commonShip.precedent.newlyGovernable")}</dt><dd>{watch.precedent.newlyGovernable}</dd></div>
          <div><dt>{t("commonShip.precedent.inherited")}</dt><dd>{watch.precedent.inheritedAsInfrastructure}</dd></div>
''',
)

replace_once(scene, '>This cartridge does not carry a Common Ship source plane.</section>', '>{t("commonShip.noSource")}</section>')
replace_once(scene, '<h2>Common Ship source refused</h2>', '<h2>{t("commonShip.sourceRefused")}</h2>')
replace_once(
    scene,
    '<small>{isReliefCircuitProgram ? "PROGRAM 005 · COMMON SHIP" : "COMMON SHIP · HOLDER-OWNED CARTRIDGE"}</small>',
    '<small>{t(isReliefCircuitProgram ? "commonShip.program.firstParty" : "commonShip.program.holderOwned")}</small>',
)
replace_once(scene, 'aria-label="campaign progress"', 'aria-label={t("commonShip.progressAria")}')
replace_once(scene, '<span>operations recorded</span>', '<span>{t("commonShip.operationsRecorded")}</span>')
replace_once(scene, '<small>{STATE_LABEL[track.source.kind] ?? track.source.kind}</small>', '<small>{translatedLabel(STATE_LABEL, track.source.kind)}</small>')
replace_once(scene, 'aria-label="Common Ship operations"', 'aria-label={t("commonShip.operationsAria")}')
replace_once(scene, '<small>Watch sequence</small>', '<small>{t("commonShip.watchSequence")}</small>')
replace_once(scene, '<small>{watch.source.system.replaceAll("-", " ")}</small>', '<small>{translatedLabel(SYSTEM_LABEL, watch.source.system)}</small>')
replace_once(
    scene,
    '''            <header><div><small>Arc-owned Common Watch verdict</small><h2>{composition?.feasible ? "Viable watch" : "Watch refused"}</h2></div><span>{interaction.party.length}/{selectedWatch.maxAgents} selected</span></header>
''',
    '''            <header><div><small>{t("commonShip.verdict.heading")}</small><h2>{t(composition?.feasible ? "commonShip.verdict.viable" : "commonShip.verdict.refused")}</h2></div><span>{t("commonShip.selectedCount", { n: interaction.party.length, max: selectedWatch.maxAgents })}</span></header>
''',
)
replace_once(scene, '<p><b>Dependencies:</b> {composition.dependencies.join(", ")}</p>', '<p><b>{t("commonShip.dependencies")}</b> {composition.dependencies.join(", ")}</p>')
replace_once(scene, '<p><b>Single points:</b> {composition.singlePointsOfFailure.join(", ")}</p>', '<p><b>{t("commonShip.singlePoints")}</b> {composition.singlePointsOfFailure.join(", ")}</p>')
replace_once(
    scene,
    '<span><small>Engine projection</small><strong>{interaction.readiness?.projectedOutcome ?? "none"}</strong></span>',
    '<span><small>{t("commonShip.engineProjection")}</small><strong>{translatedLabel(PROJECTION_LABEL, interaction.readiness?.projectedOutcome ?? "none")}</strong></span>',
)
replace_once(scene, '<span><small>Current cycle</small><strong data-testid="common-ship-cycle">{world.cycle}</strong></span>', '<span><small>{t("commonShip.currentCycle")}</small><strong data-testid="common-ship-cycle">{world.cycle}</strong></span>')
replace_once(scene, '<p>{interaction.readiness?.reasons[0] ?? "The selected watch clears the current reliability projection."}</p>', '<p>{interaction.readiness?.reasons[0] ?? t("commonShip.readinessClear")}</p>')
replace_once(scene, '                  Run one preparation cycle\n', '                  {t("commonShip.prepareCycle")}\n')
replace_once(scene, '                    Commit this watch\n', '                    {t("commonShip.commitWatch")}\n')
replace_once(scene, 'aria-label="embodiment profiles"', 'aria-label={t("commonShip.profilesAria")}')
replace_once(scene, '<header><small>Vessel anatomy</small><h2>One polity across incompatible environments</h2></header>', '<header><small>{t("commonShip.vesselAnatomy")}</small><h2>{t("commonShip.onePolity")}</h2></header>')
replace_once(scene, 'aria-label="Scrollable Relief Circuit vessel cross-section"', 'aria-label={t("commonShip.crossSectionAria")}')
replace_once(scene, 'alt="Relief Circuit cross-section with seven operating systems and route to the Lamp District"', 'alt={t("commonShip.crossSectionAlt")}')
replace_once(scene, '<summary>Operational symbol atlas · six watch tests · seven systems · eight state tracks</summary>', '<summary>{t("commonShip.atlasSummary")}</summary>')
replace_once(scene, 'aria-label="Scrollable Relief Circuit operational symbol atlas"', 'aria-label={t("commonShip.atlasAria")}')
replace_once(scene, 'alt="Operational symbols for Common Watch tests, vessel systems, and ship-state tracks"', 'alt={t("commonShip.atlasAlt")}')
replace_once(scene, '<header><small>Creator-authored vessel anatomy</small><h2>{view.source.identity.title}</h2></header>', '<header><small>{t("commonShip.creatorAnatomy")}</small><h2>{view.source.identity.title}</h2></header>')
replace_once(scene, '<small>{system.kind.replaceAll("-", " ")}</small>', '<small>{translatedLabel(SYSTEM_LABEL, system.kind)}</small>')
replace_once(scene, '<dl><div><dt>Current use</dt><dd>{system.currentUse}</dd></div><div><dt>Revision authority</dt><dd>{system.revisionAuthority}</dd></div></dl>', '<dl><div><dt>{t("commonShip.currentUse")}</dt><dd>{system.currentUse}</dd></div><div><dt>{t("commonShip.revisionAuthority")}</dt><dd>{system.revisionAuthority}</dd></div></dl>')
replace_once(scene, '<header><div><small>axm-connected-operation/v1</small><h2>{connection.transfer.title}</h2></div><strong>{connection.status}</strong></header>', '<header><div><small>{connection.format}</small><h2>{connection.transfer.title}</h2></div><strong>{translatedLabel(CONNECTION_STATUS_LABEL, connection.status)}</strong></header>')
replace_once(
    scene,
    '''                <div><dt>Selected watch</dt><dd>{connection.transfer.selectedWatchId}</dd></div>
                <div><dt>Dependency</dt><dd>{connection.transfer.dependency}</dd></div>
                <div><dt>People</dt><dd>{connection.transfer.people.join(", ")}</dd></div>
                <div><dt>Stores</dt><dd>{connection.transfer.stores.join(", ")}</dd></div>
                <div><dt>Exposure</dt><dd>{connection.transfer.exposureConsequences.join(", ")}</dd></div>
''',
    '''                <div><dt>{t("commonShip.connection.selectedWatch")}</dt><dd>{connection.transfer.selectedWatchId}</dd></div>
                <div><dt>{t("commonShip.dependency")}</dt><dd>{connection.transfer.dependency}</dd></div>
                <div><dt>{t("commonShip.connection.people")}</dt><dd>{connection.transfer.people.join(", ")}</dd></div>
                <div><dt>{t("commonShip.connection.stores")}</dt><dd>{connection.transfer.stores.join(", ")}</dd></div>
                <div><dt>{t("commonShip.connection.exposure")}</dt><dd>{connection.transfer.exposureConsequences.join(", ")}</dd></div>
''',
)

message_ids = '''  | "commonShip.variable"
  | "commonShip.unassigned"
  | "commonShip.profile.passage"
  | "commonShip.profile.gravity"
  | "commonShip.profile.life"
  | "commonShip.decisionHorizon"
  | "commonShip.closesWhen"
  | "commonShip.physical"
  | "commonShip.informational"
  | "commonShip.institutional"
  | "commonShip.manufactured"
  | "commonShip.compositionReceipt"
  | "commonShip.absentActor"
  | "commonShip.excludedBody"
  | "commonShip.dependency"
  | "commonShip.allocation.heading"
  | "commonShip.allocation.habitatBands"
  | "commonShip.allocation.translationPaths"
  | "commonShip.allocation.directInterfaces"
  | "commonShip.allocation.standby"
  | "commonShip.allocation.stores"
  | "commonShip.allocation.emergencyAuthority"
  | "commonShip.handoff.heading"
  | "commonShip.handoff.dissent"
  | "commonShip.handoff.injury"
  | "commonShip.handoff.readinessDebt"
  | "commonShip.handoff.promises"
  | "commonShip.handoff.missingPersons"
  | "commonShip.handoff.uncertainty"
  | "commonShip.precedent.heading"
  | "commonShip.precedent.newlyPossible"
  | "commonShip.precedent.newlyImpossible"
  | "commonShip.precedent.newlyGovernable"
  | "commonShip.precedent.inherited"
  | "commonShip.noSource"
  | "commonShip.sourceRefused"
  | "commonShip.program.firstParty"
  | "commonShip.program.holderOwned"
  | "commonShip.progressAria"
  | "commonShip.operationsRecorded"
  | "commonShip.state.habitatIntegrity"
  | "commonShip.state.temporalCoherence"
  | "commonShip.state.translationTrust"
  | "commonShip.state.rosterResilience"
  | "commonShip.state.storesAndCare"
  | "commonShip.state.continuity"
  | "commonShip.state.visibility"
  | "commonShip.state.compatibilityDebt"
  | "commonShip.operationsAria"
  | "commonShip.watchSequence"
  | "commonShip.system.transitBody"
  | "commonShip.system.habitatBands"
  | "commonShip.system.commonThresholds"
  | "commonShip.system.translationMesh"
  | "commonShip.system.watchLattice"
  | "commonShip.system.continuityCommons"
  | "commonShip.system.sovereignCore"
  | "commonShip.verdict.heading"
  | "commonShip.verdict.viable"
  | "commonShip.verdict.refused"
  | "commonShip.selectedCount"
  | "commonShip.dependencies"
  | "commonShip.singlePoints"
  | "commonShip.engineProjection"
  | "commonShip.currentCycle"
  | "commonShip.readinessClear"
  | "commonShip.prepareCycle"
  | "commonShip.commitWatch"
  | "commonShip.profilesAria"
  | "commonShip.vesselAnatomy"
  | "commonShip.onePolity"
  | "commonShip.crossSectionAria"
  | "commonShip.crossSectionAlt"
  | "commonShip.atlasSummary"
  | "commonShip.atlasAria"
  | "commonShip.atlasAlt"
  | "commonShip.creatorAnatomy"
  | "commonShip.currentUse"
  | "commonShip.revisionAuthority"
  | "commonShip.connection.selectedWatch"
  | "commonShip.connection.people"
  | "commonShip.connection.stores"
  | "commonShip.connection.exposure"
  | "commonShip.connection.outbound"
  | "commonShip.connection.returned"
'''
replace_once(
    "src/world/i18n/messages.ts",
    '  | "presentations.commonShip.purpose"\n',
    '  | "presentations.commonShip.purpose"\n' + message_ids,
)

english = '''    "commonShip.variable": "variable",
    "commonShip.unassigned": "unassigned",
    "commonShip.profile.passage": "Passage",
    "commonShip.profile.gravity": "Gravity",
    "commonShip.profile.life": "Life",
    "commonShip.decisionHorizon": "Decision horizon",
    "commonShip.closesWhen": "Closes when",
    "commonShip.physical": "Physical",
    "commonShip.informational": "Informational",
    "commonShip.institutional": "Institutional",
    "commonShip.manufactured": "Manufactured",
    "commonShip.compositionReceipt": "Composition receipt",
    "commonShip.absentActor": "Absent actor",
    "commonShip.excludedBody": "Excluded body",
    "commonShip.dependency": "Dependency",
    "commonShip.allocation.heading": "Common systems allocation",
    "commonShip.allocation.habitatBands": "Habitat bands",
    "commonShip.allocation.translationPaths": "Translation paths",
    "commonShip.allocation.directInterfaces": "Direct interfaces",
    "commonShip.allocation.standby": "Standby",
    "commonShip.allocation.stores": "Stores",
    "commonShip.allocation.emergencyAuthority": "Emergency authority",
    "commonShip.handoff.heading": "Handoff",
    "commonShip.handoff.dissent": "Dissent",
    "commonShip.handoff.injury": "Injury",
    "commonShip.handoff.readinessDebt": "Readiness debt",
    "commonShip.handoff.promises": "Promises",
    "commonShip.handoff.missingPersons": "Missing persons",
    "commonShip.handoff.uncertainty": "Uncertainty",
    "commonShip.precedent.heading": "Precedent",
    "commonShip.precedent.newlyPossible": "Newly possible",
    "commonShip.precedent.newlyImpossible": "Newly impossible",
    "commonShip.precedent.newlyGovernable": "Newly governable",
    "commonShip.precedent.inherited": "Inherited",
    "commonShip.noSource": "This cartridge does not carry a Common Ship source plane.",
    "commonShip.sourceRefused": "Common Ship source refused",
    "commonShip.program.firstParty": "PROGRAM 005 · COMMON SHIP",
    "commonShip.program.holderOwned": "COMMON SHIP · HOLDER-OWNED CARTRIDGE",
    "commonShip.progressAria": "Campaign progress",
    "commonShip.operationsRecorded": "operations recorded",
    "commonShip.state.habitatIntegrity": "Habitat Integrity",
    "commonShip.state.temporalCoherence": "Temporal Coherence",
    "commonShip.state.translationTrust": "Translation Trust",
    "commonShip.state.rosterResilience": "Roster Resilience",
    "commonShip.state.storesAndCare": "Stores and Care",
    "commonShip.state.continuity": "Continuity",
    "commonShip.state.visibility": "Visibility",
    "commonShip.state.compatibilityDebt": "Compatibility Debt",
    "commonShip.operationsAria": "Common Ship operations",
    "commonShip.watchSequence": "Watch sequence",
    "commonShip.system.transitBody": "transit body",
    "commonShip.system.habitatBands": "habitat bands",
    "commonShip.system.commonThresholds": "common thresholds",
    "commonShip.system.translationMesh": "translation mesh",
    "commonShip.system.watchLattice": "watch lattice",
    "commonShip.system.continuityCommons": "continuity commons",
    "commonShip.system.sovereignCore": "sovereign core",
    "commonShip.verdict.heading": "Arc-owned Common Watch verdict",
    "commonShip.verdict.viable": "Viable watch",
    "commonShip.verdict.refused": "Watch refused",
    "commonShip.selectedCount": (params) => `${num(params, "n")}/${num(params, "max")} selected`,
    "commonShip.dependencies": "Dependencies:",
    "commonShip.singlePoints": "Single points:",
    "commonShip.engineProjection": "Engine projection",
    "commonShip.currentCycle": "Current cycle",
    "commonShip.readinessClear": "The selected watch clears the current reliability projection.",
    "commonShip.prepareCycle": "Run one preparation cycle",
    "commonShip.commitWatch": "Commit this watch",
    "commonShip.profilesAria": "Embodiment profiles",
    "commonShip.vesselAnatomy": "Vessel anatomy",
    "commonShip.onePolity": "One polity across incompatible environments",
    "commonShip.crossSectionAria": "Scrollable Relief Circuit vessel cross-section",
    "commonShip.crossSectionAlt": "Relief Circuit cross-section with seven operating systems and route to the Lamp District",
    "commonShip.atlasSummary": "Operational symbol atlas · six watch tests · seven systems · eight state tracks",
    "commonShip.atlasAria": "Scrollable Relief Circuit operational symbol atlas",
    "commonShip.atlasAlt": "Operational symbols for Common Watch tests, vessel systems, and ship-state tracks",
    "commonShip.creatorAnatomy": "Creator-authored vessel anatomy",
    "commonShip.currentUse": "Current use",
    "commonShip.revisionAuthority": "Revision authority",
    "commonShip.connection.selectedWatch": "Selected watch",
    "commonShip.connection.people": "People",
    "commonShip.connection.stores": "Stores",
    "commonShip.connection.exposure": "Exposure",
    "commonShip.connection.outbound": "outbound",
    "commonShip.connection.returned": "returned",
'''
replace_once(
    "src/world/i18n/messages.ts",
    '    "presentations.commonShip.purpose": "Manage the vessel as a shared polity rather than a human-normal vehicle.",\n',
    '    "presentations.commonShip.purpose": "Manage the vessel as a shared polity rather than a human-normal vehicle.",\n' + english,
)

traditional_chinese = '''    "commonShip.variable": "可變",
    "commonShip.unassigned": "未指派",
    "commonShip.profile.passage": "通行寬度",
    "commonShip.profile.gravity": "重力",
    "commonShip.profile.life": "預期壽命",
    "commonShip.decisionHorizon": "決策時限",
    "commonShip.closesWhen": "截止條件",
    "commonShip.physical": "物理急迫性",
    "commonShip.informational": "資訊急迫性",
    "commonShip.institutional": "制度急迫性",
    "commonShip.manufactured": "人為急迫性",
    "commonShip.compositionReceipt": "編組收據",
    "commonShip.absentActor": "缺席行動者",
    "commonShip.excludedBody": "被排除身體",
    "commonShip.dependency": "依賴",
    "commonShip.allocation.heading": "共同系統配置",
    "commonShip.allocation.habitatBands": "棲地帶",
    "commonShip.allocation.translationPaths": "翻譯路徑",
    "commonShip.allocation.directInterfaces": "直接介面",
    "commonShip.allocation.standby": "待命",
    "commonShip.allocation.stores": "儲備",
    "commonShip.allocation.emergencyAuthority": "緊急權限",
    "commonShip.handoff.heading": "交班",
    "commonShip.handoff.dissent": "異議",
    "commonShip.handoff.injury": "傷害",
    "commonShip.handoff.readinessDebt": "戰備債務",
    "commonShip.handoff.promises": "承諾",
    "commonShip.handoff.missingPersons": "失聯人員",
    "commonShip.handoff.uncertainty": "不確定性",
    "commonShip.precedent.heading": "先例",
    "commonShip.precedent.newlyPossible": "新增可能",
    "commonShip.precedent.newlyImpossible": "新增不可能",
    "commonShip.precedent.newlyGovernable": "新增可治理事項",
    "commonShip.precedent.inherited": "已繼承",
    "commonShip.noSource": "此卡匣不含共同船艦來源平面。",
    "commonShip.sourceRefused": "共同船艦來源已拒絕",
    "commonShip.program.firstParty": "計畫 005 · 共同船艦",
    "commonShip.program.holderOwned": "共同船艦 · 持有人所有卡匣",
    "commonShip.progressAria": "戰役進度",
    "commonShip.operationsRecorded": "項行動已記錄",
    "commonShip.state.habitatIntegrity": "棲地完整性",
    "commonShip.state.temporalCoherence": "時間協調性",
    "commonShip.state.translationTrust": "翻譯信任",
    "commonShip.state.rosterResilience": "值班韌性",
    "commonShip.state.storesAndCare": "儲備與照護",
    "commonShip.state.continuity": "延續性",
    "commonShip.state.visibility": "可見度",
    "commonShip.state.compatibilityDebt": "相容性債務",
    "commonShip.operationsAria": "共同船艦行動",
    "commonShip.watchSequence": "值班序列",
    "commonShip.system.transitBody": "轉運船體",
    "commonShip.system.habitatBands": "棲地帶",
    "commonShip.system.commonThresholds": "共同門檻",
    "commonShip.system.translationMesh": "翻譯網",
    "commonShip.system.watchLattice": "值班格網",
    "commonShip.system.continuityCommons": "延續公域",
    "commonShip.system.sovereignCore": "主權核心",
    "commonShip.verdict.heading": "Arc 所有的共同值班判定",
    "commonShip.verdict.viable": "可行值班",
    "commonShip.verdict.refused": "值班已拒絕",
    "commonShip.selectedCount": (params) => `已選 ${num(params, "n")}/${num(params, "max")}`,
    "commonShip.dependencies": "依賴：",
    "commonShip.singlePoints": "單點故障：",
    "commonShip.engineProjection": "引擎推估",
    "commonShip.currentCycle": "目前週期",
    "commonShip.readinessClear": "選定值班符合目前的可靠性推估。",
    "commonShip.prepareCycle": "執行一個準備週期",
    "commonShip.commitWatch": "提交此值班",
    "commonShip.profilesAria": "具身設定檔",
    "commonShip.vesselAnatomy": "船艦結構",
    "commonShip.onePolity": "一個跨越不相容環境的政體",
    "commonShip.crossSectionAria": "可捲動的救援迴路船艦剖面圖",
    "commonShip.crossSectionAlt": "救援迴路剖面圖，顯示七個運作系統與通往燈區的路線",
    "commonShip.atlasSummary": "運作符號圖集 · 六項值班測試 · 七個系統 · 八條狀態軌",
    "commonShip.atlasAria": "可捲動的救援迴路運作符號圖集",
    "commonShip.atlasAlt": "共同值班測試、船艦系統與船艦狀態軌的運作符號",
    "commonShip.creatorAnatomy": "作者定義的船艦結構",
    "commonShip.currentUse": "目前用途",
    "commonShip.revisionAuthority": "修訂權限",
    "commonShip.connection.selectedWatch": "選定值班",
    "commonShip.connection.people": "人員",
    "commonShip.connection.stores": "儲備",
    "commonShip.connection.exposure": "暴露後果",
    "commonShip.connection.outbound": "已出發",
    "commonShip.connection.returned": "已返回",
'''
replace_once(
    "src/world/i18n/messages.ts",
    '    "presentations.commonShip.purpose": "將船艦作為共享政體管理，而非以人類常態為基準的載具。",\n',
    '    "presentations.commonShip.purpose": "將船艦作為共享政體管理，而非以人類常態為基準的載具。",\n' + traditional_chinese,
)

replace_once(
    "tests/world/i18n-coverage.test.ts",
    '  "src/world/aperture/GodscarPocketPanel.tsx",\n',
    '  "src/world/aperture/GodscarPocketPanel.tsx",\n  "src/world/common-ship/CommonShipScene.tsx",\n',
)

print("Localized the complete Common Ship chrome and added the surface to the i18n guard.")
