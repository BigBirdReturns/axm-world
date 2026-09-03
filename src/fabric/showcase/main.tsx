import React from "react";
import ReactDOM from "react-dom/client";
import { ShowcaseRoute } from "./ShowcaseRoute.js";
import "./showcase-layout.css";
import "./showcase-camera.css";
import "./showcase-fit.css";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ShowcaseRoute />
  </React.StrictMode>,
);
