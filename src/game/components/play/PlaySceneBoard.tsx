import type { PlayScene, PlayNode } from "../../../play-pipeline/compile.js";

export type PlayPresentation = "table" | "map";

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

interface Props {
  scene: PlayScene;
  presentation: PlayPresentation;
  selectedChallengeId: string | null;
  selectedNode?: PlayNode;
  selectedAgents: string[];
  onSelectChallenge: (challengeId: string) => void;
}

export function PlaySceneBoard({ scene, presentation, selectedChallengeId, selectedNode, selectedAgents, onSelectChallenge }: Props): JSX.Element {
  const isTable = presentation === "table";
  return (
    <section className={`play-map-card ${isTable ? "charter-board-card" : ""}`}>
      <svg className={`play-map ${isTable ? "charter-board-map" : ""}`} viewBox={`0 0 ${scene.width} ${scene.height}`} role="img" aria-label="Compiled play map">
        <defs>
          <linearGradient id="map-paper" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--paper)" />
            <stop offset="100%" stopColor="var(--paper-alt)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={scene.width} height={scene.height} rx="22" fill="url(#map-paper)" />
        {isTable && (
          <>
            <ellipse cx="480" cy="504" rx="390" ry="34" className="board-shadow" />
            <path d="M72 422 C220 326 364 386 480 286 C618 168 735 238 884 134 L884 482 L72 482 Z" className="board-terrain" />
            <path d="M82 452 C268 402 368 430 518 344 C676 254 766 280 876 220" className="board-river" />
          </>
        )}
        {scene.nodes.map((node, idx) => {
          const next = scene.nodes[idx + 1];
          if (!next || next.tierIndex === node.tierIndex) return null;
          return <line key={`${node.id}:edge`} x1={node.x + 28} y1={node.y} x2={next.x - 28} y2={next.y} className="map-edge" />;
        })}
        {scene.nodes.map((node) => (
          <g
            key={node.id}
            className={`map-node ${node.status} ${node.challengeId === selectedChallengeId ? "selected" : ""}`}
            onClick={() => onSelectChallenge(node.challengeId)}
            role="button"
            tabIndex={0}
          >
            <circle cx={node.x} cy={node.y} r="32" />
            <text x={node.x} y={node.y - 4} textAnchor="middle">{node.difficulty}</text>
            <text x={node.x} y={node.y + 46} textAnchor="middle">{node.title}</text>
          </g>
        ))}
        {scene.agents.map((agent) => {
          const selectedIndex = selectedAgents.indexOf(agent.id);
          const targetX = selectedNode && selectedIndex >= 0 ? selectedNode.x - 54 + selectedIndex * 22 : agent.x;
          const targetY = selectedNode && selectedIndex >= 0 ? selectedNode.y + 58 : agent.y;
          return (
            <g key={agent.id} className={`agent-token ${selectedIndex >= 0 ? "selected" : ""}`}>
              <circle cx={targetX} cy={targetY} r="16" />
              <text x={targetX} y={targetY + 4} textAnchor="middle">{initials(agent.name)}</text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
