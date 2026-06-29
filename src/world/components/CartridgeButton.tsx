// The "back to the cartridge object" affordance, shared by every costume. On desktop
// it floats top-center; on mobile it tucks into the top-right corner (inside the safe
// area) so it clears the identity bar instead of stacking on the title.

import { useIsMobile } from "../use-viewport.js";

export function CartridgeButton(props: { onClick: () => void }): JSX.Element {
  const isMobile = useIsMobile();
  const base = {
    position: "absolute" as const,
    pointerEvents: "auto" as const,
    font: "600 13px 'IBM Plex Mono', ui-monospace, monospace",
    background: "rgba(23,21,15,0.8)",
    color: "#c9a14a",
    border: "1px solid #4a4238",
    borderRadius: 6,
    cursor: "pointer",
  };
  const placement = isMobile
    ? { top: "calc(env(safe-area-inset-top, 0px) + 8px)", right: 10, padding: "6px 10px" }
    : { top: 14, left: "50%", transform: "translateX(-50%)", padding: "6px 12px" };
  return (
    <button onClick={props.onClick} style={{ ...base, ...placement }}>
      {isMobile ? "◧" : "◧ Cartridge"}
    </button>
  );
}
