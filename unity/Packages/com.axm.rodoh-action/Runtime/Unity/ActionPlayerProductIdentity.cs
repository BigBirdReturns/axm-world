using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Serialized identity installed only after the authored scene, production
    /// assets, Arc projection, and player-product profile pass the editor gate. It is
    /// an import/build identity, not a player-comprehension or product-acceptance
    /// receipt.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ActionPlayerProductIdentity : MonoBehaviour
    {
        public const string Format = "rodoh-action-player-product-identity/1";

        [SerializeField] private string format = Format;
        [SerializeField] private string qualification = "source-and-scene-qualified";
        [SerializeField] private string productId = string.Empty;
        [SerializeField] private string productProfileSha256 = string.Empty;
        [SerializeField] private string worldCommit = string.Empty;
        [SerializeField] private string arcCommit = string.Empty;
        [SerializeField] private string actionSpecDigest = string.Empty;
        [SerializeField] private string arcDigest = string.Empty;
        [SerializeField] private string challengeId = string.Empty;
        [SerializeField] private string timingProfileId = string.Empty;
        [SerializeField] private string presentationManifestId = string.Empty;
        [SerializeField] private string presentationManifestSha256 = string.Empty;
        [SerializeField] private string presentationAdapterId = string.Empty;
        [SerializeField] private string sceneJobDigest = string.Empty;
        [SerializeField] private string[] productionAssetIds = Array.Empty<string>();
        [SerializeField] private bool primitiveFallbackUsed;
        [SerializeField] private bool diagnosticPresentationUsed;
        [SerializeField] private bool unityPhysicsCombatAuthority;
        [SerializeField] private bool runtimeMayIssueComprehensionReceipt;

        public string ProductId => productId;
        public string ProductProfileSha256 => productProfileSha256;
        public string WorldCommit => worldCommit;
        public string ArcCommit => arcCommit;
        public string ActionSpecDigest => actionSpecDigest;
        public string ArcDigest => arcDigest;
        public string ChallengeId => challengeId;
        public string TimingProfileId => timingProfileId;
        public string PresentationManifestId => presentationManifestId;
        public string PresentationManifestSha256 => presentationManifestSha256;
        public string PresentationAdapterId => presentationAdapterId;
        public string SceneJobDigest => sceneJobDigest;
        public IReadOnlyList<string> ProductionAssetIds => productionAssetIds ?? Array.Empty<string>();
        public bool PrimitiveFallbackUsed => primitiveFallbackUsed;
        public bool DiagnosticPresentationUsed => diagnosticPresentationUsed;
        public bool UnityPhysicsCombatAuthority => unityPhysicsCombatAuthority;
        public bool RuntimeMayIssueComprehensionReceipt => runtimeMayIssueComprehensionReceipt;
        public string Qualification => qualification;

        public void Configure(
            string id,
            string profileSha256,
            string worldSha,
            string arcSha,
            string specDigest,
            string sourceArcDigest,
            string challenge,
            string timingProfile,
            string manifestId,
            string manifestSha256,
            string adapterId,
            string jobDigest,
            string[] assetIds)
        {
            format = Format;
            qualification = "source-and-scene-qualified";
            productId = id ?? string.Empty;
            productProfileSha256 = profileSha256 ?? string.Empty;
            worldCommit = worldSha ?? string.Empty;
            arcCommit = arcSha ?? string.Empty;
            actionSpecDigest = specDigest ?? string.Empty;
            arcDigest = sourceArcDigest ?? string.Empty;
            challengeId = challenge ?? string.Empty;
            timingProfileId = timingProfile ?? string.Empty;
            presentationManifestId = manifestId ?? string.Empty;
            presentationManifestSha256 = manifestSha256 ?? string.Empty;
            presentationAdapterId = adapterId ?? string.Empty;
            sceneJobDigest = jobDigest ?? string.Empty;
            productionAssetIds = assetIds ?? Array.Empty<string>();
            primitiveFallbackUsed = false;
            diagnosticPresentationUsed = false;
            unityPhysicsCombatAuthority = false;
            runtimeMayIssueComprehensionReceipt = false;
        }

        public IReadOnlyList<string> Validate()
        {
            var errors = new List<string>();
            if (format != Format) errors.Add("Player-product identity format is unsupported.");
            if (qualification != "source-and-scene-qualified") errors.Add("Player-product qualification label is unsupported.");
            if (string.IsNullOrWhiteSpace(productId)) errors.Add("Player-product id is absent.");
            if (!Sha256(productProfileSha256)) errors.Add("Player-product profile SHA-256 is malformed.");
            if (!Commit(worldCommit)) errors.Add("World commit identity is malformed.");
            if (!Commit(arcCommit)) errors.Add("Arc commit identity is malformed.");
            if (!Digest(actionSpecDigest, "actspec1_")) errors.Add("Action-spec digest is malformed.");
            if (!Digest(arcDigest, "cart1_")) errors.Add("Arc digest is malformed.");
            if (string.IsNullOrWhiteSpace(challengeId)) errors.Add("Challenge identity is absent.");
            if (string.IsNullOrWhiteSpace(timingProfileId)) errors.Add("Timing-profile identity is absent.");
            if (string.IsNullOrWhiteSpace(presentationManifestId)) errors.Add("Presentation manifest identity is absent.");
            if (!Sha256(presentationManifestSha256)) errors.Add("Presentation manifest SHA-256 is malformed.");
            if (presentationAdapterId != "production.prefab/v1") errors.Add("Player product is not bound to the production presentation adapter.");
            if (!Digest(sceneJobDigest, "unityjob1_")) errors.Add("Unity scene-job digest is malformed.");
            if (productionAssetIds == null || productionAssetIds.Length < 7) errors.Add("Player product lacks the required production asset identities.");
            if (primitiveFallbackUsed) errors.Add("Player product records a primitive fallback.");
            if (diagnosticPresentationUsed) errors.Add("Player product records diagnostic presentation.");
            if (unityPhysicsCombatAuthority) errors.Add("Player product records Unity physics combat authority.");
            if (runtimeMayIssueComprehensionReceipt) errors.Add("Runtime may not issue a comprehension receipt.");
            return errors;
        }

        private static bool Commit(string value)
        {
            return Regex.IsMatch(value ?? string.Empty, "^[0-9a-f]{40}$");
        }

        private static bool Sha256(string value)
        {
            return Regex.IsMatch(value ?? string.Empty, "^[0-9a-f]{64}$");
        }

        private static bool Digest(string value, string prefix)
        {
            return Regex.IsMatch(value ?? string.Empty, "^" + Regex.Escape(prefix) + "[0-9a-f]{64}$");
        }
    }
}
