import { describe, expect, it } from "vitest";
import fs from "node:fs";

// The boot surface carries the language toggle: without it, a locale persisted
// inside a cartridge (the shell's switcher) locks the bay into that language
// with no way back before entering. Extracted to its own component so the boot
// chunk doesn't pull in the whole shell-regions module.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("boot locale toggle", () => {
  it("the boot surface mounts the SAME LocaleSwitcher the shell uses and subscribes to locale changes", () => {
    const player = read("src/world/Player.tsx");
    expect(player).toContain("<LocaleSwitcher />");
    expect(player).toContain("useLocale();"); // live re-translation on toggle
  });

  it("the switcher lives in components/ (lean boot chunk) and shell call sites are unchanged via re-export", () => {
    const component = read("src/world/components/LocaleSwitcher.tsx");
    expect(component).toContain('data-testid="locale-switcher"');
    expect(component).toContain("t(opt.labelId)"); // labels stay catalog-routed
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain('export { LocaleSwitcher } from "../components/LocaleSwitcher.js"');
  });
});
