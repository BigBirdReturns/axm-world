import { useEffect } from "react";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";
import { applySensoryPreferenceToRoot, useSensoryPreferences } from "../sensory-prefs.js";
import { t } from "../i18n/index.js";

export function SensorySwitcher(): JSX.Element {
  const [prefs, setPrefs] = useSensoryPreferences();
  useEffect(() => applySensoryPreferenceToRoot(prefs), [prefs]);
  return (
    <div data-testid="sensory-switcher" role="group" aria-label={t("sensory.group")} style={{ display: "inline-flex", gap: 4 }}>
      <PixelButton type="button" variant="secondary" aria-pressed={prefs.sound} aria-label={prefs.sound ? t("sensory.soundOn") : t("sensory.soundOff")} title={prefs.sound ? t("sensory.soundOn") : t("sensory.soundOff")} onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })} style={{ minWidth: 40, minHeight: 40, padding: 5 }}>
        <PixelIcon name={prefs.sound ? "spirit" : "locked"} />
      </PixelButton>
      <PixelButton type="button" variant="secondary" aria-pressed={prefs.reducedMotion} aria-label={prefs.reducedMotion ? t("sensory.motionReduced") : t("sensory.motionFull")} title={prefs.reducedMotion ? t("sensory.motionReduced") : t("sensory.motionFull")} onClick={() => setPrefs({ ...prefs, reducedMotion: !prefs.reducedMotion })} style={{ minWidth: 40, minHeight: 40, padding: 5 }}>
        <PixelIcon name={prefs.reducedMotion ? "reliable" : "available"} />
      </PixelButton>
    </div>
  );
}
