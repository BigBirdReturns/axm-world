import type { ReactNode } from "react";
import { PixelIcon } from "./PixelIcon.js";
import type { ContractCardState, SquadFit } from "./PixelContractCard.js";
import { t } from "../i18n/index.js";
import "./pixel-ui.css";

// The two named axis bands a contract reads on — WORLD STATE (what the cartridge/world
// says) and SQUAD FIT (how the currently assigned roster measures up) — rendered
// identically wherever a contract surfaces: the board card AND the commit-side detail
// panel. One presentation, fed by the shared card-axes projection, so the two surfaces
// speak the same language and can never drift. Display-only; no readiness math here.
export function PixelStateBands(props: {
  state: ContractCardState;
  worldStateLabel: string;
  worldStateNote?: ReactNode;
  squadFit?: SquadFit | null;
  squadFitLabel: string;
  squadFitReason?: ReactNode;
}): JSX.Element {
  const { state, worldStateLabel, worldStateNote, squadFit = null, squadFitLabel, squadFitReason } = props;
  return (
    <>
      <div className="pixel-state-band pixel-state-band--world" data-testid="contract-card-world-band" data-state={state}>
        <span className="pixel-state-band__label"><PixelIcon name="available" /> {t("contractCard.worldState")}</span>
        <span className="pixel-state-band__primary">{worldStateLabel}</span>
        {worldStateNote != null && worldStateNote !== "" && <span className="pixel-state-band__note">{worldStateNote}</span>}
      </div>
      <div className="pixel-state-band pixel-state-band--squad" data-testid="contract-card-squad-band" data-squadfit={squadFit ?? "none"}>
        <span className="pixel-state-band__label">{t("contractCard.squadFit")}</span>
        <span className="pixel-state-band__primary pixel-state-band__squad-verdict">
          {squadFit ? <PixelIcon name={squadFit} /> : null} {squadFitLabel}
        </span>
        {squadFitReason != null && squadFitReason !== "" && <span className="pixel-state-band__note">{squadFitReason}</span>}
      </div>
    </>
  );
}
