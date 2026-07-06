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
import { MAP_LEGEND, MARKER_GLYPH } from "./legend.js";
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

export function WorldMapScene({ world, interaction: ix, onEnterEncounter, onNavigate }: SceneProps): JSX.Element {
  const map = deriveWorldMap(world.nodes, world.cartridge.arc, ix.selectedId);
  const arcId = world.arc.meta.id;
  // Authored cartridge content — the world's own name — flows verbatim; it frames
  // the map as this cartridge's world rather than a generic node graph.
  const worldName = world.cartridge.manifest.name;
  const pct = map.total > 0 ? Math.round((map.recorded / map.total) * 100) : 0;
  // World-state roll-up: how many contracts sit in each state, counted from the SAME
  // derived pins the map renders (the one "next" counts as its own bucket). Numbers
  // over the legend's vocabulary — a summary of what is already on screen, no new state.
  const pins = map.regions.flatMap((r) => r.locations);
  const counts = {
    next: pins.filter((p) => p.next).length,
    available: pins.filter((p) => p.state === "available" && !p.next).length,
    locked: pins.filter((p) => p.state === "locked").length,
    recorded: pins.filter((p) => p.state === "recorded").length,
  };

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
          {/* State roll-up in the legend's own vocabulary — counts of what the pins
              below already show, so the world reads at a glance. */}
          <span data-testid="wm-state-summary" style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", fontSize: 10, color: "#8b8172" }}>
            {counts.next > 0 && <span data-testid="wm-count-next" data-count={counts.next}>{counts.next} {t("worldMap.nextContract")}</span>}
            {counts.available > 0 && <span data-testid="wm-count-available" data-count={counts.available}>{counts.available} {t("worldMap.stateAvailable")}</span>}
            {counts.locked > 0 && <span data-testid="wm-count-locked" data-count={counts.locked}>{counts.locked} {t("worldMap.stateLocked")}</span>}
            {counts.recorded > 0 && <span data-testid="wm-count-recorded" data-count={counts.recorded}>{counts.recorded} {t("worldMap.stateRecorded")}</span>}
          </span>
        </div>
      </header>

      {/* State key: a compact, always-visible glossary so every pin marker reads
          without leaving the map. Static chrome over the run's own vocabulary — it
          explains the states #57/#58 already derive; it adds no mechanic. */}
      <div className="wm-legend" data-testid="wm-legend">
        <span className="wm-legend-title">{t("worldMap.legendTitle")}</span>
        <ul className="wm-legend-items">
          {MAP_LEGEND.map((entry) => (
            <li
              key={entry.marker}
              className="wm-legend-item"
              data-marker={entry.marker}
              data-testid={`wm-legend-${entry.marker}`}
            >
              <span className={`wm-legend-swatch wm-legend-swatch--${entry.marker}`} aria-hidden="true">
                {MARKER_GLYPH[entry.marker]}
              </span>
              <span className="wm-legend-term">{t(entry.term)}</span>
              <span className="wm-legend-gloss">{t(entry.gloss)}</span>
            </li>
          ))}
        </ul>
      </div>

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
                  {/* The map's ONE next contract is the same one the steward holds
                      (shared derivation) — so the pin routes to the hall, where it
                      can be taken in person. One place, one route into play. */}
                  {loc.next && onNavigate && (
                    <button
                      type="button"
                      className="wm-enter"
                      data-testid={`wm-go-hall-${loc.challengeId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("hall");
                      }}
                    >
                      {t("worldMap.talkToSteward")}
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
