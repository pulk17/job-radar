import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@libsql/client', 'node-cron'],
  output: 'standalone',
  compress: true,
};

export default nextConfig;
