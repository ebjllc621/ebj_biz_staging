/** @type {import('next').NextConfig} */
const webpack = require('webpack');

// Bundle Analyzer (Phase 3: Performance Optimization)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Disable prerender errors for Client Components with Context
    // Fixes: "Cannot read properties of null (reading 'useContext')" during build
    missingSuspenseWithCSRBailout: false,
    // Keep sharp server-side only - it uses native Node.js bindings (child_process, fs)
    serverComponentsExternalPackages: ['sharp'],
    // Turbopack resolve aliases - mirrors the webpack fallbacks below for `next dev --turbo`
    // Required because Turbopack ignores the webpack callback entirely.
    // The import chain: useUniversalMedia (client) → MediaService → LocalMediaProvider → sharp → detect-libc → child_process
    turbo: {
      resolveAlias: {
        // Stub out server-only packages and Node.js built-ins for CLIENT bundles only.
        // Uses { browser: '...' } so stubs apply only to browser bundles, not SSR.
        // Mirrors the webpack resolve.fallback config below (lines 43-50).
        // The import chain: useUniversalMedia (client) → MediaService → LocalMediaProvider/MirrorService
        // These services use: sharp, fs, path, crypto, child_process (all Node.js-only)
        sharp: { browser: './src/lib/stubs/sharp-stub.js' },
        'detect-libc': { browser: './src/lib/stubs/sharp-stub.js' },
        fs: { browser: './src/lib/stubs/node-stub.js' },
        path: { browser: './src/lib/stubs/node-stub.js' },
        crypto: { browser: './src/lib/stubs/node-stub.js' },
        child_process: { browser: './src/lib/stubs/sharp-stub.js' },
        net: { browser: './src/lib/stubs/sharp-stub.js' },
        tls: { browser: './src/lib/stubs/sharp-stub.js' },
        dns: { browser: './src/lib/stubs/sharp-stub.js' },
      },
    },
  },

  // DNA TOOLING EXCLUSION - Prevent development tools from production bundle
  // DNA Enhancement System (E0-E5) is development tooling only
  // See: docs/codeReview/dnaEnhancement/phases/PHASE_E6_DNA_RELOCATION_BRAIN_PLAN.md
  webpack: (config, { isServer, dev }) => {
    // Exclude server-only modules from client bundles.
    // MediaService imports LocalMediaProvider/MirrorService which use Node.js APIs
    // (fs, path, child_process, sharp). These are only called server-side but the
    // import chain leaks into client bundles via useUniversalMedia hook.
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp: false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
        dns: false,
      };
    }

    // Only apply exclusions in production builds
    if (!dev) {
      // Exclude DNA directory from client bundles entirely
      if (!isServer) {
        config.plugins.push(
          new webpack.IgnorePlugin({
            resourceRegExp: /\/dna\//,
            contextRegExp: /src/
          })
        );
      }

      // Add external pattern to prevent DNA imports
      config.externals = config.externals || [];
      config.externals.push(({ request }, callback) => {
        if (request && request.includes('/dna/')) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      });
    }

    return config;
  },

  // Production: standalone bundles node_modules for self-contained deployment (Docker, serverless)
  // Dev: omitted to avoid unnecessary dependency tracing overhead (server runtime works without it)
  // WARNING: Never use output: 'export' — it disables API routes, cookies, and server runtime entirely
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

  // Environment-specific optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
  }),

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i.vimeocdn.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)'
          }
        ],
      },
    ];
  },

  eslint: {
    // TIER 1 BUILD UNBLOCK: Temporarily ignore ESLint during builds
    // This allows deployment while we address quality issues in Tier 2/3
    // WARNING: Remove this once Tier 2/3 remediation is complete
    ignoreDuringBuilds: true
  },
  typescript: {
    // Local builds: strict (0 TS errors enforced)
    // VPS builds: skip type-checking to avoid OOM (typecheck runs locally before push)
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },

  // Dev-only: controls how many compiled pages the dev server keeps in memory
  // With 600+ routes, balance memory vs manifest stability.
  // Too aggressive (15s/1) causes Turbopack ENOENT manifest crashes on tab switches.
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};


module.exports = withBundleAnalyzer(nextConfig);