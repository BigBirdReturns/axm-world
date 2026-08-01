import React, { useEffect, useSyncExternalStore } from "react";
import ReactDOM from "react-dom/client";
import { Player } from "../world/Player.js";
import { BurnExternalAssetReceiverRoute } from "../world/external-assets/BurnExternalAssetReceiverRoute.js";
import { ExternalEvidenceProjection } from "../world/external-assets/ExternalEvidenceProjection.js";
import {
  BURN_EXTERNAL_ASSET_SURFACE,
  currentRodohSurface,
  setRodohSurface,
  subscribeRodohSurface,
} from "../world/surface-navigation.js";

function App(): JSX.Element {
  const surface = useSyncExternalStore(
    subscribeRodohSurface,
    currentRodohSurface,
    () => null,
  );

  useEffect(() => {
    // These controls predate the in-process surface host and still carry
    // location.assign fallbacks. Capture their exact test-id controls before the
    // target handler runs, so current and older cartridges open/close the surface
    // without remounting the live world. No generic link interception occurs.
    const intercept = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('[data-testid="open-external-corpus"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setRodohSurface(BURN_EXTERNAL_ASSET_SURFACE);
      } else if (target.closest('[data-testid="external-assets-return-bay"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setRodohSurface(null, "replace");
      }
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, []);

  return (
    <>
      {/* Player remains mounted while a holder-owned presentation surface is
          open. The live run and its process-local evidence session therefore do
          not depend on a page reload or a second save authority. */}
      <Player />
      {surface === null && <ExternalEvidenceProjection />}
      {surface === BURN_EXTERNAL_ASSET_SURFACE && (
        <div
          data-testid="rodoh-surface-overlay"
          style={{ position: "fixed", inset: 0, zIndex: 2_000, overflow: "auto", background: "#0b0a08" }}
        >
          <BurnExternalAssetReceiverRoute />
        </div>
      )}
    </>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);


// The runtime remains a normal web application, but once visited it can boot
// from the holder's own device without a network. The service worker is
// same-origin and scope-bound; it never becomes a decision or custody authority.
if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    const scope = new URL("./", document.baseURI).pathname;
    void navigator.serviceWorker.register(new URL("service-worker.js", document.baseURI), { scope });
  });
}
