// The in-shell program identity strip — a compact, quiet band above the HUD that
// keeps the loop reading as a RODOH-loaded program of record WHILE the player is
// inside it, not just at the boot surface. It reuses the same law the entry
// plaque uses: the program is matched by the cartridge's COMPUTED identity
// (programForCartridge), the digest shown is that computed value verbatim (never
// a manifest claim), and the ledger summary is derived from the live run ledger
// with the same summarizeLedger() the boot save-summary uses.
//
// Deliberately NOT the RodohRuntimeMark emblem: regions.tsx reserves that mark
// for boot/loading/select, not the gameplay HUD. "RODOH" appears here only as a
// restrained text token. All chrome routes through t() so the localization
// coverage guard applies to this surface from birth.

import { type CSSProperties } from "react";
import type { ArcWorld } from "../useArcWorld.js";
import { programForCartridge } from "../program-of-record.js";
import { summarizeLedger, type ContractOutcome } from "../ledger.js";
import { t } from "../i18n/index.js";

const OUTCOME_COLOR: Record<ContractOutcome, string> = {
  success: "#74ad77",
  partial: "#c9a14a",
  failure: "#b01c18",
};

const mono = "'IBM Plex Mono', ui-monospace, monospace";

/** "program-001" → "PROGRAM 001". Presentation of the id, not new chrome copy. */
function programLabel(programId: string): string {
  return programId.replace(/-/g, " ").toUpperCase();
}

function Sep(): JSX.Element {
  return <span aria-hidden="true" style={{ color: "#4a4238" }}>·</span>;
}

export function ProgramIdentityStrip({ world }: { world: ArcWorld }): JSX.Element {
  const program = programForCartridge(world.cartridge);
  const summary = summarizeLedger(world.ledger);
  const shortDigest = `${world.cartridgeDigest.slice(0, 12)}…`;

  return (
    <div
      data-testid="program-identity-strip"
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 12px",
        borderBottom: "1px solid #2a2620",
        background: "rgba(11,10,8,0.96)",
        font: `10px/1.4 ${mono}`,
        color: "#8b8172",
        whiteSpace: "nowrap",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      <span style={{ color: "#a59c8b", letterSpacing: "0.14em", fontWeight: 700, flex: "none" }}>{t("shell.runtimeName")}</span>
      {program && (
        <>
          <Sep />
          <span data-testid="strip-program" style={{ color: "#c9a14a", letterSpacing: "0.08em", flex: "none" }}>
            {programLabel(program.programId)} · {t("boot.programOfRecord")}
          </span>
        </>
      )}
      <Sep />
      <span style={{ color: "#d8cfbd", flex: "none" }}>{world.cartridge.manifest.name}</span>
      <Sep />
      <span data-testid="strip-digest" title={world.cartridgeDigest} style={{ color: "#8b8172", flex: "none" }}>{shortDigest}</span>
      <Sep />
      <span data-testid="strip-ledger" style={{ display: "inline-flex", alignItems: "center", gap: 5, flex: "none" }}>
        <span
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: 999, flex: "none", background: summary.lastResult ? OUTCOME_COLOR[summary.lastResult.outcome] : "#4a4238" }}
        />
        {summary.entryCount > 0 ? (
          <>
            <span style={{ color: "#a59c8b" }}>{t("shell.identityRecorded", { count: summary.entryCount })}</span>
            {summary.lastResult && <span style={{ color: "#6b6050" }}> · {summary.lastResult.challengeName}</span>}
          </>
        ) : (
          <span style={{ color: "#6b6050" }}>{t("shell.identityFresh")}</span>
        )}
      </span>
    </div>
  );
}
