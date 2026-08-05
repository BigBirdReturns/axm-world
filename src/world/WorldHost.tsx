// Composition root for one playing cartridge. Capability dispatch happens
// before simulation founding: a canonical story is an Arc-governed fixed path,
// not an empty or fabricated Organization.

import { readCanonicalStoryExtension } from "../canonical-story/index.js";
import type { Cartridge } from "./cartridge.js";
import { useArcWorld } from "./useArcWorld.js";
import { RuntimeRouter } from "./runtime/RuntimeRouter.js";
import { SequenceHost } from "./sequence/SequenceHost.js";
import {
  arcCarriesApertureTimedMedia,
  readApertureTimedMediaForStory,
} from "./timed-media/receiver.js";

export interface WorldHostProps {
  cartridge: Cartridge;
  onExit: () => void;
}

function SimulationWorldHost({ cartridge, onExit }: WorldHostProps): JSX.Element {
  const world = useArcWorld(cartridge);
  return <RuntimeRouter world={world} onExit={onExit} />;
}

interface RefusalProps {
  title: string;
  message: string;
  testId: string;
  onExit: () => void;
}

function InvalidCanonicalStory({ title, message, testId, onExit }: RefusalProps): JSX.Element {
  return (
    <main
      data-testid={testId}
      role="alert"
      style={{
        minHeight: "100dvh",
        boxSizing: "border-box",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0a08",
        color: "#ece4d4",
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      }}
    >
      <section style={{ width: "min(680px, 100%)", border: "1px solid #7a352f", padding: 18, background: "#17120f" }}>
        <h1 style={{ marginTop: 0, font: "800 27px 'Barlow Condensed', sans-serif" }}>{title}</h1>
        <p style={{ color: "#d7c4bf", lineHeight: 1.6 }}>{message}</p>
        <button
          type="button"
          onClick={onExit}
          style={{ border: "1px solid #6b5e4c", background: "#201c15", color: "#ece4d4", padding: "9px 12px", cursor: "pointer" }}
        >
          Exit to cartridge bay
        </button>
      </section>
    </main>
  );
}

export function WorldHost({ cartridge, onExit }: WorldHostProps): JSX.Element {
  let story = null;
  try {
    story = readCanonicalStoryExtension(cartridge.arc);
  } catch (error) {
    return (
      <InvalidCanonicalStory
        title="Canonical story refused"
        message={error instanceof Error ? error.message : String(error)}
        testId="invalid-canonical-story"
        onExit={onExit}
      />
    );
  }

  if (story) {
    try {
      const timedMedia = readApertureTimedMediaForStory(cartridge.arc, story);
      return (
        <SequenceHost
          cartridge={cartridge}
          story={story}
          timedMedia={timedMedia}
          onExit={onExit}
        />
      );
    } catch (error) {
      return (
        <InvalidCanonicalStory
          title="Aperture timed media refused"
          message={error instanceof Error ? error.message : String(error)}
          testId="invalid-aperture-timed-media"
          onExit={onExit}
        />
      );
    }
  }

  if (arcCarriesApertureTimedMedia(cartridge.arc)) {
    return (
      <InvalidCanonicalStory
        title="Orphan Aperture timed media refused"
        message="The Arc carries timed-media records without the canonical-story authority they must identify. World will not route an orphan narrative extension into simulation."
        testId="invalid-aperture-timed-media"
        onExit={onExit}
      />
    );
  }

  return <SimulationWorldHost cartridge={cartridge} onExit={onExit} />;
}
