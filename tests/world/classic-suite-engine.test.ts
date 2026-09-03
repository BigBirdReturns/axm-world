import { describe, expect, it } from "vitest";
import { CLASSIC_TRIALS } from "../../src/fabric/classics/catalog.js";
import {
  CLASSIC_WIDTH,
  createClassicGame,
  getClassicHud,
  stepClassicGame,
  type ClassicInput,
} from "../../src/fabric/classics/engine.js";
import {
  loadClassicSuiteProgress,
  recordClassicTrialAttempt,
  resetClassicSuiteProgress,
} from "../../src/fabric/classics/story.js";

const idle: ClassicInput = { x: 0, y: 0, primary: false, secondary: false };

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

describe("The First Charter Classic Trials", () => {
  it("ships five story-bound classic games", () => {
    expect(CLASSIC_TRIALS.map((trial) => trial.id)).toEqual([
      "balance-of-oaths",
      "wall-of-terms",
      "serpent-of-memory",
      "swarm-at-the-gate",
      "courier-beyond-the-charter",
    ]);
  });

  it("advances Balance of Oaths to the Seal of Judgment", () => {
    const state = createClassicGame("balance-of-oaths", 1);
    if (state.id !== "balance-of-oaths") throw new Error("wrong game state");
    state.playerPoints = 4;
    state.ball.x = CLASSIC_WIDTH + 31;
    state.ball.vx = 200;
    stepClassicGame(state, idle, 1 / 60);
    expect(state.status).toBe("won");
    expect(state.score).toBe(500);
  });

  it("clears the last false clause in Wall of Terms", () => {
    const state = createClassicGame("wall-of-terms", 2);
    if (state.id !== "wall-of-terms") throw new Error("wrong game state");
    for (const brick of state.bricks) brick.alive = false;
    const finalBrick = state.bricks[0]!;
    finalBrick.alive = true;
    state.launched = true;
    state.ball.x = finalBrick.x + finalBrick.width / 2;
    state.ball.y = finalBrick.y + finalBrick.height / 2;
    state.ball.vx = 0;
    state.ball.vy = 1;
    stepClassicGame(state, idle, 1 / 120);
    expect(state.status).toBe("won");
    expect(state.score).toBe(100);
  });

  it("restores the eighth fragment in Serpent of Memory", () => {
    const state = createClassicGame("serpent-of-memory", 3);
    if (state.id !== "serpent-of-memory") throw new Error("wrong game state");
    state.fragments = 7;
    state.food = { x: state.snake[0]!.x + 1, y: state.snake[0]!.y };
    state.accumulator = 1;
    stepClassicGame(state, idle, 1 / 60);
    expect(state.status).toBe("won");
    expect(state.fragments).toBe(8);
  });

  it("destroys the final invader at the north gate", () => {
    const state = createClassicGame("swarm-at-the-gate", 4);
    if (state.id !== "swarm-at-the-gate") throw new Error("wrong game state");
    for (const enemy of state.enemies) enemy.alive = false;
    const finalEnemy = state.enemies[0]!;
    finalEnemy.alive = true;
    state.bullets.push({
      x: finalEnemy.x,
      y: finalEnemy.y,
      vx: 0,
      vy: 0,
      enemy: false,
      ttl: 1,
    });
    stepClassicGame(state, idle, 1 / 60);
    expect(state.status).toBe("won");
    expect(state.score).toBe(125);
  });

  it("carries the final seal through the last courier hazard", () => {
    const state = createClassicGame("courier-beyond-the-charter", 5);
    if (state.id !== "courier-beyond-the-charter") throw new Error("wrong game state");
    for (const rock of state.rocks) rock.alive = false;
    const finalRock = state.rocks[0]!;
    finalRock.alive = true;
    state.bullets.push({
      x: finalRock.x,
      y: finalRock.y,
      vx: 0,
      vy: 0,
      ttl: 1,
    });
    stepClassicGame(state, idle, 1 / 60);
    expect(state.status).toBe("won");
    expect(getClassicHud(state).detail).toBe("0 hazards remain");
  });

  it("persists attempts independently of the Infinite Fabric world store", () => {
    const storage = new MemoryStorage();
    let progress = loadClassicSuiteProgress(storage);
    expect(progress.completed).toEqual([]);
    progress = recordClassicTrialAttempt("balance-of-oaths", storage);
    progress = recordClassicTrialAttempt("balance-of-oaths", storage);
    expect(progress.attempts["balance-of-oaths"]).toBe(2);
    resetClassicSuiteProgress(storage);
    expect(loadClassicSuiteProgress(storage).attempts).toEqual({});
  });
});
