import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.app.github.dev"],

  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "react",
      "react-dom",
    ],
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000", "*.app.github.dev"],
    },
  },

  webpack(config, { dev }) {
    if (dev) {
      // Use in-memory webpack cache during development.
      // The default PackFileCacheStrategy writes to .next/cache on every
      // compilation; on Windows (and under some AV scanners) these writes
      // can be interrupted mid-flush, producing the repeated
      // "unexpected end of file" error that forces a full recompile on
      // every request.  Memory cache avoids all disk writes — the trade-off
      // is that each route module is recompiled once per dev-server session
      // instead of being persisted across restarts, which is acceptable.
      config.cache = { type: "memory" };
    }
    return config;
  },

  headers: async () => [
    {
      source: "/(.*)",
      headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
    },
  ],
};

export default nextConfig;
