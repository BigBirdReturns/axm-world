import React from "react";
import ReactDOM from "react-dom/client";
import { Player } from "../world/Player.js";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Player />
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
