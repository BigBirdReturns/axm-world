import type { HTMLAttributes, ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import { PixelPanel } from "./PixelPanel.js";
import "./pixel-ui.css";

type PixelLootCardProps = HTMLAttributes<HTMLDivElement> & {
  itemName: string;
  icon: PixelIconName;
  slot: string;
  bonusText: string;
  flavorText: string;
  children?: ReactNode;
};

export function PixelLootCard({ itemName, icon, slot, bonusText, flavorText, children, className = "", ...props }: PixelLootCardProps): JSX.Element {
  return (
    <PixelPanel className={`pixel-loot-card ${className}`} data-testid="pixel-loot-card" {...props}>
      <div className="pixel-loot-card__inner">
        <div className="pixel-loot-card__icon">
          <PixelIcon name={icon} />
        </div>
        <div className="pixel-loot-card__body">
          <div className="pixel-loot-card__name">{itemName}</div>
          <div className="pixel-loot-card__slot">{slot} · {bonusText || "utility"}</div>
          <div className="pixel-loot-card__flavor">{flavorText}</div>
          {children && <div className="pixel-loot-card__actions">{children}</div>}
        </div>
      </div>
    </PixelPanel>
  );
}
