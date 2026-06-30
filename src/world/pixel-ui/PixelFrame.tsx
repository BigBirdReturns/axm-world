import type { HTMLAttributes } from "react";
import "./pixel-ui.css";

export function PixelFrame({ className = "", ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={`pixel-frame ${className}`} {...props} />;
}
