import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize development experience
  reactStrictMode: false, // Disable strict mode to prevent double effects in dev

  // Empty turbopack config to silence warning when using default Turbopack
  turbopack: {},
};

export default nextConfig;
