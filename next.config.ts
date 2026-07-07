import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Ensure that dynamic pages are not pre-rendered statically during build time
  experimental: {
    // any experimental settings can be placed here if needed
  }
};

export default nextConfig;
