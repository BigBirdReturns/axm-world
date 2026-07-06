import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

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

// Emits sw.js at the root of the bundle with the precache list filled in
// from the actual hashed asset filenames of this build (plus the shell,
// manifest, icons and self-hosted fonts, which live in public/ and are
// copied verbatim). The template lives in scripts/sw.template.js.
function swPrecache(): Plugin {
  return {
    name: 'sw-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const hashed = Object.keys(bundle).map((f) => './' + f);
      const shell = [
        './',
        './manifest.webmanifest',
        './fonts.css',
        './icons/icon-192.png',
        './icons/icon-512.png',
        ...readdirSync(join(configDir, 'public/fonts')).map((f) => './fonts/' + f),
      ];
      // replaceAll, not replace: the tokens must be substituted wherever they
      // appear — a single .replace() once hit a mention in the template's
      // header comment and left the real code with an undefined identifier,
      // which made the service worker throw on evaluation (no offline at all).
      const sw = readFileSync(join(configDir, 'scripts/sw.template.js'), 'utf8')
        .replaceAll('__CACHE_VERSION__', `${buildSha}-${Date.now().toString(36)}`)
        .replaceAll('__PRECACHE__', JSON.stringify([...shell, ...hashed]));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
    },
  };
}

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
  plugins: [react(), swPrecache()],
});
