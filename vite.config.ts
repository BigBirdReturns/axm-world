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
 * GitHub Pages publishes this product below /axm-world/game/. Playwright and
 * local operator links intentionally exercise that deployed path, while Vite's
 * development root is /. Rewrite only that exact Pages prefix so the same URL
 * resolves to the same bytes in development, CI, and the published product.
 */
function pagesPrefixDevRewrite(): Plugin {
  const prefix = "/axm-world/game";
  return {
    name: "rodoh-pages-prefix-dev-rewrite",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const raw = request.url;
        if (!raw) {
          next();
          return;
        }
        const queryIndex = raw.indexOf("?");
        const pathname = queryIndex < 0 ? raw : raw.slice(0, queryIndex);
        const search = queryIndex < 0 ? "" : raw.slice(queryIndex);
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
          request.url = `${pathname.slice(prefix.length) || "/"}${search}`;
        }
        next();
      });
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
  plugins: [
    react(),
    pagesPrefixDevRewrite(),
    mobileProviderSyntaxGate(),
    copyGameToDocs(),
  ],
  build: {
    target: ["chrome87", "safari14", "edge88", "firefox78"],
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        rodoh: resolve(__dirname, "index.html"),
        fabric: resolve(__dirname, "fabric.html"),
        classics: resolve(__dirname, "classics.html"),
        showcase: resolve(__dirname, "showcase.html"),
        studio: resolve(__dirname, "studio.html"),
      },
    },
  },
});
