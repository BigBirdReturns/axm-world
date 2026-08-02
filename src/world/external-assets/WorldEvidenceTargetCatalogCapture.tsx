import { useEffect, type ReactNode } from "react";
import type { Arc } from "../../engine/types.js";
import {
  BURN_PROTOCOL_AUTHORED_DIGEST,
  BURN_PROTOCOL_CARTRIDGE_ID,
} from "../external-assets.js";
import {
  buildBurnWorldEvidenceTargetCatalog,
  clearBurnWorldEvidenceTargetCatalog,
  installBurnWorldEvidenceTargetCatalog,
} from "./world-evidence-crosswalk.js";

/** Install a process-local read model of authored target identifiers while the
 * exact Burn cartridge is mounted. The capture owns no organization state and
 * provides no interaction callback to the evidence projection. */
export function WorldEvidenceTargetCatalogCapture({
  arc,
  children,
}: {
  arc: Arc;
  children: ReactNode;
}): JSX.Element {
  useEffect(() => {
    if (arc.meta.id !== BURN_PROTOCOL_CARTRIDGE_ID) return;
    let active = true;
    void buildBurnWorldEvidenceTargetCatalog(arc)
      .then((catalog) => {
        if (active) installBurnWorldEvidenceTargetCatalog(catalog);
      })
      .catch(() => {
        if (active) clearBurnWorldEvidenceTargetCatalog(BURN_PROTOCOL_AUTHORED_DIGEST);
      });
    return () => {
      active = false;
      clearBurnWorldEvidenceTargetCatalog(BURN_PROTOCOL_AUTHORED_DIGEST);
    };
  }, [arc]);

  return <>{children}</>;
}
