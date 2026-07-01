import type { HTMLAttributes, ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import { PixelPanel } from "./PixelPanel.js";
import { PixelStateBadge } from "./PixelStateBadge.js";
import type { PixelBadgeState } from "./PixelBadge.js";
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

const STATUS_LABEL: Record<ContractCardState, string> = {
  selected: "Selected",
  available: "Available",
  reliable: "Reliable",
  risky: "Risky",
  failing: "Failing",
  locked: "Locked",
  recorded: "Recorded",
};

type PixelContractCardProps = Omit<HTMLAttributes<HTMLButtonElement>, "onClick"> & {
  state: ContractCardState;
  selected?: boolean;
  difficulty: number;
  title: string;
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
    state, selected = false, difficulty, title, description,
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
          <PixelStateBadge state={STATE_TO_BADGE[state]}>{STATUS_LABEL[state]}</PixelStateBadge>
          <span className="pixel-contract-card__difficulty">{difficulty}</span>
        </div>
        <h3 className="pixel-contract-card__title">{title}</h3>
        <p className="pixel-contract-card__desc">{description}</p>

        {state === "locked" ? (
          <div className="pixel-contract-card__gate" data-testid="unlock-requirements">
            <strong>Needs</strong>
            {(unlockRequirements?.length ? unlockRequirements : ["Clear earlier contracts"]).slice(0, 2).map((reqText, i) => (
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
