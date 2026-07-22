import type { Arc } from "../../engine/types.js";
import type { CanonRelation, CanonTier } from "../../godscar/types.js";
import { inspectGodscarPocket } from "./godscar.js";
import { t, type MessageId } from "../i18n/index.js";
import { PORTRAITS, PixelPortraitGlyph } from "../pixel-ui/PixelPortrait.js";
import { resolveDollAppearance } from "../themes/appearance.js";
import { themeForArc } from "../themes/select.js";
import {
  CartridgeEmblem,
  CartridgePressureMark,
  CartridgeEvidenceMark,
  CartridgeFactionMark,
  CartridgeConsequenceMark,
} from "../themes/CartridgeMotif.js";

const RECEIPT_BUDGET = 12;
const FACTION_BUDGET = 12;
const CONSEQUENCE_BUDGET = 18;
const ERROR_BUDGET = 8;

const pressureOrder = [
  ["pocket", "godscar.pressure.pocket"],
  ["patron", "godscar.pressure.patron"],
  ["excluded-actor", "godscar.pressure.excludedActor"],
  ["approaching-trigger", "godscar.pressure.approachingTrigger"],
  ["cost-of-resistance", "godscar.pressure.costOfResistance"],
  ["scale-revelation", "godscar.pressure.scaleRevelation"],
] as const satisfies ReadonlyArray<readonly [string, MessageId]>;

const relationMessage: Record<CanonRelation, MessageId> = {
  foundational: "godscar.canonRelation.foundational",
  compatible: "godscar.canonRelation.compatible",
  contested: "godscar.canonRelation.contested",
  "alternate-sequence": "godscar.canonRelation.alternateSequence",
  crossover: "godscar.canonRelation.crossover",
  "private-branch": "godscar.canonRelation.privateBranch",
};

const tierMessage: Record<CanonTier, MessageId> = {
  "settled-canon": "godscar.canonTier.settledCanon",
  "contested-canon": "godscar.canonTier.contestedCanon",
  "faction-doctrine": "godscar.canonTier.factionDoctrine",
  "story-facing-unknown": "godscar.canonTier.storyFacingUnknown",
};

function humanize(value: string): string {
  return value.replaceAll("-", " ");
}

export function GodscarPocketPanel({ arc }: { arc: Arc }): JSX.Element | null {
  const inspection = inspectGodscarPocket(arc);
  if (inspection.status === "none") return null;
  if (inspection.status === "invalid") {
    return (
      <section className="godscar-pocket godscar-pocket--invalid" data-testid="godscar-pocket-invalid" role="alert">
        <small>{t("godscar.metadataRefused")}</small>
        <h2>{t("godscar.invalidHeading")}</h2>
        <ul>{inspection.errors.slice(0, ERROR_BUDGET).map((error, index) => <li key={index}>{error}</li>)}</ul>
        {inspection.errors.length > ERROR_BUDGET && (
          <p>{t("godscar.moreInSource", { count: inspection.errors.length - ERROR_BUDGET })}</p>
        )}
        <p>{t("godscar.invalidBody")}</p>
      </section>
    );
  }

  const source = inspection.source;
  const theme = themeForArc(arc);
  const pressureByKind = new Map(source.pressures.map((pressure) => [pressure.kind, pressure]));
  const relation = t(relationMessage[source.identity.canonRelation]);
  const tier = t(tierMessage[source.evidence.tier]);
  const receipts = source.evidence.receipts.slice(0, RECEIPT_BUDGET);
  const factionReceipts = source.factionReceipts.slice(0, FACTION_BUDGET);
  const consequences = source.consequences.slice(0, CONSEQUENCE_BUDGET);
  return (
    <section className="godscar-pocket" data-testid="godscar-pocket-panel" data-canon-tier={source.evidence.tier}>
      <header>
        <div className="godscar-pocket__header-identity">
          <CartridgeEmblem arcId={arc.meta.id} size={38} className="godscar-pocket__emblem" />
          <div>
            <small>{t("godscar.pocketEyebrow", { relation })}</small>
            <h2>{source.controlQuestion}</h2>
          </div>
        </div>
        <span>{tier}</span>
      </header>

      <div className="godscar-pocket__pressures" data-testid="godscar-six-pressures">
        {pressureOrder.map(([kind, title], index) => {
          const pressure = pressureByKind.get(kind)!;
          return (
            <article key={kind} data-pressure={kind}>
              <b>{index + 1}</b>
              <span className="godscar-pocket__asset-mark">
                <CartridgePressureMark arcId={arc.meta.id} kind={kind} />
              </span>
              <small>{t(title)}</small>
              <strong>{pressure.label}</strong>
              <p>{pressure.description}</p>
            </article>
          );
        })}
      </div>

      <div className="godscar-pocket__factions godscar-pocket__cast" data-testid="godscar-cast-responsibilities">
        {source.cast.map((member) => {
          const appearance = resolveDollAppearance(theme, member.roleId);
          const portrait = appearance.portraitSpec ?? PORTRAITS[appearance.portrait] ?? PORTRAITS.person;
          return (
            <article key={member.id} data-testid="godscar-cast-member" data-responsibility={member.responsibility}>
              <span className="godscar-pocket__cast-portrait" data-appearance={appearance.id}>
                <PixelPortraitGlyph spec={portrait} />
              </span>
              <div>
                <small>{humanize(member.responsibility)}</small>
                <strong>{member.name}</strong>
                <span>{member.roleId}</span>
                <p>{member.description}</p>
              </div>
            </article>
          );
        })}
      </div>

      <details>
        <summary>{t("godscar.evidenceLedger", { count: source.evidence.receipts.length })}</summary>
        <div className="godscar-pocket__ledger">
          <article>
            <small>{t("godscar.claim")}</small><p>{source.evidence.claim}</p>
            <small>{t("godscar.venue")}</small><p>{source.evidence.venue}</p>
            <small>{t("godscar.legitimacyAtStake")}</small><p>{source.evidence.legitimacyTarget}</p>
          </article>
          <article>
            <small>{t("godscar.ifAccepted")}</small><p>{source.evidence.upsideIfAccepted}</p>
            <small>{t("godscar.costOfAcceptance")}</small><p>{source.evidence.downsideIfAccepted}</p>
            <small>{t("godscar.ifFalse")}</small><p>{source.evidence.failureIfFalse}</p>
          </article>
          <ol>{receipts.map((receipt) => (
            <li key={receipt.id}>
              <CartridgeEvidenceMark arcId={arc.meta.id} receiptId={receipt.id} />
              <strong>{receipt.label}</strong>
              <span>{receipt.source}</span>
              <p><b>{t("godscar.intervention")}</b> {receipt.intervention}</p>
              <p><b>{t("godscar.limits")}</b> {receipt.limits}</p>
            </li>
          ))}</ol>
          {source.evidence.receipts.length > receipts.length && (
            <p className="godscar-pocket__more">{t("godscar.moreInSource", { count: source.evidence.receipts.length - receipts.length })}</p>
          )}
        </div>
      </details>

      <details>
        <summary>{t("godscar.factionReceipts", { count: source.factionReceipts.length })}</summary>
        <div className="godscar-pocket__factions">{factionReceipts.map((receipt) => (
          <article key={receipt.factionId}>
            <CartridgeFactionMark arcId={arc.meta.id} factionId={receipt.factionId} />
            <small>{receipt.variableControlled}</small>
            <strong>{receipt.factionName}</strong>
            <p><b>{t("godscar.prevents")}</b> {receipt.publicGood}</p>
            <p><b>{t("godscar.failsBy")}</b> {receipt.characteristicFailure}</p>
          </article>
        ))}
          {source.factionReceipts.length > factionReceipts.length && (
            <p className="godscar-pocket__more">{t("godscar.moreInSource", { count: source.factionReceipts.length - factionReceipts.length })}</p>
          )}
        </div>
      </details>

      <details>
        <summary>{t("godscar.persistentConsequences", { count: source.consequences.length })}</summary>
        <div className="godscar-pocket__consequences">{consequences.map((consequence) => (
          <article key={consequence.id}>
            <CartridgeConsequenceMark arcId={arc.meta.id} consequenceId={consequence.id} />
            <small>{consequence.kind}</small>
            <strong>{consequence.label}</strong>
            <p>{consequence.description}</p>
            <span>{t("godscar.inheritedBy", { name: consequence.inheritedBy })}</span>
          </article>
        ))}
          {source.consequences.length > consequences.length && (
            <p className="godscar-pocket__more">{t("godscar.moreInSource", { count: source.consequences.length - consequences.length })}</p>
          )}
        </div>
      </details>
    </section>
  );
}
