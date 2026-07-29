#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def rewrite(path: str, replacements: list[tuple[str, str, int]]) -> None:
    target = ROOT / path
    source = target.read_text(encoding="utf-8")
    for before, after, expected in replacements:
        count = source.count(before)
        if count != expected:
            raise SystemExit(f"{path}: expected {expected} occurrence(s), found {count}: {before[:100]!r}")
        source = source.replace(before, after)
    target.write_text(source, encoding="utf-8", newline="\n")


rewrite(
    "unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionContract.cs",
    [
        (
            "        public string difficultyModeId;\n",
            "        public string difficultyModeId;\n        public string timingProfileId;\n",
            2,
        ),
        (
            "            if (!ActionContract.IsRuntimeVersion(runtimeVersion)) errors.Add(\"Unsupported action runtime version.\");\n",
            "            if (!ActionContract.IsRuntimeVersion(runtimeVersion)) errors.Add(\"Unsupported action runtime version.\");\n"
            "            if (timingProfileId != null && string.IsNullOrWhiteSpace(timingProfileId)) errors.Add(\"Timing-profile identity is empty.\");\n",
            1,
        ),
    ],
)

rewrite(
    "unity/Packages/com.axm.rodoh-action/Runtime/Core/ActionTrace.cs",
    [
        (
            "                challengeId = spec.challengeId,\n                difficultyModeId = spec.difficultyModeId,\n                actionSpecDigest = spec.sourceSpecDigest,\n",
            "                challengeId = spec.challengeId,\n                difficultyModeId = spec.difficultyModeId,\n                timingProfileId = spec.timingProfileId,\n                actionSpecDigest = spec.sourceSpecDigest,\n",
            1,
        ),
    ],
)

rewrite(
    "unity/Packages/com.axm.rodoh-action/Runtime/Unity/IActionPresentationAdapter.cs",
    [
        (
            "        void Initialize(ActionSpecProjection spec, ActionSimulationState state);\n"
            "        void Render(ActionSimulationState state, float interpolation);\n"
            "        void ApplyEvents(IReadOnlyList<ActionEvent> events);\n"
            "        bool UsesUnityPhysicsAuthority();\n",
            "        void Initialize(ActionSpecProjection spec, ActionSimulationState state);\n"
            "        void Render(ActionSimulationState state, float interpolation);\n"
            "        bool SupportsCue(string cueId);\n"
            "        IReadOnlyList<string> ValidatePlayerProfile();\n"
            "        void ApplyCues(IReadOnlyList<ActionSemanticCue> cues);\n"
            "        bool UsesUnityPhysicsAuthority();\n",
            1,
        ),
    ],
)

rewrite(
    "unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionRuntimeBehaviour.cs",
    [
        (
            "using System;\nusing System.IO;\n",
            "using System;\nusing System.Collections.Generic;\nusing System.IO;\n",
            1,
        ),
        (
            "        public event Action<ActionSimulationState> TickAdvanced;\n"
            "        public event Action<ActionSimulationResult> EncounterCompleted;\n",
            "        public event Action<ActionSimulationState> TickAdvanced;\n"
            "        public event Action<IReadOnlyList<ActionSemanticCue>> CuesProjected;\n"
            "        public event Action<ActionSimulationResult> EncounterCompleted;\n",
            1,
        ),
        (
            "            _spec = ActionBridgeJson.ParseSpec(actionProjection.text);\n"
            "            _state = ActionKernel.InitialState(_spec, seed);\n",
            "            _spec = ActionBridgeJson.ParseSpec(actionProjection.text);\n"
            "            ValidatePresentationContract();\n"
            "            _state = ActionKernel.InitialState(_spec, seed);\n",
            1,
        ),
        (
            "            _running = true;\n            _presentation.Initialize(_spec, _state);\n",
            "            _running = true;\n"
            "            _presentation.Initialize(_spec, _state);\n"
            "            DeliverCues(ActionCueProjector.Initial(_spec, _state));\n",
            1,
        ),
        (
            "                var input = inputRouter != null ? inputRouter.SampleTick(_state.player.mode) : default;\n"
            "                _trace.Append(input);\n"
            "                ActionKernel.Step(_spec, _state, input);\n"
            "                _accumulator -= tickDuration;\n"
            "                advanced += 1;\n"
            "                TickAdvanced?.Invoke(_state);\n"
            "                _presentation?.ApplyEvents(_state.events);\n",
            "                var input = inputRouter != null ? inputRouter.SampleTick(_state.player.mode) : default;\n"
            "                var prior = ActionStateSnapshot.Clone(_state);\n"
            "                _trace.Append(input);\n"
            "                ActionKernel.Step(_spec, _state, input);\n"
            "                _accumulator -= tickDuration;\n"
            "                advanced += 1;\n"
            "                TickAdvanced?.Invoke(_state);\n"
            "                DeliverCues(ActionCueProjector.Project(_spec, prior, _state));\n",
            1,
        ),
        (
            "        private void ResolvePresentation(bool required)\n",
            "        private void ValidatePresentationContract()\n"
            "        {\n"
            "            foreach (var cueId in ActionCueContract.RequiredCueIds)\n"
            "            {\n"
            "                if (!_presentation.SupportsCue(cueId))\n"
            "                {\n"
            "                    throw new InvalidOperationException(\"Action presentation does not map required Arc cue: \" + cueId + \" (\" + _presentation.AdapterId + \")\");\n"
            "                }\n"
            "            }\n"
            "            if (allowDiagnosticPresentation) return;\n"
            "            var errors = _presentation.ValidatePlayerProfile();\n"
            "            if (errors != null && errors.Count > 0)\n"
            "            {\n"
            "                throw new InvalidOperationException(\"Action player presentation is not production-ready: \" + string.Join(\" \", errors));\n"
            "            }\n"
            "        }\n\n"
            "        private void DeliverCues(IReadOnlyList<ActionSemanticCue> cues)\n"
            "        {\n"
            "            if (cues == null || cues.Count == 0) return;\n"
            "            _presentation.ApplyCues(cues);\n"
            "            CuesProjected?.Invoke(cues);\n"
            "        }\n\n"
            "        private void ResolvePresentation(bool required)\n",
            1,
        ),
    ],
)

rewrite(
    "unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionPrimitivePresentation.cs",
    [
        (
            "        public void ApplyEvents(IReadOnlyList<ActionEvent> events)\n"
            "        {\n"
            "            if (events == null) return;\n"
            "            foreach (var actionEvent in events)\n"
            "            {\n"
            "                if (actionEvent == null) continue;\n"
            "                if (actionEvent.type == \"parry\" && _playerVisual != null) _playerVisual.localScale = new Vector3(1.2f, 0.8f, 1.2f);\n"
            "                if (actionEvent.type == \"dodge\" && _playerVisual != null) _playerVisual.localScale = new Vector3(0.6f, 0.6f, 1.4f);\n"
            "                if (actionEvent.type == \"enemy_hit\" && actionEvent.enemyId != null && _enemyVisuals.TryGetValue(actionEvent.enemyId, out var enemy)) enemy.localScale *= 1.2f;\n"
            "            }\n"
            "        }\n",
            "        public bool SupportsCue(string cueId)\n"
            "        {\n"
            "            return ActionCueContract.IsRequiredCue(cueId);\n"
            "        }\n\n"
            "        public IReadOnlyList<string> ValidatePlayerProfile()\n"
            "        {\n"
            "            return new[] { \"diagnostic.primitive/v1 is not a player presentation\" };\n"
            "        }\n\n"
            "        public void ApplyCues(IReadOnlyList<ActionSemanticCue> cues)\n"
            "        {\n"
            "            if (cues == null) return;\n"
            "            foreach (var cue in cues)\n"
            "            {\n"
            "                if (cue == null) continue;\n"
            "                if (cue.cueId == \"cue.parry-succeeded\" && _playerVisual != null) _playerVisual.localScale = new Vector3(1.2f, 0.8f, 1.2f);\n"
            "                if (cue.cueId == \"cue.dodge-invulnerability\" && _playerVisual != null) _playerVisual.localScale = new Vector3(0.6f, 0.6f, 1.4f);\n"
            "                if (cue.cueId == \"cue.enemy-stagger-started\" && cue.subjectId != null && _enemyVisuals.TryGetValue(cue.subjectId, out var enemy)) enemy.localScale *= 1.2f;\n"
            "            }\n"
            "        }\n",
            1,
        ),
    ],
)

rewrite(
    "unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionProductionPresentation.cs",
    [
        (
            "    public sealed class ActionPresentationFeedbackEvent : UnityEvent<string, string, int, Vector3> { }\n",
            "    public sealed class ActionPresentationFeedbackEvent : UnityEvent<string, string, int, Vector3> { }\n\n"
            "    [Serializable]\n"
            "    public sealed class ActionSemanticCueFeedbackEvent : UnityEvent<string, string, string, int, int, Vector3> { }\n",
            1,
        ),
        (
            "        [SerializeField] private ActionPresentationFeedbackEvent onFeedback = new ActionPresentationFeedbackEvent();\n",
            "        [SerializeField] private ActionPresentationFeedbackEvent onFeedback = new ActionPresentationFeedbackEvent();\n"
            "        [SerializeField] private ActionSemanticCueFeedbackEvent onSemanticCue = new ActionSemanticCueFeedbackEvent();\n",
            1,
        ),
        (
            "        private static readonly int Objective = Animator.StringToHash(\"AXM_Objective\");\n",
            "        private static readonly int Objective = Animator.StringToHash(\"AXM_Objective\");\n"
            "        private static readonly int Cue = Animator.StringToHash(\"AXM_Cue\");\n"
            "        private static readonly int CueCode = Animator.StringToHash(\"AXM_CueCode\");\n"
            "        private static readonly int CueDuration = Animator.StringToHash(\"AXM_CueDuration\");\n"
            "        private static readonly int DefenseWindow = Animator.StringToHash(\"AXM_DefenseWindow\");\n"
            "        private static readonly int WorkWindow = Animator.StringToHash(\"AXM_WorkWindow\");\n"
            "        private static readonly string[] RequiredEnemyKits = { \"skirmisher\", \"duelist\", \"swarm\", \"hexer\", \"breaker\" };\n",
            1,
        ),
        (
            "        public ActionPresentationFeedbackEvent OnFeedback => onFeedback;\n",
            "        public ActionPresentationFeedbackEvent OnFeedback => onFeedback;\n"
            "        public ActionSemanticCueFeedbackEvent OnSemanticCue => onSemanticCue;\n",
            1,
        ),
        (
            "        public void ApplyEvents(IReadOnlyList<ActionEvent> events)\n"
            "        {\n"
            "            if (events == null) return;\n"
            "            foreach (var actionEvent in events)\n"
            "            {\n"
            "                if (actionEvent == null) continue;\n"
            "                ActionActorBinding actor = null;\n"
            "                if (actionEvent.enemyId != null) _actors.TryGetValue(actionEvent.enemyId, out actor);\n"
            "                if (actionEvent.type == \"player_hit\" || actionEvent.type == \"parry\" || actionEvent.type == \"dodge\") _actors.TryGetValue(\"player\", out actor);\n"
            "                var animator = actor?.Animator;\n"
            "                if (actionEvent.type == \"enemy_hit\" || actionEvent.type == \"player_hit\") Trigger(animator, Hit);\n"
            "                if (actionEvent.type == \"parry\") Trigger(animator, Parry);\n"
            "                if (actionEvent.type == \"dodge\") Trigger(animator, Dodge);\n"
            "                if (actionEvent.defeated) Trigger(animator, Defeat);\n"
            "                if (actionEvent.type == \"objective_completed\")\n"
            "                {\n"
            "                    foreach (var value in _actors.Values) Trigger(value?.Animator, Objective);\n"
            "                }\n"
            "                onFeedback?.Invoke(actionEvent.type, actionEvent.enemyId ?? actionEvent.objectiveId ?? string.Empty, actionEvent.damage, actor == null ? Vector3.zero : actor.transform.position);\n"
            "            }\n"
            "        }\n",
            "        public bool SupportsCue(string cueId)\n"
            "        {\n"
            "            return ActionCueContract.IsRequiredCue(cueId);\n"
            "        }\n\n"
            "        public IReadOnlyList<string> ValidatePlayerProfile()\n"
            "        {\n"
            "            var errors = new List<string>();\n"
            "            if (playerPrefab == null) errors.Add(\"Authored player prefab is absent.\");\n"
            "            if (playerNeutralFallback) errors.Add(\"Player primitive fallback remains enabled.\");\n"
            "            foreach (var kit in RequiredEnemyKits)\n"
            "            {\n"
            "                if (!_enemyByKit.TryGetValue(kit, out var binding) || binding == null || binding.prefab == null)\n"
            "                {\n"
            "                    errors.Add(\"Authored enemy prefab is absent: \" + kit + \".\");\n"
            "                }\n"
            "                else if (binding.neutralFallback)\n"
            "                {\n"
            "                    errors.Add(\"Enemy primitive fallback remains enabled: \" + kit + \".\");\n"
            "                }\n"
            "            }\n"
            "            return errors;\n"
            "        }\n\n"
            "        public void ApplyCues(IReadOnlyList<ActionSemanticCue> cues)\n"
            "        {\n"
            "            if (cues == null) return;\n"
            "            foreach (var cue in cues)\n"
            "            {\n"
            "                if (cue == null) continue;\n"
            "                if (!SupportsCue(cue.cueId)) throw new InvalidOperationException(\"Unsupported Arc semantic cue: \" + cue.cueId);\n"
            "                ActionActorBinding actor = null;\n"
            "                if (!string.IsNullOrEmpty(cue.subjectId)) _actors.TryGetValue(cue.subjectId, out actor);\n"
            "                ActionActorBinding playerActor = null;\n"
            "                _actors.TryGetValue(\"player\", out playerActor);\n"
            "                if (cue.cueId.StartsWith(\"cue.player-\", StringComparison.Ordinal) || cue.cueId == \"cue.dodge-invulnerability\") actor = playerActor;\n"
            "                var animator = actor?.Animator;\n"
            "                if (cue.cueId == \"cue.parry-succeeded\") Trigger(playerActor?.Animator, Parry);\n"
            "                if (cue.cueId == \"cue.dodge-invulnerability\") Trigger(playerActor?.Animator, Dodge);\n"
            "                if (cue.cueId == \"cue.enemy-stagger-started\") Trigger(animator, Hit);\n"
            "                if (cue.cueId == \"cue.objective-completed\")\n"
            "                {\n"
            "                    foreach (var value in _actors.Values) Trigger(value?.Animator, Objective);\n"
            "                }\n"
            "                var cueCode = ActionCueContract.CueCode(cue.cueId);\n"
            "                var cueDuration = cue.durationTicks ?? 0;\n"
            "                foreach (var value in new[] { animator, playerActor?.Animator })\n"
            "                {\n"
            "                    SetInteger(value, CueCode, cueCode);\n"
            "                    SetInteger(value, CueDuration, cueDuration);\n"
            "                    Trigger(value, Cue);\n"
            "                }\n"
            "                if (cue.cueId == \"cue.defense-window-opened\") SetBool(playerActor?.Animator, DefenseWindow, true);\n"
            "                if (cue.cueId == \"cue.defense-window-closed\") SetBool(playerActor?.Animator, DefenseWindow, false);\n"
            "                if (cue.cueId == \"cue.work-window-opened\") SetBool(playerActor?.Animator, WorkWindow, true);\n"
            "                if (cue.cueId == \"cue.work-window-closed\") SetBool(playerActor?.Animator, WorkWindow, false);\n"
            "                var position = actor == null ? Vector3.zero : actor.transform.position;\n"
            "                onFeedback?.Invoke(cue.cueId, cue.subjectId ?? cue.objectiveId ?? string.Empty, cueDuration, position);\n"
            "                onSemanticCue?.Invoke(cue.cueId, cue.subjectId ?? string.Empty, cue.objectiveId ?? string.Empty, cueDuration, cue.progress ?? 0, position);\n"
            "            }\n"
            "        }\n",
            1,
        ),
    ],
)

rewrite(
    "unity/Conformance/project-action-spec.mjs",
    [
        (
            'exactKeys(source, ["format", "runtimeVersion", "arcDigest", "challengeId", "title", "difficultyModeId", "tickRate", "maxTicks", "arena", "player", "enemyLaws", "objectives", "completion", "specDigest"], "action spec");\n',
            'exactKeys(source, ["format", "runtimeVersion", "arcDigest", "challengeId", "title", "difficultyModeId", "timingProfileId", "tickRate", "maxTicks", "arena", "player", "enemyLaws", "objectives", "completion", "specDigest"], "action spec");\n',
            1,
        ),
        (
            'text(source.title, "title");\ninteger(source.maxTicks, "maxTicks", 1, 18000);\n',
            'text(source.title, "title");\nif (source.timingProfileId !== undefined) text(source.timingProfileId, "timingProfileId");\ninteger(source.maxTicks, "maxTicks", 1, 18000);\n',
            1,
        ),
        (
            '  difficultyModeId: source.difficultyModeId ?? null,\n  tickRate: source.tickRate,\n',
            '  difficultyModeId: source.difficultyModeId ?? null,\n  timingProfileId: source.timingProfileId ?? null,\n  tickRate: source.tickRate,\n',
            1,
        ),
        (
            '  challengeId: source.challengeId,\n  runtimeVersion: source.runtimeVersion,\n',
            '  challengeId: source.challengeId,\n  runtimeVersion: source.runtimeVersion,\n  timingProfileId: source.timingProfileId ?? null,\n',
            1,
        ),
    ],
)

rewrite(
    "unity/Conformance/arc-receipt-adapter.test.ts",
    [
        (
            'const arcModules = import.meta.glob("../../src/arcs/*.{ts,js}", { eager: true });\n',
            'const arcModules = import.meta.glob("../../src/arcs/*.{ts,js}", { eager: true });\n'
            'const demoModules = import.meta.glob("../../src/demos/**/index.{ts,js}", { eager: true });\n',
            1,
        ),
        (
            '  for (const moduleValue of Object.values(arcModules as Record<string, Record<string, unknown>>)) {\n',
            '  const moduleSets = [arcModules, demoModules] as Array<Record<string, Record<string, unknown>>>;\n'
            '  for (const modules of moduleSets) for (const moduleValue of Object.values(modules)) {\n',
            1,
        ),
        (
            '  const difficultyModeId = candidate.difficultyModeId ?? null;\n',
            '  const difficultyModeId = candidate.difficultyModeId ?? null;\n'
            '  const timingProfileId = candidate.timingProfileId ?? null;\n',
            1,
        ),
        (
            '        const compiled = compileActionEncounter(arc, challenge, difficultyModeId);\n',
            '        const compiled = compileActionEncounter(arc, challenge, difficultyModeId, timingProfileId);\n',
            1,
        ),
        (
            '    expect(candidate.actionSpecDigest).toBe(spec.specDigest);\n',
            '    expect(candidate.actionSpecDigest).toBe(spec.specDigest);\n'
            '    expect(candidate.timingProfileId ?? null).toBe(spec.timingProfileId ?? null);\n',
            1,
        ),
        (
            '    const difficultyModeId = candidate.difficultyModeId ?? null;\n    const expectedSeed = actionSeed(orgSeed, candidate.cycle, challenge.id, difficultyModeId);\n',
            '    const difficultyModeId = candidate.difficultyModeId ?? null;\n'
            '    const timingProfileId = candidate.timingProfileId ?? null;\n'
            '    const expectedSeed = actionSeed(orgSeed, candidate.cycle, challenge.id, difficultyModeId, timingProfileId);\n',
            1,
        ),
        (
            '      difficultyModeId,\n      cycle: candidate.cycle,\n',
            '      difficultyModeId,\n      timingProfileId,\n      cycle: candidate.cycle,\n',
            2,
        ),
        (
            '      challengeId: candidate.challengeId,\n      creator: "buildActionReceipt",\n',
            '      challengeId: candidate.challengeId,\n      timingProfileId,\n      creator: "buildActionReceipt",\n',
            1,
        ),
    ],
)

rewrite(
    "scripts/replay-unity-action-candidate.ps1",
    [
        (
            '[string]$ArcActionAuthorityCommit = "6eef311836ee7cb3a43a94ce51f448a2699c3b04",\n',
            '[string]$ArcActionAuthorityCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35",\n',
            1,
        ),
    ],
)

rewrite(
    "unity/Conformance/CueParityProgram.cs",
    [
        (
            '            if (args.Length < 2) throw new ArgumentException("usage: cue-parity <unity-projection.json> <arc-reference.json> [receipt.json]");\n',
            '            if (args.Length < 2) throw new ArgumentException("usage: cue-parity <unity-projection.json> <arc-reference.json> [receipt.json] [candidate.json]");\n',
            1,
        ),
        (
            '            if (candidate.authority != "Arc replay required") throw new InvalidOperationException("Unity candidate claimed accepted authority.");\n            receipt.status = "pass";\n',
            '            if (candidate.authority != "Arc replay required") throw new InvalidOperationException("Unity candidate claimed accepted authority.");\n'
            '            if (args.Length > 3)\n'
            '            {\n'
            '                var candidatePath = Path.GetFullPath(args[3]);\n'
            '                Directory.CreateDirectory(Path.GetDirectoryName(candidatePath) ?? Directory.GetCurrentDirectory());\n'
            '                File.WriteAllText(candidatePath, ActionBridgeJson.SerializeCandidate(candidate, true));\n'
            '            }\n'
            '            receipt.status = "pass";\n',
            1,
        ),
    ],
)

print("PASS: semantic cue receiver source convergence")
