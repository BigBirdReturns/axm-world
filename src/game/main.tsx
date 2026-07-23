import "./fonts.js";
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
