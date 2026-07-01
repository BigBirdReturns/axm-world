import { useMemo } from "react";
import type { Challenge } from "../../engine/types.js";
import type { WorldNode } from "../contract.js";
import { PixelContractCard, PixelIcon, type ContractCardState, type PixelIconName } from "../pixel-ui/index.js";
import type { ArcInteraction } from "../useArcInteraction.js";
import type { ArcWorld } from "../useArcWorld.js";
import type { CheckStatus, PartyReadiness } from "../readiness.js";
import "./contract-board.css";

export interface ContractBoardSceneProps {
  world: ArcWorld;
  interaction: ArcInteraction;
  modalOpen?: boolean;
  active?: boolean;
}

function outcomeState(readiness: PartyReadiness | null): "reliable" | "risky" | "failing" | "available" {
  if (!readiness || readiness.projectedOutcome === "none") return "available";
  if (readiness.projectedOutcome === "success") return "reliable";
  if (readiness.projectedOutcome === "partial") return "risky";
  return "failing";
}

function nodeState(node: WorldNode, selected: boolean, readiness: PartyReadiness | null): ContractCardState {
  if (selected) return "selected";
  if (node.status === "locked") return "locked";
  if (node.status === "cleared") return "recorded";
  return outcomeState(readiness);
}

function attrIcon(id: string): PixelIconName {
  if (id === "power" || id === "Power") return "power";
  if (id === "mettle" || id === "Mettle") return "mettle";
  if (id === "wits" || id === "Wits") return "wits";
  if (id === "spirit" || id === "Spirit") return "spirit";
  return "available";
}

function roleIcon(name: string): PixelIconName {
  if (name.toLowerCase().includes("vanguard")) return "vanguard";
  if (name.toLowerCase().includes("skirmisher")) return "skirmisher";
  if (name.toLowerCase().includes("mender")) return "mender";
  return "selected";
}

function itemIcon(name: string): PixelIconName {
  const key = name.toLowerCase();
  if (key.includes("blade") || key.includes("pick")) return "rustyBlade";
  if (key.includes("charm") || key.includes("favor") || key.includes("seal") || key.includes("trophy")) return "guardCharm";
  if (key.includes("satchel") || key.includes("cloak") || key.includes("pauldron")) return "fieldSatchel";
  return "lootAvailable";
}

function scoreText(value: number | undefined): string {
  if (value === undefined) return "";
  return String(Math.round(value * 10) / 10);
}

function shortDescription(text: string): string {
  const first = text.split(/[.!?]/)[0]?.trim() ?? text;
  return first.length > 96 ? `${first.slice(0, 93)}…` : first;
}

function challengeFor(world: ArcWorld, challengeId: string): Challenge | null {
  return world.arc.challenges.find((c) => c.id === challengeId) ?? null;
}

function rewardPreview(challenge: Challenge | null, world: ArcWorld): Array<{ name: string; icon: PixelIconName }> {
  if (!challenge) return [];
  const tables = [challenge.outcomes.success.rewardTable, challenge.outcomes.partial.rewardTable, challenge.outcomes.failure.rewardTable].flat();
  const ids = [...new Set(tables.map((r) => r.itemId))].slice(0, 2);
  return ids.map((id) => {
    const item = world.arc.items.find((it) => it.id === id);
    const name = item?.name ?? id;
    return { name, icon: itemIcon(name) };
  });
}

function strongestWeakness(readiness: PartyReadiness | null): string | null {
  if (!readiness) return null;
  if (!readiness.countOk) return readiness.reasons[0] ?? "Party count needs work.";
  if (!readiness.rolesOk) return readiness.reasons[0] ?? "A required role is missing.";
  const weak = [...readiness.checks].sort((a, b) => {
    const severity = (s: CheckStatus) => (s === "short" ? 2 : s === "thin" ? 1 : 0);
    return severity(b.status) - severity(a.status) || b.shortBy - a.shortBy;
  })[0];
  if (!weak || weak.status === "ready") return null;
  if (weak.status === "thin") return `${weak.name} needs +${scoreText(weak.shortBy)} buffer.`;
  return `${weak.name} needs +${scoreText(weak.shortBy)} to recover.`;
}

function laneTitle(tierIndex: number): string {
  return tierIndex === 0 ? "Opening Work" : tierIndex === 1 ? "First Pressure" : tierIndex === 2 ? "Escalation" : `Chapter ${tierIndex + 1}`;
}

function ContractLocationCard(props: {
  node: WorldNode;
  world: ArcWorld;
  selected: boolean;
  onSelect: (id: string) => void;
}): JSX.Element {
  const { node, world, selected, onSelect } = props;
  const challenge = challengeFor(world, node.challengeId);
  const recommended = node.status === "available" ? world.recommendedParty(node.challengeId) : [];
  const readiness = node.status === "available" ? world.evaluateParty(node.challengeId, recommended) : null;
  const contract = world.describeContract(node.challengeId);
  const state = nodeState(node, selected, readiness);
  const rewards = rewardPreview(challenge, world);
  const weak = strongestWeakness(readiness);
  const req = challenge?.rosterRequirements;

  const requirements = node.status === "locked" ? null : (
    <>
      {contract?.roles.slice(0, 2).map((r) => (
        <span key={r.roleId} className="pixel-contract-card__pill"><PixelIcon name={roleIcon(r.roleName)} /> {r.count} {r.roleName}</span>
      ))}
      {contract?.checkedAttributes.slice(0, 3).map((a) => (
        <span key={a.id} className="pixel-contract-card__pill"><PixelIcon name={attrIcon(a.id)} /> {a.name}</span>
      ))}
    </>
  );

  return (
    <PixelContractCard
      data-testid={`contract-board-card-${node.challengeId}`}
      state={state}
      selected={selected}
      difficulty={node.difficulty}
      title={node.title}
      description={shortDescription(node.description)}
      unlockRequirements={node.requirements}
      requirements={requirements}
      riskNote={weak ? <><PixelIcon name={state === "failing" ? "failing" : "risky"} /> {weak}</> : undefined}
      readyNote={readiness?.projectedOutcome === "success" ? <><PixelIcon name="reliable" /> Recommended party is reliable.</> : undefined}
      footerLeft={req ? `Party ${req.minAgents}${req.maxAgents !== req.minAgents ? `–${req.maxAgents}` : ""}` : "Party"}
      footerRight={rewards.length > 0 ? rewards.map((item) => <PixelIcon key={item.name} name={item.icon} label={item.name} />) : undefined}
      onClick={() => onSelect(node.challengeId)}
    />
  );
}

export function ContractBoardScene({ world, interaction, modalOpen = false }: ContractBoardSceneProps): JSX.Element {
  const lanes = useMemo(() => {
    const groups = new Map<number, WorldNode[]>();
    for (const node of world.nodes) {
      const existing = groups.get(node.tierIndex) ?? [];
      existing.push(node);
      groups.set(node.tierIndex, existing);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([tierIndex, nodes]) => ({
      tierIndex,
      nodes: [...nodes].sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title)),
    }));
  }, [world.nodes]);

  return (
    <section className="contract-board-shell" data-testid="contract-board" aria-label="Contract Board" aria-disabled={modalOpen ? "true" : undefined}>
      <header className="contract-board-header">
        <div>
          <span className="pixel-eyebrow">Contract Board</span>
          <h2>Choose the next place</h2>
        </div>
        <p>Cards show what is available, what is locked, what is risky, and what the cartridge has recorded.</p>
      </header>
      <div className="contract-board">
        {lanes.map((lane) => (
          <section className="contract-lane" key={lane.tierIndex} aria-label={laneTitle(lane.tierIndex)}>
            <div className="contract-lane__title">
              <span>{laneTitle(lane.tierIndex)}</span>
              <small>{lane.nodes.length}</small>
            </div>
            <div className="contract-lane__cards">
              {lane.nodes.map((node) => (
                <ContractLocationCard
                  key={node.id}
                  node={node}
                  world={world}
                  selected={interaction.selectedId === node.challengeId}
                  onSelect={interaction.select}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
