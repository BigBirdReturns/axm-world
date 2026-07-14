import type { DecisionResponse } from "../decision.js";
import { hallSteward } from "../inhabited/people.js";
import { PixelDoll } from "../pixel-ui/index.js";
import { resolveDollAppearance } from "../themes/appearance.js";
import { CartridgePortrait, CartridgeSprite } from "../themes/CartridgeMotif.js";
import { themeForArc } from "../themes/select.js";
import type { ArcWorld } from "../useArcWorld.js";
import "./opening-decision-stage.css";

export type OpeningReactionTone = "waiting" | "lifted" | "strained" | "steady";

/** Derive performance direction from proven engine deltas. No authored reaction
 * line or outcome is invented: positive morale/loyalty lifts the room, while a
 * positive stress delta strains it. A mixed or zero receipt holds steady. */
export function openingReactionTone(response?: DecisionResponse): OpeningReactionTone {
  if (!response) return "waiting";
  const score = response.effects.reduce((sum, effect) => (
    sum + (effect.type === "stress" ? -effect.delta : effect.delta)
  ), 0);
  return score > 0 ? "lifted" : score < 0 ? "strained" : "steady";
}

export function OpeningDecisionStage({ world, response }: { world: ArcWorld; response?: DecisionResponse }): JSX.Element {
  const person = hallSteward(world.cartridge);
  const theme = themeForArc(world.cartridge.arc);
  const tone = openingReactionTone(response);

  return (
    <div
      className="opening-decision-stage"
      data-testid="opening-decision-stage"
      data-phase={response ? "response" : "oath"}
      data-tone={tone}
      aria-hidden="true"
    >
      <div className="opening-decision-stage__seal" />
      <div className="opening-decision-stage__person">
        {person && (
          CartridgeSprite({ arcId: world.arc.meta.id, personId: person.id, size: 62 })
            ?? CartridgePortrait({ arcId: world.arc.meta.id, personId: person.id, size: 54 })
        )}
        {person && <span>{person.name}</span>}
      </div>
      <div className="opening-decision-stage__squad">
        {world.roster.slice(0, 8).map((member) => (
          <PixelDoll
            key={member.id}
            className="opening-decision-stage__doll"
            appearance={resolveDollAppearance(theme, member.role)}
            identity={member.id}
            state={tone === "strained" ? "strain" : tone === "lifted" ? "cleared" : "idle"}
            size={32}
          />
        ))}
      </div>
      <div className="opening-decision-stage__floor" />
    </div>
  );
}
