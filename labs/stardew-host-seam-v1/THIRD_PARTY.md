# Third-party boundary

This repository contains **no Stardew Valley game files, SMAPI binaries, Nexus packages, community-mod DLLs, expansion assets, or extracted renderer code**.

References in source, tests, policy, and documentation identify interoperability targets only.

| Component | Upstream control | How this package uses it |
|---|---|---|
| Stardew Valley | ConcernedApe / platform holder | Detects a user-owned installation; never redistributes game content |
| SMAPI | Pathoschild, LGPL-3.0 | Launch and mod-host interoperability target; no binary vendored |
| Pathoschild.Stardew.ModBuildConfig | Pathoschild | NuGet build-time dependency declared by the optional C# bridge project |
| Content Patcher | Pathoschild, MIT | Known content-framework identity and compatibility corpus; no binary vendored |
| Stardew3DVR | GingasVR / upstream distribution permissions | Externally acquired presentation adapter; only its public manifest identity and declared behavior are referenced |
| Generic Mod Config Menu | upstream author | Optional configuration surface identity; no binary vendored |
| Clear Glasses | aurpine, MPL-2.0 | Known incompatibility fixture identified by public manifest ID; no source or binary copied |
| Stardrop and other managers | respective authors | Optional upstream composition tools; no code copied |
| Expansion and framework mods | respective authors | Externally acquired qualification corpora; no content copied |

A local profile lock may contain user-machine paths, manifest metadata, and hashes of holder-acquired files. Those records are evidence about the local installation, not redistributed copies of those files.
