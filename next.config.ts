import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@libsql/client', 'node-cron'],
  // Standalone output is only for the Docker/self-hosted path. Vercel runs its
  // own output-tracing step that expects the default build layout, and errors
  // with "ENOENT .next/next-server.js.nft.json" if standalone is forced.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  compress: true,
};

export default nextConfig;
