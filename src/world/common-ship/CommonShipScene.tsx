import type { SceneProps } from "../presentations.js";
import { PixelButton } from "../pixel-ui/index.js";
import { t, type MessageId } from "../i18n/index.js";
import { EXPECTED_BUNDLED_DIGESTS } from "../bundled-digests.js";
import { deriveCommonShipView, inspectCommonShipWorld } from "./common-ship.js";
import { readConnectedReliefOperation } from "./connected-relief.js";
import type {
  CommonShipCastMemberV2,
  CommonShipEmbodimentProfile,
  CommonShipWatchBlueprintV2,
} from "../../common-ship/embodiment.js";
import type { CommonShipProfileView } from "./common-ship.js";
import "./common-ship.css";

const ASSET = {
  environment: new URL("../../assets/relief-circuit/vessel/relief-circuit-environment.svg", import.meta.url).href,
  crossSection: new URL("../../assets/relief-circuit/vessel/relief-circuit-cross-section.svg", import.meta.url).href,
  atlas: new URL("../../assets/relief-circuit/vessel/relief-circuit-symbol-atlas.svg", import.meta.url).href,
  portraits: {
    "ilya-venn": new URL("../../assets/relief-circuit/vessel/ilya-venn-portrait.svg", import.meta.url).href,
    "nima-quell": new URL("../../assets/relief-circuit/vessel/nima-quell-portrait.svg", import.meta.url).href,
    "orun-sable": new URL("../../assets/relief-circuit/vessel/orun-sable-portrait.svg", import.meta.url).href,
    "tessara-one": new URL("../../assets/relief-circuit/vessel/tessara-one-portrait.svg", import.meta.url).href,
    "arden-pell": new URL("../../assets/relief-circuit/vessel/arden-pell-portrait.svg", import.meta.url).href,
    "cinder-continuing": new URL("../../assets/relief-circuit/vessel/cinder-continuing-portrait.svg", import.meta.url).href,
  } as Record<string, string>,
};

const STATE_LABEL: Record<string, MessageId> = {
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

export interface CommonShipProfileCardEntry<T extends { id: string; name: string }> {
  profile: CommonShipEmbodimentProfile;
  member: CommonShipCastMemberV2 | undefined;
  agent: T | undefined;
}

export function expandCommonShipProfileCards<T extends { id: string; name: string }>(
  profiles: readonly CommonShipProfileView[],
  roster: readonly T[],
): CommonShipProfileCardEntry<T>[] {
  return profiles.flatMap((entry) => {
    const members: Array<CommonShipCastMemberV2 | undefined> = entry.cast.length > 0
      ? entry.cast
      : [undefined];
    return members.map((member) => ({
      profile: entry.source,
      member,
      agent: member
        ? roster.find((candidate) => candidate.name === member.name || candidate.id.endsWith(`:${member.id}`) || candidate.id === member.id)
        : undefined,
    }));
  });
}

function ProfileCard({
  profile,
  member,
  agentId,
  portrait,
  selected,
  onToggle,
}: {
  profile: CommonShipEmbodimentProfile;
  member: { id: string; name: string; roleId: string; description: string } | undefined;
  agentId: string | null;
  portrait?: string;
  selected: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`commonship-profile ${selected ? "is-selected" : ""}`}
      data-testid={`common-ship-profile-${member?.id ?? profile.id}`}
      data-agent-id={agentId ?? ""}
      aria-pressed={selected}
      disabled={!agentId}
      onClick={onToggle}
    >
      {portrait ? <img data-testid={`common-ship-portrait-${member?.id ?? profile.id}`} src={portrait} alt="" aria-hidden="true" /> : <span className="commonship-profile__fallback" />}
      <span className="commonship-profile__copy">
        <small>{profile.scale.class} · {profile.environment.medium}</small>
        <strong>{member?.name ?? profile.name}</strong>
        <span>{member?.roleId ?? t("commonShip.unassigned")}</span>
        <p>{profile.description}</p>
        <dl>
          <div><dt>{t("commonShip.profile.passage")}</dt><dd>{profile.scale.minimumPassageMeters}m</dd></div>
          <div><dt>{t("commonShip.profile.gravity")}</dt><dd>{rangeText(profile.environment.gravityG, "g")}</dd></div>
          <div><dt>{t("commonShip.profile.life")}</dt><dd>{profile.temporal.expectedLifespan}</dd></div>
        </dl>
      </span>
    </button>
  );
}

function WatchDetails({ watch }: { watch: CommonShipWatchBlueprintV2 }): JSX.Element {
  return (
    <div className="commonship-details" data-testid="common-ship-watch-details" data-watch-id={watch.id}>
      <section>
        <small>{t("commonShip.decisionHorizon")}</small>
        <h3>{watch.name}</h3>
        <p>{watch.description}</p>
        <dl className="commonship-horizon">
          <div><dt>{t("commonShip.closesWhen")}</dt><dd>{watch.horizon.closesWhen}</dd></div>
          <div><dt>{t("commonShip.physical")}</dt><dd>{watch.horizon.physicalUrgency}</dd></div>
          <div><dt>{t("commonShip.informational")}</dt><dd>{watch.horizon.informationalUrgency}</dd></div>
          <div><dt>{t("commonShip.institutional")}</dt><dd>{watch.horizon.institutionalUrgency}</dd></div>
          <div><dt>{t("commonShip.manufactured")}</dt><dd>{watch.horizon.manufacturedUrgency}</dd></div>
        </dl>
      </section>
      <section>
        <small>{t("commonShip.compositionReceipt")}</small>
        <dl>
          <div><dt>{t("commonShip.absentActor")}</dt><dd>{watch.composition.absentActor}</dd></div>
          <div><dt>{t("commonShip.excludedBody")}</dt><dd>{watch.composition.excludedBody}</dd></div>
          <div><dt>{t("commonShip.dependency")}</dt><dd>{watch.composition.dependency}</dd></div>
        </dl>
      </section>
      <section>
        <small>{t("commonShip.allocation.heading")}</small>
        <dl>
          {Object.entries(watch.allocation).map(([key, value]) => <div key={key}><dt>{translatedLabel(ALLOCATION_LABEL, key)}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>
      <section>
        <small>{t("commonShip.handoff.heading")}</small>
        <dl>
          {Object.entries(watch.handoff).map(([key, value]) => <div key={key}><dt>{translatedLabel(HANDOFF_LABEL, key)}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>
      <section>
        <small>{t("commonShip.precedent.heading")}</small>
        <dl>
          <div><dt>{t("commonShip.precedent.newlyPossible")}</dt><dd>{watch.precedent.newlyPossible}</dd></div>
          <div><dt>{t("commonShip.precedent.newlyImpossible")}</dt><dd>{watch.precedent.newlyImpossible}</dd></div>
          <div><dt>{t("commonShip.precedent.newlyGovernable")}</dt><dd>{watch.precedent.newlyGovernable}</dd></div>
          <div><dt>{t("commonShip.precedent.inherited")}</dt><dd>{watch.precedent.inheritedAsInfrastructure}</dd></div>
        </dl>
      </section>
    </div>
  );
}

export function CommonShipScene({ world, interaction, onEnterEncounter }: SceneProps): JSX.Element {
  const inspection = inspectCommonShipWorld(world.arc);
  if (inspection.status === "none") {
    return <section className="commonship commonship--invalid" role="status">{t("commonShip.noSource")}</section>;
  }
  if (inspection.status === "invalid") {
    return <section className="commonship commonship--invalid" role="alert"><h2>{t("commonShip.sourceRefused")}</h2><ul>{inspection.errors.map((error) => <li key={error}>{error}</li>)}</ul></section>;
  }

  const view = deriveCommonShipView({
    source: inspection.source,
    nodes: world.nodes,
    cartridgeState: world.cartridgeState,
    selectedChallengeId: interaction.selectedId,
  });
  const selectedWatch = view.source.watches.find((watch) => watch.id === interaction.selectedId)
    ?? view.source.watches.find((watch) => watch.id === view.availableChallengeId)
    ?? view.source.watches[0]!;
  const selectedNode = world.nodes.find((node) => node.challengeId === selectedWatch.id) ?? null;
  const composition = interaction.selectedId === selectedWatch.id
    ? interaction.composition
    : world.evaluateCompositionFor(selectedWatch.id, interaction.party);
  const connection = readConnectedReliefOperation(world.arc, world.extensions);
  const stateChanges = world.lastEngineReport?.stateChanges ?? [];
  const party = new Set(interaction.party);
  const isReliefCircuitProgram = world.cartridgeDigest === EXPECTED_BUNDLED_DIGESTS["relief-circuit"];

  return (
    <section
      className={`commonship ${isReliefCircuitProgram ? "commonship--relief-circuit" : "commonship--neutral"}`}
      data-testid="common-ship-scene"
      data-selected-watch={selectedWatch.id}
      data-connected-status={connection?.status ?? "none"}
      data-first-party-art={isReliefCircuitProgram ? "true" : "false"}
      style={{ ["--commonship-environment" as string]: isReliefCircuitProgram ? `url(${ASSET.environment})` : "none" }}
    >
      <div className="commonship__veil" />
      <header className="commonship__header">
        <div>
          <small>{t(isReliefCircuitProgram ? "commonShip.program.firstParty" : "commonShip.program.holderOwned")}</small>
          <h1>{view.source.identity.title}</h1>
          <p>{view.source.controlQuestion}</p>
        </div>
        <div className="commonship__progress" aria-label={t("commonShip.progressAria")}>
          <strong>{view.clearedCount}/{view.watches.length}</strong>
          <span>{t("commonShip.operationsRecorded")}</span>
        </div>
      </header>

      <div className="commonship__state" data-testid="common-ship-state">
        {view.shipState.map((track) => {
          const change = stateChanges.find((entry) => entry.stateId === track.source.kind);
          return (
            <article key={track.source.kind} data-testid={`common-ship-state-${track.source.kind}`} data-value={track.value} className={track.changed ? "is-changed" : ""}>
              <small>{translatedLabel(STATE_LABEL, track.source.kind)}</small>
              <strong>{track.value}/4</strong>
              <div><i style={{ width: `${Math.max(0, Math.min(4, track.value)) * 25}%` }} /></div>
              {change && <p>{String(change.before)} → {String(change.after)} · {change.reason}</p>}
            </article>
          );
        })}
      </div>

      <div className="commonship__workspace">
        <nav className="commonship__watches" aria-label={t("commonShip.operationsAria")}>
          <small>{t("commonShip.watchSequence")}</small>
          {view.watches.map((watch, index) => (
            <button
              key={watch.source.id}
              type="button"
              data-testid={`common-ship-watch-${watch.source.id}`}
              data-status={watch.node?.status ?? "missing"}
              className={watch.source.id === selectedWatch.id ? "is-selected" : ""}
              onClick={() => interaction.select(watch.source.id)}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span><strong>{watch.source.name}</strong><small>{translatedLabel(SYSTEM_LABEL, watch.source.system)}</small></span>
              <i>{watch.cleared ? "✓" : watch.node?.status === "available" ? "◆" : "◇"}</i>
            </button>
          ))}
        </nav>

        <main className="commonship__main">
          <WatchDetails watch={selectedWatch} />

          <section className="commonship__composition" data-testid="common-ship-composition" data-feasible={composition?.feasible ? "true" : "false"}>
            <header><div><small>{t("commonShip.verdict.heading")}</small><h2>{t(composition?.feasible ? "commonShip.verdict.viable" : "commonShip.verdict.refused")}</h2></div><span>{t("commonShip.selectedCount", { n: interaction.party.length, max: selectedWatch.maxAgents })}</span></header>
            <div className="commonship__tests">
              {(composition?.results ?? []).map((result) => (
                <article key={result.id} className={result.passed ? "is-pass" : "is-fail"} title={result.reason}>
                  <b>{result.passed ? "✓" : "✗"}</b><span><strong>{result.label}</strong><small>{result.reason}</small></span>
                </article>
              ))}
            </div>
            {composition && !composition.feasible && <ul>{composition.rejectionReasons.map((reason, index) => <li key={`${index}:${reason}`}>{reason}</li>)}</ul>}
            {composition && composition.dependencies.length > 0 && <p><b>{t("commonShip.dependencies")}</b> {composition.dependencies.join(", ")}</p>}
            {composition && composition.singlePointsOfFailure.length > 0 && <p><b>{t("commonShip.singlePoints")}</b> {composition.singlePointsOfFailure.join(", ")}</p>}
            <div
              className="commonship__readiness"
              data-testid="common-ship-readiness"
              data-outcome={interaction.readiness?.projectedOutcome ?? "none"}
            >
              <span><small>{t("commonShip.engineProjection")}</small><strong>{translatedLabel(PROJECTION_LABEL, interaction.readiness?.projectedOutcome ?? "none")}</strong></span>
              <span><small>{t("commonShip.currentCycle")}</small><strong data-testid="common-ship-cycle">{world.cycle}</strong></span>
              <p>{interaction.readiness?.reasons[0] ?? t("commonShip.readinessClear")}</p>
            </div>
            {selectedNode?.status === "available" && (
              <div className="commonship__actions">
                <PixelButton
                  type="button"
                  variant="secondary"
                  data-testid="common-ship-prepare-cycle"
                  disabled={!composition?.feasible || interaction.party.length === 0}
                  onClick={() => world.runPreparationCycle(interaction.party)}
                >
                  {t("commonShip.prepareCycle")}
                </PixelButton>
                {onEnterEncounter && (
                  <PixelButton
                    type="button"
                    variant="primary"
                    data-testid="common-ship-enter"
                    disabled={!composition?.feasible || interaction.party.length < selectedWatch.minAgents || interaction.party.length > selectedWatch.maxAgents}
                    onClick={() => onEnterEncounter(selectedWatch.id)}
                  >
                    {t("commonShip.commitWatch")}
                  </PixelButton>
                )}
              </div>
            )}
          </section>

          <section className="commonship__profiles" aria-label={t("commonShip.profilesAria")}>
            {expandCommonShipProfileCards(view.profiles, world.roster).map(({ profile, member, agent }) => (
              <ProfileCard
                key={`${profile.id}:${member?.id ?? "unassigned"}`}
                profile={profile}
                member={member}
                agentId={agent?.id ?? null}
                portrait={isReliefCircuitProgram && member ? ASSET.portraits[member.id] : undefined}
                selected={agent ? party.has(agent.id) : false}
                onToggle={() => agent && interaction.toggleAgent(agent.id)}
              />
            ))}
          </section>

          {isReliefCircuitProgram ? (
            <>
              <section className="commonship__schematic" data-testid="common-ship-first-party-schematic">
                <header><small>{t("commonShip.vesselAnatomy")}</small><h2>{t("commonShip.onePolity")}</h2></header>
                <div className="commonship__schematic-scroll" tabIndex={0} aria-label={t("commonShip.crossSectionAria")}><img data-testid="common-ship-cross-section" src={ASSET.crossSection} alt={t("commonShip.crossSectionAlt")} /></div>
              </section>

              <details className="commonship__schematic commonship__atlas" data-testid="common-ship-symbol-atlas">
                <summary>{t("commonShip.atlasSummary")}</summary>
                <div className="commonship__schematic-scroll" tabIndex={0} aria-label={t("commonShip.atlasAria")}><img data-testid="common-ship-atlas" src={ASSET.atlas} alt={t("commonShip.atlasAlt")} /></div>
              </details>
            </>
          ) : (
            <section className="commonship__schematic commonship__neutral-anatomy" data-testid="common-ship-neutral-anatomy">
              <header><small>{t("commonShip.creatorAnatomy")}</small><h2>{view.source.identity.title}</h2></header>
              <div className="commonship__neutral-systems">
                {view.source.anatomy.map((system) => (
                  <article key={system.kind}>
                    <small>{translatedLabel(SYSTEM_LABEL, system.kind)}</small>
                    <strong>{system.label}</strong>
                    <p>{system.description}</p>
                    <dl><div><dt>{t("commonShip.currentUse")}</dt><dd>{system.currentUse}</dd></div><div><dt>{t("commonShip.revisionAuthority")}</dt><dd>{system.revisionAuthority}</dd></div></dl>
                  </article>
                ))}
              </div>
            </section>
          )}

          {connection && (
            <section className="commonship__connection" data-testid="connected-operation" data-status={connection.status}>
              <header><div><small>{connection.format}</small><h2>{connection.transfer.title}</h2></div><strong>{translatedLabel(CONNECTION_STATUS_LABEL, connection.status)}</strong></header>
              <p>{connection.transfer.excludedActor}</p>
              <dl>
                <div><dt>{t("commonShip.connection.selectedWatch")}</dt><dd>{connection.transfer.selectedWatchId}</dd></div>
                <div><dt>{t("commonShip.dependency")}</dt><dd>{connection.transfer.dependency}</dd></div>
                <div><dt>{t("commonShip.connection.people")}</dt><dd>{connection.transfer.people.join(", ")}</dd></div>
                <div><dt>{t("commonShip.connection.stores")}</dt><dd>{connection.transfer.stores.join(", ")}</dd></div>
                <div><dt>{t("commonShip.connection.exposure")}</dt><dd>{connection.transfer.exposureConsequences.join(", ")}</dd></div>
              </dl>
              {connection.status === "returned" && (
                <ul>{connection.returnLedger.inheritedFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
              )}
            </section>
          )}
        </main>
      </div>
    </section>
  );
}
