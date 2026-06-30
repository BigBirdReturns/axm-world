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

const PUFF = "#fff7df";
const PUFF_SHADE = "#d9d0b8";
const INK = "#151515";
const STEM = "#7da15c";
const LEAF = "#4f6f36";
const SEED = "#efe8d2";

const PIXELS = [
  "000000p0000000",
  "0000p0w0p00000",
  "000pwwwwwp0000",
  "00pwwwwwwwp000",
  "00wwwwwwwww000",
  "0pwwwbbwwwp00",
  "00wwwwmwwww000",
  "00pwwwwwwwp000",
  "000pwwwwwp0000",
  "00000www000000",
  "000000s0000000",
  "000000s0000000",
  "0000llsrr00000",
  "000lllsrrrr000",
  "00lllslrrr0000",
  "000l00s00r0000",
  "000000s0000000",
  "000000s0000000",
];

function colorFor(token: string): string | null {
  switch (token) {
    case "w": return PUFF;
    case "p": return PUFF_SHADE;
    case "b": return INK;
    case "m": return INK;
    case "s": return STEM;
    case "l": return LEAF;
    case "r": return "#5f7f41";
    case "e": return SEED;
    default: return null;
  }
}

const SIZES: Record<RodohRuntimeMarkVariant, number> = {
  boot: 6,
  card: 4,
  inline: 3,
  micro: 2,
};

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
