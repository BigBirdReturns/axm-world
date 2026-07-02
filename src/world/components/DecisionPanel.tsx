// Surfaces an authored/pending decision (the cartridge's opening oath, or any drama
// card the engine generated). This is a true modal: rendered through a document-level
// portal so representation labels/canvas Html can never render above the decision.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { DramaCard, DramaCardEffect } from "../../engine/types.js";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";
import { t } from "../i18n/index.js";

interface Props {
  card: DramaCard;
  onResolve: (optionId: string) => void;
  targetName?: (targetId: string) => string;
}

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(11,10,8,0.78)",
  backdropFilter: "blur(2px)",
  pointerEvents: "auto",
  zIndex: 9000,
};

const panelStyle: CSSProperties = {
  position: "fixed",
  zIndex: 9001,
  top: "max(18px, env(safe-area-inset-top))",
  left: "max(14px, env(safe-area-inset-left))",
  right: "max(14px, env(safe-area-inset-right))",
  maxWidth: 760,
  margin: "0 auto",
  maxHeight: "calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
  overflow: "auto",
  background: "rgba(23,21,15,0.98)",
  color: "#ece4d4",
  border: "1px solid #5e5850",
  borderRadius: 12,
  padding: "22px 24px",
  boxShadow: "0 28px 90px rgba(0,0,0,0.7)",
  pointerEvents: "auto",
};

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
  const [chosen, setChosen] = useState<{ id: string; label: string; description: string } | null>(null);
  const isOpening = drama.id.startsWith("opening:");
  const titleRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [drama.id, chosen?.id]);

  return createPortal(
    <>
      <div style={backdropStyle} data-testid="decision-backdrop" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        data-testid="pending-decision-card"
        style={panelStyle}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a14a" }}>
          <RodohRuntimeMark variant="micro" showText={false} />
          {chosen ? t("decision.worldResponds") : isOpening ? t("decision.foundingHall") : t("decision.aDecision")}
        </div>

        {!chosen ? (
          <>
            {isOpening && (
              <div style={{ margin: "10px 0 12px", padding: "10px 12px", border: "1px solid #4a4238", borderRadius: 8, background: "rgba(201,161,74,0.07)", color: "#d8cfbd", font: "12px/1.45 'IBM Plex Mono', monospace" }}>
                {t("decision.openingBlurb")}
              </div>
            )}
            <p
              id="decision-title"
              ref={titleRef}
              tabIndex={-1}
              style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, lineHeight: 1.45, margin: "10px 0 18px", outline: "none" }}
            >
              {drama.narrativeText}
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {drama.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setChosen({ id: o.id, label: o.label, description: o.description })}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    minHeight: 56,
                    borderRadius: 7,
                    border: "1px solid #5e5850",
                    background: "rgba(201,161,74,0.07)",
                    color: "#ece4d4",
                    cursor: "pointer",
                    font: "700 15px 'Barlow Condensed', sans-serif",
                    letterSpacing: "0.01em",
                  }}
                >
                  <div>{o.label}</div>
                  <div style={{ marginTop: 4, font: "11px/1.35 'IBM Plex Mono', monospace", color: "#a59c8b" }}>{o.description}</div>
                  <div style={{ marginTop: 4, font: "10px/1.35 'IBM Plex Mono', monospace", color: "#c9a14a" }}><strong style={{ color: "#d8cfbd" }}>{t("decision.effect")}</strong> {optionPreview(o, targetName)}{isOpening ? t("decision.markDoctrine") : ""}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, margin: "8px 0 6px" }}>
              {chosen.label}
            </h2>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 16, lineHeight: 1.5, color: "#d8cfbd", margin: "0 0 18px" }}>
              {chosen.description}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => onResolve(chosen.id)}
                style={{
                  font: "700 15px 'Barlow Condensed', sans-serif",
                  letterSpacing: "0.02em",
                  padding: "9px 22px",
                  borderRadius: 5,
                  border: "none",
                  background: "#b01c18",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {t("decision.continue")}
              </button>
            </div>
          </>
        )}
      </section>
    </>,
    document.body,
  );
}
