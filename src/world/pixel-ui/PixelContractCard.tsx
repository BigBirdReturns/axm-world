import type { HTMLAttributes, ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import { PixelPanel } from "./PixelPanel.js";
import { PixelStateBadge } from "./PixelStateBadge.js";
import type { PixelBadgeState } from "./PixelBadge.js";
import { t, type MessageId } from "../i18n/index.js";
import "./pixel-ui.css";

export type ContractCardState = "selected" | "available" | "reliable" | "risky" | "failing" | "locked" | "recorded";

const STATE_TO_BADGE: Record<ContractCardState, PixelBadgeState> = {
  selected: "selected",
  available: "available",
  reliable: "reliable",
  risky: "risky",
  failing: "failing",
  locked: "locked",
  recorded: "recorded",
};

// Shared status vocabulary — resolved live (not a module-level const) so it
// re-translates on locale switch.
const STATUS_LABEL_ID: Record<ContractCardState, MessageId> = {
  selected: "status.selected",
  available: "status.available",
  reliable: "status.reliable",
  risky: "status.risky",
  failing: "status.failing",
  locked: "status.locked",
  recorded: "status.recorded",
};

type PixelContractCardProps = Omit<HTMLAttributes<HTMLButtonElement>, "onClick"> & {
  state: ContractCardState;
  selected?: boolean;
  difficulty: number;
  title: string;
  /** Optional themed motif rendered beside the title (cartridge skin). Absent
   *  for cartridges with no motif set — the title renders exactly as before. */
  titleMotif?: ReactNode;
  description: string;
  unlockRequirements?: string[];
  requirements?: ReactNode;
  riskNote?: ReactNode;
  readyNote?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  onClick: () => void;
};

export function PixelContractCard(props: PixelContractCardProps): JSX.Element {
  const {
    state, selected = false, difficulty, title, titleMotif, description,
    unlockRequirements, requirements, riskNote, readyNote,
    footerLeft, footerRight, onClick, className = "", ...rest
  } = props;

  return (
    <button
      className={`pixel-contract-card ${className}`}
      data-state={state}
      data-selected={selected ? "true" : undefined}
      type="button"
      onClick={onClick}
      {...rest}
    >
      <PixelPanel className="pixel-contract-card__panel">
        <div className="pixel-contract-card__top">
          <PixelStateBadge state={STATE_TO_BADGE[state]}>{t(STATUS_LABEL_ID[state])}</PixelStateBadge>
          <span className="pixel-contract-card__difficulty">{difficulty}</span>
        </div>
        <h3 className="pixel-contract-card__title">
          {titleMotif ? <span className="pixel-contract-card__title-motif" aria-hidden="true">{titleMotif}</span> : null}
          {title}
        </h3>
        <p className="pixel-contract-card__desc">{description}</p>

        {state === "locked" ? (
          <div className="pixel-contract-card__gate" data-testid="unlock-requirements">
            <strong>{t("contractCard.needs")}</strong>
            {(unlockRequirements?.length ? unlockRequirements : [t("contractCard.clearEarlier")]).slice(0, 2).map((reqText, i) => (
              <span key={i}><PixelIcon name="locked" /> {reqText}</span>
            ))}
          </div>
        ) : (
          <>
            {requirements && <div className="pixel-contract-card__requirements">{requirements}</div>}
            {riskNote && <div className="pixel-contract-card__risk">{riskNote}</div>}
            {readyNote && <div className="pixel-contract-card__ready">{readyNote}</div>}
          </>
        )}

        <footer className="pixel-contract-card__footer">
          <span>{footerLeft}</span>
          {footerRight && <span className="pixel-contract-card__rewards">{footerRight}</span>}
        </footer>
      </PixelPanel>
    </button>
  );
}
