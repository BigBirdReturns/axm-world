import type { ClassicTrialId } from "./catalog.js";

export const CLASSIC_WIDTH = 960;
export const CLASSIC_HEIGHT = 540;

export type ClassicGameStatus = "playing" | "won" | "lost";

export interface ClassicInput {
  x: number;
  y: number;
  primary: boolean;
  secondary: boolean;
}

interface BaseState {
  id: ClassicTrialId;
  status: ClassicGameStatus;
  score: number;
  lives: number;
  elapsed: number;
  seed: number;
  message: string;
}

interface Point {
  x: number;
  y: number;
}

interface MovingPoint extends Point {
  vx: number;
  vy: number;
}

export interface BalanceState extends BaseState {
  id: "balance-of-oaths";
  playerY: number;
  rivalY: number;
  ball: MovingPoint;
  playerPoints: number;
  rivalPoints: number;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  band: number;
}

export interface WallState extends BaseState {
  id: "wall-of-terms";
  paddleX: number;
  ball: MovingPoint;
  launched: boolean;
  bricks: Brick[];
}

interface GridPoint {
  x: number;
  y: number;
}

export interface SerpentState extends BaseState {
  id: "serpent-of-memory";
  snake: GridPoint[];
  direction: GridPoint;
  pendingDirection: GridPoint;
  food: GridPoint;
  accumulator: number;
  fragments: number;
}

interface Invader extends Point {
  alive: boolean;
  column: number;
  row: number;
}

interface Shot extends MovingPoint {
  enemy: boolean;
  ttl: number;
}

export interface SwarmState extends BaseState {
  id: "swarm-at-the-gate";
  playerX: number;
  enemies: Invader[];
  enemyDirection: 1 | -1;
  bullets: Shot[];
  fireCooldown: number;
  enemyFireCooldown: number;
}

interface Rock extends MovingPoint {
  radius: number;
  alive: boolean;
  spin: number;
}

interface CourierBullet extends MovingPoint {
  ttl: number;
}

export interface CourierState extends BaseState {
  id: "courier-beyond-the-charter";
  ship: MovingPoint & { angle: number; invulnerable: number };
  rocks: Rock[];
  bullets: CourierBullet[];
  fireCooldown: number;
}

export type ClassicGameState =
  | BalanceState
  | WallState
  | SerpentState
  | SwarmState
  | CourierState;

export interface ClassicHud {
  score: number;
  lives: number;
  status: ClassicGameStatus;
  message: string;
  detail: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function nextRandom(state: BaseState): number {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 0x100000000;
}

function wrap(value: number, maximum: number): number {
  if (value < 0) return value + maximum;
  if (value >= maximum) return value - maximum;
  return value;
}

function distanceSquared(left: Point, right: Point): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function createBalance(seed: number): BalanceState {
  return {
    id: "balance-of-oaths",
    status: "playing",
    score: 0,
    lives: 1,
    elapsed: 0,
    seed,
    message: "Keep the oath in motion.",
    playerY: CLASSIC_HEIGHT / 2,
    rivalY: CLASSIC_HEIGHT / 2,
    ball: { x: CLASSIC_WIDTH / 2, y: CLASSIC_HEIGHT / 2, vx: 320, vy: -75 },
    playerPoints: 0,
    rivalPoints: 0,
  };
}

function createWall(seed: number): WallState {
  const bricks: Brick[] = [];
  const columns = 8;
  const rows = 4;
  const width = 94;
  const height = 26;
  const gap = 10;
  const startX = (CLASSIC_WIDTH - columns * width - (columns - 1) * gap) / 2;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      bricks.push({
        x: startX + column * (width + gap),
        y: 72 + row * (height + gap),
        width,
        height,
        alive: true,
        band: row,
      });
    }
  }
  return {
    id: "wall-of-terms",
    status: "playing",
    score: 0,
    lives: 3,
    elapsed: 0,
    seed,
    message: "PRIMARY launches the seal.",
    paddleX: CLASSIC_WIDTH / 2,
    ball: { x: CLASSIC_WIDTH / 2, y: 464, vx: 250, vy: -270 },
    launched: false,
    bricks,
  };
}

function createSerpent(seed: number): SerpentState {
  return {
    id: "serpent-of-memory",
    status: "playing",
    score: 0,
    lives: 1,
    elapsed: 0,
    seed,
    message: "Recover eight fragments without crossing the written path.",
    snake: [
      { x: 8, y: 7 },
      { x: 7, y: 7 },
      { x: 6, y: 7 },
      { x: 5, y: 7 },
    ],
    direction: { x: 1, y: 0 },
    pendingDirection: { x: 1, y: 0 },
    food: { x: 17, y: 7 },
    accumulator: 0,
    fragments: 0,
  };
}

function createSwarm(seed: number): SwarmState {
  const enemies: Invader[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      enemies.push({
        x: 245 + column * 92,
        y: 94 + row * 58,
        alive: true,
        column,
        row,
      });
    }
  }
  return {
    id: "swarm-at-the-gate",
    status: "playing",
    score: 0,
    lives: 3,
    elapsed: 0,
    seed,
    message: "Hold the north gate.",
    playerX: CLASSIC_WIDTH / 2,
    enemies,
    enemyDirection: 1,
    bullets: [],
    fireCooldown: 0,
    enemyFireCooldown: 0.8,
  };
}

function createCourier(seed: number): CourierState {
  const state: CourierState = {
    id: "courier-beyond-the-charter",
    status: "playing",
    score: 0,
    lives: 3,
    elapsed: 0,
    seed,
    message: "Carry the seal beyond the world that made it.",
    ship: {
      x: CLASSIC_WIDTH / 2,
      y: CLASSIC_HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      invulnerable: 1.8,
    },
    rocks: [],
    bullets: [],
    fireCooldown: 0,
  };
  const radius = 205;
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + nextRandom(state) * 0.38;
    state.rocks.push({
      x: CLASSIC_WIDTH / 2 + Math.cos(angle) * radius,
      y: CLASSIC_HEIGHT / 2 + Math.sin(angle) * radius * 0.72,
      vx: (nextRandom(state) - 0.5) * 92,
      vy: (nextRandom(state) - 0.5) * 92,
      radius: 19 + nextRandom(state) * 13,
      alive: true,
      spin: nextRandom(state) * Math.PI * 2,
    });
  }
  return state;
}

export function createClassicGame(id: ClassicTrialId, seed = 0x51f15e): ClassicGameState {
  switch (id) {
    case "balance-of-oaths": return createBalance(seed);
    case "wall-of-terms": return createWall(seed);
    case "serpent-of-memory": return createSerpent(seed);
    case "swarm-at-the-gate": return createSwarm(seed);
    case "courier-beyond-the-charter": return createCourier(seed);
  }
}

function resetBalanceBall(state: BalanceState, direction: 1 | -1): void {
  state.ball.x = CLASSIC_WIDTH / 2;
  state.ball.y = CLASSIC_HEIGHT / 2;
  state.ball.vx = direction * (300 + nextRandom(state) * 48);
  state.ball.vy = (nextRandom(state) - 0.5) * 260;
}

function stepBalance(state: BalanceState, input: ClassicInput, delta: number): void {
  const paddleHalf = 58;
  state.playerY = clamp(state.playerY + input.y * 360 * delta, paddleHalf, CLASSIC_HEIGHT - paddleHalf);
  const aiTarget = state.ball.y + Math.sin(state.elapsed * 1.3) * 18;
  state.rivalY += clamp(aiTarget - state.rivalY, -230 * delta, 230 * delta);
  state.rivalY = clamp(state.rivalY, paddleHalf, CLASSIC_HEIGHT - paddleHalf);

  state.ball.x += state.ball.vx * delta;
  state.ball.y += state.ball.vy * delta;
  if (state.ball.y < 13) {
    state.ball.y = 13;
    state.ball.vy = Math.abs(state.ball.vy);
  }
  if (state.ball.y > CLASSIC_HEIGHT - 13) {
    state.ball.y = CLASSIC_HEIGHT - 13;
    state.ball.vy = -Math.abs(state.ball.vy);
  }

  if (
    state.ball.vx < 0
    && state.ball.x <= 72
    && state.ball.x >= 42
    && Math.abs(state.ball.y - state.playerY) <= paddleHalf + 10
  ) {
    state.ball.x = 73;
    state.ball.vx = Math.abs(state.ball.vx) * 1.045;
    state.ball.vy += ((state.ball.y - state.playerY) / paddleHalf) * 170;
  }

  if (
    state.ball.vx > 0
    && state.ball.x >= CLASSIC_WIDTH - 72
    && state.ball.x <= CLASSIC_WIDTH - 42
    && Math.abs(state.ball.y - state.rivalY) <= paddleHalf + 10
  ) {
    state.ball.x = CLASSIC_WIDTH - 73;
    state.ball.vx = -Math.abs(state.ball.vx) * 1.035;
    state.ball.vy += ((state.ball.y - state.rivalY) / paddleHalf) * 145;
  }

  if (state.ball.x < -30) {
    state.rivalPoints += 1;
    state.score = state.playerPoints * 100;
    if (state.rivalPoints >= 5) {
      state.status = "lost";
      state.message = "The rival house broke the balance. Try the oath again.";
    } else {
      state.message = `Rival house ${state.rivalPoints}. You ${state.playerPoints}.`;
      resetBalanceBall(state, 1);
    }
  }
  if (state.ball.x > CLASSIC_WIDTH + 30) {
    state.playerPoints += 1;
    state.score = state.playerPoints * 100;
    if (state.playerPoints >= 5) {
      state.status = "won";
      state.message = "The oath held. The Seal of Judgment is restored.";
    } else {
      state.message = `You ${state.playerPoints}. Rival house ${state.rivalPoints}.`;
      resetBalanceBall(state, -1);
    }
  }
}

function ballIntersectsBrick(ball: MovingPoint, brick: Brick): boolean {
  const closestX = clamp(ball.x, brick.x, brick.x + brick.width);
  const closestY = clamp(ball.y, brick.y, brick.y + brick.height);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy <= 9 * 9;
}

function resetWallBall(state: WallState): void {
  state.launched = false;
  state.ball.x = state.paddleX;
  state.ball.y = 464;
  state.ball.vx = (nextRandom(state) > 0.5 ? 1 : -1) * 250;
  state.ball.vy = -270;
  state.message = "PRIMARY launches the next seal.";
}

function stepWall(state: WallState, input: ClassicInput, delta: number): void {
  state.paddleX = clamp(state.paddleX + input.x * 440 * delta, 74, CLASSIC_WIDTH - 74);
  if (!state.launched) {
    state.ball.x = state.paddleX;
    if (input.primary) {
      state.launched = true;
      state.message = "Break every false term.";
    }
    return;
  }

  state.ball.x += state.ball.vx * delta;
  state.ball.y += state.ball.vy * delta;
  if (state.ball.x < 10) {
    state.ball.x = 10;
    state.ball.vx = Math.abs(state.ball.vx);
  }
  if (state.ball.x > CLASSIC_WIDTH - 10) {
    state.ball.x = CLASSIC_WIDTH - 10;
    state.ball.vx = -Math.abs(state.ball.vx);
  }
  if (state.ball.y < 10) {
    state.ball.y = 10;
    state.ball.vy = Math.abs(state.ball.vy);
  }

  if (
    state.ball.vy > 0
    && state.ball.y >= 478
    && state.ball.y <= 505
    && Math.abs(state.ball.x - state.paddleX) <= 76
  ) {
    state.ball.y = 477;
    state.ball.vy = -Math.abs(state.ball.vy) * 1.018;
    state.ball.vx += ((state.ball.x - state.paddleX) / 76) * 155;
  }

  for (const brick of state.bricks) {
    if (!brick.alive || !ballIntersectsBrick(state.ball, brick)) continue;
    brick.alive = false;
    state.score += 100;
    state.ball.vy *= -1;
    break;
  }

  if (state.bricks.every((brick) => !brick.alive)) {
    state.status = "won";
    state.message = "The false terms are gone. The Seal of Clarity is restored.";
    return;
  }

  if (state.ball.y > CLASSIC_HEIGHT + 20) {
    state.lives -= 1;
    if (state.lives <= 0) {
      state.status = "lost";
      state.message = "The living text fell into the dark.";
    } else {
      resetWallBall(state);
    }
  }
}

function spawnSerpentFood(state: SerpentState): GridPoint {
  for (let attempt = 0; attempt < 512; attempt += 1) {
    const candidate = {
      x: Math.floor(nextRandom(state) * 24),
      y: Math.floor(nextRandom(state) * 15),
    };
    if (!state.snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y)) {
      return candidate;
    }
  }
  return { x: 2, y: 2 };
}

function stepSerpent(state: SerpentState, input: ClassicInput, delta: number): void {
  const absX = Math.abs(input.x);
  const absY = Math.abs(input.y);
  if (Math.max(absX, absY) > 0.36) {
    const candidate = absX > absY
      ? { x: Math.sign(input.x), y: 0 }
      : { x: 0, y: Math.sign(input.y) };
    if (candidate.x !== -state.direction.x || candidate.y !== -state.direction.y) {
      state.pendingDirection = candidate;
    }
  }

  state.accumulator += delta;
  const stepTime = Math.max(0.072, 0.125 - state.fragments * 0.005);
  while (state.accumulator >= stepTime && state.status === "playing") {
    state.accumulator -= stepTime;
    state.direction = { ...state.pendingDirection };
    const head = state.snake[0]!;
    const nextHead = {
      x: head.x + state.direction.x,
      y: head.y + state.direction.y,
    };
    const outside = nextHead.x < 0 || nextHead.x >= 24 || nextHead.y < 0 || nextHead.y >= 15;
    const bitesMemory = state.snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
    if (outside || bitesMemory) {
      state.status = "lost";
      state.message = outside
        ? "The memory escaped the written field."
        : "The memory crossed its own recorded path.";
      return;
    }

    state.snake.unshift(nextHead);
    if (nextHead.x === state.food.x && nextHead.y === state.food.y) {
      state.fragments += 1;
      state.score += 50;
      if (state.fragments >= 8) {
        state.status = "won";
        state.message = "Eight clauses remembered. The Seal of Continuity is restored.";
        return;
      }
      state.food = spawnSerpentFood(state);
    } else {
      state.snake.pop();
    }
  }
}

function stepSwarm(state: SwarmState, input: ClassicInput, delta: number): void {
  state.playerX = clamp(state.playerX + input.x * 390 * delta, 42, CLASSIC_WIDTH - 42);
  state.fireCooldown = Math.max(0, state.fireCooldown - delta);
  state.enemyFireCooldown -= delta;

  if (input.primary && state.fireCooldown <= 0) {
    state.bullets.push({ x: state.playerX, y: 468, vx: 0, vy: -470, enemy: false, ttl: 2 });
    state.fireCooldown = 0.22;
  }

  const alive = state.enemies.filter((enemy) => enemy.alive);
  const speed = 38 + (18 - alive.length) * 4.8;
  const nextLeft = Math.min(...alive.map((enemy) => enemy.x + state.enemyDirection * speed * delta));
  const nextRight = Math.max(...alive.map((enemy) => enemy.x + state.enemyDirection * speed * delta));
  const hitsEdge = nextLeft < 45 || nextRight > CLASSIC_WIDTH - 45;
  if (hitsEdge) {
    state.enemyDirection = state.enemyDirection === 1 ? -1 : 1;
    for (const enemy of alive) enemy.y += 16;
  } else {
    for (const enemy of alive) enemy.x += state.enemyDirection * speed * delta;
  }

  if (alive.some((enemy) => enemy.y > 430)) {
    state.status = "lost";
    state.message = "The swarm crossed the north gate.";
    return;
  }

  if (state.enemyFireCooldown <= 0 && alive.length > 0) {
    const shooter = alive[Math.floor(nextRandom(state) * alive.length)]!;
    state.bullets.push({ x: shooter.x, y: shooter.y + 16, vx: 0, vy: 250, enemy: true, ttl: 3 });
    state.enemyFireCooldown = 0.55 + nextRandom(state) * 0.65;
  }

  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.ttl -= delta;
    if (!bullet.enemy) {
      for (const enemy of alive) {
        if (!enemy.alive) continue;
        if (Math.abs(bullet.x - enemy.x) <= 24 && Math.abs(bullet.y - enemy.y) <= 18) {
          enemy.alive = false;
          bullet.ttl = 0;
          state.score += 125;
          break;
        }
      }
    } else if (
      bullet.ttl > 0
      && Math.abs(bullet.x - state.playerX) <= 25
      && Math.abs(bullet.y - 486) <= 16
    ) {
      bullet.ttl = 0;
      state.lives -= 1;
      if (state.lives <= 0) {
        state.status = "lost";
        state.message = "The gate keeper fell before the village could organize.";
        return;
      }
      state.message = `${state.lives} keepers remain.`;
    }
  }
  state.bullets = state.bullets.filter((bullet) =>
    bullet.ttl > 0 && bullet.y > -30 && bullet.y < CLASSIC_HEIGHT + 30);

  if (state.enemies.every((enemy) => !enemy.alive)) {
    state.status = "won";
    state.message = "The gate held. The Seal of Defense is restored.";
  }
}

function stepCourier(state: CourierState, input: ClassicInput, delta: number): void {
  const ship = state.ship;
  ship.angle += input.x * 3.4 * delta;
  const thrusting = input.y < -0.25 || input.secondary;
  if (thrusting) {
    ship.vx += Math.cos(ship.angle) * 185 * delta;
    ship.vy += Math.sin(ship.angle) * 185 * delta;
  }
  const drag = Math.pow(0.986, delta * 60);
  ship.vx *= drag;
  ship.vy *= drag;
  ship.x = wrap(ship.x + ship.vx * delta, CLASSIC_WIDTH);
  ship.y = wrap(ship.y + ship.vy * delta, CLASSIC_HEIGHT);
  ship.invulnerable = Math.max(0, ship.invulnerable - delta);
  state.fireCooldown = Math.max(0, state.fireCooldown - delta);

  if (input.primary && state.fireCooldown <= 0) {
    state.bullets.push({
      x: ship.x + Math.cos(ship.angle) * 17,
      y: ship.y + Math.sin(ship.angle) * 17,
      vx: ship.vx + Math.cos(ship.angle) * 440,
      vy: ship.vy + Math.sin(ship.angle) * 440,
      ttl: 1.45,
    });
    state.fireCooldown = 0.18;
  }

  for (const bullet of state.bullets) {
    bullet.x = wrap(bullet.x + bullet.vx * delta, CLASSIC_WIDTH);
    bullet.y = wrap(bullet.y + bullet.vy * delta, CLASSIC_HEIGHT);
    bullet.ttl -= delta;
  }

  for (const rock of state.rocks) {
    if (!rock.alive) continue;
    rock.x = wrap(rock.x + rock.vx * delta, CLASSIC_WIDTH);
    rock.y = wrap(rock.y + rock.vy * delta, CLASSIC_HEIGHT);
    rock.spin += delta * 0.55;

    for (const bullet of state.bullets) {
      if (bullet.ttl <= 0) continue;
      if (distanceSquared(rock, bullet) <= rock.radius * rock.radius) {
        rock.alive = false;
        bullet.ttl = 0;
        state.score += 150;
        break;
      }
    }

    if (rock.alive && ship.invulnerable <= 0 && distanceSquared(rock, ship) <= (rock.radius + 14) ** 2) {
      rock.alive = false;
      state.lives -= 1;
      if (state.lives <= 0) {
        state.status = "lost";
        state.message = "The courier was lost with the final seal.";
        return;
      }
      ship.x = CLASSIC_WIDTH / 2;
      ship.y = CLASSIC_HEIGHT / 2;
      ship.vx = 0;
      ship.vy = 0;
      ship.invulnerable = 1.7;
      state.message = `${state.lives} courier hulls remain.`;
    }
  }

  state.bullets = state.bullets.filter((bullet) => bullet.ttl > 0);
  if (state.rocks.every((rock) => !rock.alive)) {
    state.status = "won";
    state.message = "The seal crossed the debris field. The Seal of Portability is restored.";
  }
}

export function stepClassicGame(
  state: ClassicGameState,
  input: ClassicInput,
  deltaSeconds: number,
): ClassicGameState {
  if (state.status !== "playing") return state;
  const delta = clamp(deltaSeconds, 0, 1 / 20);
  state.elapsed += delta;
  switch (state.id) {
    case "balance-of-oaths": stepBalance(state, input, delta); break;
    case "wall-of-terms": stepWall(state, input, delta); break;
    case "serpent-of-memory": stepSerpent(state, input, delta); break;
    case "swarm-at-the-gate": stepSwarm(state, input, delta); break;
    case "courier-beyond-the-charter": stepCourier(state, input, delta); break;
  }
  return state;
}

export function getClassicHud(state: ClassicGameState): ClassicHud {
  let detail = "";
  switch (state.id) {
    case "balance-of-oaths": detail = `${state.playerPoints} : ${state.rivalPoints}`; break;
    case "wall-of-terms": detail = `${state.bricks.filter((brick) => brick.alive).length} terms remain`; break;
    case "serpent-of-memory": detail = `${state.fragments} / 8 fragments`; break;
    case "swarm-at-the-gate": detail = `${state.enemies.filter((enemy) => enemy.alive).length} invaders remain`; break;
    case "courier-beyond-the-charter": detail = `${state.rocks.filter((rock) => rock.alive).length} hazards remain`; break;
  }
  return {
    score: state.score,
    lives: state.lives,
    status: state.status,
    message: state.message,
    detail,
  };
}

function drawFrame(ctx: CanvasRenderingContext2D, title: string): void {
  const gradient = ctx.createLinearGradient(0, 0, CLASSIC_WIDTH, CLASSIC_HEIGHT);
  gradient.addColorStop(0, "#070b17");
  gradient.addColorStop(1, "#151022");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CLASSIC_WIDTH, CLASSIC_HEIGHT);
  ctx.strokeStyle = "rgba(226, 203, 126, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, CLASSIC_WIDTH - 28, CLASSIC_HEIGHT - 28);
  ctx.fillStyle = "rgba(244, 232, 192, 0.72)";
  ctx.font = "700 14px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(title.toUpperCase(), 28, 42);
}

function drawBalance(ctx: CanvasRenderingContext2D, state: BalanceState): void {
  drawFrame(ctx, "Balance of Oaths");
  ctx.setLineDash([10, 12]);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.moveTo(CLASSIC_WIDTH / 2, 58);
  ctx.lineTo(CLASSIC_WIDTH / 2, CLASSIC_HEIGHT - 28);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#e6cc70";
  ctx.fillRect(45, state.playerY - 58, 18, 116);
  ctx.fillStyle = "#9eb6d9";
  ctx.fillRect(CLASSIC_WIDTH - 63, state.rivalY - 58, 18, 116);
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#fff5c7";
  ctx.fill();
  ctx.fillStyle = "#f7e8a6";
  ctx.font = "800 58px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(String(state.playerPoints), CLASSIC_WIDTH / 2 - 78, 104);
  ctx.fillText(String(state.rivalPoints), CLASSIC_WIDTH / 2 + 78, 104);
}

function drawWall(ctx: CanvasRenderingContext2D, state: WallState): void {
  drawFrame(ctx, "Wall of Terms");
  const colors = ["#d7b85e", "#c98a61", "#9476ae", "#5d8ca4"];
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    ctx.fillStyle = colors[brick.band] ?? "#c6b47a";
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.fillStyle = "rgba(16,18,26,0.35)";
    ctx.fillRect(brick.x + 4, brick.y + brick.height - 5, brick.width - 8, 2);
  }
  ctx.fillStyle = "#e4cc7a";
  ctx.fillRect(state.paddleX - 76, 488, 152, 16);
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#fff2b0";
  ctx.fill();
  if (!state.launched) {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "700 16px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("PRIMARY TO LAUNCH", CLASSIC_WIDTH / 2, 450);
  }
}

function drawSerpent(ctx: CanvasRenderingContext2D, state: SerpentState): void {
  drawFrame(ctx, "Serpent of Memory");
  const cell = 30;
  const offsetX = 120;
  const offsetY = 62;
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 24; x += 1) {
    ctx.beginPath();
    ctx.moveTo(offsetX + x * cell, offsetY);
    ctx.lineTo(offsetX + x * cell, offsetY + 15 * cell);
    ctx.stroke();
  }
  for (let y = 0; y <= 15; y += 1) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + y * cell);
    ctx.lineTo(offsetX + 24 * cell, offsetY + y * cell);
    ctx.stroke();
  }
  state.snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#f2d26d" : `rgba(103, 178, 111, ${Math.max(0.35, 1 - index * 0.035)})`;
    ctx.fillRect(offsetX + segment.x * cell + 2, offsetY + segment.y * cell + 2, cell - 4, cell - 4);
  });
  ctx.fillStyle = "#e27686";
  ctx.beginPath();
  ctx.arc(offsetX + state.food.x * cell + cell / 2, offsetY + state.food.y * cell + cell / 2, 9, 0, Math.PI * 2);
  ctx.fill();
}

function drawSwarm(ctx: CanvasRenderingContext2D, state: SwarmState): void {
  drawFrame(ctx, "Swarm at the Gate");
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.row === 0 ? "#d17878" : enemy.row === 1 ? "#b67abc" : "#7a9ec8";
    ctx.fillRect(-20, -12, 40, 24);
    ctx.fillRect(-28, -5, 8, 14);
    ctx.fillRect(20, -5, 8, 14);
    ctx.fillStyle = "#0b0c12";
    ctx.fillRect(-10, -4, 5, 5);
    ctx.fillRect(5, -4, 5, 5);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(state.playerX, 486);
  ctx.fillStyle = "#e4ca72";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(28, 17);
  ctx.lineTo(-28, 17);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.enemy ? "#ef7d7d" : "#fff2a1";
    ctx.fillRect(bullet.x - 3, bullet.y - 8, 6, 16);
  }
  ctx.strokeStyle = "rgba(227,203,119,0.38)";
  ctx.beginPath();
  ctx.moveTo(28, 516);
  ctx.lineTo(CLASSIC_WIDTH - 28, 516);
  ctx.stroke();
}

function drawRock(ctx: CanvasRenderingContext2D, rock: Rock): void {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.spin);
  ctx.beginPath();
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2;
    const radius = rock.radius * (0.78 + ((index * 37) % 5) * 0.055);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = "#99a6bd";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawCourier(ctx: CanvasRenderingContext2D, state: CourierState): void {
  drawFrame(ctx, "Courier Beyond the Charter");
  for (const rock of state.rocks) if (rock.alive) drawRock(ctx, rock);
  for (const bullet of state.bullets) {
    ctx.fillStyle = "#ffe39a";
    ctx.fillRect(bullet.x - 2, bullet.y - 2, 5, 5);
  }
  const ship = state.ship;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  if (ship.invulnerable > 0 && Math.floor(ship.invulnerable * 10) % 2 === 0) ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#e6cd76";
  ctx.fillStyle = "rgba(230,205,118,0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-15, -13);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-15, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawOutcome(ctx: CanvasRenderingContext2D, state: ClassicGameState): void {
  if (state.status === "playing") return;
  ctx.fillStyle = "rgba(4, 6, 12, 0.78)";
  ctx.fillRect(0, 0, CLASSIC_WIDTH, CLASSIC_HEIGHT);
  ctx.textAlign = "center";
  ctx.fillStyle = state.status === "won" ? "#f4d878" : "#dc8585";
  ctx.font = "900 52px ui-sans-serif, sans-serif";
  ctx.fillText(state.status === "won" ? "SEAL RESTORED" : "TRIAL HELD", CLASSIC_WIDTH / 2, 230);
  ctx.fillStyle = "#f4ecd0";
  ctx.font = "600 20px ui-sans-serif, sans-serif";
  ctx.fillText(state.message, CLASSIC_WIDTH / 2, 278);
  ctx.fillStyle = "rgba(244,236,208,0.68)";
  ctx.font = "600 14px ui-monospace, monospace";
  ctx.fillText("RETURN TO THE ARCHIVE OR RESTART THE TRIAL", CLASSIC_WIDTH / 2, 320);
}

export function renderClassicGame(
  context: CanvasRenderingContext2D,
  state: ClassicGameState,
  width: number,
  height: number,
): void {
  const scaleX = width / CLASSIC_WIDTH;
  const scaleY = height / CLASSIC_HEIGHT;
  context.save();
  context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  switch (state.id) {
    case "balance-of-oaths": drawBalance(context, state); break;
    case "wall-of-terms": drawWall(context, state); break;
    case "serpent-of-memory": drawSerpent(context, state); break;
    case "swarm-at-the-gate": drawSwarm(context, state); break;
    case "courier-beyond-the-charter": drawCourier(context, state); break;
  }
  drawOutcome(context, state);
  context.restore();
}
