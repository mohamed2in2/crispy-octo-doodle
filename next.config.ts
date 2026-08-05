import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https:;" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.app.github.dev"],
  turbopack: {},
  experimental: {
    optimizePackageImports: ["framer-motion", "react", "react-dom"],
    serverActions: { allowedOrigins: ["localhost:3000", "127.0.0.1:3000", "*.app.github.dev"] },
  },
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
};

export default nextConfig;
