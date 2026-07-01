import type { HTMLAttributes, ReactNode } from "react";
import { PixelBadge, type PixelBadgeState } from "./PixelBadge.js";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import "./pixel-ui.css";

const STATE_ICON: Record<PixelBadgeState, PixelIconName> = {
  available: "available",
  reliable: "reliable",
  risky: "risky",
  failing: "failing",
  locked: "locked",
  recorded: "recorded",
  selected: "selected",
  lootAvailable: "lootAvailable",
};

type PixelStateBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  state: PixelBadgeState;
  children?: ReactNode;
};

export function PixelStateBadge({ state, children, ...props }: PixelStateBadgeProps): JSX.Element {
  return (
    <PixelBadge state={state} icon={<PixelIcon name={STATE_ICON[state]} />} {...props}>
      {children}
    </PixelBadge>
  );
}
