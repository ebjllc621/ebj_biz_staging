/**
 * postbuild.mjs - Standalone deployment preparation
 *
 * Runs automatically after `npm run build` via the "postbuild" npm script.
 * Copies public/ and .next/static/ into .next/standalone/ so the standalone
 * server.js can serve static assets without a separate CDN or reverse proxy.
 *
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output#automatically-copying-traced-files
 */
import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const standaloneDir = join(root, '.next', 'standalone');

if (!existsSync(standaloneDir)) {
  console.log('[postbuild] No .next/standalone/ found — skipping (output: standalone not enabled?)');
  process.exit(0);
}

// 1. Copy public/ → .next/standalone/public/
const publicSrc = join(root, 'public');
const publicDest = join(standaloneDir, 'public');
if (existsSync(publicSrc)) {
  mkdirSync(publicDest, { recursive: true });
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log('[postbuild] Copied public/ → .next/standalone/public/');
} else {
  console.warn('[postbuild] WARNING: No public/ directory found');
}

// 2. Copy .next/static/ → .next/standalone/.next/static/
const staticSrc = join(root, '.next', 'static');
const staticDest = join(standaloneDir, '.next', 'static');
if (existsSync(staticSrc)) {
  mkdirSync(join(standaloneDir, '.next'), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log('[postbuild] Copied .next/static/ → .next/standalone/.next/static/');
} else {
  console.warn('[postbuild] WARNING: No .next/static/ directory found');
}

// 3. Copy ecosystem.config.js → .next/standalone/ (so PM2 can run from standalone dir)
const ecosystemSrc = join(root, 'ecosystem.config.js');
const ecosystemDest = join(standaloneDir, 'ecosystem.config.js');
if (existsSync(ecosystemSrc)) {
  cpSync(ecosystemSrc, ecosystemDest);
  console.log('[postbuild] Copied ecosystem.config.js → .next/standalone/');
}

// 4. Copy .env.production → .next/standalone/ (runtime env vars)
const envSrc = join(root, '.env.production');
const envDest = join(standaloneDir, '.env.production');
if (existsSync(envSrc)) {
  cpSync(envSrc, envDest);
  console.log('[postbuild] Copied .env.production → .next/standalone/');
}

console.log('[postbuild] Standalone deployment package ready.');
console.log('[postbuild] To start: pm2 start .next/standalone/ecosystem.config.js');
