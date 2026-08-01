import React, { useSyncExternalStore } from "react";
import ReactDOM from "react-dom/client";
import { Player } from "../world/Player.js";
import { BurnExternalAssetReceiverRoute } from "../world/external-assets/BurnExternalAssetReceiverRoute.js";
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
  return (
    <>
      {/* Player remains mounted while a holder-owned presentation surface is
          open. The live run and its process-local evidence session therefore do
          not depend on a page reload or a second save authority. */}
      <Player />
      {surface === BURN_EXTERNAL_ASSET_SURFACE && (
        <div
          data-testid="rodoh-surface-overlay"
          style={{ position: "fixed", inset: 0, zIndex: 2_000, overflow: "auto", background: "#0b0a08" }}
        >
          <BurnExternalAssetReceiverRoute onClose={() => setRodohSurface(null, "replace")} />
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
