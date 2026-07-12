export interface EnterpriseWorkContract {
  id: string;
  title: string;
  requiredCapabilities: Array<{ capabilityId: string; minimum: number }>;
  requiredHours: number;
  budgetLimit: number;
  maximumRisk: number;
  authorizedRoles: string[];
  outcomeMeasures: string[];
}

export interface EnterpriseResource {
  id: string;
  name: string;
  capabilities: Record<string, number>;
  availableHours: number;
  hourlyCost: number;
}

export interface EnterpriseCartridge {
  kind: "enterprise-decision";
  cartridgeVersion: 1;
  id: string;
  name: string;
  vocabulary: {
    contract: string;
    option: string;
    authorization: string;
    outcome: string;
    receipt: string;
  };
  contract: EnterpriseWorkContract;
  organization: { id: string; resources: EnterpriseResource[] };
}

export interface EnterpriseBayEntry {
  cartridge: EnterpriseCartridge;
  importedAt: number;
  trust: "imported-unsigned";
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const BAY_KEY = "axm-world:enterprise-cartridge-bay:v1";

export function parseEnterpriseCartridge(input: unknown): EnterpriseCartridge {
  if (!input || typeof input !== "object") throw new Error("Enterprise cartridge must be an object");
  const value = input as Partial<EnterpriseCartridge>;
  if (value.kind !== "enterprise-decision" || value.cartridgeVersion !== 1) throw new Error("Unsupported enterprise cartridge");
  if (!value.id?.trim() || !value.name?.trim()) throw new Error("Enterprise cartridge identity is required");
  if (!value.contract || !value.organization || !value.vocabulary) throw new Error("Enterprise cartridge contract, organization, and vocabulary are required");
  const contract = value.contract;
  if (!contract.id?.trim() || !contract.title?.trim()) throw new Error("Work contract identity is required");
  if (!Array.isArray(contract.requiredCapabilities) || contract.requiredCapabilities.length === 0) throw new Error("Work contract requires capabilities");
  if (!(contract.requiredHours > 0) || contract.budgetLimit < 0 || contract.maximumRisk < 0 || contract.maximumRisk > 1) throw new Error("Work contract capacity, budget, or risk is invalid");
  if (!Array.isArray(contract.authorizedRoles) || contract.authorizedRoles.length === 0) throw new Error("Work contract requires authorization roles");
  if (!Array.isArray(value.organization.resources) || value.organization.resources.length === 0) throw new Error("Organization requires resources");
  return structuredClone(value as EnterpriseCartridge);
}

export function enterpriseIdentity(cartridge: EnterpriseCartridge): string {
  const canonicalize = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(",")}}`;
    }
    return JSON.stringify(value);
  };
  const canonical = canonicalize(cartridge);
  let state = 0x811c9dc5;
  for (const char of canonical) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 0x01000193);
  }
  return `decision1_${(state >>> 0).toString(16).padStart(8, "0")}`;
}

export function loadEnterpriseBay(storage: StoragePort): EnterpriseBayEntry[] {
  try {
    const raw = storage.getItem(BAY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; entries?: EnterpriseBayEntry[] };
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.map((entry) => ({ ...entry, cartridge: parseEnterpriseCartridge(entry.cartridge) }));
  } catch {
    return [];
  }
}

export function importEnterpriseCartridgeFromJson(json: string, storage: StoragePort):
  | { ok: true; entry: EnterpriseBayEntry }
  | { ok: false; errors: string[] } {
  try {
    const cartridge = parseEnterpriseCartridge(JSON.parse(json));
    const entry: EnterpriseBayEntry = { cartridge, importedAt: Date.now(), trust: "imported-unsigned" };
    const next = loadEnterpriseBay(storage).filter((held) => held.cartridge.id !== cartridge.id);
    next.push(entry);
    storage.setItem(BAY_KEY, JSON.stringify({ version: 1, entries: next }));
    return { ok: true, entry };
  } catch (error) {
    return { ok: false, errors: [(error as Error).message] };
  }
}

export function isEnterpriseCartridgeJson(json: string): boolean {
  try {
    return (JSON.parse(json) as { kind?: unknown }).kind === "enterprise-decision";
  } catch {
    return false;
  }
}
