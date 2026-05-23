import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.app.github.dev"],
  
  experimental: {
    // Optimize package imports for faster bundling
    optimizePackageImports: [
      "@clerk/nextjs",
      "framer-motion",
      "react",
      "react-dom",
    ],
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000", "*.app.github.dev"],
    },
  },

  // Clerk configuration for custom domain
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
