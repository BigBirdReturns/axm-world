export type ShowcaseCue = "open" | "advance" | "accept" | "seal" | "custody";

interface CueNote {
  frequency: number;
  delay: number;
  duration: number;
  gain: number;
  type: OscillatorType;
}

const CUES: Record<ShowcaseCue, readonly CueNote[]> = {
  open: [
    { frequency: 110, delay: 0, duration: 0.55, gain: 0.12, type: "sine" },
    { frequency: 220, delay: 0.14, duration: 0.48, gain: 0.08, type: "triangle" },
    { frequency: 330, delay: 0.29, duration: 0.5, gain: 0.055, type: "sine" },
  ],
  advance: [
    { frequency: 260, delay: 0, duration: 0.12, gain: 0.045, type: "triangle" },
    { frequency: 390, delay: 0.07, duration: 0.16, gain: 0.035, type: "sine" },
  ],
  accept: [
    { frequency: 196, delay: 0, duration: 0.32, gain: 0.07, type: "triangle" },
    { frequency: 293.66, delay: 0.08, duration: 0.34, gain: 0.055, type: "sine" },
    { frequency: 440, delay: 0.18, duration: 0.42, gain: 0.05, type: "sine" },
  ],
  seal: [
    { frequency: 329.63, delay: 0, duration: 0.24, gain: 0.055, type: "triangle" },
    { frequency: 493.88, delay: 0.08, duration: 0.28, gain: 0.05, type: "triangle" },
    { frequency: 659.25, delay: 0.17, duration: 0.45, gain: 0.045, type: "sine" },
  ],
  custody: [
    { frequency: 146.83, delay: 0, duration: 0.58, gain: 0.075, type: "sine" },
    { frequency: 220, delay: 0.16, duration: 0.62, gain: 0.055, type: "sine" },
    { frequency: 293.66, delay: 0.32, duration: 0.7, gain: 0.045, type: "triangle" },
  ],
};

export class ShowcaseAudio {
  #context: AudioContext | null = null;
  #enabled = false;

  get enabled(): boolean {
    return this.#enabled;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.#enabled = enabled;
    if (!enabled) return;
    const Context = globalThis.AudioContext;
    if (!Context) {
      this.#enabled = false;
      return;
    }
    this.#context ??= new Context();
    if (this.#context.state === "suspended") await this.#context.resume();
  }

  async cue(cue: ShowcaseCue): Promise<void> {
    if (!this.#enabled) return;
    await this.setEnabled(true);
    const context = this.#context;
    if (!context) return;
    const now = context.currentTime + 0.012;
    for (const note of CUES[cue]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.frequency, now + note.delay);
      gain.gain.setValueAtTime(0.0001, now + note.delay);
      gain.gain.exponentialRampToValueAtTime(note.gain, now + note.delay + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + note.delay);
      oscillator.stop(now + note.delay + note.duration + 0.02);
    }
  }

  close(): void {
    void this.#context?.close();
    this.#context = null;
    this.#enabled = false;
  }
}
