import type { HTMLAttributes } from "react";
import type { DollAppearance } from "../themes/appearance.js";
import { PORTRAITS, PixelPortraitGlyph } from "./PixelPortrait.js";
import type { DollState } from "./PixelDoll.js";
import "./pixel-ui.css";

type PixelDollPortraitProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  appearance: DollAppearance;
  state?: DollState;
  label?: string;
  size?: number;
};

/** Portrait companion to PixelDoll. It reads the same theme-owned appearance
 * record, so a cartridge's roster face and staged body cannot drift apart. */
export function PixelDollPortrait({ appearance, state = "idle", label, size = 32, className = "", style, ...props }: PixelDollPortraitProps): JSX.Element {
  const spec = appearance.portraitSpec ?? PORTRAITS[appearance.portrait] ?? PORTRAITS.person;
  return (
    <span
      className={`pixel-doll-portrait pixel-doll-portrait--${state} ${className}`.trim()}
      data-appearance={appearance.id}
      data-render-mode={appearance.renderMode}
      data-state={state}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        flex: "none",
        opacity: state === "downed" ? 0.55 : 1,
        transform: state === "strain" ? "rotate(2deg)" : undefined,
        ...style,
      }}
      {...props}
    >
      <PixelPortraitGlyph spec={spec} />
    </span>
  );
}
