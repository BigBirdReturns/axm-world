import type { HTMLAttributes } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import "./pixel-ui.css";

const ROLE_ICON: Record<string, PixelIconName> = {
  vanguard: "vanguard",
  skirmisher: "skirmisher",
  mender: "mender",
};

type PixelRoleBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  role: string;
};

export function PixelRoleBadge({ role, className = "", ...props }: PixelRoleBadgeProps): JSX.Element {
  const slug = role.toLowerCase();
  const icon = ROLE_ICON[slug];
  return (
    <span className={`pixel-role-badge pixel-role-badge--${slug} ${className}`} {...props}>
      {icon && <PixelIcon name={icon} />}
      {role}
    </span>
  );
}
