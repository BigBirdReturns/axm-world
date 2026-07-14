// Surfaces an authored/pending decision (the cartridge's opening oath, or any drama
// card the engine generated). This is a true modal: rendered through a document-level
// portal so representation labels/canvas Html can never render above the decision.

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DramaCard, DramaCardEffect } from "../../engine/types.js";
import { groupDecisionEffects, type DecisionResponse } from "../decision.js";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";
import { PixelButton, PixelPanel } from "../pixel-ui/index.js";
import { t } from "../i18n/index.js";
import "./decision-panel.css";

interface Props {
  card?: DramaCard;
  response?: DecisionResponse;
  onResolve?: (optionId: string) => void;
  onContinue?: () => void;
  targetName?: (targetId: string) => string;
  stage?: ReactNode;
}

function effectLabel(effect: DramaCardEffect, targetName: (targetId: string) => string): string {
  const sign = effect.value > 0 ? "+" : "";
  return `${targetName(effect.target)}: ${effect.type} ${sign}${effect.value}`;
}

function optionPreview(option: DramaCard["options"][number], targetName: (targetId: string) => string): string {
  if (option.effects.length > 0) return option.effects.slice(0, 3).map((effect) => effectLabel(effect, targetName)).join(" · ");
  if (option.hiddenEffects.length > 0) return t("decision.hiddenConsequence");
  return t("decision.noVisibleEffect");
}

function appliedEffectLabel(effect: DecisionResponse["effects"][number], targetName: (targetId: string) => string): string {
  const sign = effect.delta > 0 ? "+" : "";
  return `${targetName(effect.target)}: ${effect.type} ${effect.before} → ${effect.after} (${sign}${effect.delta})`;
}

function deltaLabel(min: number, max: number): string {
  const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;
  return min === max ? signed(min) : `${signed(min)}–${signed(max)}`;
}

export function DecisionPanel({ card: drama, response, onResolve, onContinue, targetName = (id) => id, stage }: Props): JSX.Element {
  if (!drama && !response) throw new Error("DecisionPanel requires a pending card or a resolved response");
  const decisionId = response?.cardId ?? drama!.id;
  const isOpening = decisionId.startsWith("opening:");
  const titleRef = useRef<HTMLHeadingElement | HTMLParagraphElement | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [decisionId, response?.optionId]);

  return createPortal(
    <>
      <div className="decision-backdrop" data-testid="decision-backdrop" />
      <PixelPanel
        tone="light"
        className="decision-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        data-testid="pending-decision-card"
        data-phase={response ? "resolved" : "pending"}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="decision-panel__eyebrow">
          <RodohRuntimeMark variant="micro" showText={false} />
          {response ? t("decision.worldResponds") : isOpening ? t("decision.foundingHall") : t("decision.aDecision")}
        </div>

        {stage}

        {!response && drama ? (
          <>
            {isOpening && (
              <div className="decision-panel__opening-blurb">
                {t("decision.openingBlurb")}
              </div>
            )}
            <p
              id="decision-title"
              ref={titleRef}
              tabIndex={-1}
              className="decision-panel__narrative"
            >
              {drama.narrativeText}
            </p>
            <div className="decision-panel__options">
              {drama.options.map((o) => (
                <PixelButton
                  key={o.id}
                  type="button"
                  onClick={() => onResolve?.(o.id)}
                  variant="action"
                  className="decision-panel__option"
                >
                  <div>{o.label}</div>
                  <div className="decision-panel__option-description">{o.description}</div>
                  <div className="decision-panel__option-effect"><strong>{t("decision.effect")}</strong> {optionPreview(o, targetName)}{isOpening ? t("decision.markDoctrine") : ""}</div>
                </PixelButton>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2
              id="decision-title"
              ref={(node) => { titleRef.current = node; }}
              tabIndex={-1}
              className="decision-panel__result-title"
            >
              {response!.label}
            </h2>
            <p className="decision-panel__result-description">
              {response!.description}
            </p>
            <div className="decision-panel__applied-effects" data-testid="decision-applied-effects">
              {response!.effects.length > 0 ? (
                <>
                  <div className="decision-panel__effect-groups" data-testid="decision-effect-groups">
                    {groupDecisionEffects(response!.effects).map((group) => (
                      <div key={group.type}>
                        {t("decision.groupChange", {
                          type: group.type,
                          count: group.count,
                          delta: deltaLabel(group.minDelta, group.maxDelta),
                        })}
                      </div>
                    ))}
                  </div>
                  <details className="decision-panel__exact-effects">
                    <summary>{t("decision.exactChanges", { count: response!.effects.length })}</summary>
                    <div>
                      {response!.effects.map((effect, index) => (
                        <div key={`${effect.target}:${effect.type}:${index}`}>{appliedEffectLabel(effect, targetName)}</div>
                      ))}
                    </div>
                  </details>
                </>
              ) : t("decision.noVisibleEffect")}
            </div>
            <div className="decision-panel__continue-row">
              <PixelButton
                type="button"
                onClick={onContinue}
                variant="danger"
                className="decision-panel__continue"
              >
                {t("decision.continue")}
              </PixelButton>
            </div>
          </>
        )}
      </PixelPanel>
    </>,
    document.body,
  );
}
