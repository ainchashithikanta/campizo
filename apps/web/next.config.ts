import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
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
