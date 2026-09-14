import { useMemo, useState } from "react";
import {
  advanceStrategyPhase,
  applyLegalStrategyAction,
  initialStrategyExecutionState,
  listExecutableStrategyActions,
  type LegalAction,
  type StrategyExecutionState,
} from "../../engine/strategy-board/index.js";
import type { StrategyBoardProgram } from "../../engine/strategy-board/program.js";
import "./strategy-board-runtime.css";

export interface StrategyBoardRuntimeProps {
  program: StrategyBoardProgram;
  onExit: () => void;
}

const AUTOMATIC_PHASES = new Set(["quarterStart", "milestoneAttempt", "receiptLedger"]);

export function settleAutomaticStrategyPhases(
  program: StrategyBoardProgram,
  state: StrategyExecutionState,
): StrategyExecutionState {
  let next = state;
  let guard = 0;
  while (!next.execution.terminal && AUTOMATIC_PHASES.has(next.phase)) {
    next = advanceStrategyPhase(program.definition, next);
    if (++guard > 8) throw new Error("Strategy-board automatic phase loop exceeded its bound.");
  }
  return next;
}
export function createStrategyBoardRuntimeState(program: StrategyBoardProgram): StrategyExecutionState {
  const seatIds = Array.from(
    { length: program.definition.seatCountRange.min },
    (_, index) => `seat-${index + 1}`,
  );
  return settleAutomaticStrategyPhases(
    program,
    initialStrategyExecutionState(program.definition, seatIds, program.executionRules),
  );
}

function actingSeatId(state: StrategyExecutionState): string {
  if (state.phase !== "reactionInterference") return state.seats[state.activeSeatIndex]!.seatId;
  return state.seats[
    (state.activeSeatIndex + 1 + state.execution.reactionIndex) % state.seats.length
  ]!.seatId;
}

function actionLabel(program: StrategyBoardProgram, action: LegalAction): string {
  if (action.kind === "pass") return "Pass";
  const def = program.definition;
  if (action.kind === "purchase") return `Buy ${def.controlAssets.find((item) => item.id === action.refId)?.name ?? action.refId}`;
  if (action.kind === "auction") return `Auction ${def.auctions.find((item) => item.id === action.refId)?.assetId ?? action.refId}`;
  if (action.kind === "programAction") return def.programActions.find((item) => item.id === action.refId)?.name ?? String(action.refId);
  return def.interferences.find((item) => item.id === action.refId)?.name ?? String(action.refId);
}
function mutationSummary(program: StrategyBoardProgram, action: LegalAction): string {
  if (!action.declaredMutations.length) return "";
  const resources = new Map(program.definition.resources.map((item) => [item.id, item.name]));
  return action.declaredMutations
    .map((mutation) => `${mutation.delta > 0 ? "+" : ""}${mutation.delta} ${resources.get(mutation.resourceId) ?? mutation.resourceId}`)
    .join(" · ");
}

export function StrategyBoardRuntime({ program, onExit }: StrategyBoardRuntimeProps): JSX.Element {
  const [state, setState] = useState(() => createStrategyBoardRuntimeState(program));
  const [error, setError] = useState<string | null>(null);
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [bidSeat, setBidSeat] = useState(state.seats[0]!.seatId);
  const [bidAmount, setBidAmount] = useState("");
  const [bids, setBids] = useState<{ seatId: string; amount: number }[]>([]);
  const def = program.definition;
  const activeSeat = state.seats[state.activeSeatIndex]!;
  const actorId = actingSeatId(state);
  const actor = state.seats.find((seat) => seat.seatId === actorId)!;
  const legal = useMemo(() => listExecutableStrategyActions(def, state), [def, state]);
  const position = state.execution.positions[activeSeat.seatId]!;
  const currentSpace = def.spaces.find((space) => space.id === position)!;

  const transition = (fn: () => StrategyExecutionState) => {
    try {
      setError(null);
      setState(settleAutomaticStrategyPhases(program, fn()));
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
    transition(() => applyLegalStrategyAction(def, state, {
      type: "action",
      seatId: actorId,
      kind: action.kind,
      refId: action.refId,
    }));
  };

  const resolveAuction = () => {
    if (!auctionId) return;
    transition(() => applyLegalStrategyAction(def, state, {
      type: "action",
      seatId: actorId,
      kind: "auction",
      refId: auctionId,
      bids,
    }));
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
  return (
    <main className="strategy-runtime" data-testid="strategy-board-runtime">
      <header className="strategy-runtime__header">
        <div>
          <div className="strategy-runtime__eyebrow">Strategy Board Runtime</div>
          <h1>{def.name}</h1>
          <p>{def.description}</p>
        </div>
        <button type="button" onClick={onExit}>Exit</button>
      </header>

      <section className="strategy-runtime__status" aria-label="Turn status">
        <strong>Quarter {state.quarter}</strong>
        <span>Active: {activeSeat.seatId}</span>
        <span>Acting: {actor.seatId}</span>
        <span>Phase: {state.phase}</span>
        <span>Space: {currentSpace.name}</span>
      </section>
      {error && <div className="strategy-runtime__error" role="alert">{error}</div>}
      {terminal && (
        <section className="strategy-runtime__terminal" data-testid="strategy-board-terminal">
          <strong>{def.endings.find((ending) => ending.id === terminal.endingId)?.name ?? terminal.endingId}</strong>
          <span>{terminal.seatId} ended the run in quarter {terminal.quarter}.</span>
        </section>
      )}
      <section className="strategy-runtime__layout">
        <div className="strategy-runtime__board" aria-label="Board">
          {def.spaces.map((space) => {
            const occupants = state.seats.filter((seat) => state.execution.positions[seat.seatId] === space.id);
            const asset = def.controlAssets.find((item) => item.sitedOnSpaceId === space.id);
            const owner = asset ? state.ownership[asset.id] : null;
            const reachable = !terminal && state.phase === "movementResolution" && currentSpace.adjacentSpaceIds.includes(space.id);
            return (
              <button
                type="button"
                key={space.id}
                className="strategy-runtime__space"
                data-testid={`strategy-space-${space.id}`}
                data-reachable={reachable ? "true" : "false"}
                disabled={!reachable}
                onClick={() => transition(() => advanceStrategyPhase(def, state, space.id))}
              >
                <strong>{space.name}</strong>
                <span>{space.region} · {space.type}</span>
                {asset && <span>{asset.name}{owner ? ` · owned by ${owner}` : " · unowned"}</span>}
                {occupants.length > 0 && <span>Here: {occupants.map((seat) => seat.seatId).join(", ")}</span>}
              </button>
            );
          })}
        </div>

        <aside className="strategy-runtime__seats" aria-label="Seat ledgers">
          {state.seats.map((seat) => (
            <div key={seat.seatId} className="strategy-runtime__seat" data-active={seat.seatId === actorId ? "true" : "false"}>
              <strong>{seat.seatId}</strong>
              <span>{def.doctrines.find((item) => item.id === seat.doctrineId)?.name ?? seat.doctrineId}</span>
              {def.resources.map((resource) => <span key={resource.id}>{resource.name}: {seat.balances[resource.id] ?? 0}</span>)}
            </div>
          ))}
        </aside>
      </section>
      {!terminal && state.phase !== "movementResolution" && (
        <section className="strategy-runtime__actions" aria-label="Legal actions">
          <h2>{actorId}'s legal actions</h2>
          <div className="strategy-runtime__action-grid">
            {legal.map((action) => (
              <button
                type="button"
                key={`${action.kind}:${action.refId ?? "none"}`}
                data-testid={`strategy-action-${action.kind}-${action.refId ?? "none"}`}
                onClick={() => takeAction(action)}
              >
                <strong>{actionLabel(program, action)}</strong>
                {mutationSummary(program, action) && <span>{mutationSummary(program, action)}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {auctionId && (
        <section className="strategy-runtime__auction" data-testid="strategy-auction-panel">
          <h2>Explicit bid sequence</h2>
          <p>The executor sees exactly this sequence. An empty sequence means no sale.</p>
          <div className="strategy-runtime__bid-entry">
            <select value={bidSeat} onChange={(event) => setBidSeat(event.target.value)}>
              {state.seats.map((seat) => <option key={seat.seatId} value={seat.seatId}>{seat.seatId}</option>)}
            </select>
            <input aria-label="Bid amount" inputMode="numeric" value={bidAmount} onChange={(event) => setBidAmount(event.target.value)} />
            <button type="button" onClick={addBid}>Add bid</button>
          </div>
          <ol>{bids.map((bid, index) => <li key={`${index}:${bid.seatId}:${bid.amount}`}>{bid.seatId}: {bid.amount}</li>)}</ol>
          <div className="strategy-runtime__bid-actions">
            <button type="button" onClick={() => setBids([])}>Clear</button>
            <button type="button" onClick={resolveAuction}>Resolve auction</button>
          </div>
        </section>
      )}
      <section className="strategy-runtime__ledger" aria-label="Recent ledger">
        <h2>Recent ledger</h2>
        {state.execution.ledger.length === 0 ? (
          <p>No resource mutation has been recorded yet.</p>
        ) : (
          <ol>
            {state.execution.ledger.slice(-8).reverse().map((event, index) => (
              <li key={`${state.execution.ledger.length - index}:${event.seatId}:${event.note}`}>
                <strong>{event.kind}</strong> · {event.seatId} · {event.note}
                <span>{event.mutations.map((mutation) => `${mutation.delta > 0 ? "+" : ""}${mutation.delta} ${mutation.resourceId}`).join(", ")}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
