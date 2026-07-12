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

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("./sw.js");
}
