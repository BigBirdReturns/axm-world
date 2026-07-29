using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Candidate-owned provenance attached to an authored player, enemy, mechanism,
    /// or arena prefab. The marker preserves a separately supplied named approval
    /// assertion over exact imported visual-source bytes. It grants no action,
    /// physics, campaign, candidate, receipt, or product-acceptance authority.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ActionProductionAssetMarker : MonoBehaviour
    {
        public const string Format = "rodoh-action-production-asset/2";
        public const string ApprovalFormat = "rodoh-action-production-asset-approval/1";

        [SerializeField] private string format = Format;
        [SerializeField] private string assetId = string.Empty;
        [SerializeField] private string role = string.Empty;
        [SerializeField] private string sourceSha256 = string.Empty;
        [SerializeField] private string provenance = string.Empty;
        [SerializeField] private string approvalRecordFormat = ApprovalFormat;
        [SerializeField] private string approvalId = string.Empty;
        [SerializeField] private string approvalAuthorityId = string.Empty;
        [SerializeField] private string approvalName = string.Empty;
        [SerializeField] private string approvalAttestation = string.Empty;
        [SerializeField] private string approvedAt = string.Empty;
        [SerializeField] private bool productionApproved;
        [SerializeField] private bool generatedPrimitive;

        public string AssetId => assetId;
        public string Role => role;
        public string SourceSha256 => sourceSha256;
        public string Provenance => provenance;
        public string ApprovalId => approvalId;
        public string ApprovalAuthorityId => approvalAuthorityId;
        public string ApprovalName => approvalName;
        public string ApprovalAttestation => approvalAttestation;
        public string ApprovedAt => approvedAt;
        public bool ProductionApproved => productionApproved;
        public bool GeneratedPrimitive => generatedPrimitive;

        public void Configure(
            string id,
            string assetRole,
            string sourceDigest,
            string sourceProvenance,
            string namedApprovalId,
            string namedApprovalAuthorityId,
            string namedApproval,
            string namedApprovalAttestation,
            string approvedAtUtc,
            bool approved,
            bool primitive)
        {
            format = Format;
            assetId = id ?? string.Empty;
            role = assetRole ?? string.Empty;
            sourceSha256 = sourceDigest ?? string.Empty;
            provenance = sourceProvenance ?? string.Empty;
            approvalRecordFormat = ApprovalFormat;
            approvalId = namedApprovalId ?? string.Empty;
            approvalAuthorityId = namedApprovalAuthorityId ?? string.Empty;
            approvalName = namedApproval ?? string.Empty;
            approvalAttestation = namedApprovalAttestation ?? string.Empty;
            approvedAt = approvedAtUtc ?? string.Empty;
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
            if (approvalRecordFormat != ApprovalFormat) errors.Add("Production asset approval format is unsupported.");
            if (string.IsNullOrWhiteSpace(approvalId)) errors.Add("Production asset approval id is absent.");
            if (string.IsNullOrWhiteSpace(approvalAuthorityId)) errors.Add("Production asset approval authority is absent.");
            if (string.IsNullOrWhiteSpace(approvalName)) errors.Add("Production asset approval name is absent.");
            if (string.IsNullOrWhiteSpace(approvalAttestation)) errors.Add("Production asset approval attestation is absent.");
            if (!DateTime.TryParse(approvedAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out _))
            {
                errors.Add("Production asset approval time is absent or malformed.");
            }
            if (!productionApproved) errors.Add("Production asset has not received named approval for the player path.");
            if (generatedPrimitive) errors.Add("Production asset is declared as a generated primitive.");
            return errors;
        }
    }
}