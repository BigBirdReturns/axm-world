import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function visibleFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  });
}

/** Shared dialog custody: place focus on the current beat, keep Tab inside it,
 * and return focus to the action that opened it (or the active surface's
 * declared fallback) when the beat recovers. */
export function useDialogFocus(
  containerRef: RefObject<HTMLElement>,
  initialFocusRef: RefObject<HTMLElement>,
  focusKey: string,
): void {
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    if (!container) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = visibleFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.requestAnimationFrame(() => {
        if (previousFocus?.isConnected && !previousFocus.closest("[inert]")) {
          previousFocus.focus();
          return;
        }
        document.querySelector<HTMLElement>(
          "[data-focus-default]:not([disabled]), [data-testid='play-encounter-button']:not([disabled]), [data-testid='mobile-adjust-party']:not([disabled])",
        )?.focus();
      });
    };
  }, [containerRef]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      (initialFocusRef.current ?? containerRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [containerRef, focusKey, initialFocusRef]);
}
