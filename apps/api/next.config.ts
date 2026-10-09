import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@beyond/shared'],
  poweredByHeader: false,
};

export default nextConfig;
