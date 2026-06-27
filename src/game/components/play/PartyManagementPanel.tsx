import type { Arc, Challenge, Organization } from "../../../engine/types.js";
import type { PlayNode, PlayReportView, PlayScene } from "../../../play-pipeline/compile.js";
import { DOWNTIME_ACTIONS, type DowntimeAction } from "../../lib/agent-management.js";

function agentName(id: string, org: Organization): string {
  return org.agents[id]?.name ?? id;
}

interface Props {
  arc: Arc;
  org: Organization;
  scene: PlayScene;
  selectedChallenge?: Challenge;
  selectedNode?: PlayNode;
  selectedAgents: string[];
  minAgents: number;
  maxAgents: number;
  canRun: boolean;
  selectedLocked: boolean;
  lastView: PlayReportView | null;
  onToggleAgent: (id: string) => void;
  onApplyDowntime: (agentId: string, action: DowntimeAction) => void;
  onRun: () => void;
}

export function PartyManagementPanel({
  arc: _arc,
  org,
  scene,
  selectedChallenge,
  selectedNode,
  selectedAgents,
  minAgents,
  maxAgents,
  canRun,
  selectedLocked,
  lastView,
  onToggleAgent,
  onApplyDowntime,
  onRun,
}: Props): JSX.Element {
  return (
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
          <h3>Assigned party</h3>
          <div className="party-list selectable-party">
            {scene.agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={selectedAgents.includes(agent.id) ? "selected" : ""}
                onClick={() => onToggleAgent(agent.id)}
              >
                <strong>{agentName(agent.id, org)}</strong>
                <span>{agent.role} · stress {agent.stress} · morale {agent.morale}</span>
              </button>
            ))}
          </div>
          <h3>Between-cycle management</h3>
          <div className="downtime-grid">
            {scene.agents.map((agent) => (
              <div key={`${agent.id}:downtime`} className="downtime-row">
                <span>{agent.name}</span>
                {(Object.keys(DOWNTIME_ACTIONS) as DowntimeAction[]).map((action) => (
                  <button key={action} type="button" onClick={() => onApplyDowntime(agent.id, action)}>
                    {DOWNTIME_ACTIONS[action].label}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button className="primary accent" disabled={!canRun} onClick={onRun}>
            {selectedLocked ? "Locked" : `Run Contract (${selectedAgents.length}/${minAgents}-${maxAgents})`}
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
  );
}
