// A compact EN / zh-Hant toggle. Extracted from shell/regions.tsx so the BOOT
// surface can mount it without pulling the whole shell-regions module into the
// cartridge-select bundle — the boot screen must stay instant. The shell keeps
// importing it via regions' re-export, so call sites are unchanged.

import { t, useLocale, type Locale } from "../i18n/index.js";
import "../pixel-ui/pixel-ui.css";

export function LocaleSwitcher(): JSX.Element {
  const [locale, setLocale] = useLocale();
  const options: Array<{ id: Locale; labelId: "locale.enLabel" | "locale.zhHantLabel" }> = [
    { id: "en", labelId: "locale.enLabel" },
    { id: "zh-Hant", labelId: "locale.zhHantLabel" },
  ];
  return (
    <div data-testid="locale-switcher" style={{ display: "flex", gap: 4, padding: 4, background: "rgba(23,21,15,0.82)", border: "1px solid #4a4238", pointerEvents: "auto" }}>
      {options.map((opt) => {
        const on = opt.id === locale;
        return (
          <button
            key={opt.id}
            onClick={() => setLocale(opt.id)}
            data-testid={`locale-option-${opt.id}`}
            aria-pressed={on}
            style={{ cursor: "pointer", padding: "5px 11px", border: "none", background: on ? "var(--gold)" : "transparent", color: on ? "var(--ink)" : "#a59c8b", fontFamily: "var(--px-font)", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            {t(opt.labelId)}
          </button>
        );
      })}
    </div>
  );
}
