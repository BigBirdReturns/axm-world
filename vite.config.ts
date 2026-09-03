import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

function copyGameToDocs(): Plugin {
  return {
    name: "copy-game-to-docs",
    apply: "build",
    closeBundle() {
      rmSync("docs/game", { recursive: true, force: true });
      mkdirSync("docs/game", { recursive: true });
      cpSync("dist", "docs/game", { recursive: true });
    },
  };
}

/**
 * Browser/WebView compatibility must not be weakened by a local `vite --host`
 * convenience. This gate runs after every production transform and rejects
 * syntax outside the published Rodoh floor.
 */
function mobileProviderSyntaxGate(): Plugin {
  const allowedTargets = ["chrome87", "safari14", "edge88", "firefox78"] as const;
  return {
    name: "rodoh-mobile-provider-syntax-gate",
    apply: "build",
    enforce: "post",
    async generateBundle(_options, bundle) {
      const { transform } = await import("esbuild");
      for (const entry of Object.values(bundle)) {
        if (entry.type !== "chunk") continue;
        try {
          await transform(entry.code, {
            loader: "js",
            target: [...allowedTargets],
            supported: {
              "top-level-await": false,
            },
          });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          this.error(`Mobile provider syntax gate failed for ${entry.fileName}: ${detail}`);
        }
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), mobileProviderSyntaxGate(), copyGameToDocs()],
  build: {
    target: ["chrome87", "safari14", "edge88", "firefox78"],
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        rodoh: resolve(__dirname, "index.html"),
        fabric: resolve(__dirname, "fabric.html"),
      },
    },
  },
});
