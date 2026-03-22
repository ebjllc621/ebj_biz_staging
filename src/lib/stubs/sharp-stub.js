/**
 * Sharp stub for client-side bundles (Turbopack + Webpack)
 *
 * sharp is a server-only image processing library that uses native Node.js bindings.
 * It leaks into client bundles via: useUniversalMedia → MediaService → LocalMediaProvider → sharp
 *
 * This stub prevents the build error: "Module not found: Can't resolve 'child_process'"
 * caused by detect-libc (a sharp dependency) requiring child_process in the browser.
 *
 * @see next.config.js - turbo.resolveAlias and webpack resolve.alias configurations
 */
module.exports = {};
module.exports.default = {};
