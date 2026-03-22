/**
 * Node.js built-in module stub for Turbopack client bundles
 *
 * The media service chain (useUniversalMedia → MediaService → LocalMediaProvider/MirrorService)
 * imports Node.js built-ins (fs, path, crypto) that don't exist in the browser.
 * Webpack handles this via resolve.fallback: { fs: false, path: false, ... }
 * Turbopack needs explicit stub modules instead.
 *
 * This stub provides safe no-op exports for all Node.js built-ins used in the chain.
 *
 * @see next.config.js - turbo.resolveAlias configuration
 */

// Common pattern: export empty object as default and named
module.exports = {};
module.exports.default = {};

// fs stubs (used by LocalMediaProvider, MirrorService)
module.exports.promises = {
  readFile: async () => Buffer.from(''),
  writeFile: async () => {},
  mkdir: async () => {},
  unlink: async () => {},
  stat: async () => ({ size: 0, isFile: () => false, isDirectory: () => false }),
  readdir: async () => [],
  access: async () => {},
};
module.exports.readFileSync = () => '';
module.exports.existsSync = () => false;

// path stubs (used by MediaService, LocalMediaProvider, MirrorService)
module.exports.join = (...args) => args.join('/');
module.exports.resolve = (...args) => args.join('/');
module.exports.basename = (p) => p ? p.split('/').pop() || '' : '';
module.exports.dirname = (p) => p ? p.split('/').slice(0, -1).join('/') || '.' : '.';
module.exports.extname = (p) => { const m = p && p.match(/\.[^.]+$/); return m ? m[0] : ''; };
module.exports.relative = (from, to) => to || '';
module.exports.sep = '/';

// crypto stubs (used by CloudinaryMediaProvider, LocalMediaProvider)
module.exports.randomUUID = () => '00000000-0000-0000-0000-000000000000';
module.exports.createHash = () => ({ update: () => ({ digest: () => '' }) });
