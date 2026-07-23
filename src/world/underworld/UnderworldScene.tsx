import { useMemo } from "react";
import type { DarkTombDelveBlueprint, DarkTombPocketSource } from "../../dark-tomb/types.js";
import type { SceneProps } from "../presentations.js";
import { CartridgeMotif, CartridgePortrait } from "../themes/CartridgeMotif.js";
import { deriveUnderworldView, inspectDarkTombWorld } from "./dark-tomb.js";
import { t } from "../i18n/index.js";
import "./underworld.css";

function statusLabel(status: "locked" | "available" | "cleared" | undefined): string {
  if (status === "available") return t("underworld.available");
  if (status === "cleared") return t("underworld.recorded");
  return t("underworld.locked");
}

function selectedDelve(source: DarkTombPocketSource, selectedId: string | null, availableId: string | null): DarkTombDelveBlueprint | null {
  const id = selectedId ?? availableId;
  return id ? source.delves.find((delve) => delve.id === id) ?? null : source.delves[0] ?? null;
}

function SourceError({ errors }: { errors: string[] }): JSX.Element {
  return (
    <div className="underworld-source-error" data-testid="underworld-source-error" role="alert">
      <div>
        <small>{t("underworld.metadataRefused")}</small>
        <h2>{t("underworld.invalidHeading")}</h2>
        <p>{t("underworld.invalidBody")}</p>
        <ul>{errors.slice(0, 8).map((error, index) => <li key={index}>{error}</li>)}</ul>
      </div>
    </div>
  );
}

export function UnderworldScene({ world, interaction, onEnterEncounter }: SceneProps): JSX.Element {
  const inspection = useMemo(() => inspectDarkTombWorld(world.arc), [world.arc]);
  if (inspection.status === "none") return <SourceError errors={[t("underworld.noSource")]} />;
  if (inspection.status === "invalid") return <SourceError errors={inspection.errors} />;

  const view = deriveUnderworldView({
    source: inspection.source,
    nodes: world.nodes,
    cartridgeState: world.cartridgeState,
    selectedChallengeId: interaction.selectedId,
  });
  const delve = selectedDelve(view.source, interaction.selectedId, view.availableChallengeId);
  const selectedNode = delve ? world.nodes.find((node) => node.challengeId === delve.id) ?? null : null;
  const ordinaryGood = view.source.pressures.find((pressure) => pressure.kind === "ordinary-good")!;
  const exteriorLie = view.source.pressures.find((pressure) => pressure.kind === "exterior-lie")!;
  const observer = view.source.signatureBudget.observer;
  const steward = view.source.cast.find((member) => member.id === "anja-vei") ?? view.source.cast[0]!;

  return (
    <div
      className="underworld-scene"
      data-testid="underworld-scene"
      data-alarm={view.alarmPhase}
      data-signature={view.signatureStatus}
      data-visibility={view.visibilityStatus}
      data-hub-state={view.hubChanged ? "changed" : "held"}
    >
      <header className="underworld-scene__hero">
        <div className="underworld-scene__hero-copy">
          <div className="underworld-scene__eyebrow">{t("underworld.eyebrow")}</div>
          <h2>{view.source.identity.title}</h2>
          <p className="underworld-scene__question">{view.source.controlQuestion}</p>
          <div className="underworld-status-grid" aria-label={t("underworld.stateLedger")}>
            <div className="underworld-status" data-value={view.alarmPhase}><small>{t("underworld.alarm")}</small><strong>{view.alarmPhase}</strong></div>
            <div className="underworld-status" data-value={view.signatureStatus}><small>{t("underworld.signature")}</small><strong>{view.signatureStatus}</strong></div>
            <div className="underworld-status" data-value={view.visibilityStatus}><small>{t("underworld.visibility")}</small><strong>{view.visibilityStatus}</strong></div>
            <div className="underworld-status"><small>{t("underworld.recordedMovements")}</small><strong>{view.clearedCount}/{world.totalNodes}</strong></div>
          </div>
        </div>
      </header>

      <main className="underworld-scene__body">
        <section className="underworld-hub-grid" aria-label={t("underworld.civicHub")}>
          <article className="underworld-panel">
            <header className="underworld-panel__head"><small>{t("underworld.steward")}</small><CartridgePortrait arcId={world.arc.meta.id} personId={steward.id} size={34} /></header>
            <div className="underworld-panel__body underworld-steward">
              <div className="underworld-steward__portrait" role="img" aria-label={steward.name} />
              <div><strong>{steward.name}</strong><small>{steward.roleId}</small><p>{steward.description}</p><span className="underworld-hub-state" data-changed={view.hubChanged}>{view.hubChanged ? t("underworld.hubChanged") : t("underworld.hubHeld")}</span></div>
            </div>
          </article>

          <article className="underworld-panel">
            <header className="underworld-panel__head"><small>{t("underworld.ordinaryLife")}</small><span>{ordinaryGood.label}</span></header>
            <div className="underworld-panel__body"><p>{ordinaryGood.description}</p><div className="underworld-inheritance-grid">{view.source.signatureBudget.allocations.map((allocation) => <div className="underworld-allocation" key={allocation.id}><strong>{allocation.label}</strong><small>{allocation.ordinaryGood}</small><span>{allocation.denialCost}</span></div>)}</div></div>
          </article>

          <article className="underworld-panel">
            <header className="underworld-panel__head"><small>{t("underworld.exteriorClassification")}</small><span>{view.visibilityStatus}</span></header>
            <div className="underworld-panel__body"><strong>{exteriorLie.label}</strong><p>{exteriorLie.description}</p><small>{t("underworld.observer")}</small><p>{observer}</p></div>
          </article>
        </section>

        <section className="underworld-cross-section" data-testid="underworld-cross-section" aria-label={t("underworld.layeredMap")}>
          <div className="underworld-panel__head"><small>{t("underworld.layeredMap")}</small><span>{t("underworld.layeredMapHint")}</span></div>
          <div className="underworld-layers">
            {view.layers.map((layer, index) => (
              <button
                type="button"
                key={layer.source.kind}
                className="underworld-layer"
                data-testid={`underworld-layer-${layer.source.kind}`}
                data-active={layer.active}
                data-cleared={layer.cleared}
                onClick={() => {
                  const target = layer.delves.find((entry) => entry.node?.status === "available") ?? layer.delves[0];
                  if (target) interaction.select(target.source.id);
                }}
              >
                <span className="underworld-layer__index">{String(index + 1).padStart(2, "0")}</span>
                <strong>{layer.source.label}</strong>
                <span>{layer.source.currentUse}</span>
                <code>{layer.source.officialClassification}</code>
                <span className="underworld-layer__nodes">
                  {layer.delves.map(({ source, node }) => <span key={source.id} className="underworld-layer__node" data-state={node?.status ?? "locked"}><CartridgeMotif arcId={world.arc.meta.id} challengeId={source.id} size={14}/>{source.name} · {statusLabel(node?.status)}</span>)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {delve && (
          <section className="underworld-expedition" data-testid="underworld-expedition" data-challenge={delve.id}>
            <article className="underworld-panel">
              <header className="underworld-panel__head"><small>{t("underworld.expedition")}</small><span>{delve.tierId} · {delve.layer}</span></header>
              <div className="underworld-panel__body">
                <h3><CartridgeMotif arcId={world.arc.meta.id} challengeId={delve.id} size={26}/> {delve.name}</h3>
                <p>{delve.description}</p>
                <div className="underworld-depth-vector" aria-label={t("underworld.depthVector")}>{Object.entries(delve.depth).map(([kind, value]) => <span className="underworld-depth" key={kind}>{kind} <b>{value}</b></span>)}</div>
                <div className="underworld-expedition__meta">
                  <div className="underworld-fact"><small>{t("underworld.objective")}</small><span>{delve.expedition.objective}</span></div>
                  <div className="underworld-fact"><small>{t("underworld.route")}</small><span>{delve.expedition.authorizedRoute}</span></div>
                  <div className="underworld-fact"><small>{t("underworld.authority")}</small><span>{delve.expedition.authority}</span></div>
                  <div className="underworld-fact"><small>{t("underworld.claim")}</small><span>{delve.expedition.claimToProve}</span></div>
                  <div className="underworld-fact"><small>{t("underworld.signatureBudget")}</small><span>{delve.expedition.signatureBudget}</span></div>
                  <div className="underworld-fact"><small>{t("underworld.inheritance")}</small><span>{delve.expedition.inheritance}</span></div>
                </div>
                <button
                  type="button"
                  className="underworld-enter"
                  data-testid={`underworld-enter-${delve.id}`}
                  disabled={selectedNode?.status !== "available" || !onEnterEncounter}
                  onClick={() => onEnterEncounter?.(delve.id)}
                >
                  {selectedNode?.status === "available" ? t("underworld.enterExpedition") : statusLabel(selectedNode?.status)}
                </button>
              </div>
            </article>

            <article className="underworld-panel">
              <header className="underworld-panel__head"><small>{t("underworld.cast")}</small><span>{view.source.cast.length}</span></header>
              <div className="underworld-panel__body underworld-cast-list">{view.source.cast.map((member) => <div className="underworld-cast-row" key={member.id}><CartridgePortrait arcId={world.arc.meta.id} personId={member.id} size={32}/><div><strong>{member.name}</strong><small>{member.responsibility}</small></div></div>)}</div>
            </article>
          </section>
        )}

        <section className="underworld-budget-grid">
          <article className="underworld-panel">
            <header className="underworld-panel__head"><small>{t("underworld.signatureBudget")}</small><span>{view.signatureStatus}</span></header>
            <div className="underworld-panel__body"><p>{view.source.signatureBudget.exteriorClassification}</p><small>{t("underworld.wakeSources")}</small><ul className="underworld-list">{view.source.signatureBudget.wakeSources.map((wake) => <li key={wake}>{wake}</li>)}</ul></div>
          </article>
          <article className="underworld-panel">
            <header className="underworld-panel__head"><small>{t("underworld.inheritedConsequences")}</small><span data-testid="underworld-inherited-count">{view.inherited.filter((entry) => entry.inherited).length}/{view.inherited.length}</span></header>
            <div className="underworld-panel__body underworld-inheritance-grid">{view.inherited.map((entry) => <div className="underworld-inheritance" data-inherited={entry.inherited} key={entry.stateId}><strong>{entry.source.label}</strong><small>{entry.inherited ? t("underworld.inherited") : t("underworld.pending")}</small><span>{entry.source.description}</span></div>)}</div>
          </article>
        </section>
      </main>
    </div>
  );
}
