import { lazy, Suspense, useMemo, useState } from "react";
import { listExecutableStrategyActions, listExecutableStrategyMoves, type LegalAction, type StrategyInput } from "../../engine/strategy-board/index.js";
import type { StrategyBoardDriverContract } from "../../engine/strategy-board/driver.js";
import type { StrategyBoardProgram } from "../../engine/strategy-board/program.js";
import type { Arc } from "../../engine/types.js";
import type { KVStorage } from "../save.js";
import {
  applyStrategyBoardSessionInput,
  createStrategyBoardSession,
  downloadStrategyBoardRuntimeRun,
  inspectStrategyBoardSession,
  saveStrategyBoardSession,
  settleStrategyBoardSession,
  type StrategyBoardSession,
} from "./strategy-board-session.js";
import { strategyBoardEdges, strategyBoardLayout } from "./strategy-board-layout.js";
import { resolveStrategyBoardExpression } from "./strategy-board-expression.js";
import "./strategy-board-runtime.css";

const StrategyBoardScene = lazy(() => import("./StrategyBoardScene.js").then((module) => ({ default: module.StrategyBoardScene })));

export interface StrategyBoardRuntimeProps {
  arc: Arc;
  program: StrategyBoardProgram;
  driver?: StrategyBoardDriverContract | null;
  onExit: () => void;
  storage?: KVStorage | null;
}

function defaultSeatIds(program: StrategyBoardProgram): string[] {
  return Array.from({ length: program.definition.seatCountRange.min }, (_, index) => `seat-${index + 1}`);
}

function actingSeatId(session: StrategyBoardSession): string {
  const state = session.state;
  if (state.phase !== "reactionInterference") return state.seats[state.activeSeatIndex]!.seatId;
  return state.seats[
    (state.activeSeatIndex + 1 + state.execution.reactionIndex) % state.seats.length
  ]!.seatId;
}

function controlForDoctrine(
  driver: StrategyBoardDriverContract | null,
  doctrineId: string,
): "human" | "automatic" | null {
  return driver?.doctrines.find((entry) => entry.doctrineId === doctrineId)?.control ?? null;
}

function doctrineName(program: StrategyBoardProgram, doctrineId: string): string {
  return program.definition.doctrines.find((item) => item.id === doctrineId)?.name ?? doctrineId;
}

function seatName(
  program: StrategyBoardProgram,
  seat: { seatId: string; doctrineId: string },
): string {
  return doctrineName(program, seat.doctrineId);
}

function controlLabel(control: "human" | "automatic" | null): string {
  if (control === "human") return "YOU";
  if (control === "automatic") return "OPPONENT";
  return "SEAT";
}

function actionLabel(program: StrategyBoardProgram, action: LegalAction): string {
  if (action.kind === "pass") return "Let it stand";
  const def = program.definition;
  if (action.kind === "purchase") return `Take control of ${def.controlAssets.find((item) => item.id === action.refId)?.name ?? action.refId}`;
  if (action.kind === "auction") return `Contest ${def.auctions.find((item) => item.id === action.refId)?.assetId ?? action.refId}`;
  if (action.kind === "programAction") return def.programActions.find((item) => item.id === action.refId)?.name ?? String(action.refId);
  return def.interferences.find((item) => item.id === action.refId)?.name ?? String(action.refId);
}

function actionDescription(program: StrategyBoardProgram, action: LegalAction): string {
  const def = program.definition;
  if (action.kind === "pass") return "Spend nothing and allow this decision window to close.";
  if (action.kind === "purchase") return def.controlAssets.find((item) => item.id === action.refId)?.description ?? "Take durable control of this asset.";
  if (action.kind === "auction") return "Submit an explicit bid sequence; the deterministic executor settles exactly what you submit.";
  if (action.kind === "programAction") return def.programActions.find((item) => item.id === action.refId)?.description ?? "Execute this authored program action.";
  return def.interferences.find((item) => item.id === action.refId)?.description ?? "Interfere with the action that just occurred.";
}

function actionEffect(program: StrategyBoardProgram, action: LegalAction): string {
  const def = program.definition;
  if (action.kind === "programAction") return def.programActions.find((item) => item.id === action.refId)?.effect.summary ?? "";
  if (action.kind === "interference") return def.interferences.find((item) => item.id === action.refId)?.effect.summary ?? "";
  if (action.kind === "purchase") {
    const asset = def.controlAssets.find((item) => item.id === action.refId);
    if (!asset) return "";
    const parts = [];
    if (asset.income) parts.push(`Income: +${asset.income.amountPerQuarter} ${def.resources.find((r) => r.id === asset.income!.resourceId)?.name ?? asset.income.resourceId} each quarter`);
    if (asset.toll) parts.push(`Opponent toll: ${asset.toll.amount} ${def.resources.find((r) => r.id === asset.toll!.resourceId)?.name ?? asset.toll.resourceId}`);
    return parts.join(" · ");
  }
  return "";
}

function mutationSummary(program: StrategyBoardProgram, action: LegalAction): string {
  if (!action.declaredMutations.length) return "";
  const resources = new Map(program.definition.resources.map((item) => [item.id, item.name]));
  return action.declaredMutations
    .map((mutation) => `${mutation.delta > 0 ? "+" : ""}${mutation.delta} ${resources.get(mutation.resourceId) ?? mutation.resourceId}`)
    .join(" · ");
}

function phasePrompt(
  phase: StrategyBoardSession["state"]["phase"],
  actorName: string,
): { kicker: string; title: string; body: string } {
  if (phase === "movementResolution") return {
    kicker: "MOVE",
    title: "Choose where to exert pressure",
    body: "Move to one executable connected location, or hold position. Opponent-held infrastructure may charge a toll, and unaffordable routes are blocked before you commit.",
  };
  if (phase === "buyAuctionPass") return {
    kicker: "CONTROL",
    title: "Decide who controls this infrastructure",
    body: "Take the asset if it matters to your route, contest it when the rules allow, or conserve capacity and pass.",
  };
  if (phase === "programAction") return {
    kicker: "ACT",
    title: "Choose the policy that changes the race",
    body: "These are the actions your authored doctrine can execute now. Costs and effects are shown before you commit.",
  };
  if (phase === "reactionInterference") return {
    kicker: "REACT",
    title: "Answer the action that just landed",
    body: "Interfere by paying the listed cost, or let the action stand. This is a real state transition, not a flavor prompt.",
  };
  return { kicker: "RESOLVE", title: "Resolving authored law", body: "The deterministic executor is advancing a resolver-only phase." };
}

function initialSession(
  arc: Arc,
  program: StrategyBoardProgram,
  driver: StrategyBoardDriverContract | null,
  storage: KVStorage | null,
): { session: StrategyBoardSession | null; error: string | null } {
  if (storage) {
    const existing = inspectStrategyBoardSession(storage, arc);
    if (existing.kind === "ok") {
      const settled = settleStrategyBoardSession(arc, program, existing.session, driver);
      if (settled.inputs.length !== existing.session.inputs.length) {
        const saved = saveStrategyBoardSession(storage, settled);
        if (!saved.ok) return { session: null, error: saved.message };
      }
      return { session: settled, error: null };
    }
    if (existing.kind === "invalid") return {
      session: null,
      error: `Stored Strategy Board run refused: ${existing.error}`,
    };
  }
  const session = createStrategyBoardSession(arc, program, defaultSeatIds(program), driver);
  if (storage) {
    const saved = saveStrategyBoardSession(storage, session);
    if (!saved.ok) return { session: null, error: saved.message };
  }
  return { session, error: null };
}

export function StrategyBoardRuntime({ arc, program, driver = null, onExit, storage }: StrategyBoardRuntimeProps): JSX.Element {
  const resolvedStorage = storage === undefined
    ? (typeof window === "undefined" ? null : window.localStorage)
    : storage;
  const boot = useMemo(
    () => initialSession(arc, program, driver, resolvedStorage),
    [arc, program, driver, resolvedStorage],
  );
  const [session, setSession] = useState<StrategyBoardSession | null>(() => boot.session);
  const [error, setError] = useState<string | null>(() => boot.error);
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [bidSeat, setBidSeat] = useState(() => session?.seatIds[0] ?? "seat-1");
  const [bidAmount, setBidAmount] = useState("");
  const [bids, setBids] = useState<{ seatId: string; amount: number }[]>([]);

  if (!session) {
    return (
      <main className="strategy-runtime" data-testid="strategy-board-runtime-refusal">
        <header className="strategy-runtime__header">
          <div>
            <div className="strategy-runtime__eyebrow">Strategy Board Runtime</div>
            <h1>Stored run refused</h1>
            <p>{error ?? "The runtime run could not be restored."}</p>
          </div>
          <button type="button" onClick={onExit}>Exit</button>
        </header>
      </main>
    );
  }

  const state = session.state;
  const def = program.definition;
  const activeSeat = state.seats[state.activeSeatIndex]!;
  const actorId = actingSeatId(session);
  const actor = state.seats.find((seat) => seat.seatId === actorId)!;
  const actorName = seatName(program, actor);
  const legal = listExecutableStrategyActions(def, state);
  const position = state.execution.positions[activeSeat.seatId]!;
  const currentSpace = def.spaces.find((space) => space.id === position)!;
  const prompt = phasePrompt(state.phase, actorName);
  const seatById = new Map(state.seats.map((seat) => [seat.seatId, seat]));
  const displaySeatId = (seatId: string) => {
    const seat = seatById.get(seatId);
    return seat ? seatName(program, seat) : seatId;
  };

  const transition = (input: StrategyInput) => {
    try {
      const next = applyStrategyBoardSessionInput(arc, program, session, input, driver);
      if (resolvedStorage) {
        const result = saveStrategyBoardSession(resolvedStorage, next);
        if (!result.ok) throw new Error(result.message);
      }
      setError(null);
      setSession(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const takeAction = (action: LegalAction) => {
    if (action.kind === "auction") {
      setAuctionId(action.refId);
      setBids([]);
      return;
    }
    transition({ type: "action", seatId: actorId, kind: action.kind, refId: action.refId });
  };

  const resolveAuction = () => {
    if (!auctionId) return;
    transition({ type: "action", seatId: actorId, kind: "auction", refId: auctionId, bids });
    setAuctionId(null);
    setBids([]);
  };

  const addBid = () => {
    const amount = Number(bidAmount);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setError("Bid must be a non-negative integer.");
      return;
    }
    setBids((current) => [...current, { seatId: bidSeat, amount }]);
    setBidAmount("");
  };

  const terminal = state.execution.terminal;
  const terminalEnding = terminal ? def.endings.find((ending) => ending.id === terminal.endingId) : null;

  const expression = resolveStrategyBoardExpression(arc);
  const useThreeDimensional = typeof window !== "undefined" && window.matchMedia("(min-width: 761px)").matches;
  const points = strategyBoardLayout(program);
  const edges = strategyBoardEdges(program);
  const legalMoves = new Set(listExecutableStrategyMoves(def, state));
  const humanSeat = state.seats.find((seat) => controlForDoctrine(driver, seat.doctrineId) === "human") ?? state.seats[0]!;
  const opponentSeat = state.seats.find((seat) => controlForDoctrine(driver, seat.doctrineId) === "automatic") ?? state.seats[1];
  const humanEnding = program.executionRules.endings.find((ending) => !ending.doctrineIds || ending.doctrineIds.includes(humanSeat.doctrineId));
  const opponentEnding = opponentSeat
    ? program.executionRules.endings.find((ending) => !ending.doctrineIds || ending.doctrineIds.includes(opponentSeat.doctrineId))
    : undefined;
  const humanMilestones = humanEnding?.milestoneIds ?? [];
  const opponentMilestones = opponentEnding?.milestoneIds ?? [];
  const humanProgress = humanMilestones.filter((id) => state.execution.milestones[humanSeat.seatId]?.includes(id)).length;
  const opponentProgress = opponentSeat ? opponentMilestones.filter((id) => state.execution.milestones[opponentSeat.seatId]?.includes(id)).length : 0;
  const lastLedger = state.execution.ledger.at(-1);
  const pointFor = (spaceId: string) => points.get(spaceId) ?? { x: 50, y: 50 };
  const seatControl = (seatId: string | null | undefined) => {
    if (!seatId) return "unclaimed";
    const seat = state.seats.find((entry) => entry.seatId === seatId);
    return seat ? controlForDoctrine(driver, seat.doctrineId) ?? "seat" : "seat";
  };

  return (
    <main className="strategy-runtime strategy-runtime--stage" data-testid="strategy-board-runtime">
      <section className="strategy-stage" aria-label={`${def.name} strategic world`}>
        <div className="strategy-stage__atmosphere" aria-hidden="true" />
        {expression && <div className="strategy-stage__expression-bg" aria-hidden="true" style={{ backgroundImage: `url("${expression.environmentUrl}")` }} />}
        {expression && <div className="strategy-stage__expression-fg" aria-hidden="true" style={{ backgroundImage: `url("${expression.foregroundUrl}")` }} />}
        <header className="strategy-stage__hud">
          <div className="strategy-stage__identity">
            <span>STRATEGY BOARD</span>
            <h1>{def.name}</h1>
          </div>
          <div className="strategy-stage__round">
            <span>QUARTER</span>
            <b>{state.quarter}</b>
          </div>
          <button type="button" className="strategy-stage__exit" onClick={onExit}>Exit</button>
        </header>

        <div className="strategy-stage__race" data-testid="strategy-race" aria-label="Reach your ending before the other side reaches theirs.">
          <div className="strategy-stage__race-side" data-side="human" data-testid={`strategy-ending-${humanEnding?.endingId ?? "human"}`}>
            {expression && <img className="strategy-stage__race-standard" src={expression.standards.human} alt="" aria-hidden="true" />}
            <span>YOU</span>
            <small className="strategy-stage__faction-name">{doctrineName(program, humanSeat.doctrineId)}</small>
            <strong>{def.endings.find((ending) => ending.id === humanEnding?.endingId)?.name ?? "Your ending"}</strong>
            <small className="strategy-stage__race-count">{humanProgress}/{humanMilestones.length}</small>
            <div className="strategy-stage__pips">
              {humanMilestones.map((id) => <i key={id} data-done={state.execution.milestones[humanSeat.seatId]?.includes(id) ? "true" : "false"} />)}
            </div>
          </div>
          <div className="strategy-stage__versus">VS</div>
          {opponentSeat && (
            <div className="strategy-stage__race-side" data-side="automatic" data-testid={`strategy-ending-${opponentEnding?.endingId ?? "automatic"}`}>
              {expression && <img className="strategy-stage__race-standard" src={expression.standards.automatic} alt="" aria-hidden="true" />}
              <span>OPPONENT</span>
              <small className="strategy-stage__faction-name">{doctrineName(program, opponentSeat.doctrineId)}</small>
              <strong>{def.endings.find((ending) => ending.id === opponentEnding?.endingId)?.name ?? "Opponent ending"}</strong>
              <small className="strategy-stage__race-count">{opponentProgress}/{opponentMilestones.length}</small>
              <div className="strategy-stage__pips">
                {opponentMilestones.map((id) => <i key={id} data-done={state.execution.milestones[opponentSeat.seatId]?.includes(id) ? "true" : "false"} />)}
              </div>
            </div>
          )}
        </div>

        <div className="strategy-stage__decision" data-testid="strategy-turn-prompt">
          <span>{prompt.kicker}</span>
          <strong>{prompt.title}</strong>
          <small>{prompt.body}</small>
        </div>

        <div className="strategy-stage__world">
          {useThreeDimensional ? (
            <Suspense fallback={<div className="strategy-stage__loading">Materializing world…</div>}>
            <StrategyBoardScene
              program={program}
              state={state}
              driver={driver}
              legalMoves={legalMoves}
              terminal={Boolean(terminal)}
              expression={expression}
              onMove={(spaceId) => transition({ type: "advance", destinationSpaceId: spaceId })}
            />
            </Suspense>
          ) : (
            <>
          <svg className="strategy-stage__links" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
            {edges.map(([from, to]) => {
              const a = pointFor(from); const b = pointFor(to);
              return <line key={`${from}:${to}`} x1={a.x * 10} y1={a.y * 6.5} x2={b.x * 10} y2={b.y * 6.5} />;
            })}
          </svg>

          {def.spaces.map((space) => {
            const point = pointFor(space.id);
            const asset = def.controlAssets.find((item) => item.sitedOnSpaceId === space.id);
            const owner = asset ? state.ownership[asset.id] : null;
            const reachable = !terminal && state.phase === "movementResolution" && legalMoves.has(space.id);
            const current = state.execution.positions[activeSeat.seatId] === space.id;
            return (
              <button
                type="button"
                key={space.id}
                className="strategy-stage__node"
                data-testid={`strategy-space-${space.id}`}
                data-reachable={reachable ? "true" : "false"}
                data-owner={seatControl(owner)}
                data-current={current ? "true" : "false"}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                disabled={!reachable}
                title={asset?.description ?? space.name}
                onClick={() => transition({ type: "advance", destinationSpaceId: space.id })}
              >
                <span>{space.region}</span>
                <strong>{space.name}</strong>
                {asset && <small>{owner ? `${displaySeatId(owner)} controls ${asset.name}` : asset.name}</small>}
                {reachable && <em>MOVE</em>}
              </button>
            );
          })}

          {state.seats.map((seat, index) => {
            const point = pointFor(state.execution.positions[seat.seatId]!);
            const control = controlForDoctrine(driver, seat.doctrineId) ?? "seat";
            return (
              <div
                key={seat.seatId}
                className="strategy-stage__token"
                data-control={control}
                style={{ left: `calc(${point.x}% + ${index ? 18 : -18}px)`, top: `calc(${point.y}% + ${index ? 18 : -18}px)` }}
              >
                <b>{control === "human" ? "YOU" : control === "automatic" ? "CPU" : index + 1}</b>
                <span>{doctrineName(program, seat.doctrineId)}</span>
              </div>
            );
          })}
            </>
          )}
        </div>

        <div className="strategy-stage__resources" data-side="human">
          <span>YOU</span>
          {def.resources.map((resource) => (
            <div key={resource.id} title={resource.description}>
              <b>{humanSeat.balances[resource.id] ?? 0}</b>
              <small>{resource.name}</small>
            </div>
          ))}
        </div>
        {opponentSeat && (
          <div className="strategy-stage__resources" data-side="automatic">
            <span>OPPONENT</span>
            {def.resources.map((resource) => (
              <div key={resource.id} title={resource.description}>
                <b>{opponentSeat.balances[resource.id] ?? 0}</b>
                <small>{resource.name}</small>
              </div>
            ))}
          </div>
        )}

        {!terminal && (
          <div className="strategy-stage__actions" data-phase={state.phase} aria-label="Current choices">
            {state.phase === "movementResolution" ? (
              <>
                <div className="strategy-stage__move-hint">
                  <b>Choose a glowing location</b>
                  <span>or</span>
                </div>
                <button type="button" data-testid="strategy-move-hold" onClick={() => transition({ type: "advance" })}>
                  <strong>Hold at {currentSpace.name}</strong>
                  <small>Stay put and continue from here</small>
                </button>
              </>
            ) : legal.map((action) => {
              const cost = mutationSummary(program, action);
              const effect = actionEffect(program, action);
              return (
                <button
                  type="button"
                  key={`${action.kind}:${action.refId ?? "none"}`}
                  data-testid={`strategy-action-${action.kind}-${action.refId ?? "none"}`}
                  onClick={() => takeAction(action)}
                >
                  <strong>{actionLabel(program, action)}</strong>
                  <small>{cost ? `Cost ${cost}` : actionDescription(program, action)}</small>
                  {effect && <em>{effect}</em>}
                </button>
              );
            })}
          </div>
        )}

        {lastLedger && (
          <div className="strategy-stage__impact" aria-live="polite">
            <span>LAST IMPACT</span>
            <strong>{displaySeatId(lastLedger.seatId)}</strong>
            <b>{lastLedger.mutations.map((mutation) => `${mutation.delta > 0 ? "+" : ""}${mutation.delta} ${def.resources.find((r) => r.id === mutation.resourceId)?.name ?? mutation.resourceId}`).join(" · ")}</b>
          </div>
        )}

        {error && <div className="strategy-stage__error" role="alert">{error}</div>}

        {terminal && (
          <div className="strategy-stage__terminal" data-testid="strategy-board-terminal">
            <span>RUN ENDED · QUARTER {terminal.quarter}</span>
            <strong>{terminalEnding?.name ?? terminal.endingId}</strong>
            <p>{terminalEnding?.description}</p>
            <b>{displaySeatId(terminal.seatId)} reached this ending first.</b>
          </div>
        )}
      </section>

      {auctionId && (
        <section className="strategy-runtime__auction" data-testid="strategy-auction-panel">
          <h2>Explicit bid sequence</h2>
          <p>The executor sees exactly this sequence. An empty sequence means no sale.</p>
          <div className="strategy-runtime__bid-entry">
            <select value={bidSeat} onChange={(event) => setBidSeat(event.target.value)}>
              {state.seats.map((seat) => <option key={seat.seatId} value={seat.seatId}>{seatName(program, seat)}</option>)}
            </select>
            <input aria-label="Bid amount" inputMode="numeric" value={bidAmount} onChange={(event) => setBidAmount(event.target.value)} />
            <button type="button" onClick={addBid}>Add bid</button>
          </div>
          <ol>{bids.map((bid, index) => <li key={`${index}:${bid.seatId}:${bid.amount}`}>{displaySeatId(bid.seatId)}: {bid.amount}</li>)}</ol>
          <div className="strategy-runtime__bid-actions">
            <button type="button" onClick={() => setBids([])}>Clear</button>
            <button type="button" onClick={resolveAuction}>Resolve auction</button>
          </div>
        </section>
      )}

      <details className="strategy-runtime__inspector">
        <summary>Inspect rules, receipts, and exact run</summary>
        <div className="strategy-runtime__inspect-grid">
          <section>
            <h2>Victory law</h2>
            {def.endings.map((ending) => {
              const rule = program.executionRules.endings.find((item) => item.endingId === ending.id);
              return <p key={ending.id}><strong>{ending.name}</strong><br />{rule?.milestoneIds.map((id) => def.milestones.find((item) => item.id === id)?.name ?? id).join(" + ")}</p>;
            })}
          </section>
          <section>
            <h2>Recent receipts</h2>
            <ol>
              {state.execution.ledger.slice(-10).reverse().map((event, index) => (
                <li key={`${state.execution.ledger.length - index}:${event.seatId}:${event.note}`}>
                  <strong>{displaySeatId(event.seatId)}</strong> · {event.note}
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="strategy-runtime__inspect-actions">
          <span>Exact input trace: {session.inputs.length}{expression ? ` · ${expression.producer} · ${expression.planDigest.slice(0, 12)}…` : ""}</span>
          <button type="button" data-testid="strategy-export-run" onClick={() => downloadStrategyBoardRuntimeRun(session.run)}>Export exact run</button>
        </div>
      </details>
    </main>
  );
}
