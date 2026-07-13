// Source: https://bigbirdreturns.github.io/axm-tools/identity/
// Canonical map: identity/scg/source/scg-pixel-mark.js -> SCGPX.MAP
// Custody: exact governed public-practice derivative of the AXM-WORLD root
// glyph. Never redraw, center, close, or tidy the drift.
// Grid: 16x18
// Encoding: 0=transparent W=bone bloom o=olive stem
import type { CSSProperties } from "react";

export type RodohRuntimeMarkVariant = "boot" | "card" | "inline" | "micro";

export interface RodohRuntimeMarkProps {
  variant?: RodohRuntimeMarkVariant;
  label?: string;
  caption?: string;
  showText?: boolean;
  className?: string;
  style?: CSSProperties;
}

const BONE = "#ECE7D8";
const OLIVE = "#7C7F57";

const PIXELS = [
  "0000W00000W00000",
  "0000000000000000",
  "00W0000W00000WW0",
  "0W00WW0WW00W00W0",
  "00WWWWWWWW00W000",
  "0WWWWWWWWWW00000",
  "00WWWWWWWWW00000",
  "00WWWWWWWW000000",
  "000WWWWWW0o00000",
  "00000WWW00000000",
  "000000o0000000W0",
  "000000o000000000",
  "000o00o00o000000",
  "00o000o00o000000",
  "000000o000000000",
  "00000oo000000000",
  "00000oo000000000",
  "000oooooo0000000",
];

function colorFor(token: string): string | null {
  switch (token) {
    case "W": return BONE;
    case "o": return OLIVE;
    default: return null;
  }
}

const SIZES: Record<RodohRuntimeMarkVariant, number> = {
  boot: 6,
  card: 4,
  inline: 3,
  micro: 2,
};

/** The governed glyph without wordmark chrome. All dandelion uses import this
 * renderer so the canonical map has one owner and cannot drift by surface. */
export function RodohDandelionGlyph({ size = 32, bone = BONE, olive = OLIVE }: { size?: number; bone?: string; olive?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 16 18" width={size} height={size * 18 / 16} shapeRendering="crispEdges" aria-hidden="true">
      {PIXELS.flatMap((row, y) => row.split("").map((token, x) => {
        if (token === "0") return null;
        return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={token === "W" ? bone : olive} />;
      }))}
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
  const pixelWrapStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${PIXELS[0]?.length ?? 14}, ${cell}px)`,
    gridTemplateRows: `repeat(${PIXELS.length}, ${cell}px)`,
    gap: 0,
    filter: variant === "boot" ? "drop-shadow(0 0 6px rgba(255,247,223,0.18))" : undefined,
    flex: "0 0 auto",
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
    color: variant === "boot" ? "#6f8f57" : "#a59c8b",
    fontSize: variant === "boot" ? 10 : 9,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  return (
    <div className={className} style={wrapStyle} aria-label="Rodoh runtime mark">
      <div style={pixelWrapStyle} aria-hidden="true">
        {PIXELS.flatMap((row, y) => row.split("").map((token, x) => {
          const color = colorFor(token);
          return (
            <span
              key={`${x}-${y}`}
              style={{
                width: cell,
                height: cell,
                background: color ?? "transparent",
              }}
            />
          );
        }))}
      </div>
      {showText && (
        <div style={labelStyle}>
          <div>{label}</div>
          {!compact && <div style={captionStyle}>{caption}</div>}
        </div>
      )}
    </div>
  );
}
