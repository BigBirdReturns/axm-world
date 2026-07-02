import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Challenge } from "../../engine/types.js";
import type { WorldNode } from "../contract.js";
import { PixelContractCard, PixelIcon, type ContractCardState, type PixelIconName } from "../pixel-ui/index.js";
import type { ArcInteraction } from "../useArcInteraction.js";
import type { ArcWorld } from "../useArcWorld.js";
import type { CheckStatus, PartyReadiness } from "../readiness.js";
import { attrIcon, roleIcon, itemIcon } from "../theme-icons.js";
import { t } from "../i18n/index.js";
import { unlockEdges } from "./adjacency.js";
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
  if (!readiness.countOk) return readiness.reasons[0] ?? t("contractBoard.countNeedsWork");
  if (!readiness.rolesOk) return readiness.reasons[0] ?? t("contractBoard.roleMissing");
  const weak = [...readiness.checks].sort((a, b) => {
    const severity = (s: CheckStatus) => (s === "short" ? 2 : s === "thin" ? 1 : 0);
    return severity(b.status) - severity(a.status) || b.shortBy - a.shortBy;
  })[0];
  if (!weak || weak.status === "ready") return null;
  if (weak.status === "thin") return t("contractBoard.needsBuffer", { name: weak.name, n: scoreText(weak.shortBy) });
  return t("contractBoard.needsRecover", { name: weak.name, n: scoreText(weak.shortBy) });
}

// Lane names come from the loaded arc's own progression tiers — never invented here.
// A tier index past what the arc defines (or a cartridge with no progressionTiers
// entries) falls back to a domain-neutral "Chapter N" label.
function laneTitle(tierIndex: number, world: ArcWorld): string {
  return world.arc.progressionTiers[tierIndex]?.name ?? t("contractBoard.chapterFallback", { n: tierIndex + 1 });
}

/** An available contract left unaddressed this many cycles starts signalling. */
const ESCALATION_AFTER_CYCLES = 2;

// §2 escalation signal. Derived, not invented: availableSinceCycle comes from the
// same success records that drive node status (see play-pipeline/compile.ts).
function cyclesWaiting(node: WorldNode, currentCycle: number): number | null {
  if (node.status !== "available" || node.availableSinceCycle === null) return null;
  return Math.max(0, currentCycle - node.availableSinceCycle);
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
      readyNote={readiness?.projectedOutcome === "success" ? <><PixelIcon name="reliable" /> {t("contractBoard.recommendedReliable")}</> : undefined}
      footerLeft={req ? t("contractBoard.partyRange", { min: req.minAgents, max: req.maxAgents }) : t("contractBoard.party")}
      footerRight={rewards.length > 0 ? rewards.map((item) => <PixelIcon key={item.name} name={item.icon} label={item.name} />) : undefined}
      onClick={() => onSelect(node.challengeId)}
    />
  );
}

interface EdgeLine {
  key: string;
  path: string;
  arrow: string;
  /** The unlocking contract is already cleared. The gate is satisfied. */
  satisfied: boolean;
  /** The gated contract is still locked. Draw as a pending dashed link. */
  pending: boolean;
}

function edgeGeometry(from: DOMRect, to: DOMRect, board: DOMRect): { path: string; arrow: string } {
  let x1: number, y1: number, x2: number, y2: number;
  let c1x: number, c1y: number, c2x: number, c2y: number;
  if (to.left >= from.right - 2) {
    x1 = from.right; y1 = from.top + from.height / 2;
    x2 = to.left; y2 = to.top + to.height / 2;
    const k = Math.min(90, Math.max(24, Math.abs(x2 - x1) * 0.45));
    c1x = x1 + k; c1y = y1; c2x = x2 - k; c2y = y2;
  } else if (from.left >= to.right - 2) {
    x1 = from.left; y1 = from.top + from.height / 2;
    x2 = to.right; y2 = to.top + to.height / 2;
    const k = Math.min(90, Math.max(24, Math.abs(x2 - x1) * 0.45));
    c1x = x1 - k; c1y = y1; c2x = x2 + k; c2y = y2;
  } else if (to.top >= from.bottom) {
    x1 = from.left + from.width / 2; y1 = from.bottom;
    x2 = to.left + to.width / 2; y2 = to.top;
    const k = Math.min(70, Math.max(20, Math.abs(y2 - y1) * 0.45));
    c1x = x1; c1y = y1 + k; c2x = x2; c2y = y2 - k;
  } else {
    x1 = from.left + from.width / 2; y1 = from.top;
    x2 = to.left + to.width / 2; y2 = to.bottom;
    const k = Math.min(70, Math.max(20, Math.abs(y2 - y1) * 0.45));
    c1x = x1; c1y = y1 - k; c2x = x2; c2y = y2 + k;
  }
  x1 -= board.left; y1 -= board.top; x2 -= board.left; y2 -= board.top;
  c1x -= board.left; c1y -= board.top; c2x -= board.left; c2y -= board.top;

  const ang = Math.atan2(y2 - c2y, x2 - c2x);
  const a = 7;
  const ax1 = x2 - a * Math.cos(ang) + a * 0.55 * Math.cos(ang + Math.PI / 2);
  const ay1 = y2 - a * Math.sin(ang) + a * 0.55 * Math.sin(ang + Math.PI / 2);
  const ax2 = x2 - a * Math.cos(ang) + a * 0.55 * Math.cos(ang - Math.PI / 2);
  const ay2 = y2 - a * Math.sin(ang) + a * 0.55 * Math.sin(ang - Math.PI / 2);

  return {
    path: `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    arrow: `M ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ax1.toFixed(1)} ${ay1.toFixed(1)} L ${ax2.toFixed(1)} ${ay2.toFixed(1)} Z`,
  };
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

  // Locked to unlocking adjacency, derived from the engine's own milestone links.
  const edges = useMemo(() => unlockEdges(world.nodes, world.arc.challenges), [world.nodes, world.arc.challenges]);
  const statusById = useMemo(() => new Map(world.nodes.map((n) => [n.challengeId, n.status])), [world.nodes]);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const cardEls = useRef(new Map<string, HTMLDivElement>());
  const [lines, setLines] = useState<EdgeLine[]>([]);

  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const bRect = board.getBoundingClientRect();
    const next: EdgeLine[] = [];
    for (const edge of edges) {
      const fromEl = cardEls.current.get(edge.fromChallengeId);
      const toEl = cardEls.current.get(edge.toChallengeId);
      if (!fromEl || !toEl) continue;
      const { path, arrow } = edgeGeometry(fromEl.getBoundingClientRect(), toEl.getBoundingClientRect(), bRect);
      next.push({
        key: `${edge.fromChallengeId}->${edge.toChallengeId}`,
        path,
        arrow,
        satisfied: statusById.get(edge.fromChallengeId) === "cleared",
        pending: statusById.get(edge.toChallengeId) === "locked",
      });
    }
    setLines(next);
  }, [edges, statusById]);

  useLayoutEffect(() => {
    measure();
    const board = boardRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : null;
    if (board && ro) ro.observe(board);
    window.addEventListener("resize", measure);
    // Re-measure once webfonts settle: card heights shift slightly when the pixel font loads.
    let cancelled = false;
    document.fonts?.ready.then(() => { if (!cancelled) measure(); });
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <section className="contract-board-shell" data-testid="contract-board" aria-label={t("contractBoard.title")} aria-disabled={modalOpen ? "true" : undefined}>
      <header className="contract-board-header">
        <div>
          <span className="pixel-eyebrow">{t("contractBoard.title")}</span>
          <h2>{t("contractBoard.heading")}</h2>
        </div>
        <p>{t("contractBoard.explainer")}</p>
      </header>
      <div className="contract-board" ref={boardRef}>
        <svg className="contract-board-adjacency" data-testid="board-adjacency" aria-hidden="true">
          {lines.map((line) => (
            <g key={line.key} stroke={line.satisfied ? "var(--teal)" : "var(--stone)"} fill={line.satisfied ? "var(--teal)" : "var(--stone)"}>
              <path d={line.path} fill="none" strokeWidth={2} strokeDasharray={line.pending ? "6 4" : undefined} opacity={0.9} />
              <path d={line.arrow} stroke="none" opacity={0.9} />
            </g>
          ))}
        </svg>
        {lanes.map((lane) => (
          <section className="contract-lane" key={lane.tierIndex} aria-label={laneTitle(lane.tierIndex, world)}>
            <div className="contract-lane__title">
              <span>{laneTitle(lane.tierIndex, world)}</span>
              <small>{lane.nodes.length}</small>
            </div>
            <div className="contract-lane__cards">
              {lane.nodes.map((node) => {
                const waiting = cyclesWaiting(node, world.cycle);
                const escalated = waiting !== null && waiting >= ESCALATION_AFTER_CYCLES;
                return (
                  <div
                    key={node.id}
                    className={`contract-board-cardwrap${escalated ? " contract-board-cardwrap--escalated" : ""}`}
                    data-contract-board-card-id={node.challengeId}
                    data-testid={`contract-board-cardwrap-${node.challengeId}`}
                    ref={(el) => {
                      if (el) cardEls.current.set(node.challengeId, el);
                      else cardEls.current.delete(node.challengeId);
                    }}
                  >
                    {escalated && (
                      <span
                        className="contract-board-escalation"
                        data-testid="escalation-signal"
                        title={t("contractBoard.waitingTitle", { since: node.availableSinceCycle ?? 0, n: waiting })}
                      >
                        {t("contractBoard.waitingCycles", { n: waiting })}
                      </span>
                    )}
                    <ContractLocationCard
                      node={node}
                      world={world}
                      selected={interaction.selectedId === node.challengeId}
                      onSelect={(id) => interaction.select(interaction.selectedId === id ? null : id)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
