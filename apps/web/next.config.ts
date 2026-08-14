import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.vercel.app' },
      { protocol: 'https', hostname: 'storage.collegehub.edu.in' }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.clerk.accounts.dev",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co https://*.onrender.com",
              "frame-src https://*.clerk.accounts.dev",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' }
        ]
      }
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      // No API origin configured — no rewrites. Local dev uses the in-app
      // api-client pointing directly at NEXT_PUBLIC_API_URL when set.
      return [];
    }

    // The API gateway mounts modules at two different prefixes:
    //   - root-mounted REST modules:   /connect, /placements, /notifications, /errors, /incidents
    //   - versioned namespace modules: /api/v1/{marketplace,confessions,professors,resources,...}
    // The browser client calls everything under /api/<area>/... so the
    // rewrites below translate those into whatever prefix the API actually serves.
    return [
      // Root-mounted feature modules (no /api/v1 prefix on the API side).
      // Exact bare paths first: `:path*` with an empty segment yields a
      // trailing slash on the destination, which the gateway does not serve.
      { source: '/api/connect', destination: `${apiUrl}/connect` },
      { source: '/api/placements', destination: `${apiUrl}/placements` },
      { source: '/api/notifications', destination: `${apiUrl}/notifications` },
      { source: '/api/errors', destination: `${apiUrl}/errors` },
      { source: '/api/incidents', destination: `${apiUrl}/incidents` },
      { source: '/api/connect/:path*', destination: `${apiUrl}/connect/:path*` },
      { source: '/api/placements/:path*', destination: `${apiUrl}/placements/:path*` },
      { source: '/api/notifications/:path*', destination: `${apiUrl}/notifications/:path*` },
      { source: '/api/errors/:path*', destination: `${apiUrl}/errors/:path*` },
      { source: '/api/incidents/:path*', destination: `${apiUrl}/incidents/:path*` },

      // Marketplace REST API is namespaced under /api/v1/marketplace on the gateway.
      { source: '/api/marketplace/:path*', destination: `${apiUrl}/api/v1/marketplace/:path*` },

      // Catch-all: anything else under /api/ is forwarded verbatim so the
      // versioned namespace modules (confessions, professors, resources,
      // uploads, collections, contributors, feature-flags, ...) resolve intact.
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
