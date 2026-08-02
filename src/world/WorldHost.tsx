// Composition root for a playing cartridge. One ArcWorld is created once and
// survives the guided opening -> reusable Rodoh runtime handoff.

import { useMemo } from "react";
import type { Cartridge } from "./cartridge.js";
import { useArcWorld } from "./useArcWorld.js";
import { RuntimeRouter } from "./runtime/RuntimeRouter.js";
import { ExternalAssetReceiverProvider } from "./external-assets-context.js";
import { ExternalAssetDock } from "./components/ExternalAssetDock.js";

export interface WorldHostProps {
  cartridge: Cartridge;
  onExit: () => void;
}

export function WorldHost({ cartridge, onExit }: WorldHostProps): JSX.Element {
  const world = useArcWorld(cartridge);
  const current = useMemo(() => {
    const extension = cartridge.arc.extensions?.["godscar.common-ship@1"] as {
      format?: unknown;
      notes?: { exactParentSha256?: unknown };
    } | undefined;
    return {
      id: cartridge.arc.meta.id,
      version: cartridge.arc.meta.version,
      engineVersion: cartridge.arc.meta.engineVersion,
      authoredArcDigest: world.cartridgeDigest,
      sourcePlane: typeof extension?.format === "string" ? extension.format : null,
      exactParentSha256: typeof extension?.notes?.exactParentSha256 === "string"
        ? extension.notes.exactParentSha256
        : null,
    };
  }, [cartridge, world.cartridgeDigest]);

  return (
    <ExternalAssetReceiverProvider current={current}>
      <RuntimeRouter world={world} onExit={onExit} />
      <ExternalAssetDock />
    </ExternalAssetReceiverProvider>
  );
}
