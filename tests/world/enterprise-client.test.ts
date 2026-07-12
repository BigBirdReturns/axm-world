import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { enterpriseIdentity, importEnterpriseCartridgeFromJson, loadEnterpriseBay, type EnterpriseCartridge, type StoragePort } from "../../src/world/enterprise-cartridge.js";
import { enterpriseOptions, loadEnterpriseReceipt, recordObservedDecision, saveEnterpriseReceipt } from "../../src/world/enterprise-runtime.js";

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const cartridge: EnterpriseCartridge = {
  kind: "enterprise-decision", cartridgeVersion: 1, id: "payments-release", name: "Payments Release Decision",
  vocabulary: { contract: "Work contract", option: "Staffing option", authorization: "Authorize selection", outcome: "Observed result", receipt: "Decision receipt" },
  contract: { id: "release", title: "Staff the reconciliation release", requiredCapabilities: [{ capabilityId: "data", minimum: 5 }, { capabilityId: "reliability", minimum: 5 }], requiredHours: 40, budgetLimit: 9000, maximumRisk: 0.7, authorizedRoles: ["delivery-director"], outcomeMeasures: ["cost", "deliveryHours", "risk"] },
  organization: { id: "delivery", resources: [
    { id: "maya", name: "Maya", capabilities: { data: 6 }, availableHours: 24, hourlyCost: 160 },
    { id: "theo", name: "Theo", capabilities: { reliability: 6 }, availableHours: 24, hourlyCost: 170 },
    { id: "imani", name: "Imani", capabilities: { data: 2, reliability: 2 }, availableHours: 16, hourlyCost: 150 },
  ] },
};

describe("neutral enterprise cartridge client", () => {
  let storage: MemoryStorage;
  beforeEach(() => { storage = new MemoryStorage(); });

  it("ingests through the file cartridge boundary and preserves authored vocabulary", () => {
    const result = importEnterpriseCartridgeFromJson(JSON.stringify(cartridge), storage);
    expect(result.ok).toBe(true);
    expect(loadEnterpriseBay(storage)[0]!.cartridge.vocabulary).toEqual(cartridge.vocabulary);
  });

  it("compares feasible compositions, records an observed result, persists, and reloads", () => {
    const option = enterpriseOptions(cartridge).find((candidate) => candidate.feasible)!;
    expect(option).toBeDefined();
    const receipt = recordObservedDecision({ cartridge, option, actor: { id: "director", role: "delivery-director" }, assumptions: ["freeze approved"], evidenceRef: "genesis://observed/release", measures: { cost: option.expected.cost + 100, deliveryHours: option.expected.deliveryHours, risk: option.expected.risk }, recordedAt: "2026-07-12T00:00:00Z" });
    expect(saveEnterpriseReceipt(storage, cartridge, receipt)).toEqual({ ok: true });
    expect(loadEnterpriseReceipt(storage, cartridge)).toEqual(receipt);
    expect(receipt.variance.cost).toBe(100);
  });

  it("contains no game-shaped placeholder state", () => {
    expect(JSON.stringify(cartridge)).not.toMatch(/loot|raid|affliction|attunement|morale|drama/i);
    const host = fs.readFileSync(new URL("../../src/world/EnterpriseHost.tsx", import.meta.url), "utf8");
    expect(host).not.toMatch(/loot|raid|affliction|attunement|morale|drama/i);
  });

  it("identity covers nested contract content", () => {
    const changed = structuredClone(cartridge);
    changed.contract.budgetLimit += 1;
    expect(enterpriseIdentity(changed)).not.toBe(enterpriseIdentity(cartridge));
  });

  it("has no remote font dependency and installs the offline runtime", () => {
    const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const main = fs.readFileSync(new URL("../../src/game/main.tsx", import.meta.url), "utf8");
    expect(html).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
    expect(html).toContain("manifest.webmanifest");
    expect(main).toContain("serviceWorker.register");
  });
});
