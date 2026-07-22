import { describe, expect, it } from "vitest";
import { loadSensoryPreferences, saveSensoryPreferences, playPresentationCue } from "../../src/world/sensory-prefs.js";
class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
describe("local-first sensory preferences", () => {
  it("round-trips sound and motion without entering run state", () => {
    const storage = new MemoryStorage();
    expect(loadSensoryPreferences(storage)).toEqual({ sound: true, reducedMotion: false });
    expect(saveSensoryPreferences({ sound: false, reducedMotion: true }, storage)).toBe(true);
    expect(loadSensoryPreferences(storage)).toEqual({ sound: false, reducedMotion: true });
  });
  it("degrades safely when storage or audio is unavailable", () => {
    const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } } as unknown as Storage;
    expect(loadSensoryPreferences(denied)).toEqual({ sound: true, reducedMotion: false });
    expect(saveSensoryPreferences({ sound: true, reducedMotion: false }, denied)).toBe(false);
    expect(() => playPresentationCue("enter", "first-charter")).not.toThrow();
  });
});
