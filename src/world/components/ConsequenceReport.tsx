// ConsequenceReport — renders a stored Consequence as structured line items:
// Objectives, Rewards, World changes. This is the SINGLE component the immediate
// result overlay and the revisit modal both use, so the two surfaces MIRROR each
// other (one structure, two surfaces) and can never drift into different
// interpretations of the same record.
//
// It renders ONLY facts present in the record — an empty section is omitted (no
// invented "Rewards" panel for a no-reward run, no "World changes" for a failure
// that changed nothing). Prose is generated from the structured facts here; the
// record itself stores none. Theme via `tone` (light panel vs dark overlay).

import { type CSSProperties } from "react";
import type { Consequence, ConsequenceGrade } from "../ledger.js";
import { t } from "../i18n/index.js";

// Theme by SURFACE brightness, not by which surface: the light revisit-modal card
// uses "light"; the dark encounter overlay and the dark cartridge/ledger panel use
// "dark". One component, three surfaces, mirrored structure.
export type ConsequenceTone = "light" | "dark";

interface Palette {
  label: string;
  ink: string;
  gain: string;
  cleared: string;
  partial: string;
  failed: string;
}

const PALETTES: Record<ConsequenceTone, Palette> = {
  light: { label: "var(--ink-muted)", ink: "var(--ink-soft)", gain: "var(--teal-dark)", cleared: "var(--teal-dark)", partial: "#b07d1a", failed: "var(--danger)" },
  dark: { label: "#8b7d6a", ink: "#d8cfbd", gain: "#74ad77", cleared: "#74ad77", partial: "#c9a14a", failed: "#b01c18" },
};

const STATUS_GLYPH: Record<ConsequenceGrade, string> = { cleared: "✓", partial: "◈", failed: "✗" };

export function ConsequenceReport({ consequence, tone }: { consequence: Consequence; tone: ConsequenceTone }): JSX.Element {
  const p = PALETTES[tone];
  const sectionLabel: CSSProperties = { fontFamily: "var(--px-font)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: p.label, marginBottom: 3 };
  const listStyle: CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 3 };
  const lineStyle: CSSProperties = { display: "flex", gap: 6, fontSize: 12, fontFamily: "var(--px-font)", color: p.ink, alignItems: "baseline" };
  const statusColor = (s: ConsequenceGrade): string => (s === "cleared" ? p.cleared : s === "partial" ? p.partial : p.failed);

  return (
    <div style={{ display: "grid", gap: 10 }} data-testid="consequence-report">
      {/* Objectives — per-objective coverage, from the engine's own counts. */}
      {consequence.objectives.length > 0 && (
        <div data-testid="consequence-objectives">
          <div style={sectionLabel}>{t("result.objectives")}</div>
          <ul style={listStyle}>
            {consequence.objectives.map((o) => (
              <li key={o.id} style={lineStyle} data-testid={`consequence-objective-${o.id}`} data-status={o.status}>
                <span aria-hidden="true" style={{ color: statusColor(o.status), flex: "none" }}>{STATUS_GLYPH[o.status]}</span>
                <span>{o.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rewards — actually granted (structured; no reward panel when empty). */}
      {consequence.rewards.length > 0 && (
        <div data-testid="consequence-rewards">
          <div style={sectionLabel}>{t("result.rewards")}</div>
          <ul style={listStyle}>
            {consequence.rewards.map((r, i) => (
              <li key={i} style={lineStyle} data-testid={`consequence-reward-${r.kind}`}>
                <span>{r.label}</span>
                {r.amount !== undefined && <strong style={{ color: p.gain }}>+{r.amount}</strong>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* World changes — recorded / unlocked, both real post-run facts. */}
      {consequence.worldChanges.length > 0 && (
        <div data-testid="consequence-world-changes">
          <div style={sectionLabel}>{t("result.worldChanges")}</div>
          <ul style={listStyle}>
            {consequence.worldChanges.map((w, i) => (
              <li key={i} style={lineStyle} data-testid={`consequence-change-${w.kind}`}>
                <span>{w.kind === "unlocked" ? t("result.changeUnlocked", { name: w.label }) : t("result.changeRecorded", { name: w.label })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
