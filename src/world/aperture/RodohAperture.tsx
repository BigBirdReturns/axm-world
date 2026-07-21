import { useCallback, useEffect, useMemo, useState } from "react";
import type { LedgerEntry } from "../ledger.js";
import type { SceneProps } from "../presentations.js";
import type { RosterMember } from "../useArcWorld.js";
import type { WorldNode } from "../contract.js";
import {
  semanticLevelForScale,
  selectBudgetedItems,
  stableRingPosition,
  type ApertureLevel,
} from "./vendor/aperture-kit-core.mjs";
import {
  buildApertureKitUrl,
  readApertureKitState,
  type ApertureKitState,
  type ApertureMode,
} from "./vendor/aperture-kit-state.mjs";
import { GodscarPocketPanel } from "./GodscarPocketPanel.js";
import "./rodoh-aperture.css";

const URL_PREFIX = "rodoh_ap_";

interface MapItem {
  id: string;
  kind: "cartridge" | "tier" | "contract" | "receipt";
  label: string;
  note: string;
  status?: WorldNode["status"] | LedgerEntry["outcome"];
  challengeId?: string;
  receiptSeq?: number;
}

interface SurfacePerson {
  id: string;
  name: string;
  role: string;
  morale: number | null;
  stress: number | null;
  gear: string[];
  participated: boolean;
  recommended: boolean;
}

function initialState(): ApertureKitState {
  if (typeof window !== "undefined") {
    const restored = readApertureKitState(window.location.search, URL_PREFIX);
    if (restored) return restored;
  }
  return {
    version: "1",
    mode: "map",
    scale: 1,
    level: "corpus",
    focus: null,
    query: "",
    budget: 18,
    pins: [],
  };
}

function outcomeLabel(outcome: LedgerEntry["outcome"]): string {
  return outcome === "success" ? "Cleared" : outcome === "partial" ? "Partial" : "Failed";
}

function levelLabel(level: ApertureLevel): string {
  if (level === "corpus") return "Cartridge";
  if (level === "machine") return "Campaign";
  if (level === "surface") return "Contracts";
  return "Receipts";
}

function focusContractId(focus: string | null): string | null {
  if (!focus?.startsWith("contract:")) return null;
  return focus.slice("contract:".length) || null;
}

function focusReceiptSeq(focus: string | null): number | null {
  if (!focus?.startsWith("receipt:")) return null;
  const value = Number(focus.slice("receipt:".length));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function tierName(world: SceneProps["world"], tierIndex: number): string {
  return world.arc.progressionTiers[tierIndex]?.name ?? `Chapter ${tierIndex + 1}`;
}

function mapItemsForLevel(world: SceneProps["world"], level: ApertureLevel): MapItem[] {
  if (level === "corpus") {
    return [{
      id: `cartridge:${world.cartridgeDigest}`,
      kind: "cartridge",
      label: world.arc.meta.name,
      note: `${world.clearedCount}/${world.totalNodes} contracts recorded`,
    }];
  }

  if (level === "machine") {
    const tierIndexes = [...new Set(world.nodes.map((node) => node.tierIndex))].sort((a, b) => a - b);
    return tierIndexes.map((tierIndex) => {
      const nodes = world.nodes.filter((node) => node.tierIndex === tierIndex);
      const cleared = nodes.filter((node) => node.status === "cleared").length;
      return {
        id: `tier:${tierIndex}`,
        kind: "tier" as const,
        label: tierName(world, tierIndex),
        note: `${cleared}/${nodes.length} recorded`,
      };
    });
  }

  if (level === "surface" || world.ledger.entries.length === 0) {
    return [...world.nodes]
      .sort((left, right) => left.tierIndex - right.tierIndex || left.difficulty - right.difficulty || left.challengeId.localeCompare(right.challengeId))
      .map((node) => ({
        id: `contract:${node.challengeId}`,
        kind: "contract" as const,
        label: node.title,
        note: `${tierName(world, node.tierIndex)} · ${node.status}`,
        status: node.status,
        challengeId: node.challengeId,
      }));
  }

  return [...world.ledger.entries]
    .sort((left, right) => left.seq - right.seq)
    .map((entry) => ({
      id: `receipt:${entry.seq}`,
      kind: "receipt" as const,
      label: entry.challengeName,
      note: `Receipt #${entry.seq + 1} · ${outcomeLabel(entry.outcome)}`,
      status: entry.outcome,
      challengeId: entry.challengeId,
      receiptSeq: entry.seq,
    }));
}

function linkedRecord(world: SceneProps["world"], challengeId: string | null): LedgerEntry | null {
  if (!challengeId) return null;
  for (let index = world.ledger.entries.length - 1; index >= 0; index -= 1) {
    const entry = world.ledger.entries[index];
    if (entry?.challengeId === challengeId) return entry;
  }
  return null;
}

function surfacePeople(
  world: SceneProps["world"],
  challengeId: string | null,
  record: LedgerEntry | null,
): SurfacePerson[] {
  const currentById = new Map(world.roster.map((member) => [member.id, member]));
  const recommended = new Set(challengeId ? world.recommendedParty(challengeId) : []);
  const participated = new Set(record?.consequence.party.members.map((member) => member.id) ?? []);
  const source: RosterMember[] = world.roster;
  return source.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    morale: currentById.get(member.id)?.morale ?? null,
    stress: currentById.get(member.id)?.stress ?? null,
    gear: member.gear.map((item) => item.name),
    participated: participated.has(member.id),
    recommended: recommended.has(member.id),
  }));
}

function itemStatusClass(item: MapItem): string {
  if (item.status === "cleared" || item.status === "success") return "is-recorded";
  if (item.status === "available") return "is-available";
  if (item.status === "locked") return "is-locked";
  if (item.status === "partial") return "is-partial";
  if (item.status === "failure") return "is-failed";
  return "";
}

function MapProjection(props: {
  world: SceneProps["world"];
  interaction: SceneProps["interaction"];
  state: ApertureKitState;
  onFocus: (focus: string) => void;
}): JSX.Element {
  const { world, interaction, state, onFocus } = props;
  const items = useMemo(() => mapItemsForLevel(world, state.level), [state.level, world]);
  const centerItem: MapItem = state.level === "corpus"
    ? items[0]!
    : {
        id: `cartridge:${world.cartridgeDigest}`,
        kind: "cartridge",
        label: world.arc.meta.name,
        note: levelLabel(state.level),
      };

  const ringItems = state.level === "corpus" ? [] : items;
  return (
    <div className="rodoh-aperture__map" data-level={state.level} data-testid="aperture-map">
      <div className="rodoh-aperture__orbit" aria-hidden="true" />
      <button
        type="button"
        className="rodoh-aperture__center"
        data-focus={state.focus === centerItem.id}
        onClick={() => onFocus(centerItem.id)}
      >
        <small>{levelLabel(state.level)}</small>
        <strong>{centerItem.label}</strong>
        <span>{centerItem.note}</span>
      </button>
      {ringItems.map((item, index) => {
        const point = stableRingPosition(index, ringItems.length, 50, 49, 36, 31);
        const selected = state.focus === item.id
          || (item.challengeId !== undefined && interaction.selectedId === item.challengeId);
        return (
          <button
            type="button"
            key={item.id}
            className={`rodoh-aperture__node ${itemStatusClass(item)}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            data-kind={item.kind}
            data-selected={selected}
            data-testid={`aperture-${item.kind}-${item.challengeId ?? item.receiptSeq ?? index}`}
            onClick={() => {
              if (item.challengeId) interaction.select(item.challengeId);
              onFocus(item.id);
            }}
          >
            <span aria-hidden="true">{item.kind === "tier" ? "T" : item.kind === "receipt" ? "R" : "◆"}</span>
            <strong>{item.label}</strong>
            <small>{item.note}</small>
          </button>
        );
      })}
    </div>
  );
}

function TraceProjection(props: {
  world: SceneProps["world"];
  interaction: SceneProps["interaction"];
  state: ApertureKitState;
  onFocus: (focus: string) => void;
}): JSX.Element {
  const { world, interaction, state, onFocus } = props;
  const requested = focusContractId(state.focus) ?? interaction.selectedId;
  const node = world.nodes.find((candidate) => candidate.challengeId === requested)
    ?? world.nodes.find((candidate) => candidate.status === "available")
    ?? world.nodes[0]
    ?? null;
  const record = linkedRecord(world, node?.challengeId ?? null);
  const challenge = node ? world.arc.challenges.find((candidate) => candidate.id === node.challengeId) ?? null : null;
  const tier = node ? world.arc.progressionTiers[node.tierIndex] ?? null : null;
  const requirements = node?.requirements ?? [];

  return (
    <div className="rodoh-aperture__trace" data-testid="aperture-trace">
      <aside className="rodoh-aperture__trace-list" aria-label="Authored contracts">
        {world.nodes.map((candidate) => (
          <button
            type="button"
            key={candidate.challengeId}
            data-selected={candidate.challengeId === node?.challengeId}
            onClick={() => {
              interaction.select(candidate.challengeId);
              onFocus(`contract:${candidate.challengeId}`);
            }}
          >
            <span>{candidate.status}</span>
            <strong>{candidate.title}</strong>
          </button>
        ))}
      </aside>
      <section className="rodoh-aperture__trace-chain">
        {!node ? (
          <p>This cartridge has no authored contracts.</p>
        ) : (
          <>
            <div className="rodoh-aperture__trace-fact">
              <small>AUTHORED IDENTITY</small>
              <strong>{world.arc.meta.name}</strong>
              <code>{world.cartridgeDigest.slice(0, 24)}…</code>
            </div>
            <i aria-hidden="true">↓</i>
            <div className="rodoh-aperture__trace-fact">
              <small>AUTHORED CAMPAIGN REGION</small>
              <strong>{tier?.name ?? tierName(world, node.tierIndex)}</strong>
              <span>{tier?.flavorText ?? `Progression tier ${node.tierIndex + 1}`}</span>
            </div>
            <i aria-hidden="true">↓</i>
            <div className="rodoh-aperture__trace-fact" data-status={node.status}>
              <small>CONTRACT · {node.status.toUpperCase()}</small>
              <strong>{node.title}</strong>
              <span>{challenge?.description ?? node.description}</span>
              {requirements.length > 0 ? (
                <ul>{requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
              ) : (
                <p>No unsatisfied authored gate is reported by the engine.</p>
              )}
            </div>
            <i aria-hidden="true">↓</i>
            <div className="rodoh-aperture__trace-fact" data-status={record?.outcome ?? "unrecorded"}>
              <small>RUN EVIDENCE</small>
              {record ? (
                <>
                  <strong>Receipt #{record.seq + 1} · {outcomeLabel(record.outcome)}</strong>
                  <span>{record.consequence.worldChanges.map((change) => change.label).join(" · ") || "The result is recorded."}</span>
                </>
              ) : (
                <>
                  <strong>No receipt yet</strong>
                  <span>The runtime will not fabricate an outcome or path before the engine records one.</span>
                </>
              )}
            </div>
            <p className="rodoh-aperture__honesty">Authorship and receipt trace only. This view never invents travel, causation, or agency that the cartridge does not author.</p>
          </>
        )}
      </section>
    </div>
  );
}

function SurfaceProjection(props: {
  world: SceneProps["world"];
  interaction: SceneProps["interaction"];
  state: ApertureKitState;
  onState: (patch: Partial<ApertureKitState>) => void;
  onFocus: (focus: string) => void;
}): JSX.Element {
  const { world, interaction, state, onState, onFocus } = props;
  const requested = focusContractId(state.focus) ?? interaction.selectedId;
  const node = world.nodes.find((candidate) => candidate.challengeId === requested)
    ?? world.nodes.find((candidate) => candidate.status === "available")
    ?? world.nodes[0]
    ?? null;
  const challengeId = node?.challengeId ?? null;
  const challenge = challengeId ? world.arc.challenges.find((candidate) => candidate.id === challengeId) ?? null : null;
  const record = linkedRecord(world, challengeId);
  const people = useMemo(() => surfacePeople(world, challengeId, record), [challengeId, record, world]);
  const selection = useMemo(() => selectBudgetedItems(people, {
    query: state.query,
    budget: state.budget,
    pinnedIds: state.pins,
    idFor: (person) => person.id,
    textFor: (person) => `${person.name} ${person.role} ${person.gear.join(" ")}`,
    compare: (left, right) => Number(right.participated) - Number(left.participated)
      || Number(right.recommended) - Number(left.recommended)
      || left.name.localeCompare(right.name),
  }), [people, state.budget, state.pins, state.query]);

  const togglePin = (id: string) => {
    onState({ pins: state.pins.includes(id) ? state.pins.filter((pin) => pin !== id) : [...state.pins, id] });
  };

  return (
    <div className="rodoh-aperture__surface" data-testid="aperture-surface">
      <aside className="rodoh-aperture__surface-contracts">
        <label>
          Bounded surface
          <select
            value={challengeId ?? ""}
            onChange={(event) => {
              interaction.select(event.target.value);
              onFocus(`contract:${event.target.value}`);
            }}
          >
            {world.nodes.map((candidate) => <option key={candidate.challengeId} value={candidate.challengeId}>{candidate.title}</option>)}
          </select>
        </label>
        <div>
          <small>{node?.status ?? "empty"}</small>
          <h2>{node?.title ?? "No authored surface"}</h2>
          <p>{challenge?.description ?? "This cartridge has no contract to inspect."}</p>
        </div>
        <label>
          Search people
          <input value={state.query} onChange={(event) => onState({ query: event.target.value })} placeholder="name, role, gear" />
        </label>
        <label>
          Visible budget · {state.budget}
          <input type="range" min={6} max={36} value={state.budget} onChange={(event) => onState({ budget: Number(event.target.value) })} />
        </label>
        <p>{selection.visible.length} shown · {selection.hiddenByBudget} budget-hidden · {selection.filteredOut} query-filtered</p>
      </aside>

      <section className="rodoh-aperture__surface-roster" aria-label="Bounded surface participants">
        {selection.visible.map((person) => (
          <article key={person.id} data-pinned={state.pins.includes(person.id)} data-participated={person.participated}>
            <button type="button" onClick={() => togglePin(person.id)} aria-pressed={state.pins.includes(person.id)} title="Keep this person visible">
              {state.pins.includes(person.id) ? "PINNED" : "PIN"}
            </button>
            <small>{person.participated ? "CARRIED THIS RECEIPT" : person.recommended ? "ENGINE RECOMMENDATION" : "AVAILABLE PERSON"}</small>
            <strong>{person.name}</strong>
            <span>{person.role}</span>
            <dl>
              <div><dt>Morale</dt><dd>{person.morale ?? "—"}</dd></div>
              <div><dt>Stress</dt><dd>{person.stress ?? "—"}</dd></div>
            </dl>
            {person.gear.length > 0 && <p>{person.gear.join(" · ")}</p>}
          </article>
        ))}
      </section>

      <aside className="rodoh-aperture__surface-receipt">
        <small>{record ? `RECEIPT #${record.seq + 1}` : "AUTHORED OBJECTIVES"}</small>
        <h3>{record ? outcomeLabel(record.outcome) : "Not yet resolved"}</h3>
        <ul>
          {(record?.consequence.objectives ?? challenge?.mechanicChecks.map((check) => ({ id: check.id, label: check.name, status: "unresolved" as const })) ?? [])
            .map((objective) => <li key={objective.id}><span>{objective.label}</span><b>{objective.status}</b></li>)}
        </ul>
        {record && (
          <>
            <h4>What changed</h4>
            <ul>{record.consequence.worldChanges.map((change, index) => <li key={`${change.targetId}:${index}`}>{change.label}</li>)}</ul>
            <h4>What was granted</h4>
            <ul>{record.consequence.rewards.length > 0 ? record.consequence.rewards.map((reward, index) => <li key={`${reward.kind}:${index}`}>{reward.label}{reward.amount === undefined ? "" : ` +${reward.amount}`}</li>) : <li>No reward recorded.</li>}</ul>
          </>
        )}
      </aside>
    </div>
  );
}

export function RodohAperture({ world, interaction }: SceneProps): JSX.Element {
  const [state, setState] = useState<ApertureKitState>(() => initialState());
  const [copied, setCopied] = useState(false);

  const commit = useCallback((patch: Partial<ApertureKitState>, history: "replace" | "push" = "replace") => {
    setState((current) => {
      const nextScale = patch.scale ?? current.scale;
      const next: ApertureKitState = {
        ...current,
        ...patch,
        level: patch.level ?? semanticLevelForScale(nextScale, current.level),
      };
      if (typeof window !== "undefined") {
        const href = buildApertureKitUrl(next, window.location.href, URL_PREFIX);
        if (history === "push") window.history.pushState({ rodohAperture: true }, "", href);
        else window.history.replaceState({ rodohAperture: true }, "", href);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const restored = readApertureKitState(window.location.search, URL_PREFIX);
      if (restored) setState(restored);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setMode = (mode: ApertureMode) => commit({ mode }, "push");
  const copyView = async () => {
    if (typeof window === "undefined") return;
    const href = buildApertureKitUrl(state, window.location.href, URL_PREFIX);
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this exact Rodoh view", href);
    }
  };

  return (
    <div className="rodoh-aperture" data-testid="rodoh-aperture" data-mode={state.mode} data-level={state.level}>
      <header className="rodoh-aperture__header">
        <div>
          <small>RODOH APERTURE · EXACT RUN PROJECTION</small>
          <h1>{world.arc.meta.name}</h1>
          <code title={world.cartridgeDigest}>{world.cartridgeDigest.slice(0, 22)}…</code>
        </div>
        <nav aria-label="Aperture modes">
          {(["map", "trace", "surface"] as const).map((mode) => (
            <button type="button" key={mode} data-active={state.mode === mode} onClick={() => setMode(mode)}>{mode}</button>
          ))}
        </nav>
        <button type="button" className="rodoh-aperture__copy" onClick={copyView}>{copied ? "VIEW COPIED" : "COPY EXACT VIEW"}</button>
      </header>

      <div className="rodoh-aperture__controls">
        <label>
          Semantic scale · {state.scale.toFixed(2)} · {levelLabel(state.level)}
          <input
            aria-label="Aperture semantic scale"
            type="range"
            min={1}
            max={5.4}
            step={0.05}
            value={state.scale}
            onChange={(event) => commit({ scale: Number(event.target.value) })}
            onPointerUp={() => commit({}, "push")}
          />
        </label>
        <div aria-label="Semantic level shortcuts">
          {([
            ["corpus", 1],
            ["machine", 1.7],
            ["surface", 3.1],
            ["evidence", 4.5],
          ] as const).map(([level, scale]) => (
            <button type="button" key={level} data-active={state.level === level} onClick={() => commit({ level, scale }, "push")}>{levelLabel(level)}</button>
          ))}
        </div>
        <span>{world.ledger.entries.length} receipts · {world.clearedCount}/{world.totalNodes} recorded</span>
      </div>

      <main className="rodoh-aperture__body">
        <GodscarPocketPanel arc={world.arc} />
        <div className="rodoh-aperture__projection">
        {state.mode === "map" && <MapProjection world={world} interaction={interaction} state={state} onFocus={(focus) => commit({ focus }, "push")} />}
        {state.mode === "trace" && <TraceProjection world={world} interaction={interaction} state={state} onFocus={(focus) => commit({ focus }, "push")} />}
        {state.mode === "surface" && <SurfaceProjection world={world} interaction={interaction} state={state} onState={(patch) => commit(patch)} onFocus={(focus) => commit({ focus }, "push")} />}
        </div>
      </main>

      <footer className="rodoh-aperture__footer">
        <span>One cartridge · one run · several faithful representations</span>
        <span>No pairwise lines, routes, outcomes, or choices are manufactured.</span>
      </footer>
    </div>
  );
}
