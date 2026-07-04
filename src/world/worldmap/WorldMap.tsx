// WorldMap: the smallest visible rendering of the WorldNode projection — the
// "Planet-node" leg of Board → Planet-node → Encounter → Result → Ledger. NOT
// Planet mode: a flat 2D region map, no WebGL. Each region is a progression tier
// (Proving Grounds), each pin is a contract location (The Cellar), carrying its
// available / active / recorded / locked state. Available pins offer ENTER
// ENCOUNTER, which opens the same compiled encounter the board's PLAY ENCOUNTER
// does; after a run the pin visibly flips to RECORDED.
//
// This is a strategic OVERLAY, not the walkable world: it reads the run's derived
// state (deriveWorldMap) and hands acting-on-a-contract back to the same engine
// path every surface uses. It authors nothing. The world's name flows verbatim as
// authored content; every label routes through t() (guarded by the i18n coverage
// test). What it adds over a bare node graph is all derived from state already in
// the run: per-region progress, the arc's steepness gradient, and the one "next"
// contract — the same node the inhabited hall's steward is holding.

import type { SceneProps } from "../presentations.js";
import { deriveWorldMap, type MapNodeState, type RegionStatus } from "./derive.js";
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

const REGION_STATUS_LABEL: Record<RegionStatus, "worldMap.regionLocked" | "worldMap.regionOpen" | "worldMap.regionComplete"> = {
  locked: "worldMap.regionLocked",
  active: "worldMap.regionOpen",
  complete: "worldMap.regionComplete",
};

export function WorldMapScene({ world, interaction: ix, onEnterEncounter }: SceneProps): JSX.Element {
  const map = deriveWorldMap(world.nodes, world.cartridge.arc, ix.selectedId);
  const arcId = world.arc.meta.id;
  // Authored cartridge content — the world's own name — flows verbatim; it frames
  // the map as this cartridge's world rather than a generic node graph.
  const worldName = world.cartridge.manifest.name;
  const pct = map.total > 0 ? Math.round((map.recorded / map.total) * 100) : 0;

  return (
    <div className="wm-surface" data-testid="world-map">
      <header className="wm-header">
        <div className="wm-header-titles">
          <span className="wm-eyebrow">{t("worldMap.contractMap")}</span>
          <span className="wm-world-name" data-testid="wm-world-name">{worldName}</span>
        </div>
        <div className="wm-progress" data-testid="wm-progress" data-recorded={map.recorded} data-total={map.total}>
          <span className="wm-progress-count">{t("worldMap.recordedOf", { recorded: map.recorded, total: map.total })}</span>
          <span className="wm-progress-track" aria-hidden="true">
            <span className="wm-progress-fill" style={{ width: `${pct}%` }} />
          </span>
        </div>
      </header>

      <div className="wm-scroll">
        {map.regions.map((region) => (
          <section
            key={region.tierIndex}
            className={`wm-region wm-region--${region.status}`}
            data-testid={`wm-region-${region.tierIndex}`}
            data-status={region.status}
          >
            <header className="wm-region-head">
              <span className="wm-region-name">{region.name}</span>
              <span
                className={`wm-region-status wm-region-status--${region.status}`}
                data-testid={`wm-region-status-${region.tierIndex}`}
              >
                {t(REGION_STATUS_LABEL[region.status])}
              </span>
              <span className="wm-region-count" data-testid={`wm-region-progress-${region.tierIndex}`}>
                {t("worldMap.recordedOf", { recorded: region.recorded, total: region.total })}
              </span>
            </header>
            <div className="wm-locations">
              {region.locations.map((loc) => (
                <div
                  key={loc.challengeId}
                  className={`wm-pin wm-pin--${loc.state}${loc.next ? " wm-pin--next" : ""}`}
                  data-testid={`wm-pin-${loc.challengeId}`}
                  data-state={loc.state}
                  data-next={loc.next ? "true" : undefined}
                  onClick={() => ix.select(ix.selectedId === loc.challengeId ? null : loc.challengeId)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="wm-pin-motif" aria-hidden="true">
                    {CartridgeMotif({ arcId, challengeId: loc.challengeId, size: 26 }) ?? <PixelIcon name="available" />}
                  </div>
                  <div className="wm-pin-body">
                    <div className="wm-pin-title-row">
                      <span className="wm-pin-title">{loc.title}</span>
                      {loc.next && (
                        <span className="wm-next-tag" data-testid={`wm-next-${loc.challengeId}`}>
                          <span aria-hidden="true">▸</span> {t("worldMap.nextContract")}
                        </span>
                      )}
                    </div>
                    <div className="wm-pin-meta">
                      <span className={`wm-state wm-state--${loc.state}`}>{t(STATE_LABEL[loc.state])}</span>
                      <span className="wm-diff">{t("worldMap.difficulty")} {loc.difficulty}</span>
                      {loc.steep && loc.state !== "recorded" && (
                        <span
                          className="wm-steep"
                          data-testid={`wm-pin-steep-${loc.challengeId}`}
                          aria-label={t("worldMap.steepContract")}
                        >
                          <span aria-hidden="true">⚠</span> {t("worldMap.steep")}
                        </span>
                      )}
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
                  {loc.state === "recorded" && <span className="wm-recorded-mark" data-testid={`wm-recorded-${loc.challengeId}`} aria-hidden="true">✓</span>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
