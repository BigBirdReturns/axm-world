import { useCallback, useEffect, useRef } from "react";
import type { Cartridge } from "../cartridge.js";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";
import { CartridgeEmblem } from "../themes/CartridgeMotif.js";
import { t } from "../i18n/index.js";
import "./cartridge-enter-transition.css";

export const CARTRIDGE_ENTRY_DURATION_MS = 720;

export function entryTransitionDuration(reducedMotion: boolean): number {
  return reducedMotion ? 0 : CARTRIDGE_ENTRY_DURATION_MS;
}

function motionIsReduced(): boolean {
  if (typeof window === "undefined") return false;
  const osReduced = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const appReduced = typeof document !== "undefined"
    && document.documentElement.classList.contains("reduce-motion");
  return osReduced || appReduced;
}

interface Props {
  cartridge: Cartridge;
  onComplete: () => void;
}

/**
 * A bounded bridge between the held plaque and the mounted world. It carries no
 * game state and owns no navigation decision: Player mounts the real WorldHost
 * immediately underneath it, and this layer merely reveals that committed move.
 */
export function CartridgeEnterTransition({ cartridge, onComplete }: Props): JSX.Element {
  const completed = useRef(false);
  const completion = useRef(onComplete);

  useEffect(() => {
    completion.current = onComplete;
  }, [onComplete]);

  const finish = useCallback((): void => {
    if (completed.current) return;
    completed.current = true;
    completion.current();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(finish, entryTransitionDuration(motionIsReduced()));
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <div
      className="cartridge-enter-transition"
      data-testid="cartridge-enter-transition"
      role="status"
      aria-live="polite"
    >
      <div className="cartridge-enter-transition__doors" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="cartridge-enter-transition__plaque">
        <CartridgeEmblem arcId={cartridge.arc.meta.id} size={52} />
        <div className="cartridge-enter-transition__eyebrow">
          <RodohRuntimeMark variant="micro" showText={false} />
          {t("boot.runtimeEyebrow")}
        </div>
        <strong>{cartridge.manifest.name}</strong>
        <span>{t("boot.loadingNamed", { name: cartridge.manifest.name })}</span>
      </div>
      <button type="button" className="cartridge-enter-transition__skip" onClick={finish}>
        {t("boot.skipEntry")}
      </button>
    </div>
  );
}
