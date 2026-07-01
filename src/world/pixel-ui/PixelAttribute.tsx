import type { HTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import "./pixel-ui.css";

type PixelAttributeProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  value: number;
  icon: PixelIconName;
  gearBonus?: number;
  highlighted?: boolean;
};

export function PixelAttribute({ name, value, icon, gearBonus = 0, highlighted = false, className = "", ...props }: PixelAttributeProps): JSX.Element {
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
    </div>
  );
}
