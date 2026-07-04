// The cartridge as an object. Returning here at the end of the loop shows that the
// world did not swallow the cartridge: it is still a named, owned, portable artifact
// — now carrying the run state and the choice you made — with an Export affordance
// that produces the custody object (manifest + arc + run state) as a file. Custody as
// an object action.

import { type CSSProperties } from "react";
import type { CartridgeManifest } from "../cartridge.js";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";
import { t } from "../i18n/index.js";
import type { MessageId } from "../i18n/messages.js";
import type { CustodyObject } from "../useArcWorld.js";
import type { Ledger } from "../ledger.js";

interface Props {
  manifest: CartridgeManifest;
  /** The cartridge's authored content identity (cartridgeIdentity of its arc),
   *  shown verbatim — never a claimed manifest value. */
  digest: string;
  /** The run ledger: every resolved contract, stamped with this digest. */
  ledger: Ledger;
  openingChoice: string | null;
  cycle: number;
  clearedCount: number;
  totalNodes: number;
  onExport: () => CustodyObject;
  onClose: () => void;
  onLeave: () => void;
}

const wrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background: "rgba(11,10,8,0.7)",
  pointerEvents: "auto",
  zIndex: 30,
  padding: 20,
};

const TRUST_COLOR: Record<string, string> = {
  bundled: "#c9a14a",
  verified: "#74ad77",
  "imported-unsigned": "#a59c8b",
  quarantined: "#b01c18",
};

const TRUST_LABEL_ID: Record<CartridgeManifest["trust"], MessageId> = {
  bundled: "boot.trustBundled",
  "imported-unsigned": "boot.trustImportedUnsigned",
  verified: "boot.trustVerified",
  quarantined: "boot.trustQuarantined",
};

const OUTCOME_COLOR: Record<string, string> = {
  success: "#74ad77",
  partial: "#c9a14a",
  failure: "#b01c18",
};

// The ledger speaks the one canonical grade axis (Cleared / Partial / Failed) —
// the same labels the immediate overlay, revisit modal, and encounter receipt use.
const OUTCOME_LABEL_ID: Record<"success" | "partial" | "failure", MessageId> = {
  success: "outcome.cleared",
  partial: "outcome.partial",
  failure: "outcome.failed",
};

function row(label: string, value: string): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "4px 0" }}>
      <span style={{ color: "#a59c8b" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}

export function CartridgeObjectPanel({ manifest, digest, ledger, openingChoice, cycle, clearedCount, totalNodes, onExport, onClose, onLeave }: Props): JSX.Element {
  const progressPct = totalNodes > 0 ? Math.round((clearedCount / totalNodes) * 100) : 0;
  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${manifest.id}.run.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={wrap}>
      <div
        style={{
          background: "rgba(23,21,15,0.98)",
          color: "#ece4d4",
          border: "1px solid #4a4238",
          borderRadius: 10,
          padding: "22px 24px",
          width: "min(440px, 92vw)",
          font: "13px/1.5 'IBM Plex Mono', ui-monospace, monospace",
          boxShadow: "0 24px 70px -24px rgba(0,0,0,0.85)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a14a" }}>{t("cartridgePanel.eyebrow")}</span>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, margin: "2px 0 12px" }}>{manifest.name}</div>
          </div>
          <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
            <RodohRuntimeMark variant="inline" showText={false} />
            <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TRUST_COLOR[manifest.trust] ?? "#a59c8b" }}>{manifest.trust}</span>
          </div>
        </div>

        {row(t("cartridgePanel.domain"), manifest.domain)}
        {row(t("cartridgePanel.engine"), manifest.engineVersion)}
        {row(t("cartridgePanel.trust"), t(TRUST_LABEL_ID[manifest.trust]))}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "4px 0", alignItems: "baseline" }}>
          <span style={{ color: "#a59c8b", flex: "none" }}>{t("cartridgePanel.identity")}</span>
          <strong
            data-testid="cartridge-digest"
            title={digest}
            style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 10, lineHeight: 1.4, wordBreak: "break-all" }}
          >
            {digest}
          </strong>
        </div>
        <div style={{ height: 1, background: "#2a2620", margin: "8px 0" }} />
        {row(t("cartridgePanel.cycle"), String(cycle).padStart(2, "0"))}
        {row(t("cartridgePanel.recordedNodes"), `${clearedCount} / ${totalNodes}`)}
        <div style={{ height: 6, background: "#2a2620", borderRadius: 999, overflow: "hidden", margin: "4px 0 8px" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: "#74ad77" }} />
        </div>
        {row(t("cartridgePanel.decisionMark"), openingChoice ?? "—")}

        <div style={{ height: 1, background: "#2a2620", margin: "10px 0 8px" }} />
        {/* Contract ledger — the program's memory: an ordered, append-only record.
            The heading carries the cumulative count; each row its recording order;
            and a closing line names how each entry is recorded under the authored
            identity (provenance over existing fields, not a new trust primitive). */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <span style={{ color: "#a59c8b" }}>{t("cartridgePanel.ledger")}</span>
          {ledger.entries.length > 0 && (
            <span data-testid="ledger-count" style={{ color: "#6b6050", fontSize: 11, flex: "none" }}>{t("shell.identityRecorded", { count: ledger.entries.length })}</span>
          )}
        </div>
        {ledger.entries.length === 0 ? (
          <div data-testid="ledger-empty" style={{ color: "#6b6050", fontSize: 12 }}>{t("cartridgePanel.ledgerEmpty")}</div>
        ) : (
          <>
            <div data-testid="cartridge-ledger" style={{ display: "grid", gap: 3 }}>
              {ledger.entries.map((entry) => (
                <div
                  key={entry.seq}
                  data-testid="ledger-entry"
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, alignItems: "baseline" }}
                >
                  <span style={{ display: "flex", gap: 8, minWidth: 0, alignItems: "baseline" }}>
                    {/* Recording order (seq + 1) — reads the ledger as an ordered log,
                        not an unordered set. Append index, never a wall clock. */}
                    <span data-testid="ledger-entry-seq" style={{ color: "#6b6050", fontSize: 10, fontVariantNumeric: "tabular-nums", flex: "none" }}>{String(entry.seq + 1).padStart(2, "0")}</span>
                    <span style={{ color: "#d8cfbd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.challengeName}</span>
                  </span>
                  {/* When it was recorded (the run's cycle — deterministic, not a wall clock)
                      beside the outcome grade: memory that says what happened AND when. */}
                  <span style={{ display: "flex", gap: 8, flex: "none", alignItems: "baseline" }}>
                    <span data-testid="ledger-entry-when" style={{ color: "#6b6050", fontSize: 10 }}>{t("result.ledgerRecordedAt", { cycle: entry.cycle })}</span>
                    <span style={{ color: OUTCOME_COLOR[entry.outcome] ?? "#a59c8b" }}>{t(OUTCOME_LABEL_ID[entry.outcome])}</span>
                  </span>
                </div>
              ))}
            </div>
            {/* Provenance (not a cryptographic seal): every entry above carries the same
                authored digest as the ledger (see appendResult) — recorded under the
                program identity, so this record checks against it. */}
            <div data-testid="ledger-provenance" style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 8, color: "#6b6050", fontSize: 10, lineHeight: 1.4 }}>
              <PixelIcon name="recorded" /> <span>{t("cartridgePanel.ledgerProvenance")}</span>
            </div>
          </>
        )}

        <p style={{ color: "#a59c8b", fontFamily: "'Lora', Georgia, serif", fontSize: 13, lineHeight: 1.5, margin: "14px 0 16px" }}>
          {t("cartridgePanel.body")}
        </p>

        {/* PixelButton + icon + short catalog label, replacing the raw "⤓" glyph glued
            to a long English phrase that ran wide and cramped at narrow widths. */}
        <PixelButton
          type="button"
          variant="danger"
          onClick={handleExport}
          style={{ width: "100%", minHeight: 44, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        >
          <PixelIcon name="lootAvailable" /> <span>{t("cartridgePanel.exportRun")}</span>
        </PixelButton>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <PixelButton type="button" variant="secondary" onClick={onClose} style={{ flex: 1, minHeight: 40, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <PixelIcon name="available" /> <span>{t("cartridgePanel.resume")}</span>
          </PixelButton>
          <PixelButton type="button" variant="secondary" onClick={onLeave} style={{ flex: 1, minHeight: 40, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <PixelIcon name="failing" /> <span>{t("cartridgePanel.leave")}</span>
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
