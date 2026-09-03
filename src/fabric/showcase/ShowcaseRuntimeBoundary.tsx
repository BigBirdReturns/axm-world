import { Component, type ErrorInfo, type ReactNode } from "react";

interface ShowcaseRuntimeBoundaryProps {
  readonly children: ReactNode;
}

interface ShowcaseRuntimeBoundaryState {
  readonly failed: boolean;
  readonly message: string;
}

export class ShowcaseRuntimeBoundary extends Component<
  ShowcaseRuntimeBoundaryProps,
  ShowcaseRuntimeBoundaryState
> {
  public state: ShowcaseRuntimeBoundaryState = {
    failed: false,
    message: "",
  };

  public static getDerivedStateFromError(error: unknown): ShowcaseRuntimeBoundaryState {
    return {
      failed: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  public componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.warn("AXM showcase runtime entered its bounded fallback", {
      error: error instanceof Error ? error.message : String(error),
      componentStack: info.componentStack,
    });
  }

  public render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="showcase-runtime-fallback" data-testid="showcase-runtime-fallback">
        <section>
          <div className="showcase-runtime-fallback__eyebrow">AXM INFINITE FABRIC · BOUNDED FALLBACK</div>
          <h1>The live rendering path stopped before it could make a claim.</h1>
          <p>
            The source-bound demonstration program remains available. Reload the live
            renderer, open the static evidence reel when packaged, or continue into the
            underlying Tiny World without treating this fallback as product acceptance.
          </p>
          <div className="showcase-runtime-fallback__actions">
            <button type="button" onClick={() => globalThis.location.reload()}>reload renderer</button>
            <a href="./fabric.html">open Tiny World</a>
            <a href="./capture/axm-infinite-fabric-showcase.webm">open packaged reel</a>
          </div>
          <details>
            <summary>failure detail</summary>
            <pre>{this.state.message}</pre>
          </details>
        </section>
      </main>
    );
  }
}
