using System;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Small player-facing HUD for health, the current authored verb, and nearby
    /// mechanism work. Receipts and authority diagnostics remain export surfaces.
    /// </summary>
    public sealed class ActionMinimalHud : MonoBehaviour
    {
        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionInputBindings bindings;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private bool showControls = true;
        [SerializeField, Range(0f, 30f)] private float controlsSeconds = 12f;
        [SerializeField] private Color healthColor = new Color(0.34f, 0.88f, 0.66f, 1f);
        [SerializeField] private Color objectiveColor = new Color(0.86f, 0.96f, 0.58f, 1f);

        private GUIStyle _label;
        private GUIStyle _small;
        private GUIStyle _objective;
        private GUIStyle _prompt;
        private float _enabledAt;

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (bindings == null) bindings = GetComponent<ActionInputBindings>();
        }

        private void OnEnable()
        {
            _enabledAt = Time.unscaledTime;
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime)
        {
            Configure(actionRuntime, bindings);
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, ActionInputBindings inputBindings)
        {
            runtime = actionRuntime;
            bindings = inputBindings;
        }

        private void OnGUI()
        {
            if (!enabledByPreference || runtime == null || runtime.State == null || runtime.Spec == null || Application.isBatchMode) return;
            EnsureStyles();
            var state = runtime.State;
            var spec = runtime.Spec;
            var scale = Mathf.Clamp(Screen.height / 900f, 0.75f, 1.5f);
            var margin = 22f * scale;

            DrawHealth(state, spec, margin, scale);
            DrawObjective(state, spec, margin, scale);
            DrawMechanismPrompt(state, spec, scale);
            if (showControls && Time.unscaledTime - _enabledAt <= controlsSeconds) DrawControls(margin, scale);
        }

        private void DrawHealth(ActionSimulationState state, ActionSpecProjection spec, float margin, float scale)
        {
            var width = Mathf.Min(Screen.width * 0.28f, 330f * scale);
            var labelRect = new Rect(margin, margin, width, 24f * scale);
            GUI.Label(labelRect, "RHEA", _small);
            var barRect = new Rect(margin, margin + 23f * scale, width, 12f * scale);
            DrawRect(barRect, new Color(0f, 0f, 0f, 0.65f));
            var ratio = spec.player.maxHealth <= 0 ? 0f : Mathf.Clamp01((float)state.player.health / spec.player.maxHealth);
            DrawRect(new Rect(barRect.x, barRect.y, barRect.width * ratio, barRect.height), healthColor);
            GUI.Label(new Rect(margin, margin + 40f * scale, width, 22f * scale), Math.Max(0, state.player.health) + " / " + spec.player.maxHealth, _label);
        }

        private void DrawObjective(ActionSimulationState state, ActionSpecProjection spec, float margin, float scale)
        {
            if (state.activeObjectiveIndex < 0 || state.activeObjectiveIndex >= spec.objectives.Length) return;
            var objective = spec.objectives[state.activeObjectiveIndex];
            var width = Mathf.Min(Screen.width * 0.54f, 760f * scale);
            var x = Screen.width - margin - width;
            GUI.Label(new Rect(x, margin, width, 32f * scale), objective.label, _objective);
            var detail = objective.brief;
            if (objective.semanticCompletion != null)
            {
                state.objectiveProgress.TryGetValue(objective.id, out var progress);
                var target = objective.semanticCompletion.kind == "interact_count"
                    ? objective.semanticCompletion.targetCount
                    : objective.semanticCompletion.targetTicks;
                detail = objective.brief + "  " + progress + " / " + target;
            }
            GUI.Label(new Rect(x, margin + 34f * scale, width, 42f * scale), detail, _small);
        }

        private void DrawMechanismPrompt(ActionSimulationState state, ActionSpecProjection spec, float scale)
        {
            var target = ActiveTarget(state, spec);
            if (target == null) return;
            var dx = (long)target.x - state.player.x;
            var dy = (long)target.y - state.player.y;
            if (dx * dx + dy * dy > (long)target.radius * target.radius) return;
            var key = bindings?.Profile?.Primary(ActionPlayerAction.Interact) ?? "E";
            var text = spec.objectives[state.activeObjectiveIndex].semanticCompletion.kind == "hold_ticks"
                ? "HOLD " + key.ToUpperInvariant() + "  ·  WORK"
                : key.ToUpperInvariant() + "  ·  WORK";
            var width = 260f * scale;
            var rect = new Rect((Screen.width - width) * 0.5f, Screen.height - 120f * scale, width, 40f * scale);
            DrawRect(rect, new Color(0.02f, 0.06f, 0.04f, 0.78f));
            GUI.Label(rect, text, _prompt);
        }

        private void DrawControls(float margin, float scale)
        {
            var text = bindings?.Profile == null
                ? "WASD move   MOUSE look   LMB sweep   RMB crush   SPACE dodge   Q parry   E work"
                : "WASD move   MOUSE look   " + bindings.Profile.ControlSummary();
            var width = Mathf.Min(Screen.width - margin * 2f, 940f * scale);
            GUI.Label(new Rect(Screen.width - margin - width, Screen.height - margin - 28f * scale, width, 28f * scale), text, _small);
        }

        private static ActionObjectiveTarget ActiveTarget(ActionSimulationState state, ActionSpecProjection spec)
        {
            if (state.activeObjectiveIndex < 0 || state.activeObjectiveIndex >= spec.objectives.Length) return null;
            var semantic = spec.objectives[state.activeObjectiveIndex].semanticCompletion;
            if (semantic == null) return null;
            if (semantic.kind == "hold_ticks") return semantic.target;
            if (semantic.kind != "interact_count" || semantic.targets == null) return null;
            foreach (var target in semantic.targets)
            {
                if (target != null && !state.completedInteractionTargetIds.Contains(target.id)) return target;
            }
            return null;
        }

        private void EnsureStyles()
        {
            if (_label != null) return;
            _label = new GUIStyle(GUI.skin.label)
            {
                fontSize = 13,
                fontStyle = FontStyle.Bold,
                normal = { textColor = Color.white }
            };
            _small = new GUIStyle(GUI.skin.label)
            {
                fontSize = 12,
                alignment = TextAnchor.UpperRight,
                wordWrap = true,
                normal = { textColor = new Color(0.86f, 0.84f, 0.76f, 1f) }
            };
            _objective = new GUIStyle(GUI.skin.label)
            {
                fontSize = 21,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.UpperRight,
                normal = { textColor = objectiveColor }
            };
            _prompt = new GUIStyle(GUI.skin.label)
            {
                fontSize = 16,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = objectiveColor }
            };
        }

        private static void DrawRect(Rect rect, Color color)
        {
            var previous = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, Texture2D.whiteTexture);
            GUI.color = previous;
        }
    }
}
