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
  serverExternalPackages: [
    '@kamino-finance/klend-sdk',
    '@orca-so/whirlpools-core',
  ],
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
      allowedOrigins: ["localhost:3000", "200a-203-78-114-213.ngrok-free.app"],
    },
  },
};

export default withNextIntl(nextConfig);
