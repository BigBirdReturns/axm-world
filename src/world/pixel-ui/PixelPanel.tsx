import type { HTMLAttributes, ReactNode } from "react";
import "./pixel-ui.css";

type PixelPanelProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "light" | "dark";
  title?: ReactNode;
};

export function PixelPanel({ tone = "light", title, className = "", children, ...props }: PixelPanelProps): JSX.Element {
  return (
    <section className={`pixel-panel ${className}`} data-tone={tone === "dark" ? "dark" : undefined} {...props}>
      {title ? <header className="pixel-panel__title">{title}</header> : null}
      {children}
    </section>
  );
}
