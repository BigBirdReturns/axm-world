// Per-player locale preference. Same persistence idiom as presentation-prefs.ts:
// a single localStorage key, try/catch guards for headless environments, and a
// pure-function fallback (here: detecting a sensible default from the browser)
// when nothing has been saved yet.

export type Locale = "en" | "zh-Hant";

const KEY = "axm-world:locale:v1";

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "en" || v === "zh-Hant";
}

/** Best-effort default locale from the browser's language preference. */
export function detectDefaultLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language;
  if (!lang) return "en";
  if (/^zh-(Hant|TW|HK|MO)/i.test(lang)) return "zh-Hant";
  return "en";
}

export function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* no localStorage (headless) — fall through to detection */
  }
  return detectDefaultLocale();
}

export function saveLocale(id: Locale): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}
