import type { HTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import "./pixel-ui.css";

type PixelGearSlotProps = HTMLAttributes<HTMLDivElement> & {
  name?: string;
  icon?: PixelIconName;
  bonusText?: string;
};

export function PixelGearSlot({ name, icon, bonusText, className = "", ...props }: PixelGearSlotProps): JSX.Element {
  const empty = !name;
  return (
    <div
      className={`pixel-gear-slot ${empty ? "pixel-gear-slot--empty" : ""} ${className}`}
      data-testid="pixel-gear-slot"
      {...props}
    >
      <span className="pixel-gear-slot__icon">
        <PixelIcon name={icon ?? "emptySlot"} />
      </span>
      <div className="pixel-gear-slot__body">
        {empty ? (
          <div className="pixel-gear-slot__name">No gear equipped</div>
        ) : (
          <>
            <div className="pixel-gear-slot__name">{name}</div>
            {bonusText && <div className="pixel-gear-slot__bonus">{bonusText}</div>}
          </>
        )}
      </div>
    </div>
  );
}
