import type { HTMLAttributes } from "react";
import { SPRITES } from "./PixelSprite.js";
import type { DollAppearance } from "../themes/appearance.js";
import { identityPalette } from "../themes/appearance.js";
import "./pixel-ui.css";

export type DollState = "idle" | "strain" | "cleared" | "downed";

type PixelDollProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  appearance: DollAppearance;
  identity: string;
  state?: DollState;
  label?: string;
  size?: number;
};

const TOKENS = {
  shadow: new Set(["d"]),
  body: new Set(["o", "s", "h", "e", "m"]),
  clothes: new Set(["c", "t", "w"]),
};

function cellsFor(tokens: Set<string>, grid: string[], palette: Record<string, string>): JSX.Element[] {
  const cells: JSX.Element[] = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      const token = row[x]!;
      if (!tokens.has(token)) continue;
      cells.push(<rect key={`${token}-${y}-${x}`} x={x} y={y + 1} width={1} height={1} fill={palette[token] ?? "#1b1b1b"} />);
    }
  }
  return cells;
}

/** State-driven doll renderer. A cartridge may supply a full 16x16 body spec;
 * neutral cartridges continue to use the shared Rodoh silhouettes. Body,
 * clothes, ground, and status remain separate SVG layers. */
export function PixelDoll({ appearance, identity, state = "idle", label, size = 40, className = "", style, ...props }: PixelDollProps): JSX.Element {
  const spec = appearance.bodySpec ?? SPRITES[appearance.body] ?? SPRITES.person;
  const identityColors = identityPalette(identity);
  const palette = appearance.identityTreatment === "authored"
    ? spec.palette
    : { ...spec.palette, t: identityColors.accent, w: identityColors.highlight };
  const bodyTransform = state === "downed"
    ? "translate(0 16) rotate(-90 8 9)"
    : state === "strain"
      ? "translate(0 1) rotate(3 8 16)"
      : undefined;

  return (
    <span
      className={`pixel-doll pixel-doll--${state} ${className}`.trim()}
      data-appearance={appearance.id}
      data-render-mode={appearance.renderMode}
      data-state={state}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size * 1.125, display: "inline-block", flex: "none", ...style }}
      {...props}
    >
      <svg viewBox="0 0 16 18" width="100%" height="100%" style={{ shapeRendering: "crispEdges", display: "block", overflow: "visible" }}>
        <g data-layer="stance">{cellsFor(TOKENS.shadow, spec.grid, palette)}</g>
        <g data-layer="body" transform={bodyTransform}>{cellsFor(TOKENS.body, spec.grid, palette)}</g>
        <g data-layer="clothes" transform={bodyTransform}>{cellsFor(TOKENS.clothes, spec.grid, palette)}</g>
        <g data-layer="status-overlay">
          {state === "strain" && <><rect x="13" y="2" width="1" height="3" fill="#d19a3d" /><rect x="13" y="6" width="1" height="1" fill="#d19a3d" /></>}
          {state === "cleared" && <><rect x="11" y="3" width="1" height="1" fill="#74ad77" /><rect x="12" y="4" width="1" height="1" fill="#74ad77" /><rect x="13" y="2" width="1" height="2" fill="#74ad77" /></>}
          {state === "downed" && <><rect x="13" y="13" width="1" height="1" fill="#b01c18" /><rect x="14" y="14" width="1" height="1" fill="#b01c18" /></>}
        </g>
      </svg>
    </span>
  );
}
