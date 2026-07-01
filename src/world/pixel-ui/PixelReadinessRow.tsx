import type { HTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import "./pixel-ui.css";

export type ReadinessStatus = "ready" | "thin" | "short";

const STATUS_MARK: Record<ReadinessStatus, PixelIconName> = { ready: "reliable", thin: "risky", short: "failing" };
const STATUS_LABEL: Record<ReadinessStatus, string> = { ready: "Reliable", thin: "Risky", short: "Failing" };
const STATUS_ROW_CLASS: Record<ReadinessStatus, string> = {
  ready: "check-row check-row--ready",
  thin: "check-row check-row--thin",
  short: "check-row check-row--short",
};

function scoreText(value: number | undefined): string {
  if (value === undefined) return "";
  return String(Math.round(value * 10) / 10);
}

type PixelReadinessRowProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  status: ReadinessStatus;
  projected: number;
  threshold: number;
  margin: number;
  shortBy: number;
  attributeNames?: string[];
  scope?: string;
  topContributors?: string[];
  thresholdCopy?: string | null;
};

export function PixelReadinessRow(props: PixelReadinessRowProps): JSX.Element {
  const {
    name, status, projected, threshold, margin, shortBy,
    attributeNames = [], scope, topContributors = [], thresholdCopy,
    className = "", ...rest
  } = props;

  return (
    <div className={`${STATUS_ROW_CLASS[status]} pixel-readiness-row ${className}`} data-testid="pixel-readiness-row" {...rest}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: "var(--ink)", display: "flex", alignItems: "center", gap: 5 }}>
          <PixelIcon name={STATUS_MARK[status]} /> {name}
        </span>
        <span style={{ fontWeight: 700, fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
          {scoreText(projected)} / {Math.round(threshold)}
        </span>
      </div>

      {(attributeNames.length > 0 || scope) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, fontSize: 10, color: "var(--stone)", marginTop: 4 }}>
          {attributeNames.map((a) => <span key={a}>{a}</span>)}
          {scope && <span>· {scope}</span>}
          <span>· {STATUS_LABEL[status]}</span>
        </div>
      )}

      {thresholdCopy && (
        <div style={{ fontSize: 10, color: "var(--coffee)", marginTop: 4 }}>{thresholdCopy}</div>
      )}

      {status === "thin" && (
        <div style={{ fontSize: 11, color: "var(--gold-dark)", marginTop: 5 }}>
          Passing by +{scoreText(margin)} · needs +{scoreText(shortBy)} more buffer to become reliable.
        </div>
      )}
      {status === "short" && (
        <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 5 }}>
          Failing by {scoreText(Math.abs(margin))} · needs +{scoreText(shortBy)} to become reliable.
        </div>
      )}
      {status === "ready" && (
        <div style={{ fontSize: 10, color: "var(--teal-dark)", marginTop: 5 }}>Reliable buffer reached.</div>
      )}

      {topContributors.length > 0 && (
        <div style={{ fontSize: 10, color: "var(--stone)", marginTop: 5 }}>
          Top: {topContributors.join(" · ")}
        </div>
      )}
    </div>
  );
}
