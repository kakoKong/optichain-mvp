// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optional (not recommended long-term):
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
