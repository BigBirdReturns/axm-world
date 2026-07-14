import { useEffect, useMemo, useState } from "react";
import type { ArcWorld } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import type { DecisionResponse } from "../decision.js";
import { DecisionPanel } from "../components/DecisionPanel.js";
import { OpeningDecisionStage } from "../components/OpeningDecisionStage.js";
import { PixelButton, PixelDoll, PixelPanel } from "../pixel-ui/index.js";
import { resolveDollAppearance } from "../themes/appearance.js";
import { themeForArc } from "../themes/select.js";
import {
  hallCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  type ExperienceCheckpoint,
} from "./checkpoint.js";
import "../themes/first-charter/first-charter.css";
import "./experience.css";

interface Props {
  world: ArcWorld;
  onExit: () => void;
}

function latestAvailable(nodes: readonly WorldNode[]): WorldNode | null {
  return nodes.find((node) => node.status === "available") ?? null;
}

function ledgerEntry(world: ArcWorld, checkpoint: ExperienceCheckpoint) {
  if (checkpoint.ledgerSeq !== null) {
    const exact = world.ledger.entries.find((entry) => entry.seq === checkpoint.ledgerSeq);
    if (exact) return exact;
  }
  for (let index = world.ledger.entries.length - 1; index >= 0; index--) {
    const entry = world.ledger.entries[index];
    if (entry?.challengeId === checkpoint.challengeId) return entry;
  }
  return null;
}

function outcomeLabel(outcome: "success" | "partial" | "failure"): string {
  return outcome === "success" ? "Cleared" : outcome === "partial" ? "Held, at a cost" : "The charter withdrew";
}

export function ExperienceHost({ world, onExit }: Props): JSX.Element {
  const challengeIds = useMemo(() => new Set(world.arc.challenges.map((challenge) => challenge.id)), [world.arc]);
  const agentIds = useMemo(() => new Set(world.roster.map((agent) => agent.id)), [world.roster]);
  const [checkpoint, setCheckpoint] = useState<ExperienceCheckpoint>(() =>
    loadCheckpoint(localStorage, world.cartridgeDigest, challengeIds, agentIds)
      ?? hallCheckpoint(world.cartridgeDigest),
  );
  const [decisionResponse, setDecisionResponse] = useState<DecisionResponse | null>(null);
  const [showRecord, setShowRecord] = useState(false);
  const [resolving, setResolving] = useState(false);
  const next = latestAvailable(world.nodes);
  const challenge = checkpoint.challengeId
    ? world.arc.challenges.find((candidate) => candidate.id === checkpoint.challengeId) ?? null
    : null;
  const node = checkpoint.challengeId
    ? world.nodes.find((candidate) => candidate.challengeId === checkpoint.challengeId) ?? null
    : null;
  const requirements = checkpoint.challengeId ? world.describeContract(checkpoint.challengeId) : null;
  const fixedDeployment = !!requirements && requirements.minAgents === requirements.maxAgents;
  const record = ledgerEntry(world, checkpoint);
  const theme = useMemo(() => themeForArc(world.arc), [world.arc]);
  const steward = world.cartridge.people?.[0] ?? null;
  const organizationName = world.arc.founding?.organization.name ?? world.arc.meta.name;
  const capacityName = world.resources.tokenName.replace(/s$/i, "") || "Contract";

  useEffect(() => {
    document.documentElement.setAttribute("data-cartridge", world.arc.meta.id);
    return () => document.documentElement.removeAttribute("data-cartridge");
  }, [world.arc.meta.id]);

  useEffect(() => {
    saveCheckpoint(localStorage, checkpoint);
  }, [checkpoint]);

  const enterBriefing = () => {
    if (!next) return;
    const req = world.reqFor(next.challengeId);
    const partyIds = req.minAgents === req.maxAgents
      ? world.roster.slice(0, req.maxAgents).map((member) => member.id)
      : world.roster.slice(0, req.minAgents).map((member) => member.id);
    setCheckpoint({
      version: 1,
      authoredArcDigest: world.cartridgeDigest,
      stage: "briefing",
      challengeId: next.challengeId,
      partyIds,
      difficultyModeId: null,
      tokensSpent: 0,
      ledgerSeq: null,
    });
  };

  const toggleParty = (agentId: string) => {
    if (!requirements || fixedDeployment || checkpoint.stage !== "briefing") return;
    setCheckpoint((current) => {
      const selected = current.partyIds.includes(agentId);
      const partyIds = selected
        ? current.partyIds.filter((id) => id !== agentId)
        : current.partyIds.length < requirements.maxAgents
          ? [...current.partyIds, agentId]
          : current.partyIds;
      return { ...current, partyIds };
    });
  };

  const countOk = !!requirements
    && checkpoint.partyIds.length >= requirements.minAgents
    && checkpoint.partyIds.length <= requirements.maxAgents;

  const commitPlan = () => {
    if (!challenge || !countOk) return;
    setCheckpoint((current) => ({ ...current, stage: "committed" }));
  };

  const resolveContract = () => {
    if (!challenge || resolving || checkpoint.stage !== "committed") return;
    setResolving(true);
    window.setTimeout(() => {
      world.runChallenge(
        challenge.id,
        checkpoint.partyIds,
        checkpoint.difficultyModeId,
        checkpoint.tokensSpent,
      );
      setCheckpoint((current) => ({
        ...current,
        stage: "receipt",
        ledgerSeq: world.ledger.entries.length,
      }));
      setResolving(false);
    }, 700);
  };

  const returnToHall = () => setCheckpoint(hallCheckpoint(world.cartridgeDigest));

  return (
    <main className="axm-experience" data-testid="axm-experience" data-stage={checkpoint.stage}>
      <header className="axm-experience__identity">
        <div>
          <span className="axm-experience__receiver">RODOH WORLD · RECEIVER</span>
          <strong>{world.arc.meta.name}</strong>
        </div>
        <div className="axm-experience__custody">
          <span>ARC LAW</span>
          <code title={world.cartridgeDigest}>{world.cartridgeDigest.slice(0, 18)}…</code>
          <button type="button" data-testid="cartridge-object-button" onClick={() => setShowRecord(true)}>Run record</button>
        </div>
      </header>

      <section className="axm-experience__stage">
        <div className="axm-experience__atmosphere" aria-hidden="true">
          <span className="axm-experience__moon" />
          <span className="axm-experience__tower" />
          <span className="axm-experience__threshold" />
        </div>

        {checkpoint.stage === "hall" && (
          <div className="axm-beat axm-hall" data-testid="hall-scene">
            <div className="axm-beat__eyebrow">THE HALL EXISTS NOW</div>
            <h1>{organizationName}</h1>
            <p className="axm-beat__lead">
              You are this charter's operator. {steward?.name ?? "The steward"} keeps the ledger; you choose what this organization risks next.
            </p>

            <div className="axm-hall__table">
              <div className="axm-steward">
                <div className="axm-steward__portrait">{steward?.name.slice(0, 1) ?? "W"}</div>
                <div>
                  <span>{steward?.role ?? "World steward"}</span>
                  <strong>{steward?.name ?? "The receiver"}</strong>
                  <p>{steward?.greeting ?? "The cartridge has founded a runnable organization. Its first contract is waiting."}</p>
                </div>
              </div>

              <div className="axm-roster" aria-label="Founded roster">
                {world.roster.map((member) => (
                  <div className="axm-roster__member" key={member.id} data-testid={`founder-${member.id}`}>
                    <PixelDoll appearance={resolveDollAppearance(theme, member.role)} identity={member.id} state={member.downed ? "downed" : "idle"} size={42} />
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {next ? (
              <PixelPanel className="axm-contract" tone="light">
                <div className="axm-contract__eyebrow">{world.ledger.entries.length === 0 ? "FIRST MARK" : "NEXT MARK"} · AVAILABLE</div>
                <h2 data-testid="selected-contract-title">{next.title}</h2>
                <p>{next.description}</p>
                <div className="axm-contract__facts">
                  <span>{world.reqFor(next.challengeId).minAgents === world.reqFor(next.challengeId).maxAgents
                    ? `${world.reqFor(next.challengeId).minAgents} founders · fixed deployment`
                    : `${world.reqFor(next.challengeId).minAgents}–${world.reqFor(next.challengeId).maxAgents} founders`}</span>
                  <span>{world.arc.challenges.find((item) => item.id === next.challengeId)?.mechanicChecks.length ?? 0} objective</span>
                </div>
                <PixelButton data-testid="hall-enter-contract" variant="action" onClick={enterBriefing}>
                  Take {next.title}
                </PixelButton>
              </PixelPanel>
            ) : (
              <PixelPanel className="axm-contract" tone="light"><h2>The charter is fulfilled.</h2></PixelPanel>
            )}
          </div>
        )}

        {(checkpoint.stage === "briefing" || checkpoint.stage === "committed") && challenge && requirements && (
          <div className="axm-beat axm-mission" data-testid="encounter-shell" data-encounter-state={checkpoint.stage}>
            <button className="axm-back" type="button" onClick={returnToHall}>← Hall</button>
            <div className="axm-beat__eyebrow">THE CHARTER CROSSES THE THRESHOLD</div>
            <h1>{challenge.name}</h1>
            <p className="axm-beat__lead">{challenge.description}</p>

            <div className="axm-mission__grid">
              <PixelPanel className="axm-objectives" tone="dark" title="What must be done">
                {challenge.mechanicChecks.map((check) => (
                  <article key={check.id} className="axm-objective" data-testid={`objective-${check.id}`}>
                    <span>{check.scope.replaceAll("_", " ")}</span>
                    <h3>{check.name}</h3>
                    <p>{check.description}</p>
                    <div>{check.attributeWeights.map((weight) => {
                      const attribute = world.arc.attributes.find((candidate) => candidate.id === weight.attributeId);
                      return `${attribute?.name ?? weight.attributeId} ${Math.round(weight.weight * 100)}%`;
                    }).join(" · ")}</div>
                  </article>
                ))}
              </PixelPanel>

              <PixelPanel className="axm-plan" tone="light" title={checkpoint.stage === "committed" ? "Plan locked" : "Prepare the plan"}>
                <p className="axm-plan__truth">
                  {fixedDeployment
                    ? `This Arc requires all ${requirements.maxAgents} founders. World cannot substitute a different party.`
                    : `Choose ${requirements.minAgents}–${requirements.maxAgents}. The exact party below is the one the engine will receive.`}
                </p>
                <div className="axm-plan__party" data-testid="experience-party">
                  {world.roster.map((member) => {
                    const selected = checkpoint.partyIds.includes(member.id);
                    return (
                      <button
                        type="button"
                        key={member.id}
                        className={selected ? "is-selected" : ""}
                        aria-pressed={selected}
                        disabled={fixedDeployment || checkpoint.stage === "committed"}
                        onClick={() => toggleParty(member.id)}
                        data-testid={`party-${member.id}`}
                      >
                        <PixelDoll appearance={resolveDollAppearance(theme, member.role)} identity={member.id} state="idle" size={34} />
                        <span><strong>{member.name}</strong><small>{member.role}</small></span>
                      </button>
                    );
                  })}
                </div>

                {challenge.resourceSpend && world.resources.tokens > 0 && (
                  <fieldset className="axm-plan__choice" disabled={checkpoint.stage === "committed"}>
                    <legend>One engine-honored decision</legend>
                    <label className={checkpoint.tokensSpent === 0 ? "is-selected" : ""}>
                      <input type="radio" name="spend" checked={checkpoint.tokensSpent === 0} onChange={() => setCheckpoint((current) => ({ ...current, tokensSpent: 0 }))} />
                      <span><strong>Save your capacity</strong><small>Trust the founders. Keep this Contract for later.</small></span>
                    </label>
                    <label className={checkpoint.tokensSpent === 1 ? "is-selected" : ""}>
                      <input type="radio" name="spend" checked={checkpoint.tokensSpent === 1} onChange={() => setCheckpoint((current) => ({ ...current, tokensSpent: 1 }))} />
                      <span><strong>Commit 1 {capacityName}</strong><small>Narrow the uncertainty. It cannot buy power or guarantee success.</small></span>
                    </label>
                  </fieldset>
                )}

                {checkpoint.stage === "briefing" ? (
                  <PixelButton variant="confirm" disabled={!countOk} onClick={commitPlan} data-testid="commit-plan">
                    Commit this exact plan
                  </PixelButton>
                ) : (
                  <div className="axm-plan__commit">
                    <div><span>CHALLENGE</span><strong>{checkpoint.challengeId}</strong></div>
                    <div><span>PARTY</span><strong>{checkpoint.partyIds.length} exact founders</strong></div>
                    <div><span>CAPACITY</span><strong>{checkpoint.tokensSpent} spent</strong></div>
                    <PixelButton className="pixel-button--cta" variant="action" onClick={resolveContract} data-testid="encs-resolve" disabled={resolving}>
                      {resolving ? "The engine is resolving…" : `Cross the threshold into ${challenge.name}`}
                    </PixelButton>
                  </div>
                )}
              </PixelPanel>
            </div>
          </div>
        )}

        {checkpoint.stage === "receipt" && (
          <div className="axm-beat axm-receipt" data-testid="encs-receipt" data-outcome={record?.outcome ?? "pending"}>
            <div className="axm-beat__eyebrow">THE WORLD ANSWERED · THE RECORD HELD</div>
            <h1>{record ? outcomeLabel(record.outcome) : "Recovering the exact receipt…"}</h1>
            {record && (
              <>
                <p className="axm-beat__lead">{record.consequence.contract.title} resolved in cycle {record.cycle}. This is ledger entry #{record.seq + 1}, not a UI summary.</p>
                <div className="axm-receipt__seal"><span>RECORDED</span><strong>#{String(record.seq + 1).padStart(3, "0")}</strong></div>
                <div className="axm-receipt__grid">
                  <PixelPanel tone="light" title="What changed">
                    <ul>
                      {record.consequence.worldChanges.map((change, index) => <li key={`${change.targetId}:${index}`}>{change.label}</li>)}
                      {record.consequence.rewards.map((reward, index) => <li key={`${reward.kind}:${index}`}>{reward.label}{reward.amount !== undefined ? ` +${reward.amount}` : ""}</li>)}
                    </ul>
                  </PixelPanel>
                  <PixelPanel tone="dark" title="Who carried it">
                    <ul>{record.consequence.party.members.map((member) => <li key={member.id}>{member.name}<span>{member.role}</span></li>)}</ul>
                  </PixelPanel>
                </div>
                {world.pendingLoot.length > 0 && (
                  <div className="axm-receipt__pending" data-testid="pending-loot-held">
                    {world.pendingLoot.length} reward decision held in the exact save. Reloading cannot erase it.
                  </div>
                )}
              </>
            )}
            <div className="axm-receipt__actions">
              <PixelButton variant="action" data-testid="encs-leave" onClick={returnToHall}>Return to the changed Hall</PixelButton>
              <PixelButton variant="secondary" onClick={onExit}>Carry this run to the cartridge shelf</PixelButton>
            </div>
          </div>
        )}
      </section>

      <footer className="axm-experience__footer">
        <span><i className="is-live" /> Exact local save</span>
        <span>{world.ledger.entries.length} consequence{world.ledger.entries.length === 1 ? "" : "s"} recorded</span>
        <span>The Arc supplies the rules. This World runs and remembers them.</span>
      </footer>

      {(world.pendingDecision || decisionResponse) && (
        <DecisionPanel
          card={decisionResponse ? undefined : world.pendingDecision ?? undefined}
          response={decisionResponse ?? undefined}
          targetName={world.effectTargetName}
          stage={(world.pendingDecision?.id.startsWith("opening:") || decisionResponse?.cardId.startsWith("opening:"))
            ? <OpeningDecisionStage world={world} response={decisionResponse ?? undefined} />
            : undefined}
          onResolve={(optionId) => setDecisionResponse(world.resolveDecision(optionId))}
          onContinue={() => setDecisionResponse(null)}
        />
      )}

      {showRecord && (
        <div className="axm-record" role="dialog" aria-modal="true" aria-label="Run record" onClick={() => setShowRecord(false)}>
          <PixelPanel tone="dark" onClick={(event) => event.stopPropagation()}>
            <div className="axm-record__eyebrow">HOLDER-OWNED RUN</div>
            <h2>{world.arc.meta.name}</h2>
            <code data-testid="cartridge-digest">{world.cartridgeDigest}</code>
            <div className="axm-record__ledger">
              {world.ledger.entries.length === 0 ? <p data-testid="ledger-empty">Nothing recorded yet.</p> : world.ledger.entries.map((entry) => (
                <button
                  type="button"
                  key={entry.seq}
                  data-testid="ledger-entry"
                  onClick={() => {
                    setCheckpoint({
                      version: 1,
                      authoredArcDigest: world.cartridgeDigest,
                      stage: "receipt",
                      challengeId: entry.challengeId,
                      partyIds: entry.consequence.party.members.map((member) => member.id).filter((id) => agentIds.has(id)),
                      difficultyModeId: null,
                      tokensSpent: 0,
                      ledgerSeq: entry.seq,
                    });
                    setShowRecord(false);
                  }}
                >
                  <strong>#{entry.seq + 1} · {entry.challengeName}</strong><span>{outcomeLabel(entry.outcome)} · Open receipt</span>
                </button>
              ))}
            </div>
            <div className="axm-record__actions">
              <PixelButton variant="secondary" onClick={() => setShowRecord(false)}>Resume</PixelButton>
              <PixelButton variant="danger" onClick={onExit}>Leave</PixelButton>
            </div>
          </PixelPanel>
        </div>
      )}
    </main>
  );
}
