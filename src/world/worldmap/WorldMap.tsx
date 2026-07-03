// WorldMap: the smallest visible rendering of the WorldNode projection — the
// "Planet-node" leg of Board → Planet-node → Encounter → Result → Ledger. NOT
// Planet mode: a flat 2D region map, no WebGL. Each region is a progression tier
// (Proving Grounds), each pin is a contract location (The Cellar), carrying its
// available / active / recorded / locked state. Available pins offer ENTER
// ENCOUNTER, which opens the same compiled encounter the board's PLAY ENCOUNTER
// does; after a run the pin visibly flips to RECORDED.

import type { SceneProps } from "../presentations.js";
import { groupNodesByRegion, type MapNodeState } from "./derive.js";
import { CartridgeMotif } from "../themes/CartridgeMotif.js";
import { PixelIcon } from "../pixel-ui/index.js";
import { t } from "../i18n/index.js";
import "./worldmap.css";

const STATE_LABEL: Record<MapNodeState, "worldMap.stateLocked" | "worldMap.stateAvailable" | "worldMap.stateActive" | "worldMap.stateRecorded"> = {
  locked: "worldMap.stateLocked",
  available: "worldMap.stateAvailable",
  active: "worldMap.stateActive",
  recorded: "worldMap.stateRecorded",
};

export function WorldMapScene({ world, interaction: ix, onEnterEncounter }: SceneProps): JSX.Element {
  const regions = groupNodesByRegion(world.nodes, world.cartridge.arc, ix.selectedId);
  const arcId = world.arc.meta.id;

  return (
    <div className="wm-surface" data-testid="world-map">
      <div className="wm-scroll">
        {regions.map((region) => (
          <section key={region.tierIndex} className="wm-region" data-testid={`wm-region-${region.tierIndex}`}>
            <header className="wm-region-head">
              <span className="wm-region-name">{region.name}</span>
              <span className="wm-region-count">{region.locations.length}</span>
            </header>
            <div className="wm-locations">
              {region.locations.map((loc) => (
                <div
                  key={loc.challengeId}
                  className={`wm-pin wm-pin--${loc.state}`}
                  data-testid={`wm-pin-${loc.challengeId}`}
                  data-state={loc.state}
                  onClick={() => ix.select(ix.selectedId === loc.challengeId ? null : loc.challengeId)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="wm-pin-motif" aria-hidden="true">
                    {CartridgeMotif({ arcId, challengeId: loc.challengeId, size: 26 }) ?? <PixelIcon name="available" />}
                  </div>
                  <div className="wm-pin-body">
                    <div className="wm-pin-title">{loc.title}</div>
                    <div className="wm-pin-meta">
                      <span className={`wm-state wm-state--${loc.state}`}>{t(STATE_LABEL[loc.state])}</span>
                      <span className="wm-diff">{t("worldMap.difficulty")} {loc.difficulty}</span>
                    </div>
                  </div>
                  {loc.state !== "locked" && loc.state !== "recorded" && (
                    <button
                      type="button"
                      className="wm-enter"
                      data-testid={`wm-enter-${loc.challengeId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEnterEncounter?.(loc.challengeId);
                      }}
                    >
                      {t("worldMap.enterEncounter")}
                    </button>
                  )}
                  {loc.state === "recorded" && <span className="wm-recorded-mark" data-testid={`wm-recorded-${loc.challengeId}`}>✓</span>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
