import type { WorldNode } from "../contract.js";
import type { PartyReadiness, ProjectedOutcome } from "../readiness.js";
import type { RosterMember } from "../useArcWorld.js";
import type { RodohTheme } from "../themes/rodoh.js";
import { resolveDollAppearance } from "../themes/appearance.js";
import { PixelDoll, PixelPanel, PixelSprite } from "../pixel-ui/index.js";
import { t } from "../i18n/index.js";
import "./mobile-mission-stage.css";

const PROJECTION_KEY: Record<ProjectedOutcome, "encounterShell.projReliable" | "encounterShell.projRisky" | "encounterShell.projFailing" | "encounterShell.projNone"> = {
  success: "encounterShell.projReliable",
  partial: "encounterShell.projRisky",
  failure: "encounterShell.projFailing",
  none: "encounterShell.projNone",
};

interface MobileMissionStageProps {
  node: WorldNode;
  roster: RosterMember[];
  party: string[];
  max: number;
  theme: RodohTheme;
  readiness: PartyReadiness | null;
}

/** The mobile play surface: people first, one confrontation, one projection.
 * Detailed arithmetic stays below this stage instead of replacing it. */
export function MobileMissionStage({ node, roster, party, max, theme, readiness }: MobileMissionStageProps): JSX.Element {
  const byId = new Map(roster.map((member) => [member.id, member] as const));
  const members = party.map((id) => byId.get(id)).filter((member): member is RosterMember => member !== undefined);
  const outcome = readiness?.projectedOutcome ?? "none";

  return (
    <PixelPanel className="mobile-mission-stage" data-testid="mobile-mission-stage">
      <header className="mobile-mission-stage__header">
        <span>{t("encounterShell.staging")}</span>
        <span>{t("contractCard.difficulty")} {node.difficulty}</span>
      </header>
      <h1 className="mobile-mission-stage__title">{node.title}</h1>
      <p className="mobile-mission-stage__description">{node.description}</p>

      <div className="mobile-mission-stage__scene">
        <div className="mobile-mission-stage__squad">
          <div className="mobile-mission-stage__scene-label">{t("encounterShell.goingIn", { n: members.length })}</div>
          <div className="mobile-mission-stage__figures" data-testid="mobile-mission-party">
            {members.map((member) => (
              <figure key={member.id} className="mobile-mission-stage__figure">
                <PixelDoll
                  appearance={resolveDollAppearance(theme, member.role)}
                  identity={member.id}
                  state={member.downed ? "downed" : member.stress >= 70 ? "strain" : "idle"}
                  size={48}
                  label={`${member.name}, ${member.role}`}
                />
                <figcaption>{member.name.split(" ")[0]}</figcaption>
              </figure>
            ))}
            {members.length === 0 && <span className="mobile-mission-stage__empty">{t("shell.assignParty")}</span>}
          </div>
        </div>

        <div className="mobile-mission-stage__versus" aria-hidden="true">►</div>

        <div className="mobile-mission-stage__threat">
          <div className="mobile-mission-stage__scene-label">{t("contractCard.difficulty")} {node.difficulty}</div>
          <PixelSprite name="threat" size={68} />
        </div>
      </div>

      <div className="mobile-mission-stage__projection" data-outcome={outcome}>
        <strong>{t(PROJECTION_KEY[outcome])}</strong>
        {readiness?.reasons[0] && <span>{readiness.reasons[0]}</span>}
      </div>

      <div className="mobile-mission-stage__flow" aria-label={t("encounterShell.playEncounter")}>
        <span>1 · {t("encounterShell.deploy")}</span>
        <b>→</b>
        <span>2 · {t("encounterShell.playEncounter")}</span>
        <b>→</b>
        <span>3 · {t("result.recorded")}</span>
      </div>
      <div className="mobile-mission-stage__count">{t("shell.rosterPartyOf", { count: members.length, max })}</div>
    </PixelPanel>
  );
}
