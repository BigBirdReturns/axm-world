import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon.js";
import { PixelDollPortrait } from "./PixelDollPortrait.js";
import type { DollState } from "./PixelDoll.js";
import type { DollAppearance } from "../themes/appearance.js";
import { RODOH_DOLL_APPEARANCES } from "../themes/appearance.js";
import { PixelMeter } from "./PixelMeter.js";
import { PixelPanel } from "./PixelPanel.js";
import { PixelRoleBadge } from "./PixelRoleBadge.js";
import { PixelAttribute } from "./PixelAttribute.js";
import { PixelGearSlot } from "./PixelGearSlot.js";
import { PixelBadge } from "./PixelBadge.js";
import { t } from "../i18n/index.js";
import "./pixel-ui.css";

export interface RosterCardAttribute {
  id: string;
  name: string;
  value: number;
  icon: PixelIconName;
  gearBonus?: number;
  highlighted?: boolean;
  /** Set on the driving stat of a top-pick agent (e.g. "TOP"). */
  leadLabel?: string;
}

export interface RosterCardGear {
  id: string;
  name: string;
  icon: PixelIconName;
  bonusText?: string;
}

type PixelRosterCardProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  name: string;
  role: string;
  identity?: string;
  appearance?: DollAppearance;
  inParty?: boolean;
  downed?: boolean;
  affliction?: string | null;
  attributes: RosterCardAttribute[];
  gear: RosterCardGear[];
  stress: number;
  morale: number;
  selectable?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  style?: CSSProperties;
};

function meterColor(value: number, goodWhen: "high" | "low"): string {
  const pct = Math.max(0, Math.min(100, value));
  const isGood = goodWhen === "high" ? pct >= 50 : pct <= 50;
  return isGood ? "var(--teal)" : "var(--danger)";
}

export function PixelRosterCard(props: PixelRosterCardProps): JSX.Element {
  const {
    name, role, identity, appearance, inParty = false, downed = false, affliction = null,
    attributes, gear, stress, morale, selectable = false, onToggle,
    children, style, className = "", ...rest
  } = props;
  const dollState: DollState = downed ? "downed" : stress >= 70 ? "strain" : "idle";
  const resolvedAppearance = appearance ?? RODOH_DOLL_APPEARANCES["rodoh:bare-doll"]!;

  return (
    <PixelPanel
      className={`pixel-roster-card ${className}`}
      data-testid="roster-card"
      style={{
        ...style,
        borderColor: inParty ? "var(--gold-border)" : undefined,
        boxShadow: inParty ? "3px 3px 0 var(--gold-border)" : undefined,
        opacity: downed ? 0.55 : 1,
      }}
      {...rest}
    >
      <button
        type="button"
        className="pixel-roster-card__toggle"
        disabled={downed || !selectable}
        onClick={onToggle}
        title={selectable ? t("rosterCard.assignTooltip") : t("rosterCard.selectFirstTooltip")}
        style={{ cursor: downed || !selectable ? "default" : "pointer" }}
      >
        <div className="pixel-roster-card__header">
          {/* The appearance pack owns both the staged body and this close-up.
              A cartridge-specific face therefore follows the same role binding
              everywhere instead of falling back to generic Rodoh art. */}
          <PixelDollPortrait appearance={resolvedAppearance} state={dollState} label={`${name}, ${role}`} size={32} data-testid="roster-card-doll" data-identity={identity} style={{ marginRight: 8 }} />
          <div className="pixel-roster-card__identity">
            <strong className="pixel-roster-card__name">{name}</strong>
            <div className="pixel-roster-card__badges">
              <PixelRoleBadge role={role} />
              {inParty && (
                <span className="role-badge" style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>
                  {t("status.assigned")}
                </span>
              )}
              {affliction && (
                <PixelBadge state="failing" className="pixel-roster-card__affliction">
                  {affliction}
                </PixelBadge>
              )}
            </div>
          </div>
          {inParty && <PixelIcon name="selected" label={t("status.assigned")} />}
        </div>

        {attributes.length > 0 && (
          <div className="pixel-roster-card__attrs">
            {attributes.map((a) => (
              <PixelAttribute
                key={a.id}
                name={a.name}
                value={a.value}
                icon={a.icon}
                gearBonus={a.gearBonus}
                highlighted={a.highlighted}
                leadLabel={a.leadLabel}
              />
            ))}
          </div>
        )}

        <div className="pixel-roster-card__gear">
          {gear.length === 0 ? (
            <PixelGearSlot />
          ) : (
            gear.map((g) => <PixelGearSlot key={g.id} name={g.name} icon={g.icon} bonusText={g.bonusText} />)
          )}
        </div>

        <div className="pixel-roster-card__meters">
          <div>
            <div className="pixel-roster-card__meter-label">{t("rosterCard.stress", { value: Math.round(stress) })}</div>
            <PixelMeter value={stress} max={100} segments={5} color={meterColor(stress, "low")} label={t("rosterCard.stress", { value: Math.round(stress) })} />
          </div>
          <div>
            <div className="pixel-roster-card__meter-label">{t("rosterCard.morale", { value: Math.round(morale) })}</div>
            <PixelMeter value={morale} max={100} segments={5} color={meterColor(morale, "high")} label={t("rosterCard.morale", { value: Math.round(morale) })} />
          </div>
        </div>
      </button>

      {children && <div className="pixel-roster-card__actions">{children}</div>}
    </PixelPanel>
  );
}
