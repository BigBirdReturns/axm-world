import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const packageRoot = resolve("unity/Packages/com.axm.rodoh-action");
const contractPath = join(packageRoot, "Runtime/Core/ActionContract.cs");

function enumMembers(source: string, enumName: string): Set<string> {
  const match = source.match(new RegExp(`public\\s+enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) throw new Error(`Unable to locate ${enumName} in ${contractPath}.`);
  return new Set(
    match[1]
      .split(",")
      .map((value) => value.replace(/\/\/.*$/gm, "").trim())
      .filter(Boolean)
      .map((value) => value.split("=")[0].trim()),
  );
}

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path));
    else if (entry.endsWith(".cs")) files.push(path);
  }
  return files.sort();
}

function references(source: string, enumName: string): string[] {
  return [...source.matchAll(new RegExp(`${enumName}\\.([A-Za-z_][A-Za-z0-9_]*)`, "g"))]
    .map((match) => match[1]);
}

describe("Unity action source remains bound to the deployed action-state contract", () => {
  it("refuses presentation code that names nonexistent action modes", () => {
    const contract = readFileSync(contractPath, "utf8");
    const playerModes = enumMembers(contract, "ActionPlayerMode");
    const enemyModes = enumMembers(contract, "ActionEnemyMode");
    const violations: string[] = [];

    for (const path of sourceFiles(packageRoot)) {
      const source = readFileSync(path, "utf8");
      for (const mode of references(source, "ActionPlayerMode")) {
        if (!playerModes.has(mode)) violations.push(`${path}: ActionPlayerMode.${mode}`);
      }
      for (const mode of references(source, "ActionEnemyMode")) {
        if (!enemyModes.has(mode)) violations.push(`${path}: ActionEnemyMode.${mode}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("derives locomotion presentation without adding a second simulation mode", () => {
    const source = readFileSync(
      join(packageRoot, "Runtime/Unity/ActionProceduralMotionDriver.cs"),
      "utf8",
    );
    expect(source).toContain("mode == ActionPlayerMode.Idle && moving");
    expect(source).toContain("mode == ActionEnemyMode.Active");
    expect(source).toContain("mode == ActionEnemyMode.Recover");
    expect(source).not.toContain("ActionPlayerMode.Move");
    expect(source).not.toContain("ActionEnemyMode.Attack");
    expect(source).not.toContain("ActionEnemyMode.Recovery");
  });
});
