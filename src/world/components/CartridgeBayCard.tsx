// One cartridge bay entry — the boot-surface "plaque" the player reads before
// entering. For a cartridge RODOH treats as a program of record (matched by its
// COMPUTED authored identity, never a manifest claim), this binds the whole
// entry into one object: the RODOH runtime mark, the program-of-record framing,
// the cartridge name, its computed authored digest (shown as identity, not a
// debug line), whether the program is fresh or resumable, what its ledger
// remembers, and a single primary action — Enter for a fresh program, Resume
// for one with a saved run. Any other cartridge falls back to the plain bay row
// it always had; being a program of record is what earns the plaque.

import { type CSSProperties } from "react";
import type { Cartridge } from "../cartridge.js";
import type { CartridgeBayEntry } from "../cartridge-bay.js";
import type { ProgramOfRecord } from "../program-of-record.js";
import type { ProgramSaveSummary } from "../save.js";
import type { ContractOutcome } from "../ledger.js";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";
import { CartridgeEmblem } from "../themes/CartridgeMotif.js";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";
import { t } from "../i18n/index.js";
import type { MessageId } from "../i18n/messages.js";

interface Props {
  entry: CartridgeBayEntry;
  /** The cartridge resolved from this bay entry (`cartridgeForEntry`). */
  cartridge: Cartridge;
  /** The program of record this cartridge IS (matched by computed digest), or
   *  null for an ordinary cartridge. Non-null switches on the plaque. */
  program: ProgramOfRecord | null;
  /** A summary of this program's save slot, or null when fresh / not a program
   *  of record. Present ⇒ the run is genuinely resumable. */
  save: ProgramSaveSummary | null;
  /** This entry's computed content-identity digest (`cartridgeIdentity` of the
   *  resolved cartridge) — shown verbatim, never a claimed manifest value. */
  digest: string;
  onEnter: () => void;
  onRemove: () => void;
}

const TRUST_COLOR: Record<string, string> = {
  bundled: "#c9a14a",
  verified: "#74ad77",
  "imported-unsigned": "#a59c8b",
  quarantined: "#b01c18",
};

const TRUST_LABEL_ID: Record<string, MessageId> = {
  bundled: "boot.trustBundled",
  "imported-unsigned": "boot.trustImportedUnsigned",
  verified: "boot.trustVerified",
  quarantined: "boot.trustQuarantined",
};

const OUTCOME_COLOR: Record<ContractOutcome, string> = {
  success: "#74ad77",
  partial: "#c9a14a",
  failure: "#b01c18",
};

const mono = "'IBM Plex Mono', monospace";
const condensed = "'Barlow Condensed', sans-serif";

/** "program-001" → "PROGRAM 001". Presentation only — the id is the source. */
function programLabel(programId: string): string {
  return programId.replace(/-/g, " ").toUpperCase();
}

function TrustChip({ entry }: { entry: CartridgeBayEntry }): JSX.Element {
  return (
    <span
      data-testid={`trust-chip-${entry.trust}`}
      data-trust={entry.trust}
      style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TRUST_COLOR[entry.trust] ?? "#a59c8b" }}
    >
      {t(TRUST_LABEL_ID[entry.trust] ?? "boot.trustImportedUnsigned")}
    </span>
  );
}

function RemoveButton({ entry, onRemove }: { entry: CartridgeBayEntry; onRemove: () => void }): JSX.Element {
  return (
    <PixelButton
      type="button"
      variant="secondary"
      data-testid={`remove-cartridge-${entry.arc.meta.id}`}
      onClick={onRemove}
      style={{ minHeight: 32, fontSize: 10, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
      aria-label={t("boot.remove")}
    >
      <PixelIcon name="failing" /> <span>{t("boot.remove")}</span>
    </PixelButton>
  );
}

/** Content-identity digest line (arc-072 parity): short form visible, full
 *  digest carried verbatim in `title` and `aria-label` — the one honest
 *  identity fact every bay entry names, computed on read, never invented. */
function DigestLine({ digest }: { digest: string }): JSX.Element {
  const short = `${digest.slice(0, 12)}…`;
  return (
    <div style={{ fontFamily: mono, fontSize: 10, color: "#8b8172", marginTop: 2, display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ color: "#6b6050" }}>{t("boot.identity")}</span>
      <span
        data-testid="bay-digest"
        className="bay-digest"
        title={digest}
        aria-label={`${t("boot.identity")}: ${digest}`}
        style={{ color: "#8b8172", wordBreak: "break-all" }}
      >
        {short}
      </span>
    </div>
  );
}

/** The program-of-record plaque: an elevated, single-object bay entry. */
function ProgramPlaque({ entry, cartridge, program, save, digest, onEnter }: Omit<Props, "onRemove">): JSX.Element {
  const c = cartridge;
  const resumable = save !== null;
  const last = save?.lastResult ?? null;
  return (
    <div
      data-testid={`cartridge-entry-${entry.arc.meta.id}`}
      data-program-id={program!.programId}
      style={{
        display: "grid",
        gap: 12,
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 8,
        border: "1px solid #4a4238",
        borderLeft: "3px solid #c9a14a",
        background: "rgba(42,38,32,0.5)",
        color: "#ece4d4",
      }}
    >
      {/* Header: emblem + program-of-record eyebrow + name + meta, with the
          RODOH runtime mark binding it to the runtime. */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <CartridgeEmblem arcId={entry.arc.meta.id} size={34} />
          <div style={{ minWidth: 0 }}>
            <div data-testid={`bay-program-eyebrow-${entry.arc.meta.id}`} style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a14a" }}>
              {programLabel(program!.programId)} · {t("boot.programOfRecord")}
            </div>
            <div style={{ fontFamily: condensed, fontWeight: 700, fontSize: 24, lineHeight: 1.05 }}>{c.manifest.name}</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: "#a59c8b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t("boot.cartridgeMeta", { domain: c.manifest.domain, engine: c.manifest.engineVersion, count: c.arc.challenges.length })}
            </div>
          </div>
        </div>
        <RodohRuntimeMark variant="micro" showText={false} />
      </div>

      {/* Computed authored identity — presented as identity, not a debug line. */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, borderTop: "1px solid #2a2620", paddingTop: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a59c8b", flex: "none" }}>{t("boot.identity")}</span>
        <span
          data-testid={`bay-cartridge-digest-${entry.arc.meta.id}`}
          className="bay-digest"
          title={digest}
          aria-label={`${t("boot.identity")}: ${digest}`}
          style={{ fontFamily: mono, fontSize: 10, lineHeight: 1.4, color: "#d8cfbd", textAlign: "right", wordBreak: "break-all" }}
        >
          {digest}
        </span>
      </div>

      {/* Memory: fresh vs resumable, ledger count, and the last recorded result. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 20 }}>
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: 999, flex: "none", background: resumable ? (last ? OUTCOME_COLOR[last.outcome] : "#74ad77") : "#4a4238" }}
        />
        {resumable ? (
          <span data-testid={`bay-ledger-summary-${entry.arc.meta.id}`} style={{ fontFamily: mono, fontSize: 11, color: "#d8cfbd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <strong style={{ color: "#74ad77" }}>{t("boot.resumable")}</strong>
            {" · "}{t("boot.contractsRecorded", { count: save!.ledgerEntryCount })}
            {last ? ` · ${last.challengeName}` : ""}
          </span>
        ) : (
          <span data-testid={`bay-ledger-summary-${entry.arc.meta.id}`} style={{ fontFamily: mono, fontSize: 11, color: "#a59c8b" }}>
            {t("boot.freshProgram")}
          </span>
        )}
      </div>

      {/* Footer: trust provenance + the single primary action. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <TrustChip entry={entry} />
        <PixelButton
          type="button"
          variant="primary"
          data-testid={`play-cartridge-${entry.arc.meta.id}`}
          onClick={onEnter}
          style={{ minHeight: 40, padding: "6px 16px", display: "flex", alignItems: "center", gap: 7, fontFamily: condensed, fontWeight: 700, fontSize: 15 }}
        >
          <PixelIcon name={resumable ? "recorded" : "available"} />
          <span>{resumable ? t("boot.resume") : t("boot.enter")} →</span>
        </PixelButton>
      </div>
    </div>
  );
}

/** RFC PR 056 — per-cartridge memory, listed. The compact "what the ledger
 *  remembers" line: entryCount + the last recorded result, read verbatim from
 *  `save` (`readProgramSaveSummary`, which is itself built from the ONE
 *  `summarizeLedger` helper — see save.ts). Rendered only when there is a
 *  genuinely recorded run: entryCount 0 means nothing has been resolved yet,
 *  so nothing is claimed here (honest omission, not a fabricated "fresh"
 *  line — that framing belongs to the program plaque's own resumable state). */
function MemoryLine({ save }: { save: ProgramSaveSummary | null }): JSX.Element | null {
  if (!save || save.ledgerEntryCount === 0) return null;
  const last = save.lastResult;
  return (
    <div data-testid="bay-memory" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: 999, flex: "none", background: last ? OUTCOME_COLOR[last.outcome] : "#4a4238" }}
      />
      <span style={{ fontFamily: mono, fontSize: 10, color: "#a59c8b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {t("shell.identityRecorded", { count: save.ledgerEntryCount })}
        {last ? ` · ${last.challengeName}` : ""}
      </span>
    </div>
  );
}

/** RFC PR 057 — save summaries in the bay. The classic row's missing piece
 *  vs. the ProgramPlaque: resumable/fresh, read the same way the plaque reads
 *  it — `save !== null` (see save.ts's `ProgramSaveSummary` doc: "Present ⇒
 *  the run is genuinely resumable"). No new derivation, no wall-clock: this is
 *  the exact same `save` prop `MemoryLine` already renders, just naming the
 *  other honest fact it carries. "boot.freshProgram" says "program", which
 *  would lie on a classic row (an imported cartridge, or Karazhan, are never
 *  "a program") — so fresh uses the neutral "boot.freshEntry" pair added for
 *  this PR, while "boot.resumable" carries no such claim and is reused as-is. */
function SaveStateLine({ save }: { save: ProgramSaveSummary | null }): JSX.Element {
  const resumable = save !== null;
  return (
    <div
      data-testid="bay-save-state"
      style={{ fontFamily: mono, fontSize: 10, color: resumable ? "#74ad77" : "#8b8172", marginTop: 2 }}
    >
      {resumable ? t("boot.resumable") : t("boot.freshEntry")}
    </div>
  );
}

/** A cartridge that is NOT the program of record — Karazhan, or any imported
 *  cartridge — as a first-class durable object in the Library: the same card
 *  weight and the same four facts the plaque carries (identity, provenance,
 *  memory, resume state), minus only the honest program-of-record badge, which
 *  belongs to the one program that actually is one. The play action tells the
 *  truth for these too: a cartridge with a resumable save says Resume, never
 *  the old always-"Enter" row that lied about what the button would do. */
function ClassicRow({ entry, cartridge, digest, save, onEnter, onRemove }: Omit<Props, "program">): JSX.Element {
  const c = cartridge;
  const isKarazhan = entry.arc.meta.id === "karazhan";
  const resumable = save !== null;
  return (
    <div
      data-testid={`cartridge-entry-${entry.arc.meta.id}`}
      style={{
        display: "grid",
        gap: 12,
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 8,
        border: isKarazhan ? "1px solid #574a7a" : "1px solid #4a4238",
        borderLeft: isKarazhan ? "3px solid #8a79b8" : "3px solid #6b6050",
        background: isKarazhan ? "rgba(48,36,64,0.5)" : "rgba(42,38,32,0.5)",
        color: "#ece4d4",
      }}
    >
      {/* Header: emblem + name + meta, with the RODOH mark binding it to the runtime. */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <CartridgeEmblem arcId={entry.arc.meta.id} size={30} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: condensed, fontWeight: 700, fontSize: 22, lineHeight: 1.05 }}>{c.manifest.name}</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: "#a59c8b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t("boot.cartridgeMeta", { domain: c.manifest.domain, engine: c.manifest.engineVersion, count: c.arc.challenges.length })}
            </div>
            <DigestLine digest={digest} />
          </div>
        </div>
        <RodohRuntimeMark variant="micro" showText={false} />
      </div>

      {/* Memory: the same fresh/resumable + last-recorded facts the plaque names. */}
      <div style={{ display: "grid", gap: 2 }}>
        <SaveStateLine save={save} />
        <MemoryLine save={save} />
      </div>

      {/* Footer: trust provenance, optional remove, and one honest primary action. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <TrustChip entry={entry} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {entry.source === "file" && <RemoveButton entry={entry} onRemove={onRemove} />}
          <PixelButton
            type="button"
            variant="primary"
            data-testid={`play-cartridge-${entry.arc.meta.id}`}
            onClick={onEnter}
            style={{ minHeight: 40, padding: "6px 16px", display: "flex", alignItems: "center", gap: 7, fontFamily: condensed, fontWeight: 700, fontSize: 15 }}
          >
            <PixelIcon name={resumable ? "recorded" : "available"} />
            <span>{resumable ? t("boot.resume") : t("boot.enter")} →</span>
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

export function CartridgeBayCard(props: Props): JSX.Element {
  if (props.program) {
    return (
      <div style={{ display: "grid", gap: props.entry.source === "file" ? 6 : 0 }}>
        <ProgramPlaque entry={props.entry} cartridge={props.cartridge} program={props.program} save={props.save} digest={props.digest} onEnter={props.onEnter} />
        {props.entry.source === "file" && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <RemoveButton entry={props.entry} onRemove={props.onRemove} />
          </div>
        )}
      </div>
    );
  }
  return <ClassicRow entry={props.entry} cartridge={props.cartridge} digest={props.digest} save={props.save} onEnter={props.onEnter} onRemove={props.onRemove} />;
}
