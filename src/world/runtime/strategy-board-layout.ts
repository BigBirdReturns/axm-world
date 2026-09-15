import type { StrategyBoardProgram } from "../../engine/strategy-board/program.js";

export interface StrategyBoardPoint {
  x: number;
  y: number;
}

export function strategyBoardLayout(program: StrategyBoardProgram): Map<string, StrategyBoardPoint> {
  const spaces = program.definition.spaces;
  const start = spaces.find((space) => space.type === "start") ?? spaces[0]!;
  const depth = new Map<string, number>([[start.id, 0]]);
  const queue = [start.id];

  while (queue.length) {
    const id = queue.shift()!;
    const space = spaces.find((item) => item.id === id)!;
    for (const adjacent of space.adjacentSpaceIds) {
      if (depth.has(adjacent)) continue;
      depth.set(adjacent, (depth.get(id) ?? 0) + 1);
      queue.push(adjacent);
    }
  }

  let nextDepth = Math.max(0, ...depth.values()) + 1;
  for (const space of spaces) if (!depth.has(space.id)) depth.set(space.id, nextDepth++);
  const levels = [...new Set(depth.values())].sort((a, b) => a - b);
  const points = new Map<string, StrategyBoardPoint>();

  levels.forEach((level, levelIndex) => {
    const members = spaces.filter((space) => depth.get(space.id) === level);
    const x = levels.length === 1 ? 50 : 12 + (76 * levelIndex) / (levels.length - 1);
    members.forEach((space, row) => {
      const y = members.length === 1 ? 50 : 18 + (64 * (row + 1)) / (members.length + 1);
      points.set(space.id, { x, y });
    });
  });
  return points;
}

export function strategyBoardEdges(program: StrategyBoardProgram): Array<[string, string]> {
  const seen = new Set<string>();
  const edges: Array<[string, string]> = [];
  for (const space of program.definition.spaces) for (const adjacent of space.adjacentSpaceIds) {
    const key = [space.id, adjacent].sort().join("::");
    if (!seen.has(key)) { seen.add(key); edges.push([space.id, adjacent]); }
  }
  return edges;
}
