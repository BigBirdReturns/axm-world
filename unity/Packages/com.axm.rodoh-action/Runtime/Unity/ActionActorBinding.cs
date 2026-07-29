using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Binds an authored Unity body to one deterministic action actor. Animator root
    /// motion is disabled because Arc integer state owns locomotion and contact.
    /// </summary>
    public sealed class ActionActorBinding : MonoBehaviour
    {
        [SerializeField] private string actorId = "player";
        [SerializeField] private Animator animator;
        [SerializeField] private Transform visualRoot;

        public string ActorId => actorId;
        public Animator Animator => animator;
        public Transform VisualRoot => visualRoot != null ? visualRoot : transform;

        public void Configure(string id, Animator actorAnimator, Transform root = null)
        {
            actorId = id ?? string.Empty;
            animator = actorAnimator;
            visualRoot = root;
            if (animator != null) animator.applyRootMotion = false;
        }

        private void Awake()
        {
            if (animator == null) animator = GetComponentInChildren<Animator>();
            if (animator != null) animator.applyRootMotion = false;
        }

        private void OnValidate()
        {
            if (animator == null) animator = GetComponentInChildren<Animator>();
            if (animator != null) animator.applyRootMotion = false;
        }
    }
}
