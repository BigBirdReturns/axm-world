import { useMemo, useState } from "react";
import type { Agent, Arc, Facility, InfrastructureFacility, Organization, RunReport } from "../../engine/types.js";
import { runCycle } from "../../engine/cycle.js";
import {
  FIRST_CHARTER_STARTING_RELATIONSHIPS,
  FIRST_CHARTER_STARTING_ROSTER,
} from "../../arcs/index.js";
import {
  buildPlayAssignment,
  compileArcToPlayScene,
  recommendAgentsForChallenge,
  summarizeReport,
} from "../../play-pipeline/compile.js";

interface Props {
  arc: Arc;
  onBack: () => void;
}

function defaultFacilities(): Record<InfrastructureFacility, Facility> {
  const names: InfrastructureFacility[] = [
    "Quarters", "Production", "Recreation", "Research", "Training", "Storage", "Medical",
  ];
  const out: Partial<Record<InfrastructureFacility, Facility>> = {};
  for (const n of names) {
    out[n] = { type: n, level: n === "Quarters" || n === "Recreation" ? 1 : 0, assignedAgents: [] };
  }
  return out as Record<InfrastructureFacility, Facility>;
}

function buildDemoOrg(): Organization {
  const agents: Record<string, Agent> = {};
  for (const agent of FIRST_CHARTER_STARTING_ROSTER) agents[agent.id] = { ...agent };
  return {
    id: "play-pipeline-demo",
    name: "Playable Demo Charter",
    reputation: 0,
    resources: { currency: 100, materials: 0, tokens: 2 },
    infrastructure: defaultFacilities(),
    agents,
    relationships: [...FIRST_CHARTER_STARTING_RELATIONSHIPS],
    precedents: [],
    dramaQueue: [],
    cycle: 0,
    distributionPolicy: "council",
    rngSeed: 424242,
  };
}

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function agentName(id: string, org: Organization): string {
  return org.agents[id]?.name ?? id;
}

export function ArcPlayDemo({ arc, onBack }: Props): JSX.Element {
  const [org, setOrg] = useState<Organization>(() => buildDemoOrg());
  const scene = useMemo(() => compileArcToPlayScene(arc, org), [arc, org]);
  const firstAvailable = scene.nodes.find((node) => node.status === "available") ?? scene.nodes[0];
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(firstAvailable?.challengeId ?? null);
  const [reports, setReports] = useState<RunReport[]>([]);
  const selectedChallenge = arc.challenges.find((challenge) => challenge.id === selectedChallengeId) ?? arc.challenges[0];
  const selectedNode = scene.nodes.find((node) => node.challengeId === selectedChallenge?.id);
  const selectedAgents = selectedChallenge ? recommendAgentsForChallenge(selectedChallenge, org, arc) : [];
  const selectedLocked = selectedNode?.status === "locked";
  const lastView = reports[0] ? summarizeReport(reports[0], arc) : null;

  const runSelectedChallenge = () => {
    if (!selectedChallenge || selectedLocked) return;
    const assignment = buildPlayAssignment(selectedChallenge, org, arc);
    const result = runCycle({ org, arc, assignments: [assignment] });
    setOrg(result.org);
    setReports(result.reports);
  };

  return (
    <div className="play-demo-shell">
      <header className="play-demo-header">
        <div>
          <div className="kicker">Arc → Engine → Browser Pipeline</div>
          <h1>Playable Arc Demo</h1>
          <div className="subtitle">{scene.title} · Cycle {String(scene.cycle).padStart(2, "0")}</div>
        </div>
        <button className="secondary" onClick={onBack}>Back</button>
      </header>

      <section className="pipeline-strip">
        <div><strong>1. Arc</strong><span>{arc.challenges.length} challenges loaded</span></div>
        <div><strong>2. Compile</strong><span>{scene.nodes.length} world nodes emitted</span></div>
        <div><strong>3. Assign</strong><span>{selectedAgents.length} agents selected</span></div>
        <div><strong>4. Resolve</strong><span>{reports[0] ? reports[0].outcome : "waiting for run"}</span></div>
      </section>

      <main className="play-demo-grid">
        <section className="play-map-card">
          <svg className="play-map" viewBox={`0 0 ${scene.width} ${scene.height}`} role="img" aria-label="Compiled play map">
            <defs>
              <linearGradient id="map-paper" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--paper)" />
                <stop offset="100%" stopColor="var(--paper-alt)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={scene.width} height={scene.height} rx="22" fill="url(#map-paper)" />
            {scene.nodes.map((node, idx) => {
              const next = scene.nodes[idx + 1];
              if (!next || next.tierIndex === node.tierIndex) return null;
              return <line key={`${node.id}:edge`} x1={node.x + 28} y1={node.y} x2={next.x - 28} y2={next.y} className="map-edge" />;
            })}
            {scene.nodes.map((node) => (
              <g
                key={node.id}
                className={`map-node ${node.status} ${node.challengeId === selectedChallengeId ? "selected" : ""}`}
                onClick={() => setSelectedChallengeId(node.challengeId)}
                role="button"
                tabIndex={0}
              >
                <circle cx={node.x} cy={node.y} r="32" />
                <text x={node.x} y={node.y - 4} textAnchor="middle">{node.difficulty}</text>
                <text x={node.x} y={node.y + 46} textAnchor="middle">{node.title}</text>
              </g>
            ))}
            {scene.agents.map((agent, index) => {
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

        <aside className="play-control-card">
          <div className="play-stats">
            <div><span>{scene.resources.tokenName}</span><strong>{scene.resources.tokens}</strong></div>
            <div><span>{scene.resources.currencyName}</span><strong>{scene.resources.currency}</strong></div>
            <div><span>{scene.resources.reputationName}</span><strong>{scene.resources.reputation}</strong></div>
          </div>

          {selectedChallenge && selectedNode && (
            <div className="challenge-panel">
              <div className={`status-pill ${selectedNode.status}`}>{selectedNode.status}</div>
              <h2>{selectedChallenge.name}</h2>
              <p>{selectedChallenge.description}</p>
              <div className="req-list">
                {selectedNode.requirements.map((req) => <span key={req}>{req}</span>)}
              </div>
              <h3>Auto-assigned party</h3>
              <div className="party-list">
                {selectedAgents.map((id) => (
                  <div key={id}>{agentName(id, org)}</div>
                ))}
              </div>
              <button className="primary accent" disabled={selectedLocked} onClick={runSelectedChallenge}>
                {selectedLocked ? "Locked" : "Run Contract"}
              </button>
            </div>
          )}

          {lastView && (
            <div className="report-panel">
              <div className={`status-pill ${lastView.outcome}`}>{lastView.outcome}</div>
              <h2>{lastView.challengeName}</h2>
              <p>{lastView.rewardSummary}</p>
              <div className="report-lines">
                {lastView.lines.map((line) => <div key={line}>{line}</div>)}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
