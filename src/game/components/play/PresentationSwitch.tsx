import type { PlayPresentation } from "./PlaySceneBoard.js";

interface Props {
  presentation: PlayPresentation;
  onPresentationChange: (presentation: PlayPresentation) => void;
  onBack: () => void;
}

export function PresentationSwitch({ presentation, onPresentationChange, onBack }: Props): JSX.Element {
  return (
    <div className="presentation-switch" role="group" aria-label="Presentation costume">
      <button className={presentation === "table" ? "primary accent" : "secondary"} onClick={() => onPresentationChange("table")}>2.5D Table</button>
      <button className={presentation === "map" ? "primary accent" : "secondary"} onClick={() => onPresentationChange("map")}>2D Map</button>
      <button className="secondary" onClick={onBack}>Back</button>
    </div>
  );
}
