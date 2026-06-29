// Shared viewport sensing for the player shell. The HUD and the costume chrome
// reflow below this breakpoint so the engine regions stop colliding on a phone.
// One source of truth so every presentation agrees on what "mobile" means.

import { useEffect, useState } from "react";

/** Phones / narrow viewports. Tuned to the ~390px class the shell was failing on. */
export const MOBILE_MAX_WIDTH = 640;

export function useIsMobile(maxWidth: number = MOBILE_MAX_WIDTH): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    // addEventListener is the modern API; older Safari needs addListener.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return isMobile;
}
