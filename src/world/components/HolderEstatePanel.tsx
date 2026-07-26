import { useRef, useState, type CSSProperties } from "react";
import {
  buildHolderEstate,
  downloadHolderEstate,
  HOLDER_ESTATE_MAX_BYTES,
  importHolderEstate,
  parseHolderEstate,
  preflightHolderEstate,
  type HolderEstateMode,
  type HolderEstatePreflight,
  type HolderEstateV1,
} from "../holder-estate.js";
import { t } from "../i18n/index.js";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

interface PendingEstate {
  estate: HolderEstateV1;
  merge: HolderEstatePreflight;
  replace: HolderEstatePreflight;
}

interface VisiblePreflight {
  mode: HolderEstateMode;
  label: string;
  result: HolderEstatePreflight;
  variant: "primary" | "secondary";
}

export function HolderEstatePanel(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingEstate | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const exportEstate = () => {
    try {
      const estate = buildHolderEstate(localStorage);
      downloadHolderEstate(estate);
      setStatus(t("boot.holderEstateExported", { count: estate.summary.records }));
      setErrors([]);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
      setStatus(null);
    }
  };

  const readEstate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > HOLDER_ESTATE_MAX_BYTES) {
        throw new Error(`Holder estate exceeds ${HOLDER_ESTATE_MAX_BYTES} bytes.`);
      }
      const estate = parseHolderEstate(await file.text());
      setPending({
        estate,
        merge: preflightHolderEstate(localStorage, estate, "merge"),
        replace: preflightHolderEstate(localStorage, estate, "replace"),
      });
      setStatus(null);
      setErrors([]);
    } catch (error) {
      setPending(null);
      setStatus(null);
      setErrors([error instanceof Error ? error.message : String(error)]);
    }
  };

  const apply = (mode: HolderEstateMode) => {
    if (!pending) return;
    const result = importHolderEstate(localStorage, pending.estate, { mode });
    if (!result.ok) {
      setErrors([...result.errors, ...result.rollbackErrors]);
      setStatus(null);
      return;
    }
    setErrors([]);
    setStatus(t("boot.holderEstateRestored", { count: result.estate.summary.records }));
    setPending(null);
    // Locale, sensory cache, shelf, checkpoint, and every save summary must all
    // re-derive from the one committed estate. Reload is the clean transition;
    // the transaction has already succeeded before this point.
    window.setTimeout(() => window.location.reload(), 120);
  };

  const visiblePreflights: VisiblePreflight[] = pending
    ? [
      {
        mode: "merge",
        label: t("boot.holderEstateMerge"),
        result: pending.merge,
        variant: "secondary",
      },
      {
        mode: "replace",
        label: t("boot.holderEstateReplace"),
        result: pending.replace,
        variant: "primary",
      },
    ]
    : [];
  const opaqueKeys = pending?.estate.records
    .filter((record) => record.kind === "opaque-world")
    .map((record) => record.key) ?? [];

  return (
    <section
      data-testid="holder-estate-panel"
      aria-label={t("boot.holderEstateHeading")}
      style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(165,156,139,0.35)" }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <PixelButton
          type="button"
          variant="ghost"
          data-testid="export-holder-estate"
          onClick={exportEstate}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 44 }}
        >
          <PixelIcon name="recorded" /> <span>{t("boot.exportHolderEstate")}</span>
        </PixelButton>
        <PixelButton
          type="button"
          variant="ghost"
          data-testid="restore-holder-estate"
          onClick={() => inputRef.current?.click()}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 44 }}
        >
          <PixelIcon name="available" /> <span>{t("boot.restoreHolderEstate")}</span>
        </PixelButton>
        <label htmlFor="holder-estate-input" style={visuallyHidden}>{t("boot.restoreHolderEstate")}</label>
        <input
          ref={inputRef}
          id="holder-estate-input"
          data-testid="holder-estate-input"
          type="file"
          accept="application/json,.json,.rodoh-estate.json"
          style={visuallyHidden}
          onChange={readEstate}
        />
      </div>

      {pending && (
        <div
          data-testid="holder-estate-preflight"
          role="group"
          aria-label={t("boot.holderEstatePreflight")}
          style={{ marginTop: 10, padding: 10, border: "1px solid #4a4238", background: "rgba(23,21,15,0.82)", font: "11px/1.55 'IBM Plex Mono', ui-monospace, monospace" }}
        >
          <strong style={{ color: "#c9a14a" }}>{t("boot.holderEstatePreflight")}</strong>
          {opaqueKeys.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary>{t("boot.holderEstateOpaque", { count: opaqueKeys.length })}</summary>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {opaqueKeys.map((key) => <li key={key}><code>{key}</code></li>)}
              </ul>
            </details>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8, marginTop: 9 }}>
            {visiblePreflights.map(({ mode, label, result, variant }) => (
              <div
                key={mode}
                role="group"
                aria-label={label}
                data-testid={`holder-estate-${mode}-preflight`}
                data-add={result.add.length}
                data-change={result.change.length}
                data-unchanged={result.unchanged.length}
                data-remove={result.remove.length}
                style={{ padding: 9, border: "1px solid rgba(165,156,139,0.42)", background: "rgba(8,8,7,0.36)" }}
              >
                <strong style={{ color: "#eee4d1" }}>{label}</strong>
                <div style={{ marginTop: 4, color: "#c9bfae" }}>
                  {t("boot.holderEstateSummary", {
                    count: result.incomingRecords,
                    add: result.add.length,
                    change: result.change.length,
                    remove: result.remove.length,
                    opaque: pending.estate.summary.opaqueRecords,
                  })}
                </div>
                <PixelButton
                  type="button"
                  variant={variant}
                  data-testid={`holder-estate-${mode}`}
                  onClick={() => apply(mode)}
                  style={{ marginTop: 8 }}
                >
                  {label}
                </PixelButton>
              </div>
            ))}
          </div>
          <PixelButton
            type="button"
            variant="ghost"
            data-testid="holder-estate-cancel"
            onClick={() => setPending(null)}
            style={{ marginTop: 8 }}
          >
            {t("boot.holderEstateCancel")}
          </PixelButton>
        </div>
      )}

      {status && <div data-testid="holder-estate-status" role="status" style={{ marginTop: 8, color: "#9fe0d6", font: "11px 'IBM Plex Mono', monospace" }}>{status}</div>}
      {errors.length > 0 && (
        <div data-testid="holder-estate-errors" role="alert" style={{ marginTop: 8, color: "#e6a5a2", font: "11px/1.5 'IBM Plex Mono', monospace" }}>
          <strong>{t("boot.holderEstateFailed")}</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
