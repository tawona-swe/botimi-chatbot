/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Standalone output traces only the files actually needed at runtime into
  // .next/standalone -- lets the production Docker image skip shipping the
  // full node_modules tree (Next.js's own docs recommend this specifically
  // for containerized deploys).
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.botimi.ai",
      },
    ],
  },
  async rewrites() {
    // In Docker, the frontend and backend are separate containers -- there
    // is no "localhost:3001" from the frontend container's point of view.
    // BACKEND_INTERNAL_URL is set in docker-compose.yml to the backend
    // service's name on the internal Docker network; falls back to
    // localhost for local (non-Docker) dev, unchanged from before.
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
