import { rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

export default function globalTeardown(): void {
  rmSync(resolve(ROOT, "local/playwright-underdrain"), {
    recursive: true,
    force: true,
  });
}
