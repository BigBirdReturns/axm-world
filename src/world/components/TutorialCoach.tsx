// First-run onboarding. Walks a new player through the loop step by step — select a
// contract, assign a party, run it, read what happened — advancing automatically as
// they actually do each thing. Persists "seen" so it only fires once. This is the
// warm-up the world was missing.

import { useEffect, useState, type CSSProperties } from "react";

type Phase = "welcome" | "select" | "assign" | "run" | "done" | "closed";

const SEEN_KEY = "axm-world:onboarded:v1";

interface Props {
  arcName: string;
  selectedId: string | null;
  partyMet: boolean;
  hasRun: boolean;
}

const card: CSSProperties = {
  background: "rgba(23,21,15,0.96)",
  color: "#ece4d4",
  border: "1px solid #4a4238",
  borderRadius: 10,
  padding: "20px 22px",
  maxWidth: 420,
  font: "14px/1.55 'Lora', Georgia, serif",
  boxShadow: "0 20px 60px -20px rgba(0,0,0,0.8)",
};

const btn = (accent: boolean): CSSProperties => ({
  font: "700 14px 'Barlow Condensed', sans-serif",
  letterSpacing: "0.02em",
  padding: "8px 18px",
  borderRadius: 4,
  border: accent ? "none" : "1px solid #4a4238",
  background: accent ? "#b01c18" : "transparent",
  color: accent ? "#fff" : "#a59c8b",
  cursor: "pointer",
});

const LIVE: Record<"select" | "assign" | "run", { n: string; text: string }> = {
  select: { n: "1", text: "Tap a glowing ◆ contract on the board." },
  assign: { n: "2", text: "Assign a party — tap agents in the Roster (top-right) until you meet the requirement." },
  run: { n: "3", text: "Press Run Contract at the bottom." },
};

export function TutorialCoach({ arcName, selectedId, partyMet, hasRun }: Props): JSX.Element | null {
  const [phase, setPhase] = useState<Phase>(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return "closed";
    } catch {
      /* ignore */
    }
    return "welcome";
  });

  useEffect(() => {
    setPhase((p) => {
      if (p === "select" && selectedId) return "assign";
      if (p === "assign" && partyMet) return "run";
      if (p === "run" && hasRun) return "done";
      return p;
    });
  }, [selectedId, partyMet, hasRun]);

  if (phase === "closed") return null;

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("closed");
  };

  // Centered modal beats: welcome + done
  if (phase === "welcome" || phase === "done") {
    const welcome = phase === "welcome";
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(11,10,8,0.55)", pointerEvents: "auto", zIndex: 20 }}>
        <div style={card}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a14a" }}>
            {welcome ? "Welcome" : "That's the loop"}
          </div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, margin: "4px 0 8px" }}>
            {welcome ? arcName : "You're running the charter"}
          </h2>
          <p style={{ color: "#d8cfbd", margin: "0 0 16px" }}>
            {welcome
              ? "You run a guild. Each marker on the board is a contract. Clear them all to complete the charter — I'll walk you through your first one."
              : "Read the outcome and the dispatches on the left to see what actually happened — that's the story unfolding. Stress and morale matter: use Rest / Train / Rally between contracts. Now clear the rest."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {welcome && (
              <button style={btn(false)} onClick={close}>Skip</button>
            )}
            <button style={btn(true)} onClick={() => (welcome ? setPhase("select") : close())}>
              {welcome ? "Begin" : "Got it"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Non-blocking hint bubble for the live steps
  const live = LIVE[phase];
  return (
    <div style={{ position: "absolute", top: 96, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 20 }}>
      <div style={{ ...card, padding: "12px 16px", maxWidth: 380, display: "flex", alignItems: "center", gap: 12, pointerEvents: "auto" }}>
        <div style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: "50%", background: "#b01c18", color: "#fff", display: "grid", placeItems: "center", font: "700 14px 'Barlow Condensed', sans-serif" }}>
          {live.n}
        </div>
        <div style={{ flex: 1, font: "13px/1.4 'IBM Plex Mono', ui-monospace, monospace", color: "#ece4d4" }}>{live.text}</div>
        <button onClick={close} title="Skip tutorial" style={{ flex: "0 0 auto", border: "none", background: "transparent", color: "#6e675a", cursor: "pointer", font: "11px 'IBM Plex Mono', monospace" }}>skip</button>
      </div>
    </div>
  );
}
