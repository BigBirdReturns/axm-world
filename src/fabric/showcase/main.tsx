import React from "react";
import ReactDOM from "react-dom/client";
import { computeDemonstrationDigest } from "../../demonstration/compiler.js";
import { ShowcaseRuntimeBoundary } from "./ShowcaseRuntimeBoundary.js";
import { ShowcaseRoute } from "./ShowcaseRoute.js";
import {
  ACTIVE_SHOWCASE,
  ACTIVE_SHOWCASE_RESOLUTION,
} from "./timeline.js";
import "./showcase-layout.css";
import "./showcase-camera.css";
import "./showcase-fit.css";
import "./showcase-production.css";

interface AxmShowcaseRuntimeState {
  readonly format: "axm-showcase-runtime/1";
  readonly programId: string;
  readonly programVersion: string;
  readonly productId: string;
  readonly editionId: string;
  readonly proposalId: string;
  readonly proposalStatus: string;
  readonly aspect: string;
  readonly totalDurationMs: number;
  readonly chapterIds: readonly string[];
  readonly evidenceIds: readonly string[];
  digest: string | null;
  ready: boolean;
}

declare global {
  interface Window {
    AxmShowcaseRuntime: AxmShowcaseRuntimeState;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");

const runtime: AxmShowcaseRuntimeState = {
  format: "axm-showcase-runtime/1",
  programId: ACTIVE_SHOWCASE.programId,
  programVersion: ACTIVE_SHOWCASE.programVersion,
  productId: ACTIVE_SHOWCASE.productId,
  editionId: ACTIVE_SHOWCASE.edition.id,
  proposalId: ACTIVE_SHOWCASE.proposal.id,
  proposalStatus: ACTIVE_SHOWCASE_RESOLUTION.status,
  aspect: ACTIVE_SHOWCASE.aspect,
  totalDurationMs: ACTIVE_SHOWCASE.totalDurationMs,
  chapterIds: ACTIVE_SHOWCASE.chapters.map((chapter) => chapter.id),
  evidenceIds: ACTIVE_SHOWCASE.evidence.map((entry) => entry.id),
  digest: null,
  ready: false,
};
window.AxmShowcaseRuntime = runtime;

const html = document.documentElement;
html.dataset.demoProgram = runtime.programId;
html.dataset.demoVersion = runtime.programVersion;
html.dataset.demoEdition = runtime.editionId;
html.dataset.demoProposalStatus = runtime.proposalStatus;
html.dataset.demoAspect = runtime.aspect;
html.dataset.demoReady = "false";
html.dataset.demoDigest = "pending";

if (ACTIVE_SHOWCASE_RESOLUTION.error) {
  console.warn(ACTIVE_SHOWCASE_RESOLUTION.error);
}

void computeDemonstrationDigest(ACTIVE_SHOWCASE)
  .then((digest) => {
    runtime.digest = digest;
    html.dataset.demoDigest = digest;
  })
  .catch((error: unknown) => {
    html.dataset.demoDigest = "held";
    console.warn(
      "AXM showcase could not compute its demonstration digest",
      error instanceof Error ? error.message : String(error),
    );
  });

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ShowcaseRuntimeBoundary>
      <ShowcaseRoute />
    </ShowcaseRuntimeBoundary>
  </React.StrictMode>,
);

const markRuntimeReady = (): void => {
  const showcase = root.querySelector("[data-testid='infinite-fabric-showcase']");
  if (!showcase) return;
  runtime.ready = true;
  html.dataset.demoReady = "true";
  readyObserver.disconnect();
};
const readyObserver = new MutationObserver(markRuntimeReady);
readyObserver.observe(root, { childList: true, subtree: true });
markRuntimeReady();

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
