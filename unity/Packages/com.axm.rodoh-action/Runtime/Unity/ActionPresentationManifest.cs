using System;
using System.Collections.Generic;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    [Serializable]
    public sealed class ActionMotionSet
    {
        public string idle;
        public string move;
        public string light;
        public string heavy;
        public string dodge;
        public string parry;
        public string stagger;
        public string defeat;
    }

    [Serializable]
    public class ActionActorPresentation
    {
        public string actorId = string.Empty;
        public string bodyPrefab;
        public string animatorController;
        public ActionMotionSet motionSet = new ActionMotionSet();
        public bool neutralFallback = true;
        public float scale = 1f;
    }

    [Serializable]
    public sealed class ActionEnemyPresentation : ActionActorPresentation
    {
        public string kit = "skirmisher";
    }

    [Serializable]
    public sealed class ActionArenaPresentation
    {
        public string kit = "ring";
        public string recipe;
        public bool neutralFallback = true;
        public float metersPerActionUnit = 0.0005f;
    }

    [Serializable]
    public sealed class ActionFeedbackPresentation
    {
        public string @event = string.Empty;
        public string vfxPrefab;
        public string audioClip;
        [Range(0f, 1f)] public float haptic;
        [Range(0f, 1f)] public float cameraImpulse;
        [Range(0, 100)] public int hitStopMilliseconds;
        public bool neutralFallback = true;
    }

    [Serializable]
    public sealed class ActionQualityProfile
    {
        public string id = "low";
        [Range(0.5f, 1.5f)] public float renderScale = 1f;
        [Range(1, 13)] public int maximumSkinnedActors = 7;
        [Range(0, 4096)] public int maximumParticles = 256;
        public string shadowMode = "none";
        public bool postProcessing;
        public int targetFps = 30;
    }

    [Serializable]
    public sealed class ActionPresentationAccessibility
    {
        [Range(1f, 3f)] public float telegraphScale = 1f;
        public bool reducedMotion;
        public bool highContrast;
        public bool hapticsOptional = true;
        public bool audioOptional = true;
        public bool oneHandedMappings = true;
    }

    [Serializable]
    public sealed class ActionPresentationProvenance
    {
        public string format = "rodoh-action-presentation-provenance/1";
        public string license = "MIT";
        public string[] assetRoots = Array.Empty<string>();
        public bool remoteRuntimeReferencesAllowed;
    }

    [Serializable]
    public sealed class ActionPresentationManifest
    {
        public const string Format = "rodoh-action-presentation-manifest/1";

        public string format = Format;
        public string manifestId = string.Empty;
        public string sourceActionSpecDigest = string.Empty;
        public string themeId = string.Empty;
        public ActionActorPresentation player = new ActionActorPresentation();
        public ActionEnemyPresentation[] enemies = Array.Empty<ActionEnemyPresentation>();
        public ActionArenaPresentation arena = new ActionArenaPresentation();
        public ActionFeedbackPresentation[] feedback = Array.Empty<ActionFeedbackPresentation>();
        public ActionQualityProfile[] qualityProfiles = Array.Empty<ActionQualityProfile>();
        public ActionPresentationAccessibility accessibility = new ActionPresentationAccessibility();
        public ActionPresentationProvenance provenance = new ActionPresentationProvenance();

        public List<string> Validate(ActionSpecProjection spec = null)
        {
            var errors = new List<string>();
            if (format != Format) errors.Add("Unsupported action presentation manifest format.");
            if (string.IsNullOrWhiteSpace(manifestId)) errors.Add("Presentation manifest id is absent.");
            if (string.IsNullOrWhiteSpace(sourceActionSpecDigest) || !sourceActionSpecDigest.StartsWith("actspec1_", StringComparison.Ordinal)) errors.Add("Presentation source action-spec digest is malformed.");
            if (spec != null && sourceActionSpecDigest != spec.sourceSpecDigest) errors.Add("Presentation manifest is bound to a different action spec.");
            if (string.IsNullOrWhiteSpace(themeId)) errors.Add("Presentation theme id is absent.");
            ValidateActor(player, "player", errors);

            var enemyKits = new HashSet<string>(StringComparer.Ordinal);
            if (enemies == null || enemies.Length != 5) errors.Add("Presentation manifest requires exactly five enemy kits.");
            if (enemies != null)
            {
                foreach (var enemy in enemies)
                {
                    ValidateActor(enemy, enemy == null ? "enemy" : enemy.kit, errors);
                    if (enemy == null || !ActionContract.IsEnemyKit(enemy.kit)) errors.Add("Presentation manifest contains an unknown enemy kit.");
                    else if (!enemyKits.Add(enemy.kit)) errors.Add("Presentation manifest contains a duplicate enemy kit.");
                }
            }

            if (arena == null || !ActionContract.IsArenaKit(arena.kit)) errors.Add("Presentation arena kit is absent or unknown.");
            else if (spec != null && arena.kit != spec.arena.kit) errors.Add("Presentation arena kit differs from the action spec.");
            if (arena == null || !Finite(arena.metersPerActionUnit) || arena.metersPerActionUnit <= 0f || arena.metersPerActionUnit > 0.01f) errors.Add("Presentation action-unit scale is invalid.");
            if (arena != null && !arena.neutralFallback && string.IsNullOrWhiteSpace(arena.recipe)) errors.Add("Presentation arena has neither an authored recipe nor a neutral fallback.");

            var feedbackEvents = new HashSet<string>(StringComparer.Ordinal);
            if (feedback == null || feedback.Length < 6) errors.Add("Presentation manifest lacks the minimum feedback vocabulary.");
            if (feedback != null)
            {
                foreach (var cue in feedback)
                {
                    if (cue == null || !FeedbackEvent(cue.@event)) errors.Add("Presentation manifest contains an unknown feedback event.");
                    else if (!feedbackEvents.Add(cue.@event)) errors.Add("Presentation manifest contains a duplicate feedback event.");
                    if (cue == null || !Finite(cue.haptic) || cue.haptic < 0f || cue.haptic > 1f || !Finite(cue.cameraImpulse) || cue.cameraImpulse < 0f || cue.cameraImpulse > 1f || cue.hitStopMilliseconds < 0 || cue.hitStopMilliseconds > 100) errors.Add("Presentation feedback magnitude is invalid.");
                    if (cue != null && !cue.neutralFallback && string.IsNullOrWhiteSpace(cue.vfxPrefab) && string.IsNullOrWhiteSpace(cue.audioClip) && cue.haptic <= 0f && cue.cameraImpulse <= 0f) errors.Add("Presentation feedback cue has no authored asset or neutral fallback.");
                }
            }

            var qualityIds = new HashSet<string>(StringComparer.Ordinal);
            if (qualityProfiles == null || qualityProfiles.Length != 3) errors.Add("Presentation manifest requires low, standard, and high quality profiles.");
            if (qualityProfiles != null)
            {
                foreach (var quality in qualityProfiles)
                {
                    if (quality == null || (quality.id != "low" && quality.id != "standard" && quality.id != "high")) errors.Add("Presentation manifest contains an unknown quality profile.");
                    else if (!qualityIds.Add(quality.id)) errors.Add("Presentation manifest contains a duplicate quality profile.");
                    if (quality == null || !Finite(quality.renderScale) || quality.renderScale < 0.5f || quality.renderScale > 1.5f || quality.maximumSkinnedActors < 1 || quality.maximumSkinnedActors > 13 || quality.maximumParticles < 0 || quality.maximumParticles > 4096 || !ShadowMode(quality.shadowMode) || !TargetFps(quality.targetFps)) errors.Add("Presentation quality profile is outside the v1 bound.");
                }
            }

            if (accessibility == null || !Finite(accessibility.telegraphScale) || accessibility.telegraphScale < 1f || accessibility.telegraphScale > 3f) errors.Add("Presentation accessibility telegraph scale is invalid.");
            if (accessibility == null || !accessibility.hapticsOptional || !accessibility.audioOptional) errors.Add("Haptics and audio must remain optional.");

            if (provenance == null || provenance.format != "rodoh-action-presentation-provenance/1") errors.Add("Presentation provenance is absent or unknown.");
            if (provenance == null || string.IsNullOrWhiteSpace(provenance.license)) errors.Add("Presentation license is absent.");
            if (provenance == null || provenance.remoteRuntimeReferencesAllowed) errors.Add("Remote runtime presentation references are prohibited.");
            if (provenance == null || provenance.assetRoots == null || provenance.assetRoots.Length == 0) errors.Add("Presentation asset roots are absent.");
            else
            {
                var roots = new HashSet<string>(StringComparer.Ordinal);
                foreach (var root in provenance.assetRoots)
                {
                    if (string.IsNullOrWhiteSpace(root) || !root.Replace('\\', '/').StartsWith("Assets/", StringComparison.Ordinal)) errors.Add("Presentation asset root must remain inside Assets/.");
                    else if (!roots.Add(root.Replace('\\', '/'))) errors.Add("Presentation asset roots contain a duplicate.");
                }
            }
            return errors;
        }

        public ActionEnemyPresentation Enemy(string kit)
        {
            if (enemies == null) return null;
            foreach (var enemy in enemies) if (enemy != null && enemy.kit == kit) return enemy;
            return null;
        }

        public ActionFeedbackPresentation Feedback(string eventName)
        {
            if (feedback == null) return null;
            foreach (var cue in feedback) if (cue != null && cue.@event == eventName) return cue;
            return null;
        }

        public ActionQualityProfile Quality(string id)
        {
            if (qualityProfiles == null) return null;
            foreach (var profile in qualityProfiles) if (profile != null && profile.id == id) return profile;
            return null;
        }

        private static void ValidateActor(ActionActorPresentation actor, string label, List<string> errors)
        {
            if (actor == null)
            {
                errors.Add("Presentation actor is absent: " + label + ".");
                return;
            }
            if (string.IsNullOrWhiteSpace(actor.actorId)) errors.Add("Presentation actor id is absent: " + label + ".");
            if (!Finite(actor.scale) || actor.scale <= 0f || actor.scale > 10f) errors.Add("Presentation actor scale is invalid: " + label + ".");
            if (!actor.neutralFallback && string.IsNullOrWhiteSpace(actor.bodyPrefab)) errors.Add("Presentation actor has neither an authored body nor neutral fallback: " + label + ".");
            if (actor.motionSet == null) errors.Add("Presentation motion set is absent: " + label + ".");
        }

        private static bool FeedbackEvent(string value)
        {
            return value == "player_action" || value == "enemy_hit" || value == "player_hit" || value == "parry" || value == "dodge" || value == "objective_completed" || value == "encounter_completed";
        }

        private static bool ShadowMode(string value)
        {
            return value == "none" || value == "one-directional" || value == "baked";
        }

        private static bool TargetFps(int value)
        {
            return value == 30 || value == 60 || value == 72 || value == 90;
        }

        private static bool Finite(float value)
        {
            return !float.IsNaN(value) && !float.IsInfinity(value);
        }
    }
}
