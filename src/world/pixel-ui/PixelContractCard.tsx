import type { HTMLAttributes, ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import { PixelPanel } from "./PixelPanel.js";
import { PixelStateBadge } from "./PixelStateBadge.js";
import { PixelStateBands } from "./PixelStateBands.js";
import type { PixelBadgeState } from "./PixelBadge.js";
import { t, type MessageId } from "../i18n/index.js";
import "./pixel-ui.css";

// The card reads on TWO INDEPENDENT axes, shown as two named bands:
//   • WORLD/CONTRACT STATE — what the cartridge/world says about the contract:
//     available / locked / recorded (plus the up-next / steep header markers).
//   • SQUAD FIT — how the currently assigned roster performs against it. A SEPARATE
//     axis, deliberately never folded into the state, so a squad verdict like "risky"
//     can never read as a property of the contract itself.
// Selection is neither axis — it's a visual highlight (the card border), not a state.
export type ContractCardState = "available" | "locked" | "recorded";

// The squad-fit verdict — the same words the readiness projection already uses.
export type SquadFit = "reliable" | "risky" | "failing";

const STATE_TO_BADGE: Record<ContractCardState, PixelBadgeState> = {
  available: "available",
  locked: "locked",
  recorded: "recorded",
};

// Shared status vocabulary — resolved live (not a module-level const) so it
// re-translates on locale switch.
const STATUS_LABEL_ID: Record<ContractCardState, MessageId> = {
  available: "status.available",
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
  /** The two map overlay markers, display-only and derived upstream (deriveNodeMarkers)
   *  from the SAME projection the World-map uses — the card never recomputes them, so
   *  board and map speak one marker language. `upNext` = the single shared "next"
   *  contract; `steep` = the arc-relative high-difficulty read. */
  upNext?: boolean;
  steep?: boolean;
  requirements?: ReactNode;
  unlockRequirements?: string[];
  /** WORLD-STATE band: the plain state line ("Available now" / "Locked" / "Recorded")
   *  plus an optional secondary note. Both are computed upstream from existing state. */
  worldStateLabel: string;
  worldStateNote?: ReactNode;
  /** SQUAD-FIT band: the verdict (for colour/icon; null when not evaluated), its label
   *  ("Reliable" / "Not evaluated until available" / …), and the readiness reason. */
  squadFit?: SquadFit | null;
  squadFitLabel: string;
  squadFitReason?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  onClick: () => void;
};

export function PixelContractCard(props: PixelContractCardProps): JSX.Element {
  const {
    state, selected = false, difficulty, title, titleMotif, description,
    upNext = false, steep = false, requirements, unlockRequirements,
    worldStateLabel, worldStateNote, squadFit = null, squadFitLabel, squadFitReason,
    footerLeft, footerRight, onClick, className = "", ...rest
  } = props;

  return (
    <button
      className={`pixel-contract-card ${className}`}
      data-state={state}
      data-selected={selected ? "true" : undefined}
      data-upnext={upNext ? "true" : undefined}
      data-steep={steep ? "true" : undefined}
      type="button"
      onClick={onClick}
      {...rest}
    >
      <PixelPanel className="pixel-contract-card__panel">
        <div className="pixel-contract-card__top">
          <PixelStateBadge state={STATE_TO_BADGE[state]}>{t(STATUS_LABEL_ID[state])}</PixelStateBadge>
          {/* The authored difficulty, labelled so the bare number reads as what it
              is — the same "Difficulty N" wording the map pin and encounter shell
              use. Chrome through t(); the value flows verbatim. */}
          <span className="pixel-contract-card__difficulty">
            <span className="pixel-contract-card__difficulty-label">{t("contractCard.difficulty")}</span>
            <span className="pixel-contract-card__difficulty-value">{difficulty}</span>
          </span>
        </div>

        {/* Map markers carried onto the card — display-only, and the SAME "Up next" /
            "Steep" chrome the World-map pin prints (reused ids, not a second string). */}
        {(upNext || steep) && (
          <div className="pixel-contract-card__markers">
            {upNext && (
              <span className="pixel-contract-card__marker pixel-contract-card__marker--next" data-testid="contract-card-marker-next">
                <span aria-hidden="true">▸</span> {t("worldMap.nextContract")}
              </span>
            )}
            {steep && (
              <span
                className="pixel-contract-card__marker pixel-contract-card__marker--steep"
                data-testid="contract-card-marker-steep"
                aria-label={t("worldMap.steepContract")}
              >
                <span aria-hidden="true">⚠</span> {t("worldMap.steep")}
              </span>
            )}
          </div>
        )}
        <h3 className="pixel-contract-card__title">
          {titleMotif ? <span className="pixel-contract-card__title-motif" aria-hidden="true">{titleMotif}</span> : null}
          {title}
        </h3>
        <p className="pixel-contract-card__desc">{description}</p>

        {/* NEEDS — authored roster requirements (available) or the unlock blockers
            (locked). A contract attribute, not a state or a squad verdict. */}
        {state === "locked" && unlockRequirements?.length ? (
          <div className="pixel-contract-card__needs" data-testid="unlock-requirements">
            <span className="pixel-contract-card__needs-label">{t("contractCard.needs")}</span>
            <div className="pixel-contract-card__needs-body">
              {unlockRequirements.slice(0, 2).map((reqText, i) => (
                <span key={i} className="pixel-contract-card__pill"><PixelIcon name="locked" /> {reqText}</span>
              ))}
            </div>
          </div>
        ) : requirements ? (
          <div className="pixel-contract-card__needs">
            <span className="pixel-contract-card__needs-label">{t("contractCard.needs")}</span>
            <div className="pixel-contract-card__needs-body">{requirements}</div>
          </div>
        ) : null}

        {/* The two named axis bands — World state + Squad fit — shared verbatim with
            the detail panel via PixelStateBands, so board and commit surface agree. */}
        <PixelStateBands
          state={state}
          worldStateLabel={worldStateLabel}
          worldStateNote={worldStateNote}
          squadFit={squadFit}
          squadFitLabel={squadFitLabel}
          squadFitReason={squadFitReason}
        />

        <footer className="pixel-contract-card__footer">
          <span>{footerLeft}</span>
          {footerRight && <span className="pixel-contract-card__rewards">{footerRight}</span>}
        </footer>
      </PixelPanel>
    </button>
  );
}
