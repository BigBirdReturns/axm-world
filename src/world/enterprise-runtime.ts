import { enterpriseIdentity, type EnterpriseCartridge, type EnterpriseResource, type StoragePort } from "./enterprise-cartridge.js";

export interface EnterpriseOption {
  id: string;
  resourceIds: string[];
  feasible: boolean;
  blockers: string[];
  expected: { cost: number; deliveryHours: number; risk: number };
}

export interface EnterpriseReceipt {
  cartridgeIdentity: string;
  contractId: string;
  optionId: string;
  authorizingActor: { id: string; role: string };
  assumptions: string[];
  expected: EnterpriseOption["expected"];
  observed: { evidenceRef: string; measures: Record<string, number> };
  variance: Record<string, number | null>;
  recordedAt: string;
}

const combinations = <T,>(items: T[]): T[][] => items.flatMap((a, i) => items.slice(i + 1).flatMap((b, j) => [[a, b], ...items.slice(i + j + 2).map((c) => [a, b, c])]));

export function enterpriseOptions(cartridge: EnterpriseCartridge): EnterpriseOption[] {
  const contract = cartridge.contract;
  return combinations(cartridge.organization.resources).map((team: EnterpriseResource[]) => {
    const hours = Math.ceil(contract.requiredHours / team.length);
    const capacity = team.reduce((sum, resource) => sum + resource.availableHours, 0);
    const cost = team.reduce((sum, resource) => sum + Math.min(hours, resource.availableHours) * resource.hourlyCost, 0);
    const blockers: string[] = [];
    if (capacity < contract.requiredHours) blockers.push("capacity");
    let minimumCoverage = Infinity;
    for (const requirement of contract.requiredCapabilities) {
      const coverage = team.reduce((sum, resource) => sum + (resource.capabilities[requirement.capabilityId] ?? 0), 0);
      minimumCoverage = Math.min(minimumCoverage, coverage / requirement.minimum);
      if (coverage < requirement.minimum) blockers.push(requirement.capabilityId);
    }
    const risk = Number(Math.min(1, 0.65 / (1 + minimumCoverage) + 0.35 * contract.requiredHours / Math.max(capacity, 1)).toFixed(4));
    if (cost > contract.budgetLimit) blockers.push("budget");
    if (risk > contract.maximumRisk) blockers.push("risk");
    return { id: team.map((resource) => resource.id).sort().join("+"), resourceIds: team.map((resource) => resource.id).sort(), feasible: blockers.length === 0, blockers, expected: { cost, deliveryHours: hours, risk } };
  }).sort((a, b) => Number(b.feasible) - Number(a.feasible) || a.expected.risk - b.expected.risk || a.expected.cost - b.expected.cost);
}

function saveKey(cartridge: EnterpriseCartridge): string {
  return `axm-world:enterprise-receipt:v1:${enterpriseIdentity(cartridge)}`;
}

export function recordObservedDecision(params: {
  cartridge: EnterpriseCartridge;
  option: EnterpriseOption;
  actor: { id: string; role: string };
  assumptions: string[];
  evidenceRef: string;
  measures: Record<string, number>;
  recordedAt: string;
}): EnterpriseReceipt {
  if (!params.option.feasible) throw new Error("Cannot authorize an infeasible option");
  if (!params.cartridge.contract.authorizedRoles.includes(params.actor.role)) throw new Error("Authorizing actor lacks authority");
  if (!params.evidenceRef.trim()) throw new Error("Observed outcome requires evidence");
  const expected = params.option.expected;
  const variance = Object.fromEntries(Object.entries(params.measures).map(([key, value]) => [key, key in expected ? value - expected[key as keyof typeof expected] : null]));
  return Object.freeze({ cartridgeIdentity: enterpriseIdentity(params.cartridge), contractId: params.cartridge.contract.id, optionId: params.option.id, authorizingActor: params.actor, assumptions: [...params.assumptions], expected, observed: { evidenceRef: params.evidenceRef, measures: params.measures }, variance, recordedAt: params.recordedAt });
}

export function saveEnterpriseReceipt(storage: StoragePort, cartridge: EnterpriseCartridge, receipt: EnterpriseReceipt): { ok: true } | { ok: false; error: string } {
  try {
    const key = saveKey(cartridge);
    const payload = JSON.stringify(receipt);
    storage.setItem(key, payload);
    if (storage.getItem(key) !== payload) throw new Error("Receipt persistence verification failed");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export function loadEnterpriseReceipt(storage: StoragePort, cartridge: EnterpriseCartridge): EnterpriseReceipt | null {
  try {
    const raw = storage.getItem(saveKey(cartridge));
    if (!raw) return null;
    const receipt = JSON.parse(raw) as EnterpriseReceipt;
    return receipt.cartridgeIdentity === enterpriseIdentity(cartridge) ? receipt : null;
  } catch {
    return null;
  }
}
