export const RODOH_SURFACE_CHANGE_EVENT = "rodoh:surface-change" as const;
export const BURN_EXTERNAL_ASSET_SURFACE = "burn-assets" as const;

export type RodohSurface = typeof BURN_EXTERNAL_ASSET_SURFACE | null;

export function currentRodohSurface(): RodohSurface {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("surface") === BURN_EXTERNAL_ASSET_SURFACE
    ? BURN_EXTERNAL_ASSET_SURFACE
    : null;
}

/** Change a presentation surface without remounting the underlying Player.
 * The URL remains shareable, while the holder's live world and any process-local
 * verified asset session stay mounted beneath the surface. */
export function setRodohSurface(surface: RodohSurface, mode: "push" | "replace" = "push"): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (surface) url.searchParams.set("surface", surface);
  else url.searchParams.delete("surface");
  const state = { ...(window.history.state ?? {}), rodohSurface: surface };
  if (mode === "replace") window.history.replaceState(state, "", url);
  else window.history.pushState(state, "", url);
  window.dispatchEvent(new Event(RODOH_SURFACE_CHANGE_EVENT));
}

export function subscribeRodohSurface(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("popstate", listener);
  window.addEventListener(RODOH_SURFACE_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(RODOH_SURFACE_CHANGE_EVENT, listener);
  };
}
