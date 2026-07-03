import type { ButtonHTMLAttributes } from "react";
import "./pixel-ui.css";

export type PixelButtonVariant = "primary" | "secondary" | "action" | "confirm" | "danger" | "disabled";

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PixelButtonVariant;
};

export function PixelButton({ variant = "primary", className = "", disabled, ...props }: PixelButtonProps): JSX.Element {
  return <button className={`pixel-button ${className}`} data-variant={disabled ? "disabled" : variant} disabled={disabled} {...props} />;
}
