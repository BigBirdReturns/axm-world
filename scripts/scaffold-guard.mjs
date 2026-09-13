// Offline repository policy. Node built-ins only; never loaded by the runtime.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const fingerprint = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const normalize = (value) => value.replaceAll('\\', '/');

// A conservative lexical guard, not a JavaScript evaluator. Keep executable
// punctuation and decoded literals, discard comments. Rules below intentionally
// also reject identity predicates assigned to variables before dispatch.
export function tokens(source) {
  const result = [];
  const pattern = /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|===|!==|==|!=|=>|&&|\|\||[^\s]/g;
  for (const match of source.matchAll(pattern)) {
    const raw = match[0];
    if (raw.startsWith('//') || raw.startsWith('/*')) continue;
    const literal = ['"', "'", '`'].includes(raw[0]) && raw.length > 1;
    const value = literal ? raw.slice(1, -1).replace(/\\u\{([\da-f]+)\}|\\u([\da-f]{4})|\\x([\da-f]{2})|\\(.)/gi,
      (_, wide, unicode, hex, escaped) => wide || unicode || hex ? String.fromCodePoint(parseInt(wide || unicode || hex, 16)) : escaped) : raw;
    result.push({ value, raw, literal, offset: match.index });
    // Template interpolation cannot hide imports or routing predicates.
    if (raw[0] === '`') {
      for (const expression of raw.matchAll(/\$\{([^}]*)\}/g)) {
        result.push(...tokens(expression[1]).map((t) => ({ ...t, offset: match.index + expression.index + 2 + t.offset })));
      }
    }
  }
  return result;
}

function probePath(value, policy) {
  // Check before AND after normalization: traversing out of a probe directory
  // is not an accepted production dependency spelling either.
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* Not a URI spelling. */ }
  return [normalize(value), normalize(decoded), path.posix.normalize(normalize(decoded))].some((candidate) =>
    candidate.split(/[/?#]/).some((part) => policy.probeSegments.includes(part.toLowerCase())));
}

export function inspectSource(file, source, policy) {
  const ts = tokens(source);
  const findings = [];
  const add = (rule, token, detail) => findings.push({ file, rule, line: source.slice(0, token.offset).split('\n').length, detail });
  // Deliberately stronger than import-only: every scaffold path literal in
  // production is rejected, covering re-exports, require, URL and CSS imports,
  // aliases, import types and dynamic imports without executing a resolver.
  for (const token of ts) {
    if (token.literal && probePath(token.value, policy)) add('probe-dependency', token, token.value);
  }
  for (let i = 0; i < ts.length; i++) {
    if (['import', 'require'].includes(ts[i].value) && ts[i + 1]?.value === '(') {
      if (!ts[i + 2]?.literal || ts[i + 2].value.includes('${') || ![')', ','].includes(ts[i + 3]?.value)) {
        add('computed-module', ts[i], 'Module loading must use one literal specifier');
      }
    }
    const specifier = ts[i];
    const modulePosition = ts[i - 1]?.value === 'from' || ts[i - 1]?.value === 'import'
      || (ts[i - 1]?.value === '(' && ['import', 'require'].includes(ts[i - 2]?.value));
    if (specifier.literal && modulePosition && /^(?:\/|[A-Za-z]:|file:)/.test(normalize(specifier.value))) {
      add('source-escape', specifier, 'Absolute module paths bypass production roots');
    }
    if (specifier.literal && modulePosition && specifier.value.startsWith('.')) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), normalize(specifier.value)));
      if (/\.(?:[cm]?[jt]sx?)(?:[?#].*)?$/.test(target) || !path.posix.extname(target)) {
        if (!policy.productionRoots.some((root) => target.startsWith(`${root}/`))) {
          add('source-escape', specifier, `Code dependency leaves production roots: ${target}`);
        }
      }
    }
  }
  if (file.endsWith('.css') || !policy.compositionRoots.some((root) => file.startsWith(root))) return findings;
  const identityPattern = /\b(?:arcId|cartridgeId)\b|\b(?:meta|arc|cartridge)\s*(?:\?\s*\.)?\s*(?:\.\s*id|\[\s*id\s*\])/;
  const aliases = new Set();
  // Track simple local aliases to a fixed point, including aliases declared
  // after a function that uses them. This is intentionally scope-conservative.
  for (let pass = 0; pass < ts.length; pass++) {
    const before = aliases.size;
    for (let i = 0; i < ts.length; i++) {
      if (!['const', 'let', 'var'].includes(ts[i].value) || ts[i + 2]?.value !== '=') continue;
      const rhs = [];
      for (let j = i + 3; j < ts.length && ts[j].value !== ';'; j++) rhs.push(ts[j]);
      if (!rhs.length || !rhs.every((t) => t.literal || /^[A-Za-z_$][\w$]*$/.test(t.value) || ['.', '?', '[', ']'].includes(t.value))) continue;
      if (identityPattern.test(rhs.map((t) => t.value).join(' '))
        || rhs.some((t) => (t.literal && policy.cartridgeIds.includes(t.value)) || (!t.literal && aliases.has(t.value)))) aliases.add(ts[i + 1].value);
    }
    if (aliases.size === before) break;
  }
  // Inspect bounded expression/statement regions. Identity equality is itself
  // a dispatch capability even when its boolean is used elsewhere later.
  let region = [];
  const inspect = () => {
    if (!region.length) return;
    const values = region.map((t) => t.value);
    const spelling = values.join(' ');
    const identity = identityPattern.test(spelling);
    const aliased = region.some((t) => !t.literal && aliases.has(t.value));
    const concrete = region.some((t) => t.literal && policy.cartridgeIds.includes(t.value));
    const comparison = values.some((v) => ['===', '!==', '==', '!=', 'switch', 'case', 'includes', 'has', 'get'].includes(v));
    const lookup = /\w\s*\[\s*(?:(?:\w+\s*\.\s*)*meta\s*\.\s*id|arcId|cartridgeId)\s*\]/.test(spelling);
    const keyedDispatch = region.some((t, i) => policy.cartridgeIds.includes(t.value) && region[i + 1]?.value === ':');
    const identityComparison = identity && (values.some((v) => ['switch', 'includes', 'has', 'get'].includes(v)) || /(?:arcId|cartridgeId|\bid|\])\s*(?:===|!==|==|!=)|(?:===|!==|==|!=)\s*(?:arcId|cartridgeId|(?:\w+\s*\.\s*)*(?:meta|arc|cartridge)\s*\.\s*id)/.test(spelling));
    const genericIdentityEquality = /meta\s*\.\s*id\s*(?:===|!==|==|!=)\s*(?:\w+\s*\.\s*)*meta\s*\.\s*id/.test(spelling)
      && values.filter((v) => ['===', '!==', '==', '!='].includes(v)).length === 1 && !concrete;
    if ((identityComparison && !genericIdentityEquality) || ((concrete || aliased) && comparison)
      || (concrete && values.includes('[')) || lookup || keyedDispatch) {
      add('cartridge-dispatch', region[0], spelling);
    }
    region = [];
  };
  for (const token of ts) {
    if ([';', '{', '}'].includes(token.value) && !token.literal) inspect();
    else region.push(token);
  }
  inspect();
  return findings;
}

export function checkRepository(root, policy) {
  const findings = [];
  const files = new Map();
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (entry.isSymbolicLink()) { findings.push({ file, rule: 'symlink', detail: 'Source symlinks require explicit boundary design' }); continue; }
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:[cm]?[jt]sx?|css)$/.test(file) && !probePath(file, policy)) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        files.set(file, source);
        findings.push(...inspectSource(file, source, policy));
      }
    }
  }
  for (const dir of policy.productionRoots) walk(dir);
  // No custom alias resolver exists in this dependency-free guard. Fail closed
  // when mappings are introduced, rather than quietly missing their targets.
  for (const name of fs.readdirSync(root).filter((name) => /^tsconfig.*\.json$/.test(name))) {
    const configTokens = tokens(fs.readFileSync(path.join(root, name), 'utf8'));
    if (configTokens.some((t) => ['paths', 'baseUrl', 'extends'].includes(t.value))) findings.push({ file: name, rule: 'module-mapping', detail: 'Teach the guard to resolve this mapping before introducing it' });
  }
  for (const name of ['vite.config.ts', 'package.json']) {
    if (!fs.existsSync(path.join(root, name))) continue;
    const configTokens = tokens(fs.readFileSync(path.join(root, name), 'utf8'));
    if (configTokens.some((t) => (name === 'package.json' ? ['imports'] : ['alias']).includes(t.value))) findings.push({ file: name, rule: 'module-mapping', detail: 'Teach the guard to resolve this mapping before introducing it' });
  }
  const errors = [];
  const used = new Set();
  for (const exception of policy.exceptions) {
    const key = `${exception.file}:${exception.rule}`;
    if (used.has(key) || !exception.reason?.trim() || !exception.owner?.trim() || !exception.removeWhen?.trim()
      || !files.has(exception.file) || fingerprint(files.get(exception.file)) !== exception.sha256
      || !findings.some((f) => f.file === exception.file && f.rule === exception.rule)) {
      errors.push({ file: exception.file, rule: 'invalid-exception', detail: 'Duplicate, stale, changed or undocumented exception' });
    }
    used.add(key);
  }
  return [...errors, ...findings.filter((f) => !policy.exceptions.some((e) => e.file === f.file && e.rule === f.rule
    && e.sha256 === fingerprint(files.get(f.file) ?? '')))];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'scripts/scaffold-policy.json'), 'utf8'));
  const findings = checkRepository(root, policy);
  for (const finding of findings) console.error(`${finding.file}:${finding.line ?? 1} [${finding.rule}] ${finding.detail}`);
  console.log(`Scaffold circulation: ${findings.length ? 'FAIL' : 'PASS'}`);
  process.exitCode = findings.length ? 1 : 0;
}
