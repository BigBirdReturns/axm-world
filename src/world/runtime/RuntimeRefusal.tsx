interface RefusalProps {
  title: string;
  message: string;
  testId: string;
  onExit: () => void;
}

export function RuntimeRefusal({ title, message, testId, onExit }: RefusalProps): JSX.Element {
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
