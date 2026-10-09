import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: false,
  output: "standalone",
  turbopack: {},
  webpack: (config) => {
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "medium.com",
      },
      {
        protocol: "https",
        hostname: "**.medium.com",
      },
    ],
  },
  experimental: {
    cpus: 2,
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default withNextIntl(nextConfig);
