using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Candidate-owned provenance attached to an authored player, enemy, mechanism,
    /// or arena prefab. The marker is presentation evidence only. It grants no
    /// action, physics, campaign, candidate, or receipt authority.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ActionProductionAssetMarker : MonoBehaviour
    {
        public const string Format = "rodoh-action-production-asset/1";

        [SerializeField] private string format = Format;
        [SerializeField] private string assetId = string.Empty;
        [SerializeField] private string role = string.Empty;
        [SerializeField] private string sourceSha256 = string.Empty;
        [SerializeField] private string provenance = string.Empty;
        [SerializeField] private bool productionApproved;
        [SerializeField] private bool generatedPrimitive;

        public string AssetId => assetId;
        public string Role => role;
        public string SourceSha256 => sourceSha256;
        public string Provenance => provenance;
        public bool ProductionApproved => productionApproved;
        public bool GeneratedPrimitive => generatedPrimitive;

        public void Configure(
            string id,
            string assetRole,
            string sourceDigest,
            string sourceProvenance,
            bool approved,
            bool primitive)
        {
            format = Format;
            assetId = id ?? string.Empty;
            role = assetRole ?? string.Empty;
            sourceSha256 = sourceDigest ?? string.Empty;
            provenance = sourceProvenance ?? string.Empty;
            productionApproved = approved;
            generatedPrimitive = primitive;
        }

        public IReadOnlyList<string> Validate(string expectedRole = null)
        {
            var errors = new List<string>();
            if (format != Format) errors.Add("Production asset marker format is unsupported.");
            if (string.IsNullOrWhiteSpace(assetId)) errors.Add("Production asset id is absent.");
            if (string.IsNullOrWhiteSpace(role)) errors.Add("Production asset role is absent.");
            if (!string.IsNullOrWhiteSpace(expectedRole) && role != expectedRole)
            {
                errors.Add("Production asset role is " + role + ", expected " + expectedRole + ".");
            }
            if (!Regex.IsMatch(sourceSha256 ?? string.Empty, "^[0-9a-f]{64}$"))
            {
                errors.Add("Production asset source SHA-256 is absent or malformed.");
            }
            if (string.IsNullOrWhiteSpace(provenance)) errors.Add("Production asset provenance is absent.");
            if (!productionApproved) errors.Add("Production asset has not been approved for the player path.");
            if (generatedPrimitive) errors.Add("Production asset is declared as a generated primitive.");
            return errors;
        }
    }
}
