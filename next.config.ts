import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Disable debug endpoints in production
      ...(process.env.VERCEL
        ? [
            {
              source: "/api/debug/:path*",
              destination: "/404",
              permanent: false,
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;