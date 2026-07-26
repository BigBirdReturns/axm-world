// Source: src/world/brand/rodoh-root-mark.ts
// Constitution: BigBirdReturns/axm-tools@93a9740a26b0fafe5b5152103a8118a489afbcec
// Grid: 16x16 AXM-WORLD root glyph, rendered only at integer cell scale.
// Encoding: .=transparent over charcoal W=cream bloom M=moss stem and seeds.
import type { CSSProperties } from "react";
import {
  RODOH_ROOT_MARK_HEIGHT,
  RODOH_ROOT_MARK_MAP,
  RODOH_ROOT_MARK_PALETTE,
  RODOH_ROOT_MARK_WIDTH,
  rootMarkColor,
  type RodohRootMarkToken,
} from "./rodoh-root-mark.js";

export type RodohRuntimeMarkVariant = "boot" | "card" | "inline" | "micro";

export interface RodohRuntimeMarkProps {
  variant?: RodohRuntimeMarkVariant;
  label?: string;
  caption?: string;
  showText?: boolean;
  className?: string;
  style?: CSSProperties;
}

const SIZES: Record<RodohRuntimeMarkVariant, number> = {
  boot: 6,
  card: 4,
  inline: 3,
  micro: 2,
};

type PaintedRootMarkToken = Exclude<RodohRootMarkToken, ".">;

function rootPath(token: PaintedRootMarkToken): string {
  const segments: string[] = [];
  for (const [y, row] of RODOH_ROOT_MARK_MAP.entries()) {
    for (const [x, value] of [...row].entries()) {
      if (value === token) segments.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return segments.join("");
}

// Two paths preserve the frozen coordinate ledger and palette while avoiding
// one DOM node for every transparent or painted source cell.
const ROOT_PATHS = Object.freeze({ W: rootPath("W"), M: rootPath("M") });

/** The constitutional AXM-WORLD root glyph without wordmark chrome. The map,
 * palette, offset, and negative space are frozen. The only transform here is an
 * integer cell scale over the declared charcoal field. */
export function RodohDandelionGlyph({ size = 32 }: { size?: number }): JSX.Element {
  const cell = Math.max(1, Math.round(size / RODOH_ROOT_MARK_WIDTH));
  const renderedWidth = RODOH_ROOT_MARK_WIDTH * cell;
  const renderedHeight = RODOH_ROOT_MARK_HEIGHT * cell;
  return (
    <svg
      viewBox={`0 0 ${RODOH_ROOT_MARK_WIDTH} ${RODOH_ROOT_MARK_HEIGHT}`}
      width={renderedWidth}
      height={renderedHeight}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: "block", imageRendering: "pixelated", background: RODOH_ROOT_MARK_PALETTE.charcoal }}
    >
      <path d={ROOT_PATHS.W} fill={rootMarkColor("W") ?? undefined} />
      <path d={ROOT_PATHS.M} fill={rootMarkColor("M") ?? undefined} />
    </svg>
  );
}

export function RodohRuntimeMark({
  variant = "inline",
  label = variant === "boot" ? "RODOH RUNTIME v1.0" : "RODOH",
  caption = variant === "boot" ? "Hold the loop." : "The loop remembers.",
  showText = true,
  className,
  style,
}: RodohRuntimeMarkProps): JSX.Element {
  const cell = SIZES[variant];
  const compact = variant === "micro" || variant === "inline";
  const textColor = variant === "boot" ? "#a59c8b" : "#d8cfbd";
  const wrapStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: compact ? "flex-start" : "center",
    gap: compact ? 8 : 12,
    color: textColor,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    imageRendering: "pixelated",
    ...style,
  };
  const labelStyle: CSSProperties = {
    fontSize: variant === "boot" ? 13 : variant === "card" ? 11 : 9,
    lineHeight: 1.25,
    letterSpacing: variant === "boot" ? "0.18em" : "0.1em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
  const captionStyle: CSSProperties = {
    marginTop: 3,
    color: variant === "boot" ? RODOH_ROOT_MARK_PALETTE.moss : "#a59c8b",
    fontSize: variant === "boot" ? 10 : 9,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  return (
    <div className={className} style={wrapStyle} aria-label="Rodoh runtime mark">
      <RodohDandelionGlyph size={RODOH_ROOT_MARK_WIDTH * cell} />
      {showText && (
        <div style={labelStyle}>
          <div>{label}</div>
          {!compact && <div style={captionStyle}>{caption}</div>}
        </div>
      )}
    </div>
  );
}