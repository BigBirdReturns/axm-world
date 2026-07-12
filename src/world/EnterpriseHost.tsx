import { useMemo, useState } from "react";
import type { EnterpriseCartridge } from "./enterprise-cartridge.js";
import { enterpriseOptions, loadEnterpriseReceipt, recordObservedDecision, saveEnterpriseReceipt } from "./enterprise-runtime.js";

export function EnterpriseHost({ cartridge, onExit }: { cartridge: EnterpriseCartridge; onExit: () => void }): JSX.Element {
  const options = useMemo(() => enterpriseOptions(cartridge), [cartridge]);
  const [selectedId, setSelectedId] = useState(options.find((option) => option.feasible)?.id ?? "");
  const [receipt, setReceipt] = useState(() => loadEnterpriseReceipt(localStorage, cartridge));
  const selected = options.find((option) => option.id === selectedId);
  const record = () => {
    if (!selected) return;
    const next = recordObservedDecision({ cartridge, option: selected, actor: { id: "director-lee", role: cartridge.contract.authorizedRoles[0]! }, assumptions: ["Control owner available"], evidenceRef: "genesis://observed/world-reference", measures: { cost: selected.expected.cost, deliveryHours: selected.expected.deliveryHours, risk: selected.expected.risk }, recordedAt: new Date().toISOString() });
    if (saveEnterpriseReceipt(localStorage, cartridge, next).ok) setReceipt(next);
  };
  return <main data-testid="enterprise-client" style={{ minHeight: "100vh", background: "#f4f5f7", color: "#17202a", padding: 32, fontFamily: "system-ui, sans-serif" }}>
    <button onClick={onExit}>Back</button>
    <p>Neutral decision client</p>
    <h1>{cartridge.name}</h1>
    <h2>{cartridge.contract.title}</h2>
    <section aria-label={cartridge.vocabulary.option}>
      {options.map((option) => <button key={option.id} disabled={!option.feasible} onClick={() => setSelectedId(option.id)} data-testid={`enterprise-option-${option.id}`}>{option.id} · {option.expected.cost} · risk {option.expected.risk}</button>)}
    </section>
    <button disabled={!selected?.feasible} onClick={record}>{cartridge.vocabulary.authorization}</button>
    {receipt && <section data-testid="enterprise-receipt"><h3>{cartridge.vocabulary.receipt}</h3><div>{receipt.observed.evidenceRef}</div><div>{receipt.optionId}</div></section>}
  </main>;
}
