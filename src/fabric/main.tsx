import React from "react";
import ReactDOM from "react-dom/client";
import { TinyWorldRoute } from "./tiny-world/TinyWorldRoute.js";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <TinyWorldRoute />
  </React.StrictMode>,
);
