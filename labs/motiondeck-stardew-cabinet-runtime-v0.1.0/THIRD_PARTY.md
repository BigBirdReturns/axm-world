# Third-party boundary

This package does not vendor Stardew Valley, SMAPI, Stardew3DVR, Meta software,
Virtual Desktop, SteamVR, VDXR, or an OpenXR runtime.

The optional native probe/tracker build fetches the official Khronos OpenXR SDK
at the exact commit recorded in `native/CMakeLists.txt`. The OpenXR SDK is
licensed under Apache-2.0. The source package records the upstream commit but
does not redistribute its source or binaries.

Holder-controlled game and mod artifacts remain external. Possession, local
installation, metadata, and source availability are not interpreted as
redistribution permission.
