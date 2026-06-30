import "./pixel-ui.css";

type PixelMeterProps = {
  value: number;
  max?: number;
  segments?: number;
  color?: string;
  label?: string;
};

export function PixelMeter({ value, max = 100, segments = 5, color, label }: PixelMeterProps): JSX.Element {
  const filled = Math.max(0, Math.min(segments, Math.round((value / max) * segments)));
  return (
    <div aria-label={label} className="pixel-meter" style={{ "--segments": segments, "--meter-color": color } as React.CSSProperties}>
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className="pixel-meter__segment" data-filled={index < filled} />
      ))}
    </div>
  );
}
