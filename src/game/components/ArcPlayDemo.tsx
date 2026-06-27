import { useState } from "react";
import type { Arc } from "../../engine/types.js";
import { usePlayableArc } from "../lib/playable-arc.js";
import { PlaySceneBoard, type PlayPresentation } from "./play/PlaySceneBoard.js";
import { PartyManagementPanel } from "./play/PartyManagementPanel.js";
import { PresentationSwitch } from "./play/PresentationSwitch.js";

interface Props {
  arc: Arc;
  onBack: () => void;
  initialPresentation?: PlayPresentation;
}

export function ArcPlayDemo({ arc, onBack, initialPresentation = "table" }: Props): JSX.Element {
  const [presentation, setPresentation] = useState<PlayPresentation>(initialPresentation);
  const playable = usePlayableArc(arc);

  return (
    <div className="play-demo-shell">
      <header className="play-demo-header">
        <div>
          <div className="kicker">Presentation Costume → Shared Engine Seam</div>
          <h1>Charter Table</h1>
          <div className="subtitle">
            {playable.scene.title} · Cycle {String(playable.scene.cycle).padStart(2, "0")} · {presentation === "table" ? "2.5D charter table" : "2D map"}
          </div>
        </div>
        <PresentationSwitch presentation={presentation} onPresentationChange={setPresentation} onBack={onBack} />
      </header>

      <section className="pipeline-strip">
        <div><strong>1. Arc</strong><span>{arc.challenges.length} challenges loaded</span></div>
        <div><strong>2. Costume</strong><span>{presentation === "table" ? "3D-rendered board, 2D-played" : `${playable.scene.nodes.length} map nodes emitted`}</span></div>
        <div><strong>3. Assign</strong><span>{playable.selectedAgents.length}/{playable.maxAgents} agents selected</span></div>
        <div><strong>4. Resolve</strong><span>{playable.reports[0] ? playable.reports[0].outcome : "waiting for run"}</span></div>
      </section>

      <main className="play-demo-grid">
        <PlaySceneBoard
          scene={playable.scene}
          presentation={presentation}
          selectedChallengeId={playable.selectedChallengeId}
          selectedNode={playable.selectedNode}
          selectedAgents={playable.selectedAgents}
          onSelectChallenge={playable.setSelectedChallengeId}
        />

        <PartyManagementPanel
          arc={arc}
          org={playable.org}
          scene={playable.scene}
          selectedChallenge={playable.selectedChallenge}
          selectedNode={playable.selectedNode}
          selectedAgents={playable.selectedAgents}
          minAgents={playable.minAgents}
          maxAgents={playable.maxAgents}
          canRun={playable.canRun}
          selectedLocked={playable.selectedLocked}
          lastView={playable.lastView}
          onToggleAgent={playable.toggleAgent}
          onApplyDowntime={playable.applyDowntime}
          onRun={playable.runSelectedChallenge}
        />
      </main>
    </div>
  );
}
