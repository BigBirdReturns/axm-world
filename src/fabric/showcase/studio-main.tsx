import React from "react";
import ReactDOM from "react-dom/client";
import { StudioRoute } from "./StudioRoute.js";
import "./studio.css";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <StudioRoute />
  </React.StrictMode>,
);

if (
  "serviceWorker" in navigator
  && (window.isSecureContext || window.location.hostname === "localhost")
) {
  window.addEventListener("load", () => {
    const scope = new URL("./", document.baseURI).pathname;
    void navigator.serviceWorker.register(
      new URL("service-worker.js", document.baseURI),
      { scope },
    );
  });
}
