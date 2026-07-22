import { useEffect, useMemo, useRef, useState } from "react";
import type { ArcWorld } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import type { DecisionResponse } from "../decision.js";
import { DecisionPanel } from "../components/DecisionPanel.js";
import { OpeningDecisionStage } from "../components/OpeningDecisionStage.js";
import { PixelButton, PixelDoll, PixelPanel } from "../pixel-ui/index.js";
import { resolveDollAppearance } from "../themes/appearance.js";
import { themeForArc } from "../themes/select.js";
import { CartridgePortrait, CartridgeSprite } from "../themes/CartridgeMotif.js";
import { programForCartridge } from "../program-of-record.js";
import { summarizeLedger } from "../ledger.js";
import { t } from "../i18n/index.js";
import { useIsMobile } from "../use-viewport.js";
import {
  RODOH_EXPERIENCE_EXTENSION,
  downloadPortableRun,
  rodohCheckpointMemory,
  rodohExperienceExtensionValue,
} from "../portable-run.js";
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
  onEnterRuntime: () => void;
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

function playThresholdCue(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const context = new AudioContext();
    const gain = context.createGain();
    const low = context.createOscillator();
    const high = context.createOscillator();
    low.type = "triangle";
    high.type = "square";
    low.frequency.setValueAtTime(82, context.currentTime);
    high.frequency.setValueAtTime(164, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    low.connect(gain);
    high.connect(gain);
    gain.connect(context.destination);
    low.start();
    high.start(context.currentTime + 0.08);
    low.stop(context.currentTime + 0.44);
    high.stop(context.currentTime + 0.3);
    window.setTimeout(() => void context.close(), 520);
  } catch {
    // Audio is an enhancement; the visual action sequence remains complete.
  }
}

export function ExperienceHost({ world, onExit, onEnterRuntime }: Props): JSX.Element {
  const isMobile = useIsMobile();
  const challengeIds = useMemo(() => new Set(world.arc.challenges.map((challenge) => challenge.id)), [world.arc]);
  const agentIds = useMemo(() => new Set(world.roster.map((agent) => agent.id)), [world.roster]);
  const difficultyModeIds = useMemo(() => new Set(world.arc.difficultyModes.map((mode) => mode.id)), [world.arc]);
  const [checkpoint, setCheckpoint] = useState<ExperienceCheckpoint>(() =>
    rodohCheckpointMemory(world.extensions, {
      authoredArcDigest: world.cartridgeDigest,
      challengeIds,
      agentIds,
      difficultyModeIds,
    })
      ?? loadCheckpoint(localStorage, world.cartridgeDigest, challengeIds, agentIds, difficultyModeIds)
      ?? hallCheckpoint(world.cartridgeDigest),
  );
  const [decisionResponse, setDecisionResponse] = useState<DecisionResponse | null>(null);
  const [showRecord, setShowRecord] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [actionBeat, setActionBeat] = useState<"descent" | "clash" | "verdict">("descent");
  const actionTimers = useRef<number[]>([]);
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
  const program = programForCartridge(world.cartridge);
  const ledgerSummary = summarizeLedger(world.ledger);
  const steward = world.cartridge.people?.[0] ?? null;
  const organizationName = world.arc.founding?.organization.name ?? world.arc.meta.name;
  const cellarRecord = [...world.ledger.entries].reverse().find((entry) => entry.challengeId === "cellar") ?? null;
  const hallState = cellarRecord ? `cellar-${cellarRecord.outcome}` : "founded";
  const receiptLoot = record
    ? world.pendingLoot.filter((choice) => choice.sourceChallenge === record.challengeId)
    : [];
  const rewardMemory = record && world.latestReward?.sourceChallenge === record.challengeId
    ? world.latestReward
    : null;

  useEffect(() => {
    document.documentElement.setAttribute("data-cartridge", world.arc.meta.id);
    return () => document.documentElement.removeAttribute("data-cartridge");
  }, [world.arc.meta.id]);

  useEffect(() => {
    saveCheckpoint(localStorage, checkpoint);
    world.setExtension(RODOH_EXPERIENCE_EXTENSION, rodohExperienceExtensionValue(checkpoint));
  }, [checkpoint, world.setExtension]);

  useEffect(() => () => {
    for (const timer of actionTimers.current) window.clearTimeout(timer);
  }, []);

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
    setActionBeat("descent");
    playThresholdCue();
    world.runChallenge(
      challenge.id,
      checkpoint.partyIds,
      checkpoint.difficultyModeId,
      checkpoint.tokensSpent,
    );
    actionTimers.current = [
      window.setTimeout(() => setActionBeat("clash"), 760),
      window.setTimeout(() => setActionBeat("verdict"), 1_650),
      window.setTimeout(() => {
        setCheckpoint((current) => ({
          ...current,
          stage: "receipt",
          ledgerSeq: world.ledger.entries.length,
        }));
        setResolving(false);
      }, 2_700),
    ];
  };

  const returnToHall = () => setCheckpoint(hallCheckpoint(world.cartridgeDigest));

  return (
    <main className="axm-experience" data-testid="axm-experience" data-stage={checkpoint.stage}>
      {isMobile ? (
        <div className="axm-experience__mobile-toolbar" data-testid="mobile-cartridge-toolbar">
          <div>
            <span>Active cartridge</span>
            <strong>{world.arc.meta.name}</strong>
          </div>
          <button
            type="button"
            data-testid="cartridge-object-button"
            aria-label={`Open run record, ${ledgerSummary.entryCount} recorded`}
            onClick={() => setShowRecord(true)}
          >
            <span>Run record</span>
            <b aria-hidden="true">{String(ledgerSummary.entryCount).padStart(2, "0")}</b>
          </button>
        </div>
      ) : (
        <header className="axm-experience__identity" data-testid="program-identity-strip">
          <div>
            <span className="axm-experience__receiver">{t("shell.runtimeName")} WORLD · RECEIVER</span>
            {program && (
              <span data-testid="strip-program" className="axm-experience__program">
                {program.programId.replaceAll("-", " ").toUpperCase()} · {t("boot.programOfRecord")}
              </span>
            )}
            <strong>{world.arc.meta.name}</strong>
          </div>
          <div className="axm-experience__custody">
            <span>ARC LAW</span>
            <code data-testid="strip-digest" title={world.cartridgeDigest}>{world.cartridgeDigest.slice(0, 18)}…</code>
            <span data-testid="strip-ledger">
              {ledgerSummary.entryCount > 0
                ? `${t("shell.identityRecorded", { count: ledgerSummary.entryCount })}${ledgerSummary.lastResult ? ` · ${ledgerSummary.lastResult.challengeName}` : ""}`
                : t("shell.identityFresh")}
            </span>
            <button type="button" data-testid="cartridge-object-button" onClick={() => setShowRecord(true)}>Run record</button>
          </div>
        </header>
      )}

      <section className="axm-experience__stage">
        <div className="axm-experience__atmosphere" aria-hidden="true">
          <span className="axm-experience__moon" />
          <span className="axm-experience__tower" />
          <span className="axm-experience__threshold" />
        </div>

        {resolving && challenge && (
          <div
            className="axm-action"
            data-testid="encounter-action"
            data-beat={actionBeat}
            data-outcome={record?.outcome ?? "resolving"}
            role="status"
            aria-live="polite"
          >
            <div className="axm-action__vault" aria-hidden="true">
              <div className="axm-action__party">
                {world.roster.filter((member) => checkpoint.partyIds.includes(member.id)).map((member) => (
                  <span key={member.id}>
                    <PixelDoll appearance={resolveDollAppearance(theme, member.role)} identity={member.id} state="strain" size={68} />
                    <b>{member.name.split(" ")[0]}</b>
                  </span>
                ))}
              </div>
              <div className="axm-action__rats"><i /><i /><i /><i /><i /></div>
              <div className="axm-action__impact" />
            </div>
            <div className="axm-action__caption">
              <span>{actionBeat === "descent" ? "BEAT 01 · DESCENT" : actionBeat === "clash" ? "BEAT 02 · CONTACT" : "BEAT 03 · CONSEQUENCE"}</span>
              <h2>{actionBeat === "descent"
                ? "Six lanterns enter the dark."
                : actionBeat === "clash"
                  ? challenge.mechanicChecks[0]?.name ?? "The plan meets resistance."
                  : record ? outcomeLabel(record.outcome) : "The ledger is catching up."}</h2>
              <p>{actionBeat === "descent"
                ? `${checkpoint.tokensSpent > 0 ? "One capacity mark steadies the approach." : "No capacity is spent; the founders carry the uncertainty."} The committed party cannot change now.`
                : actionBeat === "clash"
                  ? challenge.mechanicChecks[0]?.description ?? challenge.description
                  : record ? challenge.outcomes[record.outcome].narrative : "Arc is resolving the authored consequence."}</p>
            </div>
          </div>
        )}

        {checkpoint.stage === "hall" && (
          <div className="axm-beat axm-hall" data-testid="hall-scene" data-hall-state={hallState}>
            <div className="axm-beat__eyebrow">{cellarRecord ? "THE FIRST MARK LIVES HERE" : "THE HALL EXISTS NOW"}</div>
            <h1>{organizationName}</h1>
            <p className="axm-beat__lead">
              {cellarRecord
                ? `${outcomeLabel(cellarRecord.outcome)} below the hall. The room, the people, and the next contract now carry that record.`
                : `You are this charter's operator. ${steward?.name ?? "The steward"} keeps the ledger; you choose what this organization risks next.`}
            </p>

            <div className="axm-hall__table">
              <div className="axm-steward" data-testid="hall-npc" data-resolved={cellarRecord ? "true" : "false"}>
                <div className="axm-steward__portrait">
                  {steward
                    ? CartridgeSprite({ arcId: world.arc.meta.id, personId: steward.id, size: 64 })
                      ?? CartridgePortrait({ arcId: world.arc.meta.id, personId: steward.id, size: 54 })
                      ?? steward.name.slice(0, 1)
                    : "W"}
                </div>
                <div>
                  <span data-testid="hall-npc-role">{steward?.role ?? "World steward"}</span>
                  <strong>{steward?.name ?? "The receiver"}</strong>
                  <p data-testid="hall-speech">{cellarRecord
                    ? cellarRecord.outcome === "success"
                      ? "The cellar doors are rehung. I entered the names before the mud dried. The bridge petition is on your table."
                      : "I entered what happened without polishing it. Decide whether we return below or carry the cost forward."
                    : steward?.greeting ?? "The cartridge has founded a runnable organization. Its first contract is waiting."}</p>
                </div>
              </div>

              <div className="axm-roster" aria-label="Founded roster" data-testid="hall-party-bodies">
                {world.roster.map((member) => (
                  <div className="axm-roster__member" key={member.id} data-testid={`founder-${member.id}`}>
                    <PixelDoll appearance={resolveDollAppearance(theme, member.role)} identity={member.id} state={member.downed ? "downed" : "idle"} size={42} />
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                    {member.gear.map((item) => <em key={item.id}>{item.name}</em>)}
                  </div>
                ))}
              </div>
            </div>

            {cellarRecord && (
              <div className="axm-hall__memory" data-testid="changed-hall-memory">
                <span className="axm-hall__ratmark" aria-hidden="true" />
                <div><small>THE HALL REMEMBERS</small><strong>{cellarRecord.consequence.contract.title} · {outcomeLabel(cellarRecord.outcome)}</strong></div>
                <div><small>VISIBLE CHANGE</small><strong>{cellarRecord.outcome === "success" ? "Cellar secured · stores reopened" : "Cellar watch maintained · supplies moved upstairs"}</strong></div>
                {world.latestReward && <div><small>YOUR PRECEDENT</small><strong>{world.latestReward.itemName} → {world.latestReward.agentName}</strong></div>}
              </div>
            )}

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
                {world.latestReward && next.challengeId !== world.latestReward.sourceChallenge && (
                  <div className="axm-contract__carry" data-testid="carried-consequence">
                    <span>CARRIED FORWARD</span>
                    <strong>{world.latestReward.agentName} enters with {world.latestReward.itemName}</strong>
                    <small>The Arc will include its bonuses and remember your {world.latestReward.decisionBasis} precedent.</small>
                  </div>
                )}
                <PixelButton data-testid="hall-enter-contract" variant="action" onClick={enterBriefing}>
                  Take {next.title}
                </PixelButton>
                {cellarRecord && (
                  <PixelButton data-testid="enter-rodoh-runtime" variant="secondary" onClick={onEnterRuntime}>
                    Open the full Rodoh world
                  </PixelButton>
                )}
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
                      return `Check weighting · ${attribute?.name ?? weight.attributeId} ${Math.round(weight.weight * 100)}%`;
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
                        <span>
                          <strong>{member.name}</strong>
                          <small>{member.role}{member.gear.length > 0 ? ` · ${member.gear.map((item) => item.name).join(", ")}` : ""}</small>
                        </span>
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
                      <span><strong>Commit 1 capacity mark</strong><small>Spend one Contract resource to tighten roll variance. The check still uses Power; success is not guaranteed.</small></span>
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
                <section className="axm-receipt__aftermath" data-testid="founder-aftermath">
                  <div>
                    <span>ARC-AUTHORED AFTERMATH</span>
                    <p>{challenge?.outcomes[record.outcome].narrative ?? `${record.challengeName} is now part of the charter's record.`}</p>
                  </div>
                  <div className="axm-receipt__reactions">
                    {record.consequence.party.members.slice(0, 3).map((member) => {
                      const current = world.roster.find((candidate) => candidate.id === member.id);
                      return (
                        <article key={member.id}>
                          <strong>{member.name}</strong>
                          <span>{current ? `${current.morale} morale · ${current.stress} stress` : member.role}</span>
                        </article>
                      );
                    })}
                  </div>
                </section>

                {receiptLoot.map((choice) => (
                  <section className="axm-reward-choice" data-testid="reward-choice" key={choice.id}>
                    <div className="axm-reward-choice__item">
                      <span>THE FIND CHANGES SOMEONE</span>
                      <h2>Who carries the {choice.itemName}?</h2>
                      <p>{choice.flavorText}</p>
                      <strong>{Object.entries(choice.bonuses).map(([name, value]) => `+${value} ${name}`).join(" · ")}</strong>
                      <small>Arc will equip it, record your precedent, and apply any morale consequence. This choice is required and survives reload.</small>
                    </div>
                    <div className="axm-reward-choice__candidates">
                      {choice.eligibleAgents.map((candidate) => {
                        const member = world.roster.find((entry) => entry.id === candidate.id);
                        return (
                          <button type="button" key={candidate.id} onClick={() => world.claimLoot(choice.id, candidate.id)} data-testid={`reward-candidate-${candidate.id}`}>
                            <PixelDoll appearance={resolveDollAppearance(theme, candidate.role)} identity={candidate.id} state="idle" size={38} />
                            <span><strong>{candidate.name}{candidate.id === choice.recommendedAgentId ? " · Recommended fit" : ""}</strong><small>{candidate.role} · {member?.morale ?? "?"} morale{candidate.id === choice.recommendedAgentId && choice.recommendationReason ? ` · ${choice.recommendationReason}` : ""}</small></span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {rewardMemory && receiptLoot.length === 0 && (
                  <section className="axm-reward-memory" data-testid="reward-memory">
                    <span>YOUR DECISION ENTERED THE CHARTER</span>
                    <h2>{rewardMemory.agentName} carries {rewardMemory.itemName}.</h2>
                    <p>Arc recorded this as a {rewardMemory.decisionBasis} precedent. The item is equipped, its bonuses are live, and the next contract will receive that changed founder.</p>
                    {world.lastEquip?.moraleChanges.map((change) => (
                      <small key={change.agentId}>{change.agentName}: morale {change.before} → {change.after}</small>
                    ))}
                  </section>
                )}

                {receiptLoot.length > 0 && (
                  <div className="axm-receipt__pending" data-testid="pending-loot-held">
                    Choose a carrier before leaving. The unresolved decision is already held in the exact save.
                  </div>
                )}
              </>
            )}
            <div className="axm-receipt__actions">
              <PixelButton variant="action" data-testid="encs-leave" onClick={returnToHall} disabled={receiptLoot.length > 0}>Return to the changed Hall</PixelButton>
              <PixelButton variant="secondary" onClick={onExit} disabled={receiptLoot.length > 0}>Carry this run to the cartridge shelf</PixelButton>
            </div>
          </div>
        )}
      </section>

      <footer className="axm-experience__footer">
        <span data-testid="save-health"><i className={world.saveStatus.ok ? "is-live" : ""} /> {world.saveStatus.ok ? "Exact local save" : "Unsaved — export recovery available"}</span>
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
            {!world.saveStatus.ok && (
              <p role="alert" data-testid="save-failure">{world.saveStatus.message}</p>
            )}
            <div className="axm-record__actions">
              <PixelButton variant="secondary" data-testid="export-exact-run" onClick={() => downloadPortableRun(world.buildExport())}>Export exact run</PixelButton>
              <PixelButton variant="secondary" onClick={() => setShowRecord(false)}>Resume</PixelButton>
              <PixelButton variant="danger" onClick={onExit}>Leave</PixelButton>
            </div>
          </PixelPanel>
        </div>
      )}
    </main>
  );
}
