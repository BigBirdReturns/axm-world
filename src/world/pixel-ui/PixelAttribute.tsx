import type { HTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import "./pixel-ui.css";

type PixelAttributeProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  value: number;
  icon: PixelIconName;
  gearBonus?: number;
  highlighted?: boolean;
  /** When set, this agent is a top pick for this (driving) stat; the label
   *  (e.g. "TOP") is passed in so it stays translatable. */
  leadLabel?: string;
};

export function PixelAttribute({ name, value, icon, gearBonus = 0, highlighted = false, leadLabel, className = "", ...props }: PixelAttributeProps): JSX.Element {
  return (
    <div
      className={`pixel-attribute ${highlighted ? "pixel-attribute--highlighted" : ""} ${className}`}
      data-testid="pixel-attribute"
      {...props}
    >
      <PixelIcon name={icon} />
      <div className="pixel-attribute__body">
        <div className="pixel-attribute__label">{name}</div>
        <div className="pixel-attribute__value">
          <strong>{value}</strong>
          {gearBonus > 0 && <span className="pixel-attribute__gear">+{gearBonus}</span>}
        </div>
      </div>
      {leadLabel ? <span className="pixel-attribute__lead" data-testid="attr-lead">{leadLabel}</span> : null}
    </div>
  );
}
