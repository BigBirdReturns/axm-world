import { useMemo, useState } from "react";
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
import "./strategy-board-runtime.css";

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
    title: `${actorName}: choose where to exert pressure`,
    body: "Move to one executable connected location, or hold position. Opponent-held infrastructure may charge a toll, and unaffordable routes are blocked before you commit.",
  };
  if (phase === "buyAuctionPass") return {
    kicker: "CONTROL",
    title: `${actorName}: decide who owns this infrastructure`,
    body: "Take the asset if it matters to your route, contest it when the rules allow, or conserve capacity and pass.",
  };
  if (phase === "programAction") return {
    kicker: "ACT",
    title: `${actorName}: choose the policy that changes the race`,
    body: "These are the actions your authored doctrine can execute now. Costs and effects are shown before you commit.",
  };
  if (phase === "reactionInterference") return {
    kicker: "REACT",
    title: `${actorName}: answer the action that just landed`,
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
  const legalMoves = new Set(listExecutableStrategyMoves(def, state));
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

  return (
    <main className="strategy-runtime" data-testid="strategy-board-runtime">
      <header className="strategy-runtime__header">
        <div>
          <div className="strategy-runtime__eyebrow">Strategy Board</div>
          <h1>{def.name}</h1>
          <p>{def.description}</p>
        </div>
        <div className="strategy-runtime__header-actions">
          <button type="button" data-testid="strategy-export-run" onClick={() => downloadStrategyBoardRuntimeRun(session.run)}>Export run</button>
          <button type="button" onClick={onExit}>Exit</button>
        </div>
      </header>

      <section className="strategy-runtime__race" data-testid="strategy-race">
        <div className="strategy-runtime__race-title">
          <span>THE RACE</span>
          <strong>Reach your ending before the other side reaches theirs.</strong>
        </div>
        <div className="strategy-runtime__ending-grid">
          {def.endings.map((ending) => {
            const rule = program.executionRules.endings.find((item) => item.endingId === ending.id);
            const required = rule?.milestoneIds ?? [];
            const milestones = required.map((id) => def.milestones.find((item) => item.id === id)?.name ?? id);
            const eligibleSeats = state.seats.filter((seat) => !rule?.doctrineIds || rule.doctrineIds.includes(seat.doctrineId));
            return (
              <article key={ending.id} className="strategy-runtime__ending" data-testid={`strategy-ending-${ending.id}`}>
                <strong>{ending.name}</strong>
                <p>{ending.description}</p>
                <span>Requires: {milestones.join(" + ") || "authored ending law"}</span>
                <div className="strategy-runtime__ending-progress">
                  {eligibleSeats.map((seat) => {
                    const achieved = required.filter((id) => state.execution.milestones[seat.seatId]?.includes(id)).length;
                    return <small key={seat.seatId}>{seatName(program, seat)}: {achieved}/{required.length}</small>;
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="strategy-runtime__prompt" data-testid="strategy-turn-prompt">
        <span>{prompt.kicker}</span>
        <div>
          <strong>{prompt.title}</strong>
          <p>{prompt.body}</p>
        </div>
      </section>

      <section className="strategy-runtime__status" aria-label="Turn status">
        <strong>Quarter {state.quarter}</strong>
        <span>Turn: {seatName(program, activeSeat)}</span>
        <span>Decision: {actorName}</span>
        <span>At: {currentSpace.name}</span>
        <span>Exact trace: {session.inputs.length}</span>
      </section>

      {error && <div className="strategy-runtime__error" role="alert">{error}</div>}
      {terminal && (
        <section className="strategy-runtime__terminal" data-testid="strategy-board-terminal">
          <span>RUN ENDED · QUARTER {terminal.quarter}</span>
          <strong>{terminalEnding?.name ?? terminal.endingId}</strong>
          <p>{terminalEnding?.description}</p>
          <b>{displaySeatId(terminal.seatId)} reached this ending first.</b>
        </section>
      )}

      <section className="strategy-runtime__layout">
        <div className="strategy-runtime__board" aria-label="Board">
          {!terminal && state.phase === "movementResolution" && (
            <button type="button" className="strategy-runtime__space strategy-runtime__space--hold" data-testid="strategy-move-hold" onClick={() => transition({ type: "advance" })}>
              <span className="strategy-runtime__space-region">CURRENT POSITION</span>
              <strong>Hold at {currentSpace.name}</strong>
              <small>Do not cross an infrastructure edge this turn. Continue to control and policy from here.</small>
              <em>HOLD POSITION</em>
            </button>
          )}
          {def.spaces.map((space) => {
            const occupants = state.seats.filter((seat) => state.execution.positions[seat.seatId] === space.id);
            const asset = def.controlAssets.find((item) => item.sitedOnSpaceId === space.id);
            const owner = asset ? state.ownership[asset.id] : null;
            const reachable = !terminal && state.phase === "movementResolution" && legalMoves.has(space.id);
            return (
              <button
                type="button"
                key={space.id}
                className="strategy-runtime__space"
                data-testid={`strategy-space-${space.id}`}
                data-reachable={reachable ? "true" : "false"}
                disabled={!reachable}
                onClick={() => transition({ type: "advance", destinationSpaceId: space.id })}
              >
                <span className="strategy-runtime__space-region">{space.region}</span>
                <strong>{space.name}</strong>
                {asset && <span>{asset.name} · {owner ? `held by ${displaySeatId(owner)}` : "unclaimed"}</span>}
                {asset && <small>{asset.description}</small>}
                {occupants.length > 0 && <b>Here: {occupants.map((seat) => seatName(program, seat)).join(", ")}</b>}
                {reachable && <em>MOVE HERE</em>}
              </button>
            );
          })}
        </div>

        <aside className="strategy-runtime__seats" aria-label="Seat ledgers">
          {state.seats.map((seat) => {
            const control = controlForDoctrine(driver, seat.doctrineId);
            const doctrine = def.doctrines.find((item) => item.id === seat.doctrineId);
            const milestones = state.execution.milestones[seat.seatId] ?? [];
            return (
              <div key={seat.seatId} className="strategy-runtime__seat" data-active={seat.seatId === actorId ? "true" : "false"} data-control={control ?? "unknown"}>
                <div className="strategy-runtime__seat-title">
                  <span>{controlLabel(control)}</span>
                  <strong>{doctrine?.name ?? seat.doctrineId}</strong>
                </div>
                <p>{doctrine?.description}</p>
                <div className="strategy-runtime__resources">
                  {def.resources.map((resource) => (
                    <span key={resource.id} data-resource={resource.id}>
                      <b>{seat.balances[resource.id] ?? 0}</b>{resource.name}
                    </span>
                  ))}
                </div>
                {milestones.length > 0 && (
                  <div className="strategy-runtime__milestones">
                    {milestones.map((id) => <small key={id}>✓ {def.milestones.find((item) => item.id === id)?.name ?? id}</small>)}
                  </div>
                )}
              </div>
            );
          })}
        </aside>
      </section>

      {!terminal && state.phase !== "movementResolution" && (
        <section className="strategy-runtime__actions" aria-label="Legal actions">
          <div className="strategy-runtime__section-heading">
            <span>{controlLabel(controlForDoctrine(driver, actor.doctrineId))}</span>
            <h2>{actorName}: choose one</h2>
          </div>
          <div className="strategy-runtime__action-grid">
            {legal.map((action) => {
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
                  <p>{actionDescription(program, action)}</p>
                  {cost && <span>Cost: {cost}</span>}
                  {effect && <b>{effect}</b>}
                </button>
              );
            })}
          </div>
        </section>
      )}

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

      <section className="strategy-runtime__ledger" aria-label="Recent ledger">
        <h2>What actually changed</h2>
        {state.execution.ledger.length === 0 ? (
          <p>No resource mutation has been recorded yet.</p>
        ) : (
          <ol>
            {state.execution.ledger.slice(-8).reverse().map((event, index) => (
              <li key={`${state.execution.ledger.length - index}:${event.seatId}:${event.note}`}>
                <strong>{displaySeatId(event.seatId)}</strong> · {event.note}
                <span>{event.mutations.map((mutation) => `${mutation.delta > 0 ? "+" : ""}${mutation.delta} ${def.resources.find((resource) => resource.id === mutation.resourceId)?.name ?? mutation.resourceId}`).join(", ")}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
