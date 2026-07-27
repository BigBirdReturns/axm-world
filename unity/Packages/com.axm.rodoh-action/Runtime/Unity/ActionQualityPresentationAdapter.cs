using System;
using System.Collections.Generic;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Applies a quality profile to authored bodies without removing any combatant.
    /// Bodies beyond the animation budget retain deterministic transforms and static
    /// meshes while expensive animation, particles, and shadows degrade first.
    /// </summary>
    public sealed class ActionQualityPresentationAdapter : MonoBehaviour
    {
        [SerializeField] private ActionQualityGovernor governor;
        [SerializeField] private Transform actorRoot;
        [SerializeField] private Transform effectsRoot;
        [SerializeField] private Camera[] managedCameras = Array.Empty<Camera>();
        [SerializeField] private bool playerAnimationAlwaysEnabled = true;

        private void Awake()
        {
            if (governor == null) governor = GetComponentInParent<ActionQualityGovernor>();
            if (actorRoot == null) actorRoot = transform;
            if (effectsRoot == null) effectsRoot = transform;
        }

        private void OnEnable()
        {
            if (governor == null) governor = GetComponentInParent<ActionQualityGovernor>();
            if (governor != null)
            {
                governor.QualityChanged += Apply;
                if (governor.CurrentProfile != null) Apply(governor.CurrentProfile);
            }
        }

        private void OnDisable()
        {
            if (governor != null) governor.QualityChanged -= Apply;
        }

        public void Configure(ActionQualityGovernor qualityGovernor, Transform actors, Transform effects, Camera[] cameras = null)
        {
            if (governor != null) governor.QualityChanged -= Apply;
            governor = qualityGovernor;
            actorRoot = actors;
            effectsRoot = effects;
            managedCameras = cameras ?? Array.Empty<Camera>();
            if (isActiveAndEnabled && governor != null)
            {
                governor.QualityChanged += Apply;
                if (governor.CurrentProfile != null) Apply(governor.CurrentProfile);
            }
        }

        public void Apply(ActionQualityProfile profile)
        {
            if (profile == null) return;
            ApplyAnimationBudget(profile.maximumSkinnedActors);
            ApplyParticleBudget(profile.maximumParticles);
            ApplyRendererBudget(profile);
            ApplyCameraBudget(profile);
        }

        private void ApplyAnimationBudget(int maximumAnimatedActors)
        {
            if (actorRoot == null) return;
            var bindings = new List<ActionActorBinding>(actorRoot.GetComponentsInChildren<ActionActorBinding>(true));
            bindings.Sort((left, right) =>
            {
                if (left.ActorId == "player") return -1;
                if (right.ActorId == "player") return 1;
                return string.CompareOrdinal(left.ActorId, right.ActorId);
            });
            var enabled = 0;
            foreach (var binding in bindings)
            {
                var animator = binding.Animator;
                if (animator == null) continue;
                var keep = (playerAnimationAlwaysEnabled && binding.ActorId == "player") || enabled < maximumAnimatedActors;
                animator.enabled = keep;
                animator.cullingMode = keep ? AnimatorCullingMode.CullUpdateTransforms : AnimatorCullingMode.CullCompletely;
                if (keep) enabled += 1;
            }
        }

        private void ApplyParticleBudget(int maximumParticles)
        {
            if (effectsRoot == null) return;
            var systems = effectsRoot.GetComponentsInChildren<ParticleSystem>(true);
            if (systems.Length == 0) return;
            var remaining = Mathf.Max(0, maximumParticles);
            foreach (var system in systems)
            {
                if (system == null) continue;
                var main = system.main;
                var assigned = systems.Length == 0 ? 0 : Mathf.Max(0, remaining / Math.Max(1, systems.Length));
                main.maxParticles = assigned;
                if (assigned == 0)
                {
                    system.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
                    var emission = system.emission;
                    emission.enabled = false;
                }
                else
                {
                    var emission = system.emission;
                    emission.enabled = true;
                }
                remaining = Mathf.Max(0, remaining - assigned);
            }
        }

        private void ApplyRendererBudget(ActionQualityProfile profile)
        {
            if (actorRoot == null) return;
            var shadows = profile.shadowMode != "none";
            foreach (var renderer in actorRoot.GetComponentsInChildren<Renderer>(true))
            {
                if (renderer == null) continue;
                renderer.shadowCastingMode = shadows ? UnityEngine.Rendering.ShadowCastingMode.On : UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = shadows;
                if (renderer is SkinnedMeshRenderer skinned)
                {
                    skinned.updateWhenOffscreen = profile.id == "high";
                    skinned.skinnedMotionVectors = profile.id == "high";
                }
            }
        }

        private void ApplyCameraBudget(ActionQualityProfile profile)
        {
            var cameras = managedCameras;
            if (cameras == null || cameras.Length == 0) cameras = Camera.allCameras;
            foreach (var camera in cameras)
            {
                if (camera == null) continue;
                camera.allowHDR = profile.postProcessing;
                camera.allowMSAA = profile.id != "low";
                camera.useOcclusionCulling = true;
            }
        }
    }
}
