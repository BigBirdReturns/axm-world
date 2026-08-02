import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const FORMAT = 'rodoh-stardew-host-seam/1';
export const PROFILE_FORMAT = 'rodoh-stardew-profile-lock/1';
export const RECEIPT_FORMAT = 'rodoh-stardew-seam-receipt/1';
export const SNAPSHOT_FORMAT = 'rodoh-stardew-save-snapshot/1';

const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_SCAN_ENTRIES = 100_000;
const MAX_HASH_FILE_BYTES = 4 * 1024 * 1024 * 1024;

export const MODES = Object.freeze([
  'native-2d',
  'desktop-3d',
  'hmd-vr',
  'cabinet-tv',
]);

export const DEFAULT_POLICY = Object.freeze({
  format: 'rodoh-stardew-compatibility-policy/1',
  rendererIds: ['GingasVR.Stardew3D'],
  configurationIds: ['spacechase0.GenericModConfigMenu'],
  contentFrameworkIds: ['Pathoschild.ContentPatcher'],
  bridgeIds: ['BigBirdReturns.RodohStardewBridge'],
  cabinetAdapterIds: ['BigBirdReturns.RodohStardewCabinetAdapter'],
  hardConflicts: [
    {
      all: ['GingasVR.Stardew3D', 'aurpine.ClearGlasses'],
      code: 'renderer-conflict.clear-glasses',
      message:
        'Stardew3DVR declares Clear Glasses incompatible. Use a separate profile instead of letting two render-rewrite layers compete.',
    },
  ],
  recommendations: [
    {
      whenPresent: 'GingasVR.Stardew3D',
      whenAbsent: 'spacechase0.GenericModConfigMenu',
      code: 'renderer-config-surface-missing',
      message:
        'Generic Mod Config Menu is recommended so renderer, runtime, turn, hand-angle, and fallback settings remain ordinary player configuration.',
    },
    {
      whenPresent: 'GingasVR.Stardew3D',
      whenAbsent: 'BigBirdReturns.RodohStardewBridge',
      code: 'rodoh-bridge-missing',
      message:
        'The upstream renderer can run without the RODOH bridge, but semantic receipts and MotionDeck handshake telemetry will be absent.',
    },
  ],
});

export function normalizeId(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : '';
}

export function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort((a, b) => a.localeCompare(b, 'en-US'));
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

export function digestObject(value) {
  return sha256Bytes(Buffer.from(stableStringify(value), 'utf8'));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanRelativePath(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  if (
    normalized === '' ||
    normalized === '.' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }
  return normalized;
}

async function pathExists(candidate) {
  try {
    await fsp.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(candidate) {
  try {
    return (await fsp.stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(candidate) {
  try {
    return (await fsp.stat(candidate)).isFile();
  } catch {
    return false;
  }
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

function sortIssues(issues) {
  const rank = { blocker: 0, warning: 1, info: 2 };
  return [...issues].sort((a, b) => {
    const byRank = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
    if (byRank !== 0) return byRank;
    const byCode = String(a.code).localeCompare(String(b.code), 'en-US');
    if (byCode !== 0) return byCode;
    return stableStringify(a).localeCompare(stableStringify(b), 'en-US');
  });
}

async function walk(root, options = {}) {
  const {
    include = () => true,
    followSymlinks = false,
    maxEntries = MAX_SCAN_ENTRIES,
  } = options;

  const output = [];
  const queue = [root];
  let visited = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Unable to read ${current}: ${error.message}`);
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, 'en-US'));
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      visited += 1;
      if (visited > maxEntries) {
        throw new Error(`Scan entry ceiling exceeded (${maxEntries}) under ${root}`);
      }

      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        if (!followSymlinks) continue;
        const stat = await fsp.stat(absolute);
        if (stat.isDirectory()) queue.push(absolute);
        else if (stat.isFile() && include(absolute, entry.name)) output.push(absolute);
      } else if (entry.isDirectory()) {
        queue.push(absolute);
      } else if (entry.isFile() && include(absolute, entry.name)) {
        output.push(absolute);
      }
    }
  }

  return output;
}

async function findSymlinks(root, maxEntries = MAX_SCAN_ENTRIES) {
  const output = [];
  const queue = [root];
  let visited = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en-US'));
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      visited += 1;
      if (visited > maxEntries) {
        throw new Error(`Scan entry ceiling exceeded (${maxEntries}) under ${root}`);
      }
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        output.push(absolute);
      } else if (entry.isDirectory()) {
        queue.push(absolute);
      }
    }
  }

  return output;
}

async function findIgnoredDotDirectories(root, maxEntries = MAX_SCAN_ENTRIES) {
  const output = [];
  const queue = [root];
  let visited = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en-US'));
    for (const entry of entries) {
      visited += 1;
      if (visited > maxEntries) {
        throw new Error(`Scan entry ceiling exceeded (${maxEntries}) under ${root}`);
      }
      const absolute = path.join(current, entry.name);
      if (entry.name.startsWith('.')) {
        if (entry.isDirectory() || entry.isSymbolicLink()) output.push(absolute);
        continue;
      }
      if (entry.isDirectory()) queue.push(absolute);
    }
  }

  return output;
}

export async function findManifestFiles(modsDir) {
  if (!(await isDirectory(modsDir))) {
    throw new Error(`Mods directory does not exist: ${modsDir}`);
  }
  return walk(modsDir, {
    include: (_absolute, name) => name.toLocaleLowerCase('en-US') === 'manifest.json',
  });
}

function parseDependency(value, index) {
  if (!isPlainObject(value) || typeof value.UniqueID !== 'string' || !value.UniqueID.trim()) {
    return {
      valid: false,
      issue: issue('blocker', 'manifest.invalid-dependency', `Dependency ${index} has no UniqueID.`),
    };
  }
  return {
    valid: true,
    value: {
      uniqueId: value.UniqueID.trim(),
      normalizedId: normalizeId(value.UniqueID),
      minimumVersion:
        typeof value.MinimumVersion === 'string' && value.MinimumVersion.trim()
          ? value.MinimumVersion.trim()
          : null,
      required: value.IsRequired !== false,
    },
  };
}

async function hashFile(filePath) {
  const stat = await fsp.stat(filePath);
  if (!stat.isFile()) throw new Error(`Not a regular file: ${filePath}`);
  if (stat.size > MAX_HASH_FILE_BYTES) {
    throw new Error(`File exceeds hash ceiling (${MAX_HASH_FILE_BYTES} bytes): ${filePath}`);
  }
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function hashDirectoryInventory(directory) {
  const files = await walk(directory, {
    include: (absolute, name) => {
      const lower = name.toLocaleLowerCase('en-US');
      if (lower === 'config.json' || lower.endsWith('.log')) return false;
      const normalized = absolute.split(path.sep).join('/').toLocaleLowerCase('en-US');
      return !normalized.includes('/receipts/') && !normalized.includes('/.git/');
    },
  });

  const entries = [];
  for (const filePath of files) {
    const relative = cleanRelativePath(path.relative(directory, filePath));
    if (!relative) throw new Error(`Unsafe file path under mod directory: ${filePath}`);
    const stat = await fsp.stat(filePath);
    entries.push({
      path: relative,
      bytes: stat.size,
      sha256: await hashFile(filePath),
    });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path, 'en-US'));
  return {
    fileCount: entries.length,
    byteCount: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    digest: digestObject(entries),
    entries,
  };
}

export async function parseManifestFile(manifestPath, modsDir, options = {}) {
  const { deepHash = false } = options;
  const stat = await fsp.stat(manifestPath);
  const relativeManifestPath = cleanRelativePath(path.relative(modsDir, manifestPath));
  const issues = [];

  if (!relativeManifestPath) {
    return {
      manifestPath,
      issues: [
        issue('blocker', 'manifest.path-escape', 'Manifest path escapes the selected Mods directory.', {
          manifestPath,
        }),
      ],
    };
  }
  if (stat.size > MAX_MANIFEST_BYTES) {
    return {
      manifestPath,
      relativeManifestPath,
      issues: [
        issue(
          'blocker',
          'manifest.oversized',
          `Manifest exceeds ${MAX_MANIFEST_BYTES} bytes.`,
          { relativeManifestPath, bytes: stat.size },
        ),
      ],
    };
  }

  const bytes = await fsp.readFile(manifestPath);
  let raw;
  try {
    raw = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    return {
      manifestPath,
      relativeManifestPath,
      manifestSha256: sha256Bytes(bytes),
      issues: [
        issue('blocker', 'manifest.invalid-json', `Manifest is not valid JSON: ${error.message}`, {
          relativeManifestPath,
        }),
      ],
    };
  }

  if (!isPlainObject(raw)) {
    return {
      manifestPath,
      relativeManifestPath,
      manifestSha256: sha256Bytes(bytes),
      issues: [
        issue('blocker', 'manifest.not-object', 'Manifest root must be a JSON object.', {
          relativeManifestPath,
        }),
      ],
    };
  }

  const uniqueId = typeof raw.UniqueID === 'string' ? raw.UniqueID.trim() : '';
  const name = typeof raw.Name === 'string' && raw.Name.trim() ? raw.Name.trim() : uniqueId || '(unnamed)';
  const version = typeof raw.Version === 'string' && raw.Version.trim() ? raw.Version.trim() : null;
  const minimumApiVersion =
    typeof raw.MinimumApiVersion === 'string' && raw.MinimumApiVersion.trim()
      ? raw.MinimumApiVersion.trim()
      : null;
  const entryDll = typeof raw.EntryDll === 'string' && raw.EntryDll.trim() ? raw.EntryDll.trim() : null;
  const contentPackFor =
    isPlainObject(raw.ContentPackFor) && typeof raw.ContentPackFor.UniqueID === 'string'
      ? {
          uniqueId: raw.ContentPackFor.UniqueID.trim(),
          normalizedId: normalizeId(raw.ContentPackFor.UniqueID),
          minimumVersion:
            typeof raw.ContentPackFor.MinimumVersion === 'string' && raw.ContentPackFor.MinimumVersion.trim()
              ? raw.ContentPackFor.MinimumVersion.trim()
              : null,
        }
      : null;
  const dependencies = [];

  if (!uniqueId) {
    issues.push(
      issue('blocker', 'manifest.missing-unique-id', 'Manifest has no non-empty UniqueID.', {
        relativeManifestPath,
      }),
    );
  }
  if (!version) {
    issues.push(
      issue('warning', 'manifest.missing-version', 'Manifest has no Version.', {
        relativeManifestPath,
        uniqueId: uniqueId || null,
      }),
    );
  }
  if (!entryDll && !contentPackFor) {
    issues.push(
      issue(
        'blocker',
        'manifest.no-load-surface',
        'Manifest must declare EntryDll or ContentPackFor.',
        { relativeManifestPath, uniqueId: uniqueId || null },
      ),
    );
  }
  if (entryDll && contentPackFor) {
    issues.push(
      issue(
        'blocker',
        'manifest.ambiguous-load-surface',
        'Manifest declares both EntryDll and ContentPackFor.',
        { relativeManifestPath, uniqueId: uniqueId || null },
      ),
    );
  }
  if (contentPackFor && !contentPackFor.uniqueId) {
    issues.push(
      issue(
        'blocker',
        'manifest.content-pack-host-missing',
        'ContentPackFor must name a non-empty UniqueID.',
        { relativeManifestPath, uniqueId: uniqueId || null },
      ),
    );
  }

  if (raw.Dependencies !== undefined && !Array.isArray(raw.Dependencies)) {
    issues.push(
      issue('blocker', 'manifest.dependencies-not-array', 'Dependencies must be an array.', {
        relativeManifestPath,
        uniqueId: uniqueId || null,
      }),
    );
  } else {
    for (const [index, dependency] of (raw.Dependencies ?? []).entries()) {
      const parsed = parseDependency(dependency, index);
      if (parsed.valid) dependencies.push(parsed.value);
      else issues.push({ ...parsed.issue, relativeManifestPath, uniqueId: uniqueId || null });
    }
    const dependencyIds = new Set();
    for (const dependency of dependencies) {
      if (dependencyIds.has(dependency.normalizedId)) {
        issues.push(
          issue(
            'blocker',
            'manifest.duplicate-dependency',
            'Dependencies contains the same UniqueID more than once.',
            {
              relativeManifestPath,
              uniqueId: uniqueId || null,
              dependency: dependency.uniqueId,
            },
          ),
        );
      }
      dependencyIds.add(dependency.normalizedId);
    }
  }

  const directory = path.dirname(manifestPath);
  const relativeDirectory = cleanRelativePath(path.relative(modsDir, directory));
  if (!relativeDirectory) {
    issues.push(
      issue('blocker', 'mod.path-escape', 'Mod directory escapes the selected Mods root.', {
        relativeManifestPath,
        uniqueId: uniqueId || null,
      }),
    );
  }

  let entryDllExists = null;
  if (entryDll) {
    const dllPath = path.resolve(directory, entryDll);
    const relativeDll = cleanRelativePath(path.relative(directory, dllPath));
    if (!relativeDll) {
      issues.push(
        issue('blocker', 'manifest.entry-dll-path-escape', 'EntryDll escapes its mod directory.', {
          relativeManifestPath,
          uniqueId: uniqueId || null,
          entryDll,
        }),
      );
      entryDllExists = false;
    } else {
      entryDllExists = await isFile(dllPath);
      if (!entryDllExists) {
        issues.push(
          issue('blocker', 'manifest.entry-dll-missing', 'EntryDll does not exist.', {
            relativeManifestPath,
            uniqueId: uniqueId || null,
            entryDll,
          }),
        );
      }
    }
  }

  let directoryInventory = null;
  if (deepHash && relativeDirectory) {
    directoryInventory = await hashDirectoryInventory(directory);
  }

  return {
    manifestPath,
    relativeManifestPath,
    directory,
    relativeDirectory,
    manifestSha256: sha256Bytes(bytes),
    name,
    uniqueId,
    normalizedId: normalizeId(uniqueId),
    version,
    minimumApiVersion,
    kind: entryDll ? 'code-mod' : contentPackFor ? 'content-pack' : 'invalid',
    entryDll,
    entryDllExists,
    contentPackFor,
    dependencies,
    updateKeys: Array.isArray(raw.UpdateKeys)
      ? raw.UpdateKeys.filter((value) => typeof value === 'string').sort()
      : [],
    directoryInventory,
    issues: sortIssues(issues),
  };
}

export async function scanMods(modsDir, options = {}) {
  const manifestPaths = await findManifestFiles(modsDir);
  const symlinks = await findSymlinks(modsDir);
  const ignoredDotDirectories = await findIgnoredDotDirectories(modsDir);
  const mods = [];
  const issues = symlinks.map((symlinkPath) =>
    issue(
      'blocker',
      'mods.symlink-unadmitted',
      'Symlinks are not admitted into an isolated profile because their target bytes are outside the scanned custody graph.',
      { path: cleanRelativePath(path.relative(modsDir, symlinkPath)) ?? symlinkPath },
    ),
  );
  for (const manifestPath of manifestPaths) {
    const parsed = await parseManifestFile(manifestPath, modsDir, options);
    mods.push(parsed);
    issues.push(...parsed.issues);
  }
  mods.sort((a, b) => {
    const id = String(a.normalizedId).localeCompare(String(b.normalizedId), 'en-US');
    if (id !== 0) return id;
    return String(a.relativeManifestPath).localeCompare(String(b.relativeManifestPath), 'en-US');
  });
  if (ignoredDotDirectories.length > 0) {
    issues.push(
      issue(
        'info',
        'mods.dot-folders-disabled',
        'Dot-prefixed folders were ignored to match SMAPI disabled-folder behavior.',
        {
          count: ignoredDotDirectories.length,
          paths: ignoredDotDirectories
            .map((ignoredPath) => cleanRelativePath(path.relative(modsDir, ignoredPath)) ?? ignoredPath)
            .sort(),
        },
      ),
    );
  }
  if (manifestPaths.length === 0) {
    issues.push(issue('warning', 'mods.empty', 'No active SMAPI manifests were found.', { modsDir }));
  }
  return {
    modsDir,
    manifestCount: manifestPaths.length,
    ignored: ignoredDotDirectories
      .map((ignoredPath) => ({
        path: cleanRelativePath(path.relative(modsDir, ignoredPath)) ?? ignoredPath,
        reason: 'dot-prefix-disabled',
      }))
      .sort((a, b) => a.path.localeCompare(b.path, 'en-US')),
    mods,
    issues: sortIssues(issues),
  };
}

function dependencyEdgesFor(mod) {
  const edges = [];
  if (mod.contentPackFor?.normalizedId) {
    edges.push({
      target: mod.contentPackFor.normalizedId,
      targetDisplay: mod.contentPackFor.uniqueId,
      required: true,
      minimumVersion: mod.contentPackFor.minimumVersion,
      source: 'ContentPackFor',
    });
  }
  for (const dependency of mod.dependencies ?? []) {
    edges.push({
      target: dependency.normalizedId,
      targetDisplay: dependency.uniqueId,
      required: dependency.required,
      minimumVersion: dependency.minimumVersion,
      source: 'Dependencies',
    });
  }
  return edges;
}

function findCycles(uniqueMods) {
  const map = new Map(uniqueMods.map((mod) => [mod.normalizedId, mod]));
  const state = new Map();
  const stack = [];
  const cycles = [];
  const fingerprints = new Set();

  function visit(id) {
    const currentState = state.get(id) ?? 0;
    if (currentState === 2) return;
    if (currentState === 1) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const members = cycle.slice(0, -1);
      const fingerprint = [...members].sort().join('|');
      if (!fingerprints.has(fingerprint)) {
        fingerprints.add(fingerprint);
        cycles.push(cycle);
      }
      return;
    }

    state.set(id, 1);
    stack.push(id);
    const mod = map.get(id);
    for (const edge of dependencyEdgesFor(mod).filter((item) => item.required)) {
      if (map.has(edge.target)) visit(edge.target);
    }
    stack.pop();
    state.set(id, 2);
  }

  for (const id of [...map.keys()].sort()) visit(id);
  return cycles;
}

function topologicalOrder(uniqueMods) {
  const map = new Map(uniqueMods.map((mod) => [mod.normalizedId, mod]));
  const indegree = new Map([...map.keys()].map((id) => [id, 0]));
  const dependents = new Map([...map.keys()].map((id) => [id, []]));

  for (const mod of uniqueMods) {
    for (const edge of dependencyEdgesFor(mod).filter((item) => item.required)) {
      if (!map.has(edge.target) || edge.target === mod.normalizedId) continue;
      indegree.set(mod.normalizedId, (indegree.get(mod.normalizedId) ?? 0) + 1);
      dependents.get(edge.target).push(mod.normalizedId);
    }
  }

  const ready = [...indegree.entries()]
    .filter(([, count]) => count === 0)
    .map(([id]) => id)
    .sort();
  const ordered = [];

  while (ready.length > 0) {
    const id = ready.shift();
    ordered.push(id);
    for (const dependent of dependents.get(id).sort()) {
      indegree.set(dependent, indegree.get(dependent) - 1);
      if (indegree.get(dependent) === 0) {
        ready.push(dependent);
        ready.sort();
      }
    }
  }

  return ordered;
}

function parseLooseVersion(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/);
  if (!match) return null;
  return match.slice(1, 5).map((part) => Number(part ?? 0));
}

function compareLooseVersions(left, right) {
  const a = parseLooseVersion(left);
  const b = parseLooseVersion(right);
  if (!a || !b) return null;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }
  return 0;
}

export function buildModGraph(mods, policy = DEFAULT_POLICY) {
  const issues = [];
  const byId = new Map();

  for (const mod of mods) {
    if (!mod.normalizedId) continue;
    const list = byId.get(mod.normalizedId) ?? [];
    list.push(mod);
    byId.set(mod.normalizedId, list);
  }

  for (const [id, matches] of byId.entries()) {
    if (matches.length > 1) {
      issues.push(
        issue('blocker', 'graph.duplicate-unique-id', 'More than one manifest claims the same UniqueID.', {
          normalizedId: id,
          uniqueId: matches[0].uniqueId,
          manifests: matches.map((mod) => mod.relativeManifestPath).sort(),
        }),
      );
    }
  }

  const uniqueMods = [...byId.values()].filter((matches) => matches.length === 1).map(([mod]) => mod);
  const uniqueMap = new Map(uniqueMods.map((mod) => [mod.normalizedId, mod]));

  for (const mod of uniqueMods) {
    for (const edge of dependencyEdgesFor(mod)) {
      if (!edge.target) continue;
      if (edge.target === mod.normalizedId) {
        issues.push(
          issue('blocker', 'graph.self-dependency', 'A mod depends on itself.', {
            uniqueId: mod.uniqueId,
            dependency: edge.targetDisplay,
            source: edge.source,
          }),
        );
      } else if (!uniqueMap.has(edge.target)) {
        issues.push(
          issue(
            edge.required ? 'blocker' : 'info',
            edge.required ? 'graph.required-dependency-missing' : 'graph.optional-dependency-missing',
            `${edge.required ? 'Required' : 'Optional'} dependency is not present.`,
            {
              uniqueId: mod.uniqueId,
              dependency: edge.targetDisplay,
              minimumVersion: edge.minimumVersion ?? null,
              source: edge.source,
            },
          ),
        );
      } else if (edge.minimumVersion) {
        const target = uniqueMap.get(edge.target);
        const comparison = compareLooseVersions(target.version, edge.minimumVersion);
        if (comparison === null) {
          issues.push(
            issue(
              edge.required ? 'blocker' : 'warning',
              'graph.dependency-version-unprovable',
              'Dependency minimum version cannot be proven from the installed manifest.',
              {
                uniqueId: mod.uniqueId,
                dependency: target.uniqueId,
                installedVersion: target.version,
                minimumVersion: edge.minimumVersion,
                source: edge.source,
              },
            ),
          );
        } else if (comparison < 0) {
          issues.push(
            issue(
              edge.required ? 'blocker' : 'warning',
              'graph.dependency-version-too-old',
              'Installed dependency does not meet the declared minimum version.',
              {
                uniqueId: mod.uniqueId,
                dependency: target.uniqueId,
                installedVersion: target.version,
                minimumVersion: edge.minimumVersion,
                source: edge.source,
              },
            ),
          );
        }
      }
    }
  }

  const cycles = findCycles(uniqueMods);
  for (const cycle of cycles) {
    issues.push(
      issue('blocker', 'graph.required-dependency-cycle', 'Required dependency graph contains a cycle.', {
        cycle: cycle.map((id) => uniqueMap.get(id)?.uniqueId ?? id),
      }),
    );
  }

  const installedIds = new Set(uniqueMods.map((mod) => mod.normalizedId));
  for (const rule of policy.hardConflicts ?? []) {
    const normalized = rule.all.map(normalizeId);
    if (normalized.every((id) => installedIds.has(id))) {
      issues.push(
        issue('blocker', rule.code, rule.message, {
          components: normalized.map((id) => uniqueMap.get(id)?.uniqueId ?? id),
        }),
      );
    }
  }
  for (const rule of policy.recommendations ?? []) {
    const present = normalizeId(rule.whenPresent);
    const absent = normalizeId(rule.whenAbsent);
    if (installedIds.has(present) && !installedIds.has(absent)) {
      issues.push(
        issue('warning', rule.code, rule.message, {
          present: uniqueMap.get(present)?.uniqueId ?? rule.whenPresent,
          absent: rule.whenAbsent,
        }),
      );
    }
  }

  const order = cycles.length === 0 ? topologicalOrder(uniqueMods) : [];
  const loadOrder = order.map((id) => uniqueMap.get(id).uniqueId);
  const nodes = uniqueMods
    .map((mod) => ({
      uniqueId: mod.uniqueId,
      normalizedId: mod.normalizedId,
      name: mod.name,
      version: mod.version,
      kind: mod.kind,
      manifest: mod.relativeManifestPath,
      manifestSha256: mod.manifestSha256,
      directoryDigest: mod.directoryInventory?.digest ?? null,
      contentPackFor: mod.contentPackFor?.uniqueId ?? null,
      dependencies: (mod.dependencies ?? []).map((dependency) => ({
        uniqueId: dependency.uniqueId,
        minimumVersion: dependency.minimumVersion,
        required: dependency.required,
      })),
    }))
    .sort((a, b) => a.normalizedId.localeCompare(b.normalizedId, 'en-US'));

  const graphAuthority = {
    nodes,
    loadOrder,
    policyFormat: policy.format,
  };

  const sortedIssues = sortIssues(issues);
  return {
    nodes,
    loadOrder,
    cycles,
    digest: `stardewgraph1_${digestObject(graphAuthority)}`,
    status: sortedIssues.some((item) => item.severity === 'blocker') ? 'blocked' : 'admitted',
    issues: sortedIssues,
  };
}

function candidateExecutables(gameDir) {
  return {
    game: [
      path.join(gameDir, 'Stardew Valley.exe'),
      path.join(gameDir, 'StardewValley.exe'),
      path.join(gameDir, 'Stardew Valley'),
      path.join(gameDir, 'StardewValley'),
      path.join(gameDir, 'Contents', 'MacOS', 'Stardew Valley'),
    ],
    smapi: [
      path.join(gameDir, 'StardewModdingAPI.exe'),
      path.join(gameDir, 'StardewModdingAPI'),
    ],
  };
}

async function firstExistingFile(candidates) {
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

function parseSteamLibraryFolders(vdf) {
  const output = [];
  const pathPattern = /"path"\s+"((?:\\.|[^"])*)"/g;
  let match;
  while ((match = pathPattern.exec(vdf)) !== null) {
    const decoded = match[1].replace(/\\\\/g, '\\');
    if (decoded && !output.includes(decoded)) output.push(decoded);
  }
  return output;
}

export async function discoverInstallations(options = {}) {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const candidates = new Set();

  for (const explicit of [options.gameDir, env.STARDEW_GAME_DIR, env.STARDEW_VALLEY_GAME_DIR]) {
    if (explicit) candidates.add(path.resolve(explicit));
  }

  const home = options.homeDir ?? os.homedir();
  if (platform === 'win32') {
    const programFilesX86 = env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    const programFiles = env.ProgramFiles ?? 'C:\\Program Files';
    candidates.add(path.join(programFilesX86, 'Steam', 'steamapps', 'common', 'Stardew Valley'));
    candidates.add(path.join(programFiles, 'Steam', 'steamapps', 'common', 'Stardew Valley'));
    candidates.add(path.join(programFilesX86, 'GOG Galaxy', 'Games', 'Stardew Valley'));
    candidates.add(path.join(programFiles, 'GOG Galaxy', 'Games', 'Stardew Valley'));

    const steamRoots = [
      path.join(programFilesX86, 'Steam'),
      path.join(programFiles, 'Steam'),
    ];
    for (const steamRoot of steamRoots) {
      const libraryVdf = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
      if (await isFile(libraryVdf)) {
        const text = await fsp.readFile(libraryVdf, 'utf8');
        for (const library of parseSteamLibraryFolders(text)) {
          candidates.add(path.join(library, 'steamapps', 'common', 'Stardew Valley'));
        }
      }
    }
  } else if (platform === 'darwin') {
    candidates.add(
      path.join(home, 'Library', 'Application Support', 'Steam', 'steamapps', 'common', 'Stardew Valley'),
    );
    candidates.add(path.join('/Applications', 'Stardew Valley.app', 'Contents', 'MacOS'));
  } else {
    candidates.add(path.join(home, '.steam', 'steam', 'steamapps', 'common', 'Stardew Valley'));
    candidates.add(path.join(home, '.local', 'share', 'Steam', 'steamapps', 'common', 'Stardew Valley'));
  }

  const installations = [];
  for (const candidate of [...candidates]) {
    if (!(await isDirectory(candidate))) continue;
    const executables = candidateExecutables(candidate);
    const gameExecutable = await firstExistingFile(executables.game);
    const smapiExecutable = await firstExistingFile(executables.smapi);
    if (!gameExecutable && !smapiExecutable) continue;
    installations.push({
      gameDir: candidate,
      gameExecutable,
      smapiExecutable,
      modsDir: path.join(candidate, 'Mods'),
    });
  }

  installations.sort((a, b) => a.gameDir.localeCompare(b.gameDir, 'en-US'));
  return installations;
}

function inferDefaultSavesDir(platform = process.platform, env = process.env, home = os.homedir()) {
  if (platform === 'win32') {
    const appData = env.APPDATA;
    return appData ? path.join(appData, 'StardewValley', 'Saves') : null;
  }
  if (platform === 'darwin') {
    return path.join(home, '.config', 'StardewValley', 'Saves');
  }
  return path.join(home, '.config', 'StardewValley', 'Saves');
}

export async function inspectInstallation(options = {}) {
  let gameDir = options.gameDir ? path.resolve(options.gameDir) : null;
  if (!gameDir) {
    const installations = await discoverInstallations(options);
    if (installations.length !== 1) {
      const message =
        installations.length === 0
          ? 'No Stardew installation was discovered. Pass --game-dir.'
          : 'More than one Stardew installation was discovered. Pass --game-dir to select authority.';
      return {
        format: FORMAT,
        status: 'blocked',
        issues: [
          issue('blocker', 'installation.selection-required', message, {
            installations,
          }),
        ],
        installations,
      };
    }
    gameDir = installations[0].gameDir;
  }

  const modsDir = path.resolve(options.modsDir ?? path.join(gameDir, 'Mods'));
  const savesDir = options.savesDir
    ? path.resolve(options.savesDir)
    : inferDefaultSavesDir(options.platform, options.env, options.homeDir);
  const issues = [];

  if (!(await isDirectory(gameDir))) {
    issues.push(
      issue('blocker', 'installation.game-dir-missing', 'Selected game directory does not exist.', {
        gameDir,
      }),
    );
  }

  const executables = candidateExecutables(gameDir);
  const gameExecutable = await firstExistingFile(executables.game);
  const smapiExecutable = await firstExistingFile(executables.smapi);
  if (!gameExecutable) {
    issues.push(
      issue('blocker', 'installation.game-executable-missing', 'Stardew executable was not found.', {
        gameDir,
      }),
    );
  }
  if (!smapiExecutable) {
    issues.push(
      issue('blocker', 'installation.smapi-executable-missing', 'SMAPI executable was not found.', {
        gameDir,
      }),
    );
  }
  if (!(await isDirectory(modsDir))) {
    issues.push(
      issue('blocker', 'installation.mods-dir-missing', 'Selected Mods directory does not exist.', {
        modsDir,
      }),
    );
  }
  if (savesDir && !(await isDirectory(savesDir))) {
    issues.push(
      issue('warning', 'installation.saves-dir-missing', 'Save directory was not found.', {
        savesDir,
      }),
    );
  }

  let scan = { modsDir, manifestCount: 0, ignored: [], mods: [], issues: [] };
  let graph = {
    nodes: [],
    loadOrder: [],
    cycles: [],
    digest: `stardewgraph1_${digestObject([])}`,
    status: 'blocked',
    issues: [],
  };
  if (await isDirectory(modsDir)) {
    scan = await scanMods(modsDir, { deepHash: options.deepHash === true });
    graph = buildModGraph(scan.mods, options.policy ?? DEFAULT_POLICY);
    issues.push(...scan.issues, ...graph.issues);
  }

  const sortedIssues = sortIssues(issues);
  const authority = {
    gameDir,
    modsDir,
    savesDir,
    gameExecutable,
    smapiExecutable,
    graphDigest: graph.digest,
    manifestDigests: graph.nodes.map((node) => ({
      uniqueId: node.uniqueId,
      manifestSha256: node.manifestSha256,
      directoryDigest: node.directoryDigest,
    })),
  };

  return {
    format: FORMAT,
    seamVersion: '0.1.0',
    status: sortedIssues.some((item) => item.severity === 'blocker') ? 'blocked' : 'admitted',
    installation: {
      gameDir,
      gameExecutable,
      smapiExecutable,
      modsDir,
      savesDir,
    },
    graph,
    authorityDigest: `stardewseam1_${digestObject(authority)}`,
    issues: sortedIssues,
  };
}

export function modeRequirements(mode) {
  if (!MODES.includes(mode)) throw new Error(`Unknown Stardew mode: ${mode}`);
  switch (mode) {
    case 'native-2d':
      return {
        rendererRequired: false,
        openXrRequired: false,
        televisionCameraRequired: false,
      };
    case 'desktop-3d':
      return {
        rendererRequired: true,
        openXrRequired: false,
        televisionCameraRequired: false,
      };
    case 'hmd-vr':
      return {
        rendererRequired: true,
        openXrRequired: true,
        televisionCameraRequired: false,
      };
    case 'cabinet-tv':
      return {
        rendererRequired: true,
        openXrRequired: true,
        televisionCameraRequired: true,
      };
    default:
      throw new Error(`Unhandled mode: ${mode}`);
  }
}

export function buildLaunchPlan(inspection, options = {}) {
  const mode = options.mode ?? 'desktop-3d';
  const requirements = modeRequirements(mode);
  const issues = [...(inspection.issues ?? [])];
  const ids = new Set((inspection.graph?.nodes ?? []).map((node) => normalizeId(node.uniqueId)));
  const rendererPresent = DEFAULT_POLICY.rendererIds.some((id) => ids.has(normalizeId(id)));
  const bridgePresent = DEFAULT_POLICY.bridgeIds.some((id) => ids.has(normalizeId(id)));
  const cabinetAdapterPresent = DEFAULT_POLICY.cabinetAdapterIds.some((id) =>
    ids.has(normalizeId(id)),
  );

  if (requirements.rendererRequired && !rendererPresent) {
    issues.push(
      issue('blocker', 'mode.renderer-missing', `${mode} requires an admitted 3D presentation adapter.`, {
        expectedAnyOf: DEFAULT_POLICY.rendererIds,
      }),
    );
  }
  if (requirements.televisionCameraRequired && !bridgePresent) {
    issues.push(
      issue(
        'blocker',
        'mode.cabinet-bridge-missing',
        'cabinet-tv requires the RODOH bridge for semantic and lifecycle custody.',
        { expectedAnyOf: DEFAULT_POLICY.bridgeIds },
      ),
    );
  }
  if (requirements.televisionCameraRequired && !cabinetAdapterPresent) {
    issues.push(
      issue(
        'blocker',
        'mode.cabinet-adapter-missing',
        'cabinet-tv remains blocked until a renderer-bound adapter proves live OpenXR tracking and monoscopic television output.',
        { expectedAnyOf: DEFAULT_POLICY.cabinetAdapterIds },
      ),
    );
  }

  const modsDir = path.resolve(options.modsDir ?? inspection.installation?.modsDir ?? 'Mods');
  const executable = inspection.installation?.smapiExecutable ?? null;
  const args = executable ? ['--mods-path', modsDir] : [];
  const sortedIssues = sortIssues(issues);
  const launchAuthority = {
    mode,
    executable,
    args,
    graphDigest: inspection.graph?.digest ?? null,
    requirements,
  };

  return {
    format: 'rodoh-stardew-launch-plan/1',
    status: sortedIssues.some((item) => item.severity === 'blocker') ? 'blocked' : 'admitted',
    mode,
    executable,
    args,
    workingDirectory: inspection.installation?.gameDir ?? null,
    environment: {
      RODOH_STARDEW_MODE: mode,
      RODOH_STARDEW_GRAPH: inspection.graph?.digest ?? null,
      RODOH_STARDEW_RECEIPTS: options.receiptsDir ? path.resolve(options.receiptsDir) : null,
    },
    requirements,
    rendererPresent,
    bridgePresent,
    cabinetAdapterPresent,
    authorityDigest: `stardewlaunch1_${digestObject(launchAuthority)}`,
    issues: sortedIssues,
  };
}

export function buildProfileLock(inspection, launchPlan, options = {}) {
  const profileName = options.profileName ?? 'stardew-default';
  const content = {
    format: PROFILE_FORMAT,
    seamVersion: '0.1.0',
    profileName,
    status:
      inspection.status === 'admitted' && launchPlan.status === 'admitted' ? 'admitted' : 'blocked',
    mode: launchPlan.mode,
    installation: {
      ...(inspection.installation ?? {}),
      modsDir: options.profileModsDir
        ? path.resolve(options.profileModsDir)
        : inspection.installation?.modsDir ?? null,
    },
    graph: {
      digest: inspection.graph?.digest ?? null,
      loadOrder: inspection.graph?.loadOrder ?? [],
      nodes: inspection.graph?.nodes ?? [],
    },
    launch: {
      executable: launchPlan.executable,
      args: launchPlan.args,
      workingDirectory: launchPlan.workingDirectory,
      environment: launchPlan.environment,
      requirements: launchPlan.requirements,
    },
    custody: {
      upstreamBinariesVendored: false,
      sourceModsMutated: false,
      profileMaterialization: options.materialization ?? 'external-or-verified-copy',
      saveSnapshotRequiredBeforeFirstLaunch: true,
      rollbackAuthority: 'original-save-plus-content-addressed-snapshot',
    },
    issues: sortIssues([...(inspection.issues ?? []), ...(launchPlan.issues ?? [])]),
  };
  const digest = digestObject(content);
  return { ...content, profileId: `stardewprofile1_${digest}` };
}

export function makeReceipt(kind, payload, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const authority = { kind, payload };
  const digest = digestObject(authority);
  return {
    format: RECEIPT_FORMAT,
    kind,
    receiptId: `stardewreceipt1_${digest}`,
    contentSha256: digest,
    generatedAt,
    payload,
  };
}

async function writeJsonAtomic(filePath, value) {
  const absolute = path.resolve(filePath);
  await fsp.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp-${process.pid}-${crypto.randomUUID()}`;
  await fsp.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  await fsp.rm(absolute, { force: true });
  await fsp.rename(temporary, absolute);
  return absolute;
}

export async function stageProfile(options) {
  const sourceModsDir = path.resolve(options.sourceModsDir);
  const profileDir = path.resolve(options.profileDir);
  const targetModsDir = path.join(profileDir, 'Mods');
  const temporaryProfile = `${profileDir}.staging-${process.pid}-${crypto.randomUUID()}`;

  if (!(await isDirectory(sourceModsDir))) {
    throw new Error(`Source Mods directory does not exist: ${sourceModsDir}`);
  }
  if (await pathExists(profileDir)) {
    throw new Error(`Profile already exists and was not modified: ${profileDir}`);
  }

  const sourceScan = await scanMods(sourceModsDir, { deepHash: options.deepHash === true });
  const sourceGraph = buildModGraph(sourceScan.mods, options.policy ?? DEFAULT_POLICY);
  const sourceBlockers = [...sourceScan.issues, ...sourceGraph.issues].filter(
    (item) => item.severity === 'blocker',
  );
  if (sourceGraph.status !== 'admitted' || sourceBlockers.length > 0) {
    const blockers = sourceBlockers;
    throw new Error(`Source mod graph is blocked: ${blockers.map((item) => item.code).join(', ')}`);
  }

  await fsp.mkdir(path.join(temporaryProfile, 'Mods'), { recursive: true });
  try {
    const copiedRoots = new Set();
    for (const mod of sourceScan.mods) {
      const topLevelRoot = mod.relativeManifestPath?.split('/')[0] ?? null;
      if (!topLevelRoot || copiedRoots.has(topLevelRoot)) continue;
      copiedRoots.add(topLevelRoot);
      const sourceDirectory = path.join(sourceModsDir, topLevelRoot);
      const targetDirectory = path.join(temporaryProfile, 'Mods', topLevelRoot);
      await fsp.cp(sourceDirectory, targetDirectory, {
        recursive: true,
        errorOnExist: true,
        force: false,
        verbatimSymlinks: true,
      });
    }

    const stagedScan = await scanMods(path.join(temporaryProfile, 'Mods'), {
      deepHash: options.deepHash === true,
    });
    const stagedGraph = buildModGraph(stagedScan.mods, options.policy ?? DEFAULT_POLICY);
    const stagedBlocked = [...stagedScan.issues, ...stagedGraph.issues].some(
      (item) => item.severity === 'blocker',
    );
    if (stagedGraph.digest !== sourceGraph.digest || stagedGraph.status !== 'admitted' || stagedBlocked) {
      throw new Error(
        `Staged graph does not match source graph (${sourceGraph.digest} != ${stagedGraph.digest}).`,
      );
    }

    const profileLock = options.profileLock ?? {
      format: PROFILE_FORMAT,
      seamVersion: '0.1.0',
      profileName: options.profileName ?? path.basename(profileDir),
      status: 'admitted',
      mode: options.mode ?? 'desktop-3d',
      graph: {
        digest: stagedGraph.digest,
        loadOrder: stagedGraph.loadOrder,
        nodes: stagedGraph.nodes,
      },
      custody: {
        sourceModsDir,
        sourceModsMutated: false,
        materialization: 'verified-copy',
      },
    };
    const finalizedLock = profileLock.profileId
      ? profileLock
      : { ...profileLock, profileId: `stardewprofile1_${digestObject(profileLock)}` };
    await writeJsonAtomic(path.join(temporaryProfile, 'profile.lock.json'), finalizedLock);
    await fsp.rename(temporaryProfile, profileDir);

    return makeReceipt('profile-staged', {
      profileDir,
      targetModsDir,
      graphDigest: stagedGraph.digest,
      manifestCount: stagedScan.manifestCount,
      sourceModsMutated: false,
    });
  } catch (error) {
    await fsp.rm(temporaryProfile, { recursive: true, force: true });
    throw error;
  }
}

async function copyDirectoryWithLedger(sourceDir, targetDir) {
  const files = await walk(sourceDir, { include: () => true });
  const ledger = [];
  for (const sourcePath of files) {
    const relative = cleanRelativePath(path.relative(sourceDir, sourcePath));
    if (!relative) throw new Error(`Unsafe save path: ${sourcePath}`);
    const targetPath = path.join(targetDir, relative);
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await fsp.copyFile(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
    const stat = await fsp.stat(targetPath);
    ledger.push({ path: relative, bytes: stat.size, sha256: await hashFile(targetPath) });
  }
  ledger.sort((a, b) => a.path.localeCompare(b.path, 'en-US'));
  return ledger;
}

export async function snapshotSaves(options) {
  const savesDir = path.resolve(options.savesDir);
  const backupRoot = path.resolve(options.backupRoot);
  if (!(await isDirectory(savesDir))) throw new Error(`Save directory does not exist: ${savesDir}`);
  await fsp.mkdir(backupRoot, { recursive: true });

  const timestamp = (options.generatedAt ?? new Date().toISOString()).replace(/[:.]/g, '-');
  const temporary = path.join(backupRoot, `.staging-${timestamp}-${crypto.randomUUID()}`);
  await fsp.mkdir(temporary, { recursive: false });

  try {
    const ledger = await copyDirectoryWithLedger(savesDir, path.join(temporary, 'Saves'));
    const authority = {
      format: SNAPSHOT_FORMAT,
      source: savesDir,
      fileCount: ledger.length,
      byteCount: ledger.reduce((sum, entry) => sum + entry.bytes, 0),
      ledgerSha256: digestObject(ledger),
      files: ledger,
    };
    const snapshotId = `stardewsave1_${digestObject(authority)}`;
    const receipt = {
      ...authority,
      snapshotId,
      generatedAt: options.generatedAt ?? new Date().toISOString(),
    };
    await writeJsonAtomic(path.join(temporary, 'snapshot.receipt.json'), receipt);
    const finalDir = path.join(backupRoot, `${timestamp}-${snapshotId.slice(0, 28)}`);
    await fsp.rename(temporary, finalDir);
    return { ...receipt, snapshotDir: finalDir };
  } catch (error) {
    await fsp.rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function writeResult(filePath, value) {
  return writeJsonAtomic(filePath, value);
}

export async function selftestFixture(root) {
  const gameDir = path.join(root, 'Stardew Valley');
  const modsDir = path.join(gameDir, 'Mods');
  await fsp.mkdir(modsDir, { recursive: true });
  await fsp.writeFile(path.join(gameDir, 'Stardew Valley.exe'), 'fixture-game');
  await fsp.writeFile(path.join(gameDir, 'StardewModdingAPI.exe'), 'fixture-smapi');

  async function mod(folder, manifest, files = {}) {
    const modDir = path.join(modsDir, folder);
    await fsp.mkdir(modDir, { recursive: true });
    await fsp.writeFile(path.join(modDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    for (const [name, value] of Object.entries(files)) {
      const target = path.join(modDir, name);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, value);
    }
  }

  await mod(
    'ContentPatcher',
    {
      Name: 'Content Patcher',
      Author: 'Pathoschild',
      Version: '2.0.0-fixture',
      UniqueID: 'Pathoschild.ContentPatcher',
      EntryDll: 'ContentPatcher.dll',
      MinimumApiVersion: '4.0.0',
    },
    { 'ContentPatcher.dll': 'fixture' },
  );
  await mod(
    'GMCM',
    {
      Name: 'Generic Mod Config Menu',
      Author: 'spacechase0',
      Version: '1.0.0-fixture',
      UniqueID: 'spacechase0.GenericModConfigMenu',
      EntryDll: 'GMCM.dll',
      MinimumApiVersion: '4.0.0',
    },
    { 'GMCM.dll': 'fixture' },
  );
  await mod(
    'Stardew3D',
    {
      Name: 'Stardew3D fixture',
      Author: 'fixture',
      Version: '0.0.0-fixture',
      UniqueID: 'GingasVR.Stardew3D',
      EntryDll: 'Stardew3D.dll',
      MinimumApiVersion: '4.0.0',
      Dependencies: [
        { UniqueID: 'spacechase0.GenericModConfigMenu', IsRequired: false },
      ],
    },
    { 'Stardew3D.dll': 'fixture' },
  );
  await mod(
    'RodohBridge',
    {
      Name: 'RODOH bridge fixture',
      Author: 'fixture',
      Version: '0.0.0-fixture',
      UniqueID: 'BigBirdReturns.RodohStardewBridge',
      EntryDll: 'Rodoh.StardewBridge.dll',
      MinimumApiVersion: '4.0.0',
      Dependencies: [{ UniqueID: 'GingasVR.Stardew3D', IsRequired: false }],
    },
    { 'Rodoh.StardewBridge.dll': 'fixture' },
  );
  await mod(
    'RodohCabinetAdapterFixture',
    {
      Name: 'RODOH Stardew Cabinet Adapter (qualification fixture)',
      Author: 'fixture',
      Version: '0.0.0-fixture',
      UniqueID: 'BigBirdReturns.RodohStardewCabinetAdapter',
      EntryDll: 'Rodoh.StardewCabinetAdapter.dll',
      MinimumApiVersion: '4.0.0',
      Dependencies: [
        { UniqueID: 'GingasVR.Stardew3D', IsRequired: true },
        { UniqueID: 'BigBirdReturns.RodohStardewBridge', IsRequired: true },
      ],
    },
    { 'Rodoh.StardewCabinetAdapter.dll': 'fixture' },
  );
  await mod('ExamplePack', {
    Name: 'Example content pack',
    Author: 'fixture',
    Version: '0.0.0-fixture',
    UniqueID: 'Fixture.ExamplePack',
    ContentPackFor: { UniqueID: 'Pathoschild.ContentPatcher' },
  });

  const inspection = await inspectInstallation({ gameDir });
  const launch = buildLaunchPlan(inspection, { mode: 'cabinet-tv' });
  const profile = buildProfileLock(inspection, launch, { profileName: 'selftest' });
  return { inspection, launch, profile };
}
