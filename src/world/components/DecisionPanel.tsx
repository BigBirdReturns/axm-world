// Surfaces an authored/pending decision (the cartridge's opening oath, or any drama
// card the engine generated). This is a true modal: rendered through a document-level
// portal so representation labels/canvas Html can never render above the decision.

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DramaCard, DramaCardEffect } from "../../engine/types.js";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";
import { PixelButton, PixelPanel } from "../pixel-ui/index.js";
import { t } from "../i18n/index.js";
import { useDialogFocus } from "./use-dialog-focus.js";
import "./decision-panel.css";

interface Props {
  card: DramaCard;
  onResolve: (optionId: string) => void;
  targetName?: (targetId: string) => string;
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

export function DecisionPanel({ card: drama, onResolve, targetName = (id) => id }: Props): JSX.Element {
  const [chosen, setChosen] = useState<{ id: string; label: string; description: string; effectPreview: string; marksDoctrine: boolean } | null>(null);
  const isOpening = drama.id.startsWith("opening:");
  const panelRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLParagraphElement | null>(null);
  useDialogFocus(panelRef, titleRef, `${drama.id}:${chosen?.id ?? "choice"}`);

  return createPortal(
    <>
      <div className="decision-backdrop" data-testid="decision-backdrop" />
      <PixelPanel
        ref={panelRef}
        tone="light"
        className="decision-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        data-testid="pending-decision-card"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="decision-panel__eyebrow">
          <RodohRuntimeMark variant="micro" showText={false} />
          {chosen ? t("decision.worldResponds") : isOpening ? t("decision.foundingHall") : t("decision.aDecision")}
        </div>

        {!chosen ? (
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
                  onClick={() => setChosen({
                    id: o.id,
                    label: o.label,
                    description: o.description,
                    effectPreview: optionPreview(o, targetName),
                    marksDoctrine: isOpening,
                  })}
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
            <h2 className="decision-panel__result-title">
              {chosen.label}
            </h2>
            <p className="decision-panel__result-description">
              {chosen.description}
            </p>
            <div className="decision-panel__result-effect">
              <strong>{t("decision.effect")}</strong> {chosen.effectPreview}{chosen.marksDoctrine ? t("decision.markDoctrine") : ""}
            </div>
            <div className="decision-panel__continue-row">
              <PixelButton
                type="button"
                onClick={() => onResolve(chosen.id)}
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
