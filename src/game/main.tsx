/// <reference types="vite/client" />
import React from "react";
import ReactDOM from "react-dom/client";
import { Player } from "../world/Player.js";

// PWA: register the build-time-generated service worker (production bundles
// only — the dev server never emits sw.js).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + "sw.js")
      .catch(() => {
        /* offline support is best-effort; the game runs fine without it */
      });
  });
  // Fire-and-forget durability request: without persistent storage, Safari
  // evicts all script-writable storage (Cache Storage included) after ~7 days
  // of inactivity. Granted persistence — and installed PWAs, which are exempt
  // by default — keeps the offline cache and any saves from being purged.
  navigator.storage?.persist?.().catch(() => {});
}

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Player />
  </React.StrictMode>,
);
