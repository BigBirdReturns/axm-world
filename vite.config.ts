import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

let buildSha = 'dev';
try {
  buildSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a git checkout — leave as 'dev' */
}

// Build-time deploy variant. Flips positioning copy on the entry surfaces
// (title screen CTAs and kicker) without forking code — the engine and all
// gameplay remain identical. Set via `VITE_VARIANT=enterprise-first npm run
// build` (or VARIANT=...). Default is game-first.
const VALID_VARIANTS = ['game-first', 'enterprise-first', 'research-first'] as const;
const rawVariant = process.env.VITE_VARIANT ?? process.env.VARIANT ?? 'game-first';
if (!(VALID_VARIANTS as readonly string[]).includes(rawVariant)) {
  throw new Error(
    `Invalid VITE_VARIANT="${rawVariant}". Must be one of: ${VALID_VARIANTS.join(', ')}`,
  );
}
const variant = rawVariant;

// Public base path the built demo is served from. On GitHub Pages this repo
// publishes to https://<owner>.github.io/axm-world/, with the playable demo
// under /game/ (the landing page sits at the root). Override with VITE_BASE
// for a different host (e.g. a custom domain → '/game/').
const base = process.env.VITE_BASE ?? '/axm-world/game/';

export default defineConfig({
  base,
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
    __VARIANT__: JSON.stringify(variant),
  },
  build: {
    outDir: 'docs/game',
    emptyOutDir: true,
  },
  plugins: [react()],
});
