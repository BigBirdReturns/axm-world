import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import "./pixel-ui.css";

type PixelPanelProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "light" | "dark";
  title?: ReactNode;
};

export const PixelPanel = forwardRef<HTMLElement, PixelPanelProps>(function PixelPanel(
  { tone = "light", title, className = "", children, ...props },
  ref,
): JSX.Element {
  return (
    <section ref={ref} className={`pixel-panel ${className}`} data-tone={tone === "dark" ? "dark" : undefined} {...props}>
      {title ? <header className="pixel-panel__title">{title}</header> : null}
      {children}
    </section>
  );
});
