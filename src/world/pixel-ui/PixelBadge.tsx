import type { HTMLAttributes, ReactNode } from "react";
import "./pixel-ui.css";

export type PixelBadgeState = "available" | "reliable" | "risky" | "failing" | "locked" | "recorded" | "selected" | "lootAvailable";

type PixelBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  state?: PixelBadgeState;
  icon?: ReactNode;
};

export function PixelBadge({ state, icon, className = "", children, ...props }: PixelBadgeProps): JSX.Element {
  return (
    <span className={`pixel-badge ${className}`} data-state={state} {...props}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
