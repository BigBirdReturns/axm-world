import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRepository, inspectSource, fingerprint } from './scaffold-guard.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const policy = JSON.parse(fs.readFileSync(new URL('./scaffold-policy.json', import.meta.url), 'utf8'));
const rules = (source, file = 'src/world/AddedHost.tsx') => inspectSource(file, source, policy).map((f) => f.rule);

for (const source of [
  'import x from "../../demos/proof.js";',
  'import type { X } from "../labs/types";',
  'export { x } from "../experiments/bridge.js";',
  'export * from "../labs/index.js";',
  'import "../demos/style.css";',
  'const x = import("../labs/x.js");',
  'const x = require("../experiments/x.cjs");',
  'type X = import("../labs/x").X;',
  'const x = new URL("../demos/x.js", import.meta.url);',
  'import x from "@/labs/x";',
  'import x from "../labs/../world/x";',
  'import x from "../%6cabs/x.js";',
  String.raw`import x from "../\u006cabs/x";`,
  String.raw`import x from '..\\experiments\\x.js';`,
  '@import "../labs/style.css";',
]) test(`reject scaffold dependency: ${source}`, () => assert.ok(rules(source).includes('probe-dependency')));

for (const source of [
  'import(moduleName);', 'require(prefix + "/x");',
  'import(`../${folder}/x.js`);', 'import("../" + "labs/x.js");',
]) test(`reject computed loader: ${source}`, () => assert.ok(rules(source).includes('computed-module')));

for (const source of [
  'if (arc.meta.id === "first-charter") run();',
  'if ("karazhan" == value) run();',
  'return cartridgeId !== "unbundled-new-id" ? one : two;',
  'switch (arc.meta.id) { case THEME.id: run(); }',
  'switch (x) { case "lamp-district": run(); }',
  'if (arcId === FIRST_CHARTER_THEME.id) run();',
  'if (arc["id"] === "new-id") run();',
  'if (arc.meta["id"] === "new-id") run();',
  'const routes = { "first-charter": first, karazhan: second };',
  'const routes = new Map([["first-charter", first]]);',
  'return routes[cartridgeId](world);',
  'return routes[arc.meta.id](world);',
  'if (["first-charter", "karazhan"].includes(id)) run();',
  'if (supported.has(cartridgeId)) run();',
  'const id = arc.meta.id; if (id === "brand-new") run();',
  'const title = "first-charter"; const alias = title; if (id === alias) run();',
  'return `${arcId === "first-charter" ? one : two}`;',
]) test(`reject cartridge dispatch: ${source}`, () => assert.ok(rules(source).includes('cartridge-dispatch')));

test('promoted imports, contract capabilities, generic identity and comments pass', () => {
  for (const source of [
    'import { compile } from "../play-pipeline/compile.js";',
    'export * from "./promoted/index.js";',
    'const module = import("./promoted.js");',
    'if (arc.capabilities.includes("spatial")) render();',
    'return a.meta.id === b.meta.id;',
    '// import x from "../labs/x";\n/* if (arcId === "first-charter") run(); */',
    'const name = "collaboration"; const id = "first-charter";',
    'const appearance = { id: "first-charter", color: "blue" };',
    'const el = <div>{world.arc.meta.id}</div>;',
    'useEffect(update, [world.arc.meta.id]);',
  ]) assert.deepEqual(rules(source), [], source);
});

test('vendored source is checked for imports but not runtime composition', () => {
  assert.deepEqual(rules('if (arcId === "first-charter") run();', 'src/engine/sample.ts'), []);
  assert.ok(rules('import "../labs/x";', 'src/engine/sample.ts').includes('probe-dependency'));
});

function fixture(t) {
  const cache = path.join(root, '.cache');
  fs.mkdirSync(cache, { recursive: true });
  const dir = fs.mkdtempSync(path.join(cache, 'scaffold-test-'));
  t.after(() => {
    assert.ok(path.resolve(dir).startsWith(path.resolve(cache) + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), content);
  };
  write('src/world/NewHost.ts', 'if (arcId === "first-charter") run();');
  return { dir, write };
}

test('new files and transitive barrels cannot escape scanning; probes remain usable', (t) => {
  const { dir, write } = fixture(t);
  write('src/world/NewHost.ts', 'import "./barrel.js";');
  write('src/world/barrel.ts', 'export * from "../experiments/proof.js";');
  write('src/experiments/proof.ts', 'import "../../labs/older.js";');
  const errors = checkRepository(dir, { ...policy, exceptions: [] });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].file, 'src/world/barrel.ts');
});

test('source escapes and unhandled alias configurations fail closed', (t) => {
  const { dir, write } = fixture(t);
  write('src/world/NewHost.ts', 'export * from "../../outside.js";');
  write('tsconfig.json', '{"compilerOptions":{"paths":{"@proof":["labs/x"]}}}');
  const errors = checkRepository(dir, { ...policy, exceptions: [] });
  assert.ok(errors.some((f) => f.rule === 'source-escape'));
  assert.ok(errors.some((f) => f.rule === 'module-mapping'));
  assert.ok(rules('import x from "/outside/bridge.js";').includes('source-escape'));
  assert.ok(rules('import x from "file:///outside/bridge.js";').includes('source-escape'));
});

test('exceptions require exact file, rule, content, rationale, owner and exit criteria', (t) => {
  const { dir, write } = fixture(t);
  const file = 'src/world/NewHost.ts';
  const source = fs.readFileSync(path.join(dir, file), 'utf8');
  const exception = { file, rule: 'cartridge-dispatch', sha256: fingerprint(source), reason: 'Existing fixture seam', owner: 'World maintainers', removeWhen: 'Capability dispatch replaces this seam' };
  const check = (exceptions) => checkRepository(dir, { ...policy, exceptions });
  assert.deepEqual(check([exception]), []);
  assert.equal(fingerprint('a\r\nb'), fingerprint('a\nb'));
  for (const field of ['reason', 'owner', 'removeWhen', 'sha256', 'file', 'rule']) {
    assert.ok(check([{ ...exception, [field]: '' }]).some((f) => f.rule === 'invalid-exception'), field);
  }
  assert.ok(check([exception, exception]).some((f) => f.rule === 'invalid-exception'));
  write(file, `${source}\nimport "../labs/leak.js";`);
  assert.ok(check([exception]).some((f) => f.rule === 'probe-dependency'));
  assert.ok(check([exception]).some((f) => f.rule === 'invalid-exception'));
  write(file, 'export const promoted = true;');
  assert.ok(check([exception]).some((f) => f.rule === 'invalid-exception'));
});

test('repository satisfies circulation policy', () => assert.deepEqual(checkRepository(root, policy), []));
